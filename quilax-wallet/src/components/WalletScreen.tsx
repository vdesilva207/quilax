import { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../constants/theme';

export function WalletScreen({
  title,
  subtitle,
  children,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {showBack ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.back}
          hitSlop={12}
        >
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>
      ) : null}
      <Text style={styles.kicker}>Quilax · Gestión</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    backgroundColor: Colors.background,
    gap: Spacing.two,
  },
  back: { alignSelf: 'flex-start', marginBottom: 4 },
  backText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  kicker: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.two },
  body: { gap: Spacing.two, marginTop: Spacing.two },
});
