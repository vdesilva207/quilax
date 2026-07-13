import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';

export default function WorkerSupportScreen() {
  return (
    <AppScreen>
      <AppHeader title="Soporte (Worker)" subtitle="Tickets asignados" badge="WORKER" />
      <View style={styles.content}>
        <Text style={styles.text}>
          Los empleados pueden ver y responder tickets asignados.
          Conecta esta vista a /admin/support con permisos de ADMIN_WORKER.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four },
  text: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
});
