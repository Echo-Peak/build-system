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



function showInstuctions(processName){
    let date = new Date();
    let username = process.env.username;
    let dayTime = date.getHours() >= 12 ? 'Good Afternoon' : 'Good Morning';
    
        console.log(`
    ${processName.yellow.underline.bold}

    ${dayTime}, ${username}
    PWD: ${process.cwd()}

    Instuctions:
    type ${'app'.green} to see app statistics; use ${'app.internal'.green} to access instance

    type ${'app.internal.run(<processName>)'.green} to run process
    type ${'app.internal.kill(<processName>)'.green} to kill process
    type ${'app.internal.killPID(<PID>)'.green} to run process by PID
    type ${'.services'.green} to list services to run
    type ${'.processes'.green} to list processs to run
    type ${'.u'.green} to list running statistics
    type ${'.cd'.green} to change directory
    type ${'.exit'.green} to kill the build system
    type ${'.clear'.green} to clear console
    type ${'.force-exit'.green} to force-exit

    for help of any commany type .help
        `);
}
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
    this.current = {
      running:[],
      processes:[]
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

  exit() {
    console.log('Killing build system!'.red.bold)
    if(this.socket){
      this.socket.emit('kill');
      this.socket.on('ready-to-exit', function(){
      process.exit();
     });
    }
    if(this.repl) this.repl.close();

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
        console.log(chunk);
        if(this.socket) this.socket.emit('process-stdout' , chunk)
      }else{
        console.log(`stdout is disabled for`.yellow , processName);
      }
    });
    child.stderr.on('data' ,(chunk)=>{
        chunk = chunk.toString();
        if(p.stderr && config.system.allowChildOutput){
          console.log(chunk);
          if(this.socket) this.socket.emit('process-stderr' , chunk)
        }else{
          console.log(`stderr is disabled for`.yellow , processName);
        }
      });
      child.on('error' ,this.killProcess.bind(this , processName, id));
      //child.on('close' ,this.killProcess.bind(this , processName, id));
     // child.on('disconnect' ,this.killProcess.bind(this , processName, id));
      this.current.running.push({process:child , id:id});
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
  startRepl(){
    let config = this.config;
    if(this.repl){
      console.log('repl instance already exists!'.yellow.bold);
      return
    }
     this.repl = REPL.start({
        prompt:`${config.system.processName}> `.cyan.bold || '>'.cyan,
        input:process.stdin,
        output:process.stdout,
        terminal:true
    });
    this.repl.defineCommand('help', () => {
      console.log('congrafts morgon');
    });
    this.repl.defineCommand('scripts', () => {
      console.log('\u001b[31m Goodbye! \u001b[39m');
    });
    this.repl.defineCommand('processes', () => {
      console.log('\u001b[31m Goodbye! \u001b[39m');
    });
    this.repl.defineCommand('services', () => {
      console.log(prettyjson.render(this.current.processes))
    });
    this.repl.defineCommand('u', () => {
      showStatistics(this.current.running , function(result){
        console.log(prettyjson.render(result))
      });
    });
    this.repl.defineCommand('clear', () => {
      //process.stdout.write('\u001B[2J\u001B[0;0f')

    });
    this.repl.defineCommand('cd', (input) => {
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
        console.log(`switch to ${newCWD}`)
      }catch(err){
        console.log('cant switch to directory')
      }
    });
    this.repl.defineCommand('force-exit', (n) => {
      process.exit(0);
    });
    this.repl.on('exit' , this.exit.bind(this));
  }
  setup(){
    let globalObject = Object.assign({} , this.current);
    let self = this;
    Object.defineProperty(globalObject,'$',  {
      get(){
        console.log('helpp')
        return Object.assign({} , self.current);
      }
    });

    Object.defineProperty(globalObject,'internal',  {
      get(){
        console.log('internal')
        return self
      }
    });

  return globalObject
  }
}


if(module.parent){
  module.exports = AppRepl;
}else{
  console.log('running');
  let yamlify = require('js-yaml');
  let c = fs.readFileSync('./build-config.yml').toString();
  let config = yamlify.safeLoad(c);
  // let app = new AppRepl(config);
  // global.app = app.setup();
  // app.startRepl();
  vorpal
  .command('clear', 'Outputs "bar".')
  .action(function(args, callback) {
    this.log('bar');
    process.stdout.write( '\u001B[2J\u001B[0;0f')
    callback();
  });

vorpal
  .delimiter(`${`${config.system.processName}>`.magenta} `)
  .show();
}