#!/bin/bash
# Builds weave-release-<date>.zip: the Flash client and WeaveServices.war from the Weave
# submodule, plus WeaveJS (ROOT/weavejs) and the compiled WeaveASJS core (ROOT/weavejs-core).
#
# Requirements:
#   - The FlexJS 0.6.0 SDK and FalconJX compiler installed in node_modules/flexjs, for WeaveJS.
#   - FLEX_HOME pointing at the Flex 4.5.1 SDK, with ant running on Java 7, for Weave.
set -e
cd "$(dirname "$0")"

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
