

const {  QueryCommand } = require("@aws-sdk/lib-dynamodb")
const {docClient} = require('./ddb_client')
class CyclicIndex{
    constructor(name, collection=null, props={}){
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
            params.KeyConditionExpression = `${params.KeyConditionExpression} and begins_with(sk,:sk)`,
            params.ExpressionAttributeValues[':sk'] = `${this.collection}#`
          }
          

          let res = await docClient.send(new QueryCommand(params));
          return res.Items
    }

}


module.exports = CyclicIndex