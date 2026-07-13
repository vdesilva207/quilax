import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';

export default function FollowingScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CustomIcon name="back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Siguiendo</Text>
        <Text style={styles.count}>89</Text>
      </View>

      <View style={styles.list}>
        <View style={styles.followingCard}>
          <View style={styles.followingInfo}>
            <View style={styles.avatar}>
              <CustomIcon name="user" size={32} color={Colors.light.textSecondary} />
            </View>
            <View style={styles.followingDetails}>
              <Text style={styles.username}>@quizmaster99</Text>
              <Text style={styles.followingDate}>Siguiendo desde hace 3 meses</Text>
            </View>
          </View>
          <View style={styles.followingActions}>
            <Pressable style={styles.actionButton} onPress={() => router.push('/(app)/profile/user1')}>
              <CustomIcon name="user" size={16} color={Colors.light.text} />
              <Text style={styles.actionButtonText}>Ver Perfil</Text>
            </Pressable>
            <Pressable style={styles.actionButtonSecondary}>
              <CustomIcon name="close" size={16} color={Colors.light.error} />
              <Text style={styles.actionButtonTextSecondary}>Dejar de seguir</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.followingCard}>
          <View style={styles.followingInfo}>
            <View style={styles.avatar}>
              <CustomIcon name="user" size={32} color={Colors.light.textSecondary} />
            </View>
            <View style={styles.followingDetails}>
              <Text style={styles.username}>@gamer_pro</Text>
              <Text style={styles.followingDate}>Siguiendo desde hace 2 meses</Text>
            </View>
          </View>
          <View style={styles.followingActions}>
            <Pressable style={styles.actionButton} onPress={() => router.push('/(app)/profile/user2')}>
              <CustomIcon name="user" size={16} color={Colors.light.text} />
              <Text style={styles.actionButtonText}>Ver Perfil</Text>
            </Pressable>
            <Pressable style={styles.actionButtonSecondary}>
              <CustomIcon name="close" size={16} color={Colors.light.error} />
              <Text style={styles.actionButtonTextSecondary}>Dejar de seguir</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.followingCard}>
          <View style={styles.followingInfo}>
            <View style={styles.avatar}>
              <CustomIcon name="user" size={32} color={Colors.light.textSecondary} />
            </View>
            <View style={styles.followingDetails}>
              <Text style={styles.username}>@culture_fan</Text>
              <Text style={styles.followingDate}>Siguiendo desde hace 1 mes</Text>
            </View>
          </View>
          <View style={styles.followingActions}>
            <Pressable style={styles.actionButton} onPress={() => router.push('/(app)/profile/user3')}>
              <CustomIcon name="user" size={16} color={Colors.light.text} />
              <Text style={styles.actionButtonText}>Ver Perfil</Text>
            </Pressable>
            <Pressable style={styles.actionButtonSecondary}>
              <CustomIcon name="close" size={16} color={Colors.light.error} />
              <Text style={styles.actionButtonTextSecondary}>Dejar de seguir</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.followingCard}>
          <View style={styles.followingInfo}>
            <View style={styles.avatar}>
              <CustomIcon name="user" size={32} color={Colors.light.textSecondary} />
            </View>
            <View style={styles.followingDetails}>
              <Text style={styles.username}>@history_buff</Text>
              <Text style={styles.followingDate}>Siguiendo desde hace 2 semanas</Text>
            </View>
          </View>
          <View style={styles.followingActions}>
            <Pressable style={styles.actionButton} onPress={() => router.push('/(app)/profile/user4')}>
              <CustomIcon name="user" size={16} color={Colors.light.text} />
              <Text style={styles.actionButtonText}>Ver Perfil</Text>
            </Pressable>
            <Pressable style={styles.actionButtonSecondary}>
              <CustomIcon name="close" size={16} color={Colors.light.error} />
              <Text style={styles.actionButtonTextSecondary}>Dejar de seguir</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.followingCard}>
          <View style={styles.followingInfo}>
            <View style={styles.avatar}>
              <CustomIcon name="user" size={32} color={Colors.light.textSecondary} />
            </View>
            <View style={styles.followingDetails}>
              <Text style={styles.username}>@science_geek</Text>
              <Text style={styles.followingDate}>Siguiendo desde hace 1 semana</Text>
            </View>
          </View>
          <View style={styles.followingActions}>
            <Pressable style={styles.actionButton} onPress={() => router.push('/(app)/profile/user5')}>
              <CustomIcon name="user" size={16} color={Colors.light.text} />
              <Text style={styles.actionButtonText}>Ver Perfil</Text>
            </Pressable>
            <Pressable style={styles.actionButtonSecondary}>
              <CustomIcon name="close" size={16} color={Colors.light.error} />
              <Text style={styles.actionButtonTextSecondary}>Dejar de seguir</Text>
            </Pressable>
          </View>
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
    flex: 1,
  },
  count: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  followingCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    gap: Spacing.three,
  },
  followingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  followingDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  followingActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  actionButtonText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  actionButtonTextSecondary: {
    color: Colors.light.error,
    fontSize: 14,
    fontWeight: '600',
  },
});
