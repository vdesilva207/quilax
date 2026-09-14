import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import {
  SCREEN_BACKGROUND,
  SECTION_ACCENTS,
  brandGradientProps,
  APP_GRADIENT_SOFT,
  GRADIENT_DIAGONAL,
} from '@/constants/gradients';
import { FadeBlock, HeroEnter, PressScale, ScreenEnter } from '@/components/motion';

type AppScreenProps = ScrollViewProps & {
  children: React.ReactNode;
};

export function AppScreen({ children, style, contentContainerStyle, ...rest }: AppScreenProps) {
  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      <ScreenEnter>{children}</ScreenEnter>
    </ScrollView>
  );
}

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
};

export function AppHeader({ title, subtitle, badge, children }: AppHeaderProps) {
  return (
    <HeroEnter>
      <LinearGradient {...brandGradientProps} style={styles.header}>
        <Text style={styles.brandMark}>QUILAX</Text>
        <Text style={styles.headerTitle}>{title}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        {children}
      </LinearGradient>
    </HeroEnter>
  );
}

type AppSectionProps = {
  title: string;
  accentIndex?: number;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function AppSection({ title, accentIndex = 0, children, style }: AppSectionProps) {
  const accent = SECTION_ACCENTS[accentIndex % SECTION_ACCENTS.length];
  return (
    <FadeBlock delay={50 + accentIndex * 40} style={[styles.section, style]}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </FadeBlock>
  );
}

type AppCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export function AppCard({ children, onPress, style }: AppCardProps) {
  const content = <View style={[styles.card, style]}>{children}</View>;

  if (onPress) {
    return (
      <PressScale onPress={onPress} scaleTo={0.98}>
        {content}
      </PressScale>
    );
  }

  return content;
}

export function AppPlaceholder({ text }: { text: string }) {
  return (
    <LinearGradient colors={[...APP_GRADIENT_SOFT]} style={styles.placeholder} {...GRADIENT_DIAGONAL}>
      <Text style={styles.placeholderText}>{text}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  screenContent: {
    paddingBottom: Spacing.six,
  },
  header: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  brandMark: {
    ...titleTypeface,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3.4,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: Spacing.two,
  },
  headerTitle: {
    ...titleTypeface,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    marginTop: Spacing.two,
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 420,
  },
  badge: {
    marginTop: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionAccent: {
    width: 4,
    height: 22,
    borderRadius: 4,
  },
  sectionTitle: {
    ...titleTypeface,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.06)',
    // @ts-expect-error web-only
    boxShadow: '0 4px 24px rgba(28, 25, 23, 0.08)',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  placeholder: {
    padding: Spacing.five,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  placeholderText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
