#!/bin/sh

git pull
chown -R www-data:www-data *
chown root:root .git update.sh
