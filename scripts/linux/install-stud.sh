#!/bin/bash

#remove the lock
set +e
sudo rm /var/lib/dpkg/lock > /dev/null
sudo rm /var/cache/apt/archives/lock > /dev/null
sudo dpkg --configure -a
set -e

sudo apt-get update -y
sudo apt-get -y install libev4 libev-dev gcc make libssl-dev git
cd /tmp
sudo rm -rf stud
sudo git clone https://github.com/bumptech/stud.git stud
cd stud
sudo make install
cd ..
sudo rm -rf stud

#make sure comet folder exists
sudo mkdir -p /opt/stud

#initial permission
sudo chown -R $USER /etc/init
sudo chown -R $USER /opt/stud

#create non-privileged user
sudo useradd stud || :