#!/bin/bash
# Builds weave-release-<date>.zip: the Flash client and WeaveServices.war from the Weave
# submodule, plus WeaveJS (ROOT/weavejs) and the compiled WeaveASJS core (ROOT/weavejs-core).
#
# Run scripts/bootstrap.sh first to install the toolchain.
set -e
cd "$(dirname "$0")"
. "${WEAVE_TOOLCHAIN:-.toolchain}/env.sh"

git submodule update --init Weave

rm -Rf dist/
npm run compile-libs
npm run compile
npm run compile-weave

rm -Rf tmp/
mkdir -p tmp
pushd tmp
cp ../Weave/weave.zip .
mkdir ROOT
cp -R ../dist/ ROOT/weavejs/
cp -R ../WeaveASJS/bin/ ROOT/weavejs-core
rm -Rf ROOT/weavejs-core/js-debug
zip -r weave.zip ROOT
cp ../LICENSES.md .
zip weave.zip LICENSES.md
mv weave.zip ../weave-release-`date +%Y%m%d`.zip
popd
rm -Rf tmp/
