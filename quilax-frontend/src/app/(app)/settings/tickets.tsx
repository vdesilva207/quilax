import React, { useCallback, useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import supportService from '@/services/supportService';
import { AppScreen, AppHeader, AppSection, AppCard, AppPlaceholder } from '@/components/ui/AppScreen';
import { GradientButton, FieldLabel } from '@/components/ui/ScreenChrome';
import { getDateLocale } from '@/utils/timezone';

export default function SupportTicketsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<'list' | 'create'>('list');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [similarArticles, setSimilarArticles] = useState<any[]>([]);

  const CATEGORIES = [
    { label: t('settings.tickets.categories.account'), value: 'ACCOUNT' },
    { label: t('settings.tickets.categories.payments'), value: 'PAYMENTS' },
    { label: t('settings.tickets.categories.quizzes'), value: 'QUIZZES' },
    { label: t('settings.tickets.categories.technical'), value: 'TECHNICAL' },
    { label: t('settings.tickets.categories.other'), value: 'OTHER' },
  ];

  const STATUS_LABELS: Record<string, string> = {
    OPEN: t('settings.tickets.status.open'),
    IN_PROGRESS: t('settings.tickets.status.inProgress'),
    CLOSED: t('settings.tickets.status.closed'),
  };

  const dateLocale = getDateLocale(i18n.language);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await supportService.getMyTickets();
    if (result.success) {
      setTickets(result.data?.tickets || []);
    } else {
      setTickets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitTicket = async (force = false) => {
    if (!subject.trim() || !category || !description.trim()) {
      Alert.alert(t('settings.tickets.missingDataTitle'), t('settings.tickets.missingDataBody'));
      return;
    }

    setSubmitting(true);
    const result = await supportService.createTicket({
      category,
      subject: subject.trim(),
      description: description.trim(),
      force,
    });
    setSubmitting(false);

    if (!result.success) {
      Alert.alert(t('settings.tickets.sendFailedTitle'), result.error || t('settings.tickets.sendFailedBody'));
      return;
    }

    const similar = result.data?.similarArticles;
    if (similar && similar.length > 0 && !force) {
      setSimilarArticles(similar);
      return;
    }

    setSimilarArticles([]);
    Alert.alert(t('settings.tickets.sentTitle'), t('settings.tickets.sentBody'));
    setSelectedTab('list');
    setSubject('');
    setCategory('');
    setDescription('');
    load();
  };

  return (
    <AppScreen>
      <AppHeader
        title={t('settings.tickets.title')}
        subtitle={t('settings.tickets.subtitle')}
        showBack backHref="/(app)/settings"
      />

      <AppSection title={t('settings.tickets.sectionTitle')} accentIndex={1}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, selectedTab === 'list' && styles.tabActive]}
            onPress={() => setSelectedTab('list')}
          >
            <Text style={[styles.tabText, selectedTab === 'list' && styles.tabTextActive]}>
              {t('settings.tickets.tabMyTickets')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedTab === 'create' && styles.tabActive]}
            onPress={() => {
              setSelectedTab('create');
              setSimilarArticles([]);
            }}
          >
            <Text style={[styles.tabText, selectedTab === 'create' && styles.tabTextActive]}>
              {t('settings.tickets.tabNewInquiry')}
            </Text>
          </Pressable>
        </View>

        {selectedTab === 'list' ? (
          loading ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : tickets.length === 0 ? (
            <AppPlaceholder text={t('settings.tickets.noTickets')} />
          ) : (
            tickets.map((ticket) => (
              <AppCard
                key={ticket.id}
                onPress={() => router.push(`/(app)/settings/tickets/${ticket.id}` as any)}
              >
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      ticket.status === 'CLOSED' && styles.statusClosed,
                    ]}
                  >
                    <Text style={styles.statusPillText}>
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ticketMeta}>
                  {CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}
                  {' · '}
                  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString(dateLocale) : ''}
                </Text>
                <Text style={styles.openHint}>{t('settings.tickets.viewConversation')}</Text>
              </AppCard>
            ))
          )
        ) : (
          <View>
            <Text style={styles.hint}>{t('settings.tickets.firstSearchHint')}</Text>

            <FieldLabel>{t('settings.tickets.categoryLabel')}</FieldLabel>
            <View style={styles.categoriesContainer}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  style={[styles.categoryChip, category === cat.value && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat.value && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <FieldLabel>{t('settings.tickets.subjectLabel')}</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder={t('settings.tickets.subjectPlaceholder')}
              placeholderTextColor={Colors.light.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />

            <FieldLabel>{t('settings.tickets.descriptionLabel')}</FieldLabel>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('settings.tickets.descriptionPlaceholder')}
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
            />

            {similarArticles.length > 0 ? (
              <View style={styles.similarBox}>
                <Text style={styles.similarTitle}>{t('settings.tickets.similarTitle')}</Text>
                <Text style={styles.hint}>{t('settings.tickets.similarHint')}</Text>
                {similarArticles.map((a) => (
                  <AppCard key={a.id} onPress={() => router.push('/(app)/settings/help' as any)}>
                    <Text style={styles.similarQ}>{a.question || a.title}</Text>
                  </AppCard>
                ))}
                <GradientButton
                  label={submitting ? t('settings.tickets.sendingEllipsis') : t('settings.tickets.sendAnyway')}
                  onPress={() => submitTicket(true)}
                  disabled={submitting}
                />
                <Pressable onPress={() => router.push('/(app)/settings/help' as any)}>
                  <Text style={styles.linkHelp}>{t('settings.tickets.goToHelpCenter')}</Text>
                </Pressable>
              </View>
            ) : submitting ? (
              <ActivityIndicator color={Colors.light.primary} />
            ) : (
              <GradientButton label={t('settings.tickets.sendInquiry')} onPress={() => submitTicket(false)} />
            )}
          </View>
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginBottom: Spacing.four,
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.light.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.light.textSecondary },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  ticketSubject: {
    ...titleTypeface,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  statusPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusClosed: { backgroundColor: Colors.light.backgroundSelected },
  statusPillText: { fontSize: 11, fontWeight: '700', color: Colors.light.primary },
  ticketMeta: { fontSize: 13, color: Colors.light.textSecondary },
  openHint: { marginTop: 8, fontSize: 13, fontWeight: '700', color: Colors.light.primary },
  hint: { color: Colors.light.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: Spacing.three },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.three, gap: 8 },
  categoryChip: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  categoryChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  categoryChipText: { fontSize: 14, color: Colors.light.textSecondary, fontWeight: '600' },
  categoryChipTextActive: { color: '#FFFFFF' },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    marginBottom: Spacing.three,
    color: Colors.light.text,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  similarBox: { gap: Spacing.two, marginTop: Spacing.two },
  similarTitle: {
    ...titleTypeface,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  similarQ: { fontWeight: '600', color: Colors.light.text },
  linkHelp: {
    textAlign: 'center',
    color: Colors.light.primary,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
});
