import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { Pressable } from 'react-native';

const REPORT_LINKS = [
  { label: 'Analytics de quizzes', href: '/panel/quizzes' },
  { label: 'Finanzas', href: '/panel/financial' },
  { label: 'Historial jackpot', href: '/panel/jackpot-history' },
  { label: 'Logs del sistema', href: '/panel/logs' },
];

export default function ReportsScreen() {
  const router = useRouter();

  return (
    <AppScreen>
      <AppHeader title="Reportes" subtitle="Métricas y análisis" />
      <View style={styles.list}>
        {REPORT_LINKS.map((link) => (
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
