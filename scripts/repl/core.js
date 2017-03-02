const introduction = require('./greet');
const varInsideEnv = require('./process-env-parser');
let socketIOClient = require('socket.io-client');
let http = require('http');
const colors = require('colors');
const uuid = require('uuid');
const Actions = require('./actions')
const Commands = require('./commands');
const IO = require('./io');
const commandList = require('./command-list');
const GulpStreamAdaptor = require('./gulp-stream-adapter');
const path = require('path');
const child_process = require('child_process');
const net = require('net');
const DaemonManager = require('../server');




function onError(highlight, msg) {
  console.log(`'${highlight.yellow.bold}' ${msg}`)
}

module.exports = class AppRepl {
  constructor(config) {
    introduction(commandList , config.system.processName);
    AppRepl._current = {
      running:new Set(),
      processList: new Set(),
      gulpTasks: new Set()
    }
    let daemonType = config.system.socket ? 'socket' : 'process';

    DaemonManager.use(daemonType , config);

    AppRepl.cwd = process.cwd();
    this.commandList = commandList;
    this.socket = null;
    this.config = config;
    this.terminating = false;
    this.killPID = this.killPID;
    this.killProcess = this.killProcess;
    this.runGulpTask = this.runGulpTask;
    this.stopGulpTask = this.stopGulpTask
    this.exit = this.exit;
    this.runService = this.runService;
    this.clear = this.clear;
    this.forceKiller = null;
    this.exiting = false;
    this.exitTrys = 1;
    this.current = () => AppRepl._current;

    this.paths = {
      userScripts: path.resolve(__dirname , '../user-scripts'),
      repl: path.resolve(__dirname),
      app: path.resolve(__dirname ,'../../app'),
      node_modules: path.resolve(__dirname , '../../node_modules'),
      tests: path.resolve(__dirname ,'../../tests')
    }


    Commands.setup(config.system.processName);
    this.actions = new Actions(this);
    this.commands = new Commands(this , commandList);
    this.IO = new IO(this);
    this.gulpStreamAdaptor = new GulpStreamAdaptor(this)

    if (!varInsideEnv(process.env, 'gulp')) {
      this.current().running.add({
        name: 'MAIN',
        pid: process.pid,
        script: __filename,
        time: Date.now(),
        id: uuid()
      })
    }
    if(config.system.history){
      this.IO.loadHistory()
    .then(_history => {
      console.log('Sucssesfully loaded history'.green);
      //Commands.injectHistory(_history);
    })
    .catch(console.log)
    }
    if (config.system.socket) this.socket = socketIOClient.connect(`http://localhost:${config.system.port}`);
    if (this.socket) {
      this.socket.on('process-connected', (who) => {
        this.current().running.add(who);
      });
      this.socket.on('process-stdout', console.log);
      this.socket.on('process-stderr', console.log);
    }


    let prepareRun = (o, processName) => {
      return this.runProcess.bind(this, o, processName);
    }
    let processList = Object.keys(config.processes);
    processList.forEach(e => AppRepl._current.processList.add({ name: e, script: config.processes[e].script || null }))


  }
  taskManager(method , taskname ,id){

    switch(method){
      case 'add':this.current.runningTasks.push({id , task:taskname , time:Date.now()});break;
      case 'del':{
        this.current.runningTasks = this.current.runningTasks.filter(e => e.id !== id);
      }
    }


  }
  getFunctionality(name){
    return this[name]
  }
  get cwd(){ return AppRepl.cwd}
  set cwd(newCwd){AppRepl.cwd = newCwd}
  get getCurrent() {
    return this.current
  }
  set setCurrent(newval) {
    this.current = newval
  }
  get _config() {
    return this.config;
  }
  get getSocket() {
    return this.socket
  }


  exit(force) {
    if(!this.exiting){
      this.exiting = true;
    }
    if (force) {
      console.log('force exiting!'.red)
      process.exit(0);
    }
    console.log('Killing build system!'.yellow)

    DaemonManager.stop(AppRepl._current.running).then(()=>{
      console.log('exit succsesfull!'.green)
      process.exit(0);
    }).catch(err => {
      //retry again... a maxiumuim of 3 times

      process.exit(0);
    })


  }
  updateCurrent(method , prop , newVal){
    if(method === 'add'){
      this.current[prop].push(newVal);
    }else if(method === 'del'){
      this.current[prop].slice(newVal , 1);
    }
  }
}
