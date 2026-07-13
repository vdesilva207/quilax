import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
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

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminService.getUsers(1, 100);
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
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      if (!query) return true;
      const haystack = [user.email, user.username, user.fullName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search, roleFilter]);

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
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.actionGradientWrap}>
                  <LinearGradient
                    colors={[...APP_GRADIENT]}
                    style={styles.actionGradient}
                    {...GRADIENT_HORIZONTAL}
                  >
                    <Text style={styles.actionGradientText}>Gestionar</Text>
                  </LinearGradient>
                </Pressable>
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
  actionGradientWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  actionGradientText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
