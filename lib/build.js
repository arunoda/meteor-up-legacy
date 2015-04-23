var spawn = require('child_process').spawn;
var archiver = require('archiver');
var fs = require('fs');
var pathResolve = require('path').resolve;
var _ = require('underscore');

function buildApp(buildLocaltion, callback) {
  //// check for cordova app and restore them with firefoxos
  // var platformsFilePath = pathResolve('.meteor', 'platforms');
  // var platformsFileContent = fs.readFileSync(platformsFilePath);
  // if(/(ios|android|firefoxos)/.test(platformsFileContent)) {
  //   fs.writeFileSync(platformsFilePath, "server\r\nbrowser\r\nfirefoxos\r\n");
  // }

  // restore platforms file
  var restorePlatformsFile = _.once(function() {
    // fs.writeFileSync(platformsFilePath, platformsFileContent);
  });

  buildMeteorApp(buildLocaltion, function(code) {
    restorePlatformsFile();
    if(code == 0) {
      archiveIt(buildLocaltion, callback);
    } else {
      console.log("\n=> Build Error");
      callback(new Error("build-error"));
    }
  });

  // make sure to restore platforms file
  ['exit', 'SIGINT'].forEach(function(fn) {
    process.once(fn, function() {
      restorePlatformsFile();
    });
  });
}

function buildMeteorApp(buildLocaltion, callback) {
  var args = [
    "build", "--directory", buildLocaltion, 
    "--server", "http://localhost:3000"
  ];
  var meteor = spawn("meteor", args);
  var stdout = "";
  var stderr = "";

  meteor.stdout.pipe(process.stdout, {end: false});
  meteor.stderr.pipe(process.stderr, {end: false});

  meteor.on('close', callback);
}

function archiveIt(buildLocaltion, callback) {
  callback = _.once(callback);
  var bundlePath = pathResolve(buildLocaltion, 'bundle.tar.gz');
  var sourceDir = pathResolve(buildLocaltion, 'bundle');

  var output = fs.createWriteStream(bundlePath);
  var archive = archiver('tar', {
    gzip: true,
    gzipOptions: {
      level: 1
    }
  });

  archive.pipe(output);
  output.once('close', callback);

  archive.once('error', function(err) {
    console.log("=> Archiving failed:", err.message);
    callback(err);
  });

  archive.directory(sourceDir, 'bundle').finalize();
}

module.exports = buildApp;