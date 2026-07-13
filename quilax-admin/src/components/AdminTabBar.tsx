import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import {
  APP_GRADIENT,
  GRADIENT_HORIZONTAL,
  SCREEN_BACKGROUND,
} from '@/constants/gradients';

interface AdminTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets: any;
}

export default function AdminTabBar({ state, descriptors, navigation, insets }: AdminTabBarProps) {
  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0) },
      ]}
    >
      <LinearGradient colors={[...APP_GRADIENT]} style={styles.topBar} {...GRADIENT_HORIZONTAL} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              onPress={onPress}
              activeOpacity={0.85}
            >
              {isFocused ? (
                <LinearGradient
                  colors={[...APP_GRADIENT]}
                  style={styles.tabGradient}
                  {...GRADIENT_HORIZONTAL}
                >
                  <Text style={styles.tabTextActive}>{label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>{label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SCREEN_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,102,241,0.12)',
  },
  topBar: {
    height: 3,
    width: '100%',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    gap: Spacing.one,
  },
  tabItem: {
    marginHorizontal: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tabItemActive: {
    shadowColor: Colors.light.gradientStart,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tabGradient: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  tabTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
