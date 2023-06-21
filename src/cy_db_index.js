import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./ddb_client";
import CyclicItem from "./cy_db_item";
import { validate_strings } from "./cy_db_utils";
export class CyclicIndex {
  constructor(name, collection = null, props = {}) {
    validate_strings(name, "Index Name");
    this.name = name;
    this.collection = collection;
  }

  async find(key) {
    let limit = 10000;
    let next = undefined;
    let results = [];
    do {
      let params = {
        TableName: process.env.CYCLIC_DB,
        IndexName: "gsi_s",
        KeyConditionExpression: "gsi_s = :gsi_s",
        ExpressionAttributeValues: {
          ":gsi_s": `${this.name}#${key}`,
        },
        ExclusiveStartKey: next,
        ScanIndexForward: false,
      };

      if (this.collection) {
        (params.KeyConditionExpression = `${params.KeyConditionExpression} and begins_with(gsi_s_sk,:sk)`),
          (params.ExpressionAttributeValues[":sk"] = `${this.collection}#`);
      }

      let res = await docClient.send(new QueryCommand(params));
      next = res.LastEvaluatedKey;
      results = results.concat(res.Items);
    } while (next && results.length < limit);

    results = results.map((r) => {
      return CyclicItem.from_dynamo(r);
    });
    let result = {
      results,
    };
    if (next) {
      result.next = next;
    }
    return result;
  }
}

export default CyclicIndex;
