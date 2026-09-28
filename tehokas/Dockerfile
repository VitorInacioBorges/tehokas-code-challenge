# syntax=docker/dockerfile:1
#
# Deploy no Render (plano free) via Blueprint com runtime: docker.
# FrankenPHP (PHP 8.5 + Caddy num único binário) escuta a porta que o Render
# injeta em $PORT. Banco SQLite efêmero: recriado e semeado pelo
# docker/start.sh a cada boot, já que o disco do free tier não persiste.

########################################################################
# Estágio 1 — build dos assets (Vite via vite-plus)
#
# O plugin Vite do Wayfinder roda `php artisan wayfinder:generate` durante
# `npm run build`, então este estágio precisa de PHP (com vendor/ instalado)
# e Node 22 ao mesmo tempo.
########################################################################
FROM dunglas/frankenphp:1-php8.5-bookworm AS assets

WORKDIR /app

# Node 22 copiado da imagem oficial (mesma base Debian bookworm da imagem
# do FrankenPHP, então os binários glibc são compatíveis) — evita puxar um
# segundo gerenciador de pacotes de SO só por causa do Node.
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Extensões mínimas para o composer install e o wayfinder:generate rodarem.
RUN install-php-extensions pdo_sqlite intl zip bcmath opcache

COPY composer.json composer.lock ./
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

RUN npm ci \
    && npm run build

########################################################################
# Estágio 2 — imagem final de produção
########################################################################
FROM dunglas/frankenphp:1-php8.5-bookworm AS runtime

# `composer check-platform-reqs` não aponta ext-bcmath/ext-intl/ext-zip como
# obrigatórias com as dependências atuais, mas garantimos as mesmas do
# estágio de build por segurança, além de pdo_sqlite (banco) e opcache.
RUN install-php-extensions pdo_sqlite intl zip bcmath opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

# Assets compilados no estágio 1 (o .dockerignore impede que public/build do
# host, se existir, seja copiado por engano no `COPY . .` acima).
COPY --from=assets /app/public/build ./public/build

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
        storage/logs bootstrap/cache database \
    && chown -R www-data:www-data storage bootstrap/cache database \
    && chown -R www-data:www-data /data/caddy /config/caddy

# O binário oficial do FrankenPHP vem com a file capability
# cap_net_bind_service (para escutar em portas < 1024). Rodando como www-data
# numa plataforma que não concede essa capability (caso do Render), o kernel
# recusa executar o binário ("Operation not permitted", status 126). O servidor
# escuta em $PORT (10000 no Render), então a capability é desnecessária:
# removê-la é a receita oficial para rodar sem root em porta alta.
RUN setcap -r /usr/local/bin/frankenphp

COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

USER www-data

EXPOSE 10000

ENTRYPOINT ["/usr/local/bin/start.sh"]
