import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { InfoBar } from '@/components/ui/ScreenChrome';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type CurrencyOption = { code: string; name?: string; rate?: number };

export default function CurrencySettingsScreen() {
  const { t } = useTranslation();
  const { user, updateUser, refreshProfile } = useAuth();
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [selected, setSelected] = useState((user?.currency || 'EUR').toUpperCase());
  const [locked, setLocked] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, countryRes] = await Promise.all([
        apiClient.get('/auth/currencies'),
        apiClient.get('/payments/country').catch(() => null),
      ]);
      const list: CurrencyOption[] = Array.isArray(listRes?.currencies)
        ? listRes.currencies
        : [{ code: 'EUR', name: 'Euro' }];
      setCurrencies(list);

      const current =
        (countryRes?.currency || user?.currency || list[0]?.code || 'EUR').toUpperCase();
      setSelected(current);
      setLocked(!!countryRes?.countryLocked);
      setCountry(countryRes?.country || null);
    } catch (err: any) {
      setError(err?.message || t('settings.currencyPage.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, user?.currency]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (code: string) => {
    const next = String(code).toUpperCase();
    if (locked || saving || next === selected) return;

    setSaving(true);
    setFeedback('');
    setError('');
    try {
      const data = await apiClient.put('/auth/currency', { currency: next });
      const saved = String(data?.currency || next).toUpperCase();
      setSelected(saved);
      if (data?.country) setCountry(data.country);
      await updateUser?.({ currency: saved });
      await refreshProfile?.().catch(() => null);
      setFeedback(t('settings.currencyPage.updated'));
    } catch (err: any) {
      if (err?.code === 'CURRENCY_LOCKED' || err?.status === 409) {
        setLocked(true);
        setError(t('settings.currencyPage.lockedBody'));
      } else {
        setError(err?.message || t('settings.currencyPage.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const current = currencies.find((c) => c.code === selected);

  return (
    <AppScreen>
      <AppHeader title={t('settings.currencyPage.title')} showBack backHref="/(app)/settings" />

      {loading ? (
        <AppSection title={t('settings.currencyPage.current')} accentIndex={0}>
          <AppCard>
            <ActivityIndicator color={Colors.light.primary} />
          </AppCard>
        </AppSection>
      ) : (
        <>
          <AppSection title={t('settings.currencyPage.current')} accentIndex={0}>
            <AppCard>
              <Text style={styles.currentCode}>{selected}</Text>
              <Text style={styles.currentName}>
                {current?.name || selected}
                {country ? ` · ${country}` : ''}
              </Text>
              {locked ? (
                <Text style={styles.lockedBadge}>{t('settings.currencyPage.lockedBadge')}</Text>
              ) : null}
              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </AppCard>
          </AppSection>

          <AppSection title={t('settings.available')} accentIndex={1}>
            {currencies.map((currency) => {
              const active = selected === currency.code;
              const disabled = locked || saving;
              return (
                <Pressable
                  key={currency.code}
                  disabled={disabled}
                  onPress={() => handleSelect(currency.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled }}
                  style={({ pressed }) => [
                    pressed && !active && !disabled ? styles.pressed : null,
                    disabled && !active ? styles.disabled : null,
                  ]}
                >
                  <AppCard style={active ? styles.selectedCard : undefined}>
                    <View style={styles.row}>
                      <View style={styles.info}>
                        <Text style={styles.code}>{currency.code}</Text>
                        <Text style={styles.name}>{currency.name || currency.code}</Text>
                      </View>
                      {active ? (
                        <CustomIcon name="check" size={20} color={Colors.light.primary} />
                      ) : null}
                    </View>
                  </AppCard>
                </Pressable>
              );
            })}
          </AppSection>

          <AppSection title={t('settings.note')} accentIndex={2}>
            <InfoBar>
              <Text style={styles.note}>
                {locked
                  ? t('settings.currencyPage.lockedBody')
                  : t('settings.currencyPage.noteBody')}
              </Text>
            </InfoBar>
          </AppSection>
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  currentCode: { fontSize: 22, fontWeight: '800', color: Colors.light.text },
  currentName: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 4 },
  lockedBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  feedback: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#B42318',
  },
  selectedCard: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1 },
  code: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  name: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  note: { fontSize: 14, color: Colors.light.textSecondary },
});
