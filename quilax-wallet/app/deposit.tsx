import { View, Text, StyleSheet } from 'react-native';

export default function DepositScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Depositar fondos</Text>
      <Text style={styles.text}>Conecta con quilax-backend /payments para completar esta pantalla.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  text: { color: '#64748B', lineHeight: 22 },
});
