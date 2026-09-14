import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, titleTypeface, bodyTypeface } from '@/constants/theme';
import { brandGradientProps, SCREEN_BACKGROUND } from '@/constants/gradients';
import { BrandGradientBar } from '@/components/ui/BrandGradientBar';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api';
import { getWalletAppUrl } from '@/lib/walletAppUrl';

export default function WalletGateScreen() {
  const { t, i18n } = useTranslation();
  const { user, token: authToken, refreshProfile } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [openError, setOpenError] = useState('');
  const balance = Number(user?.balance ?? 0) || 0;

  useFocusEffect(
    useCallback(() => {
      refreshProfile?.({ full: false }).catch(() => null);
    }, [refreshProfile])
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
      // Never surface raw network/dev messages (e.g. "Load failed", ports) to users.
      setOpenError(t('wallet.openErrorBody'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BrandGradientBar />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <Text style={styles.brand}>QUILAX</Text>
          <Text style={styles.badge}>{t('wallet.badge')}</Text>

          <Text style={styles.heroTitle}>
            {t('wallet.title')}
            {'\n'}
            <Text style={styles.heroAccent}>{t('wallet.titleAccent')}</Text>
          </Text>
          <Text style={styles.heroSub}>{t('wallet.subtitle')}</Text>

          <View style={styles.balanceBlock}>
            <Text style={styles.balanceHint}>{t('wallet.balanceLabel')}</Text>
            <Text style={styles.balance}>{balance}</Text>
            <Text style={styles.balanceUnit}>{t('wallet.creditsUnit')}</Text>
            {balance <= 0 ? (
              <Text style={styles.emptyBalance}>{t('wallet.emptyBalanceHint')}</Text>
            ) : null}
          </View>

          <Text style={styles.copy}>{t('wallet.description')}</Text>

          {openError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>{t('wallet.openErrorTitle')}</Text>
              <Text style={styles.errorBody}>{openError}</Text>
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

          <Text style={styles.appOnly}>{t('wallet.appOnlyHint')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  brand: {
    ...titleTypeface,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  badge: {
    ...bodyTypeface,
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  heroTitle: {
    ...titleTypeface,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  heroAccent: {
    color: Colors.light.gradientEnd,
  },
  heroSub: {
    ...bodyTypeface,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.five,
    maxWidth: 340,
  },
  balanceBlock: {
    marginBottom: Spacing.four,
    paddingBottom: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28,25,23,0.1)',
  },
  balanceHint: {
    ...titleTypeface,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  balance: {
    ...titleTypeface,
    fontSize: 52,
    fontWeight: '800',
    color: Colors.light.text,
    marginTop: 4,
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
    marginBottom: Spacing.four,
  },
  errorBox: {
    width: '100%',
    marginBottom: Spacing.four,
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
  ctaPressed: { opacity: 0.92 },
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
  appOnly: {
    ...bodyTypeface,
    marginTop: Spacing.four,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
