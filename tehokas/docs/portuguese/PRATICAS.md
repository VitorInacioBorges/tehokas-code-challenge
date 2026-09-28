# Práticas adotadas

Este documento reúne as práticas de engenharia usadas na construção do
Checklist de Projetos: como o trabalho é organizado no Git, como o código é
testado e revisado, e as decisões de segurança, internacionalização e
acessibilidade.

## Fluxo Git

Cada funcionalidade nasce da branch `develop` numa branch própria, com prefixo
que indica o tipo de mudança (`feat/...`, `fix/...`, `docs/...`). O trabalho
segue para `develop` por Pull Request e é integrado com merge commit; a branch
é apagada depois do merge. O merge final `develop → main` é feito manualmente
pelo usuário, só na entrega do desafio — é esse merge que dispara o deploy
automático no Render (veja a seção "Deploy (Render)" no
[README](../../../README.md)).

### Conventional Commits em português

Os commits seguem o padrão `Tipo(escopo): descrição`, com o tipo em inglês e a
descrição em português, por exemplo:

```
Feat(kanban): adiciona quadro Kanban com drag-and-drop e atualização otimista
Fix(filters): ignora filtros com formato inválido na query string
Docs(deploy): documenta o Blueprint do Render
```

Os tipos usados no histórico do projeto incluem `Feat`, `Fix`, `Docs` e
`Chore`.

## TDD com Pest

O projeto usa [Pest](https://pestphp.com/) como framework de testes, com o
plugin `pestphp/pest-plugin-laravel`. O ciclo de desenvolvimento segue TDD:
primeiro um teste que expõe o comportamento esperado (ou o bug), depois a
implementação que faz esse teste passar. Isso é visível no histórico de commits
do projeto: por exemplo, o commit `Fix(filters): ignora filtros com formato
inválido na query string` corrige exatamente o cenário descrito na seção
"Maior dificuldade técnica" do README, e o teste correspondente
(`tests/Feature/Tasks/TaskFiltersTest.php`, caso `array-shaped filter values
are ignored instead of failing`) documenta esse comportamento permanentemente.

Os testes ficam organizados por tipo em `tests/Feature` (comportamento ponta a
ponta, via HTTP) e `tests/Unit` (regras isoladas, como os enums). A suíte
completa tem 87 testes e 336 assertions.

## Revisão por tarefa

Cada tarefa do [plano de implementação](../superpowers/plans/2026-09-27-checklist-projetos.md)
passa por uma revisão de código antes de ser considerada concluída, não só ao
final do projeto. Essa prática foi o que revelou os três problemas descritos
na seção "Maior dificuldade técnica" do README (filtros com array na query
string, fuso horário do prazo e isolamento entre consultores): nenhum deles
apareceu no uso normal da tela, só ao revisar o código pensando em entradas
que um usuário não digitaria de propósito.

## Qualidade de código

Três ferramentas automatizadas formam o gate de qualidade, todas reunidas no
Composer script `ci:check` (`composer.json`):

| Ferramenta | O que verifica |
|---|---|
| **Laravel Pint** (preset `laravel`, baseado em PSR-12) | Formatação do código PHP. `vendor/bin/pint --dirty` corrige automaticamente. |
| **PHPStan / Larastan, nível 7** (`phpstan.neon`) | Análise estática: tipos incorretos, chamadas a métodos inexistentes, nulos não tratados. |
| **`vp check` (vite-plus) + `tsc --noEmit`** | Lint, formatação e checagem de tipos do frontend TypeScript/React. |

Como o workflow de GitHub Actions em `tehokas/.github/workflows/tests.yml`
não roda de fato neste repositório (o GitHub só lê `.github/` a partir da
raiz do repositório, e o app fica em `tehokas/`), `composer ci:check` rodado
manualmente antes de cada PR é o gate de qualidade real do projeto.

## Separação de responsabilidades

O código do backend segue uma divisão de responsabilidades explícita, em vez
de concentrar tudo no controller:

- **Form Requests** (`app/Http/Requests/`) concentram validação
  (`rules()`) e autorização (`authorize()`) de cada ação. Regras repetidas
  entre criar e atualizar (por exemplo, os campos de uma tarefa) ficam numa
  trait de validação compartilhada em `app/Concerns/` (`TaskValidationRules`,
  `ProjectValidationRules`), para que `StoreTaskRequest` e `UpdateTaskRequest`
  não dupliquem a mesma lista de regras.
- **Policies** (`app/Policies/ProjectPolicy.php`) concentram as decisões de
  autorização ("quem pode ver/editar/excluir este projeto").
- **API Resources** (`app/Http/Resources/`) concentram a serialização dos
  models para o frontend, incluindo campos calculados como `health` e
  `overdue_percentage`.
- **Enums** (`app/Enums/`) concentram os valores fechados do domínio
  (`TaskStatus`, `TaskPriority`, `ProjectHealthStatus`) e suas regras de
  negócio (como `ProjectHealthStatus::fromCounts()`), em vez de strings soltas
  espalhadas pelo código.
- **Controllers** (`app/Http/Controllers/`) ficam finos: recebem um Form
  Request já validado e autorizado, chamam o Eloquent e devolvem uma resposta.

Mais detalhes de como essas peças se conectam estão em
[ARQUITETURA.md](ARQUITETURA.md).

## Segurança

- **Mass assignment controlado:** os models usam o atributo
  `#[Fillable([...])]` do Eloquent (`App\Models\Project`, `App\Models\Task`)
  para declarar explicitamente quais colunas podem ser preenchidas em massa,
  em vez de `$guarded = []`.
- **Isolamento entre consultores via 404:** `ProjectPolicy::denyAsNotFound()`
  faz com que tentar acessar o projeto de outro consultor pareça idêntico a
  esse projeto não existir, em vez de devolver 403 (o que confirmaria a
  existência do recurso). Veja a seção "Autorização" em
  [ARQUITETURA.md](ARQUITETURA.md#autorização).
- **Trust proxies:** `bootstrap/app.php` configura
  `$middleware->trustProxies(at: '*')` porque o Render fica atrás de um proxy
  reverso HTTPS; sem isso, o Laravel geraria URLs `http://` em produção,
  quebrando redirects e assets. `tests/Feature/TrustedProxyTest.php` verifica
  que uma requisição com o cabeçalho `X-Forwarded-Proto: https` gera URLs
  `https://`.
- **Comandos destrutivos bloqueados em produção:**
  `DB::prohibitDestructiveCommands(app()->isProduction())`
  (`AppServiceProvider`) impede comandos como `migrate:fresh` de rodarem por
  engano em produção.
- **Senhas fortes em produção:** `AppServiceProvider` exige senhas com no
  mínimo 12 caracteres, maiúsculas, minúsculas, números, símbolos e checagem
  contra vazamentos conhecidos (`Password::uncompromised()`) quando
  `app()->isProduction()` é verdadeiro; em desenvolvimento e teste, a regra
  padrão do Laravel se aplica.

## Internacionalização (i18n)

A interface inteira é em pt-BR, incluindo as telas do starter kit
(autenticação, configurações). Duas camadas cuidam disso:

- **Backend:** as strings passam por `__()` com a chave em inglês (por
  exemplo, `__('Project created.')` em `ProjectController`), e
  `lang/pt_BR.json` traduz essas chaves para português. As mensagens de
  validação e autenticação padrão do Laravel são traduzidas em
  `lang/pt_BR/validation.php`, `lang/pt_BR/auth.php` e
  `lang/pt_BR/passwords.php`. `APP_LOCALE=pt_BR` e `APP_FALLBACK_LOCALE=en`
  garantem que uma chave sem tradução ainda apareça em inglês, em vez de
  quebrar.
- **Frontend:** os rótulos de enum (`Pendente`, `Em Andamento`, `Concluída`
  etc.) vêm prontos do backend via `HasOptions::toOption()`
  (`app/Concerns/HasOptions.php`), então o React nunca precisa manter uma
  segunda tabela de tradução para os mesmos valores.

## Acessibilidade

O Kanban oferece três formas equivalentes de mudar o status de uma tarefa:
arrastar com o mouse, arrastar no toque e mover pelo teclado — todas levam à
mesma atualização otimista. Isso é possível porque
`resources/js/components/tasks/kanban-board.tsx` configura os três sensores
do `@dnd-kit` (`PointerSensor`, `TouchSensor`, `KeyboardSensor`) e define
`screenReaderInstructions` e `announcements` em português, para que um leitor
de tela anuncie quando uma tarefa é pega, sobre qual coluna ela está e quando
é solta — sem esses anúncios, o drag-and-drop seria invisível para quem usa
leitor de tela. Como caminho alternativo sem arrastar nada, cada cartão de
tarefa também tem um `select` de status que dispara a mesma ação.
