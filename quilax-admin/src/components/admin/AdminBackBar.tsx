import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { SCREEN_BACKGROUND } from '@/constants/gradients';

const ROOT_SEGMENTS = new Set(['dashboard', 'login', 'index']);

export default function AdminBackBar() {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[segments.length - 1] ?? '';

  if (ROOT_SEGMENTS.has(current)) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.button}
        onPress={() => router.replace('/panel/dashboard')}
        accessibilityRole="button"
        accessibilityLabel="Volver al dashboard"
      >
        <CustomIcon name="back" size={22} color={Colors.light.primary} />
        <Text style={styles.label}>Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: SCREEN_BACKGROUND,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingRight: Spacing.two,
  },
  label: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
});
