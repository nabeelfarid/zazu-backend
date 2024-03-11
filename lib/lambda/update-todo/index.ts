import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log(JSON.stringify({ event }, null, 2));
  try {
    const todoId = event.pathParameters?.id;
    const { description, complete } = JSON.parse(event.body || "{}");

    if (!todoId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Todo ID is required" }),
      };
    }
    if (!description?.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Description is required" }),
      };
    }
    if (complete === null || complete === undefined) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Complete is required" }),
        };
      }

    const params: UpdateCommandInput = {
      TableName: process.env.TODO_TABLE_NAME,
      Key: {
        id: todoId, // Assuming id is a string type in DynamoDB
      },
      UpdateExpression:
        "SET description = :description, complete = :complete, modifiedAt = :modifiedAt",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeValues: {
        ":description": description,
        ":complete": complete,
        ":modifiedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    const { Attributes } = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify(Attributes),
    };
  } catch (error) {
    console.error("Error updating todo:", error);
    if (error instanceof ConditionalCheckFailedException) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Todo not found" }),
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update todo" }),
    };
  }
};
