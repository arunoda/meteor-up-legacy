#!/bin/bash

sudo mkdir -p /opt/meteor/
sudo mkdir -p /opt/meteor/config
sudo mkdir -p /opt/meteor/tmp

sudo chown $USER /opt/meteor -R
sudo chown $USER /etc/init
sudo chown $USER /etc/

sudo npm install -g forever userdown wait-for-mongo

##creating a non-privileged user
sudo useradd meteoruser || :
