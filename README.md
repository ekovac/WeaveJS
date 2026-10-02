# WeaveJS [![Build Status](https://travis-ci.org/WeaveTeam/WeaveJS.svg?branch=develop)](https://travis-ci.org/WeaveTeam/WeaveJS)
Web-based Analysis and Visualization Environment for HTML5

#License
MPL-2.0

#Contributing
If you would like to contribute to Weave, you will first need to contact us at cla@iweave.com and sign a Contributor License Agreement.

#Building
The Flash client and Java services (Weave) are included as the `Weave` git submodule. Clone with `git clone --recurse-submodules`, or run `git submodule update --init` in an existing checkout.

* `npm run compile-libs && npm run compile` builds WeaveJS into `dist/`.
* `npm run compile-weave` builds the Weave submodule (`ant dist`; requires FLEX_HOME set to the Flex 4.5.1 SDK and Java 7).
* `./build-release-package.sh` does all of the above and packages `weave-release-<date>.zip`.

#Developer notes
* To debug Open Layers, use the following in node_modules/openlayers/package.json:  "browser": "dist/ol-debug.js",
