let fs = require('fs');
let path = require('path');
let colors = require('colors');
let readline = require('readline')

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let configPath = path.resolve(__dirname, '../');

fs.access(`${configPath}/build-config.old`, function (err) {
  if (err) {
    console.log('could not find a older version of build-config!'.yellow)
    process.exit(0)
  }
  rl.question(`Are you sure you want to overwrite the contents of ${'build-config.yml'.yellow} with ${'build-config.old'.yellow}? (Y/n)`, overwrite)
});


function overwrite(answer) {
  let close = rl.close.bind(rl);
  if (answer) {
    if (answer === 'y' || answer === 'Y') {

      let input = `${configPath}/build-config.old`;
      let output = `${configPath}/build-config.yml`;

      fs.createReadStream(input)
        .pipe(fs.createWriteStream(output))
        .on('finish', function () {
          fs.unlink(input , function(err){
            if(err){
              throw err
            }
            console.log('Sucsessfully overwritten!'.green)
            close()
          })
        })
    } else {
      console.log('aborting!');
      close();
    }
  }
}