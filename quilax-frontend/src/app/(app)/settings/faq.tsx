import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

const FAQ_ITEMS = [
  { q: '¿Cuánto cuesta entrar a un quiz?', a: 'Cada quiz cuesta 1 crédito (≈1 EUR). El crédito no se devuelve.' },
  { q: '¿Cómo retiro mis premios?', a: 'Desde la sección de gestión/wallet puedes solicitar retiro a tu cuenta bancaria verificada.' },
  { q: '¿Puedo crear quizzes?', a: 'Sí, si has participado en el número mínimo de quizzes requerido.' },
];

export default function FaqScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Preguntas frecuentes</Text>
      {FAQ_ITEMS.map((item) => (
        <View key={item.q} style={styles.item}>
          <Text style={styles.question}>{item.q}</Text>
          <Text style={styles.answer}>{item.a}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: Spacing.four },
  item: { marginBottom: Spacing.four },
  question: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.one },
  answer: { fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
});
