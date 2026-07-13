import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import CustomIcon from '@/components/CustomIcon';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [quizNotifications, setQuizNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [followerNotifications, setFollowerNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

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
          <Text style={styles.title}>Notificaciones</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quizzes</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Notificaciones de Quizzes</Text>
              <Text style={styles.settingSubtitle}>Recibir alertas sobre nuevos quizzes y actualizaciones</Text>
            </View>
            <Switch
              value={quizNotifications}
              onValueChange={setQuizNotifications}
              trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.gradientStart }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensajes</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Notificaciones de Mensajes</Text>
              <Text style={styles.settingSubtitle}>Recibir alertas cuando te envíen mensajes</Text>
            </View>
            <Switch
              value={messageNotifications}
              onValueChange={setMessageNotifications}
              trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.gradientStart }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguidores</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Notificaciones de Seguidores</Text>
              <Text style={styles.settingSubtitle}>Recibir alertas cuando alguien te siga</Text>
            </View>
            <Switch
              value={followerNotifications}
              onValueChange={setFollowerNotifications}
              trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.gradientStart }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Notificaciones por Email</Text>
              <Text style={styles.settingSubtitle}>Recibir resúmenes y alertas importantes por email</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.gradientStart }}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Puedes configurar notificaciones específicas para cada tipo de alerta en la sección de preferencias de tu cuenta.
          </Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  infoSection: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    marginTop: Spacing.four,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
