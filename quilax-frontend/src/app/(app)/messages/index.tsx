import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, titleTypeface } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import messageService from '@/services/messageService';
import { INBOX_COLORS, getInboxLabelKey } from '@/constants/inboxColors';
import { getDateLocale } from '@/utils/timezone';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';

type InboxKind = 'user' | 'admin' | 'broadcast';

type InboxItem = {
  key: string;
  kind: InboxKind;
  title: string;
  preview: string;
  createdAt: string;
  unread: boolean;
  href: string;
};

function classifyNotification(n: any): InboxKind {
  const scope = n?.data?.scope;
  const type = String(n?.type || '').toUpperCase();
  if (scope === 'broadcast' || type === 'GLOBAL') return 'broadcast';
  if (scope === 'direct') return 'admin';
  // App-wide / announcement without scope → treat as broadcast
  if (type === 'ANNOUNCEMENT') return 'broadcast';
  // Quiz/system to one user → admin/app channel (peach)
  return 'admin';
}

export default function MessagesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth() as any;
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [inboxRes, notifRes] = await Promise.all([
      messageService.getInbox(),
      messageService.getNotifications(),
    ]);

    if (inboxRes.success) {
      const data = inboxRes.data;
      const list = Array.isArray(data) ? data : data?.messages || data?.data || [];
      setDmMessages(list);
    } else {
      setDmMessages([]);
    }

    if (notifRes.success) {
      setNotifications(notifRes.data || []);
    } else {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const items = useMemo<InboxItem[]>(() => {
    const rows: InboxItem[] = [];

    // User DMs → one row per conversation
    if (user?.id) {
      const byUser = new Map<number, { last: any; unread: number }>();
      for (const m of dmMessages) {
        const otherId = m.fromUserId === user.id ? m.toUserId : m.fromUserId;
        const unread = m.toUserId === user.id && !m.isRead ? 1 : 0;
        const existing = byUser.get(otherId);
        if (!existing) {
          byUser.set(otherId, { last: m, unread });
        } else {
          if (new Date(m.createdAt) > new Date(existing.last.createdAt)) {
            existing.last = m;
          }
          existing.unread += unread;
        }
      }
      for (const [otherId, conv] of byUser) {
        const other =
          conv.last.fromUserId === otherId ? conv.last.fromUser : conv.last.toUser;
        const title =
          other?.fullName ||
          (other?.username ? `@${other.username}` : null) ||
          t('messages.playerFallback', { id: otherId });
        rows.push({
          key: `dm-${otherId}`,
          kind: 'user',
          title,
          preview: conv.last.content || '',
          createdAt: conv.last.createdAt,
          unread: conv.unread > 0,
          href: `/(app)/messages/${otherId}`,
        });
      }
    }

    // Admin / broadcast notifications
    for (const n of notifications) {
      const kind = classifyNotification(n);
      const quizId = n?.data?.quizId;
      const href =
        n?.data?.href ||
        (quizId
          ? `/(app)/quiz/${quizId}`
          : `/(app)/messages/notice/${n.id}`);
      rows.push({
        key: `n-${n.id}`,
        kind,
        title: n.title || (kind === 'broadcast' ? t('messages.generalNotice') : t('messages.quilaxMessage')),
        preview: n.body || n.message || '',
        createdAt: n.createdAt,
        unread: !n.read,
        href,
      });
    }

    return rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [dmMessages, notifications, user?.id, t]);

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} />
      }
      contentContainerStyle={styles.screenGrow}
    >
      <AppHeader
        title={t('messages.title')}
        subtitle={t('messages.subtitle')}
      />

      <View style={styles.legend}>
        {(
          [
            ['user', t('messages.legendPlayer')],
            ['admin', t('messages.legendAdmin')],
            ['broadcast', t('messages.legendEveryone')],
          ] as const
        ).map(([k, label]) => (
          <View key={k} style={[styles.legendChip, { backgroundColor: INBOX_COLORS[k].bg }]}>
            <View style={[styles.legendDot, { backgroundColor: INBOX_COLORS[k].badge }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.list}>
        {/* Chat fijado: normas + envío real al panel */}
        <Pressable
          onPress={() => router.push('/(app)/messages/admin' as any)}
          style={({ pressed }) => [
            styles.pinnedRow,
            {
              backgroundColor: INBOX_COLORS.admin.bg,
              borderColor: INBOX_COLORS.admin.border,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={[styles.kindBadge, { backgroundColor: INBOX_COLORS.admin.badge }]}>
            <Text style={styles.kindBadgeText}>{t('messages.legendAdmin')}</Text>
          </View>
          <View style={styles.pinnedText}>
            <Text style={styles.pinnedTitle}>{t('messages.adminPanelTitle')}</Text>
            <Text style={styles.pinnedPreview} numberOfLines={1}>
              {t('messages.adminPanelPreview')}
            </Text>
          </View>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>{t('messages.emptyInbox')}</Text>
        ) : (
          items.map((item) => {
            const c = INBOX_COLORS[item.kind];
            return (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.href as any)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: c.bg,
                    borderColor: c.border,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <View style={styles.rowTop}>
                  <View style={[styles.kindBadge, { backgroundColor: c.badge }]}>
                    <Text style={styles.kindBadgeText}>{t(getInboxLabelKey(item.kind))}</Text>
                  </View>
                  {item.unread ? <View style={styles.unreadDot} /> : null}
                  <Text style={styles.time}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString(getDateLocale(), {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </Text>
                </View>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.preview} numberOfLines={2}>
                  {item.preview}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenGrow: { flexGrow: 1, paddingBottom: Spacing.six },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '700', color: Colors.light.text },
  list: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    minHeight: 320,
  },
  empty: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    marginBottom: 4,
  },
  pinnedText: { flex: 1, minWidth: 0 },
  pinnedTitle: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  pinnedPreview: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  row: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: Spacing.three,
    marginBottom: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  kindBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kindBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.error,
  },
  time: {
    marginLeft: 'auto',
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  title: {
    ...titleTypeface,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  preview: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
  },
});
