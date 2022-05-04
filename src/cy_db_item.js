
const {docClient} = require('./ddb_client')
const { UpdateCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb")
const {ValidationError, RetryableError, validate_strings} = require('./cy_db_utils')


let make_sub_expr = function(item, expr_type, expr_prefix=''){
    let expression = []
    let attr_names = {}
    let attr_vals = {}
    Object.keys(item).forEach((k,i)=>{
        if(k=='pk' || k == 'sk' || item[k] === undefined){return true}
        let v = item[k]
        attr_names[`#k${expr_prefix}${i}`] = k
        attr_vals[`:v${expr_prefix}${i}`] = v
        expression.push(`#k${expr_prefix}${i} = :v${expr_prefix}${i}`)

    })
    expression = `${expr_type} ${expression.join(', ')}`
    return {
        attr_names,
        attr_vals,
        expression
    }
}

let upsert = async function(item,opts){
    let ops = []

    let {attr_names, attr_vals, expression} = make_sub_expr(item,'set','s')
    let d = new Date().toISOString()
    attr_names['#kc'] = 'created'
    attr_names['#ku'] = 'updated'
    attr_vals[':kc'] = d
    attr_vals[':ku'] = d
    expression = `${expression}, #ku = :ku, #kc = if_not_exists(#kc,:kc)`
    
    if(opts['$unset']){

            for (let k of Object.keys(opts.$unset)){
                if(Object.keys(item).includes(k)){
                    throw `${k}: property can not appear in both set and $unset`
                }
            }
            
            d_expression = []
            opts['$unset'].forEach((k,i)=>{
                attr_names[`#dk${i}`] = k
                d_expression.push(`#dk${i}`)
                if(!item.sk.startsWith('fragment#index') && !item.sk.startsWith('index#')){
                    ops.push(
                        docClient.send(new DeleteCommand({
                            TableName : process.env.CYCLIC_DB,
                            Key: {
                                pk: item.pk,
                                sk: item.sk.startsWith('fragment') ? `fragment#index#${k}` : `index#${k}`
                            }
                        }))
                    )
                }
            })
            expression = `${expression} remove ${d_expression.join(', ')}`
    }
    var record = {
        TableName : process.env.CYCLIC_DB,
        Key:{
            pk: item.pk,
            sk: item.sk || item.pk
        },
        UpdateExpression: expression,
        ExpressionAttributeNames: attr_names,
        ExpressionAttributeValues: attr_vals,
        ReturnConsumedCapacity:"TOTAL",
        ReturnValues:"ALL_OLD",
    }
    // console.log(record)
    if(opts.condition){
      record.Expected = opts.condition
    }
    ops.push(
        docClient.send(new UpdateCommand(record))
        )

    try{
        let res = await Promise.all(ops)
        return res
    }catch(e){
        if(e.code == 'ConditionalCheckFailedException'){
        throw new RetryableError(`${item.pk} ${e.code}`)
        }
        throw e
    }
}



const list_sks = async function(pk,sk_prefix = null){
    let params = {
        TableName: process.env.CYCLIC_DB,
        ProjectionExpression:'pk,sk',
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues:{
            ':pk':pk,
        }
    };

    if(sk_prefix){
        params.KeyConditionExpression = `${params.KeyConditionExpression} and begins_with(sk,:sk)`,
        params.ExpressionAttributeValues[':sk'] = sk_prefix
    }


    let res = await docClient.send(new QueryCommand(params))

    return res.Items.map(d=>{
        return d.sk
    })
}


const exclude_cy_keys = function(o){
    delete o.pk
    delete o.sk
    delete o.keys_gsi
    delete o.keys_gsi_sk
    delete o.gsi_s
    delete o.gsi_s_sk
    delete o.gsi_1
    delete o.gsi_2
    delete o.gsi_s2
    delete o.gsi_prj
    delete o.cy_meta
    return o
}
class CyclicItem{
    constructor(collection,key, props={},opts={}){

        validate_strings(collection, "Collection Name")
        validate_strings(key, "Item Key")

        this.collection = collection
        this.key = key
        this.props = exclude_cy_keys(props)
        if(opts.$index){
            this.$index = opts.$index
        }
    }

    static from_dynamo(d){
        if(d.sk.startsWith('fragment')){
            return CyclicItemFragment.from_dynamo(d)
        }
        let [collection,key] = d.pk.split('#')
        let props = {...d}
        let opts = {}
        if(d.keys_gsi_sk){
            props.updated = d.keys_gsi_sk
        }
        if(d.cy_meta && d.cy_meta.$i){
            opts.$index = d.cy_meta.$i
        }
        return new CyclicItem(collection,key,props,opts)
    }

    async indexes(){
        let indexes = await list_sks(`${this.collection}#${this.key}`, `index#`)
        return indexes.map(d=>{
            return d.split('#').slice(-1)[0]
        })
    }
    async fragments(){
        let frags = await list_sks(`${this.collection}#${this.key}`, `fragment#`)
        return frags.map(d=>{
            return d.split('#')[1]
        }).filter(d=>{return d !='index'})
    }

    async delete(props={},opts={}){
        let ops = []
        let sks = await list_sks(`${this.collection}#${this.key}`)
        sks.forEach(sk=>{
                ops.push(
                docClient.send(new DeleteCommand({
                    TableName : process.env.CYCLIC_DB,
                    Key: {
                        pk: `${this.collection}#${this.key}`,
                        sk: sk
                    }
                }))
                )
        })
        let res = await Promise.all(ops)
        return true
    }
    
    async get(){
        let pk = `${this.collection}#${this.key}`
        let sk = `${this.collection}#${this.key}`
        let params = {
            TableName: process.env.CYCLIC_DB,
            KeyConditionExpression: 'pk = :pk and sk = :sk',
            ExpressionAttributeValues:{
                ':pk':pk,
                ':sk':sk
            }
        };
            
        let res = await docClient.send(new QueryCommand(params))
        if(!res.Items.length){
            return null
        }
        return CyclicItem.from_dynamo(res.Items[0])
        // this.props = exclude_cy_keys(res.Items[0])
        // return this
    }

     async set(props, opts={}){
        this.props = {...this.props, ...props}

        let r = {
            pk: `${this.collection}#${this.key}`,
            sk: `${this.collection}#${this.key}`,
            keys_gsi: this.collection,
            keys_gsi_sk: new Date().toISOString(),
            cy_meta:{
                c: this.collection,
                rt: 'item',
            },
            ...props
        }

        let index_records = []
        if(opts.$index){
            this.$index = opts.$index
            r.cy_meta.$i = opts.$index

            opts.$index.forEach(idx=>{
                let prop_keys = Object.keys(props)
                if(!prop_keys.includes(idx)){
                    throw new ValidationError(`index property "${idx}" does not exist in object properties ["${prop_keys.join('", "')}"]`)
                }
            })
            
            index_records = opts.$index.map(idx=>{
                let index = {
                    name: idx,
                }
                let index_item = {
                    pk: `${this.collection}#${this.key}`,
                    sk: `index#${index.name}`,
                    gsi_s: `${index.name}#${this.props[index.name]}`,
                    gsi_s_sk: `${this.collection}#${this.key}`,
                    cy_meta:{
                        c: this.collection,
                        rt: 'item_index',
                        $i: this.$index
                    },
                    ...props
                }
                return upsert(index_item,opts)

            })
        }


        let res = await Promise.all([
            upsert(r, opts),
            ...index_records
        ])

        return this
    }



    fragment(type, name = '', props = {}){
        return new CyclicItemFragment(type, name, props, this)

    }


}

class CyclicItemFragment{
    constructor(type, key, props ,parent, opts={}){
        validate_strings(type, "Fragment Type")
        validate_strings(key, "Fragment Key")
        
        this.type = type
        this.key = key
        this.parent = parent

        this.props = exclude_cy_keys(props)
        if(opts.$index){
            this.$index = opts.$index
        }
    }   

    static from_dynamo(d){
        // console.log(d)
        let [parent_collection,parent_key] = d.pk.split('#')

        let [type,key,index_name] = d.sk.replace('fragment#','').replace('index#','').split('#')
        let props = {...d}
        let opts = {}
        if(d.keys_gsi_sk){
            props.updated = d.keys_gsi_sk
        }
        if(d.cy_meta && d.cy_meta.$i){
            opts.$index = d.cy_meta.$i
        }
        let parent = new CyclicItem(parent_collection,parent_key)
        return new CyclicItemFragment(type,key,props,parent, opts)
    }

    async indexes(){
        let indexes = await list_sks(`${this.parent.collection}#${this.parent.key}`, `fragment#index#`)
        return indexes.map(d=>{
            return d.split('#').slice(-1)[0]
        })
    }

    async delete(props={},opts={}){
        let indexes = await this.indexes()
        let ops = []
        ops.push(docClient.send(new DeleteCommand({
                    TableName : process.env.CYCLIC_DB,
                    Key: {
                        pk: `${this.parent.collection}#${this.parent.key}`,
                        sk: `fragment#${this.type}#${this.key}`
                    }
                })))
        indexes.forEach(idx=>{
            ops.push(docClient.send(new DeleteCommand({
                TableName : process.env.CYCLIC_DB,
                Key: {
                    pk: `${this.parent.collection}#${this.parent.key}`,
                    sk: `fragment#index#${this.type}#${this.key}#${idx}`,
                }
            })))
        })
        await Promise.all(ops)
        return true
    }

    async set(props, opts={}){
        this.props = {...this.props, ...props}
        let r = {
            pk: `${this.parent.collection}#${this.parent.key}`,
            sk: `fragment#${this.type}#${this.key}`,
            cy_meta:{
                c: this.parent.collection,
                rt: 'fragment',
            },
            ...props
        }
        let index_records = []
        if(opts.$index){
            this.$index = opts.$index
            r.cy_meta.$i = opts.$index

            index_records = opts.$index.map(idx=>{
                let index = {
                    name: idx,
                }
                let index_item = {
                    pk: `${this.parent.collection}#${this.parent.key}`,
                    sk: `fragment#index#${this.type}#${this.key}#${index.name}`,
                    gsi_s: `${index.name}#${this.props[index.name]}`,
                    gsi_s_sk: `${this.parent.collection}#${this.parent.key}`,
                    cy_meta:{
                        c: this.parent.collection,
                        rt: 'fragment_index',
                        $i: this.$index
                    },
                    ...props
                }
                return upsert(index_item,opts)

            })
        }

        let res = await Promise.all([
            upsert(r, opts),
            ...index_records
        ])

        return this
    }

    async get(){
        let pk = `${this.parent.collection}#${this.parent.key}`
        let sk = `fragment#${this.type}#${this.key}`
        let params = {
            TableName: process.env.CYCLIC_DB,
            KeyConditionExpression: 'pk = :pk and sk = :sk',
            ExpressionAttributeValues:{
                ':pk':pk,
                ':sk':sk
            }
        };
            
        let res = await docClient.send(new QueryCommand(params))

        let results = res.Items.map(r=>{
            return CyclicItemFragment.from_dynamo(r)
        })
        if(this.key && this.key.length){
            if(results.length){
                return results[0]
            }else{
                return null
            }
        }
        return results
    }

    async list(){


        let pk = `${this.parent.collection}#${this.parent.key}`
        let sk = `fragment#${this.type}#`
        let params = {
            TableName: process.env.CYCLIC_DB,
            KeyConditionExpression: 'pk = :pk and begins_with(sk,:sk)',
            ExpressionAttributeValues:{
                ':pk':pk,
                ':sk':sk
            }
        };
            
        let res = await docClient.send(new QueryCommand(params))
        return res.Items.map(r=>{
            return CyclicItemFragment.from_dynamo(r)
        })
        
    }
}

module.exports = CyclicItem