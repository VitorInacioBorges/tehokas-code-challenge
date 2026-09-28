# Design: Sistema de Checklist Inteligente para Processos (MVP)

- **Data:** 2026-09-27
- **Status:** aprovado em brainstorming, aguardando revisão da spec escrita
- **Contexto:** desafio técnico da vaga de Estágio Desenvolvedor Full Stack da Tehokas
- **Prazo:** 1 a 2 dias

## 1. Objetivo e critérios de sucesso

Entregar um MVP em que um consultor autenticado cria **Projetos** e gerencia as **Tarefas** de cada projeto num Kanban, com um **Indicador de Saúde** que marca o projeto como "Em Alerta" quando mais de 20% das tarefas estão atrasadas.

O MVP está pronto quando:

1. O consultor faz login e vê **somente os próprios projetos** no dashboard, cada um com o Indicador de Saúde.
2. O consultor cria, edita e exclui projetos e tarefas.
3. No Kanban, o consultor muda o status de uma tarefa por **drag-and-drop** ou por **select**, e o indicador se atualiza na mesma resposta.
4. As tarefas podem ser filtradas por **prioridade** e por **status**, e os filtros ficam na URL.
5. A interface inteira, incluindo as telas do starter kit, está em **português**.
6. `composer ci:check` passa (Pint, PHPStan, tsc, `vp check` e Pest).

**Critérios de avaliação do desafio, com a resposta de cada um:**

| Critério | Como este design responde |
|---|---|
| Organização de código | Form Requests, Policies, Enums, API Resources e controllers finos, seguindo as convenções do starter kit |
| Domínio da stack | Inertia v3 (props, flash, atualização otimista, filtros via query string), Wayfinder e Fortify |
| Versionamento | Uma branch por feature e um PR por branch, sempre para `develop`, com commits `Tipo(escopo): descrição` |
| Lógica de negócio | Regra do indicador isolada numa função pura com testes de borda e agregação SQL sem N+1 |
| UX/UI | Dashboard com resumo, Kanban responsivo, feedback por toast, estados vazios e confirmação de exclusão |

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Escopo | Nível "Diferenciado": obrigatórios, drag-and-drop, prioridade, filtros, projetos por usuário e Sail no README |
| Tarefa atrasada | `deadline < agora` **e** `status ≠ Concluída`. Uma tarefa concluída nunca está atrasada. |
| Denominador do % | Todas as tarefas do projeto |
| Limite do alerta | **Mais de** 20%. Exatamente 20% é "Saudável". |
| Projeto sem tarefas | Estado próprio: **"Sem tarefas"** |
| Dono dos projetos | Cada consultor vê só os seus. Projeto de outro usuário retorna **404**. |
| Drag-and-drop | `@dnd-kit`, com select de status no card como alternativa |
| Prioridade | Baixa / Média / Alta, com padrão Média |
| Deadline | Data **e hora** |
| Fuso horário | `APP_TIMEZONE=America/Sao_Paulo`. O `datetime-local` é interpretado nesse fuso. |
| Idioma | Interface 100% em pt-BR, incluindo as telas do starter kit. Código em inglês. |
| Cálculo do indicador | Na leitura, com agregação SQL (`withCount`) e função pura. Nada é persistido. |
| Repositório | O app continua em `tehokas/`. O PDF do desafio não é versionado. |

**Por que o indicador não é persistido:** uma tarefa fica atrasada só porque o tempo passou, sem nenhuma escrita no banco. Uma coluna `health_status` ficaria desatualizada e exigiria um job agendado. Calcular na leitura com agregação SQL mantém o resultado sempre correto e custa uma única query por listagem.

## 3. Modelo de dados

### 3.1 Tabelas

**`projects`**

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK `users.id` | `cascadeOnDelete`, indexada |
| `name` | string(255) | obrigatório |
| `description` | text | nullable |
| `created_at` / `updated_at` | timestamps | |

**`tasks`**

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | bigint PK | |
| `project_id` | FK `projects.id` | `cascadeOnDelete` |
| `title` | string(255) | obrigatório |
| `description` | text | nullable |
| `status` | string | default `pending` |
| `priority` | string | default `medium` |
| `deadline` | datetime | obrigatório |
| `created_at` / `updated_at` | timestamps | |

Índices compostos: `(project_id, status)` e `(project_id, deadline)`.

### 3.2 Enums (`app/Enums/`)

Todos são string-backed, com casos em TitleCase e um método `label(): string` que devolve o texto em pt-BR.

| Enum | Casos (valor) | Labels |
|---|---|---|
| `TaskStatus` | `Pending` (`pending`), `InProgress` (`in_progress`), `Completed` (`completed`) | Pendente, Em Andamento, Concluída |
| `TaskPriority` | `Low` (`low`), `Medium` (`medium`), `High` (`high`) | Baixa, Média, Alta |
| `ProjectHealthStatus` | `NoTasks` (`no_tasks`), `Healthy` (`healthy`), `Alert` (`alert`) | Sem tarefas, Saudável, Em Alerta |

### 3.3 Models

- `User` → `hasMany(Project::class)`.
- `Project` → `belongsTo(User::class)`, `hasMany(Task::class)`. Fillable: `name` e `description`. O `user_id` é atribuído pela relação, nunca por mass assignment.
- `Task` → `belongsTo(Project::class)`.
  - Fillable: `title`, `description`, `status`, `priority` e `deadline`.
  - Casts: `status` → `TaskStatus`, `priority` → `TaskPriority`, `deadline` → `datetime`.
  - Scope `overdue()`: `where('deadline', '<', now())->where('status', '!=', TaskStatus::Completed)`. **É a única definição de "atrasada" no sistema.**
  - Scopes de filtro: `withPriority(?TaskPriority)` e `withStatus(?TaskStatus)`. Com `null`, não aplicam filtro.
  - Accessor `is_overdue` (booleano), com a mesma regra do scope, para uma tarefa individual.

### 3.4 Regra do Indicador de Saúde

```php
enum ProjectHealthStatus: string
{
    public const ALERT_THRESHOLD_PERCENT = 20;

    public static function fromCounts(int $totalTasks, int $overdueTasks): self
    {
        if ($totalTasks === 0) {
            return self::NoTasks;
        }

        return $overdueTasks * 100 > $totalTasks * self::ALERT_THRESHOLD_PERCENT
            ? self::Alert
            : self::Healthy;
    }
}
```

- A comparação usa **aritmética inteira** para evitar erro de ponto flutuante na borda de 20%.
- Na listagem, as contagens vêm de uma única query:
  `Project::withCount(['tasks', 'tasks as overdue_tasks_count' => fn ($q) => $q->overdue(), 'tasks as completed_tasks_count' => fn ($q) => $q->where('status', TaskStatus::Completed)])`.
  Esse conjunto de contagens fica num scope `Project::withTaskCounts()`, usado pelo dashboard e pelo Kanban.
- `Project` expõe `health(): ProjectHealthStatus` e `overduePercentage(): int` (arredondado), a partir de `tasks_count` e `overdue_tasks_count`.

### 3.5 Factories e seeder

- `ProjectFactory`, e `TaskFactory` com os estados `pending()`, `inProgress()`, `completed()`, `overdue()` e `highPriority()`.
- `DatabaseSeeder` cria o usuário de demonstração `consultor@tehokas.test` / `password` com três projetos:
  - **Saudável:** poucas tarefas atrasadas.
  - **Em Alerta:** mais de 20% atrasadas.
  - **Sem tarefas.**

## 4. Rotas, controllers e autorização

### 4.1 Rotas (`routes/projects.php`, incluído por `routes/web.php`, middlewares `auth` e `verified`)

| Método | URI | Ação | Nome |
|---|---|---|---|
| GET | `/dashboard` | `DashboardController` (invokable) | `dashboard` |
| POST | `/projects` | `ProjectController@store` | `projects.store` |
| GET | `/projects/{project}` | `ProjectController@show` | `projects.show` |
| PATCH | `/projects/{project}` | `ProjectController@update` | `projects.update` |
| DELETE | `/projects/{project}` | `ProjectController@destroy` | `projects.destroy` |
| POST | `/projects/{project}/tasks` | `TaskController@store` | `projects.tasks.store` |
| PATCH | `/tasks/{task}` | `TaskController@update` | `tasks.update` |
| DELETE | `/tasks/{task}` | `TaskController@destroy` | `tasks.destroy` |
| PATCH | `/tasks/{task}/status` | `TaskStatusController` (invokable) | `tasks.status.update` |

- As rotas de tarefas usam `Route::resource('projects.tasks', ...)->shallow()->only([...])`.
- O `Route::inertia('dashboard', ...)` atual é substituído pelo `DashboardController`.
- O Fortify continua redirecionando para `/dashboard` após o login.

### 4.2 Controllers

- **`DashboardController`**: `Inertia::render('dashboard', ...)` com `projects` (coleção de `ProjectResource`, com as contagens e o `health`) e `summary` (`total_projects`, `projects_in_alert`, `overdue_tasks`).
- **`ProjectController`**
  - `store` cria via `$request->user()->projects()->create(...)`.
  - `show` renderiza `projects/show` com `project` (inclui `health`), `tasks` (filtradas pelos query params `priority` e `status`, ordenadas por `deadline`) e `filters` (valores atuais).
  - `update` e `destroy` completam o CRUD. O `destroy` redireciona para o dashboard.
- **`TaskController`**: `store`, `update` e `destroy`.
- **`TaskStatusController`**: altera só o `status`. É o endpoint do Kanban.
- Todas as escritas terminam com `Inertia::flash('toast', ['type' => ..., 'message' => __('...')])` e um redirect, seguindo o padrão do `ProfileController`.

### 4.3 Validação (Form Requests em `app/Http/Requests/`)

| Request | Regras |
|---|---|
| `StoreProjectRequest` / `UpdateProjectRequest` | `name: required, string, max:255`; `description: nullable, string, max:2000` |
| `StoreTaskRequest` / `UpdateTaskRequest` | `title: required, string, max:255`; `description: nullable, string, max:5000`; `status: required, Rule::enum(TaskStatus)`; `priority: required, Rule::enum(TaskPriority)`; `deadline: required, date` |
| `UpdateTaskStatusRequest` | `status: required, Rule::enum(TaskStatus)` |

- **Prazos no passado são permitidos de propósito**, para que o consultor possa registrar tarefas que já estão atrasadas.
- O `authorize()` de cada request chama a Policy.
- Os filtros do `show` são validados com `Rule::enum` e `nullable`. Valores inválidos são ignorados, não geram erro.

### 4.4 Autorização

- `ProjectPolicy`: `view`, `update` e `delete` só passam se `$project->user_id === $user->id`. Caso contrário, `Response::denyAsNotFound()`, para não revelar que o projeto existe.
- As operações de tarefa autorizam contra `$task->project` com a mesma Policy. Não há `TaskPolicy` separada.

### 4.5 Serialização (`app/Http/Resources/`)

- **`ProjectResource`**: `id`, `name`, `description`, `tasks_count`, `completed_tasks_count`, `overdue_tasks_count`, `overdue_percentage`, `health` (`{ value, label }`).
- **`TaskResource`**: `id`, `title`, `description`, `status` (`{ value, label }`), `priority` (`{ value, label }`), `deadline` (ISO 8601 com offset), `is_overdue`.
- O frontend **não repete** regras de negócio: "atrasada", "saúde" e os labels vêm prontos do backend.

## 5. Frontend

### 5.1 Páginas

**`pages/dashboard.tsx`** (reescrita)
- Três cards de resumo: projetos, projetos em alerta e tarefas atrasadas.
- Grade de `ProjectCard` (1 coluna no mobile, 2 em `md`, 3 em `xl`), cada um com nome, descrição, progresso (concluídas/total), número de atrasadas e `HealthBadge`.
- Botão "Novo projeto", que abre o `ProjectFormDialog`.
- Estado vazio com chamada para criar o primeiro projeto.

**`pages/projects/show.tsx`** (Kanban)
- Cabeçalho com nome, `HealthBadge` e percentual de atrasadas, mais um menu (DropdownMenu) para editar ou excluir o projeto.
- Barra de filtros:
  - `Select` de prioridade;
  - `ToggleGroup` de status, que esconde as colunas não selecionadas;
  - botão "Limpar filtros".
  - Os filtros usam `router.get(url, filters, { preserveState: true, replace: true })`.
- Botão "Nova tarefa", que abre o `TaskFormDialog`.
- Três colunas (Pendente, Em Andamento, Concluída) com contador. Ficam lado a lado a partir de `md` e empilhadas no mobile.

### 5.2 Componentes

| Arquivo | Responsabilidade |
|---|---|
| `components/projects/health-badge.tsx` | Badge colorido: verde Saudável, vermelho Em Alerta, cinza Sem tarefas |
| `components/projects/project-card.tsx` | Card do projeto no dashboard, com link para o Kanban |
| `components/projects/project-form-dialog.tsx` | Criar e editar projeto (`Form` do Inertia + Wayfinder) |
| `components/tasks/kanban-board.tsx` | `DndContext`, sensores (Pointer, Touch, Keyboard) e `onDragEnd` |
| `components/tasks/kanban-column.tsx` | Coluna droppable com cabeçalho e contador |
| `components/tasks/task-card.tsx` | Card draggable: título, badge de prioridade, prazo pt-BR, destaque "Atrasada", select de status e menu editar/excluir |
| `components/tasks/task-form-dialog.tsx` | Criar e editar tarefa, com `datetime-local` para o deadline |
| `components/ui/textarea.tsx` | Textarea no padrão shadcn (o único componente de base que falta) |
| `types/project.ts` | Tipos `Project`, `Task`, `ProjectHealth` e `EnumOption`, espelhando as Resources |

- Os componentes reutilizam os existentes: `Card`, `Badge`, `Dialog`, `Select`, `ToggleGroup`, `DropdownMenu`, `Button`, `Input`, `Label` e `InputError`.
- As rotas vêm sempre do Wayfinder (`@/actions/...` e `@/routes/...`), nunca de URLs escritas à mão.

### 5.3 Fluxo de mudança de status (drag-and-drop ou select)

1. O `onDragEnd` identifica a coluna de destino. Se for a mesma coluna, não faz nada.
2. `router.patch(TaskStatusController.url(task), { status }, { preserveScroll: true, only: ['project', 'tasks'] })`.
3. Atualização **otimista** do Inertia v3: o card muda de coluna imediatamente e o estado volta sozinho se a requisição falhar. **A API exata deve ser confirmada na documentação (`search-docs`) antes da implementação.**
4. A resposta traz o `project` com o `health` recalculado, então o badge do cabeçalho se atualiza.
5. O select do card chama a mesma função, então existe um único caminho de atualização.

### 5.4 Datas

- O backend envia o `deadline` em ISO 8601 com offset.
- O frontend formata com `Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })`.
- O formulário usa `datetime-local` (`YYYY-MM-DDTHH:mm`), que o backend interpreta no fuso do app.

### 5.5 Navegação

- O item "Dashboard" da sidebar passa a se chamar "Projetos".
- Os links do starter kit no rodapé da sidebar (Repository e Documentation) são removidos.

## 6. Tratamento de erros e UX

- **Validação:** erros abaixo de cada campo (`InputError`) e o modal continua aberto.
- **Falha na mudança de status:** rollback otimista mais `toast.error`.
- **Exclusões:** dialog de confirmação. A exclusão de projeto avisa que as tarefas também serão excluídas.
- **Sucesso:** toast via `Inertia::flash` (já integrado ao `use-flash-toast.ts`).
- **Acesso indevido:** 404.
- **Estados vazios:** dashboard sem projetos, coluna sem tarefas e filtro sem resultados.

## 7. Tradução pt-BR (sem dependências novas)

- `.env` e `.env.example`: `APP_LOCALE=pt_BR`, `APP_FALLBACK_LOCALE=en`, `APP_TIMEZONE=America/Sao_Paulo`.
- `lang/pt_BR/validation.php`, `auth.php`, `passwords.php` e `pagination.php` para as mensagens do framework e do Fortify.
- `lang/pt_BR.json` para as strings `__('...')` do app (toasts, "Profile updated." etc.).
- Os textos dos `.tsx` são traduzidos diretamente: páginas `auth/*`, `settings/*`, `welcome`, layouts, sidebar, menus e componentes (`delete-user`, `manage-two-factor`, `manage-passkeys` etc.).
- Os testes existentes que verificam textos em inglês são atualizados.
- É a **última feature**, para não travar o domínio se o prazo apertar.

## 8. Testes (Pest)

**Unit: `ProjectHealthStatus::fromCounts`** (dataset)

| Atrasadas / Total | Esperado |
|---|---|
| 0 / 0 | `NoTasks` |
| 0 / 3 | `Healthy` |
| 2 / 10 (20% exato) | `Healthy` |
| 3 / 10 | `Alert` |
| 1 / 4 | `Alert` |
| 1 / 1 | `Alert` |

**Feature: scope `overdue()` e `is_overdue`**, com `travelTo()`:
- prazo vencido e Pendente ou Em Andamento → atrasada;
- prazo vencido e Concluída → não atrasada;
- prazo futuro → não atrasada.

**Feature: HTTP**
- O dashboard lista só os projetos do usuário, com `health` e `summary` corretos (`assertInertia`).
- CRUD de projeto: criar, editar e excluir (as tarefas são excluídas em cascata).
- CRUD de tarefa.
- `PATCH /tasks/{task}/status` atualiza o status. Um status inválido gera erro de validação.
- Os filtros `priority` e `status` no `show` devolvem só as tarefas correspondentes.
- Projeto ou tarefa de outro usuário retorna 404 em todas as rotas.
- Usuário não autenticado é redirecionado para o login.

**Gate de qualidade antes de cada PR:** `composer ci:check`.

## 9. Fluxo git

- Cada feature nasce de `develop` numa branch própria e vai para `develop` via PR com merge commit, e a branch é apagada depois.
- O merge `develop → main` é feito **somente pelo usuário**.
- Commits no padrão `Tipo(escopo): descrição em português`, por exemplo `Feat(tasks): adiciona enum TaskStatus`.
- Ordem das branches:
  1. `docs/design-spec`: esta spec e a remoção do PDF do versionamento.
  2. `feat/domain-model`: migrations, enums, models, factories, seeder e testes da regra.
  3. `feat/dashboard`: rotas, Policy, Resources, `DashboardController`, CRUD de projeto e página do dashboard.
  4. `feat/kanban`: CRUD de tarefas, `TaskStatusController` e Kanban com dnd-kit.
  5. `feat/task-filters`: filtros por prioridade e status.
  6. `feat/pt-br`: tradução completa.
  7. `docs/readme`: README (instalação, Sail, tecnologias, maior dificuldade).

## 10. Fora de escopo (YAGNI)

- Ordenação manual dos cards dentro da coluna (os cards ficam ordenados por deadline).
- Projetos compartilhados, equipes e papéis.
- Notificações de prazo, histórico de alterações e anexos.
- Biblioteca de i18n no frontend e troca de idioma.
- Deploy público e o PowerPoint. São entregas separadas, com seu próprio ciclo.

## 11. Dependências novas

- `@dnd-kit/core` e `@dnd-kit/utilities` (npm). Esta é a **única** dependência nova, aprovada no brainstorming.
