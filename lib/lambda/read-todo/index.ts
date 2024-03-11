import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log(JSON.stringify({ event }, null, 2));
  try {
    const todoId = event.pathParameters?.id;

    if (!todoId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Todo ID is required" }),
      };
    }

    const params: GetCommandInput = {
      TableName: process.env.TODO_TABLE_NAME || "",
      Key: {
        id: todoId, // Assuming id is a string type in DynamoDB
      },
    };

    console.log("params", params);
    const { Item } = await docClient.send(new GetCommand(params));

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Todo not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(Item),
    };
  } catch (error) {
    console.error("Error reading todo:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to read todo" }),
    };
  }
};
