import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import PanelAuthGate from '@/components/PanelAuthGate';
import { Colors, Spacing } from '@/constants/theme';
import '@/global.css';

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Admin root crash:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Error al cargar el panel</Text>
          <Text style={styles.errorText}>{this.state.error.message}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => {
              this.setState({ error: null });
              if (typeof window !== 'undefined') window.location.reload();
            }}
          >
            <Text style={styles.retryText}>Recargar</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <PanelAuthGate>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="panel" />
        </Stack>
      </PanelAuthGate>
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  errorText: {
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
  retryText: { color: '#fff', fontWeight: '700' },
});

