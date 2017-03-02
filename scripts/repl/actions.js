let child_process = require('child_process');

module.exports = class Actions{
  constructor(parent){
    this.self = parent;
  }

  runService(){

  }
  changeDir(input){
    let newCWD = path.resolve(input);
    let cwd = process.cwd();
    if(!input || !input.length){
      console.log(process.cwd().cyan);
      return
    }
    if(cwd === newCWD){
      console.log('aready using the same directory!');
      return
    }
    try{
      process.chdir(newCWD);
      console.log(`switch to ${newCWD.cyan}`)
    }catch(err){
      console.log('cant switch to directory')
    }
  }
  run(processName){
    let {socket} = this.self.getSocket;
    let config = this.self._config;
    let list = Object.keys(config.processes);
    let p = config.processes[processName];
    if(!list.includes(processName)) { onError(processName, `does not exists`); return; }
    console.log(`preparing ${processName}`);
    if(!p.enable){
      console.log(`process is disabled. you have to enable ${processName} in the build-config`)
      return
    }
    if(!p.script){
      onError(processName, `has no script to run! is it a service? use run service to run service`);
      return
    }
    let execType = p.bin ? 'exec' : 'fork';
    let script = p.script;
    let cwd = p.path ? p.path : process.cwd();
    let id = uuid();
    let options = {
      silent:true,
      cwd:cwd
    }
    let command = p.command ? p.command : script;
    let args = p.args ? p.args : [];
    args.push(`--id=${id}`);

    let child = child_process[execType](command ,args,options);

    child.stdout.on('data' ,(chunk)=>{
      chunk = chunk.toString();
      if(p.stdout && config.system.allowChildOutput){
        let label = `[${`${processName.toUpperCase()}`.magenta}]: `;
        console.log(label,chunk);
        if(socket) socket.emit('process-stdout' , chunk)
      }else{
        console.log(`stdout is disabled for`.yellow , processName);
      }
    });
    child.stderr.on('data' ,(chunk)=>{
        chunk = chunk.toString();
        if(p.stderr && config.system.allowChildOutput){
          let label = `[${`${processName.toUpperCase()}`.red}]: `;
          console.log(label,chunk);
          if(socket) socket.emit('process-stderr' , chunk)
        }else{
          console.log(`stderr is disabled for`.yellow , processName);
        }
      });
      child.on('error' ,this.killProcess.bind(this , processName, id));
      child.on('exit' ,this.killProcess.bind(this , processName, id));
      //child.on('close' ,this.killProcess.bind(this , processName, id));
     // child.on('disconnect' ,this.killProcess.bind(this , processName, id));
      this.current.running.push({name:processName, script:script, time:Date.now(), child:child , id:id});
  }
  killPID(pid){
    try{
      pid = Number(pid);
      if(isNaN(pid)) throw 'invalid PID'
    }catch(err){
      console.log('invalid PID')
      return
    }
    let getTarget = this.current.running.filter(e => e.pid === pid);
    if(getTarget.length){
      if(process.platform === 'win32'){
        child_process.exec(`taskkill /pid ${pid} /f`,(stderr, stdout)=>{
          if(stderr){
            console.log(stderr);
          }
          console.log(`killed ${pid.toString().yellow}!`)
          this.current.running = this.current.running.filter(e => e.pid !== pid);
        });
      }

    }else{
      console.log(`no running process with PID: ${pid.toString().yellow}`);
    }
  }
  killProcess(processName , id){
    console.log(`Error occured`.red , `${processName} crashed!`);

    let getRunning = this.current.running.filter(e => e.id === id);
    getRunning.close && getRunning.close();
    this.current.running = this.current.running.filter(e => e.id !== id);

    if(this.config.system.autoRecover){
      setTimeout(()=>{
        console.log(`Restarting ${processName}`.green)
        this.run(processName);
      },5000)
    }
  }
  clear(args){
    process.stdout.write( '\u001B[2J\u001B[0;0f');
    console.log(args)
  }
}
