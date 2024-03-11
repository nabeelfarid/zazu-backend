# Welcome

This is a CDK Project.

## commands to build and deploy 

* `npm run build`   compile typescript to js
* `npm run cdk:synth`   emits the synthesized CloudFormation template
* `npm run cdk:deploy`  deploy this stack to your default AWS account/region

**API Base Url:** https://7ztszp0kf9.execute-api.us-east-2.amazonaws.com/prod
**Postman Collection:** todo_api.postman_collection.json
**Open API Doc:** openapi.yaml

| Method  | Resource/PATH  | Description  |
| ------------ | ------------ | ------------ |
| GET| /todo  | Returns all Todos in order of least recently created first |
| GET | /todo/{id} | Returns a Todo by `id` |
| POST | /todo | Creates a new Todo |
| PUT | /todo/{id}| Updates a Todo by `id` |
| DELETE | /todo/{id} |  Deletes a Todo by `id` |

### Decisions

- **DynamoDb GSI:** 
Since DynamoDb doesn't allow sorting of items when performing `SCAN` operation and `QUERY` operation doesn't allow sorting without specifying both `partitionKey` and `sortKey`, I had to decide what partitionKey to use for the index (GSI). To retrieve all Todos in order of least recently created first, I have created an index on DynamoDb table with `partitionKey` as `createdAtYear` and `sortKey` as `createdAt`. `createdAtYear`is the year from `createdAt`. This allows items to be distributed aross multiple partitions based on year. This helps reduce throtelling and hot partition issues and keep table fast and performant. `createdAtMonth` could also be another candidate but for the sake of simplicity I have used year and have hardcoded `2024` in lambda lib/lambda/read-todos/index.ts. In real world scenario we would have to query GSI from the lambda multiple times for all the years going back the earliest known year. Another option would be to SCAN the whole table and sort the items in our lambda but SCAN is costly for large data and loading all items in lambda would be slow in comparison and might require lambda with memory size. Another real world scneario could be that Todos belong to a user and in such case `userId`as `partitionKey` for GSI would suffice.

- **DynamoDB Paging 1MB Limit:**
DynamoDB Scan and Query are two main operations to fetch a collection of items.  Both of them can also return up to 1 MB of data per request. If the data queried is not present in the first request's response, you have to paginate through the results  re-calling the same operation but with ExclusiveStartKey set to LastEvaluatedKey from the previous one until LastEvaluatedKey is null. This has been catered for when retreiving all Todos in the lambda lib/lambda/read-todos/index.ts

- **Error Handling**
All API METHODS have been added using Lambda Proxy Integration so status code and response message are being set in Lambdas.  Within all lambdas, apprpriate HTTP status code have been returned e.g. 404 if todo doesn't exist, 400 if description has not been provided etc.

- **Request Body Schema Validation**
I havent' added all sorts of request body schema validation checks for GET and POST. But one can use libraries like Zod, Yup, Joi etc for such purpose.
 
 Within Update lambda (lib/lambda/update-todo/index.ts) I haven't catered for scenario when only some attributes are provided. For that, we can add simple logic to build the Update Expression based on the incoming attributes.
 
- **Authentication**
For API Authentication in API Gateway we can add Auhtorizer. There are two ways to add an Authorizer: 

1. Lambda Authorizer
A Lambda Authroizer also known aa Custom Authorizer is an API Gateway feature that uses a Lambda function to control access to your API. A Lambda authorizer is useful if you want to implement a custom authorization scheme that uses a bearer token authentication strategy such as OAuth or SAML, or that uses request parameters to determine the caller's identity. When a client makes a request to one of your API's methods, API Gateway calls your Lambda authorizer, which takes the caller's identity as input and returns an IAM policy as output.

	There are two types of Lambda authorizers:

	- A token-based Lambda authorizer (also called a TOKEN authorizer) receives the caller's identity in a bearer token, such as a JSON Web Token (JWT) or an OAuth token.

	- A request parameter-based Lambda authorizer (also called a REQUEST authorizer) receives the caller's identity in a combination of headers, query string parameters AND context variables.

1. Cognito User Pool As Authorizer
You can use an Amazon Cognito user pool to control who can access your API in Amazon API Gateway. To use an Amazon Cognito user pool with your API, you must first create an authorizer of the `COGNITO_USER_POOLS` type and then configure an API method to use that authorizer. After the API is deployed, the client must first sign the user in to the user pool, obtain an identity or access token for the user, and then call the API method with one of the tokens, which are typically set to the request's Authorization header. The API call succeeds only if the required token is supplied and the supplied token is valid, otherwise, the client isn't authorized to make the call because the client did not have credentials that could be authorized.

