import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function AddBankAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Añadir Cuenta Bancaria</Text>
        <Text style={styles.subtitle}>Añade tu cuenta bancaria para poder retirar tus ganancias</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del titular"
          placeholderTextColor={Colors.light.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="IBAN"
          placeholderTextColor={Colors.light.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="SWIFT/BIC"
          placeholderTextColor={Colors.light.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Nombre del banco"
          placeholderTextColor={Colors.light.textSecondary}
        />

        <Pressable style={styles.button} onPress={() => router.push('/(auth)/complete-profile')}>
          <Text style={styles.buttonText}>Continuar</Text>
        </Pressable>
        
        <Pressable style={styles.skipButton} onPress={() => router.push('/(auth)/complete-profile')}>
          <Text style={styles.skipButtonText}>Saltar por ahora</Text>
        </Pressable>
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
    padding: Spacing.six,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
  },
});
