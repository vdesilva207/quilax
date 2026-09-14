import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing } from '@/constants/theme';
import adminService from '@/services/adminService';
import apiClient from '@/lib/api';
import { saveAuthSession } from '@/lib/secureStorage';
import { decodeJwtPayload } from '@/lib/tokenUtils';
import PasswordInput from '@/components/ui/PasswordInput';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthSecondaryButton,
  AuthCard,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

type Step = 'email' | 'secret' | 'password' | 'code';

const STEP_ORDER: Step[] = ['email', 'secret', 'password', 'code'];

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  email: { title: 'Quilax Admin', subtitle: 'Introduce tu email de administrador' },
  secret: { title: 'Acceso al panel', subtitle: 'Introduce la contraseña secreta del panel' },
  password: { title: 'Iniciar sesión', subtitle: 'Introduce tu contraseña personal' },
  code: { title: 'Verificación 2FA', subtitle: 'Introduce el código de Google Authenticator' },
};

export default function AdminLoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

  const goBack = () => {
    setError('');
    if (step === 'secret') setStep('email');
    else if (step === 'password') setStep('secret');
    else if (step === 'code') setStep('password');
  };

  const handleEmailSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Introduce tu email');
      return;
    }
    setError('');
    setLoading(true);
    const result = await adminService.checkAdmin(normalizedEmail);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'No se pudo verificar el email');
      return;
    }
    if (!result.isAdmin) {
      setError('Esta cuenta no tiene permisos de administración');
      return;
    }
    setStep('secret');
  };

  const handleSecretSubmit = async () => {
    if (!secretPassword) {
      setError('Introduce la contraseña secreta del panel');
      return;
    }
    setError('');
    setLoading(true);
    const result = await adminService.verifySecret(secretPassword);
    setLoading(false);

    if (!result.success || !result.verified) {
      setError(result.error || 'Contraseña secreta incorrecta');
      return;
    }
    setStep('password');
  };

  const finishLogin = async (token: string, userId?: number) => {
    const payload = decodeJwtPayload(token);
    const role = payload?.role === 'ADMIN_WORKER' ? 'ADMIN_WORKER' : 'ADMIN';
    const user = {
      id: userId || payload?.id || 0,
      email: email.trim().toLowerCase(),
      role,
    };

    apiClient.setToken(token);
    await saveAuthSession({ accessToken: token, user });
    router.replace(role === 'ADMIN_WORKER' ? '/panel/worker-dashboard' : '/panel/dashboard');
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      setError('Introduce tu contraseña');
      return;
    }
    setError('');
    setLoading(true);
    const result = await adminService.login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'No se pudo iniciar sesión');
      return;
    }

    const { requiresTwoFactor, userId, qrCode: qr, manualSecret } = result.data || {};

    if (!requiresTwoFactor || !userId) {
      setError('Respuesta inesperada del servidor');
      return;
    }

    setPendingUserId(userId);
    setQrCode(qr || null);
    // Si el backend no manda manualSecret, extraerlo de otpauth://...secret=XXX
    let secret = manualSecret || null;
    if (!secret && typeof qr === 'string' && qr.includes('secret=')) {
      try {
        const u = new URL(qr);
        secret = u.searchParams.get('secret');
      } catch {
        const m = qr.match(/[?&]secret=([^&]+)/i);
        secret = m ? decodeURIComponent(m[1]) : null;
      }
    }
    setManualSecret(secret);
    setCode('');
    setStep('code');
  };

  const handleCodeSubmit = async () => {
    if (!code.trim()) {
      setError('Introduce el código de 6 dígitos');
      return;
    }
    if (!pendingUserId) {
      setError('Sesión inválida, vuelve a intentarlo desde el principio');
      setStep('email');
      return;
    }
    setError('');
    setLoading(true);
    const result = await adminService.verifyTwoFactor(pendingUserId, code.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Código incorrecto');
      return;
    }

    const { verified, token } = result.data || {};
    if (!verified || !token) {
      setError('Código incorrecto');
      return;
    }

    await finishLogin(token, pendingUserId);
  };

  const { title, subtitle } = STEP_COPY[step];

  return (
    <AuthFlowLayout title={title} subtitle={subtitle}>
      <AuthProgressDots total={STEP_ORDER.length} current={stepIndex} />

      <AuthCard>
        {step === 'email' ? (
          <>
            <Text style={styles.label}>Email de administrador</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@quilax.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </>
        ) : null}

        {step === 'secret' ? (
          <>
            <Text style={styles.label}>Contraseña secreta del panel</Text>
            <PasswordInput
              placeholder="••••••••••"
              value={secretPassword}
              onChangeText={setSecretPassword}
              editable={!loading}
            />
          </>
        ) : null}

        {step === 'password' ? (
          <>
            <Text style={styles.label}>Contraseña personal</Text>
            <PasswordInput
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </>
        ) : null}

        {step === 'code' ? (
          <>
            {qrCode ? (
              <View style={styles.qrWrap}>
                <Text style={styles.qrHint}>
                  Escanea este código con Google Authenticator (o Authy). También puedes copiar la
                  clave manual:
                </Text>
                <View style={styles.qrBox}>
                  <QRCode value={qrCode} size={180} />
                </View>
                {manualSecret ? (
                  <Text selectable style={styles.manualSecret}>
                    {manualSecret}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.qrHint}>
                Introduce el código de 6 dígitos de Google Authenticator para esta cuenta.
              </Text>
            )}
            <Text style={styles.label}>Código de 6 dígitos</Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              editable={!loading}
            />
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </AuthCard>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.light.primary} />
      ) : (
        <>
          <AuthPrimaryButton
            label={
              step === 'email'
                ? 'Continuar'
                : step === 'secret'
                  ? 'Verificar'
                  : step === 'password'
                    ? 'Iniciar sesión'
                    : 'Verificar código'
            }
            onPress={
              step === 'email'
                ? handleEmailSubmit
                : step === 'secret'
                  ? handleSecretSubmit
                  : step === 'password'
                    ? handlePasswordSubmit
                    : handleCodeSubmit
            }
          />
          {step !== 'email' ? (
            <AuthSecondaryButton label="Volver" onPress={goBack} />
          ) : null}
        </>
      )}
    </AuthFlowLayout>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    marginTop: Spacing.three,
    color: Colors.light.error,
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginTop: Spacing.four,
  },
  qrWrap: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  qrHint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  qrBox: {
    padding: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  manualSecret: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
