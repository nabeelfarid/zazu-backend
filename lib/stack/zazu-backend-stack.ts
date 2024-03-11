import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import path = require("path");

export class ZazuBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define DynamoDB table for storing TODO entities
    const todoTable = new dynamodb.Table(this, "TodoTable", {
      tableName: "Todos",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Use on-demand pricing
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete the table when the stack is deleted (for demo purposes only)
    });

    // Create global secondary index for sorting by createdAt date
    todoTable.addGlobalSecondaryIndex({
      indexName: "CreatedAtIndex",
      partitionKey: {
        name: "createdAtYear",
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL, // Include all attributes in the index
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING }, // Add sort key for createdAt date
    });

    // Lambda function to handle Create TODO operation
    const createTodoLambda = new lambdaNode.NodejsFunction(
      this,
      "CreateTodoLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: path.join(__dirname, "/../lambda/create-todo/index.ts"),
        environment: {
          TODO_TABLE_NAME: todoTable.tableName,
        },
      }
    );
    todoTable.grantWriteData(createTodoLambda);

    // Lambda function to handle Read TODO operation
    const readTodoLambda = new lambdaNode.NodejsFunction(
      this,
      "ReadTodoLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "/../lambda/read-todo/index.ts"),
        environment: {
          TODO_TABLE_NAME: todoTable.tableName,
        },
      }
    );
    todoTable.grantReadData(readTodoLambda);

    // Lambda function to handle Update TODO operation
    const updateTodoLambda = new lambdaNode.NodejsFunction(
      this,
      "UpdateTodoLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "/../lambda/update-todo/index.ts"),
        environment: {
          TODO_TABLE_NAME: todoTable.tableName,
        },
      }
    );
    todoTable.grantWriteData(updateTodoLambda);

    // Lambda function to handle Delete TODO operation
    const deleteTodoLambda = new lambdaNode.NodejsFunction(
      this,
      "DeleteTodoLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "/../lambda/delete-todo/index.ts"),
        environment: {
          TODO_TABLE_NAME: todoTable.tableName,
        },
      }
    );
    todoTable.grantWriteData(deleteTodoLambda);

    // Lambda function to handle List All TODOs operation
    const readTodosLambda = new lambdaNode.NodejsFunction(
      this,
      "ReadTodosLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "/../lambda/read-todos/index.ts"),
        environment: {
          TODO_TABLE_NAME: todoTable.tableName,
        },
      }
    );
    todoTable.grantReadData(readTodosLambda);

    // Define API Gateway
    const api = new apigateway.RestApi(this, "TodoApi");

    // Define API resources and integrate with Lambda functions
    const todoResource = api.root.addResource("todo");
    const todoWithIdResource = todoResource.addResource("{id}");

    const createTodoIntegration = new apigateway.LambdaIntegration(
      createTodoLambda
    );
    todoResource.addMethod("POST", createTodoIntegration);

    const readTodosIntegration = new apigateway.LambdaIntegration(
      readTodosLambda
    );
    todoResource.addMethod("GET", readTodosIntegration);

    const readTodoIntegration = new apigateway.LambdaIntegration(
      readTodoLambda
    );
    todoWithIdResource.addMethod("GET", readTodoIntegration);

    const updateTodoIntegration = new apigateway.LambdaIntegration(
      updateTodoLambda
    );
    todoWithIdResource.addMethod("PUT", updateTodoIntegration);

    const deleteTodoIntegration = new apigateway.LambdaIntegration(
      deleteTodoLambda
    );
    todoWithIdResource.addMethod("DELETE", deleteTodoIntegration);
  }
}
