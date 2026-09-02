import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import apiClient from '@/lib/api';

let Notifications = null;
try {
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

const TOKEN_KEY = 'quilaxPushToken';

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    undefined
  );
}

export function isPushSupported() {
  if (!Notifications) return false;
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && 'Notification' in window;
  }
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function configureNotificationHandler() {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Extrae ruta interna desde data de una notificación */
export function resolveNotificationHref(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.href && typeof data.href === 'string') return data.href;
  if (data.quizId) return `/(app)/quiz/${data.quizId}`;
  if (data.quizRunId) return `/(app)/quiz/run/${data.quizRunId}`;
  if (data.notificationId) return `/(app)/messages/notice/${data.notificationId}`;
  return null;
}

/**
 * Escucha toques en notificaciones push y navega al quiz / aviso.
 * `router` = expo-router useRouter().
 */
export function attachNotificationResponseListener(router) {
  if (!Notifications || !router) return () => {};

  const go = (response) => {
    const data = response?.notification?.request?.content?.data;
    const href = resolveNotificationHref(data);
    if (href) {
      try {
        router.push(href);
      } catch {
        Linking.openURL(Linking.createURL(href.replace('/(app)/', '')));
      }
    }
  };

  const sub = Notifications.addNotificationResponseReceivedListener(go);

  Notifications.getLastNotificationResponseAsync?.()
    .then((last) => {
      if (last) go(last);
    })
    .catch(() => {});

  return () => {
    try {
      sub?.remove?.();
    } catch {
      /* ignore */
    }
  };
}

export async function getPushPermissionStatus() {
  if (!Notifications || !isPushSupported()) {
    return { status: 'unavailable', granted: false };
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return { status, granted: status === 'granted' };
  } catch {
    return { status: 'unavailable', granted: false };
  }
}

/**
 * Re-registra token solo si el permiso ya estaba concedido (sin volver a pedir diálogo).
 */
export async function refreshPushTokenIfGranted() {
  if (!Notifications || !isPushSupported()) {
    return { success: false, reason: 'unsupported' };
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, reason: 'not-granted' };
    }
    return registerForPushNotificationsAsync();
  } catch (error) {
    return { success: false, reason: error?.message || 'error' };
  }
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications || !isPushSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  try {
    await configureNotificationHandler();

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('quilax-default', {
        name: 'Quilax',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E85D04',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { success: false, reason: 'denied' };
    }

    if (Platform.OS === 'web') {
      // Intentar token web de Expo; si no hay, al menos queda el permiso del navegador
      try {
        const projectId = getProjectId();
        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        const token = tokenResponse?.data;
        if (token) {
          await apiClient.post('/profile/push-token', {
            token,
            platform: 'web',
          });
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem(TOKEN_KEY, token);
          } catch {
            /* ignore */
          }
          return { success: true, token };
        }
      } catch {
        /* web push no disponible en este entorno */
      }
      return { success: true, reason: 'web-permission-only', token: null };
    }

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data;
    if (!token) return { success: false, reason: 'no-token' };

    await apiClient.post('/profile/push-token', {
      token,
      platform: Platform.OS,
    });

    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }

    return { success: true, token };
  } catch (error) {
    console.warn('Push register failed:', error?.message || error);
    return { success: false, reason: error?.message || 'error' };
  }
}

export async function unregisterPushToken() {
  if (!Notifications) return;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      await apiClient
        .delete(`/profile/push-token?token=${encodeURIComponent(token)}`)
        .catch(() => {});
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export default {
  isPushSupported,
  configureNotificationHandler,
  getPushPermissionStatus,
  refreshPushTokenIfGranted,
  registerForPushNotificationsAsync,
  unregisterPushToken,
  resolveNotificationHref,
  attachNotificationResponseListener,
};
