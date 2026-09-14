import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import {
  brandGradientProps,
  SCREEN_BACKGROUND,
} from '@/constants/gradients';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { PressScale } from '@/components/motion';

type AuthFlowLayoutProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
};

export function AuthFlowLayout({
  title,
  subtitle,
  badge,
  children,
  footer,
  contentStyle,
}: AuthFlowLayoutProps) {
  return (
    <AppScreen contentContainerStyle={styles.screenContent}>
      <AppHeader title={title} subtitle={subtitle} badge={badge} />
      <View style={[styles.body, contentStyle]}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </AppScreen>
  );
}

export function AuthPrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.96}
      style={disabled ? styles.disabled : undefined}
    >
      <LinearGradient {...brandGradientProps} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{label}</Text>
      </LinearGradient>
    </PressScale>
  );
}

export function AuthSecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <PressScale style={styles.secondaryBtn} onPress={onPress} scaleTo={0.97}>
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </PressScale>
  );
}

export function AuthCard({
  children,
  tint = 'default',
}: {
  children: React.ReactNode;
  tint?: 'default' | 'warm' | 'cool';
}) {
  const bg =
    tint === 'warm' ? '#FFF7ED' : tint === 'cool' ? '#EEF2FF' : '#FFFFFF';
  return <View style={[styles.card, { backgroundColor: bg }]}>{children}</View>;
}

export function AuthProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: Spacing.six,
    backgroundColor: SCREEN_BACKGROUND,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  primaryBtn: {
    paddingVertical: Spacing.three,
    borderRadius: 14,
    alignItems: 'center',
    // @ts-expect-error web-only
    boxShadow: '0 6px 24px rgba(239, 68, 68, 0.28), 0 2px 12px rgba(59, 130, 246, 0.16)',
  },
  primaryBtnText: {
    ...titleTypeface,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingVertical: Spacing.three,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.06)',
    marginBottom: Spacing.three,
    // @ts-expect-error web-only
    boxShadow: '0 4px 24px rgba(28, 25, 23, 0.08)',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginVertical: Spacing.four,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.backgroundSelected,
  },
  dotActive: {
    width: 22,
    backgroundColor: Colors.light.gradientStart,
  },
});
