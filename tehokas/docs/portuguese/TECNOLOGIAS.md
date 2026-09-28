# Tecnologias

Esta é a lista completa das tecnologias usadas no projeto, com a versão
exigida (`composer.json`/`package.json`) e a versão de fato instalada no
momento em que este documento foi escrito (`composer show --direct` e os
`package.json` dos pacotes em `node_modules`), além do porquê de cada escolha.

## Backend

| Tecnologia | Versão exigida | Versão instalada | Por que foi usada |
|---|---|---|---|
| **Laravel** | `^13.17` | 13.33.0 | Framework do backend: roteamento, validação, autorização (Policies), Eloquent ORM, filas, testes. |
| **PHP** | `^8.4.1` | 8.5.4 | Linguagem do backend. O projeto usa recursos recentes da linguagem, como os atributos `#[Scope]` e `#[Fillable]` do Eloquent. |
| **Inertia.js (adapter Laravel)** | `^3.0` (`inertiajs/inertia-laravel`) | 3.4.0 | Ponte entre Laravel e React sem expor uma API REST separada: o controller devolve `Inertia::render()` com as props já tipadas, sem duplicar contrato entre backend e frontend. |
| **Laravel Fortify** | `^1.37.2` | 1.40.0 | Backend de autenticação, agnóstico de frontend: login, cadastro, 2FA (TOTP com QR code e códigos de recuperação), confirmação de senha e passkeys, sem precisar reimplementar esses fluxos. |
| **Laravel Wayfinder** | `^0.1.14` | 0.1.21 | Gera funções TypeScript tipadas a partir das rotas e controllers PHP (`resources/js/actions`, `resources/js/routes`), para o frontend chamar o backend sem strings de URL escritas à mão nem contrato duplicado. |
| **Laravel Sail** | `^1.53` (dev) | 1.68.0 | Ambiente Docker opcional para desenvolvimento local, alternativa à instalação de PHP/Composer/Node diretamente na máquina. |
| **Pest** | `^5.2` (`pestphp/pest`) | 5.2.1 | Framework de testes usado em todo o projeto (TDD): sintaxe mais direta que PHPUnit puro, mantendo compatibilidade com o ecossistema PHPUnit. |
| **Pest Plugin Laravel** | `^5.0` | 5.0.1 | Integração do Pest com helpers de teste do Laravel (`RefreshDatabase`, `actingAs`, asserts de Inertia). |
| **Larastan (PHPStan)** | `^3.9` (dev) | 3.12.2 | Análise estática de tipos no nível 7 (`phpstan.neon`), com extensões específicas do Eloquent — pega erros de tipo antes da execução. |
| **Laravel Pint** | `^1.27` (dev) | 1.32.1 | Formatação automática de código PHP com o preset `laravel` (baseado em PSR-12), garantindo estilo consistente sem revisão manual de formatação. |

## Frontend

| Tecnologia | Versão exigida | Versão instalada | Por que foi usada |
|---|---|---|---|
| **React** | `^19.2.0` | 19.3.0 | Biblioteca de UI do frontend; renderiza as páginas Inertia. |
| **TypeScript** | `^5.7.2` | 5.9.3 | Tipagem estática do frontend; combinada ao Wayfinder, garante que uma mudança de assinatura no controller PHP quebre a checagem de tipos do TypeScript (`tsc --noEmit`) em vez de falhar só em runtime. |
| **@inertiajs/react** | `^3.0.0` | 3.7.1 | Cliente React do Inertia: hooks (`usePage`, `useForm`), componente `<Link>`, `router` com o novo `router.optimistic()` do Inertia v3 usado na atualização otimista do Kanban. |
| **Tailwind CSS** | `^4.0.0` | 4.3.3 | Estilização utilitária de toda a interface, sem escrever CSS à parte por componente. |
| **shadcn/ui + Radix UI** (`@radix-ui/react-*`) | várias, veja `package.json` | — | `shadcn/ui` não é um pacote instalado: os componentes de base (`Dialog`, `Select`, `ToggleGroup`, `DropdownMenu` etc., em `resources/js/components/ui/`) são copiados para o repositório e construídos sobre as primitivas acessíveis do Radix UI, permitindo customizar o componente livremente sem depender de uma biblioteca de UI fechada. |
| **@dnd-kit/core** | `^6.3.1` | 6.3.1 | Drag-and-drop do Kanban, com suporte nativo a mouse, toque e teclado (`PointerSensor`, `TouchSensor`, `KeyboardSensor`) e anúncios configuráveis para leitores de tela. |
| **@laravel/passkeys** | `^0.2.0` | — | Cliente WebAuthn usado pelas telas de passkeys do Fortify (registro e login sem senha). |
| **Vite + vite-plus** | `^8.0.0` / `0.3.0` (dev) | 8.3.1 / 0.3.0 | Build e servidor de desenvolvimento do frontend; `vite-plus` centraliza a configuração de lint (`vp check`) e formatação num único arquivo (`vite.config.ts`), no lugar de manter ESLint e Prettier configurados separadamente. |
| **@laravel/vite-plugin-wayfinder** | `^0.1.3` | — | Plugin do Vite que roda `wayfinder:generate --with-form` automaticamente a cada build/dev (`formVariants: true` em `vite.config.ts`), mantendo `resources/js/actions`/`routes` sempre sincronizados com o backend. |

## Banco de dados

| Tecnologia | Por que foi usada |
|---|---|
| **SQLite** | Banco de dados único do projeto, tanto localmente quanto em produção (`DB_CONNECTION=sqlite`). Elimina a necessidade de um servidor de banco separado, o que é decisivo no plano gratuito do Render: o disco é efêmero de qualquer forma, então um banco cliente-servidor não traria persistência a mais, só complexidade. |

## Deploy

| Tecnologia | Por que foi usada |
|---|---|
| **FrankenPHP** (imagem `dunglas/frankenphp:1-php8.5-bookworm`) | Servidor de aplicação para produção: combina o runtime PHP 8.5 e o servidor web Caddy num único binário, sem precisar configurar Nginx/PHP-FPM separadamente. |
| **Docker** | Empacota a aplicação (`tehokas/Dockerfile`, build em dois estágios) numa imagem única e reprodutível, que o Render consegue buildar e rodar diretamente. |
| **Render** | Plataforma de hospedagem gratuita usada para o deploy de demonstração, via Blueprint (`render.yaml`). Veja a seção "Deploy (Render)" no [README](../../../README.md) da raiz para o passo a passo e as limitações do plano free. |

## Sobre o starter kit

O projeto foi criado a partir do **starter kit oficial de React** do Laravel
(`laravel/react-starter-kit`, veja o campo `name` em `composer.json`). Nas
versões atuais do framework, esse starter kit substitui o antigo Laravel
Breeze citado no enunciado do desafio, e já vem com autenticação (Fortify),
Inertia, shadcn/ui e Wayfinder integrados e configurados — por isso o projeto
não instala esses pacotes "do zero", eles já chegam prontos com o starter kit.
