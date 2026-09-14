import { useCallback, useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Linking,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';
import { AppScreen, AppHeader, AppSection } from '@/components/ui/AppScreen';
import { GradientButton, InfoBar } from '@/components/ui/ScreenChrome';

type Region = {
  country: string;
  name: string;
  currency: string;
  active: boolean;
  comingSoon?: boolean;
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

export default function BankAccountSettingsScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [ibanMasked, setIbanMasked] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [country, setCountry] = useState('ES');

  const statusLabel = (statusValue?: string) => {
    switch (statusValue) {
      case 'VERIFIED':
        return t('settings.bank.statusVerified');
      case 'PENDING':
        return t('settings.bank.statusPending');
      case 'RESTRICTED':
        return t('settings.bank.statusRestricted');
      default:
        return t('settings.bank.statusUnverified');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [connect, bank, regionsRes] = await Promise.all([
        apiClient.get('/payments/connect/status').catch(() => null),
        apiClient.get('/payments/bank-account').catch(() => null),
        apiClient.get('/payments/regions').catch(() => ({ regions: [] })),
      ]);
      setStatus(connect || null);
      setIbanMasked(
        bank?.ibanMasked ||
          bank?.bankAccount?.ibanMasked ||
          (connect?.bankLast4 ? `····${connect.bankLast4}` : null)
      );
      const list: Region[] = regionsRes?.regions || [];
      setRegions(list);
      if (connect?.country) setCountry(connect.country);
      else {
        const first = list.find((r) => r.active);
        if (first) setCountry(first.country);
      }
    } catch (err: any) {
      setError(err?.message || t('settings.bank.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const openOnboarding = async (refresh = false) => {
    setBusy(true);
    setError('');
    try {
      if (!refresh && !status?.countryLocked) {
        await apiClient.put('/payments/country', { country, syncCurrency: true });
      }
      const path = refresh ? '/payments/connect/refresh' : '/payments/connect/onboard';
      const data = await apiClient.post(path, refresh ? {} : { country });
      if (!data?.url) {
        setError(t('settings.bank.linkError'));
        return;
      }
      await Linking.openURL(data.url);
    } catch (err: any) {
      setError(err?.message || t('settings.bank.openError'));
    } finally {
      setBusy(false);
    }
  };

  const verified =
    status?.bankVerificationStatus === 'VERIFIED' &&
    (status?.canWithdraw || status?.isBankVerified);
  const locked = !!status?.countryLocked;
  const activeRegions = regions.filter((r) => r.active);

  return (
    <AppScreen>
      <AppHeader title={t('settings.bank.title')} showBack backHref="/(app)/settings" />
      <AppSection>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : (
          <View style={styles.block}>
            <InfoBar>
              <Text>
                {verified ? t('settings.bank.verifiedInfo') : t('settings.bank.chooseCountryInfo')}
              </Text>
            </InfoBar>
            <Text style={styles.badge}>{statusLabel(status?.bankVerificationStatus)}</Text>

            <Text style={styles.label}>{t('settings.bank.countryLabel')}</Text>
            {locked ? (
              <Text style={styles.meta}>
                {t('settings.bank.countryLocked', {
                  country: status?.country,
                  currency: status?.currency,
                })}
              </Text>
            ) : (
              <ScrollView style={styles.countryList} nestedScrollEnabled>
                {activeRegions.map((r) => (
                  <Pressable
                    key={r.country}
                    onPress={() => setCountry(r.country)}
                    style={[styles.chip, country === r.country && styles.chipOn]}
                  >
                    <Text
                      style={[styles.chipText, country === r.country && styles.chipTextOn]}
                    >
                      {r.name} · {r.currency}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {ibanMasked ? (
              <Text style={styles.meta}>{t('settings.bank.accountLabel', { iban: ibanMasked })}</Text>
            ) : (
              <Text style={styles.meta}>{t('settings.bank.noBankLinked')}</Text>
            )}
            <Text style={styles.copy}>
              {t('settings.bank.webCopy', {
                note: Platform.OS === 'web' ? '' : t('settings.bank.webCopyBrowserNote'),
              })}
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {busy ? (
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 12 }} />
            ) : (
              <>
                <GradientButton
                  label={
                    verified
                      ? t('settings.bank.refreshStatus')
                      : status?.hasConnectAccount
                        ? t('settings.bank.continueVerification')
                        : t('settings.bank.linkWithStripe')
                  }
                  onPress={() =>
                    verified
                      ? load()
                      : openOnboarding(!!status?.hasConnectAccount && locked)
                  }
                />
                {!verified && status?.hasConnectAccount ? (
                  <View style={{ marginTop: 10 }}>
                    <GradientButton
                      label={t('settings.bank.refreshLink')}
                      onPress={() => openOnboarding(true)}
                    />
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.two },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.backgroundSelected,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: Spacing.two,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginTop: Spacing.two,
  },
  countryList: {
    maxHeight: 240,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSelected,
    marginTop: 8,
  },
  chipOn: { backgroundColor: Colors.light.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.light.text },
  chipTextOn: { color: '#fff' },
  soon: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: Spacing.two,
  },
  meta: {
    fontSize: 15,
    color: Colors.light.text,
    marginTop: Spacing.two,
  },
  copy: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    marginVertical: Spacing.two,
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    marginBottom: Spacing.two,
  },
});
