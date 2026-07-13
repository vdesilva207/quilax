import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import CustomIcon from '@/components/CustomIcon';

import { useAuth } from '@/context/AuthContext';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState(user?.bio || '');

  const handleSave = async () => {
    const result = await updateUser({ fullName: name, bio, dateOfBirth: dateOfBirth || undefined });
    if (result.success) {
      Alert.alert('Guardado', 'Información personal actualizada correctamente');
      router.back();
    } else {
      Alert.alert('Error', result.error || 'No se pudo guardar');
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
          <Text style={styles.title}>Información Personal</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            placeholderTextColor={Colors.light.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Fecha de Nacimiento</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={Colors.light.textSecondary}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Biografía</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Cuéntanos sobre ti..."
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
          />
        </View>

        <View style={styles.section}>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </Pressable>
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
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
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
});
