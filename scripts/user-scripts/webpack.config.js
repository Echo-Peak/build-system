var webpack = require('webpack');
var path = require('path');
let root = path.resolve(__dirname ,'../../');
let fs = require('fs');
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");
var socketIOClient = require('socket.io-client');
let yamlify = require('js-yaml');

let configPath = path.resolve(root ,'build-config.yml');
let c = fs.readFileSync(configPath).toString();
let config = yamlify.safeLoad(c);
let webpackname = path.basename(__filename).split(/\-|\./g)[1];
let socket = socketIOClient.connect(`http://localhost:${config.system.port}` ,{reconnect:true});

socket.emit('process-connected', {name:`webpack-${webpackname}`, pid:process.pid ,filepath:__filename});
console.log('sent!' ,webpackname , path.basename(__filename))
process.on('SIGTERM' ,function(){
  socket.emit('process-disconnected', {name:`webpack-${webpackname}`, pid:process.pid});
  setTimeout(process.exit , 500);
});
process.on('SIGINT' ,function(){
  socket.emit('process-disconnected', {name:`webpack-${webpackname}`, pid:process.pid});
  setTimeout(process.exit , 500);
});

socket.on('kill' ,()=>{
  socket.emit('killed-client');
  setTimeout(process.exit , 500);
})

function compileDone(){
    this.plugin("done", (stats)=>{
      let errors = stats.compilation.errors;
      if (errors && errors.length){

        if(config.system.beep){
          console.log("\007" + errors);
        }

        return
      }
        socket.emit('reload');
  });
}



let querys = {
    babel:{
      presets:['stage-1','es2015','react'],
      plugins:['transform-do-expressions','transform-es2015-modules-commonjs','transform-decorators-legacy' , 'transform-class-properties']
    }
}

let options  = {
    entry: {
      bundle:path.resolve(root ,'app/index'),
      vendors:[

      ]
    },
    target:'web',
    output: {
      path:path.resolve(root ,'app/out'),
      filename: '[name].js'
    },
    cache:true,
    watch:true,
    module: {
        loaders:[
          {
             test: /\.jsx|\.js$/,
             include:[path.resolve(root ,'app')],
             loader:`babel`,
             query:querys.babel
         },
        ]

    },
resolve: {
        extensions: ['.js',  '.jsx'],
        modulesDirectories: './node_modules'
    },
plugins: [
  new CommonsChunkPlugin('vendors' ,'vendors.js'),
  new webpack.optimize.OccurrenceOrderPlugin(),
  //new compileDone()
]

}
module.exports = options;
