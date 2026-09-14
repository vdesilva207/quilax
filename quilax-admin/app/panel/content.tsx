import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton } from '@/components/ui/GradientButton';
import adminService from '@/services/adminService';

type DocKey = 'legal.terms' | 'legal.privacy';

type HelpArticle = {
  id: number;
  question: string;
  answer: string;
  category: string;
};

const DOCS: { key: DocKey; label: string }[] = [
  { key: 'legal.terms', label: 'Términos' },
  { key: 'legal.privacy', label: 'Privacidad' },
];

export default function ContentScreen() {
  const [tab, setTab] = useState<'legal' | 'faq'>('legal');
  const [docKey, setDocKey] = useState<DocKey>('legal.terms');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [draftQ, setDraftQ] = useState('');
  const [draftA, setDraftA] = useState('');
  const [draftCat, setDraftCat] = useState('general');

  const loadDoc = useCallback(async (key: DocKey) => {
    setLoading(true);
    const result = await adminService.getSiteContent(key);
    if (result.success) {
      setBody(result.data?.body || '');
    } else {
      Alert.alert('Error', result.error || 'No se pudo cargar');
    }
    setLoading(false);
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    const result = await adminService.getHelpArticles();
    if (result.success) {
      setArticles(result.data?.articles || []);
    } else {
      Alert.alert('Error', result.error || 'No se pudieron cargar FAQs');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'legal') loadDoc(docKey);
    else loadArticles();
  }, [tab, docKey, loadDoc, loadArticles]);

  const saveDoc = async () => {
    setSaving(true);
    const result = await adminService.saveSiteContent(docKey, body);
    setSaving(false);
    if (result.success) Alert.alert('Guardado', 'Contenido actualizado. La app lo verá al recargar.');
    else Alert.alert('Error', result.error || 'No se pudo guardar');
  };

  const createArticle = async () => {
    if (!draftQ.trim() || !draftA.trim()) {
      Alert.alert('Completa pregunta y respuesta');
      return;
    }
    setSaving(true);
    const result = await adminService.createHelpArticle({
      question: draftQ.trim(),
      answer: draftA.trim(),
      category: draftCat.trim() || 'general',
    });
    setSaving(false);
    if (result.success) {
      setDraftQ('');
      setDraftA('');
      loadArticles();
    } else {
      Alert.alert('Error', result.error || 'No se pudo crear');
    }
  };

  const removeArticle = (id: number) => {
    Alert.alert('Eliminar FAQ', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const result = await adminService.deleteHelpArticle(id);
          if (result.success) loadArticles();
          else Alert.alert('Error', result.error || 'No se pudo eliminar');
        },
      },
    ]);
  };

  return (
    <AppScreen>
      <AppHeader title="Contenido" subtitle="Legal y FAQ editables" />

      <AppSection title="Sección" accentIndex={0}>
        <View style={styles.row}>
          {(['legal', 'faq'] as const).map((id) => (
            <Pressable
              key={id}
              style={[styles.chip, tab === id && styles.chipOn]}
              onPress={() => setTab(id)}
            >
              <Text style={[styles.chipText, tab === id && styles.chipTextOn]}>
                {id === 'legal' ? 'Legal' : 'FAQ / Ayuda'}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppSection>

      {tab === 'legal' ? (
        <AppSection title="Documentos" accentIndex={1}>
          <View style={styles.row}>
            {DOCS.map((d) => (
              <Pressable
                key={d.key}
                style={[styles.chip, docKey === d.key && styles.chipOn]}
                onPress={() => setDocKey(d.key)}
              >
                <Text style={[styles.chipText, docKey === d.key && styles.chipTextOn]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          {loading ? (
            <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 16 }} />
          ) : (
            <>
              <Text style={styles.hint}>
                Markdown. Vacío = se usa el texto por defecto del servidor hasta que guardes.
              </Text>
              <TextInput
                style={styles.editor}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                placeholder="Pegar o editar términos / privacidad…"
                placeholderTextColor={Colors.light.textSecondary}
              />
              <GradientButton
                label={saving ? 'Guardando…' : 'Guardar'}
                onPress={saveDoc}
                disabled={saving}
              />
            </>
          )}
        </AppSection>
      ) : (
        <AppSection title="Artículos de ayuda" accentIndex={1}>
          <AppCard>
            <Text style={styles.fieldLabel}>Nueva FAQ</Text>
            <TextInput
              style={styles.input}
              value={draftCat}
              onChangeText={setDraftCat}
              placeholder="Categoría"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={draftQ}
              onChangeText={setDraftQ}
              placeholder="Pregunta"
              placeholderTextColor={Colors.light.textSecondary}
            />
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              value={draftA}
              onChangeText={setDraftA}
              placeholder="Respuesta"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
            />
            <GradientButton
              label={saving ? '…' : 'Crear'}
              onPress={createArticle}
              disabled={saving}
            />
          </AppCard>

          {loading ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : articles.length === 0 ? (
            <Text style={styles.hint}>Aún no hay artículos. Crea el primero arriba.</Text>
          ) : (
            articles.map((a) => (
              <AppCard key={a.id}>
                <Text style={styles.cat}>{a.category}</Text>
                <Text style={styles.q}>{a.question}</Text>
                <Text style={styles.a}>{a.answer}</Text>
                <Pressable onPress={() => removeArticle(a.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Eliminar</Text>
                </Pressable>
              </AppCard>
            ))
          )}
        </AppSection>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.backgroundSelected,
  },
  chipOn: { backgroundColor: Colors.light.primary },
  chipText: { fontWeight: '600', color: Colors.light.textSecondary },
  chipTextOn: { color: '#fff', fontWeight: '800' },
  hint: { fontSize: 13, color: Colors.light.textSecondary, marginVertical: 10, lineHeight: 18 },
  editor: {
    minHeight: 280,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    padding: Spacing.three,
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
  },
  fieldLabel: { fontWeight: '700', marginBottom: 8, color: Colors.light.text },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    padding: 12,
    marginBottom: 8,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  cat: { fontSize: 11, fontWeight: '700', color: Colors.light.primary, marginBottom: 4 },
  q: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  a: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 6, lineHeight: 20 },
  deleteBtn: { marginTop: 10, alignSelf: 'flex-start' },
  deleteText: { color: Colors.light.error, fontWeight: '700', fontSize: 13 },
});
