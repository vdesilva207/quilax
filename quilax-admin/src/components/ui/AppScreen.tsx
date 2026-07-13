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
import { Colors, Spacing } from '@/constants/theme';
import {
  APP_GRADIENT,
  SCREEN_BACKGROUND,
  SECTION_ACCENTS,
  GRADIENT_VERTICAL,
} from '@/constants/gradients';

type AppScreenProps = ScrollViewProps & {
  children: React.ReactNode;
};

export function AppScreen({ children, style, contentContainerStyle, ...rest }: AppScreenProps) {
  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      {...rest}
    >
      {children}
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
    <LinearGradient
      colors={[...APP_GRADIENT]}
      style={styles.header}
      {...GRADIENT_VERTICAL}
    >
      <Text style={styles.headerTitle}>{title}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      {children}
    </LinearGradient>
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
    <View style={[styles.section, style]}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

type AppCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  tint?: 'default' | 'warm' | 'cool';
  style?: ViewStyle;
};

const CARD_BACKGROUNDS = {
  default: '#FFFFFF',
  warm: '#FFF7ED',
  cool: '#EEF2FF',
};

export function AppCard({ children, onPress, tint = 'default', style }: AppCardProps) {
  const content = (
    <View style={[styles.card, { backgroundColor: CARD_BACKGROUNDS[tint] }, style]}>
      <LinearGradient
        colors={[`${Colors.light.gradientStart}18`, `${Colors.light.gradientEnd}08`]}
        style={styles.cardSheen}
        {...GRADIENT_VERTICAL}
      />
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.cardPressed]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export function AppPlaceholder({ text }: { text: string }) {
  return (
    <LinearGradient
      colors={['#EEF2FF', '#F8FAFC']}
      style={styles.placeholder}
      {...GRADIENT_VERTICAL}
    >
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
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    marginTop: Spacing.two,
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 22,
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
    overflow: 'hidden',
    shadowColor: Colors.light.gradientStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSheen: {
    ...StyleSheet.absoluteFillObject,
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
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.1)',
  },
  placeholderText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
