#!/bin/sh

# set the path to the platform tools
PATH=$PATH:/home/$USER/Android/Sdk/platform-tools

ionic cordova run android --device
if [ $? -ne 0 ]; then
    echo "failed to run"
    exit 1
fi
