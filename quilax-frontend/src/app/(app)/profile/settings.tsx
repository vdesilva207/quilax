import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';

export default function ProfileSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CustomIcon name="back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Configuración de Perfil</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <CustomIcon name="lock" size={20} color={Colors.light.text} />
          <Text style={styles.sectionTitle}>Configuración de Privacidad</Text>
        </View>
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <CustomIcon name="user" size={20} color={Colors.light.gradientStart} />
            <View style={styles.settingDetails}>
              <Text style={styles.settingTitle}>Perfil Público</Text>
              <Text style={styles.settingDescription}>Visible para todos los usuarios</Text>
            </View>
          </View>
          <Pressable style={styles.toggle}>
            <Text style={styles.toggleText}>ON</Text>
          </Pressable>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <CustomIcon name="lock" size={20} color={Colors.light.gradientStart} />
            <View style={styles.settingDetails}>
              <Text style={styles.settingTitle}>Perfil Privado</Text>
              <Text style={styles.settingDescription}>Solo visible para ti y ADMIN</Text>
            </View>
          </View>
          <Pressable style={styles.toggleOff}>
            <Text style={styles.toggleTextOff}>OFF</Text>
          </Pressable>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <CustomIcon name="rules" size={20} color={Colors.light.gradientStart} />
            <View style={styles.settingDetails}>
              <Text style={styles.settingTitle}>Historial de Quizzes</Text>
              <Text style={styles.settingDescription}>Mostrar historial de quizzes</Text>
            </View>
          </View>
          <Pressable style={styles.toggle}>
            <Text style={styles.toggleText}>ON</Text>
          </Pressable>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <CustomIcon name="trophy" size={20} color={Colors.light.gradientStart} />
            <View style={styles.settingDetails}>
              <Text style={styles.settingTitle}>Premios</Text>
              <Text style={styles.settingDescription}>Mostrar premios ganados</Text>
            </View>
          </View>
          <Pressable style={styles.toggle}>
            <Text style={styles.toggleText}>ON</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <CustomIcon name="settings" size={20} color={Colors.light.text} />
          <Text style={styles.sectionTitle}>Configuración de Cuenta</Text>
        </View>
        <Pressable style={styles.settingButton} onPress={() => router.push('/(app)/profile/change-password')}>
          <CustomIcon name="lock" size={20} color={Colors.light.text} />
          <Text style={styles.settingButtonText}>Cambiar Contraseña</Text>
          <CustomIcon name="arrow" size={16} color={Colors.light.textSecondary} />
        </Pressable>

        <Pressable style={styles.settingButton} onPress={() => router.push('/(app)/profile/email-settings')}>
          <CustomIcon name="message" size={20} color={Colors.light.text} />
          <Text style={styles.settingButtonText}>Configuración de Email</Text>
          <CustomIcon name="arrow" size={16} color={Colors.light.textSecondary} />
        </Pressable>

        <Pressable style={styles.settingButton} onPress={() => router.push('/(app)/profile/notification-settings')}>
          <CustomIcon name="notifications" size={20} color={Colors.light.text} />
          <Text style={styles.settingButtonText}>Notificaciones</Text>
          <CustomIcon name="arrow" size={16} color={Colors.light.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <CustomIcon name="security" size={20} color={Colors.light.text} />
          <Text style={styles.sectionTitle}>Seguridad</Text>
        </View>
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <CustomIcon name="bank" size={20} color={Colors.light.gradientStart} />
            <View style={styles.settingDetails}>
              <Text style={styles.settingTitle}>Verificación KYC</Text>
              <Text style={styles.settingDescription}>Estado: Completado</Text>
            </View>
          </View>
          <CustomIcon name="check" size={20} color={Colors.light.success} />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <CustomIcon name="bank" size={20} color={Colors.light.gradientStart} />
            <View style={styles.settingDetails}>
              <Text style={styles.settingTitle}>Cuenta Bancaria</Text>
              <Text style={styles.settingDescription}>Estado: Verificada</Text>
            </View>
          </View>
          <CustomIcon name="check" size={20} color={Colors.light.success} />
        </View>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.dangerButton}>
          <CustomIcon name="close" size={20} color="#FFFFFF" />
          <Text style={styles.dangerButtonText}>Eliminar Cuenta</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    backgroundColor: Colors.light.backgroundElement,
    gap: Spacing.three,
  },
  backButton: {
    padding: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  section: {
    padding: Spacing.four,
    marginBottom: Spacing.two,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  settingDetails: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  toggle: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 16,
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleOff: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 16,
  },
  toggleTextOff: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.two,
    gap: Spacing.three,
  },
  settingButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.error,
    padding: Spacing.four,
    borderRadius: 12,
    gap: Spacing.two,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
