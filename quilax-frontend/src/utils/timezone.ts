/**
 * Timezone helpers — display absolute instants in the viewer's zone
 * (Europe/Madrid vs Atlantic/Canary, etc.)
 */
import i18n from '@/i18n';

export function getDateLocale(lang?: string): string {
  const l = (lang || i18n.language || 'es').toLowerCase().slice(0, 2);
  switch (l) {
    case 'en':
      return 'en-GB';
    case 'fr':
      return 'fr-FR';
    case 'de':
      return 'de-DE';
    case 'pt':
      return 'pt-PT';
    default:
      return 'es-ES';
  }
}

export function resolveViewerTimezone(
  preferred?: string | null,
  fallback = 'Europe/Madrid'
): string {
  // Prefer device zone so Canarias vs peninsula matches the phone clock
  try {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (device) return device;
  } catch {
    /* ignore */
  }
  if (preferred && preferred.includes('/')) return preferred;
  return fallback;
}

/** Map Spanish autonomous community label → IANA (when known). */
export function timezoneFromSpanishRegion(region?: string | null): string | null {
  if (!region) return null;
  const r = region.toLowerCase();
  if (r.includes('canaria')) return 'Atlantic/Canary';
  if (r.includes('ceuta') || r.includes('melilla')) return 'Africa/Ceuta';
  // Rest of Spain mainland
  if (
    r.includes('madrid') ||
    r.includes('cataluña') ||
    r.includes('catalunya') ||
    r.includes('andaluc') ||
    r.includes('valencia') ||
    r.includes('galicia') ||
    r.includes('país vasco') ||
    r.includes('pais vasco') ||
    r.includes('euskadi')
  ) {
    return 'Europe/Madrid';
  }
  return null;
}

export function formatQuizStart(
  iso: string | Date,
  timeZone: string
): {
  dateLabel: string;
  timeLabel: string;
  fullLabel: string;
  compactLabel: string;
  timeZoneAbbr: string;
} {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) {
    return {
      dateLabel: '—',
      timeLabel: '—',
      fullLabel: i18n.t('common.dateUnavailable'),
      compactLabel: '—',
      timeZoneAbbr: '',
    };
  }

  const locale = getDateLocale();

  const dateLabel = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

  const compactDate = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);

  const timeLabel = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  let timeZoneAbbr = '';
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(d);
    timeZoneAbbr = parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch {
    /* ignore */
  }

  const withTz = timeZoneAbbr ? ` ${timeZoneAbbr}` : '';

  return {
    dateLabel,
    timeLabel,
    fullLabel: `${dateLabel} · ${timeLabel}${withTz}`,
    compactLabel: `${compactDate} · ${timeLabel}${withTz}`,
    timeZoneAbbr,
  };
}

export type CountdownParts = {
  totalMs: number;
  started: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
};

export function getCountdown(toIso: string | Date, now = Date.now()): CountdownParts {
  const target = typeof toIso === 'string' ? new Date(toIso).getTime() : toIso.getTime();
  const totalMs = target - now;

  if (!Number.isFinite(totalMs)) {
    return {
      totalMs: 0,
      started: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: '—',
    };
  }

  if (totalMs <= 0) {
    return {
      totalMs: 0,
      started: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: i18n.t('common.countdownStarted'),
    };
  }

  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, '0')}h`);
  parts.push(`${String(minutes).padStart(2, '0')}m`);
  parts.push(`${String(seconds).padStart(2, '0')}s`);

  return {
    totalMs,
    started: false,
    days,
    hours,
    minutes,
    seconds,
    label: parts.join(' '),
  };
}
