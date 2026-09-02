import React, { useCallback, useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  View,
  Switch,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';
import {
  isPushSupported,
  getPushPermissionStatus,
  registerForPushNotificationsAsync,
  unregisterPushToken,
} from '@/services/pushNotifications';

type Prefs = {
  quiz: boolean;
  quizReview: boolean;
  messages: boolean;
  followers: boolean;
};

const DEFAULT_PREFS: Prefs = {
  quiz: true,
  quizReview: true,
  messages: true,
  followers: true,
};

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushGranted, setPushGranted] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPermission = useCallback(async () => {
    const { granted } = await getPushPermissionStatus();
    let hasToken = false;
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      hasToken = Boolean(await AsyncStorage.getItem('quilaxPushToken'));
    } catch {
      /* ignore */
    }
    // Active in Quilax = OS permission + registered token (disabling only removes the token)
    setPushGranted(granted && (hasToken || Platform.OS === 'web'));
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await apiClient.get('/profile/notification-settings');
      if (data?.settings) {
        setPrefs({
          quiz: data.settings.quiz !== false,
          quizReview: data.settings.quizReview !== false,
          messages: data.settings.messages !== false,
          followers: data.settings.followers !== false,
        });
      }
    } catch {
      // defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    refreshPermission();
  }, [load, refreshPermission]);

  const toggle = async (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    try {
      await apiClient.put('/profile/notification-settings', next);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('settings.notificationsPage.savePrefsError'));
      await load();
    } finally {
      setSaving(false);
    }
  };

  const enablePush = async () => {
    setPushBusy(true);
    const result = await registerForPushNotificationsAsync();
    setPushBusy(false);
    await refreshPermission();
    if (result.success) {
      setPushStatus(
        result.reason === 'web-permission-only'
          ? t('settings.notificationsPage.webPermissionGranted')
          : t('settings.notificationsPage.pushEnabledBody')
      );
    } else if (result.reason === 'denied') {
      setPushStatus(t('settings.notificationsPage.permissionDeniedStatus'));
      Alert.alert(
        t('settings.notificationsPage.permissionDeniedTitle'),
        t('settings.notificationsPage.permissionDeniedBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.notificationsPage.openSettings'),
            onPress: () => Linking.openSettings().catch(() => {}),
          },
        ]
      );
    } else if (result.reason === 'unsupported') {
      setPushStatus(t('settings.notificationsPage.unsupported'));
    } else {
      setPushStatus(t('settings.notificationsPage.couldNotEnable'));
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    await unregisterPushToken();
    setPushBusy(false);
    setPushGranted(false);
    setPushStatus(t('settings.notificationsPage.pushDisabledBody'));
  };

  if (loading) {
    return (
      <AppScreen>
        <AppHeader title={t('settings.notificationsPage.title')} showBack backHref="/(app)/settings" />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.light.primary} />
        </View>
      </AppScreen>
    );
  }

  const pushLabel = !isPushSupported()
    ? t('settings.notificationsPage.pushUnavailable')
    : pushGranted
      ? t('settings.notificationsPage.disablePush')
      : t('settings.notificationsPage.enablePush');

  return (
    <AppScreen>
      <AppHeader
        title={t('settings.notificationsPage.title')}
        subtitle={t('settings.notificationsPage.subtitle')}
        showBack
        backHref="/(app)/settings"
      />

      <AppSection title={t('settings.notificationsPage.devicePermissionSection')} accentIndex={0}>
        <AppCard>
          <Text style={styles.lead}>{t('settings.notificationsPage.lead')}</Text>
          <Pressable
            style={[styles.pushBtn, pushGranted && styles.pushBtnOff]}
            onPress={pushGranted ? disablePush : enablePush}
            disabled={pushBusy || !isPushSupported()}
          >
            <Text style={styles.pushBtnText}>
              {pushBusy ? t('settings.notificationsPage.momentEllipsis') : pushLabel}
            </Text>
          </Pressable>
          {pushStatus ? <Text style={styles.pushStatus}>{pushStatus}</Text> : null}
          {saving ? <Text style={styles.hint}>{t('common.saving')}</Text> : null}
        </AppCard>
      </AppSection>

      <AppSection title={t('settings.notificationsPage.typesSection')} accentIndex={1}>
        <AppCard>
          <SettingRow
            title={t('settings.notificationsPage.quizTitle')}
            subtitle={t('settings.notificationsPage.quizSubtitle', {
              marks: t('settings.notificationsPage.countdownMarks'),
            })}
            recommend
            recommendText={t('settings.notificationsPage.recommendedNoDisable')}
            value={prefs.quiz}
            onValueChange={() => toggle('quiz')}
          />
          <SettingRow
            title={t('settings.notificationsPage.quizReviewTitle')}
            subtitle={t('settings.notificationsPage.quizReviewSubtitle')}
            recommend
            recommendText={t('settings.notificationsPage.recommended')}
            value={prefs.quizReview}
            onValueChange={() => toggle('quizReview')}
          />
          <SettingRow
            title={t('settings.notificationsPage.messagesTitle')}
            subtitle={t('settings.notificationsPage.messagesSubtitle')}
            value={prefs.messages}
            onValueChange={() => toggle('messages')}
          />
          <SettingRow
            title={t('settings.notificationsPage.followersTitle')}
            subtitle={t('settings.notificationsPage.followersSubtitle')}
            value={prefs.followers}
            onValueChange={() => toggle('followers')}
            last
          />
        </AppCard>
        <Text style={styles.infoText}>{t('settings.notificationsPage.footerInfo')}</Text>
      </AppSection>
    </AppScreen>
  );
}

function SettingRow({
  title,
  subtitle,
  value,
  onValueChange,
  last,
  recommend,
  recommendText,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: () => void;
  last?: boolean;
  recommend?: boolean;
  recommendText?: string;
}) {
  return (
    <View style={[styles.settingRow, last && styles.settingRowLast]}>
      <View style={styles.settingText}>
        <View style={styles.titleRow}>
          <Text style={styles.settingTitle}>{title}</Text>
          {recommend ? (
            <Text style={styles.recommend}>{recommendText}</Text>
          ) : null}
        </View>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.gradientStart }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: { padding: Spacing.six, alignItems: 'center' },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
  },
  pushBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pushBtnOff: {
    backgroundColor: Colors.light.textSecondary,
  },
  pushBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  pushStatus: {
    marginTop: Spacing.two,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.text,
    fontWeight: '600',
  },
  hint: {
    marginTop: Spacing.two,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  settingRowLast: { borderBottomWidth: 0 },
  settingText: { flex: 1, paddingRight: Spacing.three },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  settingTitle: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  recommend: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  infoText: {
    marginTop: Spacing.three,
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 19,
  },
});
