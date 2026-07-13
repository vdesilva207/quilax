import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function WithdrawScreen() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');

  const handleWithdraw = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 5) {
      Alert.alert('Error', 'El mínimo de retiro es 5 créditos');
      return;
    }

    try {
      await apiClient.post('/withdraws/request', { amount: value });
      Alert.alert('Solicitado', 'Tu retiro está en proceso');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo solicitar el retiro');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Retirar fondos</Text>
      <Text style={styles.meta}>Balance: {user?.balance ?? 0} cr</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Cantidad a retirar"
      />
      <Pressable style={styles.button} onPress={handleWithdraw}>
        <Text style={styles.buttonText}>Solicitar retiro</Text>
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
