CURR_DIR=$(pwd)

setTemporaryPlatforms() {
  cp ./.meteor/platforms ./.meteor/platforms-copy
  echo server$'\n'browser$'\n'firefoxos > ./.meteor/platforms
}

setOriginalPlatforms() {
  cd $CURR_DIR
  mv ./.meteor/platforms-copy ./.meteor/platforms
}

buildMeteorApp() {
  meteor build --directory $BUILD_LOCATION
}

buildMeteorAppForCordova() {
  # when building for cordova, we are using firefoxos
  # and it does not need ios and android deps to build web.cordova
  # so it's possible to build for the server bundle inside a build box as well

  setTemporaryPlatforms
  trap setOriginalPlatforms EXIT
  # we need to give it a dummy --server values to start building
  meteor build --directory $BUILD_LOCATION --server "http://localhost:3000"
}

if [ -f ./.meteor/platforms ]; then 
  # build for 0.9.4+
  # remove mobile platforms while building
  have_cordova=$(cat ./.meteor/platforms | grep 'ios\|android\|firefoxos')
  if [ "$have_cordova" ]; then
    buildMeteorAppForCordova
  else
    buildMeteorApp
  fi
else
  # build for 0.9.3
  buildMeteorApp
fi

cd $BUILD_LOCATION
tar czf bundle.tar.gz bundle