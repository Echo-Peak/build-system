const prettyjson = require('prettyjson');
module.exports = class System_commands{
  killPID(pid) {
    let current = this.self.getCurrent;
    return new Promise((resolve, reject) => {

      try {
        pid = Number(pid);
        if (isNaN(pid)) throw 'invalid PID'
      } catch (err) {
        reject('invalid PID')
        return
      }
      let getTarget = current.running.filter(e => e.pid === pid);
      if (getTarget.length) {
        if (process.platform === 'win32') {
          child_process.exec(`taskkill /pid ${pid} /f`, (stderr, stdout) => {
            if (stderr) {
              console.log(stderr);
            }
            console.log(`killed ${pid.toString().yellow}!`)
            let copy = Object.assign({} ,current);
            copy.running = copy.running.filter(e => e.pid !== pid);

            this.self.setCurrent  = copy;
          });
        }

      } else {
        console.log(`no running process with PID: ${pid.toString().yellow}`);
      }
    });
  }
  kill(args) {
    let pid = args.pid;
    return new Promise((resolve, reject) => {
      if (args.processesName) {
        let name = args.processesName[0].toLowerCase();
        let pid = args.processesName[1];
        if (name === 'pid' && typeof pid === number) {
          this.killPID(pid);
        } else if (name.length && name !== 'pid') {
          let getTargets = this.current.running.filter(e => e.name === name);
          getTargets.forEach(e => this.killProcess(e.name, e.id));
        }
      } else {
        reject(`you must specify a ${'pid'.yellow} to kill or a ${'process name'.yellow}. see ${'app'.cyan}`)
      }

      resolve();
    });
  }
  killProcess(args) {
    let processName = args.processName;
    let id = args.id;
    let current = this.self.getCurrent;

    return new Promise((resolve, reject) => {
      console.log(`Error occured`.red, `${processName} crashed!`);

      let getRunning = current.running.filter(e => e.id === id);
      getRunning.close && getRunning.close();
      let copy = Object.assign({}, current);
      copy.running = copy.running.filter(e => e.id !== id);
      this.self.setCurrent = copy;
      if (this.config.system.autoRecover) {
        setTimeout(() => {
          console.log(`Restarting ${processName}`.green);
          this.run(processName);
        }, 5000)
      }
      resolve()
    });
  }
  onprocessExit(args){

    if(this.exiting){
      console.log('waiting!...'.yellow)
      return
    }
    let force = args && args.force && args.force.toLowerCase() === 'force';
    let vorpal = this.vorpal.cmdHistory._hist

      this.self.getFunctionality('IO').
      updateHistory(vorpal)
      .then(()=>{
        console.log('exiting');
        this.Parent.exit(force);
        this.exiting = true;
      })
      .catch((err)=>{
        console.log(err , 'there was a error')
        this.Parent.exit(force);
        this.exiting = true;

      })
  }
}
