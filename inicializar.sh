#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

docker compose up -d --build

cd frontend
[ -d node_modules ] || npm install
npm start
