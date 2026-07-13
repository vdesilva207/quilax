import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { APP_GRADIENT, GRADIENT_HORIZONTAL } from '@/constants/gradients';

type QuizEnrollModalProps = {
  visible: boolean;
  quizTitle?: string;
  entryCost?: number;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function QuizEnrollModal({
  visible,
  quizTitle = 'Quiz',
  entryCost = 1,
  loading = false,
  onCancel,
  onConfirm,
}: QuizEnrollModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirmar inscripción</Text>
          <Text style={styles.subtitle}>{quizTitle}</Text>
          <Text style={styles.cost}>Coste: {entryCost} crédito(s)</Text>
          <Text style={styles.note}>El crédito no es reembolsable y va al bote de premios.</Text>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={loading} style={({ pressed }) => [pressed && styles.pressed]}>
              <LinearGradient colors={[...APP_GRADIENT]} style={styles.confirmBtn} {...GRADIENT_HORIZONTAL}>
                <Text style={styles.confirmText}>{loading ? 'Uniendo...' : 'UNIRSE'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    padding: Spacing.four,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.light.text },
  subtitle: { marginTop: Spacing.one, color: Colors.light.textSecondary },
  cost: { marginTop: Spacing.three, fontSize: 16, fontWeight: '700', color: Colors.light.primary },
  note: { marginTop: Spacing.two, color: Colors.light.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.four },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  cancelText: { color: Colors.light.primary, fontWeight: '700' },
  confirmBtn: { minWidth: 140, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '800' },
  pressed: { opacity: 0.92 },
});
