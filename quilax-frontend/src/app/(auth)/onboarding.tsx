import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, sora } from '@/constants/theme';
import { brandGradientProps, onboardingCtaGradientProps } from '@/constants/gradients';
import { useChromeInsets } from '@/hooks/useChromeInsets';

const SLIDE_KEYS = [
  'whatIsQuilax',
  'howAMatchGoes',
  'oneCreditEntry',
  'earlyJoinBonus',
  'createYourOwnQuizzes',
  'seasonsAndRanking',
  'creditsAndMoney',
  'secureApp',
  'moneyOnlyOnWeb',
  'readyToStart',
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const chrome = useChromeInsets(Spacing.three + 4);
  const [index, setIndex] = useState(0);
  const slide = {
    title: t(`onboarding.slides.${SLIDE_KEYS[index]}.title`),
    body: t(`onboarding.slides.${SLIDE_KEYS[index]}.body`),
  };
  const isLast = index === SLIDE_KEYS.length - 1;
  const columnWidth = Math.min(width, MaxContentWidth);
  const nextGradient = onboardingCtaGradientProps(index, SLIDE_KEYS.length);

  const next = () => {
    if (isLast) {
      router.push('/(auth)/register');
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.column, { width: columnWidth }]}>
        <LinearGradient
          {...brandGradientProps}
          style={[styles.header, { paddingTop: chrome.headerPaddingTop }]}
        >
          <Text style={styles.brand}>QUILAX</Text>
          <Text style={styles.step}>
            {index + 1} / {SLIDE_KEYS.length}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.text}>{slide.body}</Text>

          <View style={styles.dots}>
            {SLIDE_KEYS.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(chrome.bottomPadding, Spacing.four) }]}>
          <Pressable style={styles.nextBtn} onPress={next} testID="onboarding-next">
            <LinearGradient
              key={`cta-grad-${index}`}
              {...nextGradient}
              style={styles.nextGradient}
            >
              <Text style={styles.nextText}>
                {isLast ? t('onboarding.startRegister') : t('onboarding.next')}
              </Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => router.replace('/(auth)/welcome')}>
            <Text style={styles.backLink}>{t('onboarding.backToStart')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, alignItems: 'center' },
  column: { flex: 1 },
  header: {
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  brand: {
    ...sora(700),
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  step: {
    ...sora(600),
    marginTop: Spacing.two,
    color: 'rgba(255,255,255,0.9)',
  },
  body: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
  },
  title: {
    ...sora(800),
    fontSize: 26,
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  text: {
    ...sora(500),
    fontSize: 16,
    lineHeight: 26,
    color: Colors.light.textSecondary,
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.five,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.light.backgroundSelected,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.light.gradientEnd,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  nextBtn: { borderRadius: 14, overflow: 'hidden' },
  nextGradient: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    borderRadius: 14,
  },
  nextText: {
    ...sora(700),
    color: '#FFFFFF',
    fontSize: 17,
  },
  backLink: {
    ...sora(600),
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },
});
