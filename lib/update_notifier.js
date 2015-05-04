var updateNotifier = require('update-notifier');
var pkg = require('../package.json');
 
var notifier = updateNotifier({
  pkg: pkg,
  updateCheckInterval: 1000 * 60 * 60 * 6 // 6 hours
});
notifier.notify();