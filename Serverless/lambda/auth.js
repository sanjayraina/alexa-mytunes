const AWS = require('aws-sdk');
AWS.config.update({accessKeyId: process.env.ACCESS_KEY, secretAccessKey: process.env.SECRET_ACCESS_KEY});
const dynamoDb = new AWS.DynamoDB();

const jwt = require('jsonwebtoken');
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_CERT = process.env.AUTH0_CLIENT_CERT;
const AUTH0_CLIENT_AUDIENCE = process.env.AUTH0_CLIENT_AUDIENCE;




// Policy helper function
const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
}

module.exports.auth = (event, context, callback) => {
  console.log('event', event);
  console.log('context', context);
  let endpoint = event.methodArn;
  endpoint = endpoint.replace(/.*\//, '');

  if (!event.authorizationToken) {
    return callback('Unauthorized event');
  }

  const tokenParts = event.authorizationToken.split(' ');
  const tokenValue = tokenParts[1];

  if (!(tokenParts[0].toLowerCase() === 'bearer' && tokenValue)) {
    // no auth token!
    return callback('Unauthorized no token');
  }
  const options = {
    algorithms: ['RS256'],
    audience: AUTH0_CLIENT_AUDIENCE
  }
  // decode base64 secret. ref: http://bit.ly/2hA6CrO
  try {
    jwt.verify(tokenValue, AUTH0_CLIENT_CERT, options, (verifyError, decoded) => {
      if (verifyError) {
        // 401 Unauthorized
        console.log(`Token invalid. ${verifyError}`);
        return callback('Unauthorized invalid token')
      }
      console.log("Decoded sub: " + JSON.stringify(decoded.sub) + ", endpoint = " + endpoint);
      let userid = JSON.stringify(decoded.sub);
      userid = userid.replace(/"/g, '');
      // Get the matching user from DB
      var params = {
        TableName: process.env.USERS_TABLE,
        "Key": {
          "id": { "S": userid }
        }
      };
      dynamoDb.getItem(params, onScan);

      function onScan(err, result) {
        console.log ("DB item = " + JSON.stringify(result));
        if (err) {
          console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
        }
        else if (result.Item) {
          const role = result.Item.role.S;
          if ((endpoint.match(/^(play|signedurl)$/) && role.match(/^(User|Admin)$/)) || (endpoint == 'upload' && role == 'Admin')) {
            console.log("authorizer: Found user in DB");
            callback(null, generatePolicy(decoded.sub, 'Allow', event.methodArn));
          }
          else {
            console.log("authorizer: User found  in DB, but not role");
            callback('Unauthorized user');
          }
        }
        else {
          console.log("authorizer: User not found  in DB");
            allback('Unauthorized user');
        }
      }

      // is custom authorizer function
      //return callback(null, generatePolicy(decoded.sub, 'Allow', event.methodArn));
    })
   } catch (err) {
    console.log('catch error. Invalid token', err);
    return callback('Unauthorized jsonwebtoken');
  }
}

