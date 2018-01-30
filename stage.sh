#!/bin/bash
VERSION=$(date +%Y.%m.%d.%H.%M)

echo "staging $VERSION"
echo "$VERSION" >version

if [ "$COMPONENTNAME" = "" ]; then exit 1; fi

git clone git@github.com:Rise-Vision/private-keys.git
gcloud auth activate-service-account 452091732215@developer.gserviceaccount.com --key-file ./private-keys/storage-server/rva-media-library-ce0d2bd78b54.json
gsutil cp build/* gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION/
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION/*
gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION/*
curl -f -v 216.21.167.45:7790/sign/components/$COMPONENTNAME/$VERSION
