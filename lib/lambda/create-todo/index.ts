import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { nanoid } from "nanoid"; // Import uuidv4 function for generating GUID

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  DynamoDBDocumentClient,
  PutCommandInput,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log(JSON.stringify({ event }, null, 2));
  try {
    const { description } = JSON.parse(event.body || "");

    if (!description?.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Description is required" }),
      };
    }

    const todoId = nanoid(); // Generate a GUID for the todo id

    const createdAt = new Date();

    const params: PutCommandInput = {
      TableName: process.env.TODO_TABLE_NAME,
      Item: {
        id: todoId,
        description: description,
        complete: false,
        createdAt: createdAt.toISOString(),
        createdAtYear: createdAt.getUTCFullYear(),
        modifiedAt: new Date().toISOString(),
      },
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: todoId,
        description,
        complete: false,
        createdAt: params.Item?.createdAt,
        modifiedAt: params.Item?.modifiedAt,
      }),
    };
  } catch (error) {
    console.error("Error creating todo:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create todo" }),
    };
  }
};
