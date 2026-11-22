import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface, bodyTypeface } from '@/constants/theme';
import { brandGradientProps, SCREEN_BACKGROUND } from '@/constants/gradients';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api';
import { getWalletAppUrl } from '@/lib/walletAppUrl';

export default function WalletGateScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, token: authToken, refreshProfile } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [openError, setOpenError] = useState('');
  const balance = Number(user?.balance ?? 0) || 0;
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  useFocusEffect(
    useCallback(() => {
      refreshProfile?.({ full: false }).catch(() => null);
    }, [refreshProfile]),
  );

  const openWebGestion = async () => {
    setLoading(true);
    setOpenError('');

    try {
      if (authToken) {
        apiClient.setToken(authToken);
      }
      const data = await apiClient.post('/wallet-access/exchange-token', {});
      if (!data?.token) {
        setOpenError(t('wallet.openErrorBody'));
        return;
      }
      const url = getWalletAppUrl(data.token, i18n.language);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const win = window.open(url, '_blank');
        if (!win) {
          window.location.assign(url);
        }
      } else {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
        });
        await refreshProfile?.({ full: false }).catch(() => null);
      }
    } catch {
      setOpenError(t('wallet.openErrorBody'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader
        title={t('wallet.title')}
        subtitle={t('wallet.subtitle')}
        badge={t('wallet.badge')}
      />

      <AppSection title={t('wallet.balanceLabel')} accentIndex={0}>
        <AppCard>
          <Text style={styles.balance}>{balance}</Text>
          <Text style={styles.balanceUnit}>{t('wallet.creditsUnit')}</Text>
          {balance <= 0 ? (
            <Text style={styles.emptyBalance}>{t('wallet.emptyBalanceHint')}</Text>
          ) : null}
        </AppCard>
        <Text style={styles.copy}>{t('wallet.description')}</Text>
      </AppSection>

      <View style={styles.actions}>
        {openError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{t('wallet.openErrorTitle')}</Text>
            <Text style={styles.errorBody}>{openError}</Text>
          </View>
        ) : null}

        {isNative ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.ctaWrap, pressed && styles.ctaPressed]}
              onPress={() => router.push('/(app)/wallet/buy-credits')}
              testID="buy-credits-iap"
            >
              <LinearGradient {...brandGradientProps} style={styles.cta}>
                <Text style={styles.ctaText}>{t('wallet.buyCredits')}</Text>
              </LinearGradient>
            </Pressable>
            <Text style={styles.buyHint}>{t('wallet.buyCreditsHint')}</Text>
          </>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.ctaWrap,
            isNative && styles.ctaSecondary,
            pressed && styles.ctaPressed,
          ]}
          onPress={openWebGestion}
          disabled={loading}
          testID="open-web-wallet"
        >
          {isNative ? (
            <View style={styles.ctaOutline}>
              {loading ? (
                <ActivityIndicator color={Colors.light.primary} />
              ) : (
                <Text style={styles.ctaOutlineText}>
                  {openError ? t('common.retry') : t('wallet.openWeb')}
                </Text>
              )}
            </View>
          ) : (
            <LinearGradient {...brandGradientProps} style={styles.cta}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>
                  {openError ? t('common.retry') : t('wallet.openWeb')}
                </Text>
              )}
            </LinearGradient>
          )}
        </Pressable>

        <Text style={styles.appOnly}>{t('wallet.appOnlyHint')}</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  balance: {
    ...titleTypeface,
    fontSize: 48,
    fontWeight: '800',
    color: Colors.light.text,
  },
  balanceUnit: {
    ...bodyTypeface,
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  emptyBalance: {
    ...bodyTypeface,
    marginTop: Spacing.two,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
  },
  copy: {
    ...bodyTypeface,
    fontSize: 15,
    lineHeight: 23,
    color: Colors.light.textSecondary,
    marginTop: Spacing.two,
  },
  actions: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    backgroundColor: SCREEN_BACKGROUND,
  },
  errorBox: {
    width: '100%',
    padding: Spacing.four,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
    gap: 6,
  },
  errorTitle: {
    ...titleTypeface,
    color: '#B42318',
    fontWeight: '700',
    fontSize: 14,
  },
  errorBody: {
    ...bodyTypeface,
    color: '#B42318',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  ctaWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaSecondary: {
    marginTop: Spacing.two,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: { opacity: 0.92 },
  cta: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  ctaOutline: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.backgroundElement,
  },
  ctaText: {
    ...titleTypeface,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ctaOutlineText: {
    ...titleTypeface,
    color: Colors.light.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  buyHint: {
    ...bodyTypeface,
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  appOnly: {
    ...bodyTypeface,
    marginTop: Spacing.two,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
