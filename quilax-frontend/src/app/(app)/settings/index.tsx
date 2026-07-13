import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';

const SETTINGS_LINKS = [
  { title: 'Información personal', href: '/(app)/settings/account', icon: 'user' },
  { title: 'Privacidad', href: '/(app)/settings/privacy', icon: 'shield' },
  { title: 'Seguridad', href: '/(app)/settings/security', icon: 'lock' },
  { title: 'Notificaciones', href: '/(app)/settings/notifications', icon: 'bell' },
  { title: 'Centro de ayuda', href: '/(app)/settings/help', icon: 'help' },
  { title: 'FAQ', href: '/(app)/settings/faq', icon: 'faq' },
  { title: 'Términos', href: '/(app)/settings/terms', icon: 'document' },
  { title: 'Contacto', href: '/(app)/settings/contact', icon: 'mail' },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Ajustes</Text>
      </LinearGradient>

      <View style={styles.content}>
        {SETTINGS_LINKS.map((link) => (
          <Pressable
            key={link.href}
            style={styles.item}
            onPress={() => router.push(link.href)}
          >
            <Text style={styles.itemTitle}>{link.title}</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { padding: Spacing.six, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  content: { padding: Spacing.four, gap: Spacing.two },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
  },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  arrow: { fontSize: 20, color: Colors.light.textSecondary },
});
