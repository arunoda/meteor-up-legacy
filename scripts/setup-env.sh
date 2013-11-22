#!/bin/bash

sudo mkdir -p /opt/meteor/
sudo mkdir -p /opt/meteor/config
sudo mkdir -p /opt/meteor/tmp

sudo chown $USER /opt/meteor/config
sudo chown $USER /opt/meteor/tmp

sudo npm install -g forever userdown

##creating a non-privileged user
sudo useradd meteoruser || :
