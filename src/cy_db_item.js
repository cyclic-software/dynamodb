
const AWS = require("aws-sdk");
const DateTime = require('luxon').DateTime
const utils = require('../utils')
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-2",
});

var docClient = new AWS.DynamoDB.DocumentClient({
    // convertEmptyValues:true
});

let upsert = async function(item,opts){
    let ops = []
    var AttributeUpdates = {}
    Object.keys(item).forEach((k)=>{
      if(k=='pk' || k == 'sk' || item[k] === undefined){return true}
      if(item[k] === '') {throw new Error(`pk key [${k}] should never be blank`)}
      AttributeUpdates[k] = {
        Action: 'PUT',
        Value: item[k]
      }
    })

    AttributeUpdates['updated'] = {
      Action: 'PUT',
      Value: DateTime.utc().toISO()
    }
    if(opts['$unset']){
            Object.keys(opts['$unset']).forEach(k=>{
                AttributeUpdates[k] = {
                    Action: 'DELETE',
                }
                if(!item.sk.startsWith('fragment#index') && !item.sk.startsWith('index#')){
                    ops.push(docClient.delete({
                        TableName : process.env.CYCLIC_DB,
                        Key: {
                        pk: item.pk,
                        sk: item.sk.startsWith('fragment') ? `fragment#index#${k}` : `index#${k}`
                        }
                    }).promise())
                }
            })
    }

    var record = {
      TableName : process.env.CYCLIC_DB,
      Key:{
        pk: item.pk,
        sk: item.sk || item.pk
      },
      AttributeUpdates: AttributeUpdates,
      ReturnConsumedCapacity:"TOTAL",
      ReturnValues:"ALL_OLD",
    }

    if(opts.condition){
      record.Expected = opts.condition
    }
    ops.push(docClient.update(record).promise())

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

let remove = function(item){
    let d = {
        TableName : process.env.CYCLIC_DB,
        Key:{
          pk: item.pk,
          sk: item.sk 
        },
    }
    return docClient.delete(d).promise()
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
        TableName : process.env.CYCLIC_DB,
        ProjectionExpression:'pk,sk',
        KeyConditions:{
            pk:{
                ComparisonOperator:'EQ',
                AttributeValueList: [`${pk}`]
            },
        },
    };
    if(sk_prefix){
        params.KeyConditions.sk = {
            ComparisonOperator:'BEGINS_WITH',
            AttributeValueList: [`${sk_prefix}`]
        }
    }
    
    let res = await docClient.query(params).promise();

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
                 ops.push(docClient.delete({
                    TableName : process.env.CYCLIC_DB,
                    Key: {
                    pk: `${this.collection}#${this.key}`,
                    sk: sk
                    }
                }).promise())
            })
        }
        let res = await Promise.all(ops)
        return res
    }
    
    async get(){
        let params = {
            TableName : process.env.CYCLIC_DB,
            KeyConditions:{
              pk:{
                ComparisonOperator:'EQ',
                AttributeValueList: [`${this.collection}#${this.key}`]
              },
              sk:{
                ComparisonOperator:'EQ',
                AttributeValueList: [`${this.collection}#${this.key}`]
              }
            },
          };
          
          let res = await docClient.query(params).promise();
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
            keys_gsi_sk: DateTime.utc().toISO(),
            ...props
        }

        let index_records = []
        if(opts.indexBy){
            index_records = opts.indexBy.map(idx=>{
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
        if(opts.indexBy){
            index_records = opts.indexBy.map(idx=>{
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
        let params = {
            TableName : process.env.CYCLIC_DB,
            KeyConditions:{
                pk:{
                    ComparisonOperator:'EQ',
                    AttributeValueList: [`${this.parent.collection}#${this.parent.key}`]
                },
                sk:{
                    ComparisonOperator:'EQ',
                    AttributeValueList: [`fragment#${this.type}#${this.name}`]
                }
            },
        };
        
        let res = await docClient.query(params).promise();
        let results = res.Items

        return results
    }

    async list(){
        let params = {
            TableName : process.env.CYCLIC_DB,
            KeyConditions:{
                pk:{
                    ComparisonOperator:'EQ',
                    AttributeValueList: [`${this.parent.collection}#${this.parent.key}`]
                },
                sk:{
                    ComparisonOperator:'BEGINS_WITH',
                    AttributeValueList: [`fragment#${this.type}#`]
                }
            },
        };
        
        let res = await docClient.query(params).promise();
        return res.Items
        
    }
}

module.exports = CyclicItem