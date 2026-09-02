import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { attachNotificationResponseListener } from '@/services/pushNotifications';

/** Escucha toques en push y lleva al quiz / aviso correspondiente */
export default function PushNotificationBootstrap() {
  const router = useRouter();
  const { isAuthenticated } = useAuth() as any;

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return attachNotificationResponseListener(router);
  }, [isAuthenticated, router]);

  return null;
}
