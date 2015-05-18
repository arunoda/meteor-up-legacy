#!/bin/bash

sudo mkdir -p /opt/<%= appName %>/
sudo mkdir -p /opt/<%= appName %>/config
sudo mkdir -p /opt/<%= appName %>/tmp
sudo mkdir -p /opt/mongodb

sudo chown ${USER} /opt/<%= appName %> -R
sudo chown ${USER} /opt/mongodb -R

sudo usermod -a -G docker ${USER}