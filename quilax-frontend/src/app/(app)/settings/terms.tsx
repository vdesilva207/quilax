import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Términos y condiciones</Text>
      <Text style={styles.text}>
        Al usar Quilax aceptas participar en quizzes competitivos con créditos que representan valor monetario.
        Los premios se distribuyen según las reglas de cada quiz y la configuración del administrador.
      </Text>
      <Text style={styles.text}>
        Debes ser mayor de 18 años o contar con autorización de un tutor legal. Las transacciones monetarias
        requieren verificación de identidad y cuenta bancaria.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: Spacing.four },
  text: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22, marginBottom: Spacing.three },
});
