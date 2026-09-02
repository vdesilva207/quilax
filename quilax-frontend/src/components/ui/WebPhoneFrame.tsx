import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { MaxContentWidth, Colors } from '@/constants/theme';
import { SCREEN_BACKGROUND } from '@/constants/gradients';

/**
 * En web (desktop), centra toda la app en una columna tipo móvil.
 * En dispositivo real no cambia nada.
 */
export function WebPhoneFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > MaxContentWidth + 48;

  if (!isWebDesktop) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View style={styles.desktopRoot}>
      <View style={[styles.phoneShell, { width: MaxContentWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  desktopRoot: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    backgroundColor: '#E8E4DE',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 24,
  },
  phoneShell: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    minHeight: 720,
    backgroundColor: SCREEN_BACKGROUND || Colors.light.background,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
});
