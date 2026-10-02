const execFileSync = require('child_process').execFileSync;
const path = require('path');

// FlexJS 0.6.0 SDK with the FalconJX compiler merged in, as installed by scripts/bootstrap.sh.
const sdk = process.env.FLEXJS_HOME || path.join(__dirname, '..', '.toolchain', 'flexjs');
const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : 'java';

// Same invocation as the flexjs npm package's mxmlcnpm wrapper. FLEX_HOME is not passed on:
// it points at the Flex 4.5.1 SDK used by the Weave submodule, not at FlexJS.
const args = [
	'-Xmx384m', '-Dsun.io.useCanonCaches=false',
	`-Dflexcompiler=${sdk}`, `-Dflexlib=${sdk}/frameworks`,
	'-jar', `${sdk}/js/lib/mxmlc.jar`,
	`+flexlib=${sdk}/frameworks`, '-js-output-type=FLEXJS', `-sdk-js-lib=${sdk}/frameworks/js/FlexJS/src`,
	'-remove-circulars', '-js-compiler-option=--compilation_level WHITESPACE_ONLY',
	'-fb', __dirname
];
console.log([java].concat(args).join(' '));
execFileSync(java, args, {stdio: "inherit"});
