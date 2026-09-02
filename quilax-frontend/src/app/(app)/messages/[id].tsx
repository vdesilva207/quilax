import React, { useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, titleTypeface } from '@/constants/theme';
import { brandGradientProps, APP_GRADIENT_SOFT } from '@/constants/gradients';
import { useAuth } from '@/context/AuthContext';
import messageService from '@/services/messageService';
import CustomIcon from '@/components/CustomIcon';
import { getDateLocale } from '@/utils/timezone';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth() as any;
  const otherUserId = Number(id);
  const listRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const result = await messageService.getConversation(otherUserId);
      if (result.success) {
        const data = result.data;
        const list = Array.isArray(data)
          ? data
          : data?.messages || data?.data || [];
        setMessages(list);
        if (data?.otherUser) setOtherUser(data.otherUser);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    messageService.markAsRead(otherUserId).catch(() => {});
  }, [otherUserId]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const result = await messageService.sendMessage(otherUserId, text.trim());
      if (result.success) {
        setText('');
        await load();
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      } else {
        Alert.alert(t('common.error'), result.error || t('messages.sendError'));
      }
    } finally {
      setSending(false);
    }
  };

  const chatTitle =
    otherUser?.fullName ||
    (otherUser?.username ? `@${otherUser.username}` : null) ||
    t('messages.playerFallback', { id: otherUserId });
  const handle = otherUser?.username ? `@${otherUser.username}` : null;

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
                  {chatTitle}
                </Text>
                {handle && handle !== chatTitle ? (
                  <Text style={styles.topSub} numberOfLines={1}>
                    {handle}
                  </Text>
                ) : (
                  <Text style={styles.topSub}>{t('messages.chatDefaultSubtitle')}</Text>
                )}
              </View>
            </LinearGradient>

            {loading ? (
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 48 }} />
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m, i) => String(m.id ?? i)}
                contentContainerStyle={[
                  styles.listContent,
                  messages.length === 0 && styles.listEmpty,
                ]}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                  <Text style={styles.empty}>{t('messages.emptyMessages')}</Text>
                }
                renderItem={({ item: m }) => {
                  const isMine = m.fromUserId === user?.id;
                  if (isMine) {
                    return (
                      <View style={[styles.row, styles.rowMine]}>
                        <LinearGradient
                          {...brandGradientProps}
                          style={[styles.bubble, styles.bubbleMine]}
                        >
                          <Text style={[styles.body, styles.bodyMine]}>
                            {m.content || m.text || m.body}
                          </Text>
                          <Text style={[styles.meta, styles.metaMine]}>
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleTimeString(getDateLocale(), {
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
                      <View style={[styles.bubble, styles.bubbleTheirs]}>
                        <Text style={styles.body}>{m.content || m.text || m.body}</Text>
                        <Text style={styles.meta}>
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString(getDateLocale(), {
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

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={t('messages.messagePlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                maxLength={2000}
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
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexGrow: 1,
  },
  listEmpty: { justifyContent: 'center' },
  empty: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 15,
  },
  row: { marginBottom: 8, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E2DA',
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
