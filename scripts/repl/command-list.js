let colors = require('colors');

module.exports = [
  {
    cmd: 'history [sessionID]', desc: `shows & loads repel history`,
    callCommand: 'history', options: []
  },
  {
    cmd: 'gulp [method] [taskname]', desc: `runs or stops a gulp task`,
    callCommand: 'gulp', options: []
  },
  {
    cmd: 'gulp-stream <src> <dest> [tasks...]', desc: `creates a gulp stream at runtime`, disabled:true,
    callCommand: 'gulpStream', options: [
      {cmd:'-o', desc:'pass paramerts to gulp task'}
    ]
  },
  {
    cmd: 'run [script]', desc: `runs a process`,
    callCommand: 'run', options: [
      { cmd: '-s', desc: 'spawns process in its own shell' }
    ]
  },
  {
    cmd: 'app [internal] [methodCall] [args...]', desc: `Shows app statistics; use ${'app internal'.green} to access the instance`,
    callCommand: 'app', options: []
  },
  {
    cmd: 'ps', desc: `shows a list processes that can be ran`,
    callCommand: 'processList', options: []
  },
  {
    cmd: 'kill [processesName...]', desc: `terminates the build system; use force to force kill this process`,
    callCommand: 'kill', options: [
      { cmd: 'pid', desc: `kills script by PID` }
    ]
  },
  {
    cmd: 'stats', desc: `shows heap stats of running processes`,
    callCommand: 'stats', options: []
  },
  {
    cmd: 'clear', desc: `clears the terminal`,
    callCommand: 'clear', options: []
  },
  {
    cmd: 'cd [newDirectory]', desc: `change the PWD; uses relative path`,
    callCommand: 'cd', options: []
  },
  {
    cmd: 'exit [force]', desc: `kills the repl, build process, and child processes`,
    callCommand: 'exit', options: []
  },
  {
    cmd: 'webpack <action> [input] [params...]', desc: `runs a webpack enviroment`,
    callCommand: 'runWebpack', options: [
      {cmd:'use'.blue, desc:'loads a webpack.config file from /user-scripts'},
      {cmd:'run'.blue, desc:`runs webpack-dynamic from '${`${'/user-scripts'.yellow}`}' useing the config from ${`${'/build-config.yml'}`}`},
      {cmd:'list'.blue, desc:`Shows list of runnable found from ${'/user-scripts'.yellow}`},
      {cmd:'watch'.green, desc:'toggle file watching'},
      {cmd:'-env, --enviroment'.green, desc:'sets webpack-enviroment'},
      {cmd:'-e, --entry'.green, desc:'select entry path'},
      {cmd:'-o, --output'.green, desc:'select output path'},
      {cmd:'-s, --shell', desc:'spawns webpack instance in new shell'},
    ]
  }
]
