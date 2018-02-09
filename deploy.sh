#!/bin/bash

VERSION=$(cat version)
OUTPUTDIR="beta/"
MANIFESTFILES="display-modules-beta*.json"
ROLLOUTPCT="-"

if [ "$COMPONENTNAME" = "" ]; then exit 1; fi

if [ "$BRANCH" = "STABLE" ]; then OUTPUTDIR=""; fi
if [ "$BRANCH" = "STABLE" ]; then MANIFESTFILES="display-modules-*.json"; fi
if [ "$BRANCH" = "STABLE" ]; then ROLLOUTPCT="0"; fi

echo "deploying $VERSION"
echo "deploying to rise-content/$OUTPUTDIR"

git clone git@github.com:Rise-Vision/private-keys.git
gcloud auth activate-service-account 452091732215@developer.gserviceaccount.com --key-file ./private-keys/storage-server/rva-media-library-ce0d2bd78b54.json
find manifests -name "*.json" -exec node ./common-component/update-component-version.js '{}' $COMPONENTNAME $VERSION 0 \;

gsutil -m cp manifests/*.json gs://rise-content/staging/components/$COMPONENTNAME/$VERSION
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://rise-content/staging/components/$COMPONENTNAME/$VERSION/*
gsutil setmeta -h "Content-Disposition:attachment" gs://rise-content/staging/components/$COMPONENTNAME/$VERSION/*.sh
gsutil acl ch -u AllUsers:R gs://rise-content/staging/components/$COMPONENTNAME/$VERSION/*
gsutil -m cp -p gs://rise-content/${OUTPUTDIR}*.{sh,exe,json} gs://rise-content/backups/$VERSION
gsutil -m cp -p gs://rise-content/staging/components/$COMPONENTNAME/$VERSION/* gs://rise-content/releases/components/$COMPONENTNAME/$VERSION
gsutil -m cp -p gs://rise-content/staging/components/$COMPONENTNAME/$VERSION/* gs://rise-content/$OUTPUTDIR/components/$COMPONENTNAME

if [ "$BRANCH" = "STABLE" ]
then
  gsutil -m cp -p gs://rise-content/staging/components/$COMPONENTNAME/$VERSION/* gs://rise-content/stable/components/$COMPONENTNAME
fi
