import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { brandGradientProps, APP_GRADIENT_SOFT, GRADIENT_VERTICAL } from '@/constants/gradients';
import { ADMIN_NAV_ITEMS } from '@/constants/adminNav';
import { getStoredAuthUser, clearAuthSession } from '@/lib/secureStorage';
import apiClient from '@/lib/api';
import { HeroEnter, PressScale, StaggerItem } from '@/components/motion';

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
      <HeroEnter>
        <LinearGradient {...brandGradientProps} style={styles.brandBlock}>
          <Text style={styles.brandMark}>QUILAX</Text>
          <Text style={styles.brandSub}>Panel de gestión</Text>
        </LinearGradient>
      </HeroEnter>
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {items.map((item, index) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          if (active) {
            return (
              <StaggerItem key={item.href} index={index}>
                <PressScale onPress={() => router.push(item.href as any)} scaleTo={0.98}>
                  <LinearGradient
                    colors={['#EFF6FF', '#F5F3FF', '#FEE2E2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.linkActive}
                  >
                    <View style={styles.activeBar} />
                    <Text style={styles.linkTextActive}>{item.label}</Text>
                  </LinearGradient>
                </PressScale>
              </StaggerItem>
            );
          }
          return (
            <StaggerItem key={item.href} index={index}>
              <PressScale
                style={styles.link}
                onPress={() => router.push(item.href as any)}
                scaleTo={0.98}
              >
                <Text style={styles.linkText}>{item.label}</Text>
              </PressScale>
            </StaggerItem>
          );
        })}
      </ScrollView>
      <PressScale style={styles.logout} onPress={handleLogout} scaleTo={0.97}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: 'rgba(255,252,248,0.92)',
    paddingBottom: Spacing.three,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(28,25,23,0.06)',
    // @ts-expect-error web-only
    backdropFilter: 'blur(12px)',
    boxShadow: '4px 0 24px rgba(28,25,23,0.04)',
  },
  brandBlock: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 18,
  },
  brandMark: {
    ...titleTypeface,
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3.2,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  nav: { flex: 1, paddingHorizontal: Spacing.two, paddingTop: Spacing.two },
  link: {
    paddingVertical: 11,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    marginBottom: 2,
  },
  linkActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    marginBottom: 2,
    gap: 10,
    // @ts-expect-error web-only
    boxShadow: '0 4px 16px rgba(28,25,23,0.06)',
  },
  activeBar: {
    width: 4,
    height: 18,
    borderRadius: 4,
    backgroundColor: Colors.light.gradientEnd,
  },
  linkText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  linkTextActive: {
    ...titleTypeface,
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '700',
  },
  logout: {
    marginHorizontal: Spacing.two,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.12)',
  },
  logoutText: {
    color: Colors.light.error,
    fontWeight: '700',
    textAlign: 'center',
  },
});
