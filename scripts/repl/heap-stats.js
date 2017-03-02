require('colors');
const v8 = require('v8');
function formatMemStatistics(v8Heap){
  let toMB = (num) => num / 1024 / 1024;
  let prop;
  for(prop in v8Heap){
    v8Heap[prop] = `${toMB(v8Heap[prop]).toFixed(2)}MB`
  }
  return v8Heap
}

module.exports = function showStatistics(_process , callback){
  console.log('loading statistics...'.cyan)
  let c = 0;
  let length = _process.length;
  let result = []
  _process.forEach(item => {
    if(item.name === 'MAIN'){
      c++;
      item.stats = formatMemStatistics(v8.getHeapStatistics());
      if(c === length) {
        if(typeof callback !== 'function'){
          throw new Error(`expected callback to be a function`)
        }
        callback(_process)
      }
    }else{
      if(!item.child){
        return
      }
      item.child.send('message' ,{event:'get-heap'});
      item.child.on('message' , (event)=>{
        if(event.event === 'get-heap'){
          c++;
          if(c === length) formatMemStatistics(event.stats);
        }
      })
    }
  })
}