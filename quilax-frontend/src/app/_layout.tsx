import 'react-native-gesture-handler';
import React, { Component, useCallback, useEffect, type ErrorInfo, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Text as RNText,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFonts, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/context/AuthContext';
import { QuizPlayUiProvider } from '@/context/QuizPlayUiContext';
import { Colors, Spacing, bodyTypeface, sora } from '@/constants/theme';
import PushNotificationBootstrap from '@/components/PushNotificationBootstrap';
import EnrolledQuizGate from '@/components/EnrolledQuizGate';
import { WebPhoneFrame } from '@/components/ui/WebPhoneFrame';
import '@/i18n';
import i18n, { hydrateAppLanguage } from '@/i18n';

/** Retry hide — iOS release sometimes no-ops the first calls. */
async function forceHideSplash() {
  for (let i = 0; i < 20; i++) {
    try {
      await SplashScreen.hideAsync();
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

try {
  const ErrorUtils = (global as any).ErrorUtils;
  if (ErrorUtils?.setGlobalHandler) {
    const prev = ErrorUtils.getGlobalHandler?.();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      void forceHideSplash();
      try {
        Alert.alert(
          'Quilax error',
          `${isFatal ? '[fatal] ' : ''}${error?.message || String(error)}`.slice(0, 400),
        );
      } catch {
        /* ignore */
      }
      prev?.(error, isFatal);
    });
  }
} catch {
  /* ignore */
}

// Default typeface via defaultProps (safe). Do NOT replace RN.Text exports.
if (!(RNText as any).defaultProps) (RNText as any).defaultProps = {};
(RNText as any).defaultProps.style = [
  bodyTypeface,
  (RNText as any).defaultProps?.style,
].filter(Boolean);

if (!(RNTextInput as any).defaultProps) (RNTextInput as any).defaultProps = {};
(RNTextInput as any).defaultProps.style = [
  bodyTypeface,
  (RNTextInput as any).defaultProps?.style,
].filter(Boolean);

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Root crash:', error, info?.componentStack);
    void forceHideSplash();
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorBox} onLayout={() => { void forceHideSplash(); }}>
          <Text style={styles.errorTitle}>{i18n.t('common.loadErrorTitle')}</Text>
          <Text style={styles.errorText}>{this.state.error.message}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.retryText}>{i18n.t('common.reload')}</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function LanguageBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    void hydrateAppLanguage();
  }, []);
  return <>{children}</>;
}

export default function RootLayout() {
  useFonts({
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  useEffect(() => {
    void forceHideSplash();
  }, []);

  const onLayout = useCallback(() => {
    void forceHideSplash();
  }, []);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <RootErrorBoundary>
        <LanguageBootstrap>
          <AuthProvider>
            <QuizPlayUiProvider>
              <PushNotificationBootstrap />
              <EnrolledQuizGate />
              <WebPhoneFrame>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                    animationDuration: 220,
                    contentStyle: { backgroundColor: Colors.light.background },
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(app)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" />
                </Stack>
              </WebPhoneFrame>
            </QuizPlayUiProvider>
          </AuthProvider>
        </LanguageBootstrap>
      </RootErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: Colors.light.background,
  },
  errorTitle: {
    ...sora(800),
    fontSize: 20,
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  errorText: {
    ...sora(500),
    fontSize: 14,
    color: Colors.light.error,
    marginBottom: Spacing.four,
  },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 8,
  },
  retryText: {
    ...sora(700),
    color: '#FFF',
  },
});
