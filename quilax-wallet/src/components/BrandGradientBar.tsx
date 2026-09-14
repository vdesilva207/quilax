import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_GRADIENT, APP_GRADIENT_LOCATIONS } from '@/constants/theme';

/** 4px brand stripe — matches quilax-website `.gradient-bar`. */
export function BrandGradientBar({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[...APP_GRADIENT]}
      locations={[...APP_GRADIENT_LOCATIONS]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.bar, style]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 4,
    width: '100%',
  },
});
