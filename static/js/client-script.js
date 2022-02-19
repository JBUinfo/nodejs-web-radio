document.addEventListener('DOMContentLoaded', () => {
  const audioNode = document.getElementById("streamaudio");
  const youtubeInput = document.getElementById('youtubeInput');
  const playButton = document.getElementById('playButton');
  const iconPlayButton = document.getElementById('iconPlayButton');
  const iconRecordButton = document.getElementById('iconRecordButton');
  const playlistElement = document.getElementById('playlist');
  const arrowDropDown = document.getElementById('arrowDropDown');
  const fullSongListContainer = document.getElementById('fullSongListContainer');
  const fullListNode = document.getElementById('fullListNode');
  const searchInputSong = document.getElementById('searchInputSong');
  const arrowDropLeft = document.getElementById('arrowDropLeft');
  const volumeDown = document.getElementById('volumeDown');
  const actualVolume = document.getElementById('actualVolume');
  const volumeUp = document.getElementById('volumeUp');

  let isPaused = audioNode.paused;
  let actualRoom = '';
  let fullListSongs = [];
  const socket = io();
  socket.emit('getRooms');//go to ====> socket.on('sendRooms')

  //Send YT url and actualRoom
  document.getElementById('youtubeSendButton').addEventListener('click',()=>{
    createPopup(0);
    socket.emit('addSong', {url:youtubeInput.value, room:actualRoom});
    youtubeInput.value='';
  })

  /////////////
  // START - CHANGE VOLUME
  /////////////
  let isChanging = null;
  const changeVolume = (action) => {//Holding mouse
    isChanging = setInterval(()=>{
      let value = parseInt(actualVolume.value);
      if (action && 100 >= ++value) {//Up
        actualVolume.value++;
      } else {
        if (0 <= --value) {//Down
          actualVolume.value--;
        }
      }
      audioNode.volume = parseInt(actualVolume.value)/100 ;
    },50);

  }
  volumeDown.addEventListener('mousedown',()=>{//Holding mouse
    changeVolume(0)
  })
  volumeDown.addEventListener('mouseup',()=>{
    clearInterval(isChanging);//Finish hold
  })
  volumeDown.addEventListener('mouseout',()=>{
    clearInterval(isChanging);//Finish hold
  })
  volumeUp.addEventListener('mousedown',()=>{//Holding mouse
    changeVolume(1)
  })
  volumeUp.addEventListener('mouseup',()=>{
    clearInterval(isChanging);//Finish hold
  })
  volumeUp.addEventListener('mouseout',()=>{
    clearInterval(isChanging);//Finish hold
  })

  actualVolume.addEventListener('change',()=>{//Change volumne manually
    let value = parseInt(actualVolume.value)
    if ( value || 0 == value ) {
      if (100 < value) {
        audioNode.volume = 1 ;
      } else if (0 > value) {
        audioNode.volume = 0 ;
      } else {
        audioNode.volume = value/100 ;
      }
    } else {
      actualVolume.value = 0;
      audioNode.volume = 0;
    }
  })
  /////////////
  // END - CHANGE VOLUME
  /////////////

  //Search song by words
  searchInputSong.addEventListener('keyup',()=>{
    const words = searchInputSong.value.toUpperCase().split(' ');
    createFullList(fullListSongs.filter( song => song.toUpperCase().includes(words) ))
  })

  //Make animation in fullSongList (right-bottom) when click
  arrowDropLeft.addEventListener('click',()=>{
    if (fullSongListContainer.style.animation == '' || fullSongListContainer.style.animation.includes('DropRight')) {
      fullSongListContainer.style.animation = 'DropLeft 1s linear 0s forwards';
      arrowDropLeft.innerHTML = '&#129154;';//Change Arrow
    } else {
      fullSongListContainer.style.animation = 'DropRight 1s linear 0s forwards';
      arrowDropLeft.innerHTML = '&#129152;';//Change Arrow
    }
  })

  //Make animation in playslist (right-top) when click
  arrowDropDown.addEventListener('click', () => {
    if (playlistElement.style.animation == '' || playlistElement.style.animation.includes('DropUp')) {
      playlistElement.style.animation = 'DropDown 1s linear 0s forwards';
      arrowDropDown.innerHTML = '&#9650;';//Change Arrow
    } else {
      playlistElement.style.animation = 'DropUp 1s linear 0s forwards';
      arrowDropDown.innerHTML = '&#9660;';//Change Arrow
    }
  })

  //play or pause music
  playButton.addEventListener('click',()=>{
    if (audioNode.paused) {//resume
      iconPlayButton.src = "loading_icon.gif"
      audioNode.src = '/'+actualRoom+"?cb="+new Date().getTime();//make new URL to avoid cache
      audioNode.play().then(() => {
        iconPlayButton.src = "play_icon.png"
      }).catch(error => {
          const newLoad = error.toString().indexOf("new load request");
          const errorFetching = error.toString().indexOf("fetching process");
          const errorPause = error.toString().indexOf("pause()");

          if (-1 == newLoad && ( errorFetching || errorPause )) {
            setTimeout(()=>{createAudioNodes(actualRoom)}, 1000)
          }
          console.log(error);
      });
    } else {//pause
      iconPlayButton.src = "pause.png"
      audioNode.pause();
    }
  })

  //Start or stop recording and send the audio
  let recording = false;
  let recorder = null;
  recordButton.addEventListener('click',()=>{
    if (recording) {
      (async () => {
        const {audioChunks} = await recorder.stop();
        if (!isPaused) playButton.click();
        socket.emit('addAudioNote', {audio:audioChunks, room:actualRoom});//send audio
        iconRecordButton.src = "record_icon.png"
        recording=false;
      })();
    } else {
      (async () => {
        isPaused = audioNode.paused;
        iconRecordButton.src = "pause.png"
        audioNode.pause();
        recorder = await recordAudio();
        recorder.start();
        recording=true;
      })();
    }

  })

  //Creates the audio when the server changes the song
  // or
  // when the user change the room
  function createAudioNodes(room){
    isPaused = audioNode.paused;
    audioNode.src = '/'+actualRoom+"?cb="+new Date().getTime();
    audioNode.volume = actualVolume.value/100 ;
    if (!isPaused) playButton.click();
    audioNode.addEventListener("ended", ()=>{//if ended??
      setTimeout(()=>{
        createAudioNodes(actualRoom);
      },4000)
    });
  }

  //creates the playlist (right-top) element with the next 5 songs
  //Called by socket on "sendSongs"
  //
  function createPlaylist(audioNames){
    while (playlistElement.firstChild.tagName == "P") {
      playlistElement.childNodes[0].remove();
    }
    audioNames.forEach((item, i) => {
      let audioName = item.slice(0, -4);
      audioName = audioName.replaceAll('_', ' ')
      const pNode = document.createElement("p");
      pNode.innerHTML = audioName;
      if (i == 0) pNode.setAttribute("class", 'lastChild');
      playlistElement.insertBefore(pNode, playlistElement.firstChild);
    });
  }

  //Creates the playlist (right-bottom) element
  //Called by socket on "sendFullList" or
  //when the user seach a song with searchInputSong
  function createFullList(fullListNames){
    fullListNode.innerHTML = '';
    fullListNames.forEach((item, i) => {
      const divNode = document.createElement('div');
      divNode.setAttribute("class", 'songFullList');
      const spanNode = document.createElement('span');
      spanNode.innerHTML = item;
      divNode.appendChild(spanNode);
      fullListNode.appendChild(divNode);
    });
  }

  //Creates a little right-bottom popup when the user sends a youtube url
  function createPopup(type){
    const beforePopup = document.getElementById('popup');
    if (beforePopup) {
      beforePopup.remove();
    }
    //0 loading
    //1 SUCCESS
    //2 error
    const popup = document.createElement('div');
    popup.setAttribute("id", 'popup');
    popup.setAttribute("class", 'popup')
    switch (type) {
      case 0:
        popup.setAttribute("class", 'popupLoading');//it doesn't disappear
        popup.innerHTML = "LOADING";
        popup.style.backgroundColor = "#DEDB07";
        break;
      case 1:
        popup.innerHTML = "SUCCESS";
        popup.style.backgroundColor = "#14F5A3";
        break;
      case 2:
        popup.innerHTML = "ERROR";
        popup.style.backgroundColor = "#FA0827";
        break;
    }
    document.getElementById('body').appendChild(popup);
  }

  //It is called by socket "sendRooms".
  //It prints the rooms
  function createListOfRooms(roomList){
    roomList.forEach((roomName, i) => {
      const h2Node = document.createElement("h2");
      h2Node.innerHTML = roomName.toUpperCase();
      h2Node.style.fontSize = i == 0 ? "25px" : "20px";//first time
      h2Node.style.margin = "60px 0px";
      h2Node.style.cursor = "pointer";
      h2Node.id = roomName;
      h2Node.addEventListener('click', (e) => {
        document.getElementById(actualRoom).style.fontSize = "20px";//Last Room
        e.srcElement.style.fontSize = "25px";//Actual Room
        socket.emit('addRoomSocket', {before:actualRoom, after:e.srcElement.id});
        actualRoom = e.srcElement.id;
        socket.emit('getSongs', actualRoom);//update playlist
        socket.emit('getFullList', actualRoom);//update fulllSongList
      })
      document.getElementById('roomList').appendChild(h2Node);
    });
  }

  /////////////
  // START - RECORDING AUDIO
  /////////////
  const recordAudio = () => {
    return new Promise(async resolve => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunks.push(event.data);
      });

      const start = () => mediaRecorder.start();

      const stop = () =>
        new Promise(resolve => {
          mediaRecorder.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            const play = () => audio.play();
            resolve({ audioChunks, play });
          });
          mediaRecorder.stop();
        });

      resolve({ start, stop });
    });
  };
  /////////////
  // END - RECORDING AUDIO
  /////////////

  //Error adding the Youtube URL
  socket.on('errorAddingSong', (audioName) => {
    createPopup(2)
  });

  //The Youtube URL has been downloaded
  socket.on('AddedSong', (audioName) => {
    createPopup(1)
  });

  //Recieve the next 5 songs and creates the main audio node
  socket.on('sendSongs', (audioNames) => {
    createPlaylist(audioNames);
    createAudioNodes();
  });

  //Recieve the fullSongList at the start and when a user updates a new song
  socket.on('sendFullList', (fullListNames) => {
    fullListSongs = Object.values(fullListNames)
    createFullList(fullListSongs);
  })

  //Get the rooms from the server,
  //after, emit some sockets to get the actual song, playlist and fullSongList
  socket.on('sendRooms', (listOfRooms) => {
    actualRoom = listOfRooms[0];
    createListOfRooms(listOfRooms);
    //add the socket into a server socket room
    socket.emit('addRoomSocket', {before:null, after:actualRoom});
    socket.emit('getSongs', actualRoom);//gets "sendSongs"
    socket.emit('getFullList', actualRoom);//gets "sendFullList"
  });

  //Receive and plays audios from people at the same room
  socket.on('sendAudioNote', (audioChunks)=>{
    isPaused = audioNode.paused;
    audioNode.pause();
    const audioBlob = new Blob(audioChunks);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.addEventListener("ended", ()=>{
      if (!isPaused) playButton.click();//plays main audio when finish
    });

  });

});
