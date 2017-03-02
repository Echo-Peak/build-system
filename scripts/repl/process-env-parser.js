module.exports = function(envVar , env){
  let prop;

  for(prop in env){
    let value = env[prop].toLowerCase();
    if(value === 'true' || value === 'false'){
      env[prop] = JSON.parse(value)
    }else if(value.match(/\d+/)){
      env[prop] = Number(value);
    }else{
      env[prop] = value;
    }
    

  }
  return env[envVar] ? true : false
}