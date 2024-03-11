import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
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

    const params: DeleteCommandInput = {
      TableName: process.env.TODO_TABLE_NAME || "",
      Key: {
        id: todoId,
      },
    };

    await docClient.send(new DeleteCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Todo deleted successfully" }),
    };
  } catch (error) {
    console.error("Error deleting todo:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to delete todo" }),
    };
  }
};
