let socketIOClient = require('socket.io-client');
let path = require('path');
let child_process = require('child_process');
let uuid = require('uuid');


module.exports = function(config , current){
  let socket = config.system.socket && socketIOClient.connect('http://localhost:${config.system.port}');
  return {
        wrap(script , args){
        let defaultScriptOptions = config.processes[script];
        let id = uuid();
        let bin;
        let defaultBin = 'node';
        bin = defaultBin;
        let newShell = typeof defaultScriptOptions.shell === 'boolean' ? defaultScriptOptions.shell : true;
        let cwd = script.cwd || process.cwd();
        if(script.bin){bin = script.bin}
        if(args.bin){ bin = args.bin}
        if(args.newShell){newShell = !!args.newShell}
        return new Promise((resolve, reject)=>{


          let start = bin !== 'node' ? '' : '';


          let options = {
            cwd:cwd
          }
          let scriptPath = path.resolve(process.cwd(), `scripts/user-scripts/${script.name}.js`)
          let child = child_process.exec(`node ${scriptPath} -- -id=${id} socket=${!!socket}` ,options , function(stderr, stdout){
            if(stderr){
              reject();
            }else{
              socket.on('script-loaded' ,function(ps){
                resolve({pid:ps.pid, id:id});
              });
            }
          })
        })
    }
  }
}
