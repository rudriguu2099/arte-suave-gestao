#!/usr/bin/env bash
# Escolhe a interface de rede e grava o IP no frontend/.env.local (Expo Go no celular).
set -e
cd "$(dirname "$0")"

ENV_FILE=frontend/.env.local
command -v dialog >/dev/null || { echo "Instale o dialog: sudo dnf install dialog"; exit 1; }

# "interface ip" de lo, enp*, wlp* e tailscale*
mapfile -t opcoes < <(ip -o -4 addr show | awk '$2 ~ /^(lo|enp|wlp|tailscale)/ {split($4, a, "/"); print $2; print a[1]}')
[ ${#opcoes[@]} -gt 0 ] || { echo "Nenhuma interface encontrada."; exit 1; }

atual=$(sed -nE 's#^EXPO_PUBLIC_API_URL=https?://([^:/]+).*#\1#p' "$ENV_FILE" 2>/dev/null)

iface=$(dialog --stdout --title "Ajeitar IP" \
  --menu "IP atual: ${atual:-nenhum}\nEscolha a interface:" 15 50 6 "${opcoes[@]}") || { clear; echo "Mantido: ${atual:-nenhum}"; exit 0; }
clear

for ((i = 0; i < ${#opcoes[@]}; i += 2)); do
  [ "${opcoes[i]}" = "$iface" ] && ip=${opcoes[i + 1]}
done

touch "$ENV_FILE"
if grep -q '^EXPO_PUBLIC_API_URL=' "$ENV_FILE"; then
  sed -i -E "s#^(EXPO_PUBLIC_API_URL=https?://)[^:/]+#\1$ip#" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_API_URL=http://$ip:3000" >> "$ENV_FILE"
fi

echo "IP ajustado para $ip ($iface)"
grep '^EXPO_PUBLIC_API_URL=' "$ENV_FILE"
