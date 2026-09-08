import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../src/lib/api';
import { describeMoneyGateError } from '../src/lib/moneyGate';
import { useWalletAuth } from '../src/context/WalletAuthContext';
import { WalletScreen } from '../src/components/WalletScreen';
import { Colors, Spacing } from '../src/constants/theme';

export default function WithdrawScreen() {
  const router = useRouter();
  const { status, refreshStatus } = useWalletAuth();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canWithdraw = !!status?.eligibility?.canWithdraw;
  const bankMissing = !status?.verification?.isBankVerified || !status?.verification?.hasBankAccount;
  const kycMissing = !status?.verification?.idVerified;

  const showGate = (error: any) => {
    const info = describeMoneyGateError(error);
    const buttons: any[] = [{ text: 'OK', style: 'cancel' }];
    if (info.action === 'kyc') {
      buttons.unshift({ text: 'Ver verificación', onPress: () => router.push('/auth/verify') });
    }
    if (info.action === 'bank') {
      buttons.unshift({ text: 'Conectar banco', onPress: () => router.push('/settings/bank') });
    }
    Alert.alert(info.title, info.body, buttons);
  };

  const handleWithdraw = async () => {
    if (kycMissing) {
      Alert.alert(
        'Verificación requerida',
        'Completa el KYC en la app Quilax antes de retirar.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver estado', onPress: () => router.push('/auth/verify') },
        ]
      );
      return;
    }
    if (bankMissing || !canWithdraw) {
      Alert.alert('Cuenta bancaria', 'Conecta tu banco con Stripe antes de retirar.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Conectar', onPress: () => router.push('/settings/bank') },
      ]);
      return;
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value < 5) {
      Alert.alert('Error', 'El mínimo de retiro es 5 créditos');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch('/withdraws/request', {
        method: 'POST',
        body: JSON.stringify({ amount: value }),
      });
      if (data?.heldForReview) {
        Alert.alert(
          'En revisión',
          data.estimatedTime ||
            'Tu retiro está en revisión de seguridad. Te avisaremos cuando se procese.'
        );
      } else {
        Alert.alert('Solicitado', 'Tu retiro está en proceso');
      }
      setAmount('');
      await refreshStatus();
    } catch (error) {
      showGate(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WalletScreen
      title="Retirar fondos"
      subtitle="El dinero se envía a la cuenta bancaria que conectaste con Stripe."
    >
      <View style={styles.card}>
        <Text style={styles.meta}>Balance disponible</Text>
        <Text style={styles.balance}>{status?.balance ?? 0} cr</Text>
      </View>

      {kycMissing ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>KYC pendiente</Text>
          <Text style={styles.warning}>Verifica tu identidad en la app Quilax antes de retirar.</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/auth/verify')}>
            <Text style={styles.btnText}>Ver estado de verificación</Text>
          </Pressable>
        </View>
      ) : null}

      {!kycMissing && bankMissing ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>Banco no conectado</Text>
          <Text style={styles.warning}>
            {status?.eligibility?.reasons?.join(' · ') ||
              'Necesitas completar el alta bancaria en Stripe.'}
          </Text>
          <Pressable style={styles.btn} onPress={() => router.push('/settings/bank')}>
            <Text style={styles.btnText}>Conectar cuenta bancaria</Text>
          </Pressable>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Cantidad a retirar"
        placeholderTextColor={Colors.textSecondary}
        editable={!bankMissing && !kycMissing}
      />
      <Pressable
        style={[styles.btn, (submitting || bankMissing || kycMissing) && styles.btnDisabled]}
        onPress={handleWithdraw}
        disabled={submitting || bankMissing || kycMissing}
      >
        <Text style={styles.btnText}>{submitting ? 'Enviando…' : 'Solicitar retiro'}</Text>
      </Pressable>
    </WalletScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: 16,
    padding: Spacing.four,
    gap: 4,
  },
  meta: { color: Colors.textSecondary },
  balance: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  warnBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  warnTitle: { fontWeight: '800', color: '#92400E' },
  warning: { color: '#92400E', lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: Spacing.three,
    color: Colors.text,
    backgroundColor: '#fff',
  },
  btn: { backgroundColor: Colors.primary, padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700' },
});
