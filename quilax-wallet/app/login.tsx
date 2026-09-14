import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton } from '@/components/WalletShell';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { ApiError, loginWithPassword } from '@/lib/api';
import { markRecoverySession } from '@/components/SessionBootstrap';

const STEP_KEYS = ['step1', 'step2', 'step3'] as const;

/**
 * Entrada normal: solo SSO desde la app Quilax.
 * Excepción: cuenta suspendida por contenido inapropiado → login para recuperar saldo.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [showRecovery, setShowRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submitRecovery = async () => {
    setError('');
    setInfo('');
    if (!email.trim() || !password) {
      setError(t('errors.emailPasswordRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const data = await loginWithPassword(
        email,
        password,
        needs2fa ? totpCode : undefined
      );
      if (!data.banRecoveryOnly) {
        setError(t('login.wrongEntry'));
        return;
      }
      markRecoverySession();
      router.replace('/recover-balance');
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (apiErr?.code === 'TOTP_REQUIRED' || apiErr?.data?.requires2FA) {
        setNeeds2fa(true);
        setInfo(t('login.totpRequired'));
        return;
      }
      if (apiErr?.code === 'ACCOUNT_BANNED' || apiErr?.status === 403) {
        const cat = String(apiErr?.data?.banCategory || '');
        if (cat === 'SUSPICIOUS') {
          setError(
            (apiErr?.data?.banMessage as string) || t('login.banSuspicious')
          );
          return;
        }
        if (cat && cat !== 'CONTENT') {
          setError(
            (apiErr?.data?.banMessage as string) || t('login.banGeneric')
          );
          return;
        }
      }
      setError(err?.message || t('errors.loginFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (showRecovery) {
    return (
      <WalletShell
        brand
        title={t('login.recoveryTitle')}
        subtitle={t('login.recoverySubtitle')}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>{t('login.accountSuspended')}</Text>
          <Text style={styles.heroTitle}>{t('login.withdrawRemaining')}</Text>
          <Text style={styles.heroBody}>{t('login.recoveryHeroBody')}</Text>
        </View>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t('common.email')}
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('common.password')}
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry
          autoComplete="password"
        />
        {needs2fa ? (
          <TextInput
            style={styles.input}
            value={totpCode}
            onChangeText={(v) => setTotpCode(v.replace(/[^\d]/g, '').slice(0, 6))}
            placeholder={t('common.totpCode')}
            placeholderTextColor={Colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
          />
        ) : null}

        {info ? <Text style={styles.info}>{info}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={submitting ? t('common.entering') : t('login.enterRecovery')}
          onPress={submitRecovery}
          disabled={submitting}
        />
        {submitting ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} /> : null}

        <Pressable onPress={() => setShowRecovery(false)} style={styles.legalLink}>
          <Text style={styles.legalText}>{t('common.goBack')}</Text>
        </Pressable>
      </WalletShell>
    );
  }

  return (
    <WalletShell
      brand
      title={t('login.title')}
      subtitle={t('login.subtitle')}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>{t('login.secureAccess')}</Text>
        <Text style={styles.heroTitle}>{t('login.noDirectEntry')}</Text>
        <Text style={styles.heroBody}>{t('login.noDirectEntryBody')}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('login.howToEnter')}</Text>
      {STEP_KEYS.map((key, i) => (
        <View key={key} style={styles.stepRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNum}>{String(i + 1)}</Text>
          </View>
          <View style={styles.stepCopy}>
            <Text style={styles.stepTitle}>{t(`login.${key}Title`)}</Text>
            <Text style={styles.stepBody}>{t(`login.${key}Body`)}</Text>
          </View>
        </View>
      ))}

      <View style={styles.note}>
        <Text style={styles.noteText}>{t('login.bookmarkNote')}</Text>
      </View>

      <Pressable onPress={() => setShowRecovery(true)} style={styles.recoveryLink}>
        <Text style={styles.recoveryTitle}>{t('login.suspendedAccount')}</Text>
        <Text style={styles.recoveryBody}>{t('login.recoverBalance')}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/legal')} style={styles.legalLink}>
        <Text style={styles.legalText}>{t('login.termsPrivacy')}</Text>
      </Pressable>
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.08)',
    gap: Spacing.sm,
    shadowColor: '#1C1917',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  heroKicker: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  heroBody: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.04)',
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  stepCopy: { flex: 1, gap: 2 },
  stepTitle: {
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  stepBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  note: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
  noteText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  recoveryLink: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 14,
    backgroundColor: Colors.surfaceMuted,
    gap: 4,
  },
  recoveryTitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  recoveryBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  legalLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  legalText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.12)',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.text,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.error,
    lineHeight: 20,
  },
  info: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 20,
  },
});
