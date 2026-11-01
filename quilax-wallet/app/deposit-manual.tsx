import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton, SecondaryButton } from '@/components/WalletShell';
import { apiFetch, getToken } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';

async function copyToClipboard(value: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }
  // Native: dynamic import if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard');
    await Clipboard.setStringAsync(value);
  } catch {
    throw new Error('clipboard_unavailable');
  }
}
const MIN_CREDITS = 1;

type BankInfo = {
  iban: string;
  accountName: string;
  bankName?: string | null;
  bic?: string | null;
};

type DepositResult = {
  deposit: {
    id: number;
    referenceCode: string;
    creditsRequested: number;
    amountExpected: number;
    currency: string;
    expiresAt: string;
  };
  bank: BankInfo;
};

export default function DepositManualScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [result, setResult] = useState<DepositResult | null>(null);
  const [pending, setPending] = useState<any[]>([]);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [bank, mine] = await Promise.all([
        apiFetch('/manual-deposits/bank-info'),
        apiFetch('/manual-deposits/my').catch(() => ({ deposits: [] })),
      ]);
      setConfigured(!!bank?.configured);
      setPending(
        (mine?.deposits || []).filter((d: any) => d.status === 'PENDING'),
      );
    } catch (err: any) {
      setError(err?.message || t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const copy = async (label: string, value: string) => {
    try {
      await copyToClipboard(value);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setError(t('errors.copyFailed', { defaultValue: 'No se pudo copiar' }));
    }
  };

  const create = async () => {
    const credits = Math.floor(Number(amount) || 0);
    if (credits < MIN_CREDITS) {
      setError(t('depositManual.minCredits', { n: MIN_CREDITS }));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/manual-deposits/create', {
        method: 'POST',
        body: JSON.stringify({ credits }),
      });
      setResult(data as DepositResult);
      await load();
    } catch (err: any) {
      setError(err?.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <WalletShell title={t('depositManual.title')} showBack>
        <ActivityIndicator color={Colors.light.primary} />
      </WalletShell>
    );
  }

  return (
    <WalletShell
      title={t('depositManual.title')}
      subtitle={t('depositManual.subtitle')}
      showBack
    >
      {!configured ? (
        <Text style={styles.error}>{t('depositManual.notConfigured')}</Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('depositManual.transferNow')}</Text>
          <Text style={styles.hint}>{t('depositManual.transferHint')}</Text>

          <Row
            label={t('depositManual.iban')}
            value={result.bank.iban}
            onCopy={() => copy('iban', result.bank.iban)}
            copied={copied === 'iban'}
          />
          <Row
            label={t('depositManual.accountName')}
            value={result.bank.accountName}
            onCopy={() => copy('name', result.bank.accountName)}
            copied={copied === 'name'}
          />
          {result.bank.bic ? (
            <Row
              label="BIC"
              value={result.bank.bic}
              onCopy={() => copy('bic', result.bank.bic!)}
              copied={copied === 'bic'}
            />
          ) : null}
          <Row
            label={t('depositManual.amount')}
            value={`${result.deposit.amountExpected} ${result.deposit.currency}`}
            onCopy={() =>
              copy('amount', String(result.deposit.amountExpected))
            }
            copied={copied === 'amount'}
          />
          <Row
            label={t('depositManual.reference')}
            value={result.deposit.referenceCode}
            onCopy={() => copy('ref', result.deposit.referenceCode)}
            copied={copied === 'ref'}
            emphasize
          />
          <Text style={styles.expires}>
            {t('depositManual.expires', {
              date: new Date(result.deposit.expiresAt).toLocaleString(),
            })}
          </Text>
          <PrimaryButton
            label={t('depositManual.done')}
            onPress={() => router.replace('/')}
          />
          <SecondaryButton
            label={t('depositManual.another')}
            onPress={() => setResult(null)}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>{t('depositManual.creditsLabel')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="10"
            placeholderTextColor={Colors.light.textSecondary}
          />
          <Text style={styles.hint}>{t('depositManual.rateHint')}</Text>
          <PrimaryButton
            label={
              submitting
                ? t('common.loading')
                : t('depositManual.generateInstructions')
            }
            onPress={create}
            disabled={submitting || !configured}
          />
          <SecondaryButton
            label={t('depositManual.backHome')}
            onPress={() => router.back()}
          />
        </View>
      )}

      {pending.length > 0 ? (
        <View style={styles.pendingBox}>
          <Text style={styles.cardTitle}>{t('depositManual.pendingTitle')}</Text>
          {pending.map((d) => (
            <Text key={d.id} style={styles.pendingRow}>
              {d.referenceCode} · {d.creditsRequested} cr · {d.status}
            </Text>
          ))}
        </View>
      ) : null}
    </WalletShell>
  );
}

function Row({
  label,
  value,
  onCopy,
  copied,
  emphasize,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  emphasize?: boolean;
}) {
  return (
    <Pressable onPress={onCopy} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, emphasize && styles.ref]}>{value}</Text>
      </View>
      <Text style={styles.copy}>{copied ? '✓' : 'Copiar'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  cardTitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 18,
    color: Colors.light.text,
  },
  label: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 18,
    fontFamily: Fonts.sansBold,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundElement,
  },
  hint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  error: {
    color: Colors.light.error,
    marginBottom: Spacing.two,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  rowLabel: { fontSize: 12, color: Colors.light.textSecondary },
  rowValue: {
    fontSize: 15,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.light.text,
    marginTop: 2,
  },
  ref: { fontSize: 17, letterSpacing: 0.5 },
  copy: { color: Colors.light.primary, fontWeight: '700' },
  expires: { fontSize: 12, color: Colors.light.textSecondary },
  pendingBox: { marginTop: Spacing.four, gap: Spacing.two },
  pendingRow: { fontSize: 13, color: Colors.light.textSecondary },
});
