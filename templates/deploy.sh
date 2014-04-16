#!/bin/bash
set -e

cd /opt/meteor/tmp
sudo rm -rf bundle
sudo tar xvzf bundle.tar.gz > /dev/null
cd bundle/programs/server
sudo npm install fibers

cd /opt/meteor/

# remove old app, if exists
if [ -d old_app ]; then
  sudo rm -rf old_app
fi

## backup current version
if [[ -d app ]]; then
  sudo mv app old_app
fi 

sudo mv tmp/bundle app

# restart app
sudo stop meteor || :
sudo start meteor || :

revert_app (){
  if [[ -d old_app ]]; then
    sudo rm -rf app
    sudo mv old_app app
    sudo stop meteor || :
    sudo start meteor || :

    echo "Latest deployment failed! Reverted back to the previous version." 1>&2
    exit 1
  else
    echo "Ppp did not pick up! Please check app logs." 1>&2
    exit 1
  fi
}

#wait and check
echo "Waiting for MongoDB to initialize. (5 minutes)"
. /opt/meteor/config/env.sh
wait-for-mongo $MONGO_URL 300000

echo "Waiting for <%= deployCheckWaitTime %> seconds while app is booting up"
sleep <%= deployCheckWaitTime %>

echo "Checking is app booted or not?"
curl localhost:$PORT || revert_app
