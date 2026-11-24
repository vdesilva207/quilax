import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import QuizRunView from '@/components/quiz/QuizRunView';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';

function normalizeRunId(raw: string | string[] | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(n) : null;
}

class QuizRunErrorBoundary extends Component<
  { children: ReactNode; onBack: () => void; title: string; retryLabel: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QuizRun crash:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{this.props.title}</Text>
          <Text style={styles.errorText}>{this.state.error.message}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => {
              this.setState({ error: null });
              this.props.onBack();
            }}
          >
            <Text style={styles.retryText}>{this.props.retryLabel}</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function QuizRunScreen() {
  const { runId: raw } = useLocalSearchParams<{ runId: string | string[] }>();
  const runId = normalizeRunId(raw);
  const router = useRouter();
  const { t } = useTranslation();

  const goHome = () => router.replace('/(app)');

  if (!runId) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>{t('common.error')}</Text>
        <Text style={styles.errorText}>{t('quizPlay.loadError')}</Text>
        <Pressable style={styles.retry} onPress={goHome}>
          <Text style={styles.retryText}>{t('quizPlay.backToHome')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <QuizRunErrorBoundary
      onBack={goHome}
      title={t('common.error')}
      retryLabel={t('quizPlay.backToHome')}
    >
      <QuizRunView runId={runId} />
    </QuizRunErrorBoundary>
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
    ...titleTypeface,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  errorText: {
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
    lineHeight: 20,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
