import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.label}>{user?.email}</Text>
      <Text style={styles.meta}>Balance: {user?.balance ?? 0} créditos</Text>

      <Pressable style={styles.button} onPress={() => router.push('/(app)/profile/edit')}>
        <Text style={styles.buttonText}>Editar perfil</Text>
      </Pressable>

      <Pressable testID="logout-button" style={styles.secondaryButton} onPress={logout}>
        <Text style={styles.secondaryText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.six, backgroundColor: Colors.light.background },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: Spacing.two },
  label: { fontSize: 16, color: Colors.light.text },
  meta: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: Spacing.four },
  button: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { padding: Spacing.four, alignItems: 'center' },
  secondaryText: { color: Colors.light.error, fontWeight: '600' },
});
