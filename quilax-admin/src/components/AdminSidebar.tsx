import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { ADMIN_NAV_ITEMS } from '@/constants/adminNav';
import { getStoredAuthUser, clearAuthSession } from '@/lib/secureStorage';
import apiClient from '@/lib/api';

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    getStoredAuthUser().then((user) => setRole(user?.role || 'ADMIN'));
  }, []);

  const items = ADMIN_NAV_ITEMS.filter(
    (item) => !role || item.roles.includes(role as 'ADMIN' | 'ADMIN_WORKER')
  );

  const handleLogout = async () => {
    await clearAuthSession();
    apiClient.clearToken();
    router.replace('/auth/login');
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.sidebar}>
      <Text style={styles.brand}>Quilax Admin</Text>
      <ScrollView style={styles.nav}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Pressable
              key={item.href}
              style={[styles.link, active && styles.linkActive]}
              onPress={() => router.push(item.href as any)}
            >
              <Text style={[styles.linkText, active && styles.linkTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#1e293b',
    paddingVertical: Spacing.four,
    height: '100%',
  },
  brand: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  nav: { flex: 1 },
  link: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  linkActive: {
    backgroundColor: '#334155',
  },
  linkText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  linkTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  logout: {
    padding: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  logoutText: {
    color: '#f87171',
    fontWeight: '600',
  },
});
