import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';

type Props = {
  children: React.ReactNode;
};

/** En web, centra la app en un marco tipo móvil (~430px). */
export default function WebMobileFrame({ children }: Props) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    // @ts-expect-error web-only shadow
    boxShadow: '0 0 40px rgba(0,0,0,0.35)',
  },
});
