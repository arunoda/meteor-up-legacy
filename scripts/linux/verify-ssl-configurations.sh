APPNAME=<%= appName %>
DUMMY_SERVER_NAME=$APPNAME-dummy-http-server-for-ssl-check

docker run \
  -d \
  --name $DUMMY_SERVER_NAME \
  --expose=80 \
  debian /bin/bash -c "while [[ true ]]; do sleep 1; done"

sleep 3

set -e

docker run \
  --rm \
  --link=$DUMMY_SERVER_NAME:backend \
  --volume=/opt/$APPNAME/config/bundle.crt:/bundle.crt \
  --volume=/opt/$APPNAME/config/private.key:/private.key \
  meteorhacks/mup-frontend-server /verify.sh

docker rm -f $DUMMY_SERVER_NAME