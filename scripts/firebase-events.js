let syncFirebase = require('./firebase-client');

module.exports  = class FirebaseEvents{
  constructor(socket , config){
    socket.on('sync-firebase' ,function(changes){
  
       syncFirebase.applyChange(changes.path , changes.method,  changes.data)
    });
    socket.on('rollback-firebase' ,function(howFar, path){
      syncFirebase.rollback(howFar , path);
    });
    socket.on('restore-original-path' ,function(path){
      syncFirebase.restore(path);
    });
    socket.on('firebase-cache' ,function(path){
      socket.emit('firebase-cache' ,syncFirebase.cache() )
    });
    socket.on('update-cache' ,function({path , data}){
      syncFirebase.addToCache(path , data);
    });
    
    socket.on('undo-firebase' ,function(path){
      socket.emit('undo-firebase' ,syncFirebase.undo(path))
    });
    socket.on('query' ,function(path){
      syncFirebase.query(path , function(result){
    
        socket.emit('query-result' ,result)
      })
    });
  }
}