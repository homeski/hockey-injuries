#!/bin/bash

verbose=0

if [[ $1 == '-v' ]]; then
  verbose=1
fi

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H-%M)

if [ $verbose == 1 ]; then echo $DATE; fi
if [ $verbose == 1 ]; then echo $TIME; fi

FOLDER=./download/${DATE}
FILE=${FOLDER}/injuries-${TIME}.html

mkdir -p $FOLDER

wget http://www.rotoworld.com/teams/injuries/nhl/all/ -O $FILE

node hockey-injuries.js $FILE
