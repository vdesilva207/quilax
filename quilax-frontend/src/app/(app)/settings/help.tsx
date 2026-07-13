import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import CustomIcon from '@/components/CustomIcon';

export default function HelpCenterScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    { id: 1, title: 'Cuenta y Registro', description: 'Problemas con tu cuenta' },
    { id: 2, title: 'Quizzes y Juego', description: 'Preguntas sobre quizzes' },
    { id: 3, title: 'Pagos y Retiros', description: 'Gestión de fondos' },
    { id: 4, title: 'Creación de Quizzes', description: 'Cómo crear quizzes' },
    { id: 5, title: 'Premios y Ganancias', description: 'Información sobre premios' },
    { id: 6, title: 'Seguridad y Privacidad', description: 'Protección de datos' },
    { id: 7, title: 'Problemas Técnicos', description: 'Errores y bugs' },
  ];

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
          <Text style={styles.title}>Centro de Ayuda</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ayuda..."
            placeholderTextColor={Colors.light.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías de Ayuda</Text>
          {helpCategories.map((category) => (
            <Pressable
              key={category.id}
              style={styles.categoryItem}
              onPress={() => router.push(`/(app)/settings/help-category/${category.id}`)}
            >
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <Text style={styles.categoryArrow}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Artículos Destacados</Text>
          <Pressable style={styles.articleItem}>
            <Text style={styles.articleTitle}>Cómo crear tu primer quiz</Text>
            <Text style={styles.articleDescription}>Guía paso a paso para creadores</Text>
          </Pressable>
          <Pressable style={styles.articleItem}>
            <Text style={styles.articleTitle}>Cómo retirar tus ganancias</Text>
            <Text style={styles.articleDescription}>Proceso de retiro de fondos</Text>
          </Pressable>
          <Pressable style={styles.articleItem}>
            <Text style={styles.articleTitle}>Protección de tu cuenta</Text>
            <Text style={styles.articleDescription}>Consejos de seguridad</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Contactar Soporte</Text>
          </Pressable>
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
  searchSection: {
    marginBottom: Spacing.four,
  },
  searchInput: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  categoryArrow: {
    fontSize: 24,
    color: Colors.light.textSecondary,
    fontWeight: 'bold',
  },
  articleItem: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  articleDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  contactButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
