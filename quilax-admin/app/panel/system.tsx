import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { Pressable } from 'react-native';

const LINKS = [
  { label: 'Reparto de quizzes', href: '/panel/quiz-distribution' },
  { label: 'Reparto jackpot temporada', href: '/panel/season-jackpot-distribution' },
  { label: 'Gestión de admins', href: '/panel/admins' },
  { label: 'Notificaciones globales', href: '/panel/notifications' },
];

export default function SystemScreen() {
  const router = useRouter();

  return (
    <AppScreen>
      <AppHeader title="Sistema" subtitle="Configuración general" />
      <View style={styles.list}>
        {LINKS.map((link) => (
          <Pressable key={link.href} style={styles.item} onPress={() => router.push(link.href as any)}>
            <Text style={styles.label}>{link.label}</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.four, gap: Spacing.two },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
  },
  label: { fontSize: 16, fontWeight: '600' },
  arrow: { fontSize: 20, color: Colors.light.textSecondary },
});
