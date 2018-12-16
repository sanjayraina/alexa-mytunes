const AWS = require('aws-sdk'); 
AWS.config.update({accessKeyId: process.env.ACCESS_KEY, secretAccessKey: process.env.SECRET_ACCESS_KEY});
var s3 = new AWS.S3();

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Music API
module.exports.tracklist = (event, context, callback) => {
  console.log('event', event);

  var data = JSON.stringify(event.body);
  console.log('data', data);
  data = data.replace(/\"/gi, '');
  data = data.replace(/\\/gi, '');
  var attrbs = data.split('&');
  var srchattr = attrbs[0].split('=')[1];
  var srchval  = attrbs[1].split('=')[1];
  console.log ("srchattr = " + srchattr + ", srchval = " + srchval);

  var params;
  if (srchattr == 'Album') {
    srchval = srchval.toLowerCase();
    params = {
      TableName: process.env.DYNAMODB_TABLE,
      FilterExpression: "contains(#album, :album)",
      ExpressionAttributeNames: {
          "#album": "album"
      },
      ExpressionAttributeValues: {
          ":album": srchval
      }       
    };
  }
  else if (srchattr == 'Track') {
    params = {
      TableName: process.env.DYNAMODB_TABLE,
      FilterExpression: "contains(#track, :track)",
      ExpressionAttributeNames: {
          "#track": "track"
      },
      ExpressionAttributeValues: {
          ":track": srchval
      }       
    };
  }
  else if (srchattr == 'Genre') {
    params = {
      TableName: process.env.DYNAMODB_TABLE,
      FilterExpression: "contains(#genre, :genre)",
      ExpressionAttributeNames: {
          "#genre": "genre"
      },
      ExpressionAttributeValues: {
          ":genre": srchval
      }       
    };
  }
  else if (srchattr == 'Artist') {
    srchval = srchval.toLowerCase();
    params = {
      TableName: process.env.DYNAMODB_TABLE,
      FilterExpression: "contains(#artist, :artist)",
      ExpressionAttributeNames: {
          "#artist": "artist"
      },
      ExpressionAttributeValues: {
          ":artist": srchval
      }       
    };
  }
  else if (srchattr == 'Playlist') {
    params = {
      TableName: process.env.DYNAMODB_TABLE,
      FilterExpression: "contains(#playlist, :playlist)",
      ExpressionAttributeNames: {
          "#playlist": "playlist"
      },
      ExpressionAttributeValues: {
          ":playlist": srchval
      }       
    };
  }

  // Search the DB
  dynamoDb.scan(params, onScan);

  function onScan(err, result) {
    if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } 
    else {
      var result_arr = result.Items;
      var resp_arr = [];
      for (i = 0; i < result_arr.length; i++) { 
        var id       = result_arr[i].id;;
        var album    = result_arr[i].album;;
        var track    = result_arr[i].track;;
        var genre    = result_arr[i].genre;;
        var playlist = result_arr[i].playlist;;
  
        resp_arr.push({'id': id, 'album': album, 'track': track, 'genre': genre, 'playlist': playlist});
      }

      // var s3key = result_arr[0].s3file;
      // var url = s3.getSignedUrl('getObject', {
      //     Bucket: process.env.UPLOAD_BUCKET,
      //     Key: s3key,
      //     Expires: 900
      //     });

      var response = {
          'statusCode': 200,
          'headers':  {'Access-Control-Allow-Origin': '*'},
          'body': JSON.stringify(resp_arr)
      }
      callback(null, response);
    }
  }
}

