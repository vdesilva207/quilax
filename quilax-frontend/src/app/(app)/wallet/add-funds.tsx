import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function AddFundsScreen() {
  const { user, updateUser } = useAuth();
  const [amount, setAmount] = useState('10');

  const handleAdd = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      Alert.alert('Error', 'Introduce una cantidad válida');
      return;
    }

    try {
      await apiClient.post('/payments/create-intent', { amount: value });
      Alert.alert('Éxito', 'Sigue el flujo de pago para completar la compra');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo iniciar el pago');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Añadir fondos</Text>
      <Text style={styles.meta}>Balance actual: {user?.balance ?? 0} cr</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Cantidad en EUR"
      />
      <Pressable style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>Continuar al pago</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: Spacing.two },
  meta: { color: Colors.light.textSecondary, marginBottom: Spacing.four },
  input: { borderWidth: 1, borderColor: Colors.light.backgroundSelected, borderRadius: 12, padding: Spacing.three, marginBottom: Spacing.four },
  button: { backgroundColor: Colors.light.primary, padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
