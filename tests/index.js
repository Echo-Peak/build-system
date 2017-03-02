let fs = require('fs');
let yamlify = require('js-yaml');
let c = fs.readFileSync('./build-config.yml').toString();
let config = yamlify.safeLoad(c);
let child_process = require('child_process');
let SocketIOClient = require('socket.io-client');
let chai ,_assert, _expect, _should;
let socket;
switch(config.processes.testing.assertion){
    case 'chai': chai = require('chai');break;
    case 'assert': _assert = require('assert');break;
    case 'should': _should = require('should');break;
    case 'expect': _expect = require('expect');break;
}

if(config.processes.testing.socket){
    socket = SocketIOClient.connect('http://localhost:${config.system.port}' , {reconnect:true});
    try{

    }catch(err){
    socket.emit('process-connected' ,{name:config.processes.testing.name , pid:process.pid})
    socket.on('kill' , e => process.exit(0));

    }
}


if(!process.argv.includes('-child')){
    console.log('creating child process' ,`${config.processes.testing.use} ${__filename}` );
    child_process.execSync(`${config.processes.testing.use} "${__filename}" -child`);
}else{
    console.log('CHILD');
    let expect = chai.expect;
    describe('stuff' , function(){
        it('should work' ,function(){
            expect(90).to.equal(90)
        })
    });
    try{

    process.stdout.on('data' ,function(chunk){
        try{
        socket.emit('stdout-data',chunk.toSting() )
        }catch(err){}
    })
    }catch(err){}
}



//enter you code here!

