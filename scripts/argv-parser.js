
/**
 * usage
 * keypair converts key:value into {key:value}
 * let argv = new ArgParser(<keypairPrefix>, <return process.argv bool>).build(<process.argv>)
 * 
 * argv = new ArgParser('--',true).build(process.argv)
 */
module.exports = class ArgParser{

  constructor(prefixString , returnOrginalBool){
    if(!prefixString || typeof prefixString !== 'string' || !prefixString.length){
      prefixString = '';
    }
    returnOrginalBool = !!returnOrginalBool;
    let s = prefixString;
    this.prefixString  = prefixString;
    let regex = {
      startWith:new RegExp(`^${s}`),
      keypair:'[a-z\\-0-9]+:[a-z\\-0-9]+',
      split:/\:/,
      numbers:/\d+/g,
      seperators:','
    }
    this.regex = regex;
  }
  build(argv){
    let result = {}
    let startWith = new RegExp(`^${this.prefixString}`)
    let keypair = new RegExp(this.prefixString + this.regex.keypair ,'gi');
    let newArgv = argv.join(' ').match(keypair);
    
    if(!newArgv){
      return {_argv:argv}
    }
    newArgv.reduce((start ,item) =>{
      let i = item.replace(startWith ,'').split(this.regex.split);
      if(i[1] === 'true' || i[1] === 'false'){
        start[i[0]] = JSON.parse(i[1]);
      }else if(i[1].match(/,/g)){

        start[i[0]] = i[1].split(',');
      }else if(i[1].match(/\d+/g)){
        let num = parseInt(i[1]);
        if(isNaN(num)) num = i[1];
        start[i[0]] = num
      }else{
        start[i[0]] = i[1];
      }


      return start
  },result);

    return result
  }
}