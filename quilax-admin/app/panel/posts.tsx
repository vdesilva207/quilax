import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { brandGradientProps } from '@/constants/gradients';
import apiClient from '@/lib/api';
import { PressScale, StaggerItem } from '@/components/motion';

type ModPost = {
  id: number;
  text?: string | null;
  imageUrl?: string | null;
  status: string;
  createdAt: string;
  moderationReviewedAt?: string | null;
  hiddenReason?: string | null;
  aiFlagged?: boolean;
  aiFlagReason?: string | null;
  user?: {
    id: number;
    fullName?: string;
    email?: string;
    username?: string;
    isBanned?: boolean;
  };
  reports?: Array<{
    id: number;
    reason: string;
    description?: string;
    reporter?: { fullName?: string; email?: string };
  }>;
  _count?: { reports: number };
};

type QuizReport = {
  id: number;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: string;
  quiz?: {
    id: number;
    title: string;
    creator?: { id: number; username?: string; fullName?: string };
  };
  reporter?: { id: number; username?: string; fullName?: string };
};

type Tab = 'posts' | 'quizzes';
type Filter = 'all' | 'unreviewed' | 'reported' | 'hidden' | 'ai_flagged';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'ai_flagged', label: 'IA sospechosas' },
  { id: 'unreviewed', label: 'Sin revisar' },
  { id: 'reported', label: 'Reportadas' },
  { id: 'hidden', label: 'Ocultas' },
];

export default function PostModerationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('posts');
  const [filter, setFilter] = useState<Filter>('all');
  const [posts, setPosts] = useState<ModPost[]>([]);
  const [quizReports, setQuizReports] = useState<QuizReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const data = await apiClient.get(`/posts/moderation/queue?filter=${filter}&limit=40`);
      setPosts(data.posts || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cargar la cola');
    }
  }, [filter]);

  const loadQuizReports = useCallback(async () => {
    try {
      const data = await apiClient.get('/admin/quizzes/reports?status=PENDING');
      setQuizReports(data.reports || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudieron cargar reportes de quizzes');
    }
  }, []);

  const reload = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      if (tab === 'posts') await loadPosts();
      else await loadQuizReports();
      setLoading(false);
      setRefreshing(false);
    },
    [tab, loadPosts, loadQuizReports]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const act = async (postId: number, action: 'allow' | 'remove') => {
    if (action === 'remove') {
      Alert.alert('Borrar publicación', 'Se eliminará de la app para todos los usuarios.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => runAct(postId, action),
        },
      ]);
      return;
    }
    runAct(postId, action);
  };

  const runAct = async (postId: number, action: 'allow' | 'remove') => {
    setActing(postId);
    try {
      await apiClient.post(`/posts/moderation/${postId}/action`, {
        action,
        reason: action === 'remove' ? 'Eliminada por moderación' : undefined,
      });
      // Solo quitar de la lista tras éxito (FadeOutUp vía StaggerItem)
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo aplicar la acción');
    } finally {
      setActing(null);
    }
  };

  const reviewQuizReport = async (
    reportId: number,
    status: 'APPROVED' | 'DISMISSED',
    action?: 'CANCEL_QUIZ'
  ) => {
    setActing(reportId);
    try {
      await apiClient.post(`/admin/quizzes/reports/${reportId}/review`, { status, action });
      await loadQuizReports();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo revisar el reporte');
    } finally {
      setActing(null);
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Moderación" subtitle="Publicaciones recientes · revisión compartida" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} />}
      >
        <View style={styles.tabs}>
          {(['posts', 'quizzes'] as const).map((id) =>
            tab === id ? (
              <Pressable key={id} onPress={() => setTab(id)}>
                <LinearGradient {...brandGradientProps} style={styles.tabOn}>
                  <Text style={styles.tabOnText}>{id === 'posts' ? 'Publicaciones' : 'Quizzes'}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable key={id} style={styles.tab} onPress={() => setTab(id)}>
                <Text style={styles.tabText}>{id === 'posts' ? 'Publicaciones' : 'Quizzes'}</Text>
              </Pressable>
            )
          )}
        </View>

        {tab === 'posts' ? (
          <>
            <View style={styles.filters}>
              {FILTERS.map((f) => (
                <PressScale
                  key={f.id}
                  style={[styles.filterChip, filter === f.id && styles.filterChipOn]}
                  onPress={() => setFilter(f.id)}
                  scaleTo={0.94}
                >
                  <Text style={[styles.filterText, filter === f.id && styles.filterTextOn]}>
                    {f.label}
                  </Text>
                </PressScale>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: Spacing.six }} />
            ) : posts.length === 0 ? (
              <Text style={styles.empty}>No hay publicaciones en esta vista.</Text>
            ) : (
              posts.map((post, index) => {
                const author =
                  post.user?.username || post.user?.fullName || post.user?.email || 'Usuario';
                const reviewed = !!post.moderationReviewedAt;
                return (
                  <StaggerItem key={post.id} index={index}>
                  <View style={styles.postBlock}>
                    <View style={styles.postTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.author}>@{author}</Text>
                        <Text style={styles.meta}>
                          {new Date(post.createdAt).toLocaleString('es-ES')}
                          {post._count?.reports ? ` · ${post._count.reports} reportes` : ''}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          post.aiFlagged && !reviewed
                            ? styles.badgeAi
                            : reviewed
                              ? styles.badgeOk
                              : styles.badgePending,
                        ]}
                      >
                        <Text style={styles.badgeText}>
                          {post.aiFlagged && !reviewed
                            ? 'IA'
                            : reviewed
                              ? 'Permitida'
                              : 'Nueva'}
                        </Text>
                      </View>
                    </View>

                    {post.aiFlagReason ? (
                      <Text style={styles.aiReason}>Motivo IA: {post.aiFlagReason}</Text>
                    ) : null}

                    {post.text ? <Text style={styles.body}>{post.text}</Text> : null}
                    {post.imageUrl ? (
                      <Image source={{ uri: post.imageUrl }} style={styles.image} />
                    ) : null}

                    {(post.reports || []).slice(0, 3).map((r) => (
                      <Text key={r.id} style={styles.reportLine}>
                        Reporte: {r.reason}
                        {r.description ? ` — ${r.description}` : ''}
                      </Text>
                    ))}

                    <View style={styles.actions}>
                      <Pressable
                        style={[styles.btn, styles.btnAllow]}
                        disabled={acting === post.id || reviewed}
                        onPress={() => act(post.id, 'allow')}
                      >
                        <Text style={styles.btnAllowText}>
                          {reviewed ? 'Ya permitida' : 'Permitir'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.btn, styles.btnDelete]}
                        disabled={acting === post.id}
                        onPress={() => act(post.id, 'remove')}
                      >
                        <Text style={styles.btnDeleteText}>Borrar</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.btn, styles.btnBan]}
                        disabled={acting === post.id || !post.user?.id || post.user?.isBanned}
                        onPress={() =>
                          router.push({
                            pathname: '/panel/moderation-ban',
                            params: {
                              userId: String(post.user!.id),
                              postId: String(post.id),
                              username: author,
                            },
                          } as any)
                        }
                      >
                        <Text style={styles.btnBanText}>
                          {post.user?.isBanned ? 'Baneado' : 'Banear'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  </StaggerItem>
                );
              })
            )}
          </>
        ) : loading ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginTop: Spacing.six }} />
        ) : quizReports.length === 0 ? (
          <Text style={styles.empty}>No hay reportes de quizzes pendientes.</Text>
        ) : (
          quizReports.map((report, index) => (
            <StaggerItem key={report.id} index={index}>
            <View style={styles.postBlock}>
              <Text style={styles.author}>{report.quiz?.title || `Quiz #${report.quiz?.id}`}</Text>
              <Text style={styles.meta}>
                {new Date(report.createdAt).toLocaleString('es-ES')} · {report.reason}
              </Text>
              {report.description ? <Text style={styles.body}>{report.description}</Text> : null}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.btnAllow]}
                  disabled={acting === report.id}
                  onPress={() => reviewQuizReport(report.id, 'DISMISSED')}
                >
                  <Text style={styles.btnAllowText}>Descartar</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnDelete]}
                  disabled={acting === report.id}
                  onPress={() => reviewQuizReport(report.id, 'APPROVED', 'CANCEL_QUIZ')}
                >
                  <Text style={styles.btnDeleteText}>Cancelar quiz</Text>
                </Pressable>
              </View>
            </View>
            </StaggerItem>
          ))
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three },
  tabs: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  tab: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
  },
  tabOn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabText: { fontWeight: '600', color: Colors.light.textSecondary },
  tabOnText: { fontWeight: '700', color: '#fff' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: Colors.light.backgroundElement,
  },
  filterChipOn: { backgroundColor: Colors.light.text },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary },
  filterTextOn: { color: '#fff' },
  empty: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    marginTop: Spacing.six,
    fontSize: 15,
  },
  postBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  postTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  author: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    ...titleTypeface,
  },
  meta: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeAi: { backgroundColor: '#FEE2E2' },
  aiReason: {
    color: '#B91C1C',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.light.text },
  body: { fontSize: 15, lineHeight: 22, color: Colors.light.text },
  image: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#eee' },
  reportLine: { fontSize: 12, color: Colors.light.error },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  btn: {
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    minWidth: 96,
    alignItems: 'center',
  },
  btnAllow: { backgroundColor: '#16A34A' },
  btnAllowText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnDelete: { backgroundColor: '#DC2626' },
  btnDeleteText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnBan: {
    backgroundColor: '#111827',
  },
  btnBanText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
