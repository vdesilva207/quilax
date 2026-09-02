import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Text as RNText, TextInput as RNTextInput } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/context/AuthContext';
import { QuizPlayUiProvider } from '@/context/QuizPlayUiContext';
import { Colors, Spacing, bodyTypeface, sora } from '@/constants/theme';
import PushNotificationBootstrap from '@/components/PushNotificationBootstrap';
import { WebPhoneFrame } from '@/components/ui/WebPhoneFrame';
import '@/i18n';
import i18n, { hydrateAppLanguage } from '@/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Heavier default text on native (avoids hairline system Regular).
// fontWeight omitted on native — see sora() / installSoraFontFix.
if (!(RNText as any).defaultProps) (RNText as any).defaultProps = {};
(RNText as any).defaultProps.style = [
  bodyTypeface,
  (RNText as any).defaultProps?.style,
].filter(Boolean);

// TextInputs do not inherit Text defaultProps — force Sora on fields too.
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
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{i18n.t('common.loadErrorTitle')}</Text>
          <Text style={styles.errorText}>{this.state.error.message}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => {
              this.setState({ error: null });
              if (typeof window !== 'undefined') window.location.reload();
            }}
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
  const [fontsLoaded] = useFonts({
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <RootErrorBoundary>
      <LanguageBootstrap>
        <AuthProvider>
          <QuizPlayUiProvider>
            <PushNotificationBootstrap />
            <WebPhoneFrame>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  animationDuration: 220,
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
  );
}

const styles = StyleSheet.create({
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