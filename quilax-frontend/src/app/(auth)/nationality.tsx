import React, { useState } from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authFormStyles } from '@/constants/authForm';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';
import CountryPicker from '@/components/ui/CountryPicker';
import { countryNameKey } from '@/constants/countries';

export default function NationalityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState('');

  const handleContinue = async () => {
    if (!selected) return;
    await AsyncStorage.setItem(
      'selectedCountry',
      JSON.stringify({ code: selected, name: t(countryNameKey(selected)) })
    );
    try {
      await apiClient.put('/profile/me', { country: selected });
    } catch {
      // Si aún no hay sesión completa, se sincroniza más adelante en complete-profile
    }
    router.push('/(auth)/id-verification');
  };

  return (
    <AuthFlowLayout
      title={t('auth.nationalityScreen.title')}
      subtitle={t('auth.nationalityScreen.subtitle')}
      showBack
      footer={
        <>
          <AuthProgressDots total={5} current={2} />
          <AuthPrimaryButton
            label={t('common.continue')}
            onPress={handleContinue}
            disabled={!selected}
          />
        </>
      }
    >
      <Text style={authFormStyles.hint}>{t('auth.registerScreen.nationalityHint')}</Text>
      <CountryPicker value={selected} onChange={setSelected} required />
    </AuthFlowLayout>
  );
}
