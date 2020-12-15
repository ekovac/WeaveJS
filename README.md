# Weave 2
Web-based Analysis and Visualization Environment for HTML5

This is a fork of Weave2 being undertaken by Erica Kovac for hobby purposes. No guarantees of activity or responsiveness.

# Major TODO Items

* Port all AS3 code to TS, remove flex-asjs from build process and get a working build again.
 * Create unit testing for Weave core session framework. There be lots of dragons in the session management core.
* Modernize build process and module structure.

# License
Weave 2 is distributed under the [MPL-2.0](https://www.mozilla.org/en-US/MPL/2.0/) license.

# Developer notes
To debug Open Layers, use the following in _node_modules/openlayers/package.json:  "browser": "dist/ol-debug.js"_,
