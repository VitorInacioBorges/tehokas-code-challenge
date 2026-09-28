#!/usr/bin/env bash
# Entrypoint do container em produção (Render, plano free, disco efêmero).
# A cada boot (deploy, restart ou saída da hibernação) o disco pode estar
# vazio, então este script recria o SQLite e semeia os dados de demonstração
# sempre que o arquivo do banco não existir ainda.
set -euo pipefail

cd /app

# O `generateValue: true` do Render gera 256 bits em base64 sem o prefixo
# "base64:" que o Laravel exige em APP_KEY.
if [[ -n "${APP_KEY:-}" && "${APP_KEY}" != base64:* ]]; then
    export APP_KEY="base64:${APP_KEY}"
fi

# APP_URL pode não vir configurada; usamos a URL pública que o Render injeta.
export APP_URL="${APP_URL:-${RENDER_EXTERNAL_URL:-}}"

DB_PATH="${DB_DATABASE:-database/database.sqlite}"

if [[ ! -f "${DB_PATH}" ]]; then
    mkdir -p "$(dirname "${DB_PATH}")"
    touch "${DB_PATH}"
    php artisan migrate --force
    php artisan db:seed --force
else
    php artisan migrate --force
fi

# Cacheia config/rotas/views/eventos só depois de APP_KEY e APP_URL corretas,
# senão os valores errados ficariam congelados no cache.
php artisan optimize

# O FrankenPHP lê SERVER_NAME do Caddyfile padrão da imagem; ":$PORT" faz o
# Caddy escutar em todas as interfaces na porta que o Render atribuiu.
export SERVER_NAME=":${PORT:-10000}"

exec frankenphp run --config /etc/frankenphp/Caddyfile --adapter caddyfile
