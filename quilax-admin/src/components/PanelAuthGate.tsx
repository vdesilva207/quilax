import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect, useRouter, useSegments } from 'expo-router';
import apiClient, { restoreStoredSession } from '@/lib/api';
import { getStoredAuthUser } from '@/lib/secureStorage';

type Props = {
  children: React.ReactNode;
};

export default function PanelAuthGate({ children }: Props) {
  const router = useRouter();
  const segments = useSegments();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const session = await restoreStoredSession(apiClient);
      if (!mounted) return;

      if (session.ok) {
        const user = await getStoredAuthUser();
        setAuthenticated(true);
        setUserRole(user?.role || null);
      } else {
        setAuthenticated(false);
      }
      setLoading(false);
    })();

    apiClient.setSessionExpiredHandler(() => {
      setAuthenticated(false);
      router.replace('/auth/login');
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const inAuth = segments[0] === 'auth';

  if (!authenticated && !inAuth) {
    return <Redirect href="/auth/login" />;
  }

  if (authenticated && inAuth) {
    const isWorker = userRole === 'ADMIN_WORKER';
    return <Redirect href={isWorker ? '/panel/worker-dashboard' : '/panel/dashboard'} />;
  }

  return <>{children}</>;
}
