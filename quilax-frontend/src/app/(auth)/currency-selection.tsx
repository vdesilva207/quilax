import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

export default function CurrencySelectionScreen() {
  const router = useRouter();
  const [currencies, setCurrencies] = useState<string[]>(['EUR']);
  const [selected, setSelected] = useState('EUR');

  useEffect(() => {
    apiClient.get('/auth/currencies').then((data) => {
      const list = data?.currencies || data?.data || ['EUR'];
      setCurrencies(list);
    }).catch(() => {});
  }, []);

  const handleContinue = async () => {
    await apiClient.put('/auth/currency', { currency: selected }).catch(() => null);
    router.push('/(auth)/nationality');
  };

  return (
    <AuthFlowLayout title="Moneda" subtitle="Selecciona tu moneda principal" badge="Paso 2">
      <AuthProgressDots total={5} current={1} />
      {currencies.map((currency) => (
        <AuthCard key={currency}>
          <Pressable onPress={() => setSelected(currency)}>
            <Text style={[styles.option, selected === currency && styles.optionActive]}>
              {currency}
            </Text>
          </Pressable>
        </AuthCard>
      ))}
      <AuthPrimaryButton label="Continuar" onPress={handleContinue} />
    </AuthFlowLayout>
  );
}

const styles = StyleSheet.create({
  option: { fontSize: 16, color: Colors.light.text, fontWeight: '600' },
  optionActive: { color: Colors.light.primary },
});
