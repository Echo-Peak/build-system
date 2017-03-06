const path = require('path');
const fs = require('fs');
//const yamlify = require('js-yaml');
const configPath = path.resolve(__dirname ,'../../build-config.yml');
const c = fs.readFileSync(configPath).toString();
const config = yamlify.safeLoad(c);
const socket = socketIOClient.connect(`http://localhost:${config.system.port}` );


module.exports = function(webpackname){
  let pname = `webpack-${webpackname}`;
  let bin = 'webpack';
  let pid = process.pid;
  socket.emit('process-connected', {name:pname, pid:process.pid , bin});

  process.on('uncaughtException', (err)=>{
    console.log(err.stack.toString());
    console.log('waiting for kill signal!');
    socket.emit('webpack-error', {name:pname, pid , error:err.stack.toString()});

    // dont namespace these envents. use process-<process name> for name spaceing
    socket.emit('process-disconnected', {name:pname, pid , bin});
    socket.on(`process-kill` ,target => {
      if(target === pname){
        process.exit();
      }
    });
  });

  process.on('SIGTERM' ,function(){
    socket.emit('process-disconnected', {name:pname, pid, bin});
    setTimeout(process.exit , 500);
  });
  process.on('SIGINT' ,function(){
    socket.emit('process-disconnected', {name:pname, pid , bin});
    setTimeout(process.exit , 500);
  });


  return socket
}
