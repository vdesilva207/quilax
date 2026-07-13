import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomIcon from '@/components/CustomIcon';

const LANGUAGES = [
  { code: 'es', name: 'Español', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'Français', nativeName: 'Français' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano' },
  { code: 'pt', name: 'Português', nativeName: 'Português' },
  { code: 'nl', name: 'Nederlands', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polski', nativeName: 'Polski' },
  { code: 'ru', name: 'Русский', nativeName: 'Русский' },
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'ja', name: '日本語', nativeName: '日本語' },
  { code: 'ko', name: '한국어', nativeName: '한국어' },
];

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [showModal, setShowModal] = useState(false);

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setShowModal(false);
    Alert.alert(
      'Cambiar Idioma',
      '¿Estás seguro de que quieres cambiar el idioma de la aplicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: async () => {
            await AsyncStorage.setItem('language', languageCode);
            Alert.alert('Éxito', 'Idioma cambiado correctamente');
          },
        },
      ],
    );
  };

  const currentLanguage = LANGUAGES.find(lang => lang.code === selectedLanguage);

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CustomIcon name="back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.title}>Idioma</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Idioma Actual</Text>
          <Pressable style={styles.currentLanguage} onPress={() => setShowModal(true)}>
            <Text style={styles.currentLanguageText}>{currentLanguage?.nativeName}</Text>
            <Text style={styles.currentLanguageCode}>{currentLanguage?.code.toUpperCase()}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Idiomas Disponibles</Text>
          {LANGUAGES.map((language) => (
            <Pressable
              key={language.code}
              style={[
                styles.languageItem,
                selectedLanguage === language.code && styles.languageItemSelected,
              ]}
              onPress={() => handleLanguageChange(language.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{language.name}</Text>
                <Text style={styles.languageNativeName}>{language.nativeName}</Text>
              </View>
              {selectedLanguage === language.code && (
                <CustomIcon name="check" size={20} color={Colors.light.gradientStart} />
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            El cambio de idioma se aplicará inmediatamente a toda la aplicación.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  gradientHeader: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: Spacing.two,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: Spacing.four,
  },
  section: {
    marginBottom: Spacing.four,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  currentLanguage: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentLanguageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  currentLanguageCode: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  languageItemSelected: {
    backgroundColor: Colors.light.backgroundSelected,
    borderWidth: 2,
    borderColor: Colors.light.gradientStart,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  languageNativeName: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  checkmark: {
    fontSize: 24,
    color: Colors.light.gradientStart,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    marginTop: Spacing.four,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
