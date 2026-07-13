import React, { useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

const COUNTRIES = ['España', 'Portugal', 'Francia', 'Alemania', 'Italia', 'Reino Unido'];

export default function NationalityScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState('España');

  const handleContinue = async () => {
    await AsyncStorage.setItem('selectedCountry', selected);
    router.push('/(auth)/id-verification');
  };

  return (
    <AuthFlowLayout title="Nacionalidad" subtitle="Indica tu país de residencia" badge="Paso 3">
      <AuthProgressDots total={5} current={2} />
      {COUNTRIES.map((country) => (
        <AuthCard key={country}>
          <Pressable onPress={() => setSelected(country)}>
            <Text style={[styles.option, selected === country && styles.optionActive]}>
              {country}
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
