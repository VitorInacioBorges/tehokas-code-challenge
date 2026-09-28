import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Checklist de Projetos';

// The `success` event alone doesn't carry the visit's method, so track it
// via `start` (keyed by visit id) and consume it when the visit finishes.
// Prefetched links (project-card, sidebar/header nav) can otherwise keep
// showing a stale dashboard for up to 30s after a mutation.
const visitMethodsById = new Map<string, string>();

router.on('start', (event) => {
    visitMethodsById.set(event.detail.visit.id, event.detail.visit.method);
});

router.on('success', (event) => {
    const visitId = event.detail.visitId;
    const method = visitId ? visitMethodsById.get(visitId) : undefined;

    if (method && method !== 'get') {
        router.flushAll();
    }
});

router.on('finish', (event) => {
    visitMethodsById.delete(event.detail.visit.id);
});

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#0e428b',
    },
});

// This will set light / dark mode on load...
initializeTheme();
