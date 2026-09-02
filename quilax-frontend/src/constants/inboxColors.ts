/** Light colors for inbox message sources (labels come from i18n). */
export const INBOX_COLORS = {
  user: {
    bg: '#E8F4FC',
    border: '#B9D8F0',
    badge: '#3B82F6',
  },
  admin: {
    bg: '#FFF4E8',
    border: '#F0D0A8',
    badge: '#D97706',
  },
  broadcast: {
    bg: '#F0EDFA',
    border: '#D2C8EC',
    badge: '#7C3AED',
  },
} as const;

export type InboxKind = keyof typeof INBOX_COLORS;

const INBOX_LABEL_KEYS: Record<InboxKind, string> = {
  user: 'messages.legendPlayer',
  admin: 'messages.legendAdmin',
  broadcast: 'messages.legendEveryone',
};

export function getInboxLabelKey(kind: InboxKind): string {
  return INBOX_LABEL_KEYS[kind] ?? INBOX_LABEL_KEYS.user;
}
