import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import secureStorage from '@/lib/secureStorage';
import { isAccessTokenExpired } from '@/lib/tokenUtils';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function mapProfileToUser(prev, profile) {
  const pick = (key, transform) => {
    if (profile[key] === undefined) return prev?.[key];
    return transform ? transform(profile[key]) : profile[key];
  };
  return {
    ...(prev || {}),
    id: pick('id') ?? prev?.id,
    email: pick('email') ?? prev?.email,
    role: pick('role') ?? prev?.role,
    fullName: pick('fullName'),
    balance: pick('balance'),
    currency: pick('currency'),
    country: pick('country'),
    province: pick('province'),
    gender: pick('gender'),
    dateOfBirth: pick('dateOfBirth'),
    emailVerified: profile.emailVerified !== undefined ? !!profile.emailVerified : !!prev?.emailVerified,
    idDocumentUrl: pick('idDocumentUrl'),
    idVerified: profile.idVerified !== undefined ? !!profile.idVerified : !!prev?.idVerified,
    verificationVideoUrl: pick('verificationVideoUrl'),
    livenessCompletedAt: pick('livenessCompletedAt'),
    username: pick('username'),
    bio: pick('bio'),
    profilePhoto: pick('profilePhoto'),
    showQuizHistory: pick('showQuizHistory'),
    showPrizes: pick('showPrizes'),
    profilePublic: pick('profilePublic'),
    statistics: pick('statistics'),
    winnings: pick('winnings'),
    seasonPoints: profile.seasonPoints ?? profile.season?.seasonPoints ?? prev?.seasonPoints ?? 0,
    seasonRank: profile.seasonRank ?? profile.season?.seasonRank ?? prev?.seasonRank ?? null,
    seasonName: profile.seasonName ?? profile.season?.seasonName ?? prev?.seasonName ?? null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadAuth();
  }, []);

  // Never leave the whole app on loading=true (e.g. hung AsyncStorage on web).
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('[auth] boot timeout — clearing loading spinner');
        return false;
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Keep apiClient Authorization in sync (HMR / remounts can clear the singleton token).
  useEffect(() => {
    if (token) apiClient.setToken(token);
    else apiClient.clearToken();
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    import('@/services/pushNotifications')
      .then((m) => m.refreshPushTokenIfGranted())
      .catch(() => {});
  }, [isAuthenticated, token]);

  const clearLocalSession = async () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    apiClient.clearToken();
    await secureStorage.removeItem('authToken');
    await secureStorage.removeItem('authUser');
  };

  const persistSession = async (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setIsAuthenticated(true);
    apiClient.setToken(nextToken);
    await secureStorage.setItem('authToken', nextToken);
    await secureStorage.setItem('authUser', JSON.stringify(nextUser));
  };

  const refreshProfile = async ({ full = false } = {}) => {
    try {
      // lite=1 skips season rank / aggregates (was 20–30s locally and timed out login).
      const data = await apiClient.get(full ? '/profile/me' : '/profile/me?lite=1');
      const profile = data.profile || data;
      if (!profile) return { success: false };
      // Prefer in-memory user; fall back to storage (login just persisted before setState flushes).
      let prev = user;
      if (!prev) {
        try {
          const raw = await secureStorage.getItem('authUser');
          if (raw) prev = JSON.parse(raw);
        } catch {
          prev = null;
        }
      }
      const nextUser = mapProfileToUser(prev, profile);
      setUser(nextUser);
      await secureStorage.setItem('authUser', JSON.stringify(nextUser));
      return { success: true, user: nextUser, profile };
    } catch (error) {
      console.error('Refresh profile error:', error);
      if (error?.status === 401) {
        await clearLocalSession();
      }
      return { success: false, error: error.message, status: error?.status };
    }
  };

  const loadAuth = async () => {
    try {
      const storedToken = await secureStorage.getItem('authToken');
      const storedUser = await secureStorage.getItem('authUser');

      if (storedToken && storedUser) {
        if (isAccessTokenExpired(storedToken)) {
          await clearLocalSession();
          return;
        }

        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        apiClient.setToken(storedToken);
        setIsAuthenticated(true);
        // Refresh KYC / onboarding flags — never block app start on slow profile.
        refreshProfile().catch(() => {});
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const data = await apiClient.post('/auth/login', { email, password });
      await persistSession(data.token, {
        ...data.user,
        emailVerified: !!data.user?.emailVerified,
        idVerified: !!data.user?.idVerified,
      });
      // Login nunca reanuda onboarding de registro (moneda / país / Stripe).
      try {
        const { clearRegistrationOnboarding } = await import('@/utils/onboardingGate');
        await clearRegistrationOnboarding();
      } catch {
        /* ignore */
      }
      // Preferimos el user del login (ya trae emailVerified) para la navegación inmediata.
      refreshProfile().catch(() => {});
      import('@/services/pushNotifications')
        .then((m) => m.refreshPushTokenIfGranted())
        .catch(() => {});
      return {
        success: true,
        user: {
          ...data.user,
          emailVerified: !!data.user?.emailVerified,
          idVerified: !!data.user?.idVerified,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code || error.payload?.code,
      };
    }
  };

  const register = async ({ email, password, fullName, dateOfBirth, country, nationality } = {}) => {
    try {
      // SMTP puede tardar; el backend ya no bloquea, pero damos margen al cliente
      const data = await apiClient.post(
        '/auth/register',
        {
          email,
          password,
          fullName,
          dateOfBirth,
          country: country || nationality,
        },
        { timeoutMs: 45000 }
      );
      await persistSession(data.token, {
        ...data.user,
        emailVerified: !!data.user?.emailVerified,
      });
      return { success: true, user: data.user, delivered: data.delivered, verificationCode: data.verificationCode };
    } catch (error) {
      console.error('Register error:', error);
      const i18n = (await import('@/i18n')).default;
      const msg = String(error?.message || '');
      const code = error?.code || error?.payload?.code;
      if (code === 'EMAIL_EXISTS' || /ya existe|already exists|already registered/i.test(msg)) {
        return { success: false, error: i18n.t('auth.registerScreen.alreadyExists'), code: 'EMAIL_EXISTS' };
      }
      if (/timeout|aborted|agotado/i.test(msg) || error?.name === 'AbortError') {
        return { success: false, error: i18n.t('common.requestTimeout') };
      }
      const network =
        /network request failed/i.test(msg) ||
        /failed to fetch/i.test(msg) ||
        error?.name === 'TypeError';
      if (network) {
        return {
          success: false,
          error: i18n.t('auth.registerScreen.networkError'),
        };
      }
      return { success: false, error: error.message, code };
    }
  };

  const logout = async () => {
    try {
      await import('@/services/pushNotifications')
        .then((m) => m.unregisterPushToken())
        .catch(() => {});
      if (token) {
        await apiClient.post('/auth/logout').catch(() => {});
      }
    } finally {
      await clearLocalSession();
    }
    return { success: true };
  };

  const updateUser = async (payload) => {
    try {
      const data = await apiClient.put('/profile/me', payload);
      const profile = data.user || data.profile || data;
      // Merge partial PUT response without wiping season stats / missing flags
      const nextUser = {
        ...(user || {}),
        ...profile,
        emailVerified:
          profile.emailVerified !== undefined
            ? !!profile.emailVerified
            : !!user?.emailVerified,
        idVerified:
          profile.idVerified !== undefined ? !!profile.idVerified : !!user?.idVerified,
      };
      setUser(nextUser);
      await secureStorage.setItem('authUser', JSON.stringify(nextUser));
      return { success: true, user: nextUser };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    refreshProfile,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
