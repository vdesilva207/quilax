import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { GradientButton } from '@/components/ui/ScreenChrome';
import { MobileModalFrame } from '@/components/ui/MobileModalFrame';

type ReportSheetProps = {
  visible: boolean;
  title: string;
  reasons: readonly string[];
  reasonKeyPrefix: string;
  onClose: () => void;
  onSubmit: (reason: string, description: string) => Promise<void>;
};

export default function ReportSheet({
  visible,
  title,
  reasons,
  reasonKeyPrefix,
  onClose,
  onSubmit,
}: ReportSheetProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setSelected(null);
    setDescription('');
    setSubmitting(false);
    setDone(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(selected, description.trim());
      setDone(true);
    } catch {
      /* caller may alert */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <MobileModalFrame onBackdropPress={handleClose}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>

            {done ? (
              <View style={styles.doneBox}>
                <Text style={styles.doneText}>{t('report.sent')}</Text>
                <GradientButton label={t('common.close')} onPress={handleClose} />
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
                <Text style={styles.subtitle}>{t('report.pickReason')}</Text>
                {reasons.map((reason) => {
                  const active = selected === reason;
                  return (
                    <Pressable
                      key={reason}
                      style={[styles.reasonRow, active && styles.reasonRowActive]}
                      onPress={() => setSelected(reason)}
                    >
                      <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                        {t(`${reasonKeyPrefix}.${reason}`)}
                      </Text>
                    </Pressable>
                  );
                })}

                <Text style={styles.detailLabel}>{t('report.detailsOptional')}</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('report.detailsPlaceholder')}
                  placeholderTextColor={Colors.light.textSecondary}
                  multiline
                  maxLength={500}
                />

                <GradientButton
                  label={submitting ? t('common.sending') : t('report.submit')}
                  onPress={handleSubmit}
                  disabled={!selected || submitting}
                />
                <Pressable onPress={handleClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
                {submitting ? (
                  <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 8 }} />
                ) : null}
              </ScrollView>
            )}
          </View>
        </MobileModalFrame>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    maxHeight: '85%',
    zIndex: 2,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.backgroundSelected,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  scroll: { maxHeight: 520 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: Spacing.two },
  reasonRow: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSelected,
    marginBottom: 8,
  },
  reasonRowActive: { backgroundColor: '#EDE9FE' },
  reasonText: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  reasonTextActive: { color: Colors.light.primary },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginTop: Spacing.two,
    marginBottom: 6,
  },
  input: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    padding: Spacing.three,
    fontSize: 15,
    color: Colors.light.text,
    textAlignVertical: 'top',
    marginBottom: Spacing.three,
  },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.two },
  cancelText: { color: Colors.light.textSecondary, fontWeight: '600' },
  doneBox: { gap: Spacing.three, paddingVertical: Spacing.four },
  doneText: { fontSize: 16, color: Colors.light.text, lineHeight: 22 },
});
