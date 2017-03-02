const gulp = require('gulp');
const events = require('events');
const plumber = require('gulp-plumber');
const path = require('path');
const fs = require('fs');
const argParser = require('../argv-parser');

module.exports = class GulpStreamAdapter extends events{
  static init(config){

  }
  constructor(parent){
    super()
    this.moduleCache = {}
    this.streamsRunning = [];
  }
  builder(){
    return new Promise((resolve ,reject)=>{
      resolve()
    })
  }
  tokenizer(token){

  }
  create(src , dest , tasks){
    let stream;
    this.emit('stream-started');
    if(Array.isArray(tasks) && tasks.length){
      stream = tasks.map((task , i)=> this.builder(src , dest, task, i));
    }
    let done = Promise.all(stream).then(()=>{
      this.emit('done');
    })
    .catch((err) => {
      this.emit('error' ,err)
    })
  }
  prepare(src , dest, _tasks){
     let root = process.cwd();
     let getPath = (relPath) => path.resolve(root , relPath);

      let tasks = _tasks.reduce((start, item, index) => {
        if(index % 2 === 0){
            let options = new argParser('' ,false).build(_tasks[index]);
            let task = _tasks[index + 1];
            start.push({options , task});
        }
        return start
      },[]);
  }
}

// be able to run tasks sequentially
// be able to pass option into each task sequentially
//  be able to have function mondifiers that do specific tasks

//gulp-stream [src] [>] [dest]
// gulp-stream [src] [functionModifer] [dest] -o [task] -o [task]
