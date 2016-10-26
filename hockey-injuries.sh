#!/bin/bash

# cd to current script location, regardless
# of where script was invoked.
parent_path=$( cd "$(dirname "${BASH_SOURCE}")"; pwd -P )
cd "$parent_path"

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H-%M)

FOLDER=./download/${DATE}
FILE=${FOLDER}/injuries-${TIME}.html

mkdir -p $FOLDER

wget http://www.rotoworld.com/teams/injuries/nhl/all/ -O $FILE

# This is so crontab -e can log output to file
echo $(time /home/homeski/.nvm/versions/node/v6.2.2/bin/node ./hockey-injuries.js $FILE $1 $2)
