let fs = require('fs');
let path = require('path');
let yamlify = require('js-yaml');
let c = fs.readFileSync('./build-config.yml').toString();
let config = yamlify.safeLoad(c);
const questions = require('questions');
const colors = require('colors');
const packageJSON = require('../package');
let newConfig = {}

console.log(`
 Configuration time! 
 `.yellow);

function mutateConfig(_path, value ,obj) {
    let schema = obj;
    let pList = _path.split('.');
    let len = pList.length - 1;
    let i = 0;
    for(; i < len; i++) {
        let elem = pList[i];
        if( !schema[elem] ) throw new Error(`no such path in config '${_path}'`)
        schema = schema[elem];
    }
    if(!schema[pList[len]]){
      throw new Error(`no such path in config '${_path}'`)
    }
    schema[pList[len]] = value;
  return obj
}

function writeConfig(data){
  let configPath = path.resolve(__dirname ,`../`);
  let input = `${configPath}/build-config.yml`;
  let output = `${configPath}/build-config.old`;
  fs.createReadStream(input)
  .pipe(fs.createWriteStream(output))
  .on('finish' ,function(){
    fs.writeFile(input , data , function(err){
      if(err){
        throw err
      }
      console.log('Configuation applied!'.cyan)
    })
  })
}
questions.askMany({
    'system.beep': { info:'Enable console beep(true)?', required: true},
    'system.port': { info:'Set daemon port(7000)?', required: true},
    'system.frontPort': { info:'Set Front-end port(7100)?', required: true },
    'system.processName':{ info:`Set appname(${packageJSON.name})?`, required: true }
}, function(result){
    console.log('Configuation complete!'.green)
    console.log(result);
    let keys = Object.keys(result)
    keys.forEach(item => {
      console.log(item)
      let value = result[item];
      newConfig = mutateConfig(item , value , config);
    });
    writeConfig(yamlify.safeDump(newConfig));
    //console.log(yamlify.safeDump(newConfig))
    //console.log('loaded' , newConfig);
});



//  console.log(yamlify.safeDump(newConfig))
//  console.log('loaded' , newConfig);
