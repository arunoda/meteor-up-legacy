var cjson = require('cjson');
var path = require('path');
var fs = require('fs');
var helpers = require('./helpers');
var format = require('util').format;

require('colors');

exports.read = function() {
  var mupJsonPath = path.resolve('mup.json');
  if(fs.existsSync(mupJsonPath)) {
    var mupJson = cjson.load(mupJsonPath);

    //initialize options
    mupJson.env = mupJson.env || {};
    mupJson.env['PORT'] = mupJson.env['PORT'] || 80;

    if(typeof mupJson.setupNode === "undefined") {
      mupJson.setupNode = true;
    }
    if(typeof mupJson.setupPhantom === "undefined") {
      mupJson.setupPhantom = true;
    }
    mupJson.meteorBinary = (mupJson.meteorBinary) ? getCanonicalPath(mupJson.meteorBinary) : 'meteor';
    if(typeof mupJson.appName === "undefined") {
      mupJson.appName = "meteor";
    }
    
    if(typeof mupJson.uploadProgressBar === "undefined") {
      mupJson.uploadProgressBar = true;
    }

    //validating servers
    if(!mupJson.servers || mupJson.servers.length == 0) {
      mupErrorLog('Server information does not exist');
    } else {
      mupJson.servers.forEach(function(server) {
        if(!server.host) {
          mupErrorLog('Server host does not exist');
        } else if(!server.username) {
          mupErrorLog('Server username does not exist');
        } else if(!server.password && !server.pem) {
          mupErrorLog('Server password or pem does not exist');
        } else if(!mupJson.app) {
          mupErrorLog('Path to app does not exist');
        }

        server.os = server.os || "linux";

        if(server.pem) {
          server.pem = 
            rewriteHome(server.pem, "SSH private key file is invalid");
        } else {
          //hint mup bin script to check whether sshpass installed or not
          mupJson._passwordExists = true;
        }

        server.env = server.env || {};

        var defaultEndpointUrl =
          format("http://%s:%s", server.host, mupJson.env['PORT']);
        server.env['CLUSTER_ENDPOINT_URL'] =
          server.env['CLUSTER_ENDPOINT_URL'] || defaultEndpointUrl;
      });
    }

    //rewrite ~ with $HOME
    mupJson.app = rewriteHome(
      mupJson.app, "There is no meteor app in the current app path.");

    if(mupJson.ssl) {
      mupJson.ssl.port = mupJson.ssl.port || 443;
      mupJson.ssl.certificate = rewriteHome(
        mupJson.ssl.certificate, "SSL certificate file does not exists.");
      mupJson.ssl.key = rewriteHome(
        mupJson.ssl.key, "SSL key file does not exists.");
    }

    // additional build options
    mupJson.buildOptions = mupJson.buildOptions || {};

    return mupJson;
  } else {
    console.error('mup.json file does not exist!'.red.bold);
    helpers.printHelp();
    process.exit(1);
  }
};

function rewriteHome(location, errorMessage) {
  if(!location) {
    return mupErrorLog(errorMessage);
  }

  var location = location.replace('~', process.env.HOME);
  location = path.resolve(location);

  if(!fs.existsSync(location)) {
    mupErrorLog(errorMessage);
  }

  return location;
}

function mupErrorLog(message) {
  var errorMessage = 'Invalid mup.json file: ' + message;
  console.error(errorMessage.red.bold);
  process.exit(1);
}

function getCanonicalPath(location) {
  var localDir = path.resolve(__dirname, location);
  if(fs.existsSync(localDir)) {
    return localDir;
  } else {
    return path.resolve(rewriteHome(location));
  }
}
