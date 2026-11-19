import React, { useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authFormStyles } from '@/constants/authForm';
import { Colors } from '@/constants/theme';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';
import CountryPicker from '@/components/ui/CountryPicker';
import { countryDisplayName } from '@/constants/countries';
import {
  RegistrationOnboardingGate,
  useRequireRegistrationOnboarding,
} from '@/hooks/useRequireRegistrationOnboarding';
import { getOnboardingHref, isSoftLaunchSkipIdentity } from '@/utils/onboardingGate';
import { useAuth } from '@/context/AuthContext';

export default function NationalityScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, refreshProfile } = useAuth() as any;
  const gate = useRequireRegistrationOnboarding({ exitIfAlreadyVerified: true });
  const [selected, setSelected] = useState('');

  const handleContinue = async () => {
    if (!selected) return;
    await AsyncStorage.setItem(
      'selectedCountry',
      JSON.stringify({
        code: selected,
        name: countryDisplayName(selected, i18n.language || 'es', t),
      })
    );
    try {
      await apiClient.put('/profile/me', { country: selected });
      await refreshProfile?.({ full: false }).catch(() => null);
    } catch {
      // Si aún no hay sesión completa, se sincroniza más adelante en complete-profile
    }
    const nextUser = { ...(user || {}), country: selected };
    const href =
      getOnboardingHref(nextUser) ||
      (isSoftLaunchSkipIdentity()
        ? '/(auth)/complete-profile'
        : '/(auth)/id-verification');
    router.push(href as any);
  };

  const fallback = (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
      }}
    >
      <ActivityIndicator color={Colors.light.primary} />
    </View>
  );

  return (
    <RegistrationOnboardingGate gate={gate} fallback={fallback}>
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
    </RegistrationOnboardingGate>
  );
}
