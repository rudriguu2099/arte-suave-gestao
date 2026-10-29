#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

./ajeitarip.sh
# Faz o Metro anunciar o mesmo IP pro Expo Go (senão ele pode pegar docker/tailscale)
export REACT_NATIVE_PACKAGER_HOSTNAME=$(sed -nE 's#^EXPO_PUBLIC_API_URL=https?://([^:/]+).*#\1#p' frontend/.env.local)

docker compose up -d --build

cd frontend
[ -d node_modules ] || npm install
npm start
