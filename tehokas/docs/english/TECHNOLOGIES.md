# Technologies

This is the full list of technologies used in the project, with the required
version (`composer.json`/`package.json`) and the version actually installed
at the time this document was written (`composer show --direct` and the
`package.json` files of the packages under `node_modules`), plus the reason
behind each choice.

## Backend

| Technology | Required version | Installed version | Why it was used |
|---|---|---|---|
| **Laravel** | `^13.17` | 13.33.0 | The backend framework: routing, validation, authorization (Policies), the Eloquent ORM, queues, testing. |
| **PHP** | `^8.3` | 8.5.4 | The backend language. The project uses recent language features, such as Eloquent's `#[Scope]` and `#[Fillable]` attributes. |
| **Inertia.js (Laravel adapter)** | `^3.0` (`inertiajs/inertia-laravel`) | 3.4.0 | The bridge between Laravel and React without exposing a separate REST API: the controller returns `Inertia::render()` with already-typed props, without duplicating a contract between backend and frontend. |
| **Laravel Fortify** | `^1.37.2` | 1.40.0 | Frontend-agnostic authentication backend: login, registration, 2FA (TOTP with QR code and recovery codes), password confirmation, and passkeys, without reimplementing those flows from scratch. |
| **Laravel Wayfinder** | `^0.1.14` | 0.1.21 | Generates typed TypeScript functions from the PHP routes and controllers (`resources/js/actions`, `resources/js/routes`), so the frontend can call the backend without hand-written URL strings or a duplicated contract. |
| **Laravel Sail** | `^1.53` (dev) | 1.68.0 | Optional Docker environment for local development, an alternative to installing PHP/Composer/Node directly on the machine. |
| **Pest** | `^5.2` (`pestphp/pest`) | 5.2.1 | The testing framework used throughout the project (TDD): more direct syntax than plain PHPUnit, while staying compatible with the PHPUnit ecosystem. |
| **Pest Plugin Laravel** | `^5.0` | 5.0.1 | Integrates Pest with Laravel testing helpers (`RefreshDatabase`, `actingAs`, Inertia assertions). |
| **Larastan (PHPStan)** | `^3.9` (dev) | 3.12.2 | Static type analysis at level 7 (`phpstan.neon`), with Eloquent-specific extensions — catches type errors before runtime. |
| **Laravel Pint** | `^1.27` (dev) | 1.32.1 | Automatic PHP code formatting with the `laravel` preset (based on PSR-12), keeping style consistent without manual formatting review. |

## Frontend

| Technology | Required version | Installed version | Why it was used |
|---|---|---|---|
| **React** | `^19.2.0` | 19.3.0 | The frontend's UI library; renders the Inertia pages. |
| **TypeScript** | `^5.7.2` | 5.9.3 | Static typing for the frontend; combined with Wayfinder, a signature change in a PHP controller breaks TypeScript's type check (`tsc --noEmit`) instead of only failing at runtime. |
| **@inertiajs/react** | `^3.0.0` | 3.7.1 | Inertia's React client: hooks (`usePage`, `useForm`), the `<Link>` component, and `router`, including Inertia v3's new `router.optimistic()` used for the Kanban board's optimistic update. |
| **Tailwind CSS** | `^4.0.0` | 4.3.3 | Utility-first styling for the whole interface, without writing separate CSS per component. |
| **shadcn/ui + Radix UI** (`@radix-ui/react-*`) | various, see `package.json` | — | `shadcn/ui` is not an installed package: the base components (`Dialog`, `Select`, `ToggleGroup`, `DropdownMenu`, etc., under `resources/js/components/ui/`) are copied into the repository and built on Radix UI's accessible primitives, so each component can be freely customized instead of depending on a closed UI library. |
| **@dnd-kit/core** | `^6.3.1` | 6.3.1 | The Kanban board's drag-and-drop, with native support for mouse, touch, and keyboard (`PointerSensor`, `TouchSensor`, `KeyboardSensor`) and configurable screen-reader announcements. |
| **@laravel/passkeys** | `^0.2.0` | — | The WebAuthn client used by Fortify's passkey screens (registration and passwordless login). |
| **Vite + vite-plus** | `^8.0.0` / `0.3.0` (dev) | 8.3.1 / 0.3.0 | The frontend's build tool and dev server; `vite-plus` centralizes lint (`vp check`) and formatting configuration in a single file (`vite.config.ts`), instead of maintaining ESLint and Prettier configured separately. |
| **@laravel/vite-plugin-wayfinder** | `^0.1.3` | — | The Vite plugin that automatically runs `wayfinder:generate --with-form` on every build/dev run (`formVariants: true` in `vite.config.ts`), keeping `resources/js/actions`/`routes` always in sync with the backend. |

## Database

| Technology | Why it was used |
|---|---|
| **SQLite** | The project's only database, both locally and in production (`DB_CONNECTION=sqlite`). It removes the need for a separate database server, which matters on Render's free plan: the disk is ephemeral anyway, so a client-server database would not add any persistence, only complexity. |

## Deployment

| Technology | Why it was used |
|---|---|
| **FrankenPHP** (image `dunglas/frankenphp:1-php8.5-bookworm`) | The production application server: combines the PHP 8.5 runtime and the Caddy web server into a single binary, with no need to configure Nginx/PHP-FPM separately. |
| **Docker** | Packages the application (`tehokas/Dockerfile`, a two-stage build) into a single, reproducible image that Render can build and run directly. |
| **Render** | The free hosting platform used for the demo deploy, via a Blueprint (`render.yaml`). See the "Deploy (Render)" section in the root [README](../../../README.md) for the full walkthrough and the free plan's limitations. |

## About the starter kit

The project was scaffolded from Laravel's **official React starter kit**
(`laravel/react-starter-kit`, see the `name` field in `composer.json`). In the
framework's current versions, this starter kit replaces the older Laravel
Breeze mentioned in the challenge brief, and it already ships with
authentication (Fortify), Inertia, shadcn/ui, and Wayfinder integrated and
configured — which is why the project does not install those packages "from
scratch": they arrive ready-made with the starter kit.
