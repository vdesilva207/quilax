import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AppScreen, AppHeader, AppSection } from '@/components/ui/AppScreen';
import { GradientButton, FieldLabel } from '@/components/ui/ScreenChrome';
import CustomIcon from '@/components/CustomIcon';
import apiClient from '@/lib/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, updateUser, setUser } = useAuth() as any;
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photoUri, setPhotoUri] = useState<string | null>(user?.profilePhoto || null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('profile.permissionTitle'), t('profile.galleryPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    const dataUrl = asset.base64
      ? `data:${mime};base64,${asset.base64}`
      : asset.uri;

    setUploadingPhoto(true);
    try {
      const data = await apiClient.put('/profile/profile-photo', { profilePhoto: dataUrl });
      const nextPhoto = data.user?.profilePhoto || dataUrl;
      setPhotoUri(nextPhoto);
      setUser?.({ ...user, profilePhoto: nextPhoto });
      Alert.alert(t('common.done'), t('profile.photoUpdated'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('profile.uploadPhotoError'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('profile.nameEmptyError'));
      return;
    }
    if (fullName.trim().length < 2) {
      Alert.alert(t('common.error'), t('profile.nameTooShortError'));
      return;
    }

    setSaving(true);
    const result = await updateUser({
      fullName: fullName.trim(),
      username: username.trim() || undefined,
      bio,
    });
    setSaving(false);

    if (result.success) {
      Alert.alert(t('common.saved'), t('profile.profileSavedBody'));
      router.navigate('/(app)/profile' as any);
    } else {
      Alert.alert(t('common.error'), result.error || t('profile.profileSaveError'));
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('profile.editProfileTitle')} showBack backHref="/(app)/profile" />

      <AppSection title={t('profile.photoSection')} accentIndex={1}>
        <View style={styles.photoRow}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <CustomIcon name="user" size={36} color={Colors.light.primary} />
            </View>
          )}
          {uploadingPhoto ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : (
            <Pressable
              style={({ pressed }) => [styles.changePhotoBtn, pressed && styles.pressed]}
              onPress={pickAvatar}
            >
              <Text style={styles.changePhotoText}>{t('profile.changePhoto')}</Text>
            </Pressable>
          )}
        </View>
      </AppSection>

      <AppSection title={t('profile.identitySection')} accentIndex={0}>
        <FieldLabel>{t('profile.fullNameLabel')}</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder={t('profile.fullNamePlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />
        <FieldLabel>{t('profile.usernameLabel')}</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder={t('profile.usernamePlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FieldLabel>{t('profile.bioLabel')}</FieldLabel>
        <TextInput
          style={[styles.input, styles.bio]}
          placeholder={t('profile.bioPlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={160}
        />
        <Text style={styles.counter}>{bio.length}/160</Text>
        {saving ? (
          <ActivityIndicator color={Colors.light.primary} style={styles.spinner} />
        ) : (
          <GradientButton label={t('profile.saveChanges')} onPress={handleSave} />
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.light.backgroundElement,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoBtn: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  changePhotoText: {
    fontWeight: '700',
    fontSize: 14,
    color: Colors.light.text,
  },
  pressed: { opacity: 0.85 },
  input: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    marginBottom: Spacing.three,
    color: Colors.light.text,
  },
  bio: { minHeight: 90, textAlignVertical: 'top' },
  counter: {
    alignSelf: 'flex-end',
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginBottom: Spacing.three,
  },
  spinner: { marginTop: Spacing.two },
});
