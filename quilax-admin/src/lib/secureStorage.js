import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'authRefreshToken';
const AUTH_USER_KEY = 'authUser';

let SecureStore = null;

if (Platform.OS !== 'web') {
  try {
    SecureStore = require('expo-secure-store');
  } catch {
    SecureStore = null;
  }
}

async function setItem(key, value) {
  if (SecureStore) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  // Web y fallback: AsyncStorage persiste entre sesiones (localStorage)
  await AsyncStorage.setItem(key, value);
}

async function getItem(key) {
  if (SecureStore) {
    return SecureStore.getItemAsync(key);
  }

  return AsyncStorage.getItem(key);
}

async function removeItem(key) {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await AsyncStorage.removeItem(key);
}

export async function getStoredAuthToken() {
  return getItem(AUTH_TOKEN_KEY);
}

export async function getStoredRefreshToken() {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function saveAuthSession({ accessToken, refreshToken, user }) {
  await setItem(AUTH_TOKEN_KEY, accessToken);
  if (refreshToken) {
    await setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (user) {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
}

export async function clearAuthSession() {
  await removeItem(AUTH_TOKEN_KEY);
  await removeItem(REFRESH_TOKEN_KEY);
  await AsyncStorage.removeItem(AUTH_USER_KEY);
}

export async function getStoredAuthUser() {
  const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveAuthUser(user) {
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
