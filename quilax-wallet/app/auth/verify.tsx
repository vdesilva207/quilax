import { View, Text, StyleSheet } from 'react-native';

export default function VerifyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificación KYC</Text>
      <Text style={styles.text}>Sube documento de identidad y completa la verificación bancaria.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  text: { color: '#64748B', lineHeight: 22 },
});
