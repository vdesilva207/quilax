import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton } from '@/components/WalletShell';
import { apiFetch, getToken, clearToken, logoutSession } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import {
  creditsToFiat,
  formatDateTime,
  getBankStatusLabelDetailed,
  getTxLabel,
} from '@/constants/money';

type WalletStatus = {
  balance: number;
  currency: string;
  eligibility?: {
    canDeposit?: boolean;
    canWithdraw?: boolean;
    reasons?: string[];
  };
  verification?: {
    isOver18?: boolean;
    isBankVerified?: boolean;
    bankVerificationStatus?: string;
    hasBankAccount?: boolean;
    hasConnectAccount?: boolean;
    idVerified?: boolean;
  };
  bankAccount?: {
    ibanMasked?: string;
    accountName?: string;
    verificationStatus?: string;
  } | null;
};

type TxItem = {
  id: number | string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
};

export default function WalletHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockHint, setLockHint] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      let token = await getToken();
      if (!token && Platform.OS === 'web') {
        // SSO puede estar aplicándose en el primer tick
        await new Promise((r) => setTimeout(r, 250));
        token = await getToken();
      }
      if (!token) {
        router.replace('/login');
        return;
      }

      const [statusData, historyData, security] = await Promise.all([
        apiFetch('/wallet-access/status'),
        apiFetch('/transactions/my-history?limit=50&period=all-time').catch(() => ({
          transactions: [],
        })),
        apiFetch('/profile/security').catch(() => null),
      ]);

      if (statusData.banRecoveryOnly) {
        router.replace('/recover-balance');
        return;
      }

      setStatus({
        balance: statusData.balance ?? 0,
        currency: statusData.currency || 'EUR',
        eligibility: statusData.eligibility,
        verification: statusData.verification,
        bankAccount: statusData.bankAccount,
      });
      setTxs(historyData.transactions || []);
      setTwoFactorEnabled(!!security?.security?.twoFactorEnabled);
    } catch (err: any) {
      setError(err?.message || t('errors.loadFailed'));
      if (
        String(err?.message || '').toLowerCase().includes('token') ||
        String(err?.message || '').toLowerCase().includes('autoriz') ||
        String(err?.message || '').toLowerCase().includes('sesión')
      ) {
        await clearToken();
        router.replace('/login');
        return;
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  useEffect(() => {
    if (!lockHint) return;
    const timer = setTimeout(() => setLockHint(null), 3500);
    return () => clearTimeout(timer);
  }, [lockHint]);

  const handleLogout = async () => {
    await logoutSession();
    router.replace('/login');
  };

  if (loading) {
    return (
      <WalletShell title={t('home.title')} subtitle={t('common.loadingBalance')}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </WalletShell>
    );
  }

  const balance = status?.balance ?? 0;
  const currency = status?.currency || 'EUR';
  const bankStatus =
    status?.verification?.bankVerificationStatus ||
    status?.bankAccount?.verificationStatus ||
    'NONE';
  const bankVerified =
    bankStatus === 'VERIFIED' || !!status?.verification?.isBankVerified;
  const idVerified = !!status?.verification?.idVerified;
  const hasConnect =
    !!status?.verification?.hasConnectAccount ||
    bankStatus === 'PENDING' ||
    bankStatus === 'VERIFIED' ||
    bankStatus === 'RESTRICTED';
  const canDeposit = status?.eligibility?.canDeposit !== false;
  const canWithdraw = status?.eligibility?.canWithdraw === true && bankVerified;

  const showBankLockHint = (action: 'deposit' | 'withdraw') => {
    if (action === 'withdraw') {
      setLockHint(t('home.lockWithdraw'));
      return;
    }
    setLockHint(
      t('home.lockRequirements', {
        action: t('home.actionAddCredits'),
      })
    );
  };

  const goDeposit = () => {
    setLockHint(null);
    if (!twoFactorEnabled) {
      setLockHint(t('home.lockDeposit2fa'));
      router.push('/security/2fa');
      return;
    }
    if (!canDeposit) {
      showBankLockHint('deposit');
      return;
    }
    router.push('/deposit');
  };

  const goWithdraw = () => {
    setLockHint(null);
    if (!bankVerified) {
      showBankLockHint('withdraw');
      router.push('/bank?start=1');
      return;
    }
    if (!twoFactorEnabled) {
      setLockHint(t('home.lockWithdraw2fa'));
      return;
    }
    if (!canWithdraw) {
      setLockHint(t('home.lockWithdrawBlocked'));
    }
    router.push('/withdraw');
  };

  const bankStatusCopy = getBankStatusLabelDetailed(bankStatus, t);

  return (
    <WalletShell
      title={t('home.title')}
      subtitle={
        bankVerified ? t('home.subtitleReady') : t('home.subtitlePending')
      }
    >
      <View style={styles.balanceBlock}>
        <Text style={styles.balanceLabel}>{t('home.availableCredits')}</Text>
        <Text style={styles.balance}>{balance}</Text>
        <Text style={styles.fiat}>{creditsToFiat(balance, currency)}</Text>
      </View>

      {idVerified ? (
        <View style={styles.kycOk}>
          <Text style={styles.kycOkText}>{t('home.identityVerified')}</Text>
        </View>
      ) : (
        <View style={styles.kycWarn}>
          <Text style={styles.kycWarnTitle}>{t('home.identityPending')}</Text>
          <Text style={styles.kycWarnCopy}>{t('home.identityPendingBody')}</Text>
        </View>
      )}
      {bankVerified ? (
        <View style={styles.bankLinked}>
          <View style={styles.verifiedRow}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedTitle}>{t('home.readyForWithdrawals')}</Text>
              <Text style={styles.verifiedMeta}>
                {status?.bankAccount?.ibanMasked || t('common.ibanInStripe')}
                {status?.bankAccount?.accountName
                  ? ` · ${status.bankAccount.accountName}`
                  : ''}
              </Text>
              <Text style={styles.readyHint}>{bankStatusCopy}</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/bank')}>
            <Text style={styles.readyHint}>{t('home.manageStatus')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.bankMissing}>
          <Text style={styles.bankMissingTitle}>
            {hasConnect ? t('home.bankPendingTitle') : t('home.bankMissingTitle')}
          </Text>
          <Text style={styles.bankMissingCopy}>
            {hasConnect ? t('home.bankPendingBody') : t('home.bankMissingBody')}
          </Text>
          <Text style={styles.bankMissingCopy}>
            {t('common.statusLabel', { status: bankStatusCopy })}
          </Text>
          <PrimaryButton
            label={
              hasConnect ? t('home.continueVerification') : t('home.linkStripe')
            }
            onPress={() => router.push('/bank?start=1')}
          />
        </View>
      )}

      <View style={styles.actions}>
        <PrimaryButton label={t('home.addCredits')} onPress={goDeposit} />
        <PrimaryButton
          label={t('home.withdrawToBank')}
          onPress={goWithdraw}
          locked={!bankVerified}
        />
        {lockHint ? (
          <View style={styles.lockBox}>
            <Text style={styles.lockHint}>{lockHint}</Text>
            {!twoFactorEnabled ? (
              <Pressable onPress={() => router.push('/security/2fa')}>
                <Text style={styles.lockAction}>{t('common.configure2faArrow')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {!twoFactorEnabled ? (
        <Pressable style={styles.secBanner} onPress={() => router.push('/security/2fa')}>
          <Text style={styles.secBannerTitle}>{t('home.protectMoney')}</Text>
          <Text style={styles.secBannerCopy}>{t('home.protectMoneyBody')}</Text>
        </Pressable>
      ) : (
        <Text style={styles.secOk}>{t('home.twoFactorActive')}</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.history}>
        <View style={styles.historyHead}>
          <Text style={styles.sectionTitle}>{t('home.transactionHistory')}</Text>
          <Pressable onPress={() => router.push('/history')}>
            <Text style={styles.link}>{t('common.seeAll')}</Text>
          </Pressable>
        </View>
        {txs.length === 0 ? (
          <Text style={styles.empty}>{t('home.noMovements')}</Text>
        ) : (
          txs.slice(0, 8).map((tx) => (
            <View key={String(tx.id)} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txType}>
                  {getTxLabel(tx.type, t, tx.description || tx.type)}
                </Text>
                <Text style={styles.txDate}>{formatDateTime(tx.createdAt)}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  tx.amount >= 0 ? styles.txPos : styles.txNeg,
                ]}
              >
                {tx.amount >= 0 ? '+' : ''}
                {tx.amount}
              </Text>
            </View>
          ))
        )}
      </View>

      <Pressable onPress={load}>
        <Text style={styles.refresh}>{t('common.refresh')}</Text>
      </Pressable>
      <Pressable onPress={handleLogout}>
        <Text style={styles.logout}>{t('common.logout')}</Text>
      </Pressable>
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  balanceBlock: { alignItems: 'flex-start', marginBottom: Spacing.sm },
  balanceLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  balance: {
    fontFamily: Fonts.display,
    fontSize: 56,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
    lineHeight: 64,
    letterSpacing: -1,
  },
  fiat: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 6,
  },
  kycOk: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    marginBottom: Spacing.sm,
  },
  kycOkText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  kycWarn: {
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surfaceMuted,
    marginBottom: Spacing.sm,
  },
  kycWarnTitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  kycWarnCopy: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  bankLinked: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.22)',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  verifiedTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  verifiedMeta: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  readyHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 6,
  },
  manageLink: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
    marginLeft: 52,
  },
  bankMissing: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  bankMissingTitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  bankMissingCopy: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
  lockBox: {
    gap: 6,
    padding: Spacing.md,
    borderRadius: 10,
    backgroundColor: Colors.surfaceMuted,
  },
  lockHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  lockAction: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  secBanner: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.06)',
  },
  secBannerTitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  secBannerCopy: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  secOk: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  history: { marginTop: Spacing.lg, gap: 4 },
  historyHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted,
    gap: Spacing.md,
  },
  txType: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  txDate: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '700',
  },
  txPos: { color: Colors.success },
  txNeg: { color: Colors.red },
  link: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  refresh: {
    marginTop: Spacing.lg,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  logout: {
    marginTop: Spacing.sm,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  error: { color: Colors.error, fontFamily: Fonts.body },
});
