# WeaveJS [![Build Status](https://travis-ci.org/WeaveTeam/WeaveJS.svg?branch=develop)](https://travis-ci.org/WeaveTeam/WeaveJS)
Web-based Analysis and Visualization Environment for HTML5

#License
MPL-2.0

#Contributing
If you would like to contribute to Weave, you will first need to contact us at cla@iweave.com and sign a Contributor License Agreement.

#Building
The Flash client and Java services (Weave) are included as the `Weave` git submodule.

```
git clone --recurse-submodules https://github.com/ekovac/WeaveJS.git
cd WeaveJS
./scripts/bootstrap.sh     # once: installs JDK 7, Ant, Flex 4.5.1, Node 6 and FlexJS into .toolchain/, then runs npm install
. .toolchain/env.sh        # in each shell (fish: source .toolchain/env.fish)
```

* `npm run compile-libs && npm run compile` builds WeaveJS into `dist/`.
* `npm run compile-weave` builds the Weave submodule (`ant dist`).
* `./build-release-package.sh` does all of the above and packages `weave-release-<date>.zip`.

`scripts/bootstrap.sh` only supports Linux x86_64. Set `WEAVE_TOOLCHAIN` to install the toolchain somewhere other than `.toolchain/`.

#Developer notes
* To debug Open Layers, use the following in node_modules/openlayers/package.json:  "browser": "dist/ol-debug.js",
