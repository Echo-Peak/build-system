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
  constructor(socket , config ,current){
    this.socket = socket;
    this.config = config;
    socket.on('reload' ,function(){
      console.log("reloading");
      socket.emit('reload');
      socket.broadcast.emit('reload');
    });
    socket.on('foobar' , function(k){
      console.log('wtf' , k)
    });
    socket.on('kill' ,function(){
      socket.emit('kill');
      socket.broadcast.emit('kill');
    });
    socket.on('process-connected', function(who){
      console.log(`${'[PROCESS]'.magenta} ${who.name.yellow} Connected @${who.pid.toString().yellow}`);
      console.log(current())
    });
    socket.on('process-disconnected', function(who){
      console.log(`${'[PROCESS]'.magenta} ${who.name.yellow} Disconnected @${who.pid.toString().yellow}`)
    });
    socket.on('stout-data' ,function(msg){
      console.log(`[STDIO]`.yellow ,msg)
    });
    socket.on('update-vorpal', ()=>{
      socket.emit('update-vorpal');
      socket.broadcast.emit('update-vorpal');
    });
    socket.on('vorpal-ready' , ()=>{

      socket.emit('update-vorpal');
      socket.broadcast.emit('update-vorpal');
    })

    socket.on('gulp-change' ,(nextChange)=>{

    });
    socket.on('webpack-error' ,(err)=>{
      console.log(`WEBPACK [${err.name.magenta}] Error.

Error: ${err.error}`);
      socket.broadcast.emit('update-vorpal');
    });
    socket.on('webpack-close' ,(code)=>{
      console.log(`WEBPACK [${code.name.magenta}] Closed. Exit code: ${code.code}`);
      socket.broadcast.emit('update-vorpal');
    });
    socket.on('webpack-disconnect' ,(code)=>{
      // update current.running!
      console.log(`WEBPACK [${code.name.magenta}] Disconnected. Exit code: ${code.code}`);
      socket.emit(`webpack-kill-${code.name}`);
      socket.broadcast.emit(`webpack-kill-${code.name}`);
      socket.broadcast.emit('update-vorpal');
    });
    socket.on('webpack-compile-don' , (who)=>{
      console.log(`${'[PROCESS]'.magenta} ${who.name.yellow} Finished compiling!`);
      socket.broadcast.emit('update-vorpal');
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
    startSocketServer(config ,current){
      return new Promise((resolve ,reject)=>{

        if(socketServer){
          reject()
          return
        }
        let server = http.createServer(function(){});
        let io = socketIO(server);
        server.listen(config.system.port);

        io.on('connection' ,function(sock){
          //console.log(' a socket is created')
          if(!isConnected){
            isConnected = true;
            console.log('Socket Server Connected'.green);

          }
          socketServer = new Socket(sock , config , current);
          resolve();
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
    use(daemonType , config, current){
      if(daemonType === 'socket'){
        this.startSocketServer(config ,current).then(()=>{
          let socket = socketIOClient.connect(`http://localhost:${config.system.port}`);
          socket.emit('update-vorpal')
        });
      }
    }
  }
}else{

  let yamlify = require('js-yaml');
  let path = require('path');
  let fs = require('fs');
  let configPath = path.resolve(__dirname ,'../build-config.yml');
  let c = fs.readFileSync(configPath).toString();
  let config = yamlify.safeLoad(c);

  let server = http.createServer(function(){});
  let io = socketIO(server);
  server.listen(config.system.port);

  io.on('connection' ,function(sock){
    console.log(' a socket is created')
    new Socket(sock , config);
  });
}
