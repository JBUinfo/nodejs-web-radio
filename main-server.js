
const express = require('express')
const { exec } = require( 'child_process' );
const path = require('path');
const fs = require('fs');
const Throttle = require('throttle');
const { ffprobe } = require('@dropb/ffprobe');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = 3000;
const re = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/
let rooms = {}
rooms.keys = fs.readdirSync('./music/', { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

let responses = {}
rooms.keys.forEach( room => {
  rooms[room] = {
    playlist: [],
    fullSongList: []
  }
  responses[room] = []
});

//Get songs (fullSongList) of the rooms
function updateRoom(room){
  console.log('Start updateRoom: '+room);
  fs.readdirSync('./music/'+room+'/').forEach(file => {
    if ('.mp3' == path.extname(file)) {
      rooms[room].fullSongList.push(file);
    }
  });
  console.log('End updateRoom: '+room);
}

//Update streaming song
async function updateSong(room){
  console.log('Start updateSong: '+room);
  updateNextSongs(room);//update playlist
  if (rooms[room].fullSongList.length >=5 ) {//only if there are 5 songs
    const tempPath = './music/'+room+'/'+rooms[room].playlist[0]
    let bitRate = await ffprobe(tempPath);
    bitRate = bitRate.format.bit_rate;
    const readable = fs.createReadStream(tempPath);
    const throttle = new Throttle(bitRate / 8);
    readable.pipe(throttle).on('data', (chunk) => {
      for (let i = 0; i < responses[room].length; i++) {
        responses[room][i].write(chunk);
      }
    }).on('end', () => {
      updateSong(room);
    });
  }
    console.log('End updateSong: '+room);
}


//make and update the next 5 songs
function updateNextSongs(room){
  console.log('Start updateNextSongs: '+room);
  const lengthPlaylist = rooms[room].fullSongList.length;
  if ( lengthPlaylist >=5 ) {
    const filesLength = rooms[room].playlist.length;
    if (filesLength != 0) {
      rooms[room].playlist.shift();
    }
    let actualRandom = 0;
    do {
      actualRandom = Math.floor(Math.random() * lengthPlaylist);
      if (!rooms[room].playlist.includes(rooms[room].fullSongList[actualRandom])) {
        rooms[room].playlist.push(rooms[room].fullSongList[actualRandom]);
      }
    }while (filesLength != rooms[room].playlist.length && rooms[room].playlist.length != 5)
  }
  io.to(room).emit('sendSongs', rooms[room].playlist);//update the playlist
  console.log('End updateNextSongs: '+room);
}

//executed at the begining. It starts the streaming
rooms.keys.forEach(roomName => {
  updateRoom(roomName);
  updateSong(roomName);
});

io.on('connection', (socket) => {

  //Send playlist (next 5 songs)
  socket.on('getSongs', (room) => {
    socket.emit('sendSongs', rooms[room].playlist);
  });

  //Download a song from youtube url
  socket.on('addSong', ({url, room}) => {
    if (re.exec(url) != null) {
      console.log(`Adding song in ${room}...`);
      exec(`"./static/youtube-dl.exe" --extract-audio --audio-format mp3 -o "./music/${room}/%(title)s.%(ext)s" --restrict-filenames --no-check-certificate "${url}"`, (error, stdout, stderr) => {
        if (error || stderr) {
          socket.emit('errorAddingSong');//popup
          console.error(`error: ${error.message}`);
        } else {
          socket.emit('AddedSong');//popup

          //Add new song to fullSongList
          const files = fs.readdirSync('./music/'+room+'/');
          for (let i = 0; i < files.length; i++) {
            if (!rooms[room].fullSongList.includes(files[i]) ) {
              rooms[room].fullSongList.push(files[i]);
              socket.emit('sendFullList', rooms[room].fullSongList);
              break;
            }
          }

          console.log(`stdout:\n${stdout}`);
        }
      });
    } else {
      socket.emit('errorAddingSong');
    }
  });

  //send  fullSongList
  socket.on('getFullList', (room) => {
    socket.emit('sendFullList', rooms[room].fullSongList);
  });

  //send Rooms
  socket.on('getRooms', () => {
    socket.emit('sendRooms', rooms.keys);
  });

  //add Socket to internal socket rooms
  socket.on('addRoomSocket', (room) => {
    if (room.before != null) {
      socket.leave(room.before);
    }
    socket.join(room.after);
  });

  //send audioNote to people in the same room
  socket.on('addAudioNote', ({audio, room}) => {
    io.to(room).emit('sendAudioNote',audio);
  });
});

app.get('/', (req, res) => {res.sendFile(path.join(__dirname+'/index.html'));})

//Creates an url for each room (the stream audio url)
rooms.keys.forEach(room => {
  app.get('/'+room, (req, res) => {
    res.setHeader('content-type','audio/mpeg');
    res.setHeader('Cache-Control','no-cache');
    responses[room].push(res);//it is used in updateSong(room)
    req.on("close", () => {
      //TODO
      //I DON'T KNOW HOW TO DELETE THE CONECTION FROM THE ARRAY
    });
  })
});

app.use(express.static('static/js'));
app.use(express.static('static/style'));
//app.use('/static', express.static('static'));
server.listen(3000, () => {  console.log('listening on *:3000');});
