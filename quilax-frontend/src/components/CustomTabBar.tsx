import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';
import { APP_TAB_SECTIONS } from '@/constants/appSections';
import { useQuizPlayUi } from '@/context/QuizPlayUiContext';
import { PressScale } from '@/components/motion';
import Animated, { FadeInUp, Easing } from 'react-native-reanimated';
import { useChromeInsets } from '@/hooks/useChromeInsets';

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const barWidth = Math.min(width, MaxContentWidth);
  const { hideTabBar } = useQuizPlayUi();
  const { t } = useTranslation();
  const chrome = useChromeInsets();

  if (hideTabBar) return null;

  return (
    <Animated.View entering={FadeInUp.duration(280).easing(Easing.out(Easing.cubic))} style={styles.outer}>
      <View
        style={[
          styles.container,
          {
            width: barWidth,
            paddingBottom: chrome.bottomPadding,
          },
        ]}
      >
        {APP_TAB_SECTIONS.map((section) => {
          const routeIndex = state.routes.findIndex((r) => r.name === section.name);
          if (routeIndex < 0) return null;
          const route = state.routes[routeIndex];
          const isFocused = state.index === routeIndex;
          const label = t(section.labelKey);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) return;

            // Misma pestaña otra vez → volver al hub (p. ej. Config desde Términos)
            if (isFocused) {
              navigation.navigate(route.name as never, { screen: 'index' } as never);
              return;
            }

            if (section.name === 'quiz') {
              navigation.navigate('quiz', { screen: 'create' });
            } else {
              navigation.navigate(route.name);
            }
          };

          return (
            <PressScale
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
              testID={section.testID}
              scaleTo={0.96}
            >
              <CustomIcon
                name={section.icon}
                size={22}
                color={isFocused ? Colors.light.primary : Colors.light.textSecondary}
              />
            </PressScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.light.backgroundElement,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundSelected,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
});
