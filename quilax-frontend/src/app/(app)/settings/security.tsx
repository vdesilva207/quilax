import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  View,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';
import settingsService from '@/services/settingsService';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton, FieldLabel } from '@/components/ui/ScreenChrome';
import PasswordInput from '@/components/ui/PasswordInput';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [setupBusy, setSetupBusy] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');

  const [securityError, setSecurityError] = useState('');

  useEffect(() => {
    (async () => {
      setSecurityError('');
      try {
        const data = await apiClient.get('/profile/security');
        setTwoFactorEnabled(!!data?.security?.twoFactorEnabled);
      } catch (e: any) {
        setSecurityError(e?.message || t('common.requestError'));
      } finally {
        setLoadingSecurity(false);
      }
    })();
  }, [t]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('settings.securityPage.missingFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('settings.securityPage.mismatch'));
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('settings.securityPage.tooShort'));
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      Alert.alert(t('common.error'), t('settings.securityPage.needsUppercase'));
      return;
    }

    setSaving(true);
    const result = await settingsService.changePassword(currentPassword, newPassword);
    setSaving(false);

    if (result.success) {
      Alert.alert(t('common.success'), t('settings.securityPage.successBody'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.navigate('/(app)/settings' as any);
    } else {
      Alert.alert(t('common.error'), result.error || t('settings.securityPage.genericError'));
    }
  };

  const start2fa = async () => {
    setSetupBusy(true);
    try {
      const data = await apiClient.post('/profile/security/2fa/setup', {});
      setOtpauthUrl(data.otpauthUrl || null);
      setSecret(data.secret || null);
      setTotpCode('');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('settings.securityPage.twoFactorSetupError'));
    } finally {
      setSetupBusy(false);
    }
  };

  const confirm2fa = async () => {
    if (!totpCode.trim()) {
      Alert.alert(t('common.error'), t('settings.securityPage.twoFactorNeedCode'));
      return;
    }
    setSetupBusy(true);
    try {
      await apiClient.post('/profile/security/2fa/confirm', { token: totpCode.trim() });
      setTwoFactorEnabled(true);
      setOtpauthUrl(null);
      setSecret(null);
      setTotpCode('');
      Alert.alert(t('common.success'), t('settings.securityPage.twoFactorEnabledBody'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('settings.securityPage.twoFactorConfirmError'));
    } finally {
      setSetupBusy(false);
    }
  };

  const disable2fa = async () => {
    if (!disableCode.trim()) {
      Alert.alert(t('common.error'), t('settings.securityPage.twoFactorNeedCode'));
      return;
    }
    if (!disablePassword) {
      Alert.alert(t('common.error'), t('settings.securityPage.twoFactorNeedPassword'));
      return;
    }
    setSetupBusy(true);
    try {
      await apiClient.post('/profile/security/2fa/disable', {
        token: disableCode.trim(),
        password: disablePassword,
      });
      setTwoFactorEnabled(false);
      setDisableCode('');
      setDisablePassword('');
      Alert.alert(t('common.success'), t('settings.securityPage.twoFactorDisabledBody'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('settings.securityPage.twoFactorDisableError'));
    } finally {
      setSetupBusy(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('settings.securityPage.title')} showBack backHref="/(app)/settings" />

      <AppSection title={t('settings.securityPage.changePasswordSection')} accentIndex={0}>
        <FieldLabel>{t('settings.securityPage.currentPasswordLabel')}</FieldLabel>
        <PasswordInput
          containerStyle={styles.fieldGap}
          placeholder={t('settings.securityPage.currentPasswordPlaceholder')}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <FieldLabel>{t('settings.securityPage.newPasswordLabel')}</FieldLabel>
        <PasswordInput
          containerStyle={styles.fieldGap}
          placeholder={t('settings.securityPage.newPasswordPlaceholder')}
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <FieldLabel>{t('settings.securityPage.confirmPasswordLabel')}</FieldLabel>
        <PasswordInput
          containerStyle={styles.fieldGap}
          placeholder={t('settings.securityPage.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {saving ? (
          <ActivityIndicator color={Colors.light.primary} style={styles.spinner} />
        ) : (
          <GradientButton label={t('settings.securityPage.submitButton')} onPress={handleChangePassword} />
        )}

        <AppCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('settings.securityPage.requirementsTitle')}</Text>
          <Text style={styles.infoText}>{t('settings.securityPage.requirementMinLength')}</Text>
          <Text style={styles.infoText}>{t('settings.securityPage.requirementUppercase')}</Text>
        </AppCard>
      </AppSection>

      <AppSection title={t('settings.securityPage.twoFactorSection')} accentIndex={1}>
        {loadingSecurity ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : securityError ? (
          <AppCard>
            <Text style={styles.twoFactorHelp}>{securityError}</Text>
          </AppCard>
        ) : (
          <AppCard>
            <Text style={styles.twoFactorStatus}>
              {twoFactorEnabled
                ? t('settings.securityPage.twoFactorOn')
                : t('settings.securityPage.twoFactorOff')}
            </Text>
            <Text style={styles.twoFactorHelp}>{t('settings.securityPage.twoFactorHelp')}</Text>

            {!twoFactorEnabled && !otpauthUrl ? (
              setupBusy ? (
                <ActivityIndicator color={Colors.light.primary} />
              ) : (
                <GradientButton label={t('settings.securityPage.twoFactorStart')} onPress={start2fa} />
              )
            ) : null}

            {otpauthUrl ? (
              <View style={styles.qrBlock}>
                <QRCode value={otpauthUrl} size={180} />
                {secret ? (
                  <Text style={styles.secretText} selectable>
                    {t('settings.securityPage.twoFactorSecret', { secret })}
                  </Text>
                ) : null}
                <FieldLabel>{t('settings.securityPage.twoFactorCodeLabel')}</FieldLabel>
                <TextInput
                  style={styles.codeInput}
                  value={totpCode}
                  onChangeText={setTotpCode}
                  keyboardType="number-pad"
                  maxLength={8}
                  placeholder="123456"
                  placeholderTextColor={Colors.light.textSecondary}
                />
                <GradientButton
                  label={
                    setupBusy
                      ? t('common.saving')
                      : t('settings.securityPage.twoFactorConfirm')
                  }
                  onPress={confirm2fa}
                />
                <Pressable onPress={() => { setOtpauthUrl(null); setSecret(null); }}>
                  <Text style={styles.cancelLink}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            ) : null}

            {twoFactorEnabled ? (
              <View style={styles.disableBlock}>
                <FieldLabel>{t('settings.securityPage.twoFactorCodeLabel')}</FieldLabel>
                <TextInput
                  style={styles.codeInput}
                  value={disableCode}
                  onChangeText={setDisableCode}
                  keyboardType="number-pad"
                  maxLength={8}
                  placeholder="123456"
                  placeholderTextColor={Colors.light.textSecondary}
                />
                <FieldLabel>{t('settings.securityPage.currentPasswordLabel')}</FieldLabel>
                <PasswordInput
                  containerStyle={styles.fieldGap}
                  placeholder={t('settings.securityPage.currentPasswordPlaceholder')}
                  value={disablePassword}
                  onChangeText={setDisablePassword}
                />
                <Pressable
                  style={[styles.disableBtn, setupBusy && styles.deleteBtnDisabled]}
                  onPress={disable2fa}
                  disabled={setupBusy}
                >
                  <Text style={styles.disableBtnText}>
                    {t('settings.securityPage.twoFactorDisable')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </AppCard>
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  fieldGap: { marginBottom: Spacing.three },
  spinner: { marginTop: Spacing.two },
  infoCard: { marginTop: Spacing.four },
  infoTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: Spacing.two },
  infoText: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: Spacing.one },
  twoFactorStatus: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 6 },
  twoFactorHelp: { fontSize: 13, lineHeight: 19, color: Colors.light.textSecondary, marginBottom: Spacing.three },
  qrBlock: { alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  secretText: { fontSize: 12, color: Colors.light.textSecondary, textAlign: 'center' },
  codeInput: {
    width: '100%',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    color: Colors.light.text,
  },
  cancelLink: { color: Colors.light.primary, fontWeight: '600', marginTop: 4 },
  disableBlock: { marginTop: Spacing.three, gap: Spacing.two },
  disableBtn: {
    backgroundColor: Colors.light.backgroundSelected,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  disableBtnText: { color: Colors.light.text, fontWeight: '700' },
  deleteBtnDisabled: { opacity: 0.6 },
});
