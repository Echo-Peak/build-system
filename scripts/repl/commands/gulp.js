const prettyjson = require('prettyjson');
module.exports = class Gulp_commands{
  gulpStream(args , command){
    let validate = (_path , reject) => {
      let x = _path.match(regex.glob);
      return x ? x[0] : reject('invalid file glob')
    }
    return new Promise((resolve , reject)=>{
      let src = validate(args.src);
      let dest = validate(args.dest);
      console.log('Prepareing gulp stream!'.green);
      this.self.getFunctionality('gulpStreamAdaptor').prepare(src ,dest , args.tasks)
      resolve()
    });
  }
  gulp(args){
    let run = args.method && args.method.toLowerCase() === 'run';
    let stop = args.method && args.method.toLowerCase() === 'stop';

    return new Promise((resolve , reject)=>{
      if(!run && !stop){
        console.log(`gulp tasks available to ${'run'.yellow} or ${'stop'.yellow}`);
        let tasks = Object.keys(this.self._config.gulp.tasks);
        if(tasks.length){
          console.log(prettyjson.render(tasks))
        }else{
          console.log('No tasks to list'.yellow)
        }
      }
      resolve()
    })
  }
}
