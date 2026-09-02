import React, { useEffect, useMemo, useState } from 'react';
import {
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, titleTypeface } from '@/constants/theme';
import messageService from '@/services/messageService';
import { INBOX_COLORS, getInboxLabelKey } from '@/constants/inboxColors';
import { getDateLocale } from '@/utils/timezone';
import CustomIcon from '@/components/CustomIcon';

export default function NoticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const noticeId = Number(id);
  const [notice, setNotice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await messageService.getNotifications();
      if (res.success) {
        const found = (res.data || []).find((n: any) => Number(n.id) === noticeId);
        setNotice(found || null);
        if (found && !found.read) {
          messageService.markNotificationRead(noticeId).catch(() => {});
        }
      }
      setLoading(false);
    })();
  }, [noticeId]);

  const kind = useMemo(() => {
    if (!notice) return 'admin' as const;
    const scope = notice?.data?.scope;
    const type = String(notice?.type || '').toUpperCase();
    if (scope === 'broadcast' || type === 'GLOBAL') return 'broadcast' as const;
    if (scope === 'direct') return 'admin' as const;
    if (type === 'ANNOUNCEMENT') return 'broadcast' as const;
    return 'admin' as const;
  }, [notice]);

  const c = INBOX_COLORS[kind];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.column}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.navigate('/(app)/messages' as any)}
            style={styles.backBtn}
            hitSlop={10}
          >
            <CustomIcon name="back" size={22} color={Colors.light.text} />
          </Pressable>
          <View style={styles.topText}>
            <Text style={styles.topTitle}>
              {kind === 'broadcast' ? t('messages.generalNotice') : t('messages.adminMessageTitle')}
            </Text>
            <Text style={styles.topSub}>
              {kind === 'broadcast' ? t(getInboxLabelKey(kind)) : t('common.appName')} · {t('messages.noReply')}
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 48 }} />
        ) : !notice ? (
          <Text style={styles.empty}>{t('messages.noticeNotFound')}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.bodyWrap}>
            <View style={[styles.accent, { backgroundColor: c.badge }]} />
            <Text style={styles.title}>{notice.title}</Text>
            <Text style={styles.time}>
              {notice.createdAt
                ? new Date(notice.createdAt).toLocaleString(getDateLocale())
                : ''}
            </Text>
            <Text style={styles.body}>{notice.body || notice.message}</Text>
            {notice?.data?.quizId || notice?.data?.href ? (
              <Pressable
                style={[styles.goQuiz, { backgroundColor: c.badge }]}
                onPress={() => {
                  const href =
                    notice.data?.href ||
                    (notice.data?.quizId
                      ? `/(app)/quiz/${notice.data.quizId}`
                      : null);
                  if (href) router.push(href as any);
                }}
              >
                <Text style={styles.goQuizText}>{t('messages.goToQuiz')}</Text>
              </Pressable>
            ) : null}
            <Text style={styles.footnote}>
              {kind === 'broadcast'
                ? t('messages.footnoteBroadcast')
                : t('messages.footnoteAdmin')}
            </Text>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E2DA',
  },
  backBtn: { padding: 4 },
  topText: { flex: 1 },
  topTitle: {
    ...titleTypeface,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
  },
  topSub: { marginTop: 1, fontSize: 12, color: Colors.light.textSecondary },
  empty: {
    textAlign: 'center',
    marginTop: 48,
    color: Colors.light.textSecondary,
    paddingHorizontal: Spacing.four,
  },
  bodyWrap: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  accent: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.three,
  },
  title: {
    ...titleTypeface,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    lineHeight: 30,
  },
  time: {
    marginTop: Spacing.two,
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  body: {
    marginTop: Spacing.four,
    fontSize: 16,
    lineHeight: 26,
    color: Colors.light.text,
  },
  goQuiz: {
    marginTop: Spacing.four,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  goQuizText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  footnote: {
    marginTop: Spacing.five,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textSecondary,
  },
});
