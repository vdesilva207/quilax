import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useSegments } from 'expo-router';
import { Colors, Spacing, sora, MaxContentWidth } from '@/constants/theme';
import { brandGradientProps, SCREEN_BACKGROUND } from '@/constants/gradients';
import CustomIcon from '@/components/CustomIcon';
import { goToParent } from '@/lib/navigation';
import { HeroEnter, PressScale, ScreenEnter } from '@/components/motion';
import { useChromeInsets } from '@/hooks/useChromeInsets';

type ScreenChromeProps = ScrollViewProps & {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  scroll?: boolean;
};

/**
 * Shared chrome: diagonal brand gradient header + warm body.
 */
export function ScreenChrome({
  title,
  subtitle,
  onBack,
  showBack = false,
  footer,
  children,
  contentStyle,
  scroll = true,
  style,
  ...rest
}: ScreenChromeProps) {
  const router = useRouter();
  const segments = useSegments() as string[];
  const chrome = useChromeInsets();
  const handleBack = onBack ?? (() => goToParent(router, segments));

  const header = (
    <HeroEnter>
      <LinearGradient
        {...brandGradientProps}
        style={[styles.gradientHeader, { paddingTop: chrome.headerPaddingTop }]}
      >
        <View style={styles.headerRow}>
          {showBack ? (
            <PressScale onPress={handleBack} style={styles.backButton} hitSlop={8} scaleTo={0.92}>
              <CustomIcon name="back" size={24} color="#FFFFFF" />
            </PressScale>
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </LinearGradient>
    </HeroEnter>
  );

  const body = (
    <ScreenEnter delay={60} style={[styles.body, contentStyle]}>
      {children}
    </ScreenEnter>
  );
  const footerNode = footer ? <View style={styles.footer}>{footer}</View> : null;

  const column = (
    <View style={styles.phoneColumn}>
      {header}
      {body}
      {footerNode}
    </View>
  );

  if (!scroll) {
    return (
      <View style={[styles.container, styles.containerCenter, style]}>
        {column}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {column}
    </ScrollView>
  );
}

export function GradientButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressScale onPress={onPress} disabled={disabled} scaleTo={0.96} style={disabled ? styles.disabled : undefined}>
      <LinearGradient {...brandGradientProps} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>{label}</Text>
      </LinearGradient>
    </PressScale>
  );
}

export function InfoBar({ children }: { children: React.ReactNode }) {
  return <View style={styles.infoBar}>{children}</View>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  containerCenter: {
    alignItems: 'center',
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  phoneColumn: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  gradientHeader: {
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  backButton: {
    padding: Spacing.two,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    ...sora(800),
    fontSize: 22,
    color: '#FFFFFF',
  },
  subtitle: {
    ...sora(500),
    marginTop: 4,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  infoBar: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  label: {
    ...sora(600),
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...sora(700),
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default ScreenChrome;
