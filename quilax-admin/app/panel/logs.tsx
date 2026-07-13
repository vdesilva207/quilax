import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export default function LogsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Logs</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>Logs del sistema</Text>
        <Text style={styles.description}>
          Aquí podrás ver todos los logs de accesos, acciones, errores, transacciones y quizzes.
        </Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Funcionalidad en desarrollo</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: Spacing.four,
    backgroundColor: Colors.light.backgroundElement,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  content: {
    padding: Spacing.four,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.four,
    lineHeight: 24,
  },
  placeholder: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.six,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
});
