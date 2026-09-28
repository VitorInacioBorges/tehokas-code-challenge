# Checklist de Projetos · Desafio Técnico Tehokas

MVP para consultores criarem projetos, gerenciarem as respectivas tarefas num quadro Kanban e acompanharem o **Indicador de Saúde** de cada projeto — um sinal simples de quantas tarefas estão atrasadas, calculado em tempo real a cada visita ao dashboard ou ao Kanban.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Indicador de Saúde](#indicador-de-saúde)
- [Tecnologias](#tecnologias)
- [Como rodar localmente](#como-rodar-localmente)
- [Como rodar com Docker (Sail)](#como-rodar-com-docker-sail)
- [Acesso de demonstração](#acesso-de-demonstração)
- [Testes e qualidade](#testes-e-qualidade)
- [Arquitetura](#arquitetura)
- [Deploy (Render)](#deploy-render)
- [Fluxo de versionamento](#fluxo-de-versionamento)
- [Maior dificuldade técnica](#maior-dificuldade-técnica)
- [Documentação](#documentação)

## Funcionalidades

- **Autenticação** (via starter kit oficial + Fortify): login, cadastro com acesso imediato ao painel, autenticação em dois fatores (2FA/TOTP com QR code e códigos de recuperação) e passkeys. Confirmação de senha e troca de senha (nas configurações) continuam disponíveis. **Verificação de e-mail e "Esqueci minha senha" foram removidas** (veja o motivo em [Deploy (Render)](#deploy-render)).
- **Dashboard** com resumo (total de projetos, projetos em alerta, tarefas atrasadas) e o Indicador de Saúde de cada projeto.
- **Kanban** por projeto, com mudança de status por **drag-and-drop** (mouse, toque e teclado, via `@dnd-kit`) ou por um `select` no próprio card — os dois caminhos levam à mesma atualização.
- **CRUD** de projetos e de tarefas (título, descrição, status, prioridade e prazo com data e hora).
- **Filtros** de tarefas por status e prioridade, persistidos na URL (compartilháveis e sobrevivem a um refresh).
- **Interface inteira em pt-BR**, incluindo as telas do starter kit (login, cadastro, configurações etc.).
- **Isolamento entre consultores:** cada um só vê e só acessa os próprios projetos e tarefas; tentar acessar um projeto de outro usuário retorna 404.

## Indicador de Saúde

A regra é intencionalmente simples e vive inteiramente no backend — o frontend só exibe o que a API já calculou, sem repetir lógica de negócio.

- **Tarefa atrasada:** `deadline` no passado **e** status diferente de "Concluída". Uma tarefa concluída nunca é considerada atrasada, mesmo com prazo vencido.
- **Estado do projeto**, a partir da porcentagem de tarefas atrasadas sobre o total de tarefas do projeto:
  - **Sem tarefas** — projeto ainda sem nenhuma tarefa cadastrada.
  - **Saudável** — até 20% das tarefas atrasadas (20% exato ainda é saudável).
  - **Em Alerta** — **mais de** 20% das tarefas atrasadas.

Onde isso está implementado:

| Regra | Local |
|---|---|
| Definição única de "atrasada" | `Task::overdue()` (local scope, `tehokas/app/Models/Task.php`) |
| Classificação do estado a partir das contagens | `ProjectHealthStatus::fromCounts()` (`tehokas/app/Enums/ProjectHealthStatus.php`) |
| Agregação das contagens numa única query | `Project::withTaskCounts()` (local scope, `tehokas/app/Models/Project.php`) |

`fromCounts()` compara com aritmética inteira (`overdue * 100 > total * 20`) para não depender de ponto flutuante na borda exata de 20%.

**Por que o indicador é calculado na leitura e não persistido:** uma tarefa fica atrasada só porque o tempo passou — nenhuma escrita acontece no banco nesse instante. Se o estado fosse guardado numa coluna, ele ficaria desatualizado tão logo o relógio avançasse, exigindo um job agendado só para mantê-lo correto. Calculando na leitura, com uma agregação SQL (`withCount`) por listagem, o resultado está sempre certo e custa apenas uma query extra.

## Tecnologias

| Tecnologia | Papel no projeto |
|---|---|
| Laravel 13 | Backend, rotas, validação, autorização |
| PHP 8.5 | Linguagem do backend |
| Inertia.js 3 | Ponte entre Laravel e React sem API REST separada |
| React 19 | Frontend |
| TypeScript | Tipagem do frontend |
| Tailwind CSS 4 | Estilização |
| shadcn/ui (Radix) | Componentes de base (Dialog, Select, ToggleGroup, DropdownMenu etc.) |
| @dnd-kit | Drag-and-drop do Kanban (mouse, toque e teclado) |
| Laravel Fortify | Backend de autenticação (login, 2FA, passkeys) |
| Laravel Wayfinder | Geração de funções TypeScript tipadas a partir das rotas/controllers |
| Pest | Testes automatizados |
| SQLite | Banco de dados |
| Laravel Sail | Ambiente Docker opcional |
| Docker + FrankenPHP | Imagem de produção usada no deploy |

O projeto usa o **starter kit oficial de React** do Laravel, que nas versões atuais do framework substitui o antigo Breeze e já vem com autenticação (Fortify), Inertia, shadcn/ui e Wayfinder integrados. A lista completa de tecnologias, com a versão instalada de cada uma e o porquê da escolha, está em [`tehokas/docs/portuguese/TECNOLOGIAS.md`](tehokas/docs/portuguese/TECNOLOGIAS.md).

## Como rodar localmente

Requisitos: PHP 8.4.1+ (desenvolvido com PHP 8.5), Composer e Node 22+.

```bash
git clone git@github.com:VitorInacioBorges/tehokas-code-challenge.git
cd tehokas-code-challenge/tehokas
composer setup            # instala dependências, cria .env, gera a chave, migra e faz o build
php artisan db:seed       # usuário de demonstração
composer run dev          # servidor + Vite em http://localhost:8000
```

## Como rodar com Docker (Sail)

O repositório já inclui o `compose.yaml` gerado pelo Sail (`php artisan sail:install --with=none`), com apenas o serviço `laravel.test` — sem serviços extras, já que o projeto usa SQLite.

```bash
cd tehokas-code-challenge/tehokas
cp .env.example .env
echo "APP_PORT=8000" >> .env
docker run --rm -u "$(id -u):$(id -g)" -v "$(pwd):/var/www/html" -w /var/www/html laravelsail/php84-composer:latest composer install --ignore-platform-reqs
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate --seed
./vendor/bin/sail npm install && ./vendor/bin/sail npm run build
```

> **Nota:** a imagem `laravelsail/php84-composer` é usada para instalar as dependências PHP sem precisar de PHP/Composer localmente — no momento em que este README foi escrito, o Sail ainda não publicou uma imagem `php85-composer`, então a imagem de PHP 8.4 (a mais recente disponível) é usada só para esse passo; o container da aplicação em si (`laravel.test`) já roda PHP 8.5, conforme `compose.yaml`.
>
> **Nota sobre a porta:** `compose.yaml` publica a porta `${APP_PORT:-80}`, mas o `.env.example` traz `APP_URL=http://localhost:8000`. Defina `APP_PORT=8000` no `.env` antes do `sail up` (como no comando `echo` acima) para que a porta publicada bata com a `APP_URL` — os passkeys (WebAuthn) exigem que a origem do navegador corresponda exatamente à `APP_URL`.
>
> Docker não estava disponível no ambiente em que este README e o `compose.yaml` foram preparados, então o fluxo do Sail acima **não foi validado localmente** — apenas gerado e revisado. Ao rodar em uma máquina com Docker, `./vendor/bin/sail up -d` seguido de `./vendor/bin/sail artisan migrate --seed` deve ser suficiente para validar.

## Acesso de demonstração

O `composer setup` só instala dependências, cria o `.env`, gera a `APP_KEY` e
roda as migrations — ele **não** semeia o banco. Rode `php artisan db:seed`
separadamente, uma vez, logo depois. Rodar o seed duas vezes no mesmo banco
falha, porque o e-mail do usuário de demonstração já existe; para recomeçar
do zero, use `php artisan migrate:fresh --seed` (isso apaga os dados
locais).

Depois de semear:

- **E-mail:** `consultor@tehokas.test`
- **Senha:** `password`

O seeder cria três projetos, um para cada estado do Indicador de Saúde:

| Projeto | Tarefas | Estado | O que demonstra |
|---|---|---|---|
| Implantação de ERP · Cliente Alfa | 6, sendo 1 atrasada | Saudável | 1/6 ≈ 16,7% de atraso, abaixo do limite de 20% |
| Mapeamento de Processos · Cliente Beta | 5, sendo 2 atrasadas | Em Alerta | 2/5 = 40% de atraso, acima do limite de 20% |
| Auditoria de Qualidade · Cliente Gama | nenhuma | Sem tarefas | projeto recém-criado, ainda sem tarefas cadastradas |

## Testes e qualidade

```bash
php artisan test     # roda a suíte Pest
composer ci:check     # Pint, PHPStan nível 7, `vp check` (lint/format), tsc e Pest
```

A suíte tem **87 testes (336 assertions)**, todos passando (`php artisan test --compact`).

`composer ci:check` é o gate de qualidade usado antes de cada PR: formatação (Pint), análise estática (PHPStan nível 7), lint e formatação do frontend (`vp check`), checagem de tipos (`tsc --noEmit`) e a suíte de testes (Pest). Existe um workflow de GitHub Actions equivalente em `tehokas/.github/workflows/tests.yml`, mas ele **não é executado nos PRs deste repositório**, porque o GitHub só lê workflows a partir de `.github/` na raiz do repositório, e o app fica em `tehokas/`; por isso `composer ci:check` é hoje o gate de qualidade real, rodado manualmente antes de cada PR.

## Arquitetura

O fluxo de uma ação no Kanban (por exemplo, mudar o status de uma tarefa) passa por: **React** (`resources/js/pages`, `resources/js/components/tasks`) → função gerada pelo **Wayfinder** (`resources/js/actions`/`resources/js/routes`) → **rota** (`routes/projects.php`) → **Form Request** (validação em `app/Http/Requests`) e **Policy** (`app/Policies`, dono do projeto) → **controller** fino (`app/Http/Controllers`) → **Eloquent** (`app/Models`, com os enums de `app/Enums` e o scope `overdue()`/`withTaskCounts()`) → **API Resource** (`app/Http/Resources`, serializa e já traz o `health` calculado) → **Inertia**, que devolve a página com as novas props → **React** re-renderiza.

```
React (pages/components) → Wayfinder → rota → Form Request + Policy → Controller → Eloquent (Enums) → Resource → Inertia → React
```

Caminhos principais:

- `app/Enums` — `TaskStatus`, `TaskPriority`, `ProjectHealthStatus`.
- `app/Models` — `Project`, `Task`, com os scopes de negócio.
- `app/Policies` — `ProjectPolicy` (autoriza também as operações de tarefa, contra `$task->project`).
- `app/Http/*` — controllers, Form Requests e Resources.
- `resources/js/pages` — páginas Inertia (`dashboard.tsx`, `projects/show.tsx`, telas de autenticação e configurações).
- `resources/js/components/{projects,tasks}` — `HealthBadge`, `ProjectCard`, `KanbanBoard`, `TaskCard` etc.

A spec completa de design (decisões, modelo de dados, contrato das rotas e critérios de teste) está em [`tehokas/docs/superpowers/specs/2026-09-27-checklist-projetos-design.md`](tehokas/docs/superpowers/specs/2026-09-27-checklist-projetos-design.md). Uma descrição mais completa da arquitetura, com o caminho de uma requisição ponta a ponta e um diagrama, está em [`tehokas/docs/portuguese/ARQUITETURA.md`](tehokas/docs/portuguese/ARQUITETURA.md).

## Deploy (Render)

A aplicação está preparada para rodar no [Render](https://render.com) a partir de um Blueprint (`render.yaml`, na raiz do repositório): `tehokas/Dockerfile` builda uma imagem com **FrankenPHP** (PHP 8.5 e o servidor web Caddy num único binário) em dois estágios — o primeiro instala as dependências e roda `npm run build`, o segundo copia só os assets compilados para a imagem final —, e `tehokas/docker/start.sh` é o entrypoint do container.

**Para publicar:** no painel do Render, use **New > Blueprint** e conecte este repositório no GitHub. O Render lê o `render.yaml`, builda a imagem (o `buildFilter.paths: tehokas/**` evita rebuild quando só arquivos fora de `tehokas/` mudam) e publica o serviço `checklist-projetos`. A URL pública é gerada pelo Render no momento da publicação e aparece no painel do serviço assim que o primeiro deploy termina.

**O que acontece no boot** (`docker/start.sh`, a cada deploy, reinício ou saída da hibernação): se o arquivo SQLite ainda não existe, ele é criado, as migrations rodam e o seeder popula os dados de demonstração; se o arquivo já existe (mesmo boot do container ainda de pé), só as migrations rodam. Só depois disso o `php artisan optimize` armazena em cache config/rotas/views, para não cachear uma `APP_URL` ou `APP_KEY` desatualizada.

**Limitações do plano free:**

- O serviço **hiberna após 15 minutos sem tráfego**; a primeira requisição depois disso demora cerca de 1 minuto para "acordar" o container.
- O **disco é efêmero**: a cada deploy, reinício ou saída da hibernação, o SQLite é recriado do zero e os dados voltam ao estado de demonstração do seeder — nada digitado na sessão anterior é preservado.
- Não há SMTP configurado (`MAIL_MAILER=log`, e o plano free do Render bloqueia conexões SMTP de saída), o que é a razão de a verificação de e-mail e o "Esqueci minha senha" terem sido removidos do app: sem envio de e-mail, essas duas telas não teriam como funcionar.
- O deploy é automático a cada commit em `main` (`autoDeployTrigger: commit`); como o merge `develop → main` é feito manualmente pelo usuário, um novo deploy só é disparado depois desse merge.

## Fluxo de versionamento

Cada funcionalidade nasce da `develop` numa branch própria (`feat/...`, `docs/...`), vai para `develop` por Pull Request e é integrada com merge commit; a branch é apagada depois do merge. O merge `develop → main` acontece só na entrega final do desafio. Commits seguem o padrão `Tipo(escopo): descrição`, por exemplo `Feat(tasks): adiciona enum TaskStatus`.

## Maior dificuldade técnica

O maior aprendizado veio da revisão de código: filtros que pareciam prontos quebravam com entradas que ninguém digita de propósito. Um endereço como `?status[]=x`, que o PHP transforma em array, derrubava a página com erro 500, porque a conversão para enum espera texto. Tratei os filtros para aceitar apenas valores de texto válidos e ignorar o resto. Também garanti que um prazo digitado como 14:30 volte como 14:30, sem deslocamento de fuso, e que ninguém consiga ver ou alterar projetos de outro consultor (a resposta é 404, para não revelar que o projeto existe). Cada um desses casos virou um teste automatizado.

## Documentação

- **Arquitetura, execução, práticas e tecnologias (pt-BR):** [`tehokas/docs/portuguese/`](tehokas/docs/portuguese/) — [ARQUITETURA.md](tehokas/docs/portuguese/ARQUITETURA.md), [EXECUCAO.md](tehokas/docs/portuguese/EXECUCAO.md), [PRATICAS.md](tehokas/docs/portuguese/PRATICAS.md), [TECNOLOGIAS.md](tehokas/docs/portuguese/TECNOLOGIAS.md).
- **Architecture, running, practices and technologies (English):** [`tehokas/docs/english/`](tehokas/docs/english/) — [ARCHITECTURE.md](tehokas/docs/english/ARCHITECTURE.md), [RUNNING.md](tehokas/docs/english/RUNNING.md), [PRACTICES.md](tehokas/docs/english/PRACTICES.md), [TECHNOLOGIES.md](tehokas/docs/english/TECHNOLOGIES.md).
- **Spec de design do MVP:** [`tehokas/docs/superpowers/specs/2026-09-27-checklist-projetos-design.md`](tehokas/docs/superpowers/specs/2026-09-27-checklist-projetos-design.md).
- **Plano de implementação:** [`tehokas/docs/superpowers/plans/2026-09-27-checklist-projetos.md`](tehokas/docs/superpowers/plans/2026-09-27-checklist-projetos.md).
