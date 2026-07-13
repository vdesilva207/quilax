import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';

export default function SupportScreen() {
  return (
    <AppScreen>
      <AppHeader title="Soporte" subtitle="Tickets y atención al usuario" />
      <View style={styles.content}>
        <Text style={styles.text}>
          Gestiona tickets de soporte desde el backend en /admin/support.
          Esta pantalla se conectará al listado de tickets en una próxima iteración.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four },
  text: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
});
