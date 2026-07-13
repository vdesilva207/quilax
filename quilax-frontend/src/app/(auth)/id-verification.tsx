import React, { useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

export default function IdVerificationScreen() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [documentName, setDocumentName] = useState<string | null>(null);

  const pickDocument = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      setDocumentName(asset.fileName || 'documento.jpg');
      await apiClient.put('/profile/kyc/document', {
        idDocumentUrl: asset.uri,
        idDocumentType: 'NATIONAL_ID',
      }).catch(() => null);
      router.push('/(auth)/face-scan');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo subir el documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AuthFlowLayout title="Verificación de identidad" subtitle="Sube tu documento oficial" badge="Paso 4">
      <AuthProgressDots total={5} current={3} />
      <AuthCard>
        <Text style={styles.text}>
          Necesitamos una foto clara de tu DNI, pasaporte o carnet de conducir.
        </Text>
        {documentName ? <Text style={styles.file}>Archivo: {documentName}</Text> : null}
      </AuthCard>
      <AuthPrimaryButton label={uploading ? 'Subiendo...' : 'Seleccionar documento'} onPress={pickDocument} disabled={uploading} />
    </AuthFlowLayout>
  );
}

const styles = StyleSheet.create({
  text: { lineHeight: 22 },
  file: { marginTop: 12, fontWeight: '700' },
});
