import React, { useRef, useState } from 'react';
import { Text, StyleSheet, View, Pressable, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import apiClient from '@/lib/api';
import { Colors, Spacing } from '@/constants/theme';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

export default function FaceScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    if (!cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        await apiClient.put('/profile/kyc/video', {
          verificationVideoUrl: photo.uri,
        }).catch(() => null);
      }
      router.push('/(auth)/add-bank-account');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo capturar el rostro');
    } finally {
      setCapturing(false);
    }
  };

  if (!permission?.granted) {
    return (
      <AuthFlowLayout title="Escaneo facial" subtitle="Permite acceso a la cámara" badge="Paso 5">
        <AuthPrimaryButton label="Permitir cámara" onPress={requestPermission} />
      </AuthFlowLayout>
    );
  }

  return (
    <AuthFlowLayout title="Escaneo facial" subtitle="Mira a la cámara para verificar tu identidad" badge="Paso 5">
      <AuthProgressDots total={5} current={4} />
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      </View>
      <Pressable style={styles.captureBtn} onPress={capture} disabled={capturing}>
        <Text style={styles.captureText}>{capturing ? 'Capturando...' : 'Capturar'}</Text>
      </Pressable>
    </AuthFlowLayout>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.four,
  },
  camera: { flex: 1 },
  captureBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  captureText: { color: '#fff', fontWeight: '800' },
});
