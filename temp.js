// let vorpal = require('vorpal')();
//
// vorpal
//   .command('foo <requiredArg> [optionalArg]' ,'kill stuff')
//   .option('-v, --verbose22', 'Print foobar instead.')
//   .option('-n, --nigs', 'Print foobar instead.')
//   .action(function(args, callback) {
//     console.log(args)
//     if (args.options.verbose) {
//       this.log('foobar');
//     } else {
//       this.log('bar');
//     }
//     callback();
//   });
//   vorpal
//   .delimiter('myapp$')
//   .show();

let child_process = require('child_process');

let v = child_process.spawn('cmd' , ['/k' ,'webpack', '--config' ,'./scripts/user-scripts/webpack-test.js']);

// v.stdout.on('data', (data) => {
//   console.log(`stdout: ${data}`);
// });
v.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
  v.kill()
});
