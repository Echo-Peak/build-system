const path  = require('path');
const fs = require('fs');

function fromJSON(json , callback){ // convert to array
  if(json && json.length){
    try{
      json = JSON.parse(json);
      json = Object.keys(json).map(e => json[e]);
      callback(json);
    }catch(err){
      callback([])
    }
  }else{ callback([]) }
}
module.exports = class IO {
  constructor(parent){
    this.self  = parent;
    this.historyCache = [];
    this.paths = {
      repl:path.resolve(__dirname ,'repel-history.json'),
      stderr:path.resolve(__dirname , 'stderr.log'),
      stdout:path.resolve(__dirname , 'stdout.log')
    }
  }
  getHistory(callback){
    fs.readFile(this.paths.repl , (err , data)=>{
      if(err){
        callback([]);
      }else{
      try{
          if(!data.length) throw 'empty object';
          valid = JSON.parse(data.toString('ascii'));
           mostRecent = Object.keys(valid).map(e => valid[e]).sort((a,b)=>{
            return new Date(b).getTime() - new Date(a).getTime();
           });
        callback(mostRecent);
        }catch(parseErrorerr){
          callback([])
        }
      }
    })
  }
  loadHistory(){
    return new Promise((resolve, reject)=>{
      fs.readFile(this.paths.repl , (err , data)=>{
        let valid;
        let mostRecent;
        try{
          if(!data.length) throw 'empty object';
          valid = JSON.parse(data.toString('ascii'));
           mostRecent = Object.keys(valid).map(e => valid[e]).sort((a,b)=>{
            return new Date(b).getTime() - new Date(a).getTime();
           });
           this.historyCache = mostRecent;
        mostRecent = mostRecent.length ? mostRecent[0].commands : [];
        }catch(parseErrorerr){
          reject(parseError);
        }
        err ? reject(err) : resolve(valid);
      });
    })
  }
  updateHistory(arr){
    return new Promise((resolve, reject)=>{
      if(!arr.length){
        resolve('Empty history! exiting!')
        return
      }
      console.log('Saving session!'.green);
      let newSession =  {
        time:new Date(),
        commands:arr
      }
      let write = (data , done) => fs.writeFile(this.paths.repl , JSON.stringify(data), done);

      fs.readFile(this.paths.repl, (err, data) => {
   
        if (err) {
          write(newSession , err => (console.log , reject(err)));
          return
        }
        fromJSON(data , function(old){
          old = old.concat(newSession);
          write(old, (err) => {
            if (err) {
              reject(err);
              return
            }
            resolve('Saved!')
          });
        })
      })
    });
  }
  fromHistory(sessionID){
    let target = this.historyCache.filter( e => e.time === sessionID);
    return target.length ? target[0].commands : []
  }
  onerror(){

  }
  readErrors(){

  }
  clearReplHistory(){

  }
}