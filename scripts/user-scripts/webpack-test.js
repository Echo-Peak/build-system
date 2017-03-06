var webpack = require('webpack');
var path = require('path');
let root = path.resolve(__dirname ,'../../');
let fs = require('fs');
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");
let webpackname = path.basename(__filename).split(/\-|\./g)[1];
let IPC = require(path.resolve(__dirname ,'../repl/webpack-wrapper'));
let socket = IPC(webpackname);

function compileDone(){
    this.plugin("done", (stats)=>{
      let errors = stats.compilation.errors;
      if (errors && errors.length){
        socket.emit('webpack-error', {name:webpackname ,pid:process.pid ,error:errors});
        if(config.system.beep){
          console.log("\007" + errors);
        }

        return
      }
        socket.emit('webpack-compile-done', {name:webpackname ,pid:process.pid});
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
  new compileDone,
]

}
module.exports = options;
