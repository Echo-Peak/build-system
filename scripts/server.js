let socketIO = require('socket.io');
let http = require('http');
const colors = require('colors');
const child_process = require('child_process');
let socketIOClient = require('socket.io-client');

let killer = (bin, pid , id ,done) => {
  let defaultBin = 'node';
  if(!bin){ bin = defaultBin}

  switch(process.platform){
    case 'win32':{
      //TODO: use WMI for windows to query for bins since they will have a differnt pid than the once started with
      child_process.exec(`taskkill /pid ${id}` ,done);
    };break;
    case 'linux':{

    }
  }
}
class Socket{
  constructor(socket , config){
    this.socket = socket;
    this.config = config;
    socket.on('reload' ,function(){
      console.log("reloading");
      socket.emit('reload');
      socket.broadcast.emit('reload');
    });
    socket.on('kill' ,function(){
      socket.emit('kill');
      socket.broadcast.emit('kill');
    });
    socket.on('process-connected', function(who){
      console.log(`[PROCESS] '${who.name.toUpperCase()}:${who.pid}' connected`.yellow)
    });
    socket.on('stout-data' ,function(msg){
      console.log(`[STDIO]`.yellow ,msg)
    });
    socket.on('update-vorpal', ()=>{
      socket.emit('update-vorpal');
      socket.broadcast.emit('update-vorpal');
    })

    socket.on('gulp-change' ,(nextChange)=>{

    })
  }
  kill(running){
    let processCOunt = 0;
    running = [...runing];

    console.log(`Prepareng exit!`.yellow);
    return new Promise((resolve, reject)=>{
      running.forEach(ps => {
        if(ps.name === 'MAIN'){
          return
        }
        killer(ps.bin , ps.pid, ps.id, function(){
          processCount += 1;
          if(processCount === running.length - 1){
            resolve()
          }
        })
      })

    })
  }
}



if(module.parent){
  let socketServer = null;
  let isConnected = false;
  module.exports = {
    startSocketServer(config){
      return new Promise((resolve ,reject)=>{
        if(socketServer){
          reject()
          return
        }
        let server = http.createServer(function(){});
        let io = socketIO(server);
        server.listen(config.system.port);

        io.on('connection' ,function(sock){
          if(!isConnected){
            isConnected = true;
            console.log('Socket Server Connected'.green)
          }
          resolve();
          socketServer = new Socket(sock , config);
        });
      })
    },
    stop(running){
      return new Promise((resolve, reject)=>{
        if(!socketServer){
          reject("server does not exist");
          return
        }
        socketServer.kill(running).then(resolve);
      })
    },
    use(daemonType , config){
      if(daemonType === 'socket'){
        this.startSocketServer(config).then(()=>{
          let socket = socketIOClient.connect(`http://localhost:${config.system.port}`);
          socket.emit('update-vorpal')
        });
      }
    }
  }
}else{
  console.log('This module has not been made for command line use')
}
