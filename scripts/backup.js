var backup = require('backup');
let yamlify = require('js-yaml');
let config = yamlify.safeLoad('./build-config');
let colors = require('colors');
let path = require('path');
let fs = require('fs');


class Service{

  static clamp(val, min , max){
    if(val > max) return max;
    if(val < min) return min;
    return val || 10;
  }
  constructor(){
    this.interval = null;
  }
  resolveFilename(){
    let d = new Date();
    let filename = d.toDateString();
    let time = d.toLocaleTimeString().replace(/\:/g,'.');

     return `${filename} ${time}`;
  }
  doBackup(done){
    let time = Date.now();
    let filename = this.resolveFilename();
    backup.backup(path.resolve(__dirname ,  config.backup.src), `${config.backup.dest}/${filename}.backup`,function(){
      done(Date.now() - time ,filename);
    });


  }
  now(){
    console.log(`Backing up now! ${new Date().toLocaleTimeString()}`.yellow);
    this.doBackup(function(time ,file){
      console.log(`finished backup | ${(time /1000).toFixed(2)}s | ${file}`.green);
    })
  }
  every(mins){
    mins = Service.clamp(mins ,1, 300);
    clearInterval(this.interval);
    this.interval = setInterval(this.now.bind(this) , mins * 60 * 1000);
  }
}


let service =  new Service();
if (require.main === module) {
  service.now();
} else {
  module.exports  = service
}
