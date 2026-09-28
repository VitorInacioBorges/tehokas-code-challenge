# Checklist de Projetos (MVP): plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** construir o MVP em que um consultor autenticado cria Projetos, gerencia Tarefas num Kanban com drag-and-drop e vê um Indicador de Saúde, que fica "Em Alerta" quando mais de 20% das tarefas estão atrasadas.

**Arquitetura:** monólito Laravel 13 + Inertia v3 + React 19. O backend expõe páginas Inertia (sem API REST). A regra de "atrasada" vive num único scope Eloquent (`Task::overdue()`), e a regra de saúde numa função pura (`ProjectHealthStatus::fromCounts()`) alimentada por agregação SQL (`withCount`). A autorização usa uma Policy com `denyAsNotFound()`. A serialização usa API Resources resolvidas (`->resolve()`). O frontend usa o `<Form>` do Inertia e rotas do Wayfinder, e o Kanban usa `@dnd-kit` com atualização otimista (`router.optimistic`).

**Stack:** PHP 8.5, Laravel 13.33, Fortify, Inertia Laravel/React 3.7, React 19, TypeScript, Tailwind 4, shadcn/Radix, Wayfinder, Pest 5, SQLite.

**Spec:** `tehokas/docs/superpowers/specs/2026-09-27-checklist-projetos-design.md`

## Restrições globais

- Todos os comandos (`php`, `composer`, `npm`, `vendor/bin/*`) rodam em `tehokas/`. O git pode rodar de qualquer lugar do repositório.
- Dependência nova permitida: **somente** `@dnd-kit/core@^6.3.1` e `@dnd-kit/utilities@^3.2.2` (npm). Nenhuma dependência PHP nova.
- Código (classes, métodos, variáveis, rotas, chaves `__()`) fica em **inglês**. Textos visíveis ficam em **pt-BR**.
- Os textos novos do React são escritos direto em pt-BR. As mensagens do backend usam `__('English key.')` e ganham tradução em `lang/pt_BR.json` (Tarefa 10).
- Fuso horário: `America/Sao_Paulo`. O `deadline` é data + hora.
- "Atrasada" = `deadline < now()` **e** `status ≠ completed`. Alerta = **mais de** 20% (`overdue * 100 > total * 20`). Projeto sem tarefas = `no_tasks`.
- Projeto ou tarefa de outro usuário → **404** (`Response::denyAsNotFound()`).
- Os imports do Wayfinder seguem o padrão existente: `import ProjectController from '@/actions/App/Http/Controllers/ProjectController'` (default import), e rotas nomeadas vêm de `@/routes`.
- PHP: chaves em todo controle de fluxo, tipos de retorno explícitos, PHPDoc em vez de comentário inline, casos de enum em TitleCase. Depois de mudar PHP, rode `vendor/bin/pint --dirty --format agent`.
- Git: cada branch nasce da `develop` atualizada e vai para `develop` por PR, com **merge commit** (`gh pr merge --merge --delete-branch`). **Nunca** mexa em `main`.
- Commits no formato `Tipo(escopo): descrição em português`, terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Antes de cada PR: `composer ci:check` precisa passar (Pint, PHPStan nível 7, `vp check`, tsc e Pest).

## Foco da revisão

Estas são as situações que a spec implica e que um usuário real vai encontrar. Cada uma tem teste ou verificação na tarefa dona do código:

1. **Prazo vencendo em minutos:** uma tarefa com prazo daqui a 1 minuto **não** está atrasada, e uma com prazo de 1 minuto atrás **está**. A comparação é por data + hora, não só por data. (Tarefa 2)
2. **Ida e volta do `datetime-local`:** `2026-10-01T14:30` enviado pelo formulário é gravado como 14:30 em São Paulo e volta como `deadline_input = 2026-10-01T14:30`, sem deslocamento de fuso. (Tarefa 6)
3. **Mass assignment de dono:** enviar `user_id` ao criar projeto, ou `project_id` ao editar tarefa, **não** transfere nada para outro dono ou projeto. (Tarefas 4 e 6)
4. **Filtro com valor inválido na URL:** `?priority=urgente&status=xyz` é ignorado (lista tudo) e não causa erro 500 nem 422. (Tarefa 8)
5. **Soltar o card na mesma coluna:** não dispara requisição. Soltar fora de qualquer coluna também não. (Tarefa 7, verificação manual)

## Mapa de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `config/app.php`, `.env`, `.env.example` | Timezone (e locale na Tarefa 10) | 1, 10 |
| `app/Concerns/HasOptions.php` | Trait de enums: `toOption()` e `options()` | 1 |
| `app/Enums/TaskStatus.php`, `TaskPriority.php`, `ProjectHealthStatus.php` | Enums de domínio com labels pt-BR; regra de saúde | 1 |
| `database/migrations/*_create_projects_table.php`, `*_create_tasks_table.php` | Schema | 2 |
| `app/Models/Project.php`, `Task.php`, `User.php` | Relações, scopes, contagens, `health()` | 2, 8 |
| `database/factories/ProjectFactory.php`, `TaskFactory.php` | Dados de teste | 2 |
| `database/seeders/DatabaseSeeder.php` | Dados de demonstração | 3 |
| `app/Policies/ProjectPolicy.php` | Dono do projeto → allow, senão 404 | 4 |
| `app/Concerns/ProjectValidationRules.php`, `TaskValidationRules.php` | Regras compartilhadas entre Store/Update | 4, 6 |
| `app/Http/Requests/Projects/*`, `app/Http/Requests/Tasks/*` | Form Requests | 4, 6 |
| `app/Http/Resources/ProjectResource.php`, `TaskResource.php` | Formato das props enviadas ao React | 4, 6 |
| `app/Http/Controllers/DashboardController.php` | Lista de projetos + resumo | 4 |
| `app/Http/Controllers/ProjectController.php` | store/show/update/destroy | 4, 6, 8 |
| `app/Http/Controllers/TaskController.php`, `TaskStatusController.php` | CRUD de tarefa e mudança de status | 6 |
| `routes/projects.php`, `routes/web.php` | Rotas do domínio | 4, 6 |
| `resources/js/types/project.ts` | Tipos TS espelhando as Resources | 5 |
| `resources/js/components/ui/textarea.tsx` | Textarea shadcn | 5 |
| `resources/js/components/projects/*` | health-badge, project-card, project-form-dialog | 5, 7 |
| `resources/js/components/confirm-delete-dialog.tsx` | Dialog genérico de confirmação de exclusão | 7 |
| `resources/js/components/tasks/*` | kanban-board, kanban-column, task-card, task-form-dialog, task-filters | 7, 9 |
| `resources/js/lib/date.ts` | Formatação pt-BR do prazo | 7 |
| `resources/js/pages/dashboard.tsx`, `pages/projects/show.tsx` | Páginas | 5, 7, 9 |
| `lang/pt_BR/*.php`, `lang/pt_BR.json` | Traduções do backend | 10 |
| telas do starter kit (`pages/auth/*`, `pages/settings/*`, componentes, layouts, `welcome.tsx`) | Tradução pt-BR | 11 |
| `compose.yaml`, `README.md` (raiz) | Sail e documentação | 12 |

---

# Branch 1: `feat/domain-model`

- [ ] **Passo 0: criar a branch**

```bash
git switch develop && git pull
git switch -c feat/domain-model
```

### Tarefa 1: timezone e enums de domínio

**Arquivos:**
- Modificar: `config/app.php` (linha `'timezone' => 'UTC',`), `.env`, `.env.example`
- Criar: `app/Concerns/HasOptions.php`, `app/Enums/TaskStatus.php`, `app/Enums/TaskPriority.php`, `app/Enums/ProjectHealthStatus.php`
- Testes: `tests/Unit/Enums/ProjectHealthStatusTest.php`, `tests/Unit/Enums/TaskEnumsTest.php`

**Interfaces:**
- Produz:
  - `TaskStatus` (`Pending='pending'`, `InProgress='in_progress'`, `Completed='completed'`);
  - `TaskPriority` (`Low='low'`, `Medium='medium'`, `High='high'`);
  - `ProjectHealthStatus` (`NoTasks='no_tasks'`, `Healthy='healthy'`, `Alert='alert'`);
  - em todos: `label(): string`, `toOption(): array{value: string, label: string}` e `static options(): list<array{value: string, label: string}>`;
  - `ProjectHealthStatus::fromCounts(int $totalTasks, int $overdueTasks): self` e `ProjectHealthStatus::ALERT_THRESHOLD_PERCENT = 20`.

- [ ] **Passo 1: escrever os testes que falham**

`tests/Unit/Enums/ProjectHealthStatusTest.php`:

```php
<?php

use App\Enums\ProjectHealthStatus;

test('health status is derived from task counts', function (int $totalTasks, int $overdueTasks, ProjectHealthStatus $expected) {
    expect(ProjectHealthStatus::fromCounts($totalTasks, $overdueTasks))->toBe($expected);
})->with([
    'no tasks' => [0, 0, ProjectHealthStatus::NoTasks],
    'no overdue tasks' => [3, 0, ProjectHealthStatus::Healthy],
    'exactly 20 percent overdue' => [10, 2, ProjectHealthStatus::Healthy],
    'exactly 20 percent overdue in a small project' => [5, 1, ProjectHealthStatus::Healthy],
    'exactly 20 percent overdue in a large project' => [100, 20, ProjectHealthStatus::Healthy],
    'just above 20 percent overdue' => [100, 21, ProjectHealthStatus::Alert],
    '30 percent overdue' => [10, 3, ProjectHealthStatus::Alert],
    '25 percent overdue' => [4, 1, ProjectHealthStatus::Alert],
    'every task overdue' => [1, 1, ProjectHealthStatus::Alert],
]);

test('health status exposes portuguese labels', function () {
    expect(ProjectHealthStatus::NoTasks->label())->toBe('Sem tarefas')
        ->and(ProjectHealthStatus::Healthy->label())->toBe('Saudável')
        ->and(ProjectHealthStatus::Alert->label())->toBe('Em Alerta');
});

test('health status converts to a frontend option', function () {
    expect(ProjectHealthStatus::Alert->toOption())->toBe(['value' => 'alert', 'label' => 'Em Alerta']);
});
```

`tests/Unit/Enums/TaskEnumsTest.php`:

```php
<?php

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;

test('task status options keep the kanban column order', function () {
    expect(TaskStatus::options())->toBe([
        ['value' => 'pending', 'label' => 'Pendente'],
        ['value' => 'in_progress', 'label' => 'Em Andamento'],
        ['value' => 'completed', 'label' => 'Concluída'],
    ]);
});

test('task priority options go from lowest to highest', function () {
    expect(TaskPriority::options())->toBe([
        ['value' => 'low', 'label' => 'Baixa'],
        ['value' => 'medium', 'label' => 'Média'],
        ['value' => 'high', 'label' => 'Alta'],
    ]);
});
```

- [ ] **Passo 2: rodar e confirmar a falha**

Rodar: `php artisan test --compact tests/Unit/Enums`
Esperado: FAIL com `Class "App\Enums\ProjectHealthStatus" not found`.

- [ ] **Passo 3: implementar**

`app/Concerns/HasOptions.php`:

```php
<?php

namespace App\Concerns;

/**
 * Exposes a backed enum's cases as value/label pairs for the frontend.
 */
trait HasOptions
{
    /**
     * Get the human-readable label for the case.
     */
    abstract public function label(): string;

    /**
     * Get the case as a value/label pair.
     *
     * @return array{value: string, label: string}
     */
    public function toOption(): array
    {
        return ['value' => $this->value, 'label' => $this->label()];
    }

    /**
     * Get every case as a value/label pair, in declaration order.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => $case->toOption(), self::cases());
    }
}
```

`app/Enums/TaskStatus.php`:

```php
<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum TaskStatus: string
{
    use HasOptions;

    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Completed = 'completed';

    /**
     * Get the human-readable label for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pendente',
            self::InProgress => 'Em Andamento',
            self::Completed => 'Concluída',
        };
    }
}
```

`app/Enums/TaskPriority.php`:

```php
<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum TaskPriority: string
{
    use HasOptions;

    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';

    /**
     * Get the human-readable label for the priority.
     */
    public function label(): string
    {
        return match ($this) {
            self::Low => 'Baixa',
            self::Medium => 'Média',
            self::High => 'Alta',
        };
    }
}
```

`app/Enums/ProjectHealthStatus.php`:

```php
<?php

namespace App\Enums;

use App\Concerns\HasOptions;

enum ProjectHealthStatus: string
{
    use HasOptions;

    /**
     * A project is in alert when MORE than this percentage of its tasks is overdue.
     */
    public const ALERT_THRESHOLD_PERCENT = 20;

    case NoTasks = 'no_tasks';
    case Healthy = 'healthy';
    case Alert = 'alert';

    /**
     * Derive the project's health from its task counts.
     *
     * Integer arithmetic keeps the 20% boundary exact (no floating point error).
     */
    public static function fromCounts(int $totalTasks, int $overdueTasks): self
    {
        if ($totalTasks === 0) {
            return self::NoTasks;
        }

        return $overdueTasks * 100 > $totalTasks * self::ALERT_THRESHOLD_PERCENT
            ? self::Alert
            : self::Healthy;
    }

    /**
     * Get the human-readable label for the health status.
     */
    public function label(): string
    {
        return match ($this) {
            self::NoTasks => 'Sem tarefas',
            self::Healthy => 'Saudável',
            self::Alert => 'Em Alerta',
        };
    }
}
```

Em `config/app.php`, trocar `'timezone' => 'UTC',` por:

```php
    'timezone' => env('APP_TIMEZONE', 'America/Sao_Paulo'),
```

Em `.env` e `.env.example`, logo abaixo de `APP_URL=...`, adicionar:

```dotenv
APP_TIMEZONE=America/Sao_Paulo
```

- [ ] **Passo 4: rodar e confirmar que passa**

Rodar: `php artisan test --compact tests/Unit/Enums`
Esperado: PASS (12 testes).

- [ ] **Passo 5: formatar e fazer o commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Concerns/HasOptions.php app/Enums tests/Unit/Enums config/app.php .env.example
git commit -m "Feat(domain): adiciona enums de status, prioridade e saúde do projeto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(O `.env` é ignorado pelo git. A mudança local nele serve só para o ambiente de desenvolvimento.)

### Tarefa 2: migrations, models, factories e a regra de "atrasada"

**Arquivos:**
- Criar (via artisan): `app/Models/Project.php`, `app/Models/Task.php`, `database/factories/ProjectFactory.php`, `database/factories/TaskFactory.php`, `database/migrations/*_create_projects_table.php`, `database/migrations/*_create_tasks_table.php`
- Modificar: `app/Models/User.php` (adicionar relação `projects()`)
- Testes: `tests/Feature/Models/TaskOverdueTest.php`, `tests/Feature/Models/ProjectHealthTest.php`

**Interfaces:**
- Consome: `TaskStatus`, `TaskPriority` e `ProjectHealthStatus` (Tarefa 1).
- Produz:
  - `User::projects(): HasMany<Project>`;
  - `Project::user()`, `Project::tasks(): HasMany<Task>`;
  - `Project::taskCountDefinitions(): array` (para `withCount`/`loadCount`);
  - scope `Project::withTaskCounts()`, que preenche `tasks_count`, `overdue_tasks_count` e `completed_tasks_count`;
  - `Project::health(): ProjectHealthStatus` e `Project::overduePercentage(): int` (lançam `LogicException` se as contagens não foram carregadas);
  - `Task::project()`, scope `Task::overdue()` e o accessor `$task->is_overdue` (bool);
  - factories `ProjectFactory` e `TaskFactory` com os estados `pending()`, `inProgress()`, `completed()`, `overdue()` e `priority(TaskPriority)`.

- [ ] **Passo 1: gerar os arquivos**

```bash
php artisan make:model Project -mf --no-interaction
php artisan make:model Task -mf --no-interaction
```

Confirme com `ls database/migrations` que a migration de `projects` vem antes da de `tasks` (a de `tasks` depende de `projects`).

- [ ] **Passo 2: escrever os testes que falham**

`tests/Feature/Models/TaskOverdueTest.php`:

```php
<?php

use App\Enums\TaskStatus;
use App\Models\Task;
use Illuminate\Support\Facades\Date;

beforeEach(function () {
    $this->travelTo(Date::parse('2026-10-01 12:00:00'));
});

test('an open task past its deadline is overdue', function (TaskStatus $status) {
    $task = Task::factory()->create(['status' => $status, 'deadline' => now()->subMinute()]);

    expect($task->is_overdue)->toBeTrue()
        ->and(Task::query()->overdue()->pluck('id')->all())->toBe([$task->id]);
})->with([
    'pending' => [TaskStatus::Pending],
    'in progress' => [TaskStatus::InProgress],
]);

test('a completed task is never overdue', function () {
    $task = Task::factory()->completed()->create(['deadline' => now()->subDays(5)]);

    expect($task->is_overdue)->toBeFalse()
        ->and(Task::query()->overdue()->exists())->toBeFalse();
});

test('a task due in the future is not overdue', function () {
    $task = Task::factory()->pending()->create(['deadline' => now()->addMinute()]);

    expect($task->is_overdue)->toBeFalse()
        ->and(Task::query()->overdue()->exists())->toBeFalse();
});
```

`tests/Feature/Models/ProjectHealthTest.php`:

```php
<?php

use App\Enums\ProjectHealthStatus;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\Date;

beforeEach(function () {
    $this->travelTo(Date::parse('2026-10-01 12:00:00'));
});

test('task counts and health are computed in a single query', function () {
    $project = Project::factory()->create();
    Task::factory()->for($project)->overdue()->count(3)->create();
    Task::factory()->for($project)->completed()->count(2)->create();
    Task::factory()->for($project)->pending()->count(5)->create();

    $project = Project::query()->withTaskCounts()->findOrFail($project->id);

    expect($project->tasks_count)->toBe(10)
        ->and($project->overdue_tasks_count)->toBe(3)
        ->and($project->completed_tasks_count)->toBe(2)
        ->and($project->overduePercentage())->toBe(30)
        ->and($project->health())->toBe(ProjectHealthStatus::Alert);
});

test('a project without tasks has its own health state', function () {
    $project = Project::factory()->create();

    $project->loadCount(Project::taskCountDefinitions());

    expect($project->health())->toBe(ProjectHealthStatus::NoTasks)
        ->and($project->overduePercentage())->toBe(0);
});

test('reading health without loading the counts fails loudly', function () {
    $project = Project::factory()->create();

    $project->health();
})->throws(LogicException::class);

test('deleting a project deletes its tasks', function () {
    $project = Project::factory()->create();
    Task::factory()->for($project)->count(2)->create();

    $project->delete();

    expect(Task::query()->count())->toBe(0);
});
```

- [ ] **Passo 3: rodar e confirmar a falha**

Rodar: `php artisan test --compact tests/Feature/Models`
Esperado: FAIL (tabelas e colunas inexistentes, `Call to undefined method ... overdue()` etc.).

- [ ] **Passo 4: implementar migrations, models e factories**

Migration `database/migrations/*_create_projects_table.php`, método `up()`:

```php
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->index()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }
```

Migration `database/migrations/*_create_tasks_table.php`, método `up()`:

```php
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('pending');
            $table->string('priority')->default('medium');
            $table->dateTime('deadline');
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'deadline']);
        });
    }
```

`app/Models/Project.php`:

```php
<?php

namespace App\Models;

use App\Enums\ProjectHealthStatus;
use App\Enums\TaskStatus;
use Closure;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string|null $description
 * @property int|null $tasks_count
 * @property int|null $overdue_tasks_count
 * @property int|null $completed_tasks_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'description'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    /**
     * Get the consultant who owns the project.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the project's tasks.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * The task aggregates needed to compute the project's health and progress.
     *
     * @return array<int|string, string|Closure(Builder<Task>): mixed>
     */
    public static function taskCountDefinitions(): array
    {
        return [
            'tasks',
            'tasks as overdue_tasks_count' => fn (Builder $query) => $query->overdue(),
            'tasks as completed_tasks_count' => fn (Builder $query) => $query->where('status', TaskStatus::Completed),
        ];
    }

    /**
     * Load the task aggregates alongside the projects in a single query.
     *
     * @param  Builder<Project>  $query
     */
    #[Scope]
    protected function withTaskCounts(Builder $query): void
    {
        $query->withCount(self::taskCountDefinitions());
    }

    /**
     * Get the project's health indicator.
     */
    public function health(): ProjectHealthStatus
    {
        return ProjectHealthStatus::fromCounts(
            $this->loadedCount('tasks_count'),
            $this->loadedCount('overdue_tasks_count'),
        );
    }

    /**
     * Get the rounded percentage of overdue tasks.
     */
    public function overduePercentage(): int
    {
        $totalTasks = $this->loadedCount('tasks_count');

        if ($totalTasks === 0) {
            return 0;
        }

        return (int) round($this->loadedCount('overdue_tasks_count') * 100 / $totalTasks);
    }

    /**
     * Read an aggregate loaded by withTaskCounts(), failing if it was not loaded.
     */
    private function loadedCount(string $attribute): int
    {
        $value = $this->getAttribute($attribute);

        if ($value === null) {
            throw new LogicException("Load the task counts with withTaskCounts() before reading [{$attribute}].");
        }

        return (int) $value;
    }
}
```

`app/Models/Task.php`:

```php
<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $project_id
 * @property string $title
 * @property string|null $description
 * @property TaskStatus $status
 * @property TaskPriority $priority
 * @property Carbon $deadline
 * @property-read bool $is_overdue
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['title', 'description', 'status', 'priority', 'deadline'])]
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    /**
     * The model's default attribute values.
     *
     * @var array<string, string>
     */
    protected $attributes = [
        'status' => 'pending',
        'priority' => 'medium',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => TaskStatus::class,
            'priority' => TaskPriority::class,
            'deadline' => 'datetime',
        ];
    }

    /**
     * Get the project the task belongs to.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The single definition of an overdue task: past its deadline and not completed.
     *
     * @param  Builder<Task>  $query
     */
    #[Scope]
    protected function overdue(Builder $query): void
    {
        $query->where('deadline', '<', now())
            ->where('status', '!=', TaskStatus::Completed);
    }

    /**
     * Determine whether this task is overdue (mirrors the overdue scope).
     *
     * @return Attribute<bool, never>
     */
    protected function isOverdue(): Attribute
    {
        return Attribute::get(
            fn (): bool => $this->status !== TaskStatus::Completed && $this->deadline->isPast(),
        );
    }
}
```

Em `app/Models/User.php`, adicionar o import `use Illuminate\Database\Eloquent\Relations\HasMany;` e, depois de `casts()`:

```php
    /**
     * Get the projects owned by the consultant.
     *
     * @return HasMany<Project, $this>
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
```

`database/factories/ProjectFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->catchPhrase(),
            'description' => fake()->optional()->sentence(12),
        ];
    }
}
```

`database/factories/TaskFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state: a pending, medium priority task due in the future.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'status' => TaskStatus::Pending,
            'priority' => TaskPriority::Medium,
            'deadline' => now()->addDays(fake()->numberBetween(1, 30)),
        ];
    }

    /**
     * Indicate that the task is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => ['status' => TaskStatus::Pending]);
    }

    /**
     * Indicate that the task is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => ['status' => TaskStatus::InProgress]);
    }

    /**
     * Indicate that the task is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => ['status' => TaskStatus::Completed]);
    }

    /**
     * Indicate that the task is open and past its deadline.
     */
    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TaskStatus::Pending,
            'deadline' => now()->subDays(fake()->numberBetween(1, 30)),
        ]);
    }

    /**
     * Set the task's priority.
     */
    public function priority(TaskPriority $priority): static
    {
        return $this->state(fn (array $attributes) => ['priority' => $priority]);
    }
}
```

- [ ] **Passo 5: rodar e confirmar que passa**

Rodar: `php artisan test --compact tests/Feature/Models`
Esperado: PASS (7 testes).

Rodar: `vendor/bin/phpstan analyse`
Esperado: `[OK] No errors`.

Se o Larastan reclamar de `overdue()` em `Builder<Task>` dentro de `taskCountDefinitions()`, **não** copie a condição do scope para a closure, porque isso duplicaria a regra de "atrasada". Faça assim:
1. Anote a closure com `/** @param Builder<Task> $query */` e rode de novo.
2. Se ainda falhar, adicione a mensagem exata do erro em `ignoreErrors` no `phpstan.neon`, com um comentário explicando que é uma limitação do Larastan com `#[Scope]`.

- [ ] **Passo 6: formatar e fazer o commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models database/migrations database/factories tests/Feature/Models phpstan.neon
git commit -m "Feat(domain): adiciona models Project e Task com regra de tarefa atrasada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 3: seeder de demonstração e PR da branch

**Arquivos:**
- Modificar: `database/seeders/DatabaseSeeder.php`
- Teste: `tests/Feature/DatabaseSeederTest.php`

**Interfaces:**
- Consome: models, factories e `Project::withTaskCounts()` / `health()` (Tarefa 2).
- Produz: o usuário de demonstração `consultor@tehokas.test` / `password` com 3 projetos (saudável, em alerta e sem tarefas). O README (Tarefa 12) cita essas credenciais.

- [ ] **Passo 1: escrever o teste que falha**

`tests/Feature/DatabaseSeederTest.php`:

```php
<?php

use App\Models\Project;
use App\Models\User;

test('the demo seeder creates one project per health state', function () {
    $this->seed();

    $consultant = User::query()->where('email', 'consultor@tehokas.test')->firstOrFail();

    $healthStates = $consultant->projects()
        ->withTaskCounts()
        ->get()
        ->map(fn (Project $project): string => $project->health()->value)
        ->sort()
        ->values()
        ->all();

    expect($healthStates)->toBe(['alert', 'healthy', 'no_tasks']);
});
```

- [ ] **Passo 2: rodar e confirmar a falha**

Rodar: `php artisan test --compact tests/Feature/DatabaseSeederTest.php`
Esperado: FAIL com `ModelNotFoundException` (o usuário ainda não existe).

- [ ] **Passo 3: implementar o seeder**

`database/seeders/DatabaseSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed a demo consultant with one project per health state.
     */
    public function run(): void
    {
        $consultant = User::factory()->create([
            'name' => 'Consultor Tehokas',
            'email' => 'consultor@tehokas.test',
        ]);

        $healthyProject = Project::factory()->for($consultant)->create([
            'name' => 'Implantação de ERP · Cliente Alfa',
            'description' => 'Migração do controle financeiro de planilhas para o novo ERP.',
        ]);

        $this->createTasks($healthyProject, [
            ['Levantar requisitos com o financeiro', TaskStatus::Completed, TaskPriority::High, -10],
            ['Mapear plano de contas atual', TaskStatus::Completed, TaskPriority::Medium, -6],
            ['Configurar centros de custo', TaskStatus::InProgress, TaskPriority::High, -1],
            ['Importar saldos iniciais', TaskStatus::InProgress, TaskPriority::Medium, 3],
            ['Treinar equipe de contas a pagar', TaskStatus::Pending, TaskPriority::Low, 7],
            ['Validar primeiro fechamento mensal', TaskStatus::Pending, TaskPriority::High, 20],
        ]);

        $alertProject = Project::factory()->for($consultant)->create([
            'name' => 'Mapeamento de Processos · Cliente Beta',
            'description' => 'Documentação dos processos de compras e recebimento.',
        ]);

        $this->createTasks($alertProject, [
            ['Entrevistar comprador responsável', TaskStatus::Pending, TaskPriority::High, -4],
            ['Desenhar fluxo AS-IS de compras', TaskStatus::InProgress, TaskPriority::Medium, -2],
            ['Coletar notas fiscais de exemplo', TaskStatus::Completed, TaskPriority::Low, -8],
            ['Desenhar fluxo TO-BE', TaskStatus::Pending, TaskPriority::Medium, 5],
            ['Apresentar diagnóstico à diretoria', TaskStatus::Pending, TaskPriority::High, 12],
        ]);

        Project::factory()->for($consultant)->create([
            'name' => 'Auditoria de Qualidade · Cliente Gama',
            'description' => 'Projeto recém-criado, aguardando o planejamento das tarefas.',
        ]);
    }

    /**
     * Create tasks for a project; deadlines are relative to today so the demo never goes stale.
     *
     * @param  list<array{0: string, 1: TaskStatus, 2: TaskPriority, 3: int}>  $tasks  title, status, priority and deadline offset in days
     */
    private function createTasks(Project $project, array $tasks): void
    {
        foreach ($tasks as [$title, $status, $priority, $deadlineInDays]) {
            Task::factory()->for($project)->create([
                'title' => $title,
                'description' => null,
                'status' => $status,
                'priority' => $priority,
                'deadline' => now()->addDays($deadlineInDays)->setTime(18, 0),
            ]);
        }
    }
}
```

Conferência da demo: o Alfa tem 1 atrasada em 6 (17%, Saudável); o Beta tem 2 atrasadas em 5 (40%, Em Alerta); o Gama não tem tarefas.

- [ ] **Passo 4: rodar e confirmar que passa**

Rodar: `php artisan test --compact tests/Feature/DatabaseSeederTest.php`
Esperado: PASS.

- [ ] **Passo 5: fazer o commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/seeders/DatabaseSeeder.php tests/Feature/DatabaseSeederTest.php
git commit -m "Feat(seed): adiciona consultor e projetos de demonstração

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Passo 6: verificação completa, push e PR para `develop`**

```bash
composer ci:check
git push -u origin feat/domain-model
gh pr create --base develop --head feat/domain-model \
  --title "Feat(domain): modelo de dados de projetos e tarefas" \
  --body "$(cat <<'EOF'
## Resumo
- Enums `TaskStatus`, `TaskPriority` e `ProjectHealthStatus` com labels pt-BR.
- Models `Project` e `Task`, com a regra única de tarefa atrasada (`Task::overdue()`) e o indicador de saúde calculado por agregação SQL (`withTaskCounts()`).
- Seeder de demonstração com um projeto por estado de saúde.

## Testes
- Unit: bordas da regra de 20% (incluindo exatamente 20%).
- Feature: tarefa atrasada por data + hora, contagens e cascade.
- `composer ci:check` passando.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge feat/domain-model --merge --delete-branch
git switch develop && git pull
```

Esperado: `ci:check` sem erros, e o PR aparece como mergeado na `develop`.

---

# Branch 2: `feat/dashboard`

- [ ] **Passo 0: criar a branch**

```bash
git switch develop && git pull
git switch -c feat/dashboard
```

### Tarefa 4: backend do dashboard e CRUD de projetos

**Arquivos:**
- Criar: `app/Policies/ProjectPolicy.php`, `app/Concerns/ProjectValidationRules.php`, `app/Http/Requests/Projects/StoreProjectRequest.php`, `app/Http/Requests/Projects/UpdateProjectRequest.php`, `app/Http/Resources/ProjectResource.php`, `app/Http/Controllers/DashboardController.php`, `app/Http/Controllers/ProjectController.php`, `routes/projects.php`
- Modificar: `routes/web.php`
- Testes: `tests/Feature/DashboardTest.php` (ampliar o existente), `tests/Feature/Projects/ProjectManagementTest.php`

**Interfaces:**
- Consome: `Project::withTaskCounts()`, `health()`, `overduePercentage()`, `User::projects()` e `ProjectHealthStatus::Alert` (Tarefas 1-2).
- Produz:
  - rotas nomeadas `dashboard` (GET `/dashboard`), `projects.store` (POST `/projects`), `projects.update` (PATCH `/projects/{project}`) e `projects.destroy` (DELETE `/projects/{project}`);
  - `ProjectPolicy::view|update|delete(User, Project): Response`;
  - `ProjectResource` com as chaves `id`, `name`, `description`, `tasks_count`, `completed_tasks_count`, `overdue_tasks_count`, `overdue_percentage` e `health{value,label}`;
  - props da página `dashboard`: `projects: ProjectResource[]` e `summary{total_projects, projects_in_alert, overdue_tasks}`.

- [ ] **Passo 1: escrever os testes que falham**

Substituir `tests/Feature/DashboardTest.php` por:

```php
<?php

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('the dashboard lists only the user projects with their health and a summary', function () {
    $this->travelTo(Date::parse('2026-10-01 12:00:00'));

    $user = User::factory()->create();
    $alertProject = Project::factory()->for($user)->create(['name' => 'Projeto em alerta']);
    Task::factory()->for($alertProject)->overdue()->create();
    Task::factory()->for($alertProject)->pending()->create();
    Project::factory()->for($user)->create(['name' => 'Projeto vazio']);
    Project::factory()->create(['name' => 'Projeto de outra pessoa']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('projects', 2)
            ->where('projects.0.name', 'Projeto vazio')
            ->where('projects.0.health.value', 'no_tasks')
            ->where('projects.1.name', 'Projeto em alerta')
            ->where('projects.1.health', ['value' => 'alert', 'label' => 'Em Alerta'])
            ->where('projects.1.tasks_count', 2)
            ->where('projects.1.overdue_tasks_count', 1)
            ->where('projects.1.overdue_percentage', 50)
            ->where('summary.total_projects', 2)
            ->where('summary.projects_in_alert', 1)
            ->where('summary.overdue_tasks', 1));
});
```

`tests/Feature/Projects/ProjectManagementTest.php`:

```php
<?php

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

test('a consultant can create a project', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('projects.store'), [
        'name' => 'Implantação de CRM',
        'description' => 'Projeto piloto',
    ]);

    $project = Project::query()->sole();
    $response->assertSessionHasNoErrors()->assertRedirect(route('dashboard'));
    expect($project->name)->toBe('Implantação de CRM')
        ->and($project->user_id)->toBe($user->id);
});

test('a project cannot be created for someone else', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $this->actingAs($user)->post(route('projects.store'), [
        'name' => 'Implantação de CRM',
        'user_id' => $otherUser->id,
    ]);

    expect(Project::query()->sole()->user_id)->toBe($user->id);
});

test('a project requires a name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('projects.store'), ['name' => ''])
        ->assertSessionHasErrors('name');

    expect(Project::query()->count())->toBe(0);
});

test('a consultant can update their project', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->from(route('dashboard'))
        ->patch(route('projects.update', $project), ['name' => 'Novo nome', 'description' => null])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('dashboard'));

    expect($project->refresh()->name)->toBe('Novo nome');
});

test('a consultant can delete their project and its tasks', function () {
    $project = Project::factory()->create();
    Task::factory()->for($project)->count(2)->create();

    $this->actingAs($project->user)
        ->delete(route('projects.destroy', $project))
        ->assertRedirect(route('dashboard'));

    expect(Project::query()->count())->toBe(0)
        ->and(Task::query()->count())->toBe(0);
});

test('projects of other consultants are not found', function (string $method, string $routeName) {
    $project = Project::factory()->create(['name' => 'Original']);
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->{$method}(route($routeName, $project), ['name' => 'Invadido'])
        ->assertNotFound();

    expect($project->refresh()->name)->toBe('Original');
})->with([
    'update' => ['patch', 'projects.update'],
    'delete' => ['delete', 'projects.destroy'],
]);

test('guests cannot manage projects', function () {
    $this->post(route('projects.store'), ['name' => 'X'])->assertRedirect(route('login'));
});
```

- [ ] **Passo 2: rodar e confirmar a falha**

Rodar: `php artisan test --compact tests/Feature/DashboardTest.php tests/Feature/Projects`
Esperado: FAIL (`Route [projects.store] not defined`, props ausentes).

- [ ] **Passo 3: implementar policy, regras e requests**

`app/Policies/ProjectPolicy.php`:

```php
<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectPolicy
{
    /**
     * Determine whether the user can view the project (and its tasks).
     */
    public function view(User $user, Project $project): Response
    {
        return $this->ownership($user, $project);
    }

    /**
     * Determine whether the user can update the project or manage its tasks.
     */
    public function update(User $user, Project $project): Response
    {
        return $this->ownership($user, $project);
    }

    /**
     * Determine whether the user can delete the project.
     */
    public function delete(User $user, Project $project): Response
    {
        return $this->ownership($user, $project);
    }

    /**
     * Only the owner may access a project; everyone else gets a 404 so its existence is not revealed.
     */
    private function ownership(User $user, Project $project): Response
    {
        return $user->id === $project->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
```

`app/Concerns/ProjectValidationRules.php`:

```php
<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;

trait ProjectValidationRules
{
    /**
     * Get the validation rules used to create and update projects.
     *
     * @return array<string, array<int, ValidationRule|string>>
     */
    protected function projectRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
```

`app/Http/Requests/Projects/StoreProjectRequest.php`:

```php
<?php

namespace App\Http\Requests\Projects;

use App\Concerns\ProjectValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    use ProjectValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return $this->projectRules();
    }
}
```

`app/Http/Requests/Projects/UpdateProjectRequest.php`:

```php
<?php

namespace App\Http\Requests\Projects;

use App\Concerns\ProjectValidationRules;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateProjectRequest extends FormRequest
{
    use ProjectValidationRules;

    /**
     * Only the project's owner may update it.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('project'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return $this->projectRules();
    }
}
```

(Quando `authorize()` devolve um `Response`, a `FormRequest` chama `->authorize()` nele, então o `denyAsNotFound()` vira 404. Isso foi confirmado em `FormRequest::passesAuthorization()`.)

- [ ] **Passo 4: implementar resource, controllers e rotas**

`app/Http/Resources/ProjectResource.php`:

```php
<?php

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Project
 */
class ProjectResource extends JsonResource
{
    /**
     * Transform the project into the shape consumed by the React pages.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'tasks_count' => (int) $this->tasks_count,
            'completed_tasks_count' => (int) $this->completed_tasks_count,
            'overdue_tasks_count' => (int) $this->overdue_tasks_count,
            'overdue_percentage' => $this->overduePercentage(),
            'health' => $this->health()->toOption(),
        ];
    }
}
```

**Importante:** sempre passe as resources como props com `->resolve($request)`. Uma `JsonResource` passada direto é serializada pelo Inertia via `toResponse()`, que embrulha tudo em `{ data: ... }`.

`app/Http/Controllers/DashboardController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Enums\ProjectHealthStatus;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the consultant's projects with their health indicator.
     */
    public function __invoke(Request $request): Response
    {
        $projects = $request->user()->projects()
            ->withTaskCounts()
            ->orderByDesc('id')
            ->get();

        return Inertia::render('dashboard', [
            'projects' => ProjectResource::collection($projects)->resolve($request),
            'summary' => [
                'total_projects' => $projects->count(),
                'projects_in_alert' => $projects
                    ->filter(fn (Project $project): bool => $project->health() === ProjectHealthStatus::Alert)
                    ->count(),
                'overdue_tasks' => (int) $projects->sum('overdue_tasks_count'),
            ],
        ]);
    }
}
```

`app/Http/Controllers/ProjectController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class ProjectController extends Controller
{
    /**
     * Create a project for the authenticated consultant.
     */
    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $request->user()->projects()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project created.')]);

        return to_route('dashboard');
    }

    /**
     * Update the project's details.
     */
    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $project->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project updated.')]);

        return back();
    }

    /**
     * Delete the project and, through the foreign key cascade, its tasks.
     */
    public function destroy(Project $project): RedirectResponse
    {
        Gate::authorize('delete', $project);

        $project->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project deleted.')]);

        return to_route('dashboard');
    }
}
```

`routes/projects.php`:

```php
<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::resource('projects', ProjectController::class)->only(['store', 'update', 'destroy']);
});
```

`routes/web.php` fica assim:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

require __DIR__.'/projects.php';
require __DIR__.'/settings.php';
```

- [ ] **Passo 5: rodar e confirmar que passa**

Rodar: `php artisan test --compact tests/Feature/DashboardTest.php tests/Feature/Projects`
Esperado: PASS (10 testes).

Rodar: `php artisan route:list --path=projects` e `php artisan route:list --name=dashboard`
Esperado: as 4 rotas listadas, com os middlewares `auth` e `verified`.

- [ ] **Passo 6: fazer o commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Policies app/Concerns/ProjectValidationRules.php app/Http routes tests/Feature/DashboardTest.php tests/Feature/Projects
git commit -m "Feat(projects): adiciona dashboard com indicador de saúde e CRUD de projetos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 5: frontend do dashboard

**Arquivos:**
- Criar: `resources/js/types/project.ts`, `resources/js/components/ui/textarea.tsx`, `resources/js/components/projects/health-badge.tsx`, `resources/js/components/projects/project-card.tsx`, `resources/js/components/projects/project-form-dialog.tsx`
- Modificar: `resources/js/types/index.ts`, `resources/js/pages/dashboard.tsx` (reescrever), `resources/js/components/app-sidebar.tsx`, `resources/js/components/app-header.tsx`

**Interfaces:**
- Consome: as props `projects` e `summary` (Tarefa 4) e o Wayfinder `ProjectController.store/update`.
- Produz:
  - tipos `Project`, `Task`, `EnumOption<T>`, `TaskStatusValue`, `TaskPriorityValue`, `ProjectHealthValue`, `DashboardSummary`;
  - componentes `HealthBadge({ health })`, `ProjectCard({ project })` e `ProjectFormDialog({ project?, trigger, open?, onOpenChange? })`;
  - `Textarea`, com a mesma API do `<textarea>`.

- [ ] **Passo 1: tipos**

`resources/js/types/project.ts`:

```ts
export type EnumOption<T extends string = string> = {
    value: T;
    label: string;
};

export type TaskStatusValue = 'pending' | 'in_progress' | 'completed';
export type TaskPriorityValue = 'low' | 'medium' | 'high';
export type ProjectHealthValue = 'no_tasks' | 'healthy' | 'alert';

export type Project = {
    id: number;
    name: string;
    description: string | null;
    tasks_count: number;
    completed_tasks_count: number;
    overdue_tasks_count: number;
    overdue_percentage: number;
    health: EnumOption<ProjectHealthValue>;
};

export type Task = {
    id: number;
    title: string;
    description: string | null;
    status: EnumOption<TaskStatusValue>;
    priority: EnumOption<TaskPriorityValue>;
    deadline: string;
    deadline_input: string;
    is_overdue: boolean;
};

export type DashboardSummary = {
    total_projects: number;
    projects_in_alert: number;
    overdue_tasks: number;
};
```

Em `resources/js/types/index.ts`, adicionar:

```ts
export type * from './project';
```

- [ ] **Passo 2: textarea e badge de saúde**

`resources/js/components/ui/textarea.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
```

`resources/js/components/projects/health-badge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EnumOption, ProjectHealthValue } from '@/types';

const healthStyles: Record<ProjectHealthValue, string> = {
    healthy:
        'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    alert: 'border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    no_tasks:
        'border-transparent bg-muted text-muted-foreground dark:bg-muted/60',
};

export default function HealthBadge({
    health,
    className,
}: {
    health: EnumOption<ProjectHealthValue>;
    className?: string;
}) {
    return (
        <Badge className={cn(healthStyles[health.value], className)}>
            <span
                aria-hidden
                className={cn(
                    'size-1.5 rounded-full',
                    health.value === 'healthy' && 'bg-emerald-500',
                    health.value === 'alert' && 'bg-red-500',
                    health.value === 'no_tasks' && 'bg-muted-foreground',
                )}
            />
            {health.label}
        </Badge>
    );
}
```

- [ ] **Passo 3: dialog de formulário de projeto**

`resources/js/components/projects/project-form-dialog.tsx`:

```tsx
import { Form } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import ProjectController from '@/actions/App/Http/Controllers/ProjectController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Project } from '@/types';

type ProjectFormDialogProps = {
    project?: Project;
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

export default function ProjectFormDialog({
    project,
    trigger,
    open: controlledOpen,
    onOpenChange,
}: ProjectFormDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = onOpenChange ?? setUncontrolledOpen;
    const isEditing = project !== undefined;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogTitle>
                    {isEditing ? 'Editar projeto' : 'Novo projeto'}
                </DialogTitle>
                <DialogDescription>
                    {isEditing
                        ? 'Atualize o nome e a descrição do projeto.'
                        : 'Crie um projeto para organizar as tarefas de um cliente.'}
                </DialogDescription>

                <Form
                    {...(isEditing
                        ? ProjectController.update.form(project.id)
                        : ProjectController.store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    resetOnSuccess={!isEditing}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="project-name">Nome</Label>
                                <Input
                                    id="project-name"
                                    name="name"
                                    defaultValue={project?.name}
                                    required
                                    maxLength={255}
                                    placeholder="Ex.: Implantação de ERP · Cliente Alfa"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="project-description">
                                    Descrição (opcional)
                                </Label>
                                <Textarea
                                    id="project-description"
                                    name="description"
                                    defaultValue={project?.description ?? ''}
                                    maxLength={2000}
                                    rows={3}
                                />
                                <InputError message={errors.description} />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {isEditing ? 'Salvar' : 'Criar projeto'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Passo 4: card de projeto e página do dashboard**

`resources/js/components/projects/project-card.tsx` (o link para o Kanban entra na Tarefa 7):

```tsx
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import HealthBadge from '@/components/projects/health-badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { Project } from '@/types';

export default function ProjectCard({ project }: { project: Project }) {
    const progress =
        project.tasks_count === 0
            ? 0
            : Math.round(
                  (project.completed_tasks_count / project.tasks_count) * 100,
              );

    return (
        <Card className="h-full gap-4 transition-shadow hover:shadow-md">
            <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                    <CardTitle className="leading-snug">{project.name}</CardTitle>
                    <HealthBadge health={project.health} />
                </div>
                {project.description && (
                    <CardDescription className="line-clamp-2">
                        {project.description}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="mt-auto space-y-3">
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>
                            {project.completed_tasks_count} de{' '}
                            {project.tasks_count} concluídas
                        </span>
                    </div>
                    <div
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Progresso do projeto"
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <p className="flex items-center gap-1.5 text-sm">
                    {project.overdue_tasks_count > 0 ? (
                        <>
                            <AlertTriangle className="size-4 text-red-500" />
                            <span>
                                {project.overdue_tasks_count}{' '}
                                {project.overdue_tasks_count === 1
                                    ? 'tarefa atrasada'
                                    : 'tarefas atrasadas'}{' '}
                                ({project.overdue_percentage}%)
                            </span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="size-4 text-emerald-500" />
                            <span className="text-muted-foreground">
                                Nenhuma tarefa atrasada
                            </span>
                        </>
                    )}
                </p>
            </CardContent>
        </Card>
    );
}
```

`resources/js/pages/dashboard.tsx`:

```tsx
import { Head } from '@inertiajs/react';
import { AlertTriangle, FolderKanban, ListTodo, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ProjectCard from '@/components/projects/project-card';
import ProjectFormDialog from '@/components/projects/project-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { DashboardSummary, Project } from '@/types';

function SummaryCard({
    icon: Icon,
    label,
    value,
    highlight = false,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <Card className="py-4">
            <CardContent className="flex items-center gap-4">
                <div
                    className={
                        highlight
                            ? 'rounded-lg bg-red-100 p-2.5 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                            : 'rounded-lg bg-muted p-2.5 text-muted-foreground'
                    }
                >
                    <Icon className="size-5" />
                </div>
                <div>
                    <p className="text-2xl font-semibold tabular-nums">
                        {value}
                    </p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard({
    projects,
    summary,
}: {
    projects: Project[];
    summary: DashboardSummary;
}) {
    return (
        <>
            <Head title="Projetos" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Projetos
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Acompanhe a saúde dos projetos dos seus clientes.
                        </p>
                    </div>
                    <ProjectFormDialog
                        trigger={
                            <Button>
                                <Plus /> Novo projeto
                            </Button>
                        }
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <SummaryCard
                        icon={FolderKanban}
                        label="Projetos"
                        value={summary.total_projects}
                    />
                    <SummaryCard
                        icon={AlertTriangle}
                        label="Projetos em alerta"
                        value={summary.projects_in_alert}
                        highlight={summary.projects_in_alert > 0}
                    />
                    <SummaryCard
                        icon={ListTodo}
                        label="Tarefas atrasadas"
                        value={summary.overdue_tasks}
                        highlight={summary.overdue_tasks > 0}
                    />
                </div>

                {projects.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
                        <FolderKanban className="size-10 text-muted-foreground" />
                        <div>
                            <p className="font-medium">
                                Nenhum projeto ainda
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Crie o primeiro projeto para começar a
                                acompanhar as tarefas.
                            </p>
                        </div>
                        <ProjectFormDialog
                            trigger={
                                <Button>
                                    <Plus /> Criar primeiro projeto
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Projetos',
            href: dashboard(),
        },
    ],
};
```

- [ ] **Passo 5: navegação**

Em `resources/js/components/app-sidebar.tsx`:
- trocar `title: 'Dashboard'` por `title: 'Projetos'` e o ícone `LayoutGrid` por `FolderKanban`;
- apagar o array `footerNavItems` inteiro, o `<NavFooter items={footerNavItems} className="mt-auto" />` e os imports que ficarem sem uso (`BookOpen`, `FolderGit2`, `LayoutGrid`, `NavFooter`).

Em `resources/js/components/app-header.tsx`:
- trocar `title: 'Dashboard'` por `title: 'Projetos'` e o ícone por `FolderKanban`;
- apagar o array `rightNavItems` e os dois blocos JSX que fazem `rightNavItems.map(...)` (o do menu mobile e o do desktop), junto com os imports que ficarem sem uso.

- [ ] **Passo 6: verificar tipos, lint e visual**

Rodar: `npm run types:check && npm run check`
Esperado: nenhum erro. Se o Wayfinder ainda não gerou `@/actions/App/Http/Controllers/ProjectController`, rode `php artisan wayfinder:generate --with-form --no-interaction` antes.

Verificação manual. **Atenção:** `migrate:fresh` apaga o banco SQLite local de desenvolvimento.
```bash
php artisan migrate:fresh --seed --no-interaction
composer run dev
```
Faça login com `consultor@tehokas.test` / `password` e confira:
- 3 cards de resumo (3 / 1 / 2) e 3 projetos com os badges Saudável, Em Alerta e Sem tarefas;
- criar um projeto pelo modal mostra toast e o card novo aparece primeiro;
- enviar o nome vazio mostra o erro abaixo do campo com o modal aberto;
- a sidebar mostra "Projetos" e não tem mais os links Repository/Documentation;
- em 375px de largura, os cards ficam em 1 coluna, sem scroll horizontal.

- [ ] **Passo 7: commit, verificação completa e PR**

```bash
git add resources/js
git commit -m "Feat(dashboard): adiciona listagem de projetos com indicador de saúde

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
composer ci:check
git push -u origin feat/dashboard
gh pr create --base develop --head feat/dashboard \
  --title "Feat(dashboard): dashboard de projetos com indicador de saúde" \
  --body "$(cat <<'EOF'
## Resumo
- `DashboardController` lista só os projetos do consultor, com contagens por agregação SQL e resumo (projetos, em alerta, tarefas atrasadas).
- CRUD de projetos com `ProjectPolicy` (projeto de outro usuário → 404) e Form Requests.
- Página do dashboard com cards de resumo, `HealthBadge`, progresso e modal de criação.

## Testes
- Isolamento entre consultores, bloqueio de mass assignment de `user_id`, validação e cascade.
- Verificação manual com o seeder de demonstração.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge feat/dashboard --merge --delete-branch
git switch develop && git pull
```

---

# Branch 3: `feat/kanban`

- [ ] **Passo 0: criar a branch**

```bash
git switch develop && git pull
git switch -c feat/kanban
```

### Tarefa 6: backend do Kanban (página do projeto, CRUD de tarefas e status)

**Arquivos:**
- Criar: `app/Concerns/TaskValidationRules.php`, `app/Http/Requests/Tasks/StoreTaskRequest.php`, `app/Http/Requests/Tasks/UpdateTaskRequest.php`, `app/Http/Requests/Tasks/UpdateTaskStatusRequest.php`, `app/Http/Resources/TaskResource.php`, `app/Http/Controllers/TaskController.php`, `app/Http/Controllers/TaskStatusController.php`
- Modificar: `app/Http/Controllers/ProjectController.php` (adicionar `show` e redirecionar o `store` para ele), `routes/projects.php`, `tests/Feature/Projects/ProjectManagementTest.php` (o redirect do store)
- Testes: `tests/Feature/Projects/ProjectBoardTest.php`, `tests/Feature/Tasks/TaskManagementTest.php`

**Interfaces:**
- Consome: `ProjectPolicy`, `ProjectResource`, `Project::taskCountDefinitions()` e os enums com `options()`.
- Produz:
  - rotas `projects.show` (GET `/projects/{project}`), `projects.tasks.store` (POST `/projects/{project}/tasks`), `tasks.update` (PATCH `/tasks/{task}`), `tasks.destroy` (DELETE `/tasks/{task}`) e `tasks.status.update` (PATCH `/tasks/{task}/status`);
  - `TaskResource` com as chaves `id`, `title`, `description`, `status{value,label}`, `priority{value,label}`, `deadline` (ISO 8601), `deadline_input` (`Y-m-d\TH:i`) e `is_overdue`;
  - props da página `projects/show`: `project`, `tasks` (ordenadas por deadline), `statusOptions` e `priorityOptions`.

- [ ] **Passo 1: escrever os testes que falham**

`tests/Feature/Projects/ProjectBoardTest.php`:

```php
<?php

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia as Assert;

test('the board shows the project, its health and tasks ordered by deadline', function () {
    $this->travelTo(Date::parse('2026-10-01 12:00:00'));

    $project = Project::factory()->create();
    Task::factory()->for($project)->create(['title' => 'Depois', 'deadline' => now()->addDays(5)]);
    Task::factory()->for($project)->overdue()->create(['title' => 'Atrasada', 'deadline' => now()->subDay()]);

    $this->actingAs($project->user)
        ->get(route('projects.show', $project))
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/show')
            ->where('project.id', $project->id)
            ->where('project.health.value', 'alert')
            ->has('tasks', 2)
            ->where('tasks.0.title', 'Atrasada')
            ->where('tasks.0.is_overdue', true)
            ->where('tasks.0.status', ['value' => 'pending', 'label' => 'Pendente'])
            ->where('tasks.1.title', 'Depois')
            ->has('statusOptions', 3)
            ->has('priorityOptions', 3));
});

test('the board of another consultant is not found', function () {
    $project = Project::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('projects.show', $project))
        ->assertNotFound();
});
```

`tests/Feature/Tasks/TaskManagementTest.php`:

```php
<?php

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function validTaskPayload(array $overrides = []): array
{
    return [
        'title' => 'Mapear processo de compras',
        'description' => 'Entrevistar o time de suprimentos',
        'status' => 'pending',
        'priority' => 'high',
        'deadline' => '2026-10-01T14:30',
        ...$overrides,
    ];
}

test('a consultant can add a task to their project', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->from(route('projects.show', $project))
        ->post(route('projects.tasks.store', $project), validTaskPayload())
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('projects.show', $project));

    $task = $project->tasks()->sole();
    expect($task->title)->toBe('Mapear processo de compras')
        ->and($task->status)->toBe(TaskStatus::Pending)
        ->and($task->priority)->toBe(TaskPriority::High)
        ->and($task->deadline->format('Y-m-d H:i'))->toBe('2026-10-01 14:30');
});

test('the deadline round-trips through the form without timezone drift', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->post(route('projects.tasks.store', $project), validTaskPayload(['deadline' => '2026-10-01T14:30']));

    $this->actingAs($project->user)
        ->get(route('projects.show', $project))
        ->assertInertia(fn (Assert $page) => $page
            ->where('tasks.0.deadline_input', '2026-10-01T14:30')
            ->where('tasks.0.deadline', '2026-10-01T14:30:00-03:00'));
});

test('a task payload is validated', function (array $overrides, string $invalidField) {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->post(route('projects.tasks.store', $project), validTaskPayload($overrides))
        ->assertSessionHasErrors($invalidField);

    expect(Task::query()->count())->toBe(0);
})->with([
    'missing title' => [['title' => ''], 'title'],
    'unknown status' => [['status' => 'archived'], 'status'],
    'unknown priority' => [['priority' => 'urgent'], 'priority'],
    'missing deadline' => [['deadline' => ''], 'deadline'],
    'invalid deadline' => [['deadline' => 'amanhã'], 'deadline'],
]);

test('a deadline in the past is accepted so late tasks can be registered', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->post(route('projects.tasks.store', $project), validTaskPayload(['deadline' => '2020-01-01T09:00']))
        ->assertSessionHasNoErrors();

    expect($project->tasks()->count())->toBe(1);
});

test('a consultant can edit a task without moving it to another project', function () {
    $task = Task::factory()->create();
    $otherProject = Project::factory()->for($task->project->user)->create();

    $this->actingAs($task->project->user)
        ->patch(route('tasks.update', $task), validTaskPayload([
            'title' => 'Título revisado',
            'project_id' => $otherProject->id,
        ]))
        ->assertSessionHasNoErrors();

    $task->refresh();
    expect($task->title)->toBe('Título revisado')
        ->and($task->project_id)->not->toBe($otherProject->id);
});

test('a consultant can move a task to another status', function () {
    $task = Task::factory()->pending()->create();

    $this->actingAs($task->project->user)
        ->patch(route('tasks.status.update', $task), ['status' => 'in_progress'])
        ->assertSessionHasNoErrors();

    expect($task->refresh()->status)->toBe(TaskStatus::InProgress);
});

test('an unknown status is rejected when moving a task', function () {
    $task = Task::factory()->pending()->create();

    $this->actingAs($task->project->user)
        ->patch(route('tasks.status.update', $task), ['status' => 'done'])
        ->assertSessionHasErrors('status');

    expect($task->refresh()->status)->toBe(TaskStatus::Pending);
});

test('a consultant can delete a task', function () {
    $task = Task::factory()->create();

    $this->actingAs($task->project->user)
        ->delete(route('tasks.destroy', $task))
        ->assertSessionHasNoErrors();

    expect(Task::query()->count())->toBe(0);
});

test('tasks of other consultants are not found', function (string $method, string $routeName, array $payload) {
    $task = Task::factory()->pending()->create(['title' => 'Original']);
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->{$method}(route($routeName, $task), $payload)
        ->assertNotFound();

    $task->refresh();
    expect($task->title)->toBe('Original')
        ->and($task->status)->toBe(TaskStatus::Pending);
})->with([
    'update' => ['patch', 'tasks.update', validTaskPayload(['title' => 'Invadido'])],
    'move' => ['patch', 'tasks.status.update', ['status' => 'completed']],
    'delete' => ['delete', 'tasks.destroy', []],
]);

test('tasks cannot be added to another consultant project', function () {
    $project = Project::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('projects.tasks.store', $project), validTaskPayload())
        ->assertNotFound();

    expect(Task::query()->count())->toBe(0);
});
```

Em `tests/Feature/Projects/ProjectManagementTest.php`, no teste `a consultant can create a project`, trocar a linha do redirect para:

```php
    $response->assertSessionHasNoErrors()->assertRedirect(route('projects.show', $project));
```

- [ ] **Passo 2: rodar e confirmar a falha**

Rodar: `php artisan test --compact tests/Feature/Projects tests/Feature/Tasks`
Esperado: FAIL (`Route [projects.show] not defined` etc.).

- [ ] **Passo 3: implementar regras, requests e resource**

`app/Concerns/TaskValidationRules.php`:

```php
<?php

namespace App\Concerns;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait TaskValidationRules
{
    /**
     * Get the validation rules used to create and update tasks.
     *
     * Past deadlines are allowed on purpose: consultants must be able to register tasks that are already late.
     *
     * @return array<string, array<int, ValidationRule|string|object>>
     */
    protected function taskRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::enum(TaskStatus::class)],
            'priority' => ['required', Rule::enum(TaskPriority::class)],
            'deadline' => ['required', 'date'],
        ];
    }
}
```

`app/Http/Requests/Tasks/StoreTaskRequest.php`:

```php
<?php

namespace App\Http\Requests\Tasks;

use App\Concerns\TaskValidationRules;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreTaskRequest extends FormRequest
{
    use TaskValidationRules;

    /**
     * Only the project's owner may add tasks to it.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('project'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|string|object>>
     */
    public function rules(): array
    {
        return $this->taskRules();
    }
}
```

`app/Http/Requests/Tasks/UpdateTaskRequest.php`:

```php
<?php

namespace App\Http\Requests\Tasks;

use App\Concerns\TaskValidationRules;
use App\Models\Task;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateTaskRequest extends FormRequest
{
    use TaskValidationRules;

    /**
     * Only the owner of the task's project may edit it.
     */
    public function authorize(): Response
    {
        /** @var Task $task */
        $task = $this->route('task');

        return Gate::inspect('update', $task->project);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, ValidationRule|string|object>>
     */
    public function rules(): array
    {
        return $this->taskRules();
    }
}
```

`app/Http/Requests/Tasks/UpdateTaskStatusRequest.php`:

```php
<?php

namespace App\Http\Requests\Tasks;

use App\Enums\TaskStatus;
use App\Models\Task;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateTaskStatusRequest extends FormRequest
{
    /**
     * Only the owner of the task's project may move it on the board.
     */
    public function authorize(): Response
    {
        /** @var Task $task */
        $task = $this->route('task');

        return Gate::inspect('update', $task->project);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(TaskStatus::class)],
        ];
    }
}
```

`app/Http/Resources/TaskResource.php`:

```php
<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    /**
     * Transform the task into the shape consumed by the Kanban board.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status->toOption(),
            'priority' => $this->priority->toOption(),
            'deadline' => $this->deadline->toIso8601String(),
            'deadline_input' => $this->deadline->format('Y-m-d\TH:i'),
            'is_overdue' => $this->is_overdue,
        ];
    }
}
```

- [ ] **Passo 4: implementar controllers e rotas**

Em `app/Http/Controllers/ProjectController.php`, adicionar os imports:

```php
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use Illuminate\Http\Request;
use Inertia\Response;
```

Mudar o retorno do `store` para abrir o Kanban do projeto recém-criado:

```php
    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $project = $request->user()->projects()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Project created.')]);

        return to_route('projects.show', $project);
    }
```

E adicionar o `show` depois do `store`:

```php
    /**
     * Show the project's Kanban board.
     */
    public function show(Request $request, Project $project): Response
    {
        Gate::authorize('view', $project);

        $project->loadCount(Project::taskCountDefinitions());

        $tasks = $project->tasks()->orderBy('deadline')->orderBy('id')->get();

        return Inertia::render('projects/show', [
            'project' => ProjectResource::make($project)->resolve($request),
            'tasks' => TaskResource::collection($tasks)->resolve($request),
            'statusOptions' => TaskStatus::options(),
            'priorityOptions' => TaskPriority::options(),
        ]);
    }
```

`app/Http/Controllers/TaskController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\Tasks\StoreTaskRequest;
use App\Http\Requests\Tasks\UpdateTaskRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TaskController extends Controller
{
    /**
     * Add a task to the project.
     */
    public function store(StoreTaskRequest $request, Project $project): RedirectResponse
    {
        $project->tasks()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task created.')]);

        return back();
    }

    /**
     * Update the task's details.
     */
    public function update(UpdateTaskRequest $request, Task $task): RedirectResponse
    {
        $task->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task updated.')]);

        return back();
    }

    /**
     * Delete the task.
     */
    public function destroy(Task $task): RedirectResponse
    {
        Gate::authorize('update', $task->project);

        $task->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Task deleted.')]);

        return back();
    }
}
```

`app/Http/Controllers/TaskStatusController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Http\Requests\Tasks\UpdateTaskStatusRequest;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;

class TaskStatusController extends Controller
{
    /**
     * Move the task to another Kanban column.
     *
     * No toast here: the card moving is the feedback, and a toast per drag would be noise.
     */
    public function __invoke(UpdateTaskStatusRequest $request, Task $task): RedirectResponse
    {
        $task->update(['status' => $request->enum('status', TaskStatus::class)]);

        return back();
    }
}
```

`routes/projects.php` fica assim:

```php
<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskStatusController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::resource('projects', ProjectController::class)->only(['store', 'show', 'update', 'destroy']);

    Route::resource('projects.tasks', TaskController::class)
        ->shallow()
        ->only(['store', 'update', 'destroy']);

    Route::patch('tasks/{task}/status', TaskStatusController::class)->name('tasks.status.update');
});
```

- [ ] **Passo 5: rodar e confirmar que passa**

Rodar: `php artisan test --compact tests/Feature/Projects tests/Feature/Tasks`
Esperado: PASS.

Se o teste de ida e volta falhar no offset (`-03:00`), confira se `.env` tem `APP_TIMEZONE=America/Sao_Paulo`. O Brasil não tem horário de verão desde 2019, então `-03:00` é o esperado.

- [ ] **Passo 6: fazer o commit**

```bash
vendor/bin/pint --dirty --format agent
git add app routes tests
git commit -m "Feat(tasks): adiciona quadro do projeto, CRUD de tarefas e mudança de status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 7: frontend do Kanban (drag-and-drop com atualização otimista)

**Arquivos:**
- Instalar: `@dnd-kit/core`, `@dnd-kit/utilities`
- Criar: `resources/js/lib/date.ts`, `resources/js/components/confirm-delete-dialog.tsx`, `resources/js/components/tasks/task-form-dialog.tsx`, `resources/js/components/tasks/task-card.tsx`, `resources/js/components/tasks/kanban-column.tsx`, `resources/js/components/tasks/kanban-board.tsx`, `resources/js/pages/projects/show.tsx`
- Modificar: `resources/js/components/projects/project-card.tsx` (virar link para o Kanban)

**Interfaces:**
- Consome: as props de `projects/show` (Tarefa 6), os tipos (Tarefa 5), `ProjectFormDialog`, `HealthBadge` e o Wayfinder (`ProjectController.show/destroy`, `TaskController.store/update/destroy`, `TaskStatusController`).
- Produz:
  - `formatDeadline(iso: string): string`;
  - `ConfirmDeleteDialog({ open, onOpenChange, title, description, form })`;
  - `TaskFormDialog({ projectId, task?, statusOptions, priorityOptions, defaultStatus?, open, onOpenChange })`;
  - `KanbanBoard({ tasks, statusOptions, visibleStatuses, onStatusChange, onEdit, onDelete })`.
  - A Tarefa 9 usa `visibleStatuses: TaskStatusValue[]`.

- [ ] **Passo 1: instalar as dependências aprovadas**

```bash
npm install @dnd-kit/core@^6.3.1 @dnd-kit/utilities@^3.2.2
```

Esperado: `package.json` e `package-lock.json` atualizados, sem outras dependências novas de primeiro nível.

- [ ] **Passo 2: formatação de data e dialog de confirmação**

`resources/js/lib/date.ts`:

```ts
const deadlineFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
});

export function formatDeadline(iso: string): string {
    return deadlineFormatter.format(new Date(iso));
}
```

`resources/js/components/confirm-delete-dialog.tsx`:

```tsx
import { Form } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import type { RouteFormDefinition } from '@/wayfinder';

type ConfirmDeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    form: RouteFormDefinition<'post'>;
};

export default function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    description,
    form,
}: ConfirmDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
                <Form
                    {...form}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                >
                    {({ processing }) => (
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={processing}
                            >
                                Excluir
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
```

(O `.form()` do Wayfinder para DELETE devolve `method: 'post'` com `?_method=DELETE`, por isso o tipo é `RouteFormDefinition<'post'>`. Se o tsc reclamar do tipo, confira a assinatura em `resources/js/wayfinder/index.ts`.)

- [ ] **Passo 3: dialog de formulário de tarefa**

`resources/js/components/tasks/task-form-dialog.tsx`:

```tsx
import { Form } from '@inertiajs/react';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
    EnumOption,
    Task,
    TaskPriorityValue,
    TaskStatusValue,
} from '@/types';

type TaskFormDialogProps = {
    projectId: number;
    task?: Task;
    statusOptions: EnumOption<TaskStatusValue>[];
    priorityOptions: EnumOption<TaskPriorityValue>[];
    defaultStatus?: TaskStatusValue;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function TaskFormDialog({
    projectId,
    task,
    statusOptions,
    priorityOptions,
    defaultStatus = 'pending',
    open,
    onOpenChange,
}: TaskFormDialogProps) {
    const isEditing = task !== undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogTitle>
                    {isEditing ? 'Editar tarefa' : 'Nova tarefa'}
                </DialogTitle>
                <DialogDescription>
                    Defina o que precisa ser feito, a prioridade e o prazo.
                </DialogDescription>

                <Form
                    key={task?.id ?? 'new'}
                    {...(isEditing
                        ? TaskController.update.form(task.id)
                        : TaskController.store.form(projectId))}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    resetOnSuccess={!isEditing}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="task-title">Título</Label>
                                <Input
                                    id="task-title"
                                    name="title"
                                    defaultValue={task?.title}
                                    required
                                    maxLength={255}
                                    placeholder="Ex.: Mapear processo de compras"
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="task-description">
                                    Descrição (opcional)
                                </Label>
                                <Textarea
                                    id="task-description"
                                    name="description"
                                    defaultValue={task?.description ?? ''}
                                    maxLength={5000}
                                    rows={3}
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="task-status">Status</Label>
                                    <Select
                                        name="status"
                                        defaultValue={
                                            task?.status.value ?? defaultStatus
                                        }
                                    >
                                        <SelectTrigger
                                            id="task-status"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.status} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="task-priority">
                                        Prioridade
                                    </Label>
                                    <Select
                                        name="priority"
                                        defaultValue={
                                            task?.priority.value ?? 'medium'
                                        }
                                    >
                                        <SelectTrigger
                                            id="task-priority"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorityOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.priority} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="task-deadline">Prazo</Label>
                                <Input
                                    id="task-deadline"
                                    name="deadline"
                                    type="datetime-local"
                                    defaultValue={task?.deadline_input}
                                    required
                                />
                                <InputError message={errors.deadline} />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {isEditing ? 'Salvar' : 'Criar tarefa'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
```

(O `Select` do Radix com `name` renderiza um `<select>` nativo escondido, então o `<Form>` do Inertia lê o valor pelo `FormData`.)

- [ ] **Passo 4: card, coluna e board**

`resources/js/components/tasks/task-card.tsx`:

```tsx
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
    AlertTriangle,
    CalendarClock,
    GripVertical,
    MoreHorizontal,
    Pencil,
    Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatDeadline } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { EnumOption, Task, TaskPriorityValue, TaskStatusValue } from '@/types';

const priorityStyles: Record<TaskPriorityValue, string> = {
    low: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    medium: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    high: 'border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

type TaskCardProps = {
    task: Task;
    statusOptions: EnumOption<TaskStatusValue>[];
    onStatusChange: (task: Task, status: TaskStatusValue) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
};

export default function TaskCard({
    task,
    statusOptions,
    onStatusChange,
    onEdit,
    onDelete,
}: TaskCardProps) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
        useDraggable({ id: task.id, data: { task } });

    return (
        <article
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform) }}
            className={cn(
                'space-y-3 rounded-lg border bg-card p-3 shadow-xs',
                task.is_overdue && 'border-red-300 dark:border-red-500/50',
                isDragging && 'z-10 opacity-80 shadow-lg ring-2 ring-primary/40',
            )}
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...listeners}
                    {...attributes}
                    aria-label={`Arrastar tarefa ${task.title}`}
                    className="mt-0.5 cursor-grab touch-none rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
                >
                    <GripVertical className="size-4" />
                </button>
                <h3 className="flex-1 text-sm leading-snug font-medium">
                    {task.title}
                </h3>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="-mt-1 -mr-1 size-7"
                            aria-label={`Ações da tarefa ${task.title}`}
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(task)}>
                            <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => onDelete(task)}
                        >
                            <Trash2 /> Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {task.description && (
                <p className="line-clamp-3 text-xs text-muted-foreground">
                    {task.description}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge className={priorityStyles[task.priority.value]}>
                    {task.priority.label}
                </Badge>
                <span
                    className={cn(
                        'inline-flex items-center gap-1',
                        task.is_overdue
                            ? 'font-medium text-red-600 dark:text-red-400'
                            : 'text-muted-foreground',
                    )}
                >
                    {task.is_overdue ? (
                        <AlertTriangle className="size-3.5" />
                    ) : (
                        <CalendarClock className="size-3.5" />
                    )}
                    {task.is_overdue && 'Atrasada · '}
                    {formatDeadline(task.deadline)}
                </span>
            </div>

            <Select
                value={task.status.value}
                onValueChange={(value) =>
                    onStatusChange(task, value as TaskStatusValue)
                }
            >
                <SelectTrigger
                    size="sm"
                    className="w-full"
                    aria-label={`Status da tarefa ${task.title}`}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </article>
    );
}
```

(Se o `SelectTrigger` do projeto não aceitar `size`, remova a prop e use `className="h-8 w-full"`. Se o `DropdownMenuItem` não aceitar `variant`, use `className="text-destructive"`.)

`resources/js/components/tasks/kanban-column.tsx`:

```tsx
import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { EnumOption, TaskStatusValue } from '@/types';

export default function KanbanColumn({
    status,
    count,
    children,
}: {
    status: EnumOption<TaskStatusValue>;
    count: number;
    children: ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status.value });

    return (
        <section
            ref={setNodeRef}
            aria-label={`Coluna ${status.label}`}
            className={cn(
                'flex min-h-40 flex-col gap-3 rounded-xl border bg-muted/40 p-3 transition-colors',
                isOver && 'border-primary/50 bg-primary/5',
            )}
        >
            <header className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{status.label}</h2>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                    {count}
                </span>
            </header>
            {children}
        </section>
    );
}
```

`resources/js/components/tasks/kanban-board.tsx`:

```tsx
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import KanbanColumn from '@/components/tasks/kanban-column';
import TaskCard from '@/components/tasks/task-card';
import { cn } from '@/lib/utils';
import type { EnumOption, Task, TaskStatusValue } from '@/types';

type KanbanBoardProps = {
    tasks: Task[];
    statusOptions: EnumOption<TaskStatusValue>[];
    visibleStatuses: TaskStatusValue[];
    onStatusChange: (task: Task, status: TaskStatusValue) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
};

export default function KanbanBoard({
    tasks,
    statusOptions,
    visibleStatuses,
    onStatusChange,
    onEdit,
    onDelete,
}: KanbanBoardProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        }),
        useSensor(KeyboardSensor),
    );

    const columns = statusOptions.filter((option) =>
        visibleStatuses.includes(option.value),
    );

    function handleDragEnd({ active, over }: DragEndEvent) {
        const task = active.data.current?.task as Task | undefined;

        if (!task || !over || over.id === task.status.value) {
            return;
        }

        onStatusChange(task, over.id as TaskStatusValue);
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
                className={cn(
                    'grid gap-4',
                    columns.length === 3 && 'md:grid-cols-3',
                    columns.length === 2 && 'md:grid-cols-2',
                )}
            >
                {columns.map((status) => {
                    const columnTasks = tasks.filter(
                        (task) => task.status.value === status.value,
                    );

                    return (
                        <KanbanColumn
                            key={status.value}
                            status={status}
                            count={columnTasks.length}
                        >
                            {columnTasks.length === 0 ? (
                                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                                    Solte uma tarefa aqui
                                </p>
                            ) : (
                                columnTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        statusOptions={statusOptions}
                                        onStatusChange={onStatusChange}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                    />
                                ))
                            )}
                        </KanbanColumn>
                    );
                })}
            </div>
        </DndContext>
    );
}
```

- [ ] **Passo 5: página do Kanban**

`resources/js/pages/projects/show.tsx`:

```tsx
import { Head, router, setLayoutProps } from '@inertiajs/react';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import ProjectController from '@/actions/App/Http/Controllers/ProjectController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import TaskStatusController from '@/actions/App/Http/Controllers/TaskStatusController';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import HealthBadge from '@/components/projects/health-badge';
import ProjectFormDialog from '@/components/projects/project-form-dialog';
import KanbanBoard from '@/components/tasks/kanban-board';
import TaskFormDialog from '@/components/tasks/task-form-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dashboard } from '@/routes';
import type {
    EnumOption,
    Project,
    Task,
    TaskPriorityValue,
    TaskStatusValue,
} from '@/types';

type ProjectBoardProps = {
    project: Project;
    tasks: Task[];
    statusOptions: EnumOption<TaskStatusValue>[];
    priorityOptions: EnumOption<TaskPriorityValue>[];
};

export default function ProjectBoard({
    project,
    tasks,
    statusOptions,
    priorityOptions,
}: ProjectBoardProps) {
    const [isTaskFormOpen, setTaskFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>();
    const [deletingTask, setDeletingTask] = useState<Task | undefined>();
    const [isProjectFormOpen, setProjectFormOpen] = useState(false);
    const [isProjectDeleteOpen, setProjectDeleteOpen] = useState(false);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Projetos', href: dashboard() },
            { title: project.name, href: ProjectController.show(project.id) },
        ],
    });

    function changeTaskStatus(task: Task, status: TaskStatusValue) {
        if (task.status.value === status) {
            return;
        }

        const statusOption = statusOptions.find(
            (option) => option.value === status,
        );

        if (!statusOption) {
            return;
        }

        router
            .optimistic<ProjectBoardProps>((props) => ({
                tasks: props.tasks.map((current) =>
                    current.id === task.id
                        ? { ...current, status: statusOption }
                        : current,
                ),
            }))
            .patch(
                TaskStatusController.url(task.id),
                { status },
                {
                    preserveScroll: true,
                    only: ['project', 'tasks'],
                    onError: () =>
                        toast.error('Não foi possível mover a tarefa.'),
                    onHttpException: () => {
                        toast.error('Não foi possível mover a tarefa.');
                    },
                    onNetworkError: () => {
                        toast.error('Sem conexão. A tarefa voltou para a coluna anterior.');
                    },
                },
            );
    }

    function openNewTask() {
        setEditingTask(undefined);
        setTaskFormOpen(true);
    }

    function openEditTask(task: Task) {
        setEditingTask(task);
        setTaskFormOpen(true);
    }

    return (
        <>
            <Head title={project.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {project.name}
                            </h1>
                            <HealthBadge health={project.health} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {project.tasks_count === 0
                                ? 'Nenhuma tarefa cadastrada.'
                                : `${project.overdue_tasks_count} de ${project.tasks_count} tarefas atrasadas (${project.overdue_percentage}%). O projeto entra em alerta acima de 20%.`}
                        </p>
                        {project.description && (
                            <p className="max-w-2xl text-sm">
                                {project.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={openNewTask}>
                            <Plus /> Nova tarefa
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Ações do projeto"
                                >
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onSelect={() => setProjectFormOpen(true)}
                                >
                                    <Pencil /> Editar projeto
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setProjectDeleteOpen(true)}
                                >
                                    <Trash2 /> Excluir projeto
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <KanbanBoard
                    tasks={tasks}
                    statusOptions={statusOptions}
                    visibleStatuses={statusOptions.map((option) => option.value)}
                    onStatusChange={changeTaskStatus}
                    onEdit={openEditTask}
                    onDelete={setDeletingTask}
                />
            </div>

            <TaskFormDialog
                projectId={project.id}
                task={editingTask}
                statusOptions={statusOptions}
                priorityOptions={priorityOptions}
                open={isTaskFormOpen}
                onOpenChange={setTaskFormOpen}
            />

            <ConfirmDeleteDialog
                open={deletingTask !== undefined}
                onOpenChange={(open) => !open && setDeletingTask(undefined)}
                title="Excluir tarefa?"
                description={`A tarefa "${deletingTask?.title ?? ''}" será excluída permanentemente.`}
                form={TaskController.destroy.form(deletingTask?.id ?? 0)}
            />

            <ProjectFormDialog
                project={project}
                open={isProjectFormOpen}
                onOpenChange={setProjectFormOpen}
            />

            <ConfirmDeleteDialog
                open={isProjectDeleteOpen}
                onOpenChange={setProjectDeleteOpen}
                title="Excluir projeto?"
                description={`O projeto "${project.name}" e todas as suas ${project.tasks_count} tarefas serão excluídos permanentemente.`}
                form={ProjectController.destroy.form(project.id)}
            />
        </>
    );
}
```

Nota sobre os breadcrumbs: se o tsc reclamar que `breadcrumbs` não existe nas props de layout do `setLayoutProps`, veja como o tipo `LayoutProps` é declarado em `node_modules/@inertiajs/core/types` e amplie esse tipo em `resources/js/types/global.d.ts` (dentro do `declare module '@inertiajs/core'` que já existe) com `breadcrumbs?: BreadcrumbItem[]`. Não use `as any`.

Nota sobre a atualização otimista: `router.optimistic(cb).patch(...)` aplica `cb` nas props na hora e reverte sozinho se a visita falhar (Inertia 3.7, em `@inertiajs/core/types/router.d.ts`). A resposta do servidor traz `project` com a saúde recalculada e `tasks` com o `is_overdue` correto.

- [ ] **Passo 6: o card do projeto vira link**

Em `resources/js/components/projects/project-card.tsx`:
- adicionar os imports `import { Link } from '@inertiajs/react';` e `import ProjectController from '@/actions/App/Http/Controllers/ProjectController';`;
- envolver o `<Card>` inteiro com:

```tsx
        <Link
            href={ProjectController.show(project.id)}
            prefetch
            className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            {/* <Card> existente, sem alterações */}
        </Link>
```

- [ ] **Passo 7: verificar tipos, lint e visual**

Rodar: `npm run types:check && npm run check`
Esperado: nenhum erro.

Verificação manual (`composer run dev`, logado como `consultor@tehokas.test`). Em "Mapeamento de Processos · Cliente Beta":
1. Arrastar um card de Pendente para Concluída pela alça: o card muda de coluna **na hora**; ao recarregar, continua lá; o badge do cabeçalho recalcula (com 1 atrasada concluída, a taxa cai de 40% para 20% e o badge fica **Saudável**).
2. **Foco da revisão #5:** soltar o card na própria coluna ou fora do board não dispara requisição (DevTools → Network sem PATCH).
3. Mudar o status pelo select do card: mesmo comportamento do item 1.
4. Teclado: Tab até a alça, Espaço, setas, Espaço: o card muda de coluna.
5. Com DevTools → Network → Offline, arrastar um card: ele volta para a coluna original e aparece o toast de erro.
6. Criar tarefa com prazo no passado: aparece com "Atrasada" em vermelho. Editar a tarefa: o formulário vem preenchido, incluindo o prazo.
7. Excluir tarefa e excluir projeto: dialog de confirmação, toast, e a exclusão do projeto volta ao dashboard.
8. Em 375px: colunas empilhadas; arrastar com toque (segurar ~150 ms) funciona.

- [ ] **Passo 8: commit, verificação completa e PR**

```bash
git add package.json package-lock.json resources/js
git commit -m "Feat(kanban): adiciona quadro Kanban com drag-and-drop e atualização otimista

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
composer ci:check
git push -u origin feat/kanban
gh pr create --base develop --head feat/kanban \
  --title "Feat(kanban): quadro Kanban de tarefas" \
  --body "$(cat <<'EOF'
## Resumo
- Página do projeto com Kanban (Pendente, Em Andamento, Concluída) e indicador de saúde recalculado a cada mudança.
- Drag-and-drop com `@dnd-kit` (mouse, toque e teclado) e select de status como alternativa.
- Atualização otimista do Inertia v3 (`router.optimistic`), com rollback automático e toast de erro.
- CRUD de tarefas em modais e exclusões com confirmação.

## Testes
- Ida e volta do prazo `datetime-local` sem deslocamento de fuso, validação de enums, bloqueio de troca de projeto por mass assignment e 404 para tarefas de outro consultor.
- Checklist manual de drag-and-drop (mouse, teclado, toque e offline).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge feat/kanban --merge --delete-branch
git switch develop && git pull
```

---

# Branch 4: `feat/task-filters`

- [ ] **Passo 0: criar a branch**

```bash
git switch develop && git pull
git switch -c feat/task-filters
```

### Tarefa 8: filtros no backend

**Arquivos:**
- Modificar: `app/Models/Task.php` (scopes de filtro), `app/Http/Controllers/ProjectController.php` (`show`)
- Teste: `tests/Feature/Tasks/TaskFiltersTest.php`

**Interfaces:**
- Produz:
  - scopes `Task::filterByStatus(?TaskStatus)` e `Task::filterByPriority(?TaskPriority)` (com `null`, não filtram);
  - prop `filters: { status: TaskStatusValue | null, priority: TaskPriorityValue | null }` na página `projects/show`;
  - a query string é `?status=...&priority=...`.

- [ ] **Passo 1: escrever os testes que falham**

`tests/Feature/Tasks/TaskFiltersTest.php`:

```php
<?php

use App\Enums\TaskPriority;
use App\Models\Project;
use App\Models\Task;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->project = Project::factory()->create();
    Task::factory()->for($this->project)->pending()->priority(TaskPriority::High)->create(['title' => 'Pendente alta']);
    Task::factory()->for($this->project)->pending()->priority(TaskPriority::Low)->create(['title' => 'Pendente baixa']);
    Task::factory()->for($this->project)->completed()->priority(TaskPriority::High)->create(['title' => 'Concluída alta']);
});

test('tasks can be filtered by priority', function () {
    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'priority' => 'high']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 2)
            ->where('filters', ['status' => null, 'priority' => 'high']));
});

test('tasks can be filtered by status and priority together', function () {
    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'status' => 'pending', 'priority' => 'high']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 1)
            ->where('tasks.0.title', 'Pendente alta')
            ->where('filters', ['status' => 'pending', 'priority' => 'high']));
});

test('invalid filter values are ignored instead of failing', function () {
    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'status' => 'xyz', 'priority' => 'urgente']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks', 3)
            ->where('filters', ['status' => null, 'priority' => null]));
});

test('filters do not change the project health, which always considers every task', function () {
    Task::factory()->for($this->project)->overdue()->priority(TaskPriority::Low)->count(2)->create();

    $this->actingAs($this->project->user)
        ->get(route('projects.show', ['project' => $this->project, 'priority' => 'high']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.tasks_count', 5)
            ->where('project.health.value', 'alert'));
});
```

- [ ] **Passo 2: rodar e confirmar a falha**

Rodar: `php artisan test --compact tests/Feature/Tasks/TaskFiltersTest.php`
Esperado: FAIL (a prop `filters` não existe, e as tarefas não são filtradas).

- [ ] **Passo 3: implementar**

Em `app/Models/Task.php`, adicionar depois do scope `overdue()`:

```php
    /**
     * Keep only tasks with the given status; a null status keeps every task.
     *
     * @param  Builder<Task>  $query
     */
    #[Scope]
    protected function filterByStatus(Builder $query, ?TaskStatus $status): void
    {
        $query->when($status, fn (Builder $query) => $query->where('status', $status));
    }

    /**
     * Keep only tasks with the given priority; a null priority keeps every task.
     *
     * @param  Builder<Task>  $query
     */
    #[Scope]
    protected function filterByPriority(Builder $query, ?TaskPriority $priority): void
    {
        $query->when($priority, fn (Builder $query) => $query->where('priority', $priority));
    }
```

Em `ProjectController::show`, trocar o corpo por:

```php
    public function show(Request $request, Project $project): Response
    {
        Gate::authorize('view', $project);

        $status = $request->enum('status', TaskStatus::class);
        $priority = $request->enum('priority', TaskPriority::class);

        $project->loadCount(Project::taskCountDefinitions());

        $tasks = $project->tasks()
            ->filterByStatus($status)
            ->filterByPriority($priority)
            ->orderBy('deadline')
            ->orderBy('id')
            ->get();

        return Inertia::render('projects/show', [
            'project' => ProjectResource::make($project)->resolve($request),
            'tasks' => TaskResource::collection($tasks)->resolve($request),
            'filters' => [
                'status' => $status?->value,
                'priority' => $priority?->value,
            ],
            'statusOptions' => TaskStatus::options(),
            'priorityOptions' => TaskPriority::options(),
        ]);
    }
```

(`$request->enum()` devolve `null` para valores inválidos, e é isso que atende o foco da revisão #4 sem precisar de uma regra de validação.)

- [ ] **Passo 4: rodar e confirmar que passa**

Rodar: `php artisan test --compact tests/Feature/Tasks tests/Feature/Projects`
Esperado: PASS.

- [ ] **Passo 5: fazer o commit**

```bash
vendor/bin/pint --dirty --format agent
git add app tests/Feature/Tasks/TaskFiltersTest.php
git commit -m "Feat(filters): filtra tarefas por status e prioridade via query string

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 9: barra de filtros no frontend

**Arquivos:**
- Criar: `resources/js/components/tasks/task-filters.tsx`
- Modificar: `resources/js/pages/projects/show.tsx`

**Interfaces:**
- Consome: a prop `filters` (Tarefa 8) e `KanbanBoard.visibleStatuses` (Tarefa 7).
- Produz: `TaskFilters({ filters, statusOptions, priorityOptions, onChange })`, em que `onChange(filters: TaskFiltersValue)`.

- [ ] **Passo 1: componente de filtros**

`resources/js/components/tasks/task-filters.tsx`:

```tsx
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { EnumOption, TaskPriorityValue, TaskStatusValue } from '@/types';

export type TaskFiltersValue = {
    status: TaskStatusValue | null;
    priority: TaskPriorityValue | null;
};

const ALL = 'all';

export default function TaskFilters({
    filters,
    statusOptions,
    priorityOptions,
    onChange,
}: {
    filters: TaskFiltersValue;
    statusOptions: EnumOption<TaskStatusValue>[];
    priorityOptions: EnumOption<TaskPriorityValue>[];
    onChange: (filters: TaskFiltersValue) => void;
}) {
    const hasFilters = filters.status !== null || filters.priority !== null;

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={filters.status ?? ''}
                onValueChange={(value) =>
                    onChange({
                        ...filters,
                        status: (value || null) as TaskStatusValue | null,
                    })
                }
                aria-label="Filtrar por status"
            >
                {statusOptions.map((option) => (
                    <ToggleGroupItem
                        key={option.value}
                        value={option.value}
                        className="px-3"
                    >
                        {option.label}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>

            <Select
                value={filters.priority ?? ALL}
                onValueChange={(value) =>
                    onChange({
                        ...filters,
                        priority:
                            value === ALL ? null : (value as TaskPriorityValue),
                    })
                }
            >
                <SelectTrigger
                    className="w-44"
                    aria-label="Filtrar por prioridade"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL}>Todas as prioridades</SelectItem>
                    {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            Prioridade {option.label.toLowerCase()}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ status: null, priority: null })}
                >
                    <X /> Limpar filtros
                </Button>
            )}
        </div>
    );
}
```

- [ ] **Passo 2: integrar na página**

Em `resources/js/pages/projects/show.tsx`:

1. Adicionar o import `import TaskFilters from '@/components/tasks/task-filters';` e `import type { TaskFiltersValue } from '@/components/tasks/task-filters';`.
2. Adicionar `filters: TaskFiltersValue;` ao tipo `ProjectBoardProps` e `filters` na desestruturação das props.
3. Adicionar, depois de `openEditTask`:

```tsx
    function applyFilters(next: TaskFiltersValue) {
        router.get(
            ProjectController.show.url(project.id, {
                query: {
                    status: next.status ?? undefined,
                    priority: next.priority ?? undefined,
                },
            }),
            {},
            { preserveState: true, preserveScroll: true, replace: true, only: ['tasks', 'filters'] },
        );
    }

    const visibleStatuses = filters.status
        ? [filters.status]
        : statusOptions.map((option) => option.value);
```

4. Renderizar, logo antes do `<KanbanBoard>`:

```tsx
                <TaskFilters
                    filters={filters}
                    statusOptions={statusOptions}
                    priorityOptions={priorityOptions}
                    onChange={applyFilters}
                />
```

5. No `<KanbanBoard>`, trocar `visibleStatuses={statusOptions.map((option) => option.value)}` por `visibleStatuses={visibleStatuses}`.
6. Depois do `<KanbanBoard>`, mostrar um estado vazio quando o filtro não encontra nada:

```tsx
                {tasks.length === 0 && (filters.status || filters.priority) && (
                    <p className="text-center text-sm text-muted-foreground">
                        Nenhuma tarefa corresponde aos filtros selecionados.
                    </p>
                )}
```

7. No `changeTaskStatus`, adicionar `'filters'` ao `only` (`only: ['project', 'tasks', 'filters']`). Assim, uma tarefa movida para fora do status filtrado some da lista quando a resposta chega.

(Se `ProjectController.show.url(id, { query })` não aceitar `undefined` nos valores, filtre o objeto antes: `Object.fromEntries(Object.entries(query).filter(([, v]) => v))`.)

- [ ] **Passo 3: verificar**

Rodar: `npm run types:check && npm run check`
Esperado: nenhum erro.

Verificação manual:
- Selecionar "Alta": a URL vira `?priority=high` e só aparecem tarefas de prioridade alta.
- Selecionar o status "Pendente": só a coluna Pendente aparece.
- F5 mantém os filtros.
- "Limpar filtros" volta ao quadro completo.
- Abrir `?priority=urgente` na barra de endereço: o quadro completo aparece, sem erro.

- [ ] **Passo 4: commit, verificação completa e PR**

```bash
git add resources/js
git commit -m "Feat(filters): adiciona barra de filtros por status e prioridade no Kanban

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
composer ci:check
git push -u origin feat/task-filters
gh pr create --base develop --head feat/task-filters \
  --title "Feat(filters): filtros de tarefas por status e prioridade" \
  --body "$(cat <<'EOF'
## Resumo
- Scopes `filterByStatus` e `filterByPriority`. Valores inválidos na URL são ignorados (`$request->enum()`).
- Barra de filtros sincronizada com a query string (`preserveState` + `replace`), então os filtros sobrevivem ao F5 e podem ser compartilhados.
- O indicador de saúde continua considerando todas as tarefas, mesmo com filtro ativo.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge feat/task-filters --merge --delete-branch
git switch develop && git pull
```

---

# Branch 5: `feat/pt-br`

- [ ] **Passo 0: criar a branch**

```bash
git switch develop && git pull
git switch -c feat/pt-br
```

### Tarefa 10: traduções do backend

**Arquivos:**
- Modificar: `config/app.php`, `.env`, `.env.example`
- Criar: `lang/pt_BR/validation.php`, `lang/pt_BR/auth.php`, `lang/pt_BR/passwords.php`, `lang/pt_BR/pagination.php`, `lang/pt_BR.json`
- Teste: `tests/Feature/LocalizationTest.php`

- [ ] **Passo 1: escrever o teste que falha**

`tests/Feature/LocalizationTest.php`:

```php
<?php

use App\Models\Project;
use App\Models\User;

test('validation messages are shown in portuguese', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('projects.store'), ['name' => ''])
        ->assertSessionHasErrors(['name' => 'O campo nome é obrigatório.']);
});

test('task validation uses portuguese attribute names', function () {
    $project = Project::factory()->create();

    $this->actingAs($project->user)
        ->post(route('projects.tasks.store', $project), [
            'title' => 'Tarefa',
            'status' => 'pending',
            'priority' => 'medium',
            'deadline' => 'amanhã',
        ])
        ->assertSessionHasErrors(['deadline' => 'O campo prazo não é uma data válida.']);
});

test('failed logins are reported in portuguese', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'senha-errada'])
        ->assertSessionHasErrors(['email' => 'Essas credenciais não correspondem aos nossos registros.']);
});

test('the html document declares the portuguese locale', function () {
    $this->get(route('home'))->assertSee('<html lang="pt-BR"', false);
});
```

(Se `route('login.store')` não existir, confira o nome com `php artisan route:list --path=login --method=POST` e use o nome listado.)

- [ ] **Passo 2: rodar e confirmar a falha**

Rodar: `php artisan test --compact tests/Feature/LocalizationTest.php`
Esperado: FAIL (as mensagens vêm em inglês).

- [ ] **Passo 3: configurar o locale**

Em `config/app.php`, trocar `'locale' => env('APP_LOCALE', 'en'),` por `'locale' => env('APP_LOCALE', 'pt_BR'),`. **Não** mude o `faker_locale`: as factories usam `catchPhrase()`, que não existe em todos os locales do Faker, e o seeder já usa textos fixos em português.

Em `.env` e `.env.example`:

```dotenv
APP_LOCALE=pt_BR
APP_FALLBACK_LOCALE=en
```

- [ ] **Passo 4: arquivos de tradução**

`lang/pt_BR/validation.php`. São só as regras que o app usa; o resto cai no fallback `en`:

```php
<?php

return [
    'accepted' => 'O campo :attribute deve ser aceito.',
    'confirmed' => 'A confirmação do campo :attribute não confere.',
    'current_password' => 'A senha está incorreta.',
    'date' => 'O campo :attribute não é uma data válida.',
    'email' => 'O campo :attribute deve ser um endereço de e-mail válido.',
    'enum' => 'O valor selecionado para :attribute é inválido.',
    'exists' => 'O valor selecionado para :attribute é inválido.',
    'in' => 'O valor selecionado para :attribute é inválido.',
    'integer' => 'O campo :attribute deve ser um número inteiro.',
    'lowercase' => 'O campo :attribute deve estar em letras minúsculas.',
    'max' => [
        'array' => 'O campo :attribute não pode ter mais de :max itens.',
        'file' => 'O campo :attribute não pode ser maior que :max kilobytes.',
        'numeric' => 'O campo :attribute não pode ser maior que :max.',
        'string' => 'O campo :attribute não pode ter mais de :max caracteres.',
    ],
    'min' => [
        'array' => 'O campo :attribute deve ter pelo menos :min itens.',
        'file' => 'O campo :attribute deve ter pelo menos :min kilobytes.',
        'numeric' => 'O campo :attribute deve ser pelo menos :min.',
        'string' => 'O campo :attribute deve ter pelo menos :min caracteres.',
    ],
    'numeric' => 'O campo :attribute deve ser um número.',
    'password' => [
        'letters' => 'O campo :attribute deve conter pelo menos uma letra.',
        'mixed' => 'O campo :attribute deve conter pelo menos uma letra maiúscula e uma minúscula.',
        'numbers' => 'O campo :attribute deve conter pelo menos um número.',
        'symbols' => 'O campo :attribute deve conter pelo menos um símbolo.',
        'uncompromised' => 'Esta :attribute apareceu em um vazamento de dados. Escolha outra :attribute.',
    ],
    'required' => 'O campo :attribute é obrigatório.',
    'string' => 'O campo :attribute deve ser um texto.',
    'unique' => 'Este :attribute já está em uso.',

    'attributes' => [
        'code' => 'código',
        'current_password' => 'senha atual',
        'deadline' => 'prazo',
        'description' => 'descrição',
        'email' => 'e-mail',
        'name' => 'nome',
        'password' => 'senha',
        'priority' => 'prioridade',
        'recovery_code' => 'código de recuperação',
        'status' => 'status',
        'title' => 'título',
    ],
];
```

`lang/pt_BR/auth.php`:

```php
<?php

return [
    'failed' => 'Essas credenciais não correspondem aos nossos registros.',
    'password' => 'A senha informada está incorreta.',
    'throttle' => 'Muitas tentativas de login. Tente novamente em :seconds segundos.',
];
```

`lang/pt_BR/passwords.php`:

```php
<?php

return [
    'reset' => 'Sua senha foi redefinida.',
    'sent' => 'Enviamos por e-mail o link para redefinir sua senha.',
    'throttled' => 'Aguarde antes de tentar novamente.',
    'token' => 'Este link de redefinição de senha é inválido.',
    'user' => 'Não encontramos um usuário com esse endereço de e-mail.',
];
```

`lang/pt_BR/pagination.php`:

```php
<?php

return [
    'previous' => '&laquo; Anterior',
    'next' => 'Próxima &raquo;',
];
```

`lang/pt_BR.json`:

```json
{
    "Profile updated.": "Perfil atualizado.",
    "Password updated.": "Senha atualizada.",
    "Project created.": "Projeto criado.",
    "Project updated.": "Projeto atualizado.",
    "Project deleted.": "Projeto excluído.",
    "Task created.": "Tarefa criada.",
    "Task updated.": "Tarefa atualizada.",
    "Task deleted.": "Tarefa excluída.",
    "The provided password was incorrect.": "A senha informada está incorreta.",
    "The provided two factor authentication code was invalid.": "O código de autenticação em dois fatores é inválido.",
    "The provided two factor recovery code was invalid.": "O código de recuperação é inválido.",
    "Hello!": "Olá!",
    "Regards,": "Atenciosamente,",
    "Whoops!": "Ops!",
    "All rights reserved.": "Todos os direitos reservados.",
    "Verify Email Address": "Verificar endereço de e-mail",
    "Please click the button below to verify your email address.": "Clique no botão abaixo para verificar seu endereço de e-mail.",
    "If you did not create an account, no further action is required.": "Se você não criou uma conta, nenhuma ação é necessária.",
    "Reset Password Notification": "Redefinição de senha",
    "You are receiving this email because we received a password reset request for your account.": "Você está recebendo este e-mail porque recebemos um pedido de redefinição de senha para sua conta.",
    "Reset Password": "Redefinir senha",
    "This password reset link will expire in :count minutes.": "Este link de redefinição de senha expira em :count minutos.",
    "If you did not request a password reset, no further action is required.": "Se você não pediu a redefinição de senha, nenhuma ação é necessária.",
    "If you're having trouble clicking the \":actionText\" button, copy and paste the URL below\ninto your web browser:": "Se você não conseguir clicar no botão \":actionText\", copie e cole a URL abaixo\nno seu navegador:"
}
```

- [ ] **Passo 5: rodar a suíte inteira**

Rodar: `php artisan test --compact`
Esperado: PASS. Se algum teste do starter kit verificar texto em inglês que agora está traduzido, atualize a asserção para o texto em pt-BR, sem mudar o comportamento testado.

- [ ] **Passo 6: fazer o commit**

```bash
vendor/bin/pint --dirty --format agent
git add config/app.php .env.example lang tests
git commit -m "Feat(i18n): traduz mensagens do backend para pt-BR

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 11: tradução das telas do starter kit

**Arquivos (modificar):**
- `resources/js/pages/auth/`: `login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `confirm-password.tsx`, `two-factor-challenge.tsx`, `verify-email.tsx`
- `resources/js/pages/settings/`: `profile.tsx`, `security.tsx`, `appearance.tsx`
- `resources/js/pages/welcome.tsx`
- `resources/js/layouts/settings/layout.tsx`
- `resources/js/components/`: `nav-main.tsx`, `user-menu-content.tsx`, `appearance-tabs.tsx`, `delete-user.tsx`, `manage-two-factor.tsx`, `two-factor-setup-modal.tsx`, `two-factor-recovery-codes.tsx`, `manage-passkeys.tsx`, `passkey-item.tsx`, `passkey-register.tsx`, `app-header.tsx`

**Regra:** traduza **somente textos visíveis** (texto JSX, `title`, `description`, `placeholder`, `aria-label`, `<Head title>`, labels de nav e toasts do front). **Não** mude `name`, `id`, `autoComplete`, rotas, `data-test` nem lógica.

- [ ] **Passo 1: aplicar o glossário**

Use exatamente estas traduções, para manter a consistência:

| Inglês | pt-BR |
|---|---|
| Log in / Log in to your account | Entrar / Entre na sua conta |
| Enter your email and password below to log in | Informe seu e-mail e senha para entrar |
| Email address / Email | Endereço de e-mail / E-mail |
| Password / Current password / New password / Confirm password | Senha / Senha atual / Nova senha / Confirmar senha |
| Forgot your password? / Forgot password | Esqueceu a senha? / Esqueci a senha |
| Remember me | Lembrar de mim |
| Don't have an account? Sign up | Não tem uma conta? Cadastre-se |
| Already have an account? | Já tem uma conta? |
| Create an account / Register | Criar conta / Cadastrar |
| Enter your details below to create your account | Preencha seus dados para criar sua conta |
| Name / Full name | Nome / Nome completo |
| Enter your email to receive a password reset link | Informe seu e-mail para receber o link de redefinição de senha |
| Email password reset link | Enviar link de redefinição |
| Or, return to | Ou volte para |
| Reset password / Please enter your new password below | Redefinir senha / Informe sua nova senha |
| This is a secure area of the application. Please confirm your password before continuing. | Esta é uma área segura. Confirme sua senha para continuar. |
| Confirm with passkey | Confirmar com passkey |
| Two-factor authentication | Autenticação em dois fatores |
| Authentication code / Recovery code | Código de autenticação / Código de recuperação |
| Enter the authentication code provided by your authenticator application. | Informe o código gerado pelo seu aplicativo autenticador. |
| Please confirm access to your account by entering one of your emergency recovery codes. | Confirme o acesso à sua conta informando um dos seus códigos de recuperação. |
| login using a recovery code / login using an authentication code | entrar com um código de recuperação / entrar com um código de autenticação |
| Continue / Back / Confirm / Cancel / Save / Remove | Continuar / Voltar / Confirmar / Cancelar / Salvar / Remover |
| Email verification | Verificação de e-mail |
| Please verify your email address by clicking on the link we just emailed to you. | Verifique seu e-mail clicando no link que acabamos de enviar. |
| Resend verification email | Reenviar e-mail de verificação |
| A new verification link has been sent to the email address you provided during registration. | Um novo link de verificação foi enviado para o e-mail informado no cadastro. |
| Log out / Settings | Sair / Configurações |
| Settings / Manage your profile and account settings | Configurações / Gerencie seu perfil e sua conta |
| Profile / Security / Appearance | Perfil / Segurança / Aparência |
| Profile settings / Update your name and email address | Configurações de perfil / Atualize seu nome e e-mail |
| Your email address is unverified. Click here to re-send the verification email. | Seu e-mail ainda não foi verificado. Clique aqui para reenviar o e-mail de verificação. |
| A new verification link has been sent to your email address. | Um novo link de verificação foi enviado para o seu e-mail. |
| Security settings / Update password | Configurações de segurança / Alterar senha |
| Ensure your account is using a long, random password to stay secure | Use uma senha longa e aleatória para manter sua conta segura |
| Appearance settings / Update the appearance settings for your account | Configurações de aparência / Ajuste a aparência da sua conta |
| Light / Dark / System | Claro / Escuro / Sistema |
| Delete account / Delete your account and all of its resources | Excluir conta / Exclua sua conta e todos os seus dados |
| Warning / Please proceed with caution, this cannot be undone. | Atenção / Prossiga com cuidado: esta ação não pode ser desfeita. |
| Are you sure you want to delete your account? | Tem certeza de que deseja excluir sua conta? |
| Once your account is deleted, all of its resources and data will also be permanently deleted. Please enter your password to confirm you would like to permanently delete your account. | Ao excluir sua conta, todos os seus dados serão apagados permanentemente. Informe sua senha para confirmar. |
| Manage your two-factor authentication settings | Gerencie a autenticação em dois fatores |
| Enable 2FA / Disable 2FA / Continue setup | Ativar 2FA / Desativar 2FA / Continuar configuração |
| When you enable two-factor authentication, you will be prompted for a secure pin during login. This pin can be retrieved from a TOTP-supported application on your phone. | Com a autenticação em dois fatores ativa, um código seguro será pedido no login. Ele é gerado por um aplicativo compatível com TOTP no seu celular. |
| You will be prompted for a secure, random pin during login, which you can retrieve from the TOTP-supported application on your phone. | Um código seguro e aleatório será pedido no login, gerado pelo aplicativo compatível com TOTP no seu celular. |
| Enable two-factor authentication / Two-factor authentication enabled | Ativar autenticação em dois fatores / Autenticação em dois fatores ativada |
| To finish enabling two-factor authentication, scan the QR code or enter the setup key in your authenticator app | Para concluir, escaneie o QR code ou informe a chave de configuração no seu aplicativo autenticador |
| Two-factor authentication is now enabled. Scan the QR code or enter the setup key in your authenticator app. | A autenticação em dois fatores está ativa. Escaneie o QR code ou informe a chave de configuração no seu aplicativo autenticador. |
| Verify authentication code / Enter the 6-digit code from your authenticator app | Verificar código / Informe o código de 6 dígitos do seu aplicativo autenticador |
| or, enter the code manually | ou informe o código manualmente |
| Recovery codes / Regenerate codes / View recovery codes / Hide recovery codes | Códigos de recuperação / Gerar novos códigos / Ver códigos de recuperação / Ocultar códigos de recuperação |
| Loading recovery codes | Carregando códigos de recuperação |
| Recovery codes let you regain access if you lose your 2FA device. Store them in a secure password manager. | Os códigos de recuperação devolvem o acesso se você perder o dispositivo de 2FA. Guarde-os num gerenciador de senhas. |
| Each recovery code can be used once to access your account and will be removed after use. If you need more, click Regenerate codes above. | Cada código pode ser usado uma vez e é removido após o uso. Se precisar de mais, clique em Gerar novos códigos. |
| Passkeys / Manage your passkeys for passwordless sign-in | Passkeys / Gerencie suas passkeys para entrar sem senha |
| No passkeys yet / Add a passkey to sign in without a password | Nenhuma passkey ainda / Adicione uma passkey para entrar sem senha |
| Add passkey / Passkey name / Remove passkey | Adicionar passkey / Nome da passkey / Remover passkey |
| A name helps you identify this passkey later. / e.g., MacBook Pro, iPhone | Um nome ajuda a identificar esta passkey depois. / ex.: MacBook Pro, iPhone |
| Passkeys are not supported in this browser. | Este navegador não suporta passkeys. |
| Added / Last used / Never | Adicionada / Último uso / Nunca |
| Platform | Plataforma |
| Navigation menu | Menu de navegação |

Frases que não estiverem na tabela devem seguir o mesmo tom: segunda pessoa ("você"), frases curtas, sem gerúndio desnecessário. Nomes de produto (Chrome, Safari, iPhone, Android, Windows, Mac) não são traduzidos.

- [ ] **Passo 2: reescrever a página inicial**

A `welcome.tsx` atual é marketing do Laravel (Laracasts, "Deploy now"). Substitua o conteúdo por uma apresentação do app, **mantendo os imports e a lógica de links de login/cadastro/dashboard que já existem no topo do arquivo**:
- título "Checklist de Projetos";
- subtítulo "Acompanhe as tarefas dos seus clientes e descubra quais projetos precisam de atenção antes que atrasem.";
- três destaques em lista: "Indicador de saúde: alerta automático quando mais de 20% das tarefas estão atrasadas", "Kanban com arrastar e soltar", "Filtros por status e prioridade";
- botões "Entrar" e "Criar conta" (ou "Ir para os projetos", quando autenticado).
- Remova o SVG grande do logo Laravel e os links externos.

- [ ] **Passo 3: verificar que não sobrou inglês**

Rodar:

```bash
grep -rnE "\b(Log in|Log out|Sign up|Password|Settings|Profile|Appearance|Delete account|Cancel|Save|Continue|Dashboard|Two-factor|Recovery code|Email address|Remember me|Forgot)\b" resources/js/pages resources/js/components resources/js/layouts --include=*.tsx | grep -v "components/ui/" | grep -vE "(import|from|name=|id=|autoComplete|data-test|Controller|route|type |: '|interface)"
```

Esperado: nenhuma linha com texto visível em inglês. Linhas que sobrarem por serem identificadores de código são aceitáveis; confira uma a uma.

Rodar: `npm run types:check && npm run check && php artisan test --compact`
Esperado: tudo passando.

Verificação manual: percorra login, cadastro, esqueci a senha, verificação de e-mail, configurações (perfil, segurança com 2FA e passkeys, aparência) e o menu do usuário. Nenhum texto em inglês.

- [ ] **Passo 4: commit, verificação completa e PR**

```bash
git add resources/js
git commit -m "Feat(i18n): traduz telas de autenticação e configurações para pt-BR

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
composer ci:check
git push -u origin feat/pt-br
gh pr create --base develop --head feat/pt-br \
  --title "Feat(i18n): interface completa em pt-BR" \
  --body "$(cat <<'EOF'
## Resumo
- Locale `pt_BR` com traduções do backend (validação, autenticação, e-mails e toasts) em `lang/`.
- Telas do starter kit traduzidas (login, cadastro, 2FA, passkeys e configurações) com glossário consistente.
- Página inicial reescrita para apresentar o produto.
- Nenhuma dependência nova.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge feat/pt-br --merge --delete-branch
git switch develop && git pull
```

---

# Branch 6: `docs/readme`

- [ ] **Passo 0: criar a branch**

```bash
git switch develop && git pull
git switch -c docs/readme
```

### Tarefa 12: Sail e README

**Arquivos:**
- Criar: `tehokas/compose.yaml` (via artisan)
- Modificar: `README.md` (raiz do repositório)

- [ ] **Passo 1: gerar o compose do Sail (SQLite, sem serviços extras)**

```bash
php artisan sail:install --with=none --no-interaction
```

Esperado: `compose.yaml` criado com só o serviço `laravel.test`. Confira que o `.env` continua com `DB_CONNECTION=sqlite`; se o comando tiver mudado variáveis de banco, restaure-as. Se o Docker estiver instalado, valide com `./vendor/bin/sail up -d` e depois `./vendor/bin/sail artisan migrate --seed`. Se não estiver, registre no PR que a execução via Sail não foi testada localmente.

- [ ] **Passo 2: pedir ao usuário o parágrafo da maior dificuldade**

O PDF exige "um breve parágrafo explicando qual foi a maior dificuldade técnica encontrada e como ela foi superada". Essa é uma experiência pessoal do candidato: **pergunte ao usuário pelo `AskUserQuestion`**. Ofereça 3 rascunhos baseados no que aconteceu na implementação (por exemplo: indicador que depende do tempo e por isso não pode ser persistido; drag-and-drop com atualização otimista e rollback; fuso horário do deadline com data e hora) e deixe o usuário escolher ou escrever o próprio texto. Use o texto escolhido literalmente no README.

- [ ] **Passo 3: escrever o README**

`README.md` (raiz), com estas seções e este conteúdo:

1. **Título e resumo:** "Checklist de Projetos · Desafio Técnico Tehokas". Um parágrafo: MVP para consultores criarem projetos, gerenciarem tarefas num Kanban e acompanharem o Indicador de Saúde.
2. **Funcionalidades:** autenticação (login, cadastro, verificação de e-mail, 2FA, passkeys); dashboard com resumo e indicador; Kanban com drag-and-drop (mouse, toque e teclado) e select; CRUD de projetos e tarefas; filtros por status e prioridade na URL; interface em pt-BR; isolamento entre consultores.
3. **Indicador de Saúde:** a regra exata (atrasada = prazo vencido e não concluída; alerta acima de 20%; exatamente 20% é saudável; projeto sem tarefas tem estado próprio), onde está no código (`Task::overdue()`, `ProjectHealthStatus::fromCounts()`, `Project::withTaskCounts()`) e por que é calculado na leitura e não persistido.
4. **Tecnologias:** tabela com Laravel 13, PHP 8.5, Inertia.js 3, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), @dnd-kit, Laravel Fortify, Laravel Wayfinder, Pest, SQLite, Laravel Sail. Uma frase sobre usar o starter kit oficial de React, que substitui o Breeze nas versões atuais do Laravel.
5. **Como rodar localmente** (PHP 8.3+, Composer, Node 22+):
   ```bash
   git clone git@github.com:VitorInacioBorges/tehokas-code-challenge.git
   cd tehokas-code-challenge/tehokas
   composer setup            # instala dependências, cria .env, gera a chave, migra e faz o build
   php artisan db:seed       # usuário de demonstração
   composer run dev          # servidor + Vite em http://localhost:8000
   ```
6. **Como rodar com Docker (Sail):**
   ```bash
   cd tehokas-code-challenge/tehokas
   cp .env.example .env
   docker run --rm -u "$(id -u):$(id -g)" -v "$(pwd):/var/www/html" -w /var/www/html laravelsail/php85-composer:latest composer install --ignore-platform-reqs
   ./vendor/bin/sail up -d
   ./vendor/bin/sail artisan key:generate
   ./vendor/bin/sail artisan migrate --seed
   ./vendor/bin/sail npm install && ./vendor/bin/sail npm run build
   ```
   (Confira o nome da imagem `laravelsail/php85-composer` na documentação do Sail; se não existir, use a mais recente disponível.)
7. **Acesso de demonstração:** `consultor@tehokas.test` / `password`, com os três projetos do seeder e o que cada um demonstra.
8. **Testes e qualidade:** `php artisan test` e `composer ci:check` (Pint, PHPStan nível 7, lint, tsc e Pest). Uma frase sobre o GitHub Actions rodando o mesmo check nos PRs.
9. **Arquitetura:** um parágrafo e um diagrama em texto do fluxo React → Wayfinder → rota → Form Request/Policy → controller → Eloquent → Resource → Inertia → React, com os caminhos principais (`app/Enums`, `app/Models`, `app/Policies`, `app/Http/*`, `resources/js/pages`, `resources/js/components/{projects,tasks}`). Link para a spec em `tehokas/docs/superpowers/specs/`.
10. **Fluxo de versionamento:** feature branches, PR para `develop` e `develop → main` na entrega; commits `Tipo(escopo): descrição`.
11. **Maior dificuldade técnica:** o texto escolhido no Passo 2.

- [ ] **Passo 4: commit e PR**

```bash
git add ../README.md compose.yaml
git commit -m "Docs(readme): documenta instalação, Sail, tecnologias e decisões do projeto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin docs/readme
gh pr create --base develop --head docs/readme \
  --title "Docs(readme): README do projeto" \
  --body "$(cat <<'EOF'
## Resumo
- README com instalação local e via Sail, tecnologias, regra do Indicador de Saúde, arquitetura, fluxo git e a maior dificuldade técnica.
- `compose.yaml` do Sail (SQLite, sem serviços extras).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge docs/readme --merge --delete-branch
git switch develop && git pull
```

- [ ] **Passo 5: avisar o usuário**

Diga que todas as branches foram integradas na `develop` e que o PR `develop → main` fica com ele (`gh pr create --base main --head develop`, depois `gh pr merge --merge`).

---

## Fora deste plano

- `docs/portuguese/*.md` e `docs/english/`: documentos do usuário, não cobertos pela spec.
- Deploy público e o PowerPoint da apresentação: entregas separadas, com seu próprio ciclo.
