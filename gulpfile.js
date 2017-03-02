var gulp = require('gulp');
let fs = require('fs');
let yamlify = require('js-yaml');
var path = require('path');
let c = fs.readFileSync('./build-config.yml').toString();
let config = yamlify.safeLoad(c);
process.env.CONFIG = JSON.stringify(config);
let appRepl = require('./scripts/repl');
//let Pipeline = require('./scripts/pipeline-parser');
//let processOrchestrator = require('./scripts/process-orchestrator')(config);
//let commandInterface = require('./scripts/command-interface')(config);
let server = require('./scripts/server')(config);
let colors = require('colors');
let browserSync = require('browser-sync').create();
var plumber = require('gulp-plumber');
var sassify = require('gulp-sass');
var concat = require('gulp-concat');
var gulpJade = require('gulp-jade');
var watch = require('gulp-watch');
const gulpIf = require('gulp-if');
let socketIOClient = require('socket.io-client');
let child_process = require('child_process');
let jade = require('jade');
let autoprefix = require('gulp-autoprefixer');
let $argv = {}
let stdoutFormat = require('./scripts/stdout-format');
let uuid = require('uuid');
let integatedScripts = require('./scripts/intergrated-scripts');

let app = global.app = new appRepl(config);
let Spawner = require('./scripts/spawner')(app);

let Clients = [];
let fnmap = {
  imdone,
  jadeify,
  scss,
  exit
}

let dbService;
let socket;

if(config.system.argvParser){
  let argvParser = require('./scripts/argv-parser');
  $argv = argvParser(process.argv);
}

process.title = config.system.processName;
let dbServices = {
  mongoDB:'mongoose',
  firebase:['firebase' , 'firebase-admin']
}

if(config.gulp.socket){
  socket = socketIOClient.connect(`http://localhost:${config.system.port}`);
  socket.emit('process-connected', {name:'main', pid:process.pid})
}


// if(config.processes.firebase.database){
//   console.log(`firebase enabled`.yellow)
//   console.log(`firebase DB workspace created at ${config.firebase.workspace}`.yellow);
//   console.log(`use /firebase to connect`.yellow);
//   require('./scripts/firebase-client');
// }

for(let iScript in integatedScripts){
  let iConfig = integatedScripts[iScript];
  let getOptions  = config.integrated[iScript];

  let iEnabled = getOptions && typeof getOptions.enabled === 'boolean' ? getOptions.enabled : false;
  let hasScript = iConfig.script ? true : false;
  if(iEnabled && hasScript){
    //console.log(99,iEnabled , hasScript , iConfig)
    Spawner.createWrapper(iScript , iConfig , config.system.socket , config.system.port);
  }
}

//console.log(tasks)

let isFunction = (fnName) => typeof fnmap[fnName] !== 'function'
let validTask = (taskObj) => {
  if(typeof taskObj[0] === 'string' && taskObj[0].length){
    let isUndifinded = typeof taskObj[1] !== void 0;
    let isObject = typeof taskObj[1] === 'object' && taskObj[1] !== null;
    let exists = taskObj[1] ? true : false;
    let notEmpty = Object.keys(taskObj[1]) ? true : false;
    let notArray = !Array.isArray(taskObj[1]);

    if(isUndifinded && exists && isObject && notArray  && notEmpty){
      return true
    }else{
      return false
    }
    return true
  }
}

function taskRunner(taskname ,tasks, watch , immediate){
  let fn  = fnmap[taskname];
  //console.log(tasks);

  if(tasks && Array.isArray(tasks)){
    let validate = tasks.every(validTask);
    console.log('validating',validate);
  }
  // if(!isFunction(fn)){
  //   console.log(`'${`${taskname}`.yellow}' is not a function. Skipping...`);
  //   return
  // }

}
//maps functions to be called by string below
gulp.task('default' ,function(done){
  console.log('Using default tasks'.yellow)
  console.log('foo');
  // let gulpTasks = Object.keys(config.gulp.tasks);
  // let tasks = gulpTasks.map(e => config.gulp.tasks[e]);
  // tasks.forEach((task , i) => {
  //   let args = [gulpTasks[i] , task.tasks, task.watch , task.runOnStart];
  //   taskRunner(...args)
  //   });
  //console.log($argv , app.paths)
  done()
});
function update(done){
  browserSync.reload({stream:true});
  if(config.gulp.socket){
    socket.emit('update');
  }
 // done();
}
function onError(msg){
  let beep = config.system.beep ? '\u0007' : '';
  console.log(msg.red , beep)
}

function exit(taskConfig , done){
  console.log('exiting');
  done()
  //process.exit(0);
}
function imdone(taskConfig ,done){
  let stream = gulp.src(taskConfig.paths)
  .pipe(gulp.dest(taskConfig.dest))
  stream.on('end', function(){
    update(done)
    //let after = .split(',').map(e => e.trim());
  });
  stream.on('error', onError.bind(taskConfig));
}
function jadeify(taskConfig, done){
  console.log(taskConfig , done);
  let stream = gulp.src(taskConfig.paths)
  .pipe(plumber(plumberHandler(done)))
  .pipe(gulpJade())
  .pipe(gulp.dest(taskConfig.dest));
  stream.on('end', function(){

    update();
    let after = taskConfig.after.forEach(fn => {
      fnmap[fn].call(this, taskConfig);

      });
    //let after =
  });
  stream.on('error', onError.bind(taskConfig));
  return stream
}
function scss(taskConfig, done){

  let ifConcat = gulpIf(!!taskConfig.concat ,concat(taskConfig.filename || 'styles.css'));
  let stream = gulp.src(taskConfig.paths)
  .pipe(plumber(plumberHandler(done)))
  .pipe(sassify())
  .pipe(ifConcat)
  .pipe(autoprefix( {browsers:['last 2 versions'], cascade:false}))
  .pipe(gulp.dest(taskConfig.dest))
  stream.on('end', function(){
    let after = taskConfig.after.forEach(fn => {
      fnmap[fn].call(this, taskConfig ,done);

    })
  })
  stream.on('error', onError.bind(taskConfig))
}


// let currentEnv = $argv.env || config.defaultEnviroment;
// let using = $argv.use || config.use;
// let hotReload = typeof $argv.hotReload === 'boolean' ? $argv.hotReload : config.hotReload;
// $argv.backup && (backup.every($argv.every));


// console.log(hotReload, $argv.hotReload  , typeof $argv.hotReload  , $argv);

// commandInterface.loadTasks([
//   'startProcess',
//   'scss',
//   'jadeify',
//   'inject-html',
//   'hot-reload',
//   //'run-scripts',
//   'backup'
// ]);

// //let mockSocketServer = require(`./deploy/${using}/server/core/socket-server`);
// let hotReloadServer = hotReload && require(`./deploy/${using}/app`)(browserSync);
// //let firebase = using === 'deploy' && require('./deploy/dashboard/app')(browserSync);
// let firebaseIO = socketIOClient.connect(`http://localhost/${config.ports.proxy + 1}/firebaseIO`);

// let firebase = {}

// function firebaseProcess(){
//   firebase =
//   appClients['firebase'] = child_process.fork('./scripts/sync-firebase.js' ,process.argv.slice(2),{stdio:'pipe' ,silent:true});
//   firebase.stdout.setEncoding('utf8');
//   firebase.stderr.setEncoding('utf8');
//   firebase.stdout.on('data',function(msg){
//     console.log(msg);
//     console.log(stdoutFormat(msg));

//   });
//   firebase.stderr.on('data',function(msg){
//     console.log(`[FIREBASE]`.red.bold, msg);
//     console.log(`[FIREBASE]`.red.bold ,'has been terminated');
//     firebase.kill();
//   });
// }


// let tasks = [
//   'scss',
//   'jadeify',
//   hotReload ? 'hot-reload' : 'startProcess',
//   'run-scripts',
//   'watches',
// ];
// $argv.backup && tasks.push('backup');

// gulp.task('init' ,tasks);
// gulp.task('restart' ,restart);
// gulp.task('startProcess' ,startProcess);
// gulp.task('scss',scss);
// gulp.task('jadeify', _jadeify);
// gulp.task('watches',watches);
// gulp.task('sync-firebase', syncFirebase);
// gulp.task('inject-html' ,injectHTML);
// gulp.task('hot-reload' ,hotReloadServer);
// gulp.task('run-scripts' ,runScripts);
// gulp.task('backup' ,done => !backup.every($argv.every) && done());


// //handled by browser-sync
// //hotReload && gulp.start('inject-html');

// //appClients['firebase'] =

// let dest = {
//   jade:'',
//   scss:'',
//   currentDB:null,
//   assets:{
//     app:'',
//     static:'',
//     item:''
//   }
// }


// let socket = socketIOClient.connect(`http://localhost:${config.ports.dev}`);

// let chrome_path  = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
// ($argv.chrome || config.chrome) && child_process.execFile(chrome_path ,[`http://localhost:${config.ports.proxy}`]);


// socket.on('reload' ,function(){
//   console.log('apps reloading')
// });



// function reload(done){
//   socket.emit('reload');
//   //done();
// }
// // servers will be hanndled by command intterface


// function restart(name, done){
//   if(!appClients[name].connected){
//     startProcess(done);
//     return
//   }
//   appClients[name].kill();
//   appClients[name].on('close' ,function(){
//     startProcess(done)
//   });
//   //console.log(appClients['main'])
// }

// function startProcess(name, script, done){
// //./deploy/${using}/app.js
//     appClients[name] = child_process.fork(script ,process.argv.slice(2),{stdio:'pipe' ,silent:true});
//     appClients[name].stdout.setEncoding('utf8');
//     appClients[name].stderr.setEncoding('utf8');
//     appClients[name].stdout.on('data',function(msg){
//       console.log(msg);
//       console.log(stdoutFormat(msg));

//     });
//     appClients[name].stderr.on('data',function(msg){
//       console.log(`[${name.toUpperCase()}]`.red.bold, msg);
//       console.log(`[${name.toUpperCase()}]`.red.bold ,'has been terminated');
//       appClients[name].kill();

//     });
//     done()
// }



// function injectHTML(done){
//   let _config = require('./deploy/dashboard/config.json');

//   let html = jade.renderFile(`${config.paths[using]}/server/views/base.jade` ,
//     {config:_config , env:'dev' , dev_port:_config.ports.dev ,state:{},  props:{}} );
//   fs.writeFile(`${config.paths[using]}/server/static/index.html` ,html ,function(err){
//     if(err){
//       console.log(err);
//       done();
//       return
//     }
//     browserSync.reload({stream:true});
//     done()
//   })
// }

// function syncFirebase(done){
//   if(!dest.currentDB){
//     done();
//     return
//   }
//   let dbPath = null;
//   let dbData = null;

//   firebase.sync(dest.currentDB , function(){
//     console.log(stdoutFormat(`synced firebase @ ${dest.currentDB}`));
//     done()
//   });
//   // console.log("firebase syncing not enabled");
//   // done()
// }

function plumberHandler(done){

  return {
    errorHandler(err){
      let beep = config.system.beep ? '\u0007' : '';
      console.log((err.message).yellow ,beep);
      done(err);
    }
  }
}

// function _jadeify(done){
//   let stream;
//   if(!dest.jade){
//     done();
//     return
//   }
//     injectHTML(done);
//     stream = gulp.src(`${config.paths[using]}/server/views/*.jade`)
//     .pipe(plumber(plumberHandler(done)))
//     .pipe(gulp.dest(`${config.paths[using]}/views`));

//     hotReload ? stream.pipe(browserSync.reload({stream:true})) : stream.on('end',reload.bind(0 ,done))

//     return stream
// }

// function scss(done){
//   let stream;
//   stream = gulp.src(`${config.paths[using]}/components/**/*.scss`)
//   .pipe(plumber(plumberHandler(done)))
//   .pipe(sassify())
//   .pipe(concat('styles.css'))
//   .pipe(autoprefix( {browsers:['last 2 versions'], cascade:false} ))
//   .pipe(gulp.dest(`${config.paths[using]}/server/static`));
//   hotReload ? stream.pipe(browserSync.reload({stream:true})) : stream.on('end',reload.bind(0 ,done));

//   return stream
// }

// function assets(done){
//   let stream;
//   if(!dest.assets.app){
//     done();
//     return
// }
//   stream = gulp.src(`./res-factory/${dest.assets.app}/*.*`)
//   .pipe(gulp.dest(`${config.paths[using]}/server/static/assets`));
//   hotReload ? stream.pipe(browserSync.reload({stream:true})) : stream.on('end',reload.bind(0 ,done));

//   return stream
// }


// let watchFiles = {
//   backend:[
//     `${config.paths[using]}/app.js`,
//     `${config.paths[using]}/config.json`,
//     `${config.paths[using]}/router/*.*`,
//     `${config.paths[using]}/server/**/*.*`,
//     `${config.paths[using]}/stores/*.*`,
//     `${config.paths[using]}/workers/*.*`,
//   ]
// }
// function watches(){

//   watch([`${config.paths[using]}/server/views/*.jade` ,`${config.paths[using]}/server/views/**/*.jade`] ,(e) =>{
//     dest.jade = e.relative.split(/\\/)[0];
//     gulp.start('jadeify');
//    });
//   watch(`${config.paths[using]}/components/**/*.scss` ,(e) =>{

//     gulp.start('scss');
//   });
//   watch('./res-factory' ,(e) =>{

//     dest.assets.app = e.relative.split(/\\/)[0];
//     gulp.start('assets');
//   });
//   if(!hotReload){
//       watch(watchFiles.backend ,(e) =>{
//       console.log("restaring app");
//       gulp.start('restart');
//     });
//   }
//   if(using === 'dashboard'){
//       watch(['./deploy/dashboard/server/views/*.jade' ,'./deploy/dashboard/server/views/**/*.jade'] ,(e) =>{

//       gulp.start('inject-html');
//     });
//   }
//   watch('./firebase/db/*.yml' ,(e) =>{
//     clearInterval(firebase.checker);
//     let currentDB = e.relative.replace(/\.yml$/,'');
//     //dest.currentDB = e.relative.replace(/\.yml$/,'');
//     //gulp.start('sync-firebase');
//     if(firebase.connected){
//       firebase.send({prop:'sync', args:[currentDB]})
//     }else{
//       firebaseProcess();
//       firebase.checker = setInterval(()=>{
//         console.log("reconnecting to firebase".yellow.bold);
//         if(firebase.connected){
//           clearInterval(firebase.checker);
//           firebase.send({prop:'sync', args:[currentDB]});
//         }
//       },1000)
//     }
//   });
//  }

// gulp.task('deploy' ,function(done){
//   commandInterface.runScript('deploy' ,done);
// });

// function runScripts(done){

//   //$argv.webpack && commandInterface.runScript('webpack' ,{shell:true, use:$argv.use} ,'');
//   done();
// }
