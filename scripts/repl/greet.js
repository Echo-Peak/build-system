require('colors');
module.exports = function showInstuctions(commandList , processName){
    if(!processName)  processName = 'REPL';

    
    let date = new Date();
    let username = process.env.username || process.env.USER;
    let dayTime = date.getHours() >= 12 ? 'Good Afternoon' : 'Good Morning';

    console.log(`
${processName.yellow.underline.bold}

${dayTime}, ${username}
PWD: ${process.cwd()}

${'Instuctions:'}`);
    commandList.forEach((cmd)=>{
        console.log(`use ${cmd.cmd.green} - ${cmd.desc}`);
        cmd.options.length && cmd.options.forEach(option => console.log(`   option ${option.cmd} - ${option.desc}\n`.yellow))
    });
    console.log('\n')

}