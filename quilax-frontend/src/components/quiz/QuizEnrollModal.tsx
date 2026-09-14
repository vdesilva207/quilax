import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { brandGradientProps } from '@/constants/gradients';
import { MobileModalFrame } from '@/components/ui/MobileModalFrame';

type QuizEnrollModalProps = {
  visible: boolean;
  quizTitle?: string;
  entryCost?: number;
  preparing?: boolean;
  loading?: boolean;
  error?: string | null;
  canConfirm?: boolean;
  earlyJoinLabel?: string | null;
  earlyJoinMax?: number;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Centered confirmation panel to join a quiz. */
export default function QuizEnrollModal({
  visible,
  quizTitle,
  entryCost = 1,
  preparing = false,
  loading = false,
  error = null,
  canConfirm = true,
  earlyJoinLabel = null,
  earlyJoinMax,
  confirmLabel,
  onCancel,
  onConfirm,
}: QuizEnrollModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const busy = preparing || loading;
  const confirmDisabled = busy || !canConfirm;
  const creditLabel =
    entryCost === 1 ? t('enroll.creditSingular') : t('enroll.creditPlural', { n: entryCost });
  const resolvedTitle = quizTitle || t('enroll.defaultQuizTitle');
  const confirmText = confirmLabel || t('enroll.confirm');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <MobileModalFrame onBackdropPress={busy ? undefined : onCancel}>
        <View
          style={[
            styles.panel,
            { paddingBottom: Math.max(insets.bottom, Spacing.four) },
          ]}
          accessibilityRole="dialog"
        >
          <View style={styles.handle} />
          <LinearGradient {...brandGradientProps} style={styles.gradientBand} />

          <View style={styles.body}>
            <Text style={styles.kicker}>{t('enroll.kicker')}</Text>
            <Text style={styles.title}>{t('enroll.title')}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {resolvedTitle}
            </Text>

            <View style={styles.flow}>
              <View style={styles.flowCol}>
                <Text style={styles.flowAmount}>−{creditLabel}</Text>
                <Text style={styles.flowCaption}>{t('enroll.debitCaption')}</Text>
              </View>
              <Text style={styles.flowArrow}>↓</Text>
              <View style={styles.flowCol}>
                <Text style={styles.flowAmount}>{t('enroll.poolLabel')}</Text>
                <Text style={styles.flowCaption}>{t('enroll.poolCaption')}</Text>
              </View>
            </View>

            <Text style={styles.note}>
              {t('enroll.note', { credits: creditLabel })}
            </Text>

            {earlyJoinLabel || earlyJoinMax ? (
              <View style={styles.earlyJoinBox}>
                <Text style={styles.earlyJoinTitle}>
                  {t('enroll.earlyJoinTitle', { max: earlyJoinMax || 600 })}
                </Text>
                {earlyJoinLabel ? (
                  <Text style={styles.earlyJoinBody}>{earlyJoinLabel}</Text>
                ) : null}
              </View>
            ) : null}

            {preparing ? (
              <View style={styles.prepRow}>
                <ActivityIndicator color={Colors.light.primary} />
                <Text style={styles.prepText}>{t('enroll.preparing')}</Text>
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.cancelBtn,
                  pressed && !loading && styles.pressed,
                ]}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={confirmDisabled}
                style={({ pressed }) => [
                  styles.btn,
                  styles.confirmBtn,
                  pressed && !confirmDisabled && styles.pressed,
                  confirmDisabled && styles.confirmDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmText}>{confirmText}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </MobileModalFrame>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    backgroundColor: Colors.light.backgroundElement,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.light.backgroundSelected,
    zIndex: 2,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.backgroundSelected,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  gradientBand: {
    height: 8,
    width: '100%',
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.light.primary,
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  title: {
    ...titleTypeface,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.two,
    color: Colors.light.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  flow: {
    marginTop: Spacing.four,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.two,
  },
  flowCol: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    backgroundColor: Colors.light.background,
    borderRadius: 14,
  },
  flowAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  flowCaption: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  flowArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  note: {
    marginTop: Spacing.three,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    fontSize: 13,
    textAlign: 'center',
  },
  earlyJoinBox: {
    marginTop: Spacing.three,
    width: '100%',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F0C36A',
    gap: 4,
  },
  earlyJoinTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    textAlign: 'center',
  },
  earlyJoinBody: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 18,
  },
  prepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  prepText: { color: Colors.light.textSecondary, fontWeight: '600' },
  error: {
    marginTop: Spacing.three,
    color: Colors.light.error,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'column',
    gap: Spacing.two,
    marginTop: Spacing.four,
    width: '100%',
  },
  btn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  cancelText: { color: Colors.light.textSecondary, fontWeight: '700', fontSize: 15 },
  confirmBtn: {
    backgroundColor: Colors.light.primary,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  confirmText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  confirmDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
});
