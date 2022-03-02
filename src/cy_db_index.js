

const {  QueryCommand } = require("@aws-sdk/lib-dynamodb")
const {docClient} = require('./ddb_client')
const CyclicItem = require('./cy_db_item')
const { validate_strings} = require('./cy_db_utils')
class CyclicIndex{
    constructor(name, collection=null, props={}){
        validate_strings(name, 'Index Name')
        this.name = name
        this.collection = collection

    } 

    async find(key){
        let params = {
            TableName : process.env.CYCLIC_DB,
            IndexName: 'gsi_s',
            KeyConditionExpression: 'gsi_s = :gsi_s',
            ExpressionAttributeValues:{
                ':gsi_s':`${this.name}#${key}`,
            }
          };
          
          if(this.collection){
            params.KeyConditionExpression = `${params.KeyConditionExpression} and begins_with(gsi_s_sk,:sk)`,
            params.ExpressionAttributeValues[':sk'] = `${this.collection}#`
          }
          

          let res = await docClient.send(new QueryCommand(params));

          res = res.Items.map(r=>{
              return CyclicItem.from_dynamo(r)
          })
          return res
    }

}


module.exports = CyclicIndex