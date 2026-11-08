#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -e deploy/.env.production ]; then
  echo 'deploy/.env.production já existe. Edite-o sem substituir as chaves existentes.'
  exit 1
fi
read -r -p 'Domínio apontado para o VPS (ex.: app.sualoja.com.br): ' HOST_DOMAIN
read -r -p 'E-mail do administrador: ' ADMIN_EMAIL
read -r -s -p 'Nova senha administrativa (mínimo 6 caracteres): ' ADMIN_PASSWORD
printf '\n'
export HOST_DOMAIN ADMIN_EMAIL ADMIN_PASSWORD
node deploy/configure.mjs
unset ADMIN_PASSWORD
