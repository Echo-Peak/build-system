let socketIOClient = require('socket.io-client');
let http = require('http');
const colors = require('colors');
const REPL = require('repl');
let fs = require('fs');
const util = require('util');
const prettyjson = require('prettyjson');
const path = require('path');
const uuid = require('uuid');
const child_process = require('child_process');
const v8 = require('v8');
const processEnvParser = require('./process-env-parser');
const vorpal = require('vorpal')();



function onError(highlight , msg){
  console.log(`'${highlight.yellow.bold}' ${msg}`)
}

function insideEnv(envVar){
  let e = processEnvParser(process.env);
  if(e[envVar]) return true
  return false
}
function showStatistics(_process , callback){
  console.log('loading statistics...'.cyan)
  let c = 0;
  let length = _process.length;
  let result = []
  _process.forEach(item => {
    if(item.name === 'MAIN'){
      c++;
      item.stats = formatMemStatistics(v8.getHeapStatistics());
      if(c === length) callback(_process)
    }else{
      if(!item.child){
        return
      }
      item.child.send('message' ,{event:'get-heap'});
      item.child.on('message' , (event)=>{
        if(event.event === 'get-heap'){
          c++;
          if(c === length) formatMemStatistics(event.stats);
        }
      })
    }
  })
}

function formatMemStatistics(v8Heap){

  let toMB = (num) => num / 1024 / 1024;
  let prop;
  for(prop in v8Heap){
    v8Heap[prop] = `${toMB(v8Heap[prop]).toFixed(2)}MB`
  }
  return v8Heap
}

class AppRepl{

  constructor(config){
 
    this.socket  = null;
    let repl = null;
    this.config = config;
    this.terminating = false;
    this.killPID = this.killPID;
    this.killProcess = this.killProcess;
    this.runGulpTask = this.runGulpTask;
    this.stopGulpTask = this.stopGulpTask
    this.exit = this.exit;
    this.run = this.run;
    this.runService = this.runService;
    this.clear = this.clear;
    this.current = {
      running:[],
      processes:[],
      runningTasks:[]
    };
    showInstuctions(config.system.processName);
    this.replOptions = {
        prompt:`${config.system.processName}> `.cyan.bold || '>'.cyan,
        input:process.stdin,
        output:process.stdout,
        terminal:true
    }
    if(!insideEnv('gulp')){
      this.current.running.push({
        name:'MAIN',
        pid:process.pid,
        script:__filename,
        time:Date.now(),
        id:uuid()
      })
    }
    if(config.system.socket) this.socket = socketIOClient.connect(`http://localhost:${config.system.port}`);
    if(this.socket){
      this.socket.on('process-connected', (who) =>{
        this.current.running.push(who);
      });
      this.socket.on('process-stdout' ,console.log);
      this.socket.on('process-stderr' ,console.log);
    }


    let prepareRun = (o , processName) =>{
      return this.runProcess.bind(this , o , processName);
    }
    let processList = Object.keys(config.processes);
    this.current.processes = processList.map(e => ({name:e, script:config.processes[e].script || null}))
  // let processList = Object.keys(config.processes)
  //  let processListArray = processList.map(e => config.processes[e]) ;
  //  this.processes = processListArray.map((f , i) => {
  //    //f.run = prepareRun(f ,processList[i]);
  //    let processName = processList[i];
  //    Object.defineProperty(f , 'help',{
  //      get(){
  //       console.log(`showing help for ${processName}`);
  //       console.log(prettyjson.render(f))
  //        return 
  //      }
  //    });
  //    Object.defineProperty(f , 'run',{
  //      get(){
  //       console.log(`running! ${processName}`);
  
  //        return 
  //      }
  //    });
  //    return f
  // });
   console.log(this.processes)
  }

  exit(force) {
    if(force){
      console.log('force exiting!'.red)
      process.exit(0);
    }
    console.log('Killing build system!'.red.bold)
    if(this.socket){
      this.socket.emit('kill');
      this.socket.on('ready-to-exit', function(){

      process.exit();
     });
    }


    //force kill
    setTimeout(process.exit , 5000);
  }
  runService(){

  }
  run(processName){
    let list = Object.keys(this.config.processes);
    let config = this.config;
    let p = this.config.processes[processName];
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
        if(this.socket) this.socket.emit('process-stdout' , chunk)
      }else{
        console.log(`stdout is disabled for`.yellow , processName);
      }
    });
    child.stderr.on('data' ,(chunk)=>{
        chunk = chunk.toString();
        if(p.stderr && config.system.allowChildOutput){
          let label = `[${`${processName.toUpperCase()}`.red}]: `;
          console.log(label,chunk);
          if(this.socket) this.socket.emit('process-stderr' , chunk)
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
  changeDir(input){
      let newCWD = path.resolve(input);
      let cwd = process.cwd();
      if(!input || !input.length){
        console.log(process.cwd().cyan.bold);
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
  killPID(pid){
    let current = this.self.getCurrent;
    let copy = Object.assign({} ,curent);
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
          console.log(`killed ${pid.toString().yellow}!`);
          copy.running = copy.running.filter(e => e.pid !== pid);
          this.self.setCurrent = copy;
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


  setup(){
    let config = this.config;
    vorpal.delimiter(`${`${config.system.processName}>`.magenta} `).show();

    vorpal.command('clear', 'clears the terminal').action((args ,callback)=> {
      this.clear(args);
      cllback();
    });
    vorpal.command('app [internal] [methodCall] [args...]', `Shows app statistics; use ${'app internal'.green} to access the instance`)
    .action((args , callback) => {
    let copy = Object.assign({} , this.current);
    let methodCall = args.methodCall;
    let getMethod = this[methodCall];
    let methodList = Object.keys(this).map(e => typeof this[e] === 'function' && this[e].name).filter(e => e && e);
    let internal = args.internal === 'internal';
    copy.running = copy.running.map(e => Object.assign(e ,{child:e.child ? true : false}));

      let c = prettyjson.render(copy);
      if(args.internal && !args.methodCall){
        console.log(this)
      }else{
        console.log(c)
      }
      if(methodCall){
        if(methodCall === 'list'){
          console.log('available functions are');
          console.log(prettyjson.render(methodList)) 
        }else if(internal){
          if(typeof this[args.methodCall] === 'function'){
            this[args.methodCall](args.args )
          }else{

            console.log(`${args.methodCall.yellow} is not a function!`)
          }
        }
      }

      callback();
    });
    vorpal.command('kill [strings...]', 'kills a running process either by name or PID')
    .option('pid', 'kills script by PID')
    .action((args , callback)=>{
      if(args.strings){
        let name = args.strings[0].toLowerCase();
        let pid = args.strings[1];
        if(name === 'pid' && typeof pid === number){
          this.killPID(pid);
        }else if(name.length && name !== 'pid'){
          let getTargets = this.current.running.filter(e => e.name === name);
          getTargets.forEach(e => this.killProcess(e.name , e.id));
        }
      }else{
        console.log(`you must specify a ${'pid'.yellow} to kill or a ${'process name'.yellow}. see ${'app'.cyan}`)
      }
      callback()
    });
    vorpal.command('srv', 'shows a list services that can be ran')
    .action((args ,callback) => {
      console.log(prettyjson.render(this.current.processes));
      callback()
    });
    
    vorpal.command('exit [optional]', 'terminates the build system; use force to force kill this process')
    .action((args) => {
      let force = args.optional && args.optional.toLowerCase() === 'force';
      this.exit(force)
    });
    vorpal.command('cd [optional]', 'change the PWD; uses relative path')
    .action((args ,callback) => {
      if(!args.optional  || !args.optional.length){
        console.log(`-> ${process.cwd().cyan}`)
        callback();
        return
      }
      this.changeDir(args.optional)
      callback();
    });
    vorpal.command('run [optional]', 'runs a process')
      .action((args ,callback) => {
        let processList = this.current.processes.map(e => e.name);
        if(!args.optional  || !args.optional.length){
          let p = this.current.processes.map(e => e.name.yellow).join(', ');
          console.log(`available processes ${p}`)
          callback();
          return
        }

        if(!processList.includes(args.optional)){
          console.log(`cant find ${args.optional.yellow} in process list`);
          callback();
          return
        }
        this.run(args.optional);
        callback();
      });
      vorpal.command('stats', 'shows heap stats of running processes')
      .action((args ,callback)=>{
        showStatistics(this.current.running , function(result){

        console.log(prettyjson.render(result))
        callback();
       })
      });
      vorpal.command('gulp [strings...] [optionalArg] [optional]', 'manages gulp tasks & runs them')
      .option('run', 'runs gulp task')
      .option('stop' ,'stops gulp task')
      .option('running' ,'lists running gulp tasks')
      .option('-m' ,'list multiple o tasks to run or stop')
      .action((args ,callback)=>{
        let multi = true;
        if(!args.optional && !args.strings){
          console.log(prettyjson.render(this.current.runningTasks));
        }
        if(args.optional === 'run' && args.strings.length ){
          this.runGulpTask(args.strings ,multi);
        }
        if(args.optional === 'stop' && args.strings.length){
          
          this.stopGulpTask(args.strings ,multi );
        }
        callback()
      })





  }
  runGulpTask(tasks , multi){

  }
  stopGulpTask(tasks, multi){

  }
}


if(module.parent){
  module.exports = AppRepl;
}else{
  console.log('running');
  let yamlify = require('js-yaml');
  let c = fs.readFileSync('./build-config.yml').toString();
  let config = yamlify.safeLoad(c);
  let exit = vorpal.find('exit');
  exit && exit.remove();

  let app = new AppRepl(config);
  global.app = app.setup();

}