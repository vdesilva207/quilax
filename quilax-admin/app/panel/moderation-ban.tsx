import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { brandGradientProps } from '@/constants/gradients';
import apiClient from '@/lib/api';

const DURATIONS: { key: string; label: string; days: number | null }[] = [
  { key: '1', label: '1 día', days: 1 },
  { key: '3', label: '3 días', days: 3 },
  { key: '7', label: '7 días', days: 7 },
  { key: '30', label: '30 días', days: 30 },
  { key: 'permanent', label: 'Permanente', days: null },
];

export default function ModerationBanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; postId?: string; username?: string }>();
  const userId = parseInt(String(params.userId || ''), 10);
  const postId = params.postId ? parseInt(String(params.postId), 10) : null;
  const username = params.username || `Usuario #${userId}`;

  const [durationKey, setDurationKey] = useState('7');
  const [message, setMessage] = useState(
    'Tu cuenta ha sido suspendida por publicar contenido que incumple las normas de la comunidad. Puedes recuperar tu saldo restante desde Gestión (Wallet).'
  );
  const [removePost, setRemovePost] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => DURATIONS.find((d) => d.key === durationKey) || DURATIONS[2],
    [durationKey]
  );

  const submit = async () => {
    if (!Number.isFinite(userId)) {
      Alert.alert('Error', 'Usuario no válido');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Error', 'Escribe el mensaje que verá el usuario');
      return;
    }
    if (selected.days != null && selected.days < 1) {
      Alert.alert('Error', 'La duración mínima es 1 día');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(`/admin/users/${userId}/ban`, {
        category: 'CONTENT',
        permanent: selected.days == null,
        durationDays: selected.days,
        message: message.trim(),
        reason: 'Contenido inapropiado (moderación)',
        removePostId: removePost && postId ? postId : undefined,
      });
      Alert.alert('Listo', 'Usuario baneado', [
        { text: 'OK', onPress: () => router.replace('/panel/posts') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo banear');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Banear usuario" subtitle={`@${username}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.step}>1 · Duración del baneo</Text>
        <Text style={styles.hint}>Mínimo 1 día. Permanente no tiene fecha de fin.</Text>
        <View style={styles.chips}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d.key}
              style={[styles.chip, durationKey === d.key && styles.chipOn]}
              onPress={() => setDurationKey(d.key)}
            >
              <Text style={[styles.chipText, durationKey === d.key && styles.chipTextOn]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.step}>2 · Mensaje al usuario</Text>
        <Text style={styles.hint}>
          Lo verá al intentar entrar en la app. Si el ban es por contenido, también se le indicará
          que puede recuperar el saldo en Wallet.
        </Text>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={5}
          value={message}
          onChangeText={setMessage}
          placeholder="Mensaje visible para la persona baneada"
          textAlignVertical="top"
        />

        {postId ? (
          <Pressable style={styles.checkRow} onPress={() => setRemovePost((v) => !v)}>
            <View style={[styles.checkbox, removePost && styles.checkboxOn]}>
              {removePost ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>Borrar también la publicación #{postId}</Text>
          </Pressable>
        ) : null}

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Recuperación de saldo</Text>
          <Text style={styles.noteBody}>
            Ban por contenido inapropiado: puede retirar el saldo restante en Gestión. Ban por
            actividad sospechosa: no recupera el dinero.
          </Text>
        </View>

        <Pressable
          style={[styles.submit, submitting && { opacity: 0.6 }]}
          disabled={submitting}
          onPress={submit}
        >
          <LinearGradient {...brandGradientProps} style={styles.submitGrad}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Confirmar baneo</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.eight },
  step: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    ...titleTypeface,
    marginTop: Spacing.two,
  },
  hint: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 999,
    backgroundColor: Colors.light.backgroundElement,
  },
  chipOn: { backgroundColor: Colors.light.text },
  chipText: { fontWeight: '600', color: Colors.light.textSecondary },
  chipTextOn: { color: '#fff' },
  textarea: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.light.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.light.text, borderColor: Colors.light.text },
  checkMark: { color: '#fff', fontWeight: '700', fontSize: 12 },
  checkLabel: { flex: 1, fontSize: 14, color: Colors.light.text },
  note: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: Spacing.three,
    gap: 6,
  },
  noteTitle: { fontWeight: '700', color: Colors.light.text },
  noteBody: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 19 },
  submit: { marginTop: Spacing.two, borderRadius: 14, overflow: 'hidden' },
  submitGrad: { paddingVertical: Spacing.four, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancel: { alignItems: 'center', padding: Spacing.three },
  cancelText: { color: Colors.light.textSecondary, fontWeight: '600' },
});
