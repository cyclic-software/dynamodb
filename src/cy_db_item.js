
const {docClient} = require('./ddb_client')
const { UpdateCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb")

const utils = require('./utils')


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
        throw new utils.RetryableError(`${item.pk} ${e.code}`)
        }
        throw e
    }
}


const sanitize_item = function(a){
    let [collection,key] = a.pk.split('#')
    delete a.pk
    delete a.sk
    delete a.qsk
    delete a.key
    Object.keys(a).forEach(k=>{
        if(k.startsWith('_cy_')){
            delete a[k]
        }
    })
    return {
        collection,
        key,
        ...a
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

class CyclicItem{
    constructor(collection,key, props={}){
        this.collection = collection
        this.key = key
        this.props = props
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
        if (!Object.keys(props).length){
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
        }
        let res = await Promise.all(ops)
        return res
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
            throw "Item not found"
        }
        this.props = sanitize_item(res.Items[0])
        return this
    }

     async set(props, opts={}){
        this.props = {...this.props, ...props}
        if(opts.$unset){
            for (let k of Object.keys(opts.$unset)){
                if(Object.keys(props).includes(k)){
                    throw `${k}: property can not appear in both set and $unset`
                }
            }
        }

        let r = {
            pk: `${this.collection}#${this.key}`,
            sk: `${this.collection}#${this.key}`,
            keys_gsi: this.collection,
            keys_gsi_sk: new Date().toISOString(),
            ...props
        }

        let index_records = []
        if(opts.$index){
            index_records = opts.$index.map(idx=>{
                let index = {
                    name: idx,
                //     readOptimized: false
                }
                let index_item = {
                    pk: `${this.collection}#${this.key}`,
                    sk: `index#${index.name}`,
                    gsi_s: `${index.name}#${this.props[index.name]}`,
                    gsi_s_sk: `${this.collection}#${this.key}`,
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
    constructor(type, name, props ,parent){
        this.type = type
        this.name = name
        this.parent = parent
        this.props = props
    }   
    async indexes(){
        let index = await list_sks(`${this.parent.collection}#${this.parent.key}`, `fragment#index#`)
        return indexes.map(d=>{
            return d.split('#').slice(-1)[0]
        })
    }

    async set(props, opts={}){
        this.props = {...this.props, ...props}
        if(opts.$unset){
            for (let k of Object.keys(opts.$unset)){
                if(Object.keys(props).includes(k)){
                    throw "A property can not appear in both set and $unset"
                }
            }
        }
        let r = {
            pk: `${this.parent.collection}#${this.parent.key}`,
            sk: `fragment#${this.type}#${this.name}`,
            ...props
        }
        let index_records = []
        if(opts.$index){
            index_records = opts.$index.map(idx=>{
                let index = {
                    name: idx,
                }
                let index_item = {
                    pk: `${this.parent.collection}#${this.parent.key}`,
                    sk: `fragment#index#${this.type}#${index.name}`,
                    gsi_s: `${index.name}#${this.props[index.name]}`,
                    gsi_s_sk: `${this.parent.collection}#${this.parent.key}`,
                    ...props
                }
                return upsert(index_item,opts)

            })
        }

        let res = await Promise.all([
            upsert(r, opts),
            ...index_records
        ])

        return this.parent
    }

    async get(){
        let pk = `${this.parent.collection}#${this.parent.key}`
        let sk = `fragment#${this.type}#${this.name}`
        let params = {
            TableName: process.env.CYCLIC_DB,
            KeyConditionExpression: 'pk = :pk and sk = :sk',
            ExpressionAttributeValues:{
                ':pk':pk,
                ':sk':sk
            }
        };
            
        let res = await docClient.send(new QueryCommand(params))
        let results = res.Items

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
        return res.Items
        
    }
}

module.exports = CyclicItem