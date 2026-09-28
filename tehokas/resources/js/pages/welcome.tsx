import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login } from '@/routes';
import { register } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    const highlights = [
        'Indicador de saúde: alerta automático quando mais de 20% das tarefas estão atrasadas',
        'Kanban com arrastar e soltar',
        'Filtros por status e prioridade',
    ];

    return (
        <>
            <Head title="Checklist de Projetos" />
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
                <header className="mb-6 w-full max-w-[335px] text-sm lg:max-w-4xl">
                    <nav className="flex items-center justify-end gap-4">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Ir para os projetos
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
                                >
                                    Entrar
                                </Link>
                                <Link
                                    href={register()}
                                    className="inline-block rounded-sm border border-[#19140035] px-5 py-1.5 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                                >
                                    Criar conta
                                </Link>
                            </>
                        )}
                    </nav>
                </header>
                <main className="flex w-full max-w-[335px] flex-1 flex-col items-center justify-center gap-10 py-12 text-center lg:max-w-2xl">
                    <div className="space-y-4">
                        <h1 className="text-3xl font-semibold tracking-tight text-[#1b1b18] sm:text-4xl dark:text-[#EDEDEC]">
                            Checklist de Projetos
                        </h1>
                        <p className="text-base leading-relaxed text-[#706f6c] sm:text-lg dark:text-[#A1A09A]">
                            Acompanhe as tarefas dos seus clientes e descubra
                            quais projetos precisam de atenção antes que
                            atrasem.
                        </p>
                    </div>

                    <ul className="flex w-full flex-col gap-3 text-left">
                        {highlights.map((highlight) => (
                            <li
                                key={highlight}
                                className="flex items-start gap-3 rounded-lg border border-[#e3e3e0] bg-white px-4 py-3 text-sm leading-relaxed text-[#1b1b18] shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.06)] dark:border-[#3E3E3A] dark:bg-[#161615] dark:text-[#EDEDEC]"
                            >
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f53003]/10 text-xs font-semibold text-[#f53003] dark:bg-[#FF4433]/10 dark:text-[#FF4433]">
                                    ✓
                                </span>
                                <span>{highlight}</span>
                            </li>
                        ))}
                    </ul>

                    {!auth.user && (
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href={login()}
                                className="inline-block rounded-sm border border-[#19140035] px-5 py-2 text-sm leading-normal text-[#1b1b18] hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
                            >
                                Entrar
                            </Link>
                            <Link
                                href={register()}
                                className="inline-block rounded-sm border border-black bg-[#1b1b18] px-5 py-2 text-sm leading-normal text-white hover:border-black hover:bg-black dark:border-[#eeeeec] dark:bg-[#eeeeec] dark:text-[#1C1C1A] dark:hover:border-white dark:hover:bg-white"
                            >
                                Criar conta
                            </Link>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
