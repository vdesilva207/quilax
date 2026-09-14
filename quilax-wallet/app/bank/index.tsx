import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  Linking,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton } from '@/components/WalletShell';
import { apiFetch, getToken } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getBankStatusLabel } from '@/constants/money';
import { countryNameKey } from '@/constants/countries';

type Region = {
  country: string;
  name: string;
  currency: string;
  phase?: string;
  active: boolean;
  comingSoon?: boolean;
  bankHint?: string;
};

type ConnectStatus = {
  hasConnectAccount?: boolean;
  bankVerificationStatus?: string;
  isBankVerified?: boolean;
  canWithdraw?: boolean;
  bankLast4?: string | null;
  country?: string | null;
  currency?: string | null;
  countryLocked?: boolean;
};

/** Connect Express onboarding — country first, then Stripe. */
export default function BankIntroScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ connect?: string; start?: string }>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [country, setCountry] = useState('ES');
  const [query, setQuery] = useState('');
  const [stripeUrl, setStripeUrl] = useState('');
  const autoStarted = useRef(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const [connect, regionsRes] = await Promise.all([
        apiFetch('/payments/connect/status'),
        apiFetch('/payments/regions').catch(() => ({ regions: [] })),
      ]);
      setStatus(connect);
      const list: Region[] = regionsRes?.regions || [];
      setRegions(list);
      if (connect?.country) {
        setCountry(connect.country);
      } else {
        const firstActive = list.find((r) => r.active);
        if (firstActive) setCountry(firstActive.country);
      }
    } catch (err: any) {
      setError(err?.message || t('errors.bankLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.connect === 'return' || params.connect === 'refresh') {
      load();
    }
  }, [params.connect, load]);

  useEffect(() => {
    const countryCode = (country || '').toString().slice(0, 2).toUpperCase();
    if (!countryCode) return;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('wallet_country', countryCode);
      } catch {
        /* ignore */
      }
    }
  }, [country]);

  const openOnboarding = useCallback(async () => {
    setBusy(true);
    setError('');
    setStripeUrl('');
    let redirectedToStripe = false;
    try {
      const hasAccount = !!status?.hasConnectAccount;
      const countryCode = (country || status?.country || 'ES').toString().slice(0, 2).toUpperCase();
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('wallet_country', countryCode);
        } catch {
          /* ignore */
        }
      }
      if (!hasAccount && !status?.countryLocked) {
        await apiFetch('/payments/country', {
          method: 'PUT',
          body: JSON.stringify({ country: countryCode, syncCurrency: true }),
          headers: { 'X-Country': countryCode },
        });
      }
      // Solo refresh si ya existe cuenta Connect; si no, onboard.
      const path = hasAccount ? '/payments/connect/refresh' : '/payments/connect/onboard';
      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(hasAccount ? {} : { country: countryCode }),
        headers: { 'X-Country': countryCode },
      });
      const url = data?.url;
      if (!url || typeof url !== 'string') {
        setError(t('errors.stripeLinkMissing'));
        return;
      }
      setStripeUrl(url);
      // Salir del SPA de Expo Router hacia Stripe (misma pestaña).
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        const go = (target: string) => {
          const a = document.createElement('a');
          a.href = target;
          a.rel = 'noopener';
          a.target = '_self';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.location.assign(target);
        };
        go(url);
        redirectedToStripe = true;
        setTimeout(() => {
          setBusy(false);
        }, 800);
        return;
      }
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        setError(t('errors.stripeOnboardFailed'));
        return;
      }
      await Linking.openURL(url);
    } catch (err: any) {
      const msg = err?.message || t('errors.stripeOnboardFailed');
      setError(msg);
      if (Platform.OS !== 'web') {
        Alert.alert(t('bank.title'), msg);
      }
    } finally {
      if (!redirectedToStripe) setBusy(false);
    }
  }, [country, status, t]);

  // Desde home (?start=1) o al volver de Stripe fallido: abrir onboarding si hay país.
  useEffect(() => {
    if (loading || busy || autoStarted.current) return;
    const alreadyOk =
      status?.bankVerificationStatus === 'VERIFIED' && status?.canWithdraw;
    if (alreadyOk) return;
    const shouldStart = params.start === '1' || params.connect === 'refresh';
    if (!shouldStart) return;
    if (!status?.country && !country) return;
    autoStarted.current = true;
    void openOnboarding();
  }, [loading, busy, status, country, params.start, params.connect, openOnboarding]);

  const regionLabel = useCallback(
    (r: Region) => {
      const translated = t(countryNameKey(r.country), { defaultValue: '' });
      return translated || r.name || r.country;
    },
    [t]
  );

  const filteredRegions = useMemo(() => {
    const lang = i18n.language || 'es';
    const q = query.trim().toLowerCase();
    return regions
      .filter((r) => r.active)
      .map((r) => ({ ...r, label: regionLabel(r) }))
      .filter(
        (r) =>
          !q ||
          r.label.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q) ||
          r.currency.toLowerCase().includes(q)
      )
      .sort((a, b) => a.label.localeCompare(b.label, lang, { sensitivity: 'base' }));
  }, [regions, query, regionLabel, i18n.language]);

  if (loading) {
    return (
      <WalletShell showBack title={t('bank.title')} subtitle={t('common.checking')}>
        <ActivityIndicator color={Colors.primary} />
      </WalletShell>
    );
  }

  const verified = status?.bankVerificationStatus === 'VERIFIED' && status?.canWithdraw;
  const hasConnect = !!status?.hasConnectAccount;
  const pending = hasConnect && !verified;
  const locked = !!status?.countryLocked;
  const selected = regions.find((r) => r.country === country);
  const selectedLabel = selected ? regionLabel(selected) : status?.country;
  const canLink =
    locked ||
    !!selected?.active ||
    (!!country && regions.some((r) => r.country === country && r.active));

  return (
    <WalletShell
      showBack
      title={t('bank.title')}
      subtitle={t('bank.subtitle')}
      footer={
        busy ? (
          <ActivityIndicator color={Colors.primary} />
        ) : verified ? (
          <PrimaryButton label={t('common.ready')} onPress={() => router.replace('/')} />
        ) : (
          <PrimaryButton
            label={hasConnect ? t('bank.continueStripe') : t('bank.linkStripe')}
            onPress={() => {
              void openOnboarding();
            }}
            disabled={!canLink}
          />
        )
      }
    >
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            verified ? styles.badgeOk : pending ? styles.badgePending : styles.badgeNone,
          ]}
        >
          <Text style={styles.badgeText}>
            {getBankStatusLabel(status?.bankVerificationStatus, t)}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>{t('bank.countryLabel')}</Text>
      {locked ? (
        <Text style={styles.meta}>
          {t('bank.countryLocked', {
            name: selectedLabel,
            currency: status?.currency || selected?.currency,
            locked: t('common.lockedAfterStripe'),
          })}
        </Text>
      ) : (
        <View style={styles.picker}>
          {selected ? (
            <View style={styles.selectedRow}>
              <Text style={styles.selectedLabel}>
                {selectedLabel} · {selected.currency}
              </Text>
              <Pressable onPress={() => setCountry('')} hitSlop={8}>
                <Text style={styles.change}>{t('common.change')}</Text>
              </Pressable>
            </View>
          ) : null}
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={t('bank.countrySearch')}
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ScrollView
            style={styles.list}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {filteredRegions.map((r) => {
              const active = country === r.country;
              return (
                <Pressable
                  key={r.country}
                  onPress={() => {
                    setCountry(r.country);
                    setQuery('');
                  }}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.rowCur, active && styles.rowTextActive]}>{r.currency}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Text style={styles.copy}>{t('bank.copy')}</Text>

      {status?.bankLast4 ? (
        <Text style={styles.meta}>
          {t('common.accountEnding', { last4: status.bankLast4 })}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {Platform.OS === 'web' && stripeUrl ? (
        <Pressable
          onPress={() => {
            if (typeof window !== 'undefined') window.location.assign(stripeUrl);
          }}
          style={styles.stripeFallback}
          accessibilityRole="link"
        >
          <Text style={styles.stripeFallbackText}>Abrir Stripe</Text>
        </Pressable>
      ) : null}
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  badgeRow: { marginBottom: Spacing.md },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeNone: { backgroundColor: Colors.surfaceMuted },
  badgeText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  picker: { marginBottom: Spacing.md },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectedLabel: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  change: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  search: {
    fontFamily: Fonts.body,
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.12)',
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  list: {
    maxHeight: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.12)',
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28,25,23,0.08)',
  },
  rowActive: { backgroundColor: 'rgba(59,130,246,0.06)' },
  rowText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  rowCur: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  rowTextActive: { color: Colors.primary, fontWeight: '700' },
  copy: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#B91C1C',
    marginTop: Spacing.sm,
  },
  stripeFallback: {
    marginTop: Spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stripeFallbackText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
