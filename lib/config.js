var cjson = require('cjson');
var path = require('path');
var fs = require('fs');

exports.read = function() {
  var mupJsonPath = path.resolve('mup.json');
  if(fs.existsSync(mupJsonPath)) {
    var mupJson = cjson.load(mupJsonPath);

    //validation
    if(!mupJson.server) {
      mupErrorLog('server information not exists');
    } else if(!mupJson.server.host){
      mupErrorLog('server host not exists');
    } else if(!mupJson.server.username){
      mupErrorLog('server username not exists');
    } else if(!mupJson.server.password && !mupJson.server.pem){
      mupErrorLog('server password or pem not exists');
    } else if(!mupJson.app) {
      mupErrorLog('path to a app not exists');
    }

    //rewrite ~ with $HOME
    if(mupJson.server.pem) {
      mupJson.server.pem = mupJson.server.pem.replace('~', process.env.HOME);
    }

    return mupJson;
  } else {
    console.error('mup.json file not exists');
    process.exit(1);
  }
};

function mupErrorLog(message) {
  console.error('invalid mup.json: ' + message);
  process.exit(1);
}