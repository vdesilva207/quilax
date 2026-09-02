import { version } from 'expo/package.json';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export function WebBadge() {
  return (
    <View style={styles.container}>
      <Text style={styles.versionText}>v{version}</Text>
      <Image source={require('@/assets/images/expo-badge.png')} style={styles.badgeImage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  versionText: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  badgeImage: {
    width: 123,
    aspectRatio: 123 / 24,
  },
});
