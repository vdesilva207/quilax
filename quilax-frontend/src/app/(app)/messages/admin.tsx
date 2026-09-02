import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Text,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, titleTypeface } from '@/constants/theme';
import { brandGradientProps, APP_GRADIENT_SOFT } from '@/constants/gradients';
import messageService from '@/services/messageService';
import CustomIcon from '@/components/CustomIcon';
import { INBOX_COLORS } from '@/constants/inboxColors';
import { getDateLocale } from '@/utils/timezone';

type ThreadItem = {
  id: string;
  direction: 'from_admin' | 'to_admin';
  title?: string;
  body?: string;
  type?: string;
  createdAt: string;
  status?: string;
};

export default function AdminPanelChatScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const listRef = useRef<FlatList>(null);
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [rules, setRules] = useState<string[]>(() =>
    t('messages.adminRulesDefault', { returnObjects: true }) as string[]
  );
  const [canMessage, setCanMessage] = useState(false);
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const isSpanish = (i18n.language || 'es').toLowerCase().startsWith('es');
    const result = await messageService.getAdminPanelThread();
    if (result.success) {
      const data = result.data || {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setCanMessage(Boolean(data.canMessage));
      setReason(data.reason || '');
      setExpiresAt(data.expiresAt || null);
      // API rules are Spanish today; keep i18n defaults for other locales.
      if (isSpanish && Array.isArray(data.rules) && data.rules.length) {
        setRules(data.rules);
      } else {
        const defaults = t('messages.adminRulesDefault', { returnObjects: true }) as string[];
        if (Array.isArray(defaults)) setRules(defaults);
      }
    } else {
      setItems([]);
      setCanMessage(false);
    }
  }, [i18n.language, t]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const send = async () => {
    if (!text.trim() || sending || !canMessage) return;
    setSending(true);
    try {
      const result = await messageService.sendAdminPanelMessage(text.trim());
      if (result.success) {
        setText('');
        await load();
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      } else {
        Alert.alert(t('messages.sendError'), result.error || t('messages.sendErrorLater'));
      }
    } finally {
      setSending(false);
    }
  };

  const adminColor = INBOX_COLORS.admin;

  const headerExtra = (
    <View style={styles.rulesBox}>
      <Text style={styles.rulesTitle}>{t('messages.rulesTitle')}</Text>
      {rules.map((line, i) => (
        <Text key={`${i}-${line.slice(0, 12)}`} style={styles.rulesLine}>
          {line}
        </Text>
      ))}
      {canMessage ? (
        <Text style={styles.gateOpen}>
          {t('messages.gateOpenPrefix')}
          {reason ? `: ${reason}` : '.'}
          {expiresAt
            ? t('messages.gateOpenUntil', {
                date: new Date(expiresAt).toLocaleString(getDateLocale(), {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })
            : ''}
        </Text>
      ) : (
        <Text style={styles.gateClosed}>{t('messages.gateClosed')}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={[...APP_GRADIENT_SOFT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.column}>
            <LinearGradient {...brandGradientProps} style={styles.topBar}>
              <Pressable
                onPress={() => router.navigate('/(app)/messages' as any)}
                style={styles.backBtn}
                hitSlop={10}
              >
                <CustomIcon name="back" size={22} color="#FFFFFF" />
              </Pressable>
              <View style={styles.topText}>
                <Text style={styles.topTitle} numberOfLines={1}>
                  {t('messages.adminPanelTitle')}
                </Text>
                <Text style={styles.topSub}>{t('messages.adminPanelSupportSubtitle')}</Text>
              </View>
            </LinearGradient>

            {loading ? (
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 48 }} />
            ) : (
              <FlatList
                ref={listRef}
                data={items}
                keyExtractor={(m) => m.id}
                ListHeaderComponent={headerExtra}
                contentContainerStyle={[
                  styles.listContent,
                  items.length === 0 && styles.listEmpty,
                ]}
                onContentSizeChange={() =>
                  listRef.current?.scrollToEnd({ animated: false })
                }
                ListEmptyComponent={
                  <Text style={styles.empty}>{t('messages.emptyThread')}</Text>
                }
                renderItem={({ item: m }) => {
                  const isMine = m.direction === 'to_admin';
                  if (isMine) {
                    return (
                      <View style={[styles.row, styles.rowMine]}>
                        <LinearGradient
                          {...brandGradientProps}
                          style={[styles.bubble, styles.bubbleMine]}
                        >
                          {m.title ? (
                            <Text style={[styles.bubbleTitle, styles.bodyMine]}>{m.title}</Text>
                          ) : null}
                          <Text style={[styles.body, styles.bodyMine]}>{m.body}</Text>
                          <Text style={[styles.meta, styles.metaMine]}>
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleString(getDateLocale(), {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </Text>
                        </LinearGradient>
                      </View>
                    );
                  }
                  return (
                    <View style={[styles.row, styles.rowTheirs]}>
                      <View
                        style={[
                          styles.bubble,
                          styles.bubbleTheirs,
                          { borderColor: adminColor.border, backgroundColor: adminColor.bg },
                        ]}
                      >
                        <Text style={styles.senderName}>{t('common.appName')}</Text>
                        {m.title ? <Text style={styles.bubbleTitle}>{m.title}</Text> : null}
                        <Text style={styles.body}>{m.body}</Text>
                        <Text style={styles.meta}>
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleString(getDateLocale(), {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {canMessage ? (
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  value={text}
                  onChangeText={setText}
                  placeholder={t('messages.adminMessagePlaceholder')}
                  placeholderTextColor={Colors.light.textSecondary}
                  multiline
                  maxLength={4000}
                />
                <Pressable
                  onPress={send}
                  disabled={!text.trim() || sending}
                  style={[(!text.trim() || sending) && styles.sendDisabled]}
                >
                  <LinearGradient {...brandGradientProps} style={styles.send}>
                    <Text style={styles.sendLabel}>{sending ? '…' : '↑'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <View style={styles.composerLocked}>
                <Text style={styles.composerLockedText}>{t('messages.composerLockedText')}</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  flex: { flex: 1 },
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
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  topText: { flex: 1 },
  topTitle: {
    ...titleTypeface,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topSub: { marginTop: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  rulesBox: {
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INBOX_COLORS.admin.border,
    backgroundColor: 'rgba(255,244,232,0.85)',
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rulesLine: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  gateOpen: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
    lineHeight: 18,
  },
  gateClosed: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexGrow: 1,
  },
  listEmpty: { justifyContent: 'flex-start' },
  empty: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.two,
  },
  row: { marginBottom: 8, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: { borderBottomRightRadius: 6 },
  bubbleTheirs: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '800',
    color: INBOX_COLORS.admin.badge,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  bubbleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  body: { fontSize: 15, lineHeight: 21, color: Colors.light.text },
  bodyMine: { color: '#FFFFFF' },
  meta: {
    marginTop: 4,
    fontSize: 10,
    color: Colors.light.textSecondary,
    alignSelf: 'flex-end',
  },
  metaMine: { color: 'rgba(255,255,255,0.8)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(232,226,218,0.9)',
    backgroundColor: 'rgba(255,252,248,0.92)',
  },
  composerLocked: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(232,226,218,0.9)',
    backgroundColor: 'rgba(255,252,248,0.92)',
  },
  composerLockedText: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E8E2DA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.light.text,
    backgroundColor: '#FFFFFF',
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendLabel: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: -1 },
});
