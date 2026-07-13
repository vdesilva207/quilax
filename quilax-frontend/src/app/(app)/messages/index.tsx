import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mensajes</Text>
      <Text style={styles.text}>Bandeja de mensajes y chat — pendiente de reconexión con /messages API.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: Spacing.two },
  text: { color: Colors.light.textSecondary, lineHeight: 22 },
});
