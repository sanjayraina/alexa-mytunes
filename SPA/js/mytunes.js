// Fill in with your values
const AUTH0_CLIENT_ID = '<YOUR AUTH0 CLIENT ID HERE>';
const AUTH0_DOMAIN = '<YOUR AUTH0 DOMAIN HERE>';
const AUTH0_CALLBACK_URL = window.location.href;
const AUTH0_AUDIENCE = '<YOUR AUTH0 AUDIENCE NAME HERE>';
const METADB_ENDPOINT = '<METADB ENDPOINT HERE>';
const SIGNED_URL_ENDPOINT = 'SIGNED_URL ENDPOINT HERE>';
const TRACKS_ENDPOINT = '<TRACKLIST ENDPOINT HERE>';

var lock;


function mytunesInit() {

  refreshUI();   // initial refresh

  initLock();       // set up Auth0 lock widget

  initHeader();             // Login / logout button listener

  initFooter();                 // Play/Upload buttons in footer

  initSearch();                // Search button event listener

  initPlayer();                // Player button listener

  initUpload();                // Upload button listener

}

/*
 * Refresh UI
 */
function refreshUI() {

  if (localStorage.getItem('access_token')) {

    // swap buttons
    document.getElementById('auth0-login').style.display = 'none';
    document.getElementById('auth0-logout').style.display = 'flex';
    const profile = JSON.parse(localStorage.getItem('profile'));

    // show name
    document.getElementById('login-as').textContent = 'Logged in as: ' + profile.name;
    document.getElementById('login-as').style.display = 'flex';
    document.getElementById('login-as').addEventListener('click', () => {
      alert('User Id: ' + profile.sub);
    });
    $('#nav-tab-upload').show();            // Show the upload/search panes if logged in
    $('#nav-tab-search').show();
  }
  else {
    document.getElementById('login-as').style.display = 'none';
    document.getElementById('auth0-login').style.display = 'flex';
    document.getElementById('auth0-logout').style.display = 'none';
    document.getElementById('login-as').textContent = '';
    document.getElementById('login-as').style.display = 'none';
    document.getElementById('auth0-login').style.display = 'flex';
    document.getElementById('auth0-logout').style.display = 'none';
    document.getElementById('login-as').textContent = '';
    $('#nav-tab-upload').hide();            // Do not show upload/search panes if not logged in
    $('#nav-tab-search').hide();
  }
}

/*
 *  initialize auth0 lock
 */
function initLock() {

    var options = {
      auth: {
        scope: 'openid profile',
        audience: AUTH0_AUDIENCE
      }
    };

    lock = new Auth0Lock(AUTH0_CLIENT_ID, AUTH0_DOMAIN, options);

    // On authentication
    lock.on("authenticated", function(authResult) {
      console.log("lock accessToken = " + JSON.stringify(authResult));

      // Set the time that the Access Token will expire at
      const expiresAt = JSON.stringify(
        authResult.expiresIn * 1000 + new Date().getTime()
      );
      localStorage.setItem('access_token', authResult.accessToken);
      localStorage.setItem('token_expires', expiresAt);
      
      lock.getUserInfo(authResult.accessToken, function(error, profile) {
        if (error) {
          // Handle error
          console.log(JSON.stringify(error));
          return false;
        }
        // authResult.idToken && authResult.idToken
        // Save the JWT token.
        
        // Save the profile
        localStorage.setItem('profile', JSON.stringify(profile));
        refreshUI();
      });

    });
}

/*
 * Init header and footer
 */
function initHeader() {

  // Handle login
  document.getElementById('auth0-login').addEventListener('click', () => {
    lock.show();
  });

  // Handle logout
  document.getElementById('auth0-logout').addEventListener('click', () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('profile');
    refreshUI();
  });

  document.getElementById('spinner').style.display = 'none';
  document.getElementById('upload-status').style.display = 'none';
}

function initFooter() {
  // Handle Footer buttons
  document.getElementById('mytunes-footer-play').style.display = 'none';
  document.getElementById('mytunes-footer-upload').style.display = 'none';
  $('.nav-tabs a').on('show.bs.tab', function(event) {
    var tab_text = $(event.target).text();
    if (tab_text == 'Home') {
      document.getElementById('mytunes-footer-play').style.display = 'none';
      document.getElementById('mytunes-footer-upload').style.display = 'none';
    }
    else if (tab_text == 'Upload') {
      console.log ('Upload tab shown');
      document.getElementById('mytunes-footer-play').style.display = 'none';
      document.getElementById('mytunes-footer-upload').style.display = 'block';
    } 
    else if (tab_text == 'Search') {
      console.log ('Search tab shown');
      document.getElementById('mytunes-footer-upload').style.display = 'none';
      document.getElementById('mytunes-footer-play').style.display = 'block';
    } 
  });

}

/* 
 * Init search button to call API to get track list
 */
function initSearch() {

 // Handle Search track
  document.getElementById('search-track-btn').addEventListener('click', () => {

    var srchattr = $('#search-attrib').val();
    var srchval = $('#search-contains').val();
    console.log("Play srchattr = " + srchattr + ", srchval = " + srchval);

    checkTokenExpiry();

    const token = localStorage.getItem('access_token');
    var hdr_auth = "Bearer " + token;
    var post_data = {srchattr: srchattr, srchval: srchval};

    $.ajax({
      type: 'POST',
      url: TRACKS_ENDPOINT,
      headers: {'Content-Type': 'application/json',
                Authorization: hdr_auth},
      data: post_data
    }).done(function (data) {
      console.log('Play: ' + JSON.stringify(data));
      var table = document.getElementById("music-list-table");    // Create table to show search results

      for (i = 0; i < data.length; i++) {
        var tr = document.createElement("tr");
  
        var td = document.createElement("td");
        var chk = document.createElement('input');
        chk.type = "checkbox";
        var tid = document.createElement('input');
        tid.type = "hidden";
        tid.value = data[i].id;
        td.setAttribute("align","center"); 
        td.appendChild(chk);
        td.appendChild(tid);
        tr.appendChild(td);
    
        td = document.createElement("td");
        txt = document.createTextNode(data[i].track);
        td.appendChild(txt);
        tr.appendChild(td);
    
        td = document.createElement("td");
        txt = document.createTextNode(data[i].album);
        td.appendChild(txt);
        tr.appendChild(td);
    
        td = document.createElement("td");
        txt = document.createTextNode(data[i].genre);
        td.appendChild(txt);
        tr.appendChild(td);
    
        td = document.createElement("td");
        txt = document.createTextNode("Playlist");
        td.appendChild(txt);
        tr.appendChild(td);
    
        table.appendChild(tr);
      } 
    }).error(function (data) {
      document.getElementById('player-status').innerHTML = 'Get Track List failed. Check authorisation ';
      document.getElementById('player-status').style.display = 'flex';
      console.log('Play error: ' + JSON.stringify(data));
    })

  });
}

/*
 * Init player button, to play audio track using the signed url and HTML5 AUDIO element
 */
function initPlayer() {

  document.getElementById('play-track-btn').style.display = 'inline-block';
  document.getElementById('pause-track-btn').style.display = 'none';

  var x = document.createElement("AUDIO");      // Player controls
  x.id = "mytunes-audio";
  x.controls = false;
  document.body.appendChild(x);


  document.getElementById('pause-track-btn').addEventListener('click', () => {
     var x = document.getElementById("mytunes-audio");
     document.getElementById('play-track-btn').style.display = 'inline-block';
     document.getElementById('pause-track-btn').style.display = 'none';
     x.pause();
  });

  document.getElementById('stop-track-btn').addEventListener('click', () => {
     var x = document.getElementById("mytunes-audio");
     document.getElementById('player-status').innerHTML = 'Player stopped ' + '<br>';
    document.getElementById('player-status').style.display = 'flex';
     x.pause();
     x.currentTime = 0;
  });

  // Backward button function
  //
  document.getElementById('backward-track-btn').addEventListener('click', () => {
    
    var epurl = previous_track();                        // API Endpoint URL for track list

    get_signed_url(epurl, function(url) {               // Get the temp signed URL to play
      var x = document.getElementById("mytunes-audio");
      x.setAttribute("src", url);
      x.play();
    });
  });

  // Forward button function
  //
  document.getElementById('forward-track-btn').addEventListener('click', () => {
    
    var epurl = next_track();                           // API Endpoint URL for track list

    get_signed_url(epurl, function(url) {               // Get the temp signed URL to play
      var x = document.getElementById("mytunes-audio");
      x.setAttribute("src", url);
      x.play();
    });
  });

  // Check or Uncheck all rows
  //
  document.getElementById('all-checkbox').addEventListener('click', () => {
    var chkall = document.getElementById('all-checkbox').checked;
    var table = document.getElementById("music-list-table");

    for (var i = 1; i < table.rows.length; i++) {
      var cell_html = table.rows[i].cells[0].innerHTML;  
      var cell = table.rows[i].cells[0];
      var children = cell.childNodes;
      if (chkall) {
        children[0].checked = true; 
      }
      else {
        children[0].checked = false; 
      }
    }
  });

  // Play button function
  //
  document.getElementById('play-track-btn').addEventListener('click', () => {
    var x = document.getElementById("mytunes-audio");

    if (x.paused && x.currentTime != 0) {     // Paused and not stopped
      console.log("Playing paused track: currentTime = " + x.currentTime);
      x.play();
    }
    else {
      
      var epurl = select_tracks();            // API Endpoint URL for track list

      get_signed_url(epurl, function(url) {   // Get the temp signed URL to play
        console.log ("Playing file");
        var x = document.getElementById("mytunes-audio");
        x.setAttribute("src", url);
        document.getElementById('play-track-btn').style.display = 'none';
        document.getElementById('pause-track-btn').style.display = 'inline-block';
        document.getElementById('player-status').innerHTML += 'Playing ' + '<br>';
        document.getElementById('player-status').style.display = 'flex';
        x.play();
      });
    }
  });

  // Set Shuffle ON or OFF
  //
  document.getElementById('shuffle-track-btn').addEventListener('click', () => {
    var sh_flag = localStorage.getItem('shuffle_flag');
    if (sh_flag == 'on') {
      console.log('shuffle off');
      localStorage.setItem('shuffle_flag', 'off');
      document.getElementById('shuffle-track-btn').style.color = 'grey';
    }
    else {
      console.log('shuffle on');
      localStorage.setItem('shuffle_flag', 'true');
      document.getElementById('shuffle-track-btn').style.color = 'red';
    }
  });

  // Play next track when track ends
  //
  var x = document.getElementById("mytunes-audio");
  x.onended = function() {

    var epurl = next_track();

    get_signed_url(epurl, function(url) {
      var x = document.getElementById("mytunes-audio");
      x.setAttribute("src", url);
      x.play();
    });
    
  };
    
}

/*
 * Check if shuffle enabled
 */
function is_shuffle_enabled() {
  return (localStorage.getItem('shuffle_flag'));
}

/*
 * Select tracks
 */
function select_tracks() {
  var table = document.getElementById("music-list-table");
  var track_list = [];
  for (var i = 0; i < table.rows.length; i++) {
    var cell_html = table.rows[i].cells[0].innerHTML;  
    var cell = table.rows[i].cells[0];
    var children = cell.childNodes;
        
    if (children[0].checked) {
      console.log("checkbox = " + children[0].checked + ", id = " + children[1].value);
      track_list.push(children[1].value);
    }
  }
  localStorage.setItem('track_list', track_list);     // Save state
  
  var ci = 0;
  if (is_shuffle_enabled()) {
    Math.floor((Math.random() * track_list.length));
  }
  localStorage.setItem('cur_track_index', 0);

  var epurl = SIGNED_URL_ENDPOINT + '?trackid=' + encodeURI(track_list[0]);

  return (epurl);
}

/*
 * Return next track index
 */
 function next_track() {
    var ci = localStorage.getItem('cur_track_index');
    var tl_str = localStorage.getItem('track_list');
    var tl = tl_str.split(',');

    var ni = parseInt(ci, 10) +1;
    var num_tracks = tl.length;


    if (is_shuffle_enabled()) {
      ni = Math.floor((Math.random() * num_tracks));
    }
    else if (ni == num_tracks) {
        ni = 0;
    }
    console.log("next_track: ci = " + ci + ", ni = " + ni + ", num_tracks = " + num_tracks);
    localStorage.setItem('cur_track_index', ni);

    var epurl = SIGNED_URL_ENDPOINT + '?trackid=' + encodeURI(tl[ni]);

    return (epurl);
 }

/*
 * Return previous track index
 */
function previous_track() {
  var ci = localStorage.getItem('cur_track_index');
  var tl_str = localStorage.getItem('track_list');
  var tl = tl_str.split(',');
  var num_tracks = tl.length;

  ni = parseInt(ci, 10);

  var ni = 0;
  if (is_shuffle_enabled()) {
    ni = Math.floor(Math.random() * num_tracks);
  }
  else if (ni != 0) {
      ni--;
  } 
  console.log ("Tl.length = " + tl.length + ", ni = " + ni);
  localStorage.setItem('cur_track_index', ni);
  var epurl = SIGNED_URL_ENDPOINT + '?trackid=' + encodeURI(tl[ni]);

  return (epurl);
}


/* 
 * Get signature to upload to S3
 */
function initUpload() {

  document.getElementById('upload-music-btn').addEventListener('click', () => {
    var files = Array.from($('#upload-input').get(0).files);
    localStorage.setItem('file_count', files.length);
    const uploadInput = $('#upload-input');
    console.log ('Files length = ' + files.length + ", Files array = " + JSON.stringify(uploadInput));

    var album = document.getElementById('input-album').value;
    var genre = document.getElementById('input-genre').value;
    var artist = document.getElementById('input-artist').value;
   
    checkTokenExpiry();

    files.forEach(function (file) {
      console.log ('File = ' + JSON.stringify(file) + ', file size = ' + file.size);
      var fkey = genre + '/' + album + '/' + file.name;
      
      var meta_update_url = METADB_ENDPOINT + '?filename=' + encodeURI(file.name)
          + '&album=' + encodeURI(album) + '&genre=' + encodeURI(genre) + '&artist=' + encodeURI(artist);

      const token = localStorage.getItem('access_token');
      var hdr_auth = "Bearer " + token;
      console.log("get_up_load_sig(): meta_update_url = " + meta_update_url)

      $.ajax({
        type: 'GET',
        url: meta_update_url,
        headers: {Authorization: hdr_auth}
      })
      .done(function (data) {
        console.log('GET Meta DB update: ' + JSON.stringify(data) + ', filename = ' + file.name);
        upload_file(file, album, genre, fkey);
      })
      .error(function (data) {
        console.log('GET Error: ' + JSON.stringify(data));
      });
      
    });
  });
}

/*
 * Upload file to S3 Bucket using temp signed url
 */
function upload_file(file, album, genre, key) {
  
  var epurl = SIGNED_URL_ENDPOINT + '?filekey=' + encodeURI(key);
  get_signed_url(epurl, function(url) {
      console.log ("Received signed url: " + url);

      console.log ('In upload_file: file = ' + file.name);
      document.getElementById('spinner').style.display = 'flex';
      document.getElementById('upload-status').style.display = 'none';
      document.getElementById('upload-status').innerHTML += 'Uploading ' + file.name + '<br>';
      document.getElementById('upload-status').style.display = 'flex';

      $.ajax({
        type: 'PUT',
        url: url,
        // Content type must much with the parameter you signed your URL with
        contentType: 'binary/octet-stream',
        // this flag is important, if not set, it will try to send data as a form
        processData: false,
        // the actual file is sent raw
        data: file
      })
      .done(function(response) {
        console.log('File uploaded');
        document.getElementById('upload-status').style.display = 'none';
          document.getElementById('upload-status').innerHTML += 'Uploaded ' + file.name + '<br>';
          document.getElementById('upload-status').style.display = 'flex';
          var count = localStorage.getItem('file_count');
          count--;
          localStorage.setItem('file_count', count);
              console.log(' count = ' + count);
          if (!count) {
              console.log(' In count if');
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('upload-status').style.display = 'none';
              document.getElementById('upload-status').innerHTML = 'Uploads completed';
              document.getElementById('upload-status').style.display = 'flex';
          }
      })
      .fail(function(response) {
        console.log('File failed to upload');
        console.log( arguments);
      });
    });

  
}

/*
 * Call API to get signed URL
 */
function get_signed_url(epurl, cb) {

    checkTokenExpiry();
    const token = localStorage.getItem('access_token');
    var hdr_auth = "Bearer " + token;

    console.log("signedurl_url = " + epurl + ", token = " + token);
 
      $.ajax({
        type: 'GET',
        url: epurl,
        headers: {Authorization: hdr_auth}
      })
      .done(function (data) {
        console.log('GET Signed URL policy: ' + JSON.stringify(data));
        cb(data.url);
      })
      .error(function (data) {
        console.log('GET Signed URL Error: ' + JSON.stringify(data));
      });
}

/*
 * Check is token expired
 */
 function checkTokenExpiry() {
  const expiresAt = localStorage.getItem('token_expires');
  if (expiresAt) {
    const expiresIn = (expiresAt - Date.now())/1000;
    console.log ("checkTokenExpiry: expiresIn = " + expiresIn);

    if (expiresIn < 300) {
     
      console.log ("checkTokenExpiry: expiresAt = " + expiresAt);
     
      lock.checkSession({}, function(err, authResult) {
        if (err) {
          console.log("checkTokenExpiry: err = " + JSON.stringify(err));
          localStorage.removeItem('access_token');
          localStorage.removeItem('profile');
          refreshUI();
        }
        else {
          console.log("checkTokenExpiry: authResult = " + JSON.stringify(authResult));
          const newExpiresAt = JSON.stringify(
            authResult.expiresIn * 1000 + new Date().getTime()
          );
          localStorage.setItem('access_token', authResult.accessToken);
          localStorage.setItem('token_expires', newExpiresAt);
        }
        
      });
    } 
  }
  


 }
