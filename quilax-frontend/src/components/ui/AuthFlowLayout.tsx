import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { authFormStyles } from '@/constants/authForm';
import { brandGradientProps, SCREEN_BACKGROUND } from '@/constants/gradients';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { PressScale } from '@/components/motion';

type AuthFlowLayoutProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  showBack?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
};

export function AuthFlowLayout({
  title,
  subtitle,
  badge,
  showBack,
  children,
  footer,
  contentStyle,
}: AuthFlowLayoutProps) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <AppScreen contentContainerStyle={styles.screenContent}>
        <AppHeader title={title} subtitle={subtitle} badge={badge} showBack={showBack} />
        <View style={[styles.body, contentStyle]}>{children}</View>
        {/* Keep CTA inside the scroll so DOB + Continue stay above the keyboard */}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </AppScreen>
    </KeyboardAvoidingView>
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
        <Text style={authFormStyles.buttonLabel}>{label}</Text>
      </LinearGradient>
    </PressScale>
  );
}

export function AuthSecondaryButton({
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
      style={[styles.secondaryBtn, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.97}
    >
      <Text style={authFormStyles.secondaryButtonLabel}>{label}</Text>
    </PressScale>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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
  flex: { flex: 1 },
  screenContent: {
    paddingBottom: Spacing.six + 24,
    backgroundColor: SCREEN_BACKGROUND,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.12)',
    backgroundColor: Colors.light.backgroundElement,
  },
  disabled: {
    opacity: 0.55,
  },
  card: {
    borderRadius: 14,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.08)',
    backgroundColor: Colors.light.backgroundElement,
    marginBottom: Spacing.two,
    shadowColor: '#1C1917',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
    marginVertical: Spacing.three,
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
