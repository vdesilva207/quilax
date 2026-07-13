import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';

export default function AdminAccessScreen() {
  return (
    <AppScreen>
      <AppHeader title="Acceso Admin" subtitle="Control de accesos y permisos" />
      <View style={styles.content}>
        <Text style={styles.text}>
          Gestión de IPs permitidas, sesiones activas y políticas de acceso al panel.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four },
  text: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
});
