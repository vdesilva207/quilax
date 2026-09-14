import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell } from '@/components/WalletShell';
import { apiDownload, apiFetch, getToken } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { formatDateTime, getTxLabel } from '@/constants/money';

type TxItem = {
  id: number | string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
};

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const load = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const token = await getToken();
        if (!token) {
          router.replace('/login');
          return;
        }
        const data = await apiFetch(
          `/transactions/my-history?page=${pageNum}&limit=30&period=all-time`
        );
        const list = data.transactions || [];
        setTxs((prev) => (append ? [...prev, ...list] : list));
        const total = data.pagination?.total ?? list.length;
        const limit = data.pagination?.limit ?? 30;
        setHasMore(pageNum * limit < total);
        setPage(pageNum);
      } catch {
        if (!append) setTxs([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [router]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const downloadStatement = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await apiDownload(
        '/transactions/bank-statement?format=pdf',
        `quilax_justificante_${Date.now()}.pdf`
      );
    } catch (err: any) {
      setDownloadError(err?.message || t('errors.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <WalletShell
      showBack
      title={t('history.title')}
      subtitle={t('history.subtitle')}
    >
      <Pressable
        onPress={downloadStatement}
        disabled={downloading}
        style={styles.downloadBtn}
      >
        {downloading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.downloadLabel}>{t('history.downloadPdf')}</Text>
        )}
      </Pressable>
      {downloadError ? (
        <Text style={styles.downloadError}>{downloadError}</Text>
      ) : (
        <Text style={styles.downloadHint}>{t('history.downloadHint')}</Text>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : txs.length === 0 ? (
        <Text style={styles.empty}>{t('history.empty')}</Text>
      ) : (
        <View>
          {txs.map((tx) => (
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
                {tx.amount} {t('common.creditsShort')}
              </Text>
            </View>
          ))}
          {hasMore ? (
            loadingMore ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
            ) : (
              <Pressable onPress={() => load(page + 1, true)}>
                <Text style={styles.more}>{t('history.loadMore')}</Text>
              </Pressable>
            )
          ) : null}
        </View>
      )}
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  downloadBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  downloadLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.primary,
  },
  downloadHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  downloadError: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#b00020',
    marginBottom: Spacing.lg,
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceMuted,
  },
  txType: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
  },
  txDate: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  txPos: { color: '#1b7a3d' },
  txNeg: { color: Colors.text },
  more: {
    marginTop: 16,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
  },
});
