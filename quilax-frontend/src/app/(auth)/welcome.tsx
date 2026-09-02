import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, sora } from '@/constants/theme';
import { brandGradientProps } from '@/constants/gradients';
import { useChromeInsets } from '@/hooks/useChromeInsets';

/**
 * First screen when opening the app (logged out):
 * big QUILAX + Iniciar sesión / Registrarse only.
 * Designed mobile-first; on desktop centers a phone-width column.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const chrome = useChromeInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const columnWidth = Math.min(width, MaxContentWidth);

  return (
    <LinearGradient {...brandGradientProps} style={styles.container}>
      <View
        style={[
          styles.column,
          {
            width: columnWidth,
            paddingTop: chrome.headerPaddingTop + 48,
            paddingBottom: Math.max(chrome.bottomPadding, Spacing.six),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.brandBlock,
            { opacity: fade, transform: [{ translateY: rise }] },
          ]}
        >
          <Text style={styles.brand}>QUILAX</Text>
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
        </Animated.View>

        <Animated.View style={[styles.actions, { opacity: fade }]}>
          <Pressable
            testID="welcome-login"
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryBtnText}>{t('auth.login')}</Text>
          </Pressable>
          <Pressable
            testID="welcome-register"
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/language-selection')}
          >
            <Text style={styles.secondaryBtnText}>{t('auth.register')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  brandBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    ...sora(700),
    fontSize: 68,
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
  },
  tagline: {
    ...sora(600),
    marginTop: Spacing.three,
    fontSize: 16,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...sora(700),
    fontSize: 16,
    color: Colors.light.primary,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...sora(700),
    fontSize: 16,
    color: '#FFFFFF',
  },
});
