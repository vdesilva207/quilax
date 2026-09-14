import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import userService from '@/services/userService';
import { AppScreen, AppHeader, AppSection, AppCard, AppPlaceholder } from '@/components/ui/AppScreen';

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await userService.getBlockedUsers();
      if (result.success) {
        const list = result.data?.blockedUsers || [];
        setBlockedUsers(Array.isArray(list) ? list : []);
      } else {
        setBlockedUsers([]);
        setLoadError(result.error || t('common.requestError'));
      }
    } catch (e: any) {
      setBlockedUsers([]);
      setLoadError(e?.message || t('common.requestError'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = (person: any) => {
    const name = person.username || person.fullName || t('settings.blocked.userFallback', { id: person.id });
    Alert.alert(
      t('settings.blocked.unblockTitle'),
      t('settings.blocked.unblockConfirm', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.blocked.unblockButton'),
          onPress: async () => {
            setUnblockingId(person.id);
            const result = await userService.unblockUser(person.id);
            setUnblockingId(null);
            if (result.success) {
              setBlockedUsers((prev) => prev.filter((p) => p.id !== person.id));
            } else {
              Alert.alert(t('common.error'), result.error || t('settings.blocked.unblockError'));
            }
          },
        },
      ]
    );
  };

  return (
    <AppScreen>
      <AppHeader title={t('settings.blocked.title')} showBack backHref="/(app)/settings" />

      <AppSection title={t('settings.blocked.sectionTitle')} accentIndex={3}>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : loadError ? (
          <AppPlaceholder text={loadError} />
        ) : blockedUsers.length === 0 ? (
          <AppPlaceholder text={t('settings.blocked.noneBlocked')} />
        ) : (
          blockedUsers.map((person) => (
            <AppCard key={person.id}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.username}>
                    {person.username || person.fullName || t('settings.blocked.userFallback', { id: person.id })}
                  </Text>
                </View>
                <Pressable
                  style={styles.unblockButton}
                  onPress={() => handleUnblock(person)}
                  disabled={unblockingId === person.id}
                >
                  <Text style={styles.unblockButtonText}>
                    {unblockingId === person.id ? '...' : t('settings.blocked.unblockButton')}
                  </Text>
                </Pressable>
              </View>
            </AppCard>
          ))
        )}

        <Text style={styles.infoText}>{t('settings.blocked.infoText')}</Text>
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  unblockButton: {
    backgroundColor: Colors.light.gradientStart,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  unblockButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  infoText: {
    marginTop: Spacing.three,
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 19,
  },
});
