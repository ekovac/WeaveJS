#!/bin/bash
# Downloads and installs everything needed to build WeaveJS and the Weave submodule into
# .toolchain/ (or $WEAVE_TOOLCHAIN), then installs npm dependencies.
#
#   JDK 7 (Zulu)          Flex 4.5.1 and the FlexJS compiler need Java 7.
#   Apache Ant 1.9        Builds the Weave submodule.
#   Adobe Flex SDK 4.5.1  Compiles the Flash client in the Weave submodule.
#   Node.js 6             Runs this project's npm build (TypeScript 1.8, Babel 6, browserify 12).
#   FlexJS 0.6.0          Compiles WeaveASJS to JavaScript (FlexJS SDK + FalconJX compiler).
#
# Afterwards, load the environment with `. .toolchain/env.sh` (or `source .toolchain/env.fish`).
# Re-running is cheap: downloads are cached and verified against the SHA-256 sums below.
#
# The Flex SDK and playerglobal.swc are covered by the Adobe Flex SDK License Agreement.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLCHAIN="${WEAVE_TOOLCHAIN:-$REPO/.toolchain}"
DL="$TOOLCHAIN/dl"

if [ "$(uname -s)-$(uname -m)" != "Linux-x86_64" ]; then
	echo "bootstrap.sh only knows how to fetch Linux x86_64 binaries (JDK 7, Node 6)." >&2
	exit 1
fi
for cmd in curl tar unzip sha256sum; do
	command -v $cmd > /dev/null || { echo "bootstrap.sh needs '$cmd'." >&2; exit 1; }
done

mkdir -p "$DL"

# fetch <sha256> <url> [filename]: download into $DL unless a verified copy is already there.
fetch() {
	local sha="$1" url="$2" file="$DL/${3:-$(basename "$2")}"
	if [ -f "$file" ] && echo "$sha  $file" | sha256sum --check --status; then
		return
	fi
	echo "Downloading $url"
	curl -fL --retry 3 --progress-bar -o "$file.part" "$url"
	if ! echo "$sha  $file.part" | sha256sum --check --status; then
		echo "Checksum mismatch for $url" >&2
		rm -f "$file.part"
		exit 1
	fi
	mv "$file.part" "$file"
}

# install_tarball <dir> <archive>: unpack an archive with one top-level directory into <dir>.
install_tarball() {
	local dir="$TOOLCHAIN/$1"
	[ -d "$dir" ] && return
	mkdir -p "$dir.part"
	tar xf "$DL/$2" -C "$dir.part" --strip-components=1
	mv "$dir.part" "$dir"
}

MAVEN=https://repo1.maven.org/maven2

fetch 8a7387c1ed151474301b6553c6046f865dc6c1e1890bcf106acc2780c55727c8 https://cdn.azul.com/zulu/bin/zulu7.56.0.11-ca-jdk7.0.352-linux_x64.tar.gz
fetch 7db54556acf6d5654bf3e2882e3ff45220dea689160ac2e5964ac94635843df8 https://archive.apache.org/dist/ant/binaries/apache-ant-1.9.16-bin.tar.gz
fetch 4d4a7c444597f04d520f6323fadc154d4f3ab499cffdfc788af4ff5bc7649d33 https://fpdownload.adobe.com/pub/flex/sdk/builds/flex4.5/flex_sdk_4.5.1.21328A.zip
fetch 0f88dacefc4be4709e0a9f9fe685efdfe1582a724d8f42614179c2f604c36165 https://nodejs.org/dist/v6.17.1/node-v6.17.1-linux-x64.tar.xz
fetch c658ea360a70faeeadb66fb3c90a702e4142a0ab7768f9ae9828678e0d9ad4dc $MAVEN/javax/servlet/servlet-api/2.5/servlet-api-2.5.jar
fetch 59721f0805e223d84b90677887d9ff567dc534d7c502ca903c0c2b17f05c116a $MAVEN/junit/junit/4.12/junit-4.12.jar

# FlexJS SDK, the FalconJX compiler and its dependencies. This is what the `flexjs` npm
# package's interactive installer used to assemble; several of its download URLs are dead.
fetch e4c6d4c758379c9c9fc2508f68812ff6f6cc921528c62fc37441a41ec6f65eca https://archive.apache.org/dist/flex/flexjs/0.6.0/binaries/apache-flex-flexjs-0.6.0-bin.zip
fetch 7e36cfab55c49b00f2cec9f71a526ed0ebd06bf8c769a2d542b1b169ca1c3dfb https://archive.apache.org/dist/flex/falcon/0.6.0/binaries/apache-flex-falconjx-0.6.0-bin.zip
fetch 26ca659f47d77384f518cf2b6463892fcd4f0b0d4d8c0de2addf697e63e7326b $MAVEN/org/antlr/antlr-complete/3.5.2/antlr-complete-3.5.2.jar
fetch e7cd8951956d349b568b7ccfd4f5b2529a8c113e67c32b028f52ffda371259d9 $MAVEN/commons-cli/commons-cli/1.2/commons-cli-1.2.jar
fetch cc6a41dc3eaacc9e440a6bd0d2890b20d36b4ee408fe2d67122f328bb6e01581 $MAVEN/commons-io/commons-io/2.4/commons-io-2.4.jar
fetch 8c36a80ea613d0b6b8040a17cf837c5bbe3677bc1b06a058a6c174fdb787ebbc $MAVEN/com/google/guava/guava/17.0/guava-17.0.jar
fetch 82e9e068c08b5a70fb0630a2cc41a306b37741ccd7ccd2e803fe3a6a481a85bd $MAVEN/net/sourceforge/jburg/jburg/1.10.2/jburg-1.10.2.jar
fetch ca3254be580773457758478977ea613587b7ddc026759131f8c63e61146492e7 $MAVEN/de/jflex/jflex/1.6.0/jflex-1.6.0.jar
fetch 6da258d8fecc5359a95922b236166d903146f589e3c806856124008c78596d55 $MAVEN/org/b1/pack/lzma-sdk-4j/9.22.0/lzma-sdk-4j-9.22.0.jar
fetch e4ef526a760672bfa6f8fa52e532a6197bca425040e895cf48f01191b65d57d8 $MAVEN/org/apache/flex/flex-tool-api/1.0.0/flex-tool-api-1.0.0.jar
fetch 11b029a602e787e2bc08eb3b77eda1a4f5e8b263d22e3c5d6220cd5c51f30b18 $MAVEN/args4j/args4j/2.0.28/args4j-2.0.28.jar
fetch c6cebacc6e92eef8307909ab1c6d4145a3cc16e1a11737ef10da4cd98dd0ffbf $MAVEN/org/codeartisans/org.json/20131017/org.json-20131017.jar
fetch 8e59c1996b8b114c60570f47f36168f111152f4ca9029562e971c987b2aee23a https://dl.google.com/closure-compiler/compiler-20150609.zip
fetch a59a641526ae211f4c9b1f71758cf0badad8387a6bf2f9ddff2a1ea1ecd4e7fc https://github.com/swfobject/swfobject/archive/2.2.zip swfobject-2.2.zip
# FlexJS compiles against playerglobal.swc from Flash Player 11+ (WeaveASJS uses the JSON
# class). Adobe no longer hosts 21.0, which FlexJS 0.6.0 expected; 32.0 is a superset.
fetch 7d4d6168d27603cfb3b750302448e354e0bbc1bdd58f5d101c3dcf6891e9bb65 https://fpdownload.macromedia.com/get/flashplayer/updaters/32/playerglobal32_0.swc

install_tarball jdk7 zulu7.56.0.11-ca-jdk7.0.352-linux_x64.tar.gz
install_tarball ant apache-ant-1.9.16-bin.tar.gz
install_tarball node6 node-v6.17.1-linux-x64.tar.xz

if [ ! -d "$TOOLCHAIN/flex" ]; then
	mkdir -p "$TOOLCHAIN/flex.part"
	unzip -q "$DL/flex_sdk_4.5.1.21328A.zip" -d "$TOOLCHAIN/flex.part"
	mv "$TOOLCHAIN/flex.part" "$TOOLCHAIN/flex"
fi

mkdir -p "$TOOLCHAIN/javalibs"
cp "$DL/servlet-api-2.5.jar" "$TOOLCHAIN/javalibs/servlet-api-2.5.jar"
cp "$DL/junit-4.12.jar" "$TOOLCHAIN/javalibs/junit4.jar"

if [ ! -d "$TOOLCHAIN/flexjs" ]; then
	FLEXJS="$TOOLCHAIN/flexjs.part"
	rm -rf "$FLEXJS"
	mkdir -p "$FLEXJS"
	unzip -q "$DL/apache-flex-flexjs-0.6.0-bin.zip" -d "$FLEXJS"

	# FalconJX is merged into the FlexJS SDK the same way the flexjs npm installer did it.
	FALCON="$FLEXJS/falcon.tmp"
	unzip -q "$DL/apache-flex-falconjx-0.6.0-bin.zip" -d "$FALCON"
	mkdir -p "$FLEXJS"/{bin,lib/external,js/bin,js/lib/google/closure-compiler,js/libs,externs,templates/swfobject}
	cp -R "$FALCON/compiler/generated/dist/sdk/bin/." "$FLEXJS/bin/"
	cp -R "$FALCON/compiler/generated/dist/sdk/lib/." "$FLEXJS/lib/"
	cp -R "$FALCON/js/lib/." "$FLEXJS/js/lib/"
	cp -R "$FALCON/js/libs/." "$FLEXJS/js/libs/"
	cp -R "$FALCON/externs/." "$FLEXJS/externs/"
	rm -rf "$FALCON"

	cp "$DL/antlr-complete-3.5.2.jar"  "$FLEXJS/lib/external/antlr.jar"
	cp "$DL/commons-cli-1.2.jar"       "$FLEXJS/lib/external/commons-cli.jar"
	cp "$DL/commons-io-2.4.jar"        "$FLEXJS/lib/external/commons-io.jar"
	cp "$DL/guava-17.0.jar"            "$FLEXJS/lib/external/guava.jar"
	cp "$DL/jburg-1.10.2.jar"          "$FLEXJS/lib/external/jburg.jar"
	cp "$DL/jflex-1.6.0.jar"           "$FLEXJS/lib/external/jflex.jar"
	cp "$DL/lzma-sdk-4j-9.22.0.jar"    "$FLEXJS/lib/external/lzma-sdk.jar"
	cp "$DL/flex-tool-api-1.0.0.jar"   "$FLEXJS/lib/external/flex-tool-api.jar"
	cp "$DL/args4j-2.0.28.jar"         "$FLEXJS/js/lib/args4j.jar"
	cp "$DL/commons-io-2.4.jar"        "$FLEXJS/js/lib/commons-io.jar"
	cp "$DL/guava-17.0.jar"            "$FLEXJS/js/lib/guava.jar"
	cp "$DL/org.json-20131017.jar"     "$FLEXJS/js/lib/org.json.jar"
	cp "$DL/flex-tool-api-1.0.0.jar"   "$FLEXJS/js/lib/flex-tool-api.jar"
	unzip -q -o -j "$DL/compiler-20150609.zip" compiler.jar -d "$FLEXJS/js/lib/google/closure-compiler"
	unzip -q -o -j "$DL/swfobject-2.2.zip" swfobject-2.2/swfobject/expressInstall.swf swfobject-2.2/swfobject/swfobject.js -d "$FLEXJS/templates/swfobject"

	sed -e 's/@playerversion@/21.0/g' -e 's/@swfversion@/32/g' -e 's|{playerglobalHome}|libs/player|g' \
		"$FLEXJS/frameworks/flex-config-template.xml" > "$FLEXJS/frameworks/flex-config.xml"
	sed -e 's/@playerversion@/21.0/g' -e 's/@swfversion@/32/g' -e 's|{airHome}/frameworks/libs|libs|g' \
		"$FLEXJS/frameworks/air-config-template.xml" > "$FLEXJS/frameworks/air-config.xml"
	mkdir -p "$FLEXJS/frameworks/libs/player/21.0"
	cp "$DL/playerglobal32_0.swc" "$FLEXJS/frameworks/libs/player/21.0/playerglobal.swc"

	chmod a+x "$FLEXJS"/bin/* "$FLEXJS"/js/bin/*
	mv "$FLEXJS" "$TOOLCHAIN/flexjs"
fi

# -XX:MaxPermSize: compiling all of Weave in one Ant JVM exhausts Java 7's default PermGen.
# -DJAVA_LIBS: where Weave's Java projects find servlet-api-2.5.jar and junit4.jar.
cat > "$TOOLCHAIN/env.sh" <<EOF
# Generated by scripts/bootstrap.sh. Load with: . $TOOLCHAIN/env.sh
export JAVA_HOME="$TOOLCHAIN/jdk7"
export ANT_HOME="$TOOLCHAIN/ant"
export FLEX_HOME="$TOOLCHAIN/flex"
export FLEXJS_HOME="$TOOLCHAIN/flexjs"
export ANT_OPTS="-XX:MaxPermSize=1024m -Xms256M -Xmx2G -DJAVA_LIBS=$TOOLCHAIN/javalibs"
export PATH="$TOOLCHAIN/jdk7/bin:$TOOLCHAIN/ant/bin:$TOOLCHAIN/node6/bin:\$PATH"
EOF
cat > "$TOOLCHAIN/env.fish" <<EOF
# Generated by scripts/bootstrap.sh. Load with: source $TOOLCHAIN/env.fish
set -gx JAVA_HOME "$TOOLCHAIN/jdk7"
set -gx ANT_HOME "$TOOLCHAIN/ant"
set -gx FLEX_HOME "$TOOLCHAIN/flex"
set -gx FLEXJS_HOME "$TOOLCHAIN/flexjs"
set -gx ANT_OPTS "-XX:MaxPermSize=1024m -Xms256M -Xmx2G -DJAVA_LIBS=$TOOLCHAIN/javalibs"
fish_add_path --global --move --path "$TOOLCHAIN/jdk7/bin" "$TOOLCHAIN/ant/bin" "$TOOLCHAIN/node6/bin"
EOF

. "$TOOLCHAIN/env.sh"
cd "$REPO"
git submodule update --init Weave
npm install

echo
echo "Toolchain ready in $TOOLCHAIN."
echo "Load it with '. $TOOLCHAIN/env.sh' (bash/zsh) or 'source $TOOLCHAIN/env.fish' (fish)."
