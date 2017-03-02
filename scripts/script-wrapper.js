let socketIOClient = require('socket.io-client');
let child_process = require('child_process');
let client;
// if(module.parent){
//   let isChildProcess = process.send ? true : false;
//   module.exports = function(processAPI ,socketEnabled, port , config){
//     // if(socketEnabled){
//     //   client = socketIOClient.connect(`http://localhost:${port || process.env.DAEMON_PORT}`);
//     //   let newScript = new processAPI();
//     //   newScript.connect(client);
//     //   newScript.on('connected' , ()=>{
//     //     client.emit('who' ,{pid})
//     //   })
//     // }
//     child_process.exec(`msg %username% ${arguments}`)
//
//   }
// }else{
// }

process.on('message' , function(_config){
  let config = null;
  try{ config = JSON.parse(_config)}
  catch(err){}
  //options , env:o ,name, enableSocket, port
  //child_process.exec(`msg %username% ${JSON.stringify(arguments)}`)
})
