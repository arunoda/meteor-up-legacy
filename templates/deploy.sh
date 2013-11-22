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

    echo "reverted back to the previous version due to the latest version didn't pick up!" 1>&2
    exit 1
  else
    echo "app didn't pick up! - please check app logs" 1>&2
    exit 1
  fi
}

#wait and check
sleep 5
curl localhost || revert_app