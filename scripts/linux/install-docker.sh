#!/bin/bash

# Is docker already installed?
set +e
haveDocker=$(docker version | grep "version")
set -e

if [ ! "$haveDocker" ]; then

  # Remove the lock
  set +e
  sudo rm /var/lib/dpkg/lock > /dev/null
  sudo rm /var/cache/apt/archives/lock > /dev/null
  sudo dpkg --configure -a
  set -e

  # Required to update system
  sudo apt-get update

  # Install docker
  wget -qO- https://get.docker.com/ | sudo sh
fi
