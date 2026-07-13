import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';

export default function BlockedUsersScreen() {
  const router = useRouter();

  const blockedUsers = [
    { id: 1, username: 'usuario1', blockedDate: '01/06/2026', reason: 'Spam' },
    { id: 2, username: 'usuario2', blockedDate: '28/05/2026', reason: 'Comportamiento inapropiado' },
  ];

  const handleUnblock = (username: string) => {
    Alert.alert(
      'Desbloquear Usuario',
      `¿Estás seguro de que quieres desbloquear a ${username}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          onPress: () => {
            Alert.alert('Usuario Desbloqueado', `${username} ha sido desbloqueado correctamente`);
          },
        },
      ],
    );
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
          <Text style={styles.title}>Usuarios Bloqueados</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {blockedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tienes usuarios bloqueados</Text>
          </View>
        ) : (
          <View style={styles.section}>
            {blockedUsers.map((user) => (
              <View key={user.id} style={styles.userItem}>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>@{user.username}</Text>
                  <Text style={styles.blockedDate}>Bloqueado el {user.blockedDate}</Text>
                  {user.reason && <Text style={styles.reason}>Motivo: {user.reason}</Text>}
                </View>
                <Pressable
                  style={styles.unblockButton}
                  onPress={() => handleUnblock(user.username)}
                >
                  <Text style={styles.unblockButtonText}>Desbloquear</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Información</Text>
          <Text style={styles.infoText}>
            Los usuarios bloqueados no podrán enviarte mensajes ni ver tu perfil. Puedes desbloquearlos en cualquier momento desde esta pantalla.
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
  emptyState: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.six,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.three,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  blockedDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  reason: {
    fontSize: 14,
    color: Colors.light.error,
  },
  unblockButton: {
    backgroundColor: Colors.light.gradientStart,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 8,
  },
  unblockButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
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
    lineHeight: 20,
  },
});
