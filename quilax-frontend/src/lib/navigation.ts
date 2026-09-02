import type { Router } from 'expo-router';

/**
 * Destino "padre" para botones atrás dentro de stacks anidados en tabs.
 * Evita router.back(), que en web/tabs a menudo salta a Home.
 */
export function parentHrefFromSegments(segments: string[]): string | null {
  const cleaned = segments.filter((s) => !s.startsWith('(') || s === '(app)');
  // Normaliza: quita el grupo (app) para mirar la ruta real
  const parts =
    cleaned[0] === '(app)' ? cleaned.slice(1) : segments.filter((s) => !s.startsWith('('));

  if (parts[0] === 'settings') {
    if (parts[1] === 'tickets' && parts.length >= 3) {
      return '/(app)/settings/tickets';
    }
    if (parts.length >= 2) return '/(app)/settings';
  }

  if (parts[0] === 'messages' && parts.length >= 2) {
    return '/(app)/messages';
  }

  if (parts[0] === 'profile' && parts.length >= 2) {
    return '/(app)/profile';
  }

  if (parts[0] === 'search' && parts.length >= 2) {
    return '/(app)/search';
  }

  if (parts[0] === 'quiz') {
    if (
      parts[1] === 'difficulty' ||
      parts[1] === 'schedule' ||
      parts[1] === 'confirm'
    ) {
      return '/(app)/quiz/create';
    }
    if (parts.length >= 2 && parts[1] !== 'create' && parts[1] !== 'run') {
      // quiz/[id] o confirm-join → volver a home si no hay back fiable
      return '/(app)';
    }
  }

  return null;
}

export function goToParent(router: Router, segments: string[], backHref?: string) {
  const target = backHref || parentHrefFromSegments(segments);
  if (target) {
    // navigate (no back): mantiene el tab correcto y abre el hub
    router.navigate(target as any);
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.navigate('/(app)' as any);
}
