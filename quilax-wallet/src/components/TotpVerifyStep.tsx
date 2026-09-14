import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { PrimaryButton, SecondaryButton } from '@/components/WalletShell';

type Props = {
  title?: string;
  hint?: string;
  submitting?: boolean;
  onConfirm: (code: string) => void;
  onCancel?: () => void;
  confirmLabel?: string;
};

/** Step: enter Google Authenticator 6-digit code before money ops. */
export function TotpVerifyStep({
  title,
  hint,
  submitting,
  onConfirm,
  onCancel,
  confirmLabel,
}: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');

  const submit = () => {
    const cleaned = code.replace(/\s/g, '');
    if (cleaned.length !== 6) return;
    onConfirm(cleaned);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title ?? t('totp.defaultTitle')}</Text>
      <Text style={styles.hint}>{hint ?? t('totp.defaultHint')}</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^\d]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={Colors.textSecondary}
        autoFocus
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
      />
      <PrimaryButton
        label={submitting ? t('common.verifying') : (confirmLabel ?? t('common.confirm'))}
        onPress={submit}
        disabled={code.length !== 6 || submitting}
      />
      {onCancel ? (
        <SecondaryButton label={t('common.cancel')} onPress={onCancel} disabled={submitting} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  title: {
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: Fonts.display,
    color: Colors.text,
  },
});
