let child_process = require('child_process');
let uuid = require('uuid');
let path = require('path');



// make a facade abstation for scripts that use binarays like webpack , mocha ...etc

let running = {};
let wrapperFile = path.resolve(__dirname ,'./script-wrapper.js');
module.exports = function(app){

  return {
    fork(name, options){
      let script = options.script;
      let stdout = typeof options.stdout === 'boolean' ? options.stdout : true;
      let stderr = typeof options.stderr === 'boolean' ? options.stderr : true;

      let o = {
        silent:true,
        cwd:app.cwd,
        id: uuid(),
        name:name,
        time: Date.now()
      }

      let child = child_process.fork(script ,{cwd:this.cwd ,silent:true} , (stderr , stdour)=>{

      });
      o.child = child;

      if(stdout){
        child.stdout.on('data' , (out)=>{
          console.log(`[${name.toUpperCase()}]: `,out.toString())
        })
      }
      if(stderr){
        child.stderr.on('data' , (err)=>{
          console.log(`[${name.toUpperCase()}][ERROR]: `,err.toString())
        })
      }
      app.updateCurrent('add','running', child)

    },
    exec(name, options){

    },
    kill(name, options){

    },
    killPID(options){

    },
    createWrapper(name , options , enableSocket , port){
      // wraps a script around a api
      let o = {
        silent:true,
        cwd:this.cwd,
        id: uuid(),
        name:name,
        time: Date.now(),
      }
      let stdout = typeof options.stdout === 'boolean' ? options.stdout : true;
      let stderr = typeof options.stderr === 'boolean' ? options.stderr : true;
      let child = child_process.fork(wrapperFile ,{cwd:app.cwd ,silent:true} , (stderr , stdour)=>{});
      child.send({options , env:o ,name, enableSocket, port});
      o.child = child;
      if(stdout){
        child.stdout.on('data' , (out)=>{
          console.log(`[${name.toUpperCase()}]: `,out.toString())
        })
      }
      if(stderr){
        child.stderr.on('data' , (err)=>{
          console.log(`[${name.toUpperCase()}][ERROR]: `,err.toString())
        })
      }
      app.current().running.add({o});
    }
  }
}
