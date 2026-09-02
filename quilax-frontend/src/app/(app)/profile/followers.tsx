import React, { useCallback, useEffect, useState } from 'react';
import { Text, StyleSheet, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import userService from '@/services/userService';
import { AppScreen, AppHeader, AppSection, AppCard, AppPlaceholder } from '@/components/ui/AppScreen';
import CustomIcon from '@/components/CustomIcon';

export default function FollowersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await userService.getFollowers(user.id);
    if (result.success) {
      const payload = result.data?.followers || result.data?.data?.followers || [];
      setFollowers(Array.isArray(payload) ? payload : []);
    } else {
      setFollowers([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBlock = (person: any) => {
    const name = person.username || person.fullName || t('profile.userFallback', { id: person.id });
    Alert.alert(t('profile.blockUserTitle'), t('profile.blockUserConfirm', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.block'),
        style: 'destructive',
        onPress: async () => {
          const result = await userService.blockUser(person.id);
          if (result.success) {
            setFollowers((prev) => prev.filter((p) => p.id !== person.id));
          } else {
            Alert.alert(t('common.error'), result.error || t('profile.blockError'));
          }
        },
      },
    ]);
  };

  return (
    <AppScreen>
      <AppHeader
        title={t('profile.followersTitle')}
        subtitle={t('profile.followersSubtitle', { count: followers.length })}
        showBack
        backHref="/(app)/profile"
      />

      <AppSection title={t('profile.yourFollowersSection')} accentIndex={0}>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : followers.length === 0 ? (
          <AppPlaceholder text={t('profile.noFollowersYet')} />
        ) : (
          followers.map((person) => (
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
              <Pressable style={styles.blockButton} onPress={() => handleBlock(person)}>
                <CustomIcon name="lock" size={16} color={Colors.light.error} />
                <Text style={styles.blockButtonText}>{t('profile.block')}</Text>
              </Pressable>
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
  blockButton: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  blockButtonText: { color: Colors.light.error, fontSize: 14, fontWeight: '600' },
});
