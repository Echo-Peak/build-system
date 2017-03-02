const AppRepl = require('./core');

const fs = require('fs');
const vorpal = require('vorpal')();

if(module.parent){
  module.exports = AppRepl;
}else{
  console.log('running');
  let yamlify = require('js-yaml');
  let c = fs.readFileSync('./build-config.yml').toString();
  let config = yamlify.safeLoad(c);
  new AppRepl(config);
  // let app = new AppRepl(config);
  // global.app = app.setup();

}