import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors, Spacing, BottomTabInset } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';
import { APP_TAB_SECTIONS } from '@/constants/appSections';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={[styles.container, { paddingBottom: Platform.OS === 'ios' ? BottomTabInset : Spacing.two }]}>
      {state.routes.map((route, index) => {
        const section = APP_TAB_SECTIONS.find((item) => item.name === route.name);
        if (!section) return null;

        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tab}
            testID={section.testID}
          >
            <CustomIcon
              name={section.icon}
              size={22}
              color={isFocused ? Colors.light.primary : Colors.light.textSecondary}
            />
            <Text style={[styles.label, isFocused && styles.labelActive]}>{section.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,102,241,0.12)',
    paddingTop: Spacing.two,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.light.primary,
  },
});
