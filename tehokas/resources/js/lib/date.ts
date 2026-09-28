const deadlineFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
});

export function formatDeadline(iso: string): string {
    return deadlineFormatter.format(new Date(iso));
}
