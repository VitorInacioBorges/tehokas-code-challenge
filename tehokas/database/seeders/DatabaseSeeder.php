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
