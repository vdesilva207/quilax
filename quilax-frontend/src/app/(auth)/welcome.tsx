import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, sora } from '@/constants/theme';
import {
  brandGradientProps,
  SCREEN_BACKGROUND,
  APP_GRADIENT,
  APP_GRADIENT_LOCATIONS,
  GRADIENT_HORIZONTAL,
} from '@/constants/gradients';
import { useChromeInsets } from '@/hooks/useChromeInsets';

/**
 * First screen when opening the app (logged out):
 * same language as Gestión gate / marketing — warm bg, thin gradient bar, brand hero.
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
    <View style={styles.screen}>
      <LinearGradient
        colors={[...APP_GRADIENT]}
        locations={[...APP_GRADIENT_LOCATIONS]}
        {...GRADIENT_HORIZONTAL}
        style={styles.gradientBar}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: chrome.headerPaddingTop + 32,
            paddingBottom: Math.max(chrome.bottomPadding, Spacing.six),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.column, { width: columnWidth }]}>
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
              style={({ pressed }) => [styles.ctaWrap, pressed && styles.ctaPressed]}
              onPress={() => router.push('/(auth)/login')}
            >
              <LinearGradient {...brandGradientProps} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>{t('auth.login')}</Text>
              </LinearGradient>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  gradientBar: {
    height: 4,
    width: '100%',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    minHeight: 420,
  },
  brandBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: Spacing.five,
  },
  brand: {
    ...sora(800),
    fontSize: 52,
    color: Colors.light.text,
    letterSpacing: 2.5,
  },
  tagline: {
    ...sora(500),
    marginTop: Spacing.three,
    fontSize: 17,
    lineHeight: 26,
    color: Colors.light.textSecondary,
    maxWidth: 320,
  },
  actions: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  ctaWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaPressed: { opacity: 0.92 },
  primaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryBtnText: {
    ...sora(700),
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.14)',
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...sora(700),
    fontSize: 16,
    color: Colors.light.text,
  },
});
