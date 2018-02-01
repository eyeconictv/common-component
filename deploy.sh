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
echo "deploying to install-versions.risevision.com/$OUTPUTDIR"

git clone git@github.com:Rise-Vision/private-keys.git
gcloud auth activate-service-account 452091732215@developer.gserviceaccount.com --key-file ./private-keys/storage-server/rva-media-library-ce0d2bd78b54.json
find manifests -name "*.json" -exec node ./common-component/update-component-version.js '{}' $COMPONENTNAME $VERSION 0 \;

gsutil -m cp manifests/*.json gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION/*
gsutil setmeta -h "Content-Disposition:attachment" gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION/*.sh
gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION/*
gsutil -m cp -p gs://install-versions.risevision.com/${OUTPUTDIR}*.{sh,exe,json} gs://install-versions.risevision.com/backups/$VERSION
gsutil -m cp -p gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION/* gs://install-versions.risevision.com/releases/components/$COMPONENTNAME/$VERSION
gsutil -m cp -p gs://install-versions.risevision.com/staging/components/$COMPONENTNAME/$VERSION/* gs://install-versions.risevision.com/$OUTPUTDIR

if [ "$BRANCH" = "STABLE" ]
then
  echo -n "RisePlayerElectron $VERSION" > latest-version
  gsutil cp latest-version gs://install-versions.risevision.com
  gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/latest-version
  gsutil setmeta -h "Content-Type:text/plain" gs://install-versions.risevision.com/latest-version
  gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/latest-version
fi
