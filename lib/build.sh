setTemporaryPlatforms() {
  cp ./.meteor/platforms ./.meteor/platforms-copy
  echo server$'\n'browser > ./.meteor/platforms
}

setOriginalPlatforms() {
  mv ./.meteor/platforms-copy ./.meteor/platforms
}

buildMeteorApp() {
  meteor build --directory $BUILD_LOCATION
}

if [ -f ./.meteor/platforms ]; then 
  # build for 0.9.4+
  # remove mobile platforms while building

  setTemporaryPlatforms
  buildMeteorApp
  status=$?
  if [ $status -ne 0 ]; then
    setOriginalPlatforms
    exit $status
  else
    setOriginalPlatforms
  fi
else
  # build for 0.9.3
  buildMeteorApp
fi

cd $BUILD_LOCATION
tar czf bundle.tar.gz bundle