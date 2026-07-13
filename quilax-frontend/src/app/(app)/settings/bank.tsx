import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import CustomIcon from '@/components/CustomIcon';

import apiClient from '@/lib/api';

export default function BankAccountSettingsScreen() {
  const router = useRouter();
  const [iban, setIban] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bic, setBic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!iban || !accountName) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/payments/bank-account', { iban, accountName, bic });
      Alert.alert('Éxito', 'Cuenta bancaria actualizada correctamente');
      router.back();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CustomIcon name="back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.title}>Cuenta Bancaria</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.warningSection}>
          <Text style={styles.warningTitle}>Importante</Text>
          <Text style={styles.warningText}>
            Al cambiar tu cuenta bancaria, se enviará una confirmación a tu nueva cuenta para verificar la asociación. La cuenta anterior se desvinculará después de la primera transacción con la nueva cuenta.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>IBAN</Text>
          <TextInput
            style={styles.input}
            placeholder="ES00 0000 0000 0000 0000 0000"
            placeholderTextColor={Colors.light.textSecondary}
            value={iban}
            onChangeText={setIban}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Nombre del Titular</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del titular de la cuenta"
            placeholderTextColor={Colors.light.textSecondary}
            value={accountName}
            onChangeText={setAccountName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>BIC/SWIFT (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="BIC del banco"
            placeholderTextColor={Colors.light.textSecondary}
            value={bic}
            onChangeText={setBic}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.section}>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar Cuenta Bancaria</Text>
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Estado de la cuenta:</Text>
          <Text style={styles.infoText}>- Pendiente de verificación</Text>
          <Text style={styles.infoText}>- Verificada</Text>
          <Text style={styles.infoText}>- Rechazada</Text>
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
  gradientHeader: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: Spacing.two,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: Spacing.four,
  },
  warningSection: {
    backgroundColor: '#FFF3CD',
    padding: Spacing.four,
    borderRadius: 8,
    marginBottom: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: Spacing.two,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  section: {
    marginBottom: Spacing.four,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    marginTop: Spacing.four,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
});
