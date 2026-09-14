import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Colors,
  APP_GRADIENT,
  APP_GRADIENT_LOCATIONS,
  Spacing,
  Fonts,
  MaxWidth,
} from '@/constants/theme';
import { FadeBlock, HeroEnter, PressScale, ScreenEnter } from '@/components/motion';

type ShellProps = {
  brand?: boolean;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
};

/** Mobile-first phone column. Large brand gradient hero; money CTAs stay solid. */
export function WalletShell({
  brand = true,
  title,
  subtitle,
  showBack,
  children,
  footer,
  contentStyle,
}: ShellProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > MaxWidth + 48;
  const column = Math.min(width, MaxWidth);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.column,
            { width: column },
            isDesktop && styles.phoneFrame,
          ]}
        >
          <HeroEnter>
            <LinearGradient
              colors={[...APP_GRADIENT]}
              locations={[...APP_GRADIENT_LOCATIONS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              {showBack ? (
                <PressScale onPress={() => router.back()} style={styles.back} hitSlop={8} scaleTo={0.94}>
                  <Text style={styles.backText}>{t('common.back')}</Text>
                </PressScale>
              ) : null}
              {brand ? <Text style={styles.brand}>{t('common.brand')}</Text> : null}
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </LinearGradient>
          </HeroEnter>

          <ScreenEnter delay={50} style={[styles.body, contentStyle]}>
            <FadeBlock delay={40}>{children}</FadeBlock>
          </ScreenEnter>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** Solid primary CTA — no gradient (money actions). */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  locked,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  locked?: boolean;
}) {
  const inactive = disabled || locked;
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.97}
      style={[
        styles.primaryBtn,
        locked && styles.primaryBtnLocked,
        inactive && !locked && { opacity: 0.45 },
        locked && { opacity: 1 },
      ]}
    >
      <Text style={[styles.primaryBtnText, locked && styles.primaryBtnTextLocked]}>
        {label}
      </Text>
    </PressScale>
  );
}

export function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PrimaryButton label={label} onPress={onPress} disabled={disabled} />
  );
}

export function SecondaryButton({
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
      scaleTo={0.97}
      style={[styles.secondaryBtn, disabled && { opacity: 0.45 }]}
    >
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  scrollDesktop: {
    justifyContent: 'center',
    minHeight: '100%' as unknown as number,
  },
  column: {
    gap: Spacing.md,
  },
  phoneFrame: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.08)',
    backgroundColor: Colors.surface,
    shadowColor: '#1C1917',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  backText: {
    fontFamily: Fonts.body,
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  brand: {
    fontFamily: Fonts.display,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.8,
    color: 'rgba(255,255,255,0.92)',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    maxWidth: 340,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnLocked: {
    backgroundColor: '#D6D3D1',
    shadowOpacity: 0,
  },
  primaryBtnText: {
    fontFamily: Fonts.body,
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  primaryBtnTextLocked: {
    color: '#57534E',
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.12)',
    backgroundColor: Colors.surface,
  },
  secondaryBtnText: {
    fontFamily: Fonts.body,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
