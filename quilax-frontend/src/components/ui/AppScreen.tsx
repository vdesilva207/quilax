import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useSegments } from 'expo-router';
import { Colors, Spacing, MaxContentWidth, sora } from '@/constants/theme';
import {
  SCREEN_BACKGROUND,
  SECTION_ACCENTS,
  brandGradientProps,
} from '@/constants/gradients';
import CustomIcon from '@/components/CustomIcon';
import { goToParent } from '@/lib/navigation';
import { FadeBlock, HeroEnter, PressScale, ScreenEnter } from '@/components/motion';
import { useChromeInsets } from '@/hooks/useChromeInsets';
import { BrandGradientBar } from '@/components/ui/BrandGradientBar';

type AppScreenProps = ScrollViewProps & {
  children: React.ReactNode;
  /** Hide the top 4px brand stripe (e.g. screens with a full gradient hero). */
  hideGradientBar?: boolean;
};

export function AppScreen({
  children,
  style,
  contentContainerStyle,
  hideGradientBar = true,
  ...rest
}: AppScreenProps) {
  const kids = React.Children.toArray(children);
  const pinned = kids.length > 0 ? kids[0] : null;
  const body = kids.slice(1);

  return (
    <View style={styles.screenRoot}>
      {hideGradientBar ? null : <BrandGradientBar />}
      {pinned ? (
        <View style={styles.pinnedHeader}>
          <View style={styles.phoneColumn}>{pinned}</View>
        </View>
      ) : null}
      <ScrollView
        style={[styles.screen, style]}
        contentContainerStyle={[styles.screenContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        overScrollMode="never"
        {...rest}
      >
        <ScreenEnter style={styles.phoneColumn}>{body}</ScreenEnter>
      </ScrollView>
    </View>
  );
}

type AppHeaderProps = {
  /** Nombre de la pantalla (Inicio, Perfil, Config…) */
  title: string;
  subtitle?: string;
  badge?: string;
  /** Marca grande encima del título. Por defecto QUILAX. */
  brand?: string | null;
  showBack?: boolean;
  /** Si se indica, el atrás va aquí en lugar de router.back() */
  backHref?: string;
  onBack?: () => void;
  children?: React.ReactNode;
};

export function AppHeader({
  title,
  subtitle,
  badge,
  brand = 'QUILAX',
  showBack,
  backHref,
  onBack,
  children,
}: AppHeaderProps) {
  const router = useRouter();
  const segments = useSegments() as string[];
  const chrome = useChromeInsets();

  const handleBack =
    onBack ??
    (() => {
      goToParent(router, segments, backHref);
    });

  const showBrand = Boolean(brand) && brand!.toUpperCase() !== title.toUpperCase();

  return (
    <HeroEnter>
      <LinearGradient
        {...brandGradientProps}
        style={[styles.header, { paddingTop: chrome.headerPaddingTop }]}
      >
        <View style={styles.headerRow}>
          {showBack ? (
            <PressScale onPress={handleBack} style={styles.backButton} hitSlop={8} scaleTo={0.92}>
              <CustomIcon name="back" size={24} color="#FFFFFF" />
            </PressScale>
          ) : null}
          <View style={styles.headerText}>
            {showBrand ? <Text style={styles.headerBrand}>{brand}</Text> : null}
            <Text style={[styles.headerTitle, showBrand && styles.headerTitleUnderBrand]}>{title}</Text>
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
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
    <FadeBlock delay={60 + accentIndex * 40} style={[styles.section, style]}>
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
      <PressScale onPress={onPress} style={styles.cardPressedWrap}>
        {content}
      </PressScale>
    );
  }

  return content;
}

export function AppPlaceholder({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.placeholderAction, pressed && styles.placeholderActionPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.placeholderActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  pinnedHeader: {
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
  },
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  screenContent: {
    paddingBottom: Spacing.six,
    alignItems: 'center',
  },
  phoneColumn: {
    width: '100%',
    // Desktop web only — on real phones a 480 cap made heroes/modals look inset & off-center.
    maxWidth: Platform.OS === 'web' ? MaxContentWidth : undefined,
  },
  header: {
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
  headerText: {
    flex: 1,
  },
  headerBrand: {
    ...sora(800),
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 2.2,
  },
  headerTitle: {
    ...sora(800),
    fontSize: 22,
    color: '#FFFFFF',
  },
  headerTitleUnderBrand: {
    ...sora(700),
    marginTop: 4,
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    ...sora(500),
    marginTop: Spacing.one,
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 20,
  },
  badge: {
    marginTop: Spacing.two,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 12,
  },
  badgeText: {
    ...sora(700),
    color: '#FFFFFF',
    fontSize: 13,
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
    height: 20,
    borderRadius: 2,
  },
  sectionTitle: {
    ...sora(800),
    fontSize: 18,
    color: Colors.light.text,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.06)',
    backgroundColor: Colors.light.backgroundElement,
    shadowColor: '#1C1917',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressedWrap: {
    marginBottom: 0,
  },
  cardPressed: {
    opacity: 0.92,
  },
  placeholder: {
    padding: Spacing.five,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  placeholderText: {
    ...sora(500),
    color: Colors.light.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  placeholderAction: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  placeholderActionPressed: { opacity: 0.88 },
  placeholderActionText: {
    ...sora(700),
    color: '#FFFFFF',
    fontSize: 14,
  },
});
