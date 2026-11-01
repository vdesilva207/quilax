import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getReceiptDataIOS, useIAP, type Purchase, type PurchaseError } from 'expo-iap';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { Colors, Spacing, bodyTypeface, titleTypeface } from '@/constants/theme';
import { SCREEN_BACKGROUND } from '@/constants/gradients';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Pack = {
  productId: string;
  credits: number;
  bonus: number;
  totalCredits: number;
  label: string;
};

const PRODUCT_IDS = ['credits_10', 'credits_50', 'credits_100', 'credits_250'];

export default function BuyCreditsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refreshProfile, token, user } = useAuth() as any;
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [kycOk, setKycOk] = useState(!!user?.idVerified);
  const verifyingRef = useRef(false);

  const verifyOnServer = useCallback(
    async (purchase: Purchase) => {
      if (verifyingRef.current) return;
      verifyingRef.current = true;
      setError('');
      setMessage(t('buyCredits.verifying'));
      try {
        if (token) apiClient.setToken(token);
        const store = Platform.OS === 'ios' ? 'APPLE' : 'GOOGLE';
        let receiptData = purchase.purchaseToken || null;
        if (Platform.OS === 'ios') {
          try {
            receiptData = (await getReceiptDataIOS()) || receiptData;
          } catch {
            /* purchaseToken / transactionId fallback */
          }
        }
        const data = await apiClient.post('/iap/verify', {
          store,
          productId: purchase.productId,
          storeTransactionId: purchase.transactionId,
          receiptData: receiptData || purchase.transactionId,
        });
        const granted = data?.creditsGranted ?? 0;
        setMessage(t('buyCredits.success', { n: granted }));
        await refreshProfile?.({ full: false }).catch(() => null);
      } catch (e: any) {
        setError(e?.message || t('buyCredits.error'));
      } finally {
        verifyingRef.current = false;
        setBusySku(null);
      }
    },
    [refreshProfile, t, token],
  );

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        await verifyOnServer(purchase);
        await finishTransaction({ purchase, isConsumable: true });
      } catch (e: any) {
        setError(e?.message || t('buyCredits.error'));
        setBusySku(null);
      }
    },
    onPurchaseError: (err: PurchaseError) => {
      setBusySku(null);
      if (String(err?.code || '').includes('UserCancelled')) return;
      setError(err?.message || t('buyCredits.error'));
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (token) apiClient.setToken(token);
        const [data, identity] = await Promise.all([
          apiClient.get('/iap/packages'),
          apiClient.get('/profile/identity/status').catch(() => null),
        ]);
        if (!cancelled) {
          setPacks(data?.packages || []);
          const verified =
            !!identity?.idVerified ||
            identity?.status === 'verified' ||
            !!user?.idVerified;
          setKycOk(verified);
        }
      } catch {
        if (!cancelled) {
          setPacks(
            PRODUCT_IDS.map((id) => ({
              productId: id,
              credits: Number(id.split('_')[1]) || 0,
              bonus: 0,
              totalCredits: Number(id.split('_')[1]) || 0,
              label: id,
            })),
          );
          setKycOk(!!user?.idVerified);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.idVerified]);

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' }).catch(() => {
      setError(t('buyCredits.storeUnavailable'));
    });
  }, [connected, fetchProducts, t]);

  const priceFor = (productId: string) => {
    const p = products?.find((x) => x.id === productId || (x as any).productId === productId);
    return (p as any)?.displayPrice || (p as any)?.localizedPrice || null;
  };

  const onBuy = async (productId: string) => {
    setError('');
    setMessage('');
    if (!kycOk) {
      setError(t('buyCredits.needKyc'));
      return;
    }
    setBusySku(productId);
    try {
      await requestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: 'in-app',
      });
    } catch (e: any) {
      setBusySku(null);
      setError(e?.message || t('buyCredits.error'));
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('buyCredits.title')} subtitle={t('buyCredits.subtitle')} showBack />
      <View style={styles.body}>
        {!loading && !kycOk ? (
          <View style={styles.kycBox}>
            <Text style={styles.warn}>{t('buyCredits.needKyc')}</Text>
            <Pressable
              style={styles.kycBtn}
              onPress={() => router.push('/(auth)/id-verification')}
            >
              <Text style={styles.kycBtnText}>{t('buyCredits.goVerify')}</Text>
            </Pressable>
          </View>
        ) : null}
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : (
          packs.map((pack) => {
            const price = priceFor(pack.productId);
            const busy = busySku === pack.productId;
            return (
              <Pressable
                key={pack.productId}
                style={({ pressed }) => [styles.pack, pressed && styles.packPressed]}
                disabled={!!busySku || !kycOk}
                onPress={() => onBuy(pack.productId)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.packTitle}>{pack.label}</Text>
                  {pack.bonus > 0 ? (
                    <Text style={styles.bonus}>{t('buyCredits.bonus', { n: pack.bonus })}</Text>
                  ) : null}
                  {price ? <Text style={styles.price}>{price}</Text> : null}
                </View>
                {busy ? (
                  <ActivityIndicator color={Colors.light.primary} />
                ) : (
                  <Text style={styles.buyLabel}>{t('buyCredits.buy')}</Text>
                )}
              </Pressable>
            );
          })
        )}

        {!connected && !loading ? (
          <Text style={styles.warn}>{t('buyCredits.storeUnavailable')}</Text>
        ) : null}
        {message ? <Text style={styles.ok}>{message}</Text> : null}
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    backgroundColor: SCREEN_BACKGROUND,
  },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  packPressed: { opacity: 0.85 },
  packTitle: {
    ...titleTypeface,
    fontSize: 17,
    color: Colors.light.text,
  },
  bonus: {
    ...bodyTypeface,
    fontSize: 13,
    color: Colors.light.primary,
    marginTop: 2,
  },
  price: {
    ...bodyTypeface,
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  buyLabel: {
    ...titleTypeface,
    color: Colors.light.primary,
    fontSize: 15,
  },
  warn: { color: Colors.light.textSecondary, fontSize: 13 },
  kycBox: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
  },
  kycBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
  },
  kycBtnText: { color: '#fff', fontWeight: '700' },
  ok: { color: Colors.light.primary, fontWeight: '700' },
  err: { color: Colors.light.error, fontWeight: '700' },
});
