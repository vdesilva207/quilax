import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, bodyTypeface } from '@/constants/theme';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

type CurrencyOption = { code: string; name?: string; rate?: number };

function normalizeCurrencies(raw: unknown): CurrencyOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return [{ code: 'EUR', name: 'Euro' }];
  return raw.map((item) => {
    if (typeof item === 'string') return { code: item, name: item };
    if (item && typeof item === 'object' && 'code' in item) {
      const opt = item as CurrencyOption;
      return { code: String(opt.code), name: opt.name || String(opt.code), rate: opt.rate };
    }
    return { code: 'EUR', name: 'Euro' };
  });
}

export default function CurrencySelectionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([{ code: 'EUR', name: 'Euro' }]);
  const [selected, setSelected] = useState('EUR');

  useEffect(() => {
    apiClient.get('/auth/currencies').then((data) => {
      const list = normalizeCurrencies(data?.currencies || data?.data);
      setCurrencies(list);
      if (list[0]?.code) setSelected(list[0].code);
    }).catch(() => {});
  }, []);

  const handleContinue = async () => {
    await apiClient.put('/auth/currency', { currency: selected }).catch(() => null);
    router.push('/(auth)/nationality');
  };

  return (
    <AuthFlowLayout
      title={t('auth.currencyScreen.title')}
      subtitle={t('auth.currencyScreen.subtitle')}
      badge={t('common.step', { n: 2 })}
    >
      <AuthProgressDots total={5} current={1} />
      {currencies.map((currency) => (
        <AuthCard key={currency.code}>
          <Pressable onPress={() => setSelected(currency.code)}>
            <Text style={[styles.option, selected === currency.code && styles.optionActive]}>
              {currency.name ? `${currency.code} — ${currency.name}` : currency.code}
            </Text>
          </Pressable>
        </AuthCard>
      ))}
      <AuthPrimaryButton label={t('common.continue')} onPress={handleContinue} />
    </AuthFlowLayout>
  );
}

const styles = StyleSheet.create({
  option: { ...bodyTypeface, fontSize: 16, color: Colors.light.text, fontWeight: '600' },
  optionActive: { color: Colors.light.primary },
});
