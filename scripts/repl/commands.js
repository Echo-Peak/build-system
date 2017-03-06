let vorpal = require('vorpal')();
const prettyjson = require('prettyjson');
const showStatistics = require('./heap-stats');
const colors = require('colors');
const path = require('path');
const socketIOClient =require('socket.io-client');
const webpack_commands = require('./commands/webpack');
const gulp_commands = require('./commands/gulp');
const system_commands = require('./commands/system');

let ProcessWrapper = require('./process-wrapper');

let regex = {
  glob:/([\./]+[a-z- /*\.]+)/gmi,
  keypair:/([a-z\-0-9]+:[a-z\-0-9]+)()?/gmi
}

module.exports = class Commands {
  static setup(processName){
    let exit = vorpal.find('exit');
    exit && exit.remove();
    vorpal.delimiter(`${`${processName}>`.magenta} `).show();

  }
  static refresh(processName){
    vorpal.delimiter(`${`${processName}>`.magenta} `).show();
  }
  static bindClass(fn ,context){
    let f = new fn();
    let prototype = Object.getOwnPropertyNames(f.__proto__).filter(e => e !== 'constructor');
    prototype.forEach((prop)=>{
        this.prototype[prop] = f.__proto__[prop].bind(context);
    })
}
  constructor(parent , commandList) {
    this.self = parent;
    this.Parent = parent;

    ProcessWrapper = ProcessWrapper(this.self._config , this.self.getCurrent());

    this.clear = this.clear;
    this.processList = this.processList;
    this.exit = this.exit;
    this.cd = this.cd;
    this.killPID = this.killPID;
    this.killProcess = this.killProcess;
    this.kill = this.kill;
    this.stats = this.stats;
    this.exiting = false;
    this.vorpal = vorpal;
    this.socket = socketIOClient.connect(`http://localhost:${this.self._config.system.port}`);
    //---------
    // bindings!!
    Commands.bindClass(webpack_commands , this);
    Commands.bindClass(gulp_commands , this);
    Commands.bindClass(system_commands , this);
    //---------
    this.socket.on('update-vorpal' ,()=>{
      vorpal.delimiter(`${`${this.self._config.system.processName}>`.magenta} `).show();
    });
    vorpal.sigint(e => this.onprocessExit(e));
    let self = this;

    let setupAction = (method  ,command) => {
      return function (args, callback) {
        if(typeof method !== 'function'){
          console.log(`command not implemented yet!`.yellow);
          callback()
        }else{
          method.call(self, args , command)
          .then(callback)
          .catch(err => (console.log(err), callback()))
        }
      }
    }

    let c = 0;
    commandList.forEach((cmd ,i ,arr) => {
       let shortCmd = cmd.cmd.split(' ');
       c += 1;
       //console.log(i,  arr.length)
       if(cmd.disabled){

         //console.log(`Command ${`${shortCmd[0]}`.yellow} is disabled!`)

       }else{

        let command = vorpal.command(cmd.cmd , cmd.desc);
       cmd.options &&  cmd.options.forEach(option => command.option(option.cmd , option.desc));
        command.action(setupAction(this[cmd.callCommand] , command));
       }
      if(c > arr.length -1){
        this.socket.emit('vorpal-ready');
      }
    });


    //Commands.refresh(this.self._config.system.processesName);
  }
  stats(args){
    return new Promise((resolve, reject) => {
    showStatistics(this.self.getCurrent.running , function(result){

        console.log(prettyjson.render(result))
        resolve();
       })
    });
  }

  history(args){
    let sessionID = args.sessionID && args.sessionID;

    return new Promise((resolve , reject)=>{
      if(!sessionID){
        console.log(prettyjson.render(vorpal.cmdHistory._hist))
      }else{
        let newSession = this.self.getFunctionality('IO').fromHistory(sessionID);
        if(newSession.length){
          console.log('Using new session' ,sessionID.yellow , newSession)
          vorpal.cmdHistory._hist = newSession;

        }
      }
      resolve()
    });
  }

  cd(args) {
    let input = args.newDirectory;
    return new Promise((resolve, reject) => {
      if (!input || !input.length) {
        console.log(process.cwd().cyan);
        return
      }
      let newCWD = path.resolve(input);
      let cwd = process.cwd();

      if (cwd === newCWD) {
        console.log('aready using the same directory!');
        return
      }
      try {
        process.chdir(newCWD);
        console.log(`switch to ${newCWD.cyan}`)
      } catch (err) {
        reject('cant switch to directory', err)
      }
      resolve();
    });
  }
  exit(args) {
    let force = args && args.force;
    this.exiting = true;
    return new Promise((resolve , reject)=>{
      this.Parent.exit(force);
      resolve()
    })
  }
  clear(args) {
    return new Promise((resolve, reject) => {
      process.stdout.write('\u001B[2J\u001B[0;0f');
      resolve();
    });
  }
  processList(args) {
    let current = this.self._config;
    return new Promise((resolve, reject) => {
      console.log(prettyjson.render(current.processes));
      resolve();
    });
  }
  app(args) {
    return new Promise((resolve, reject) => {
      let copy = Object.assign({}, this.self._config);
      let methodCall = args.methodCall;
      let getMethod = this[methodCall];
      let methodList = Object.keys(this).map(e => typeof this[e] === 'function' && this[e].name).filter(e => e && e);
      let internal = args.internal === 'internal';
      copy.running = copy.running.map(e => Object.assign(e, {
        child: e.child ? true : false
      }));

      let c = prettyjson.render(copy);
      if (args.internal && !args.methodCall) {
        console.log(this)
      } else {
        console.log(c)
      }
      if (methodCall) {
        if (methodCall === 'list') {
          console.log('available functions are');
          console.log(prettyjson.render(methodList))
        } else if (internal) {
          if (typeof this[args.methodCall] === 'function') {
            this[args.methodCall](args.args)
          } else {
            reject(`${args.methodCall.yellow} is not a function!`)
          }
        }
      }
      resolve()
    });
  }
  run(args){
    return new Promise((resolve , reject)=>{
      let shell = args.options.s ? true : false;
      let scriptName = args.script && args.script;
      let list = [...this.self.getCurrent().processList];
      if(!scriptName){
        console.log('Showing list of scripts.'.yellow);
        console.log(prettyjson.render(list));
      }else{
        let scripts = list.map(e => e.name);
        if(!scripts.includes(scriptName)){
          console.log(`${`${scriptName}`.yellow} is not found in build-config.yml as a script!`)
          return
        }
        ProcessWrapper.wrap(scriptName ,this.self._config.system, args.args).then((ps)=>{
          this.getCurrent().running.add(ps);
          console.log(`running ${scriptName} | PID:${ps.pid} id:${ps.id}`)
        }).catch(err => {
          console.log(`could not run '${scriptName}'`.yellow);
          console.log(err);
        })

      }

      resolve()
    })
  }
}
