# WeaveJS
Web-based Analysis and Visualization Environment for HTML5

#Status of this fork
This is a fork of [WeaveTeam/WeaveJS](https://github.com/WeaveTeam/WeaveJS), whose development stopped in 2016. In 2026 it was revived just enough to build again with a reproducible toolchain. **That work has not been extensively tested.** Treat this as software archaeology, not a maintained product.

What has been verified:

* The full build (`scripts/bootstrap.sh`, then `./build-release-package.sh`) completes on Fedora Linux x86_64.
* In headless Chrome 154, the splash screen loads, and the `test-nba.weave` and `test-us-20m.weave` sample sessions render their maps, charts, legends and tables.

What has not been verified:

* The other sample sessions, editing and exporting, and most of the UI beyond initial rendering.
* Anything served by the Java backend (`WeaveServices.war`). It builds, but it has not been deployed. Panels backed by its data stay empty without it.
* Browsers other than Chrome.

Known caveats:

* The toolchain is from 2016 and is only used for building: JDK 7, Node 6, TypeScript 1.8, the Adobe Flex 4.5.1 SDK and FlexJS 0.6.0. Java 7 and Node 6 are long past end of life.
* npm dependencies are pinned to their September 2016 versions to keep them compatible with React 0.14. They have not been audited and are likely to have known vulnerabilities, so don't expose this to untrusted data or users.
* `scripts/bootstrap.sh` only supports Linux x86_64. It depends on download URLs from Adobe, Apache, Azul, Google and Maven Central, which may disappear. Each download is checked against a pinned SHA-256.
* The FlexJS compiler builds against Flash Player 32's `playerglobal.swc` in place of version 21, which Adobe no longer hosts.
* At runtime the app fetches fonts from Google Fonts and map tiles from OpenStreetMap.
* The browser console shows `<rect> attribute height: Expected length, "NaN"` errors when some charts render. These haven't been investigated.
* The contribution and CLA process below refers to the original WeaveTeam project.

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
