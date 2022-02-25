
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb")
const { QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb")
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb")


const REGION = process.env.AWS_REGION || 'us-east-2'
const ddbClient = new DynamoDBClient({ region: REGION });

const marshallOptions = {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: true, // false, by default.
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: false, // false, by default.
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: true, // false, by default.
};

const unmarshallOptions = {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

// Create the DynamoDB Document client.
const docClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);

process.env.CYCLIC_DB = 'CyclicDB'

//get

let pk = 'app_stacks#korostelevm-yo'
let sk = 'fragment#code_scan#'
const query_params = {
    TableName: process.env.CYCLIC_DB,
    KeyConditionExpression: 'pk = :pk and sk = :sk',
    ExpressionAttributeValues:{
        ':pk':pk,
        ':sk':sk
    }
};
//list

const list_params = {
    TableName: process.env.CYCLIC_DB,
    KeyConditionExpression: 'pk = :pk and begins_with(sk,:sk)',
    ExpressionAttributeValues:{
        ':pk':pk,
        ':sk':sk
    }
};

//set
let item = {
    pk: 'asdf',
    sk: 'asdf',
    a:'a',
    b:123,
    c:false
}
let expression = []
let attr_names = {}
let attr_vals = {}

Object.keys(item).forEach((k,i)=>{
    if(k=='pk' || k == 'sk' || item[k] === undefined){return true}
    if(item[k] === '') {throw new Error(`pk key [${k}] should never be blank`)}
    let v = item[k]
    attr_names[`#k${i}`] = k
    attr_vals[`:v${i}`] = v
    expression.push(`#k${i} = :v${i}`)

})
expression = `set ${expression.join(', ')}`
console.log(expression)
const update_params = {
    TableName: process.env.CYCLIC_DB,
    Key:{
        pk: item.pk,
        sk: item.sk || item.pk
      },
    UpdateExpression: expression,
    ExpressionAttributeNames: attr_names,
    ExpressionAttributeValues: attr_vals
};

 const run = async () => {
  try {
      const data = await docClient.send(new UpdateCommand(update_params));
    // const data = await docClient.send(new QueryCommand(list_params));
    console.log("Success. Item details: ", data);
    // console.log("Success. Item details: ", data.Items);
    return data;
  } catch (err) {
    console.log("Error", err.message);
    // console.log("Error", err.$response.body.req);
  }
};
run();