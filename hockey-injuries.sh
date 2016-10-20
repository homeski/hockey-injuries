#!/bin/bash

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H-%M)

FOLDER=./download/${DATE}
FILE=${FOLDER}/injuries-${TIME}.html

mkdir -p $FOLDER

wget http://www.rotoworld.com/teams/injuries/nhl/all/ -O $FILE

node hockey-injuries.js $FILE $1 $2
