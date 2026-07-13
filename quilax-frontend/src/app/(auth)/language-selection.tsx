import React, { useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState('es');

  const handleContinue = async () => {
    await AsyncStorage.setItem('language', selected);
    router.push('/(auth)/onboarding');
  };

  return (
    <AuthFlowLayout title="Idioma" subtitle="Elige el idioma de la aplicación" badge="Paso 1">
      <AuthProgressDots total={5} current={0} />
      {LANGUAGES.map((lang) => (
        <AuthCard key={lang.code}>
          <Pressable onPress={() => setSelected(lang.code)}>
            <Text style={[styles.option, selected === lang.code && styles.optionActive]}>
              {lang.label}
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
