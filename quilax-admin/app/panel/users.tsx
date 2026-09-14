import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import {
  APP_GRADIENT,
  GRADIENT_HORIZONTAL,
} from '@/constants/gradients';
import CustomIcon from '@/components/CustomIcon';
import adminService from '@/services/adminService';
import {
  AppScreen,
  AppHeader,
  AppSection,
  AppCard,
} from '@/components/ui/AppScreen';

type RoleFilter = 'ALL' | 'USER' | 'ADMIN' | 'ADMIN_WORKER';

type AdminUser = {
  id: number;
  email: string;
  username?: string | null;
  fullName?: string | null;
  role: string;
  balance?: number;
  points?: number;
  isBanned?: boolean;
};

const FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'USER', label: 'Usuarios' },
  { id: 'ADMIN', label: 'Admins' },
  { id: 'ADMIN_WORKER', label: 'Workers' },
];

function roleLabel(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'ADMIN_WORKER':
      return 'Worker';
    default:
      return 'Usuario';
  }
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  if (active) {
    return (
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={[...APP_GRADIENT]}
          style={styles.filterChipActive}
          {...GRADIENT_HORIZONTAL}
        >
          <Text style={styles.filterChipTextActive}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.filterChip} onPress={onPress}>
      <Text style={styles.filterChipText}>{label}</Text>
    </Pressable>
  );
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [banningId, setBanningId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUsers = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const result = await adminService.getUsers(1, 100, query);
      if (result.success) {
        setUsers(result.data?.users ?? []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers('');
  }, [loadUsers]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadUsers(search.trim());
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => roleFilter === 'ALL' || user.role === roleFilter);
  }, [users, roleFilter]);

  const handleBan = (user: AdminUser) => {
    if (user.role !== 'USER') {
      Alert.alert('No permitido', 'Solo se pueden banear cuentas de usuario normales.');
      return;
    }

    if (user.isBanned) {
      Alert.alert(
        'Desbanear usuario',
        `¿Reactivar a ${user.username ? `@${user.username}` : user.email}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desbanear',
            onPress: async () => {
              setBanningId(user.id);
              const result = await adminService.unbanUser(user.id);
              setBanningId(null);
              if (result.success) {
                Alert.alert('Éxito', 'Usuario desbaneado');
                loadUsers(search.trim());
              } else {
                Alert.alert('Error', result.error || 'No se pudo desbanear');
              }
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Banear usuario',
      `¿Seguro que quieres banear a ${user.username ? `@${user.username}` : user.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Banear',
          style: 'destructive',
          onPress: async () => {
            setBanningId(user.id);
            const result = await adminService.banUser(user.id, {
              category: 'CONTENT',
              permanent: true,
              reason: 'Baneado desde el panel admin',
              message:
                'Tu cuenta ha sido suspendida. Si el motivo es contenido inapropiado, puedes recuperar el saldo restante desde Gestión (Wallet).',
            });
            setBanningId(null);
            if (result.success) {
              Alert.alert('Éxito', 'Usuario baneado correctamente');
              loadUsers(search.trim());
            } else {
              Alert.alert('Error', result.error || 'No se pudo banear al usuario');
            }
          },
        },
      ],
    );
  };

  const handleHistory = async (user: AdminUser) => {
    const result = await adminService.getUserHistory(user.id);
    if (!result.success) {
      Alert.alert('Error', result.error || 'No se pudo cargar el historial');
      return;
    }
    const hist = result.data?.history || result.data;
    const played = hist?.participated || [];
    const prizes = hist?.prizes || [];
    const privacy =
      result.data?.user?.showQuizHistory === false
        ? ' (historial privado en app — visible para admin)'
        : '';
    const lines = [
      `Jugados: ${played.length}${privacy}`,
      ...played.slice(0, 8).map(
        (p: any) => `· ${p.title || 'Quiz'} — ${p.score ?? 0} pts`,
      ),
      '',
      `Premios: ${prizes.length}`,
      ...prizes.slice(0, 5).map(
        (p: any) => `· ${p.title || 'Quiz'} — +${p.creditsWon ?? 0} cr.`,
      ),
    ];
    Alert.alert(
      user.username ? `@${user.username}` : user.email,
      lines.join('\n') || 'Sin historial',
    );
  };

  return (
    <AppScreen>
      <AppHeader title="Usuarios" subtitle="Gestión de cuentas" badge="Admin" />

      <AppSection title="Buscar" accentIndex={0}>
        <View style={styles.searchWrap}>
          <CustomIcon name="search" size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Email, nombre o @usuario"
            placeholderTextColor={Colors.light.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
      </AppSection>

      <AppSection title="Filtrar por rol" accentIndex={1}>
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <FilterChip
              key={filter.id}
              label={filter.label}
              active={roleFilter === filter.id}
              onPress={() => setRoleFilter(filter.id)}
            />
          ))}
        </View>
      </AppSection>

      <AppSection title={`${filteredUsers.length} resultados`} accentIndex={2}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.light.primary} />
            <Text style={styles.loadingText}>Cargando usuarios…</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <AppCard tint="cool">
            <Text style={styles.emptyText}>No hay usuarios con ese criterio.</Text>
          </AppCard>
        ) : (
          filteredUsers.map((user) => (
            <AppCard key={user.id} tint="default">
              <View style={styles.userTop}>
                <View style={styles.userIdentity}>
                  <Text style={styles.userName}>
                    {user.username ? `@${user.username}` : user.fullName || 'Sin nombre'}
                  </Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{roleLabel(user.role)}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <Text style={styles.stat}>Saldo: {user.balance ?? 0} cr.</Text>
                <Text style={styles.stat}>Puntos: {user.points ?? 0}</Text>
                {user.isBanned ? <Text style={[styles.stat, { color: Colors.light.error }]}>Baneado</Text> : null}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.banButtonWrap}
                  onPress={() => handleHistory(user)}
                >
                  <View style={[styles.banButton, styles.historyButton]}>
                    <Text style={styles.banButtonText}>Historial</Text>
                  </View>
                </Pressable>
                {user.role === 'USER' ? (
                  <Pressable
                    style={styles.banButtonWrap}
                    onPress={() => handleBan(user)}
                    disabled={banningId === user.id}
                  >
                    <View style={[styles.banButton, banningId === user.id && styles.buttonDisabled, user.isBanned && styles.unbanButton]}>
                      <Text style={styles.banButtonText}>
                        {banningId === user.id
                          ? '…'
                          : user.isBanned
                            ? 'Desbanear'
                            : 'Banear'}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </AppCard>
          ))
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: Spacing.two,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  filterChipActive: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  filterChipTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingBox: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  loadingText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  userTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  userIdentity: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  rolePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  stat: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  banButtonWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  banButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    backgroundColor: Colors.light.error,
    borderRadius: 12,
  },
  historyButton: {
    backgroundColor: Colors.light.primary,
    marginRight: Spacing.two,
  },
  banButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  unbanButton: {
    backgroundColor: Colors.light.success,
  },
});
