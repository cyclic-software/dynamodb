
var AWS = require("aws-sdk");
const DateTime = require('luxon').DateTime

AWS.config.update({
  region: process.env.AWS_REGION || "us-east-2",
});

var docClient = new AWS.DynamoDB.DocumentClient({
    convertEmptyValues:true
});


class CyclicIndex{
    constructor(name, collection=null, props={}){
        this.name = name
        this.collection = collection

    } 

    async find(key){
        let params = {
            TableName : process.env.CYCLIC_DB,
            IndexName: 'gsi_s',
            KeyConditions:{
              gsi_s:{
                ComparisonOperator:'EQ',
                AttributeValueList: [`${this.name}#${key}`]
              },
            },
          };
          
          if(this.collection){
            params.KeyConditions.gsi_s_sk = {
              ComparisonOperator:'BEGINS_WITH',
              AttributeValueList: [`${this.collection}#`]
            }
          }
          

          let res = await docClient.query(params).promise();
          return res.Items
    }

}


module.exports = CyclicIndex