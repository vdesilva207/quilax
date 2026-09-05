import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { apiFetch } from '../src/lib/api';
import { useWalletAuth } from '../src/context/WalletAuthContext';
import { Colors, Spacing } from '../src/constants/theme';

export default function WithdrawScreen() {
  const { status, refreshStatus } = useWalletAuth();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleWithdraw = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 5) {
      Alert.alert('Error', 'El mínimo de retiro es 5 créditos');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/withdraws/request', {
        method: 'POST',
        body: JSON.stringify({ amount: value }),
      });
      Alert.alert('Solicitado', 'Tu retiro está en proceso');
      setAmount('');
      await refreshStatus();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo solicitar el retiro');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Retirar fondos</Text>
      <Text style={styles.meta}>Balance: {status?.balance ?? 0} cr</Text>
      {!status?.eligibility?.canWithdraw && status?.eligibility?.reasons?.length ? (
        <Text style={styles.warning}>{status.eligibility.reasons.join(' · ')}</Text>
      ) : null}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Cantidad a retirar"
      />
      <Pressable style={styles.button} onPress={handleWithdraw} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Enviando…' : 'Solicitar retiro'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, backgroundColor: Colors.background, gap: Spacing.two },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  meta: { color: Colors.textSecondary },
  warning: { color: Colors.error, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  button: { backgroundColor: Colors.primary, padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
