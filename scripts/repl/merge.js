//merges multiple prototypes together
// all protos will be proxy bound to argument[0] proto

function getDesc(obj, prop) {
  var desc = Object.getOwnPropertyDescriptor(obj, prop);
  return desc || (obj = Object.getPrototypeOf(obj) ? getDesc(obj, prop) : void 0);
}


function traps(protos) {

  return {
    has(target, prop) {
      var obj = protos.find(obj => prop in obj);
      return protos.some(obj => prop in obj);
    },
    get(target, prop, receiver) {
      var obj = protos.find(obj => prop in obj);
      return obj ? Reflect.get(obj, prop, receiver) : void 0;
    },
    set(target, prop, value, receiver){
      var obj = protos.find(obj => prop in obj);
      return Reflect.set(obj || Object.create(null), prop, value, receiver);
    }
    preventExtensions(target)  {return false },
    defineProperty(target, prop, desc){ return false }
    getOwnPropertyDescriptor(target, prop){
      var obj = protos.find(obj => prop in obj);
      var desc = obj ? getDesc(obj, prop) : void 0;
      if (desc) desc.configurable = true;
      return desc;
    },
    ownKeys(target){
      var hash = Object.create(null);
      for (var obj of protos)
        for (var p in obj)
          if (!hash[p]) hash[p] = true;
      return Object.getOwnPropertyNames(hash);
    },
    * enumerate(target) {
      yield* this.ownKeys(target);
    }
  }
}

module.exports = function Merge(...protos) {
  return Object.create(new Proxy(Object.create(null), traps(protos));
}