import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log(JSON.stringify({ event }, null, 2));
  try {
    let allItems: QueryCommandOutput["Items"] = [];
    let exclusiveStartKey: QueryCommandInput["ExclusiveStartKey"] = undefined;

    do {
      const params: QueryCommandInput = {
        TableName: process.env.TODO_TABLE_NAME || "",
        IndexName: "CreatedAtIndex", // Use the global secondary index for sorting
        KeyConditionExpression: "#createdAtYear = :createdAtYear", // Filter for all todos
        ExpressionAttributeNames: {
          "#createdAtYear": "createdAtYear",
        },
        ExpressionAttributeValues: {
          ":createdAtYear": 2024,
        },
        ScanIndexForward: true, // Sort in ascending order (least recently created first)
        ExclusiveStartKey: exclusiveStartKey,
      };

      const { Items, LastEvaluatedKey } = await docClient.send(
        new QueryCommand(params)
      );
      allItems = [...allItems, ...(Items || [])];
      exclusiveStartKey = LastEvaluatedKey;
    } while (exclusiveStartKey);

    return {
      statusCode: 200,
      body: JSON.stringify(allItems),
    };
  } catch (error) {
    console.error("Error fetching todos:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch todos" }),
    };
  }
};
