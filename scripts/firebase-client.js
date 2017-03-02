var firebaseAdmin = require("firebase-admin");
let firebase = require('firebase');
let yamlify = require('js-yaml');
let config = yamlify.safeLoad('./build-config');
let child_process = require('child_process');
let key = require(config.firebase.serviceKey);
let db = config.firebase.databaseURL;
let fs = require('fs');
let path = require('path');
let jsonify = require('json2yaml');
let colors = require('colors');
let uuid = require('uuid');
let mkdir = require('mkdir');

let config  = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(key),
  databaseURL: db
});

firebase.initializeApp({
  databaseURL: db
});

let root = firebaseAdmin.database().ref();
let cache = [];

let actions = {
  addToCache(_path , data){
    cache.push({uuid:uuid() , path:_path , date:Date.now(), data});
  },
  undo(_path){
    let filtered = cache.filter(e => e === _path).sort((a ,b) => b.date - a.date);
    return filtered.shift();
  },
  sync:function(path ,done){
    let currentFile = this.checkPath(path);
    let parsedFile = yamlify.safeLoad(currentFile);

    let url = path.replace('-','/');
    cache.push({uuid:uuid() , path:path , date:Date.now(), data:parsedFile});
    // if(Array.isArray(parsedFile)){
    //   parsedFile = parsedFile.map(e => e.token = uuid());
    // }
    // let enumable = Object.keys(parsedFile).map( e => parseInt(e))
    // .filter(e => typeof e === 'number' && !isNaN(e));
    //
    // if(enumable.length){
    //
    //   enumable.map(e => parsedFile[e].token = uuid());
    // }
    //console.log(parsedFile , currentFile)


    root.child(url).once('value' ,function(snapshot){

      if(!snapshot.val()){
        if(parsedFile){
          root.child(url).set(parsedFile);
        }
        typeof done === 'function' && done();
        return
      }
      root.child(url).set(parsedFile);
      typeof done === 'function' && done();
    });
  },
  cache(){
    return cache;
  },
  rollback(iterations ,_path){
    //console.log(iterations , cache.length);

    if(iterations > cache.length || iterations < 0){
        console.log("nothing to rollback");
        return
    }
    if(!_path){
      console.log("expected path");
      return
    }

    let timeline = cache.filter(e => e.path === _path)
    .sort((a , b) => b.date - a.date);

  //  console.log('timeline',timeline.length , iterations);
    if(timeline.length &&  ( iterations > 0 && iterations < timeline.length )){
      let overwrite = timeline[timeline.length - iterations];
      console.log(`ROLLING BACK ${iterations} iterations. from ${new Date(overwrite.date)}`);


      root.child(_path).set(overwrite.data)
    }

  },
  dump:function(type){

    if(type === 'fs'){
      let file = path.resolve(__dirname ,`../firebase/dumps/dump-${Date.now()}.json`);
      fs.writeFile(file ,JSON.stringify(cache,null,2), function(err){
        if(err){
          console.log('err');
          return
        }
        console.log(`dumped cache to ${file}`)
      })
    }else{
      console.log(cache);
    }
  },
  checkPath:function(_path){
    let filename = path.resolve(__dirname ,`../firebase/db/${_path}.yml`);

    try{
      fs.accessSync(filename ,fs.FS_OK);
      return fs.readFileSync(filename).toString('ascii');
    }catch(err){

      fs.writeFileSync(filename ,`init: ${Date.now()}`);
     return fs.readFileSync(filename).toString('ascii');
    }
  },
  remoteSync:function(_path){
    root.child(_path).once('value' ,function(snapshot){
      let json = snapshot.val();
      if(!json){
        console.log("nothing to sync");
        return
      }
      let yaml = jsonify.stringify(json);
      let file = path.resolve(__dirname ,`../firebase/db/${_path}.yml`);
      fs.writeFile(file , yaml ,function(err){
        if(err){
          console.log(err);
        }
      });
    });
  },
  syncLocal(_path, value){
    let yaml = jsonify.stringify(value);
    _path = _path.replace(/\//g, '-');
    let db = path.resolve(__dirname, `../firebase/db/${_path}.yml` );

    try{
      fs.accessSync(_path ,fs.FS_OK);
    }catch(err){
      fs.writeFileSync(_path ,value);
    }
  },
  restore:function(_path){
    //restores most oldest {_path} in cache
    let restorepoint = cache.filter(e => e.path === _path).sort((a , b) => a.date - b.date)[0];
    root.child(_path).set(restorepoint.data)
  },
  applyChange(_path , method , newValue){
    if(!/^\/?[a-z0-9\-\/]/g.test(_path)) {
      console.log('invalid path got ' ,_path);
      return
    }
    if(!method && !newValue){
      console.log('must pass method & new value');
      return
    }
    cache.push({uuid:uuid() , path:path , date:Date.now(), data:newValue});
    this.syncLocal(_path ,newValue );
    let fixedData = newValue;

    if(Array.isArray(newValue)){
      fixedData =  fixedData.reduce((start , item ,index)=>{
        start[index] = item;
        return start
      },{});
    }
    switch(method){
      case 'set':{
        root.child(_path).set(newValue);
      };break;
      case 'push':{ root.child(_path).push(newValue); };break;
      case 'update':{
        console.log(_path ,  fixedData);
        root.child(_path).update(fixedData);
      };break;
    }
  },
  query(_path ,callback){
    if(_path && callback){
      if(typeof _path === 'string' && _path.length){
        root.child(_path).once('value' , snapshot => callback(snapshot.val()))
      }
    }
  }

}
process.on('message' ,function(config){
  actions[config.prop](...config.args);
});

module.exports = actions;
