import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import { DistributionShareVisual } from '@/components/ui/DistributionShareVisual';
import { GradientButton } from '@/components/ui/GradientButton';
import apiClient from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { brandGradientProps, SHARE_COLORS, APP_GRADIENT_SOFT } from '@/constants/gradients';
import { getStoredAuthUser } from '@/lib/secureStorage';

type Tab = 'seasons' | 'winners' | 'distribution' | 'history';

interface Season {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
  jackpotPool?: number;
  isActive?: boolean;
  daysRemaining?: number;
  quizzesCount?: number;
  _count?: { users?: number; seasonWinners?: number };
}

interface SeasonWinnerRow {
  id: number;
  position?: number | null;
  points: number;
  creditsAwarded?: number | null;
  user?: { id: number; username?: string | null; email?: string; fullName?: string | null };
}

interface PositionRule {
  fromPosition: number;
  toPosition: number;
  percentage: number;
}

interface JackpotEntry {
  id: number;
  amount: number;
  source: string;
  description: string;
  createdAt: string;
  quizTitle?: string;
}

const SEASON_DAYS = 45;

const ALL_TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
  { key: 'seasons', label: 'Temporadas' },
  { key: 'winners', label: 'Ganadores' },
  { key: 'distribution', label: 'Reparto jackpot', adminOnly: true },
  { key: 'history', label: 'Historial jackpot' },
];

export default function SeasonsHubScreen() {
  const [role, setRole] = useState<string | null>(null);
  const isPrincipal = role === 'ADMIN';
  const tabs = useMemo(
    () => ALL_TABS.filter((t) => isPrincipal || !t.adminOnly),
    [isPrincipal]
  );

  const [tab, setTab] = useState<Tab>('seasons');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [winnersBySeason, setWinnersBySeason] = useState<Record<number, SeasonWinnerRow[]>>({});
  const [loadingWinnersId, setLoadingWinnersId] = useState<number | null>(null);

  const [distribution, setDistribution] = useState<{ positionRules: PositionRule[] }>({
    positionRules: [
      { fromPosition: 1, toPosition: 1, percentage: 12 },
      { fromPosition: 2, toPosition: 2, percentage: 8 },
      { fromPosition: 3, toPosition: 3, percentage: 6 },
      { fromPosition: 4, toPosition: 4, percentage: 4 },
      { fromPosition: 5, toPosition: 5, percentage: 3.5 },
      { fromPosition: 6, toPosition: 6, percentage: 3 },
      { fromPosition: 7, toPosition: 7, percentage: 2.5 },
      { fromPosition: 8, toPosition: 8, percentage: 2 },
      { fromPosition: 9, toPosition: 9, percentage: 1.5 },
      { fromPosition: 10, toPosition: 10, percentage: 1.5 },
      { fromPosition: 11, toPosition: 25, percentage: 12 },
      { fromPosition: 26, toPosition: 50, percentage: 10 },
      { fromPosition: 51, toPosition: 100, percentage: 12 },
      { fromPosition: 101, toPosition: 200, percentage: 14 },
      { fromPosition: 201, toPosition: 300, percentage: 8 },
    ],
  });
  const [distLoading, setDistLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [jackpotHistory, setJackpotHistory] = useState<JackpotEntry[]>([]);
  const [totalJackpot, setTotalJackpot] = useState(0);
  const [histLoading, setHistLoading] = useState(true);

  const fetchSeasons = useCallback(async () => {
    try {
      const data = await apiClient.get('/admin/seasons');
      setSeasons(data.seasons || []);
    } catch {
      try {
        const data = await apiClient.get('/seasons/history');
        setSeasons(Array.isArray(data) ? data : data.seasons || []);
      } catch {
        setSeasons([]);
      }
    }
  }, []);

  const loadSeasonWinners = useCallback(
    async (seasonId: number) => {
      if (winnersBySeason[seasonId]) return;
      setLoadingWinnersId(seasonId);
      try {
        const data = await apiClient.get(`/admin/seasons/${seasonId}`);
        setWinnersBySeason((prev) => ({
          ...prev,
          [seasonId]: data.winners || [],
        }));
      } catch {
        setWinnersBySeason((prev) => ({ ...prev, [seasonId]: [] }));
      } finally {
        setLoadingWinnersId(null);
      }
    },
    [winnersBySeason]
  );

  const toggleSeason = useCallback(
    async (seasonId: number) => {
      if (expandedId === seasonId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(seasonId);
      await loadSeasonWinners(seasonId);
    },
    [expandedId, loadSeasonWinners]
  );

  const fetchDistribution = useCallback(async () => {
    try {
      setDistLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/prize-config/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.config?.seasonJackpotDistribution) {
        setDistribution(data.config.seasonJackpotDistribution);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDistLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setHistLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/jackpot/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setJackpotHistory(data.history || []);
        setTotalJackpot(data.totalJackpot || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistLoading(false);
    }
  }, []);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const tasks = [fetchSeasons(), fetchHistory()];
      if (isPrincipal) tasks.push(fetchDistribution());
      await Promise.all(tasks);
      setLoading(false);
      setRefreshing(false);
    },
    [fetchSeasons, fetchDistribution, fetchHistory, isPrincipal]
  );

  useEffect(() => {
    getStoredAuthUser().then((user) => setRole(user?.role || 'ADMIN'));
  }, []);

  useEffect(() => {
    if (role == null) return;
    loadAll();
  }, [role, loadAll]);

  useEffect(() => {
    if (!isPrincipal && tab === 'distribution') {
      setTab('seasons');
    }
  }, [isPrincipal, tab]);

  const totalPercentage = distribution.positionRules.reduce((s, r) => s + r.percentage, 0);
  const canSave = Math.abs(totalPercentage - 100) < 0.1;

  const slices = useMemo(
    () =>
      distribution.positionRules.map((rule, i) => ({
        id: `jp-${i}`,
        label:
          rule.fromPosition === rule.toPosition
            ? `Puesto ${rule.fromPosition}`
            : `Puestos ${rule.fromPosition}–${rule.toPosition}`,
        percentage: rule.percentage,
        color: SHARE_COLORS[i % SHARE_COLORS.length],
        fromPosition: rule.fromPosition,
        toPosition: rule.toPosition,
        onChangePercentage: (n: number) =>
          setDistribution((prev) => ({
            positionRules: prev.positionRules.map((r, idx) =>
              idx === i ? { ...r, percentage: n } : r
            ),
          })),
        onChangeFrom: (n: number) =>
          setDistribution((prev) => ({
            positionRules: prev.positionRules.map((r, idx) =>
              idx === i ? { ...r, fromPosition: n } : r
            ),
          })),
        onChangeTo: (n: number) =>
          setDistribution((prev) => ({
            positionRules: prev.positionRules.map((r, idx) =>
              idx === i ? { ...r, toPosition: n } : r
            ),
          })),
        onRemove: () =>
          setDistribution((prev) => ({
            positionRules: prev.positionRules.filter((_, idx) => idx !== i),
          })),
      })),
    [distribution]
  );

  const handleClose = (season: Season) => {
    Alert.alert(
      'Cerrar temporada ahora',
      `Las temporadas cierran solas a los ${SEASON_DAYS} días. Esto reparte el jackpot y abre la siguiente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar y abrir siguiente',
          style: 'destructive',
          onPress: async () => {
            setClosingId(season.id);
            try {
              await apiClient.post(`/admin/seasons/${season.id}/close`);
              Alert.alert('Listo', 'Temporada cerrada y nueva abierta');
              loadAll(true);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cerrar');
            } finally {
              setClosingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSaveDistribution = async () => {
    if (!canSave) {
      Alert.alert('Error', 'El reparto debe sumar exactamente 100%');
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/prize-config/season-jackpot-distribution`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seasonJackpotDistribution: distribution }),
      });
      const data = await response.json();
      if (data.success) Alert.alert('Listo', data.message || 'Guardado');
      else Alert.alert('Error', data.error || 'No se pudo guardar');
    } catch {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const formatRange = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt).toLocaleDateString('es-ES');
    const end = new Date(endsAt).toLocaleDateString('es-ES');
    return `${start} – ${end}`;
  };

  if (loading) {
    return (
      <AppScreen>
        <AppHeader title="Temporadas" subtitle={`${SEASON_DAYS} días · jackpot`} />
        <ActivityIndicator style={{ marginTop: Spacing.six }} color={Colors.light.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Temporadas" subtitle={`Automáticas · ${SEASON_DAYS} días · jackpot`} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} />}
      >
        <View style={styles.tabs}>
          {tabs.map(({ key, label }) =>
            tab === key ? (
              <Pressable key={key} onPress={() => setTab(key)}>
                <LinearGradient {...brandGradientProps} style={styles.tabActive}>
                  <Text style={styles.tabTextActive}>{label}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable key={key} style={styles.tab} onPress={() => setTab(key)}>
                <Text style={styles.tabText}>{label}</Text>
              </Pressable>
            )
          )}
        </View>

        {tab === 'seasons' && (
          <View style={styles.section}>
            <Text style={styles.hint}>
              Cada temporada dura {SEASON_DAYS} días. Al terminar se cierra sola, se reparte el jackpot y
              arranca la siguiente. Toca una temporada para ver su registro de ganadores.
            </Text>
            {seasons.length === 0 ? (
              <Text style={styles.empty}>No hay temporadas.</Text>
            ) : (
              seasons.map((season) => (
                <AppCard key={season.id}>
                  <Pressable onPress={() => toggleSeason(season.id)}>
                    <View style={styles.cardHead}>
                      <Text style={styles.name}>{season.name}</Text>
                      {season.isActive ? (
                        <LinearGradient {...brandGradientProps} style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Activa</Text>
                        </LinearGradient>
                      ) : (
                        <Text style={styles.closedBadge}>Cerrada</Text>
                      )}
                    </View>
                    <Text style={styles.meta}>
                      Jackpot: {season.jackpotPool ?? 0} créditos · {formatRange(season.startsAt, season.endsAt)}
                    </Text>
                    <Text style={styles.meta}>
                      Ganadores registrados: {season._count?.seasonWinners ?? 0}
                      {season.daysRemaining != null && season.isActive
                        ? ` · Días restantes: ${season.daysRemaining}`
                        : ''}
                    </Text>
                    <Text style={styles.expandHint}>
                      {expandedId === season.id ? 'Ocultar ganadores' : 'Ver ganadores'}
                    </Text>
                  </Pressable>
                  {expandedId === season.id ? (
                    <View style={styles.winnersBlock}>
                      {loadingWinnersId === season.id ? (
                        <ActivityIndicator color={Colors.light.primary} />
                      ) : (winnersBySeason[season.id] || []).length === 0 ? (
                        <Text style={styles.empty}>Sin ganadores registrados aún.</Text>
                      ) : (
                        (winnersBySeason[season.id] || []).map((w, i) => (
                          <View key={w.id || i} style={styles.winnerRow}>
                            <Text style={styles.winnerPos}>{w.position ?? i + 1}</Text>
                            <Text style={styles.winnerName} numberOfLines={1}>
                              {w.user?.fullName || w.user?.username || w.user?.email || `User ${w.user?.id}`}
                            </Text>
                            <Text style={styles.winnerMeta}>
                              {w.points} pts
                              {w.creditsAwarded != null ? ` · ${w.creditsAwarded} cr` : ''}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  ) : null}
                  {isPrincipal && season.isActive ? (
                    <Pressable
                      style={[styles.closeBtn, closingId === season.id && styles.disabled]}
                      disabled={closingId === season.id}
                      onPress={() => handleClose(season)}
                    >
                      <Text style={styles.closeBtnText}>
                        {closingId === season.id ? 'Cerrando…' : 'Cierre de emergencia'}
                      </Text>
                    </Pressable>
                  ) : null}
                </AppCard>
              ))
            )}
          </View>
        )}

        {tab === 'winners' && (
          <View style={styles.section}>
            <Text style={styles.hint}>
              Archivo de ganadores de todas las temporadas cerradas. El registro se guarda al cerrar cada
              temporada.
            </Text>
            {seasons.filter((s) => !s.isActive).length === 0 ? (
              <Text style={styles.empty}>Aún no hay temporadas cerradas con palmarés.</Text>
            ) : (
              seasons
                .filter((s) => !s.isActive)
                .map((season) => (
                  <AppCard key={`w-${season.id}`}>
                    <Pressable onPress={() => toggleSeason(season.id)}>
                      <View style={styles.cardHead}>
                        <Text style={styles.name}>{season.name}</Text>
                        <Text style={styles.plus}>{season.jackpotPool ?? 0} cr</Text>
                      </View>
                      <Text style={styles.meta}>{formatRange(season.startsAt, season.endsAt)}</Text>
                      <Text style={styles.meta}>
                        {season._count?.seasonWinners ?? 0} ganadores · toca para ver lista
                      </Text>
                    </Pressable>
                    {expandedId === season.id ? (
                      <View style={styles.winnersBlock}>
                        {loadingWinnersId === season.id ? (
                          <ActivityIndicator color={Colors.light.primary} />
                        ) : (winnersBySeason[season.id] || []).length === 0 ? (
                          <Text style={styles.empty}>Sin ganadores en esta temporada.</Text>
                        ) : (
                          (winnersBySeason[season.id] || []).map((w, i) => (
                            <View key={w.id || i} style={styles.winnerRow}>
                              <Text style={styles.winnerPos}>{w.position ?? i + 1}</Text>
                              <Text style={styles.winnerName} numberOfLines={1}>
                                {w.user?.fullName ||
                                  w.user?.username ||
                                  w.user?.email ||
                                  `User ${w.user?.id}`}
                              </Text>
                              <Text style={styles.winnerMeta}>
                                {w.points} pts
                                {w.creditsAwarded != null ? ` · ${w.creditsAwarded} cr` : ''}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    ) : null}
                  </AppCard>
                ))
            )}
          </View>
        )}

        {tab === 'distribution' && (
          <View style={styles.section}>
            <Text style={styles.hint}>
              Cómo se reparte el bote de temporada entre puestos (hasta 300). Debe sumar 100%.
            </Text>
            {distLoading ? (
              <ActivityIndicator color={Colors.light.primary} />
            ) : (
              <>
                <DistributionShareVisual
                  slices={slices}
                  total={totalPercentage}
                  valid={canSave}
                  onAddSlice={() => {
                    const last = distribution.positionRules[distribution.positionRules.length - 1];
                    const next = last ? last.toPosition + 1 : 1;
                    setDistribution((prev) => ({
                      positionRules: [
                        ...prev.positionRules,
                        { fromPosition: next, toPosition: next, percentage: 0 },
                      ],
                    }));
                  }}
                  addLabel="Añadir rango"
                />

                <GradientButton
                  label={saving ? 'Guardando…' : 'Guardar reparto'}
                  onPress={handleSaveDistribution}
                  disabled={!canSave || saving}
                />
              </>
            )}
          </View>
        )}

        {tab === 'history' && (
          <View style={styles.section}>
            <LinearGradient colors={[...APP_GRADIENT_SOFT]} style={styles.jackpotBalance}>
              <Text style={styles.balanceLabel}>Balance jackpot</Text>
              <Text style={styles.balanceValue}>{totalJackpot}</Text>
              <Text style={styles.balanceUnit}>créditos</Text>
            </LinearGradient>
            {histLoading ? (
              <ActivityIndicator color={Colors.light.primary} />
            ) : jackpotHistory.length === 0 ? (
              <Text style={styles.empty}>Sin movimientos de jackpot.</Text>
            ) : (
              jackpotHistory.map((entry) => (
                <AppCard key={entry.id}>
                  <View style={styles.cardHead}>
                    <Text style={styles.name}>{entry.source}</Text>
                    <Text style={styles.plus}>+{entry.amount} cr</Text>
                  </View>
                  <Text style={styles.meta}>
                    {new Date(entry.createdAt).toLocaleString('es-ES')}
                  </Text>
                  {entry.description ? <Text style={styles.meta}>{entry.description}</Text> : null}
                  {entry.quizTitle ? <Text style={styles.meta}>Quiz: {entry.quizTitle}</Text> : null}
                </AppCard>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 48 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.light.backgroundSelected,
  },
  tabActive: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary },
  tabTextActive: { ...titleTypeface, fontSize: 13, fontWeight: '800', color: '#fff' },
  section: { gap: Spacing.two },
  hint: { color: Colors.light.textSecondary, fontSize: 13, lineHeight: 18 },
  empty: { color: Colors.light.textSecondary, paddingVertical: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { ...titleTypeface, fontWeight: '700', color: Colors.light.text, flex: 1, fontSize: 16 },
  meta: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 },
  activeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  closedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.backgroundSelected,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  expandHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  winnersBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
    gap: 6,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  winnerPos: {
    width: 28,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.text,
  },
  winnerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  winnerMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  closeBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeBtnText: { color: Colors.light.error, fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.5 },
  jackpotBalance: {
    borderRadius: 18,
    padding: Spacing.five,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  balanceLabel: { color: Colors.light.textSecondary, fontWeight: '600' },
  balanceValue: {
    ...titleTypeface,
    fontSize: 40,
    fontWeight: '800',
    color: Colors.light.text,
    marginTop: 4,
  },
  balanceUnit: { color: Colors.light.textSecondary, fontSize: 13 },
  plus: { ...titleTypeface, fontWeight: '800', color: Colors.light.primary, fontSize: 16 },
});
