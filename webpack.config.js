var webpack = require('webpack');
var path = require('path');
let fs = require('fs');
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");
var socketIOClient = require('socket.io-client');
let c = fs.readFileSync('./build-config.yml').toString();
let config = yamlify.safeLoad(c);
let socket;
let vendors;
let plugins = [];
let loaders = [];


function parseConfigVars(o){
  let availableVars = {
    $dir:__dirname,
    $cwd:process.cwd(),
    $scripts:path.resolve(__dirname ,'scripts')
  }

  let newObj = JSON.stringify(o);
  for(let _var in availableVars){
    let reg = new RegExp(_var ,'g');
    newObj = newObj.replace(reg , availableVars[_var]);
  }
  return JSON.parse(newObj)
}
config = parseConfigVars(config);


function targetResolver(){
  let builtin = ['web' ,'node'];

}
// socketio config
if(config.processes.webpack.socket){
  socket = socketIOClient.connect(`http://localhost:${config.system.port}`);
  socket.on('kill' ,function(){
    process.exit();
  });
}

// plugins
if(config.processes.webpack){
  let supportedPlugins = ['DedupePlugin' ,'LimitChunkCountPlugin' ,'OccurrenceOrderPlugin' , 'UglifyJsPlugin'];
  plugins = _p = config.processes.webpack.plugins || [];
  plugins = supportedPlugins.map(p => {
    if(~plugins.indexOf(p)){
      return new webpack.optimize[p]()
    }
  });
  if(_p.includes('CommonsChunkPlugin')){
    vendors = config.processes.webpack.vendors || [];

  }
  
  plugins.push(compileDone);
}


if(config.processes.webpack.fileTypes){
  let types = config.processes.webpack.fileTypes || [];

  let correspondingLoader = {
    babel:{
      presets:config.processes.webpack.babel.presets,
      plugins:config.processes.webpack.babel.plugins,
      types:['js','jsx']
    },
    css:{
      types:['css']
    },
    ts:['ts' ,'tsx'],
    raw:{
      types:['*']
    }
  }

  for(let loader in correspondingLoader){
    let currentLoader = correspondingLoader[loader];
    let _types = currentLoader.types.map(e => '\.'+e).join('|');
    let test = new RegExp(_types + '$');
    let include = config.processes.webpack.loaders[loader].includes;
    let query = config.processes.webpack.loaders[loader].config || {}
    let exclude = config.processes.webpack.loaders[loader].exclude || [];
    if(config.processes.webpack.loaders[loader].node_modules){
      exclude.push('node_modules');
    }
    loaders.push({
      test,
      include,
      exclude,
      loader,
      query
    })
  }

}

function compileDone(){
    this.plugin("done", (stats)=>{
      let errors = stats.compilation.errors;
      if (errors && errors.length){

        if(config.system.beep){
          console.log("\007" + errors);
        }

        return
      }
      if(config.processes.webpack.socket){
        socket.emit('reload');
      }
  }
}




let options  = {
    entry: {
      bundle:config.processes.webpack.entry
    },
    target:targetResolver(),
    output: {
      path:config.processes.webpack.out,
      filename: config.processes.webpack.filename
    },
    cache:typeof  config.processes.webpack.cache === 'boolean' &&  config.processes.webpack.cache ,
    watch:typeof  config.processes.webpack.watch === 'boolean' &&  config.processes.webpack.watch,
    module: {
        loaders:loaders

    },
resolve: {
        extensions: config.processes.webpack.resolve.ext.map(e => '.'+e),
        modulesDirectories: config.processes.webpack.resolve.modulesDirectories
    },
plugins: []


}

if(vendors.length){
  options.entry.vendors = vendors;
  options.plugins.push(new CommonsChunkPlugin('vendors','vendors.js'));
}
module.exports = options;