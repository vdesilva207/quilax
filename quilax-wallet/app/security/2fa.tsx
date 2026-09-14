import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton, SecondaryButton } from '@/components/WalletShell';
import { TotpVerifyStep } from '@/components/TotpVerifyStep';
import { apiFetch, getToken } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';

/**
 * Setup / re-scan Google Authenticator for money operations.
 */
export default function TwoFactorSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [alreadyOn, setAlreadyOn] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [step, setStep] = useState<'qr' | 'confirm'>('qr');
  const setupStarted = useRef(false);

  const applySetupPayload = (data: any) => {
    setSecret(data.secret);
    setOtpauthUrl(data.otpauthUrl || data.qrCode || null);
    setAlreadyOn(false);
    setStep('qr');
  };

  const startSetup = async () => {
    const data = await apiFetch('/profile/security/2fa/setup', { method: 'POST' });
    applySetupPayload(data);
  };

  useEffect(() => {
    if (setupStarted.current) return;
    setupStarted.current = true;
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      try {
        const status = await apiFetch('/profile/security');
        if (status?.security?.twoFactorEnabled) {
          setAlreadyOn(true);
          setLoading(false);
          return;
        }
        await startSetup();
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('ya está activa') || msg.includes('ya está habilitado') || msg.includes('already')) {
          setAlreadyOn(true);
        } else {
          Alert.alert(t('security.title'), err?.message || t('errors.twoFactorSetupFailed'));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, t]);

  const confirm = async (code: string) => {
    setConfirming(true);
    try {
      await apiFetch('/profile/security/2fa/confirm', {
        method: 'POST',
        body: JSON.stringify({ token: code }),
      });
      Alert.alert(t('security.successTitle'), t('security.successBody'), [
        { text: t('common.ready', { defaultValue: 'Listo' }), onPress: () => router.replace('/') },
      ]);
    } catch (err: any) {
      Alert.alert(t('errors.invalidCode'), err?.message || t('errors.tryAgain'));
    } finally {
      setConfirming(false);
    }
  };

  const regenerateQr = async () => {
    setRegenBusy(true);
    try {
      await startSetup();
    } catch (err: any) {
      Alert.alert(t('security.title'), err?.message || t('errors.twoFactorSetupFailed'));
    } finally {
      setRegenBusy(false);
    }
  };

  const resetWithCurrentCode = async () => {
    const code = resetCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      Alert.alert(t('errors.invalidCode'), t('security.resetNeedCode'));
      return;
    }
    setResetting(true);
    try {
      const data = await apiFetch('/profile/security/2fa/reset', {
        method: 'POST',
        body: JSON.stringify({ token: code }),
      });
      setResetCode('');
      applySetupPayload(data);
      Alert.alert(t('security.rescanTitle'), t('security.rescanBody'));
    } catch (err: any) {
      Alert.alert(t('errors.invalidCode'), err?.message || t('errors.tryAgain'));
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <WalletShell showBack title={t('security.title')} subtitle={t('common.configuring')}>
        <ActivityIndicator color={Colors.primary} />
      </WalletShell>
    );
  }

  if (alreadyOn) {
    return (
      <WalletShell
        showBack
        title={t('security.twoFactorActive')}
        subtitle={t('security.twoFactorActiveSubtitle')}
        footer={
          <>
            <PrimaryButton
              label={resetting ? t('common.loading') : t('security.rescanCta')}
              onPress={resetWithCurrentCode}
              disabled={resetting}
            />
            <SecondaryButton label={t('common.goBack')} onPress={() => router.back()} />
          </>
        }
      >
        <Text style={styles.copy}>{t('security.twoFactorActiveBody')}</Text>
        <Text style={styles.copy}>{t('security.rescanHint')}</Text>
        <TextInput
          style={styles.input}
          value={resetCode}
          onChangeText={(v) => setResetCode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder={t('common.totpCode')}
          placeholderTextColor={Colors.textSecondary}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Text style={styles.lostHint}>{t('security.lostDeviceHint')}</Text>
      </WalletShell>
    );
  }

  const qrUri = otpauthUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUrl)}`
    : null;

  return (
    <WalletShell
      showBack
      title={t('security.googleAuth')}
      subtitle={t('security.googleAuthSubtitle')}
    >
      {step === 'qr' ? (
        <View style={styles.block}>
          <Text style={styles.copy}>{t('security.setupSteps')}</Text>
          {qrUri ? (
            <Image source={{ uri: qrUri }} style={styles.qr} accessibilityLabel={t('security.qrLabel')} />
          ) : null}
          {secret ? (
            <View style={styles.secretBox}>
              <Text style={styles.secretLabel}>{t('security.manualKey')}</Text>
              <Text style={styles.secret} selectable>
                {secret}
              </Text>
            </View>
          ) : null}
          <PrimaryButton label={t('security.scannedContinue')} onPress={() => setStep('confirm')} />
          <SecondaryButton
            label={regenBusy ? t('common.loading') : t('security.regenerateQr')}
            onPress={regenerateQr}
            disabled={regenBusy}
          />
          <SecondaryButton label={t('common.cancel')} onPress={() => router.back()} />
        </View>
      ) : (
        <TotpVerifyStep
          title={t('security.confirmCode')}
          hint={t('security.confirmCodeHint')}
          submitting={confirming}
          onConfirm={confirm}
          onCancel={() => setStep('qr')}
          confirmLabel={t('security.activate2fa')}
        />
      )}
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.md },
  copy: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  lostHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.12)',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontFamily: Fonts.body,
    fontSize: 18,
    letterSpacing: 4,
    color: Colors.text,
    textAlign: 'center',
  },
  qr: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  secretBox: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 10,
    gap: 6,
  },
  secretLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: Colors.textSecondary,
  },
  secret: {
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 1,
  },
});
