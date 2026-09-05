#!/usr/bin/env bash
set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_NGINX="$REPO_ROOT/config/chainlens/nginx.conf"

if [[ -z "${BESU_CHAINLENS_NGINX:-}" ]]; then
  if [[ -f "$HOME/besu-test-network/config/chainlens/nginx.conf" ]]; then
    BESU_CHAINLENS_NGINX="$HOME/besu-test-network/config/chainlens/nginx.conf"
  else
    echo "Set BESU_CHAINLENS_NGINX to your besu-test-network Chainlens nginx.conf path." >&2
    exit 1
  fi
fi

cp "$SOURCE_NGINX" "$BESU_CHAINLENS_NGINX"
echo "Installed $SOURCE_NGINX -> $BESU_CHAINLENS_NGINX"
echo "Restart Chainlens nginx: docker restart chainlensnginx"
