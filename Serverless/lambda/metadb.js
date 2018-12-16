const uuid = require('uuid');
const AWS = require('aws-sdk');
AWS.config.update({signatureVersion: 'v4'});
var s3 = new AWS.S3( {
    endpoint: 's3.eu-west-2.amazonaws.com',
    signatureVersion: 'v4',
    region: 'eu-west-2'
} );
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const params = {
  TableName: process.env.DYNAMODB_TABLE,
};

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


function base64encode (value) {
  return new Buffer(value).toString('base64');
}

function generateExpirationDate() {
  var currentDate = new Date();
  currentDate = currentDate.setDate(currentDate.getDate() + 1);
  return new Date(currentDate).toISOString();
}

function push_to_metadb(key, track, album, genre, artist) {
  
  const timestamp = new Date().getTime();
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: uuid.v1(),
      s3file: key,
      track: track,
      album: album,
      artist: 'Unknown',
      genre: genre,
      artist: artist,
      playlist: '[]',
      created_time: timestamp,
      updated_time: timestamp

    },
  };

  dynamoDb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.log("Failed to log to MetaDB: " + error);
    }
  });

}


// S3Policy API
module.exports.metadb = (event, context, callback) => {
  console.log('event', event);
  var filename = null;
  var album = null;
  var genre = null;
  var artist = null;

  if (event.queryStringParameters && event.queryStringParameters.filename) {
    filename = decodeURIComponent(event.queryStringParameters.filename);
  } 
  else {
    callback(null, createErrorResponse(500, 'Filename must be provided')); 
    return;
  }
  if (event.queryStringParameters.album) {
    album = decodeURIComponent(event.queryStringParameters.album);
  }
  else {
    callback(null, createErrorResponse(500, 'Album must be provided'));
    return;
  }
  if (event.queryStringParameters.genre) {
    genre = decodeURIComponent(event.queryStringParameters.genre);
  }
  else {
    callback(null, createErrorResponse(500, 'Genre must be provided'));
    return;
  }
  if (event.queryStringParameters.artist) {
    artist = decodeURIComponent(event.queryStringParameters.artist);
  }
  else {
    callback(null, createErrorResponse(500, 'Artist must be provided'));
    return;
  }

  console.log("metadb lambda: artist = ", artist);

  var key = genre + '/' + album + '/' + filename;

  // Create Meta DB entry
  var trackname = filename.split('.')[0];
  trackname = trackname.replace(/^[0-9]+ /, "");
  push_to_metadb(key, trackname, album.toLowerCase(), genre, artist.toLowerCase);

  var response = {
    'statusCode': 200,
    'headers':  {'Access-Control-Allow-Origin': '*'},
    'body': JSON.stringify("Success")
  }
  callback(null, response);
}

