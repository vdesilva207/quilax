import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const canUseSecureStore = Platform.OS !== 'web';

const secureStorage = {
  async setItem(key, value) {
    if (canUseSecureStore) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },

  async getItem(key) {
    if (canUseSecureStore) {
      return SecureStore.getItemAsync(key);
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },

  async removeItem(key) {
    if (canUseSecureStore) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },
};

export default secureStorage;
