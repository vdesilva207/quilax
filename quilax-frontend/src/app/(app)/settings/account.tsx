import { Text, StyleSheet, TextInput, Alert, Pressable, Share, Platform } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import settingsService from '@/services/settingsService';
import apiClient from '@/lib/api';
import { AppScreen, AppHeader, AppSection } from '@/components/ui/AppScreen';
import { GradientButton, FieldLabel } from '@/components/ui/ScreenChrome';
import PasswordInput from '@/components/ui/PasswordInput';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
  );
  const [bio, setBio] = useState(user?.bio || '');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = async () => {
    const result = await updateUser({
      fullName: name,
      bio,
      dateOfBirth: dateOfBirth || undefined,
    });
    if (result.success) {
      Alert.alert(t('settings.account.savedTitle'), t('settings.account.savedBody'));
      router.navigate('/(app)/settings' as any);
    } else {
      Alert.alert(t('common.error'), result.error || t('settings.account.saveError'));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await apiClient.get('/profile/data-export');
      const payload = JSON.stringify(data.data || data, null, 2);
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
        Alert.alert(t('common.done'), t('settings.account.exportCopied'));
      } else {
        await Share.share({ message: payload, title: t('settings.account.exportShareTitle') });
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('settings.account.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    if (!deletePassword) {
      Alert.alert(t('common.error'), t('settings.account.deleteNeedPassword'));
      return;
    }
    Alert.alert(t('settings.account.deleteConfirmTitle'), t('settings.account.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.account.deleteConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const result = await settingsService.deleteAccount(deletePassword);
          setDeleting(false);
          if (result.success) {
            await logout();
            router.replace('/(auth)/welcome' as any);
          } else {
            Alert.alert(t('common.error'), result.error || t('settings.account.deleteError'));
          }
        },
      },
    ]);
  };

  return (
    <AppScreen>
      <AppHeader title={t('settings.account.title')} showBack backHref="/(app)/settings" />
      <AppSection title={t('settings.account.detailsSection')} accentIndex={0}>
        <FieldLabel>{t('settings.account.nameLabel')}</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder={t('settings.account.namePlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          value={name}
          onChangeText={setName}
        />
        <FieldLabel>{t('settings.account.dobLabel')}</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder={t('settings.account.dobPlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
        />
        <FieldLabel>{t('settings.account.bioLabel')}</FieldLabel>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('settings.account.bioPlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={4}
          value={bio}
          onChangeText={setBio}
        />
        <GradientButton label={t('settings.account.saveButton')} onPress={handleSave} />
      </AppSection>

      <AppSection title={t('settings.account.deleteSection')} accentIndex={3}>
        <Text style={styles.deleteLead}>{t('settings.account.deleteLead')}</Text>
        <Pressable
          style={[styles.exportBtn, exporting && styles.deleteBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>
            {exporting ? t('common.loading') : t('settings.account.exportButton')}
          </Text>
        </Pressable>
        <FieldLabel>{t('settings.account.deletePasswordLabel')}</FieldLabel>
        <PasswordInput
          containerStyle={styles.fieldGap}
          placeholder={t('settings.account.deletePasswordPlaceholder')}
          value={deletePassword}
          onChangeText={setDeletePassword}
        />
        <Pressable
          style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
          onPress={confirmDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteBtnText}>
            {deleting ? t('common.saving') : t('settings.account.deleteButton')}
          </Text>
        </Pressable>
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  fieldGap: { marginBottom: Spacing.three },
  deleteLead: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
  },
  deleteBtn: {
    backgroundColor: '#B42318',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportBtn: {
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  exportBtnText: { color: Colors.light.text, fontWeight: '700', fontSize: 15 },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
