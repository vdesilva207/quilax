import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import supportService from '@/services/supportService';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton } from '@/components/ui/ScreenChrome';
import { getDateLocale } from '@/utils/timezone';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const ticketId = Number(id);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const dateLocale = getDateLocale(i18n.language);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    const result = await supportService.getTicket(ticketId);
    if (result.success) {
      setTicket(result.data?.ticket || null);
    } else {
      Alert.alert(t('common.error'), result.error || t('settings.tickets.detail.loadError'));
      router.navigate('/(app)/settings/tickets' as any);
    }
    setLoading(false);
  }, [ticketId, router, t]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    const content = message.trim();
    if (!content) return;
    setSending(true);
    const result = await supportService.sendTicketMessage(ticketId, content);
    setSending(false);
    if (!result.success) {
      Alert.alert(t('common.error'), result.error || t('settings.tickets.detail.sendError'));
      return;
    }
    setMessage('');
    load();
  };

  if (loading || !ticket) {
    return (
      <AppScreen>
        <AppHeader title={t('settings.tickets.title')} showBack backHref="/(app)/settings/tickets" />
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.light.primary} />
      </AppScreen>
    );
  }

  const closed = ticket.status === 'CLOSED';
  const messages = ticket.messages || [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppScreen>
        <AppHeader
          title={ticket.subject || t('settings.tickets.detail.titleFallback', { id: ticket.id })}
          showBack
          backHref="/(app)/settings/tickets"
        />

        <AppSection title={t('settings.tickets.detail.conversationSection')} accentIndex={2}>
          <Text style={styles.meta}>
            {t('settings.tickets.detail.statusLabel', { status: ticket.status })}
            {ticket.category ? ` · ${ticket.category}` : ''}
          </Text>

          {messages.length === 0 ? (
            <AppCard>
              <Text style={styles.body}>{ticket.description}</Text>
            </AppCard>
          ) : (
            messages.map((m: any) => (
              <View
                key={m.id}
                style={[styles.bubble, m.isFromAdmin ? styles.bubbleAdmin : styles.bubbleUser]}
              >
                <Text style={[styles.bubbleWho, !m.isFromAdmin && styles.bubbleUserWho]}>
                  {m.isFromAdmin ? t('settings.tickets.detail.supportName') : t('settings.tickets.detail.youName')}
                </Text>
                <Text
                  style={[
                    styles.bubbleText,
                    m.isFromAdmin ? styles.bubbleTextAdmin : styles.bubbleUserText,
                  ]}
                >
                  {m.content}
                </Text>
                <Text style={[styles.bubbleTime, !m.isFromAdmin && styles.bubbleUserTime]}>
                  {m.createdAt ? new Date(m.createdAt).toLocaleString(dateLocale) : ''}
                </Text>
              </View>
            ))
          )}

          {closed ? (
            <Text style={styles.closed}>{t('settings.tickets.detail.closedNotice')}</Text>
          ) : (
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder={t('settings.tickets.detail.responsePlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
              />
              {sending ? (
                <ActivityIndicator color={Colors.light.primary} />
              ) : (
                <GradientButton label={t('settings.tickets.detail.sendButton')} onPress={send} />
              )}
            </View>
          )}
        </AppSection>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  meta: { color: Colors.light.textSecondary, marginBottom: Spacing.three, fontSize: 13 },
  body: { color: Colors.light.text, lineHeight: 22 },
  bubble: {
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    maxWidth: '92%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.primary,
  },
  bubbleAdmin: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  bubbleWho: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    color: Colors.light.textSecondary,
  },
  bubbleText: { color: Colors.light.text, fontSize: 15, lineHeight: 21 },
  bubbleTextAdmin: { color: Colors.light.text },
  bubbleTime: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  bubbleUserWho: { color: 'rgba(255,255,255,0.85)' },
  bubbleUserText: { color: '#fff' },
  bubbleUserTime: { color: 'rgba(255,255,255,0.7)' },
  closed: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    marginTop: Spacing.three,
    fontWeight: '600',
  },
  composer: { marginTop: Spacing.three, gap: Spacing.two },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    padding: Spacing.three,
    minHeight: 80,
    textAlignVertical: 'top',
    color: Colors.light.text,
  },
});
