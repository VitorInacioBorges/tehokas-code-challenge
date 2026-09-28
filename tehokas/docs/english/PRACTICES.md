# Practices

This document collects the engineering practices used while building the
Project Checklist app: how work is organized in Git, how the code is tested
and reviewed, and the security, internationalization, and accessibility
decisions.

## Git flow

Every feature branches off `develop` into its own branch, prefixed by the
kind of change (`feat/...`, `fix/...`, `docs/...`). Work goes to `develop`
through a Pull Request and is integrated with a merge commit; the branch is
deleted after the merge. The final `develop → main` merge is done manually by
the user, only at the challenge's delivery — that merge is what triggers the
automatic deploy on Render (see the "Deploy (Render)" section in the
[README](../../../README.md)).

### Conventional Commits in Portuguese

Commits follow the `Type(scope): description` pattern, with the type in
English and the description in Portuguese, for example:

```
Feat(kanban): adiciona quadro Kanban com drag-and-drop e atualização otimista
Fix(filters): ignora filtros com formato inválido na query string
Docs(deploy): documenta o Blueprint do Render
```

The types used across the project's history include `Feat`, `Fix`, `Docs`,
and `Chore`.

## TDD with Pest

The project uses [Pest](https://pestphp.com/) as its testing framework, with
the `pestphp/pest-plugin-laravel` plugin. The development cycle follows TDD:
first a test that captures the expected behavior (or the bug), then the
implementation that makes that test pass. This is visible in the project's
commit history: for example, the commit `Fix(filters): ignora filtros com
formato inválido na query string` fixes exactly the scenario described in the
README's "Biggest technical challenge" section, and the matching test
(`tests/Feature/Tasks/TaskFiltersTest.php`, the `array-shaped filter values
are ignored instead of failing` case) documents that behavior permanently.

Tests are organized by kind under `tests/Feature` (end-to-end behavior, over
HTTP) and `tests/Unit` (isolated rules, such as the enums). The full suite
has 87 tests and 336 assertions.

## Review per task

Every task in the [implementation plan](../superpowers/plans/2026-09-27-checklist-projetos.md)
goes through a code review before being considered done, not only at the end
of the project. That practice is what surfaced the three issues described in
the README's "Biggest technical challenge" section (array-shaped query string
filters, the deadline's timezone, and isolation between consultants): none of
them showed up during normal use of the screens, only when reviewing the code
with inputs a user would not type on purpose in mind.

## Code quality

Three automated tools make up the quality gate, all wired into the Composer
`ci:check` script (`composer.json`):

| Tool | What it checks |
|---|---|
| **Laravel Pint** (`laravel` preset, based on PSR-12) | PHP code formatting. `vendor/bin/pint --dirty` fixes it automatically. |
| **PHPStan / Larastan, level 7** (`phpstan.neon`) | Static analysis: incorrect types, calls to undefined methods, unhandled nulls. |
| **`vp check` (vite-plus) + `tsc --noEmit`** | Frontend TypeScript/React linting, formatting, and type checking. |

Since the GitHub Actions workflow at `tehokas/.github/workflows/tests.yml`
does not actually run in this repository (GitHub only reads `.github/` from
the repository root, and the app lives in `tehokas/`), running
`composer ci:check` manually before every PR is the project's real quality
gate.

## Separation of concerns

The backend code follows an explicit division of responsibilities, instead of
concentrating everything in the controller:

- **Form Requests** (`app/Http/Requests/`) hold both validation (`rules()`)
  and authorization (`authorize()`) for each action. Rules shared between
  creating and updating (for example, a task's fields) live in a shared
  validation trait under `app/Concerns/` (`TaskValidationRules`,
  `ProjectValidationRules`), so `StoreTaskRequest` and `UpdateTaskRequest`
  don't duplicate the same rule list.
- **Policies** (`app/Policies/ProjectPolicy.php`) hold the authorization
  decisions ("who can view/edit/delete this project").
- **API Resources** (`app/Http/Resources/`) hold the serialization of models
  for the frontend, including computed fields like `health` and
  `overdue_percentage`.
- **Enums** (`app/Enums/`) hold the domain's closed sets of values
  (`TaskStatus`, `TaskPriority`, `ProjectHealthStatus`) and their business
  rules (such as `ProjectHealthStatus::fromCounts()`), instead of loose
  strings scattered across the codebase.
- **Controllers** (`app/Http/Controllers/`) stay thin: they receive an
  already validated and authorized Form Request, call Eloquent, and return a
  response.

More detail on how these pieces connect is in
[ARCHITECTURE.md](ARCHITECTURE.md).

## Security

- **Controlled mass assignment:** the models use Eloquent's `#[Fillable([...])]`
  attribute (`App\Models\Project`, `App\Models\Task`) to explicitly declare
  which columns can be mass-assigned, instead of `$guarded = []`.
- **Isolation between consultants through 404:**
  `ProjectPolicy::denyAsNotFound()` makes accessing another consultant's
  project look identical to that project not existing, instead of returning
  403 (which would confirm the resource exists). See the "Authorization"
  section in [ARCHITECTURE.md](ARCHITECTURE.md#authorization).
- **Trusted proxies:** `bootstrap/app.php` sets
  `$middleware->trustProxies(at: '*')` because Render sits behind an HTTPS
  reverse proxy; without it, Laravel would generate `http://` URLs in
  production, breaking redirects and assets.
  `tests/Feature/TrustedProxyTest.php` verifies that a request carrying the
  `X-Forwarded-Proto: https` header generates `https://` URLs.
- **Destructive commands blocked in production:**
  `DB::prohibitDestructiveCommands(app()->isProduction())`
  (`AppServiceProvider`) prevents commands like `migrate:fresh` from running
  by accident in production.
- **Strong passwords in production:** `AppServiceProvider` requires passwords
  with at least 12 characters, mixed case, letters, numbers, symbols, and a
  check against known breaches (`Password::uncompromised()`) whenever
  `app()->isProduction()` is true; in development and testing, Laravel's
  default rule applies.

## Internationalization (i18n)

The whole interface is in Brazilian Portuguese, including the starter kit's
screens (authentication, settings). Two layers handle this:

- **Backend:** strings go through `__()` with an English key (for example,
  `__('Project created.')` in `ProjectController`), and `lang/pt_BR.json`
  translates those keys to Portuguese. Laravel's default validation and
  authentication messages are translated in `lang/pt_BR/validation.php`,
  `lang/pt_BR/auth.php`, and `lang/pt_BR/passwords.php`. `APP_LOCALE=pt_BR`
  and `APP_FALLBACK_LOCALE=en` ensure a key without a translation still
  renders in English instead of breaking.
- **Frontend:** enum labels (`Pendente`, `Em Andamento`, `Concluída`, and so
  on) arrive ready-made from the backend through `HasOptions::toOption()`
  (`app/Concerns/HasOptions.php`), so React never needs to keep a second
  translation table for the same values.

## Accessibility

The Kanban board offers three equivalent ways to change a task's status:
dragging with the mouse, dragging with touch, and moving it with the
keyboard — all of them lead to the same optimistic update. This works because
`resources/js/components/tasks/kanban-board.tsx` configures all three
`@dnd-kit` sensors (`PointerSensor`, `TouchSensor`, `KeyboardSensor`) and
defines `screenReaderInstructions` and `announcements` in Portuguese, so a
screen reader announces when a task is picked up, which column it is over,
and when it is dropped — without those announcements, the drag-and-drop
interaction would be invisible to screen reader users. As an alternative path
that requires no dragging at all, every task card also has a status `select`
that triggers the same action.
