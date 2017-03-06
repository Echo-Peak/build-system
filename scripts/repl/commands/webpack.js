const prettyjson = require('prettyjson');
const argParser = require('../../argv-parser');
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

function getWebpack(callback){
  let cwd = process.cwd();
  console.log('looking for webpack');
  child_process.exec('webpack --help', function(stderr ,stdout){
    if(stdout){
      callback('webpack')
    }else{
      callback(path.resolve(cwd ,'node_modules/.bin/webpack.cmd'))
    }
  })
}

function execWebpack(resolve, webpackfile ,shell ,IPCCallback){
  console.log(webpackfile , shell)
        switch(process.platform){
        case 'win32':{
          getWebpack(function(bin){
            let options = {
              stdio:'pipe'
            }
            //if(shell){options.detached = true}
             console.log(`Launched ${webpackfile.yellow}!`);


            let child = child_process.spawn('cmd', ['/k',
            'webpack',
             '--config',
             'C:/Users/backup/Google Drive/@GitLab.com/build-system/scripts/user-scripts/webpack-test.js'] ,options);
            console.log(child.spawnargs)
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            IPCCallback(child);

            console.log('resolving!')
            resolve();
          })
        }break;
        case 'linux':{

        }


      }
}
function exists(fpath){
  return new Promise((resolve, reject)=>{
    fs.access(fpath, err => err ? reject(err) : resolve())
  })
}

let runnable = [];
let fpath = path.resolve(__dirname , '../../user-scripts');
fs.readdir(fpath , (err ,dirlist)=>{
  if(!err){
    runnable = dirlist.filter(e => e.match(/^webpack/)).map(e => e.split(/-|\./g)[1]) ||[];
  }
});

function setupIPC(socket , webpackName){
  return function(child){
    child.stderr.on('data' , (err)=>{
      console.log('stderr',err)
    });
    child.stdout.on('data' , (stdout)=>{
      //console.log('stdout',stdout)
    });


  }
}
module.exports = class Webpack_commands{
  //this is bound to commands super class
  runWebpack(args ,commands){
    args.args = args.args ? args.args : [];
    let getArgs  = new argParser('' ,true).build(args.args);
    let shell = typeof args.options.shell === 'boolean' ? args.options.shell : true;

    return new Promise((resolve, reject)=>{


      if(args.action === 'use'){
        let useFile = args.input;
        if(useFile && useFile.length){
          let fpath = path.resolve(__dirname , `../../user-scripts/webpack-${useFile}.js`);
          if(runnable.includes(useFile)){
            let binder = setupIPC.call(this , this.socket, useFile  );
            exists(fpath).then(noop => execWebpack(resolve, fpath ,shell , binder).then()).catch(reject)
          }else{

            reject(`webpack file ${`${useFile}`.cyan} not found! type ${'webpack list'.yellow} to view runable files`);
          }

        }else{

          reject(`You must specify a'${'webpack-file'.yellow}'!`)
        }
      }
      if(args.action === 'list'){
        console.log(`Runnable webpack files located from ${'/user-scripts'.yellow}`);
        console.log(prettyjson.render(runnable))
      }
      resolve()
    })
  }
  loadWebpack(){

  }
}
