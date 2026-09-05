import React, { useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, titleTypeface } from '@/constants/theme';
import { brandGradientProps, SCREEN_BACKGROUND } from '@/constants/gradients';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api';
import { getWalletAppUrl } from '@/lib/walletAppUrl';
import CustomIcon from '@/components/CustomIcon';

export default function WalletGateScreen() {
  const { t } = useTranslation();
  const { user, token: authToken } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [openError, setOpenError] = useState('');
  const balance = Number(user?.balance ?? 0) || 0;

  const openWebGestion = async () => {
    setLoading(true);
    setOpenError('');

    // Open immediately on web to avoid popup blockers (URL set after token).
    let pendingWindow: Window | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      pendingWindow = window.open('about:blank', '_blank');
    }

    try {
      if (authToken) {
        apiClient.setToken(authToken);
      }
      const data = await apiClient.post('/wallet-access/exchange-token', {});
      if (!data?.token) {
        throw new Error(t('wallet.openErrorBody'));
      }
      const url = getWalletAppUrl(data.token);

      if (Platform.OS === 'web') {
        if (pendingWindow && !pendingWindow.closed) {
          pendingWindow.location.href = url;
        } else {
          window.location.assign(url);
        }
      } else {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
        });
      }
    } catch (error: any) {
      try {
        pendingWindow?.close();
      } catch {
        /* ignore */
      }
      const msg =
        error?.status === 401
          ? t('wallet.openErrorBody')
          : error?.message || t('wallet.openErrorBody');
      setOpenError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.column}>
        <LinearGradient {...brandGradientProps} style={styles.hero}>
          <Text style={styles.brand}>QUILAX</Text>
          <Text style={styles.heroTitle}>{t('wallet.title')}</Text>
          <Text style={styles.heroSub}>{t('wallet.subtitle')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          <CustomIcon name="wallet" size={36} color={Colors.light.primary} />
          <Text style={styles.balanceHint}>{t('wallet.balanceLabel')}</Text>
          <Text style={styles.balance}>{balance}</Text>
          <Text style={styles.balanceUnit}>{t('wallet.creditsUnit')}</Text>

          {balance <= 0 ? (
            <Text style={styles.emptyBalance}>{t('wallet.emptyBalanceHint')}</Text>
          ) : null}

          <Text style={styles.copy}>{t('wallet.description')}</Text>
          <Text style={styles.appOnly}>{t('wallet.appOnlyHint')}</Text>

          {openError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>{t('wallet.openErrorTitle')}</Text>
              <Text style={styles.errorBody}>{openError}</Text>
              <Text style={styles.errorHint}>{t('wallet.openErrorHint')}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.ctaWrap, pressed && styles.ctaPressed]}
            onPress={openWebGestion}
            disabled={loading}
            testID="open-web-wallet"
          >
            <LinearGradient {...brandGradientProps} style={styles.cta}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>
                  {openError ? t('common.retry') : t('wallet.openWeb')}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  hero: {
    paddingTop: 72,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  brand: {
    ...titleTypeface,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#FFFFFF',
    marginBottom: Spacing.three,
  },
  heroTitle: {
    ...titleTypeface,
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroSub: {
    marginTop: Spacing.two,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    maxWidth: 280,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    alignItems: 'center',
  },
  balanceHint: {
    ...titleTypeface,
    marginTop: Spacing.three,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balance: {
    ...titleTypeface,
    fontSize: 48,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 4,
  },
  balanceUnit: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  emptyBalance: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  appOnly: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  errorBox: {
    width: '100%',
    marginBottom: Spacing.four,
    padding: Spacing.four,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    gap: 6,
  },
  errorTitle: {
    ...titleTypeface,
    color: '#B42318',
    fontWeight: '700',
    fontSize: 14,
  },
  errorBody: {
    color: '#B42318',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  errorHint: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  ctaWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaPressed: { opacity: 0.9 },
  cta: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  ctaText: {
    ...titleTypeface,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
