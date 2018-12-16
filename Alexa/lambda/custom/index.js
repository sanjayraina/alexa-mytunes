
const Alexa = require('ask-sdk');
const https = require('https');

var accessToken = "";

const API_HOST = "<YOUR API HOST FQDN>";

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    
    const speechText = 'Welcome to the myTunes App. How can I help?';
    console.log("LaunchRequest: request = ", handlerInput.requestEnvelope);
    // accessToken = handlerInput.requestEnvelope.session.user.accessToken;
     accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
    console.log ("In LaunchRequestHandler: accessToken = " + accessToken);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const PlayTrackIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'PlayTrackIntent';
  },
  async handle(handlerInput) {
    console.log("PlayTrackIntentHandler: request = ", handlerInput.requestEnvelope);
    
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;

    var album = filledSlots.Album.value;

    const post_data = 'srchattr=Album&srchval=' + album;
    
    if (accessToken) {

      var track_list = await getTrackList(post_data);     // Get Track List
      console.log("Track list = " + JSON.stringify(track_list));

      // Save session attributes
      // const attributes = await handlerInput.attributesManager.getPersistentAttributes();
      const attributes = await handlerInput.attributesManager.getPersistentAttributes() || {};
      attributes.tracks = track_list;
      attributes.index = 0;
      attributes.token = track_list[0].id;

      var signed_url = await get_signed_url(track_list[0].id);  // Get the signed url for the track
      console.log("Signed Url = " + JSON.stringify(signed_url));

      var speech_text = "Playing track " + track_list[0].track + ", from album " + track_list[0].album;

      handlerInput.responseBuilder
        .speak(speech_text)
        .withShouldEndSession(true)
        .addAudioPlayerPlayDirective('REPLACE_ALL', signed_url.url, track_list[0].id, 0, null);

      return handlerInput.responseBuilder
        .getResponse();
    }
    
  }
};

const PlaybackStartedHandler = {
  canHandle(handlerInput) {
    console.log("PlaybackStartedHandler: type = " + handlerInput.requestEnvelope.request.type);
    return handlerInput.requestEnvelope.request.type === "AudioPlayer.PlaybackStarted";
  },
  handle(handlerInput) {
    console.log ("Playback has started.");

    return handlerInput.responseBuilder.getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {

    handlerInput.responseBuilder
      .speak('Stopping player')
      .addAudioPlayerClearQueueDirective('CLEAR_ALL')
      .addAudioPlayerStopDirective();

    return handlerInput.responseBuilder
      .getResponse();
  },
};


const PlaybackNearlyFinishedHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'AudioPlayer.PlaybackNearlyFinished';
  },
  async handle(handlerInput) {
    console.log ("Playback nearly finished.");
    const attributesManager = handlerInput.attributesManager;
    const attributes = await attributesManager.getPersistentAttributes() || {};
    const cur_index = attributes.index;
    const cur_length = attributes.tracks.length;
    const cur_loop = attributes.loop;
    const cur_shuffle = attributes.shuffle;
    const cur_token = attributes.token;
    const cur_tracks = attributes.tracks;

    const new_index = calc_index (cur_index, cur_length, 'FORWARD', cur_loop);
    if (new_index == cur_index) {     // Have we reached the end of track list?
      return handlerInput.responseBuilder
      .speak("No more tracks to play. Stopping. Goodbye!")
      .addAudioPlayerStopDirective()
      .getResponse();
    }
    else {
      const new_token = cur_tracks[new_index].id;

      attributes.index = new_index;     // save new index
      attributes.token = new_token;     // save new track id


      var signed_url = await get_signed_url(new_token);  // Get the signed url for the new track

      console.log("Signed Url = " + JSON.stringify(signed_url));

      return handlerInput.responseBuilder
        .addAudioPlayerPlayDirective('ENQUEUE', signed_url.url, new_token, 0, cur_token)
        .getResponse();
    }  
  },

};

const PlaybackStoppedHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type == 'AudioPlayer.PlaybackStopped';
  },
  handle(handlerInput) {
    console.log ("Playback Stopped.");
    
    return handlerInput.responseBuilder
        .getResponse();
  }
}


const PlaybackFinishedHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'AudioPlayer.PlaybackFinished';
  },
  handle(handlerInput) {
    console.log ("Playback Finished.");
    return handlerInput.responseBuilder
        .getResponse();
  }
}

// Next Track
//
const NextTrackIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NextIntent';
  },
  async handle(handlerInput) {
    console.log ("Next Track Intent.");
    const attributesManager = handlerInput.attributesManager;
    const attributes = await attributesManager.getPersistentAttributes() || {};

    var previous_token = attributes.token;
    var new_index = calc_index (attributes.index, attributes.tracks.length, 'FORWARD', attributes.loop);
    var new_token = attributes.tracks[new_index].id;

    attributes.index = new_index;
    attributes.token = new_token;     // next track

    var signed_url = await get_signed_url(new_token);  // Get the signed url for the track

    console.log("Next Track: Signed Url = " + JSON.stringify(signed_url));

    handlerInput.responseBuilder
      .withShouldEndSession(true)
        .addAudioPlayerPlayDirective('REPLACE_ALL', signed_url.url, new_token, 0, null);

    return handlerInput.responseBuilder
        .getResponse();
  },

};

// Previous Track
//
const PreviousTrackIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.PreviousIntent';
  },
  async handle(handlerInput) {
    console.log ("Previous Track Intent.");
    const attributesManager = handlerInput.attributesManager;
    const attributes = await attributesManager.getPersistentAttributes() || {};

    var previous_token = attributes.token;
    var new_index = calc_index (attributes.index, attributes.tracks.length, 'REVERSE', attributes.loop);
    var new_token = attributes.tracks[new_index].id;

    attributes.index = new_index;
    attributes.token = new_token;     // next track

    var signed_url = await get_signed_url(new_token);  // Get the signed url for the track

    console.log("Signed Url = " + JSON.stringify(signed_url));

    handlerInput.responseBuilder
        .addAudioPlayerPlayDirective('ENQUEUE', signed_url.url, new_token, 0, previous_token);

    return handlerInput.responseBuilder
        .getResponse();
  },

};


const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log("Error handled: " + error.message + ", request_type = " + handlerInput.requestEnvelope.request.type);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

/*
 *  Get track id of next track
 */
async function get_new_track(handlerInput, attributes, direction) {
  
  console.log ("PlaybackNearlyFinished: attributes = " + JSON.stringify(attributes));
      
  var cur_index = attributes.index;
  var new_index = calc_index (attributes.index, attributes.tracks.length, direction, attributes.loop);
  var new_token = attributes.tracks[new_index].id;
  console.log("After enqueue_token");
 
  attributes.index = new_index;
  attributes.token = new_token;
  console.log ("After setPersistent");

  return new_token;

}

function calc_index(cur, length, direction, loop) {
  var new_index = cur;
  if (direction == 'FORWARD') {
    if ((cur + 1) == length && loop) {
      new_index = 0;
    }
    else {
      new_index = cur + 1;
    }
  }
  else if (direction == 'REVERSE') {
    if (cur == 0 && loop) {
      new_index = length - 1;
    }
    else {
      new_index = cur - 1;
    }
  }
  return new_index;
}




function getTrackList(post_data) {
  var hdr_auth = "Bearer " + accessToken;
  return new Promise(((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: 443,
      path: '/dev/tracklist',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': post_data.length,
        Authorization: hdr_auth
      }
    };
    const request = https.request(options, (response) => {
      response.setEncoding('utf8');
      let returnData = '';

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}"`));
      }

      response.on('data', (chunk) => {
        returnData += chunk;
      });

      response.on('end', () => {
        resolve(JSON.parse(returnData));
      });

      response.on('error', (error) => {
        reject(error);
      });
    });
    request.write(post_data);
    request.end();
  }));
}

function get_signed_url(track_id) {
  var hdr_auth = "Bearer " + accessToken;

  console.log("get_signed_url: track_is = " + track_id);

  return new Promise(((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: 443,
      path: '/dev/signedurl' + '?trackid=' + encodeURI(track_id),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: hdr_auth
      }
    };

    const request = https.request(options, (response) => {
      response.setEncoding('utf8');
      let returnData = '';

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`));
      }

      response.on('data', (chunk) => {
        returnData += chunk;
      });

      response.on('end', () => {
        resolve(JSON.parse(returnData));
      });

      response.on('error', (error) => {
        reject(error);
      });
    });
    request.end();
  }));

}



/*
 * Interceptors
 */
const LoadPersistentAttributesRequestInterceptor = {
  async process(handlerInput) {
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();

    // Check if user is invoking the skill the first time and initialize preset values
    
    if (Object.keys(attributes).length === 0) {
      attributes.tracks = [];
      attributes.token = 0;
      attributes.index = 0;
      attributes.loop = false;
      attributes.shuffle = false;
      handlerInput.attributesManager.setPersistentAttributes(attributes);
    }
  }
};

const SavePersistentAttributesResponseInterceptor = {
  async process(handlerInput) {
    await handlerInput.attributesManager.savePersistentAttributes();
  },
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayTrackIntentHandler,
    PlaybackStartedHandler,
    CancelAndStopIntentHandler,
    PlaybackNearlyFinishedHandler,
    PlaybackStoppedHandler,
    PlaybackFinishedHandler,
    PreviousTrackIntentHandler,
    NextTrackIntentHandler
  )
  .addRequestInterceptors(LoadPersistentAttributesRequestInterceptor)
  .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withTableName('alexa-my-tunes')
  .withAutoCreateTable(true)
  .lambda();
