# Execução

Este guia cobre como instalar, rodar, testar e publicar o Checklist de
Projetos. Todos os comandos abaixo, salvo indicação contrária, rodam dentro da
pasta `tehokas/` (a raiz da aplicação Laravel).

## Pré-requisitos

- **PHP 8.4.1 ou superior** (o projeto foi desenvolvido e testado com PHP 8.5)
  e Composer.
- **Node 22 ou superior** e npm.
- Extensão `pdo_sqlite` habilitada no PHP — o banco padrão é SQLite.
- Docker, apenas se você optar pelo caminho do Sail em vez da instalação
  local.

## Instalação local

1. Clone o repositório e entre na pasta da aplicação:

   ```bash
   git clone git@github.com:VitorInacioBorges/tehokas-code-challenge.git
   cd tehokas-code-challenge/tehokas
   ```

2. Rode o script de setup, que instala as dependências PHP, cria o `.env` a
   partir do `.env.example`, gera a `APP_KEY`, roda as migrations e builda os
   assets do frontend:

   ```bash
   composer setup
   ```

3. Semeie os dados de demonstração (veja [Dados de demonstração](#dados-de-demonstração)):

   ```bash
   php artisan db:seed
   ```

4. Suba o servidor de desenvolvimento (Laravel + Vite juntos, com
   hot-reload):

   ```bash
   composer run dev
   ```

   A aplicação fica disponível em `http://localhost:8000`.

## Sail (Docker)

O repositório já inclui `tehokas/compose.yaml`, gerado pelo Sail
(`php artisan sail:install --with=none`), com apenas o serviço
`laravel.test` — sem serviços extras, porque o projeto usa SQLite em vez de um
banco cliente-servidor.

1. Entre na pasta da aplicação, copie o `.env` e defina `APP_PORT=8000`
   (`compose.yaml` publica a porta `${APP_PORT:-80}`, mas o `.env.example`
   traz `APP_URL=http://localhost:8000`; sem essa variável a porta publicada
   não bate com a `APP_URL`, e os passkeys/WebAuthn exigem que a origem do
   navegador corresponda exatamente a ela):

   ```bash
   cd tehokas-code-challenge/tehokas
   cp .env.example .env
   echo "APP_PORT=8000" >> .env
   ```

2. Instale as dependências PHP sem precisar de PHP/Composer localmente,
   usando a imagem auxiliar do Sail (veja a nota abaixo sobre a versão da
   imagem):

   ```bash
   docker run --rm -u "$(id -u):$(id -g)" -v "$(pwd):/var/www/html" -w /var/www/html laravelsail/php84-composer:latest composer install --ignore-platform-reqs
   ```

3. Suba os containers e prepare a aplicação:

   ```bash
   ./vendor/bin/sail up -d
   ./vendor/bin/sail artisan key:generate
   ./vendor/bin/sail artisan migrate --seed
   ./vendor/bin/sail npm install && ./vendor/bin/sail npm run build
   ```

**Nota sobre a imagem do passo 2:** no momento em que este documento foi
escrito, o Sail ainda não publica uma imagem `laravelsail/php85-composer`; a
imagem `php84-composer` (a mais recente disponível) é usada só para instalar
as dependências PHP sem exigir PHP ou Composer na máquina host. O container
da aplicação em si (`laravel.test`, definido em `compose.yaml`) já roda PHP
8.5.

O fluxo do Sail acima foi gerado e revisado, mas **não foi validado numa
máquina com Docker disponível** no momento em que este projeto foi preparado.

## Dados de demonstração

O `composer setup` só instala dependências, cria o `.env`, gera a `APP_KEY` e
roda as migrations — ele **não** semeia o banco. Rode `php artisan db:seed`
separadamente, uma vez, logo depois (o fluxo do Sail acima já roda o seed
como parte do `migrate --seed`). Rodar o seed duas vezes no mesmo banco
falha, porque o e-mail do usuário de demonstração já existe; para recomeçar
do zero, use `php artisan migrate:fresh --seed` (isso apaga os dados
locais).

Depois de semear, use:

- **E-mail:** `consultor@tehokas.test`
- **Senha:** `password`

O seeder (`database/seeders/DatabaseSeeder.php`) cria um consultor com três
projetos, um para cada estado do Indicador de Saúde:

| Projeto | Tarefas | Estado |
|---|---|---|
| Implantação de ERP · Cliente Alfa | 6, sendo 1 atrasada (≈16,7%) | Saudável |
| Mapeamento de Processos · Cliente Beta | 5, sendo 2 atrasadas (40%) | Em Alerta |
| Auditoria de Qualidade · Cliente Gama | nenhuma | Sem tarefas |

Os prazos das tarefas são gerados de forma relativa a "hoje" (`now()->addDays(...)`),
então a demonstração nunca fica desatualizada, mesmo rodando o seeder meses
depois.

## Testes e `composer ci:check`

```bash
php artisan test --compact   # roda a suíte Pest (formato compacto)
composer ci:check            # gate de qualidade completo
```

A suíte tem **87 testes (336 assertions)**. `composer ci:check` roda, nesta
ordem: `vp check` (lint e formatação do frontend), `tsc --noEmit` (checagem de
tipos do TypeScript) e o Composer script `test`, que por sua vez roda Pint
(`lint:check`), PHPStan nível 7 (`types:check`) e a suíte Pest
(`php artisan test`). É esse comando que decide se um PR pode ser mesclado —
veja por quê em [Práticas](PRATICAS.md#qualidade-de-código).

## Deploy no Render

Consulte a seção "Deploy (Render)" no [README](../../../README.md) da raiz do
repositório para o passo a passo completo de publicação, o que acontece no
boot do container e as limitações do plano gratuito. Em resumo:

1. No painel do Render, use **New > Blueprint** e conecte o repositório do
   GitHub. O Render lê o `render.yaml` da raiz do repositório.
2. `tehokas/Dockerfile` builda a imagem de produção (FrankenPHP + PHP 8.5) e
   `tehokas/docker/start.sh` é o entrypoint: ele cria e semeia o SQLite se o
   arquivo ainda não existir, roda as migrations e só então chama
   `php artisan optimize`.
3. A URL pública é gerada pelo Render no momento da publicação e aparece no
   painel do serviço — não há como prevê-la de antemão.

## Problemas comuns

- **`php artisan wayfinder:generate` gerou funções sem `.form()`, e o
  `<Form>` do Inertia quebra em tempo de build.** As páginas usam bastante o
  padrão `{...Controller.acao.form()}` (por exemplo,
  `resources/js/pages/projects/show.tsx`). Se você rodar o comando do
  Wayfinder manualmente em vez de deixar o `npm run build`/`npm run dev`
  fazer isso pelo plugin do Vite (`wayfinder({ formVariants: true })` em
  `vite.config.ts`), sempre inclua a flag `--with-form`:

  ```bash
  php artisan wayfinder:generate --with-form
  ```

- **`Illuminate\Foundation\ViteException: Unable to locate file in Vite
  manifest.`** Os assets do frontend ainda não foram compilados (ou o
  `manifest.json` está desatualizado). Rode `npm run build` para gerar um
  build de produção, ou `npm run dev`/`composer run dev` para o servidor de
  desenvolvimento com hot-reload.

- **Banco SQLite local não existe.** `composer setup` já garante isso, mas se
  o arquivo `database/database.sqlite` não existir por qualquer motivo,
  crie-o manualmente antes de migrar:

  ```bash
  touch database/database.sqlite
  php artisan migrate
  ```
