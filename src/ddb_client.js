
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb")
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb")

const REGION = process.env.AWS_REGION || 'us-east-2'
const ddbClient = new DynamoDBClient({ region: REGION });

const marshallOptions = {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: false, // false, by default.
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: false, // false, by default.
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

// Create the DynamoDB Document client.
const docClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);



// const AWS = require("aws-sdk");
// AWS.config.update({
//     region: process.env.AWS_REGION || "us-east-2",
//   });
  
// const docClient = new AWS.DynamoDB.DocumentClient({
//     // convertEmptyValues:true
// });


module.exports = {
    docClient
}