#!/bin/sh

rm -f flt.apk

# set the path to the platform tools
PATH=$PATH:/home/$USER/Android/Sdk/platform-tools

ionic cordova build --release android

# sign the jar file
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore flt-release-key.keystore android-release-unsigned.apk alias_name

# run zipalignment
/home/$USER/Android/Sdk/build-tools/26.0.0/zipalign -v 4 android-release-unsigned.apk flt.apk
