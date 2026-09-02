import React, { useCallback, useEffect, useState } from 'react';
import { Text, StyleSheet, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import userService from '@/services/userService';
import { AppScreen, AppHeader, AppSection, AppCard, AppPlaceholder } from '@/components/ui/AppScreen';
import CustomIcon from '@/components/CustomIcon';

export default function FollowingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unfollowingId, setUnfollowingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await userService.getFollowing(user.id);
    if (result.success) {
      const payload = result.data?.following || result.data?.data?.following || [];
      setFollowing(Array.isArray(payload) ? payload : []);
    } else {
      setFollowing([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnfollow = (person: any) => {
    const name = person.username || person.fullName || t('profile.userFallback', { id: person.id });
    Alert.alert(t('profile.unfollowConfirmTitle'), t('profile.unfollowConfirmBody', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.unfollow'),
        style: 'destructive',
        onPress: async () => {
          setUnfollowingId(person.id);
          const result = await userService.unfollowUser(person.id);
          setUnfollowingId(null);
          if (result.success) {
            setFollowing((prev) => prev.filter((p) => p.id !== person.id));
          } else {
            Alert.alert(t('common.error'), result.error || t('profile.unfollowError'));
          }
        },
      },
    ]);
  };

  return (
    <AppScreen>
      <AppHeader
        title={t('profile.followingTitle')}
        subtitle={t('profile.followingSubtitle', { count: following.length })}
        showBack
        backHref="/(app)/profile"
      />

      <AppSection title={t('profile.accountsYouFollowSection')} accentIndex={1}>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : following.length === 0 ? (
          <AppPlaceholder text={t('profile.noFollowingYet')} />
        ) : (
          following.map((person) => (
            <AppCard key={person.id}>
              <Pressable
                style={styles.row}
                onPress={() => router.push(`/(app)/profile/${person.id}` as any)}
              >
                <View style={styles.avatar}>
                  <CustomIcon name="user" size={28} color={Colors.light.textSecondary} />
                </View>
                <View style={styles.details}>
                  <Text style={styles.username}>
                    {person.username || person.fullName || t('profile.userFallback', { id: person.id })}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.actions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => router.push(`/(app)/profile/${person.id}` as any)}
                >
                  <CustomIcon name="user" size={16} color={Colors.light.text} />
                  <Text style={styles.actionButtonText}>{t('profile.viewProfile')}</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButtonSecondary}
                  onPress={() => handleUnfollow(person)}
                  disabled={unfollowingId === person.id}
                >
                  <CustomIcon name="close" size={16} color={Colors.light.error} />
                  <Text style={styles.actionButtonTextSecondary}>
                    {unfollowingId === person.id ? t('profile.removingEllipsis') : t('profile.unfollow')}
                  </Text>
                </Pressable>
              </View>
            </AppCard>
          ))
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1 },
  username: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  actions: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  actionButtonText: { color: Colors.light.text, fontSize: 14, fontWeight: '600' },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  actionButtonTextSecondary: { color: Colors.light.error, fontSize: 14, fontWeight: '600' },
});
