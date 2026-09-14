import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  APP_GRADIENT,
  APP_GRADIENT_LOCATIONS,
  GRADIENT_BAR_HEIGHT,
  GRADIENT_HORIZONTAL,
} from '@/constants/gradients';

/** 4px brand stripe — same language as marketing CSS `.gradient-bar`. */
export function BrandGradientBar({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[...APP_GRADIENT]}
      locations={[...APP_GRADIENT_LOCATIONS]}
      {...GRADIENT_HORIZONTAL}
      style={[styles.bar, style]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    height: GRADIENT_BAR_HEIGHT,
    width: '100%',
  },
});
