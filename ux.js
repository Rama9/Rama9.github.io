/*jslint sloppy:true */
/*globals freedom, console*/

/**
 * Bind handlers on startup
 */
function start(instance) {
  var chatClient = instance(),
    // If messages are going to a specific user, store that here.
    activeBuddylistEntry,
    buddylist,
    input;

    var localStream, remoteStream;
    var pc, remoteId;

    var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

    var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

// Set up audio and video regardless of what devices are present.
    var sdpConstraints = {'mandatory': {
         'OfferToReceiveAudio':true,
         'OfferToReceiveVideo':true }};
    var turnReady;

  document.getElementById('msg-input').focus();

  var localVideo, videos;

  function handleUserMedia(stream) {
     console.log('Adding local stream.');
     localVideo.src = window.URL.createObjectURL(stream);
     localStream = stream;

     //sendMessage('got user media');
     //if (isInitiator) {
     //  maybeStart();
     //}
   }

   function handleUserMediaError(error){
      console.log('getUserMedia error: ', error);
   }

//   function getMedia() {
       var constraints = {video: true};
       localVideo = document.querySelector('#localVideo');
       videos = document.querySelector('#remoteVideos');
       getUserMedia(constraints, handleUserMedia, handleUserMediaError);
//   }

 /*  if (location.hostname != "localhost") {
      requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
   }*/

   function maybeStart(shouldCall) {
     if (typeof localStream != 'undefined') {
        createPeerConnection();
        pc.addStream(localStream);
        
        if (shouldCall) {
           doCall();
        }
     }
   }

  function clearLog() {
    var log = document.getElementById('messagelist');
    log.innerHTML = "";
  }

  function appendLog(elt) {
    var log = document.getElementById('messagelist'),
      br;
    //Trim old messages
    while (log.childNodes.length > 36) {
      log.removeChild(log.firstChild);
    }
    log.appendChild(elt);
    br = document.createElement('br');
    log.appendChild(br);
    br.scrollIntoView();
  }

  function makeDisplayString(buddylistEntry) {
    return buddylistEntry.name && buddylistEntry.name !== buddylistEntry.userId ?
        buddylistEntry.name + ' (' + buddylistEntry.userId + ')' :
        buddylistEntry.userId;
  }

  function redrawBuddylist() {
    var onClick = function (buddylistEntry, child) {
      console.log("Messages will be sent to: " + buddylistEntry.userId);
      activeBuddylistEntry = buddylistEntry;
      redrawBuddylist();
      document.getElementById('msg-input').focus();
    },
      buddylistDiv = document.getElementById('buddylist'),
      userId,
      child;

    // Remove all elements in there now
    buddylistDiv.innerHTML = "<b>Buddylist</b>";

    // Create a new element for each buddy
    for (userId in buddylist) {
      if (buddylist.hasOwnProperty(userId)) {
        child = document.createElement('div');
        if (activeBuddylistEntry === buddylist[userId]) {
          child.innerHTML = "[" + makeDisplayString(buddylist[userId]) + "]";
        } else {
          child.innerHTML = makeDisplayString(buddylist[userId]);
        }
        // If the user clicks on a buddy, change our current destination for messages
        child.addEventListener('click', onClick.bind(this, buddylist[userId], child), true);
        buddylistDiv.appendChild(child);
      }
    }

  }
  
  // on changes to the buddylist, redraw entire buddylist
  chatClient.on('recv-buddylist', function (val) {
    buddylist = val;
    redrawBuddylist();
  });

  // Inform of the new arrival, to all others
  chatClient.on('new-join', function (dataId) {
    console.log('New Joinee : ', dataId);
    maybeStart(true);
    remoteId = dataId;
    chatClient.send(dataId, "Ack-new");
  });

  // On new messages, append it to our message log
  chatClient.on('recv-message', function (data) {

   if ( data.message.indexOf('{') > -1 && data.message.indexOf('}') > -1 ) {
        var decodeMesg = JSON.parse(data.message);
        console.log ( 'Data Packet Info : ', data.from.userId, decodeMesg.type, typeof decodeMesg );

        if (decodeMesg.type === 'offer' ) {
           console.log('May be start at: ', decodeMesg.type);
           remoteId = data.from.userId;
           maybeStart(false);
           pc.setRemoteDescription(new RTCSessionDescription(decodeMesg));
           doAnswer();
        } else if (decodeMesg.type === 'answer' ) {
           pc.setRemoteDescription(new RTCSessionDescription(decodeMesg));
        } else if (decodeMesg.type === 'candidate' ) {
            var candidate = new RTCIceCandidate({
            sdpMLineIndex: decodeMesg.label,
            candidate: decodeMesg.candidate
          });
          pc.addIceCandidate(candidate);
        }
   }
   else {    
      if ( data.message === "Ack-new" ) {
         console.log('Ack-new :', data.from.userId );
      }
      // Show the name instead of the userId, if it's available.
      else {
        var userId = data.from.userId,
        displayName = buddylist[userId].name || userId,
        message = displayName + ": " + data.message;
        appendLog(document.createTextNode(message));
      }
    }
  });
  
  // On new messages, append it to our message log
  chatClient.on('recv-err', function (data) {
    document.getElementById('uid').textContent = "Error: " + data.message;
  });

  // Display our own userId when we get it
  chatClient.on('recv-uid', function (data) {
    console.log('Receving UID and logging in' );
    document.getElementById('uid').textContent = "Logged in as: " + data;
 //   getMedia();
  });

  // Display the current status of our connection to the Social provider
  chatClient.on('recv-status', function (msg) {
    if (msg && msg === 'online') {
      document.getElementById('msg-input').disabled = false;
    } else {
      document.getElementById('msg-input').disabled = true;
    }
    clearLog();
    var elt = document.createElement('b');
    elt.appendChild(document.createTextNode('Status: ' + msg));
    appendLog(elt);
  });

  // Listen for the enter key and send messages on return
  input = document.getElementById('msg-input');
  input.onkeydown = function (evt) {
    if (evt.keyCode === 13) {
      var text = input.value;
      input.value = "";
      appendLog(document.createTextNode("You: " + text));
      chatClient.send(activeBuddylistEntry.userId, text);
    }
  };

/////////////////////////////////////////////////////////

  function createPeerConnection() {
    try {
      pc = new RTCPeerConnection(null);
      pc.onicecandidate = handleIceCandidate;
      pc.onaddstream = handleRemoteStreamAdded;
      pc.onremovestream = handleRemoteStreamRemoved;
      console.log('Created RTCPeerConnnection');
      } catch (e) {
         console.log('Failed to create PeerConnection, exception: ' + e.message);
         alert('Cannot create RTCPeerConnection object.');
         return;
      }
   }

   function handleIceCandidate(event) {
      console.log('handleIceCandidate event: ', event);
      if (event.candidate) {
        chatClient.send(remoteId, JSON.stringify({
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate})
          );
      } else {
         console.log('End of candidates.');
      }
   }

/*function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}*/
   
   function handleRemoteStreamAdded(event) {
      console.log('Remote stream added.');

      var remoteVideo = document.createElement('video');
      remoteVideo.setAttribute('id','"remoteVideo_" + remoteClientID');
      remoteVideo.autoplay = 'true';

    //console.log('"I am video child remoteVideo_ " + remoteClientID');
      remoteVideo.src = window.URL.createObjectURL(event.stream);
      videos.appendChild(remoteVideo);
      for(var i=0; i<videos.childNodes.length; i++) {
         var child = videos.childNodes[i];
         child.width = '200';
         child.height = '200';
         console.log(child.width);
      }
      console.log(videos.childNodes.length);
      remoteStream = event.stream;
    }

    function handleRemoteStreamRemoved(event) {
       console.log('Remote stream removed. Event: ', event);
    }

    function doCall() {
      console.log('Sending offer to peer');
      pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    }

    function doAnswer() {
       console.log('Sending answer to peer.');
       pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
    }

    function setLocalAndSendMessage(sessionDescription) {
       // Set Opus as the preferred codec in SDP if Opus is present.
       sessionDescription.sdp = preferOpus(sessionDescription.sdp);
       pc.setLocalDescription(sessionDescription);
       console.log('setLocalAndSendMessage sending message' , typeof sessionDescription);
       chatClient.send( remoteId, JSON.stringify(sessionDescription));
       console.log('setLocalAndSendMessage sending message' , sessionDescription.type);
    }

    function handleCreateOfferError(event){
      console.log('createOffer() error: ', e);
    }

    ///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  console.log ( "CN line is: ", mLineIndex );

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

}

window.onload = function () {
  freedom('manifest.json').then(start);
  //window.freedom.emit('New-Joinee','Howla');
  //window.freedom.on('New-Joinee', function(user) {
  //  console.log('User Joined :', user);
  //});
};
