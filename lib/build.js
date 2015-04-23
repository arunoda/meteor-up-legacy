var spawn = require('child_process').spawn;
var archiver = require('archiver');
var fs = require('fs');
var pathResolve = require('path').resolve;
var _ = require('underscore');

function buildApp(buildLocaltion, callback) {
  var meteor = spawn("meteor", ["build", "--directory", buildLocaltion]);
  var stdout = "";
  var stderr = "";

  meteor.stdout.pipe(process.stdout, {end: false});
  meteor.stderr.pipe(process.stderr, {end: false});

  meteor.on('close', function(code) {
    if(code == 0) {
      archiveIt(buildLocaltion, callback);
    } else {
      console.log("\n=> Build Error");
      callback(new Error("build-error"));
    }
  });
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