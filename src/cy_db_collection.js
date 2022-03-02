
const {  QueryCommand } = require("@aws-sdk/lib-dynamodb")
const {docClient} = require('./ddb_client')

const CyclicIndex = require('./cy_db_index')
const CyclicItem = require('./cy_db_item')

class CyclicCollection{
    constructor(collection, props={}){
        this.collection = collection
    }
    item(key){
      return new CyclicItem(this.collection,key)
    } 
    async get(key){
      let item = new CyclicItem(this.collection,key)
      return item.get()
    }
    async set(key, props, opts){
      let item = new CyclicItem(this.collection,key)
      return item.set(props,opts)
    }
    
    async delete(key, props, opts){
      let item = new CyclicItem(this.collection,key)
      return item.delete()
    }
    
    async list(limit){
          let next = null
          let results = []
          do{
            var params = {
              TableName: process.env.CYCLIC_DB,
              Limit: limit,
              IndexName: 'keys_gsi',
              // KeyConditions:{
              //   keys_gsi:{
              //     ComparisonOperator:'EQ',
              //     AttributeValueList: [this.collection]
              //   }
              // },
              KeyConditionExpression: 'keys_gsi = :keys_gsi',
              ExpressionAttributeValues:{
                ':keys_gsi':this.collection,
              },
              ScanIndexForward:false,
              ExclusiveStartKey: next
            };
            let res = await docClient.send(new QueryCommand(params))
            // var res = await docClient.query(params).promise();

            next = res.LastEvaluatedKey
            results = results.concat(res.Items)
          }while(results && results.length<limit)
          
          return results;
    }

    async latest(){
        let params = {
            TableName : process.env.CYCLIC_DB,
            Limit: 1,
            IndexName: 'keys_gsi',
            KeyConditionExpression: 'keys_gsi = :keys_gsi',
            ExpressionAttributeValues:{
              ':keys_gsi':this.collection,
            },
            // KeyConditions:{
            //   keys_gsi:{
            //     ComparisonOperator:'EQ',
            //     AttributeValueList: [this.collection]
            //   }
            // },
            ScanIndexForward:false
          };
          let res = await docClient.send(new QueryCommand(params))
          if(!res.Items.length){
            return null
          }
          return res.Items[0]
    }

    index(name){
      return new CyclicIndex(name, this.collection)
    }

    find(name, value){
      let idx = new CyclicIndex(name, this.collection)
      return idx.find(value)
    }

}


module.exports = CyclicCollection