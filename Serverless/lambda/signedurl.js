const AWS = require('aws-sdk');
AWS.config.update({accessKeyId: process.env.ACCESS_KEY, secretAccessKey: process.env.SECRET_ACCESS_KEY});
AWS.config.region = 'eu-west-2';
const s3 = new AWS.S3();

const dynamoDb = new AWS.DynamoDB();

function createErrorResponse(code, message) {
  var response = {
    'statusCode': code,
    'headers' : {'Access-Control-Allow-Origin' : '*'},
    'body' : JSON.stringify({'message' : message})
  }
  return response;
}

function createSuccessResponse(message) {
  var response = {
    'statusCode': 200,
    'headers' : {'Access-Control-Allow-Origin' : '*'},
    'body' : JSON.stringify(message)
  }

  return response;
}

module.exports.signedurl = (event, context, callback) => {
  console.log('Event', event);

  var trackid = "";
  var filekey = "";
  if (event.queryStringParameters && event.queryStringParameters.trackid) {
    trackid = decodeURIComponent(event.queryStringParameters.trackid);
  }

  if (event.queryStringParameters && event.queryStringParameters.filekey) {
    filekey = decodeURIComponent(event.queryStringParameters.filekey);
  }
  
  console.log ("In signedurl endpoint");
  if (!trackid && !filekey) {
    callback(null, createErrorResponse(500, 'Trackid or Filekey  must be provided'));
    return;
  }

  if (filekey) {
    var url = s3.getSignedUrl('putObject', {
        Bucket: process.env.UPLOAD_BUCKET,
        Key: filekey,
        Expires: 900 });

    var response = {
        'statusCode': 200,
        'headers':      {'Access-Control-Allow-Origin': '*'},
        'body': JSON.stringify({'url': url})
    }

    callback(null, response);
    
  }
  else {
    var params = {
      TableName: process.env.DYNAMODB_TABLE,
      "Key": {
        "id": { "S": trackid }
      }
    };
    dynamoDb.getItem(params, onScan);

    function onScan(err, result) {
      if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      }
      else {
        filekey = result.Item.s3file.S;

        var url = s3.getSignedUrl('getObject', {
          Bucket: process.env.UPLOAD_BUCKET,
          Key: filekey,
          Expires: 900 });

        var response = {
           'statusCode': 200,
           'headers':      {'Access-Control-Allow-Origin': '*'},
           'body': JSON.stringify({'url': url})
        }
        callback(null, response);
      }
    }
  }
}
