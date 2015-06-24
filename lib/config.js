var cjson = require('cjson');
var path = require('path');
var fs = require('fs');
var helpers = require('./helpers');
var format = require('util').format;
require('colors');

exports.read = function(configFileName) {
  var mupJsonPath = path.resolve(configFileName);
  // path of the mup.json file is the basedir and everything
  // will be based on that path
  var basedir = path.dirname(mupJsonPath);

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
    if(typeof mupJson.appName === "undefined") {
      mupJson.appName = "meteor";
    }

    if(typeof mupJson.enableUploadProgressBar === "undefined") {
      mupJson.enableUploadProgressBar = true;
    }

    //validating servers
    if(!mupJson.servers || mupJson.servers.length == 0) {
      mupErrorLog('Server information does not exist');
    } else {
      mupJson.servers.forEach(function(server) {
        var sshAgentExists = false;
        var sshAgent = process.env.SSH_AUTH_SOCK;
        if(sshAgent) {
          sshAgentExists = fs.existsSync(sshAgent);
          server.sshOptions = server.sshOptions || {};
          server.sshOptions.agent = sshAgent;
        }

        if(!server.host) {
          mupErrorLog('Server host does not exist');
        } else if(!server.username) {
          mupErrorLog('Server username does not exist');
        } else if(!server.password && !server.pem && !sshAgentExists) {
          mupErrorLog('Server password, pem or a ssh agent does not exist');
        } else if(!mupJson.app) {
          mupErrorLog('Path to app does not exist');
        }

        server.os = server.os || "linux";

        if(server.pem) {
          server.pem =
            rewritePath(server.pem, "SSH private key file is invalid");
        }

        server.env = server.env || {};

        var defaultEndpointUrl =
          format("http://%s:%s", server.host, mupJson.env['PORT']);
        server.env['CLUSTER_ENDPOINT_URL'] =
          server.env['CLUSTER_ENDPOINT_URL'] || defaultEndpointUrl;
      });
    }

    //rewrite ~ with $HOME
    mupJson.app = rewritePath(
      mupJson.app, "There is no meteor app in the current app path.");

    if(mupJson.ssl) {
      mupJson.ssl.port = mupJson.ssl.port || 443;
      mupJson.ssl.certificate = rewritePath(
        mupJson.ssl.certificate, "SSL certificate file does not exists.");
      mupJson.ssl.key = rewritePath(
        mupJson.ssl.key, "SSL key file does not exists.");
    }

    // additional build options
    mupJson.buildOptions = mupJson.buildOptions || {};

    return mupJson;
  } else {
      var message =
        'configuration file ' + configFileName + ' does not exist!'.red.bold;
    console.error(message);
    helpers.printHelp();
    process.exit(1);
  }
  
  function rewritePath(location, errorMessage) {
    if(!location) {
      return mupErrorLog(errorMessage);
    }
    
    var homeLocation = process.env.HOME;
    if(/^win/.test(process.platform)) {
      homeLocation = process.env.USERPROFILE;
    }

    var location = location.replace('~', homeLocation).trim();
    if(location.indexOf(0) !== "/" || location.indexOf(0) !== "\\") {
      // if path does not start with / or \ (on windows)
      // we need to make sure, they are from the basedir
      // but not from the current dir
      location = path.resolve(basedir, location);
    } else {
      // anyway, we need to resolve path for windows compatibility
      location = path.resolve(location);
    }
    if(!fs.existsSync(location)) {
      mupErrorLog(errorMessage);
    }

    return location;
  }

  function mupErrorLog(message) {
    var errorMessage = 'Invalid configuration file ' + configFileName + ': ' + message;
    console.error(errorMessage.red.bold);
    process.exit(1);
  }
};