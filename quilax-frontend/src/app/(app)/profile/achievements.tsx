import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Logros y Trayectoria</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.privacyToggle}>
          <Text style={styles.privacyText}>Trayectoria Privada/Pública</Text>
          <View style={styles.toggle}>
            <Text style={styles.toggleText}>Pública</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiz History</Text>
        <Text style={styles.subtitle}>Quizzes Jugados (156)</Text>
        
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Ciencia Básica - Ganado</Text>
          <Text style={styles.itemDate}>Hace 2 días</Text>
        </View>
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Historia Videojuegos - 2do</Text>
          <Text style={styles.itemDate}>Hace 5 días</Text>
        </View>
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Arte - Participado</Text>
          <Text style={styles.itemDate}>Hace 1 semana</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quizzes Creados (12)</Text>
        
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Geografía Mundial - 234 jug.</Text>
        </View>
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Música - 189 jug.</Text>
        </View>
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Gaming - 156 jug.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premios Ganados</Text>
        
        <View style={styles.prizeCard}>
          <CustomIcon name="trophy" size={20} color={Colors.light.gradientStart} />
          <Text style={styles.prizeTitle}>Quiz Prizes: 1,200 créditos</Text>
        </View>
        <View style={styles.prizeCard}>
          <CustomIcon name="target" size={20} color={Colors.light.gradientStart} />
          <Text style={styles.prizeTitle}>Season Jackpot: 1,140 créditos</Text>
        </View>
        <View style={styles.prizeCard}>
          <CustomIcon name="winner" size={20} color={Colors.light.gradientStart} />
          <Text style={styles.prizeTitle}>Total: 2,340 créditos</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Badges de Logros</Text>
        
        <View style={styles.badgesContainer}>
          <View style={styles.badge}>
            <CustomIcon name="quiz" size={20} color={Colors.light.gradientStart} />
            <Text style={styles.badgeText}>Quiz Master</Text>
          </View>
          <View style={styles.badge}>
            <CustomIcon name="quiz" size={20} color={Colors.light.gradientStart} />
            <Text style={styles.badgeText}>Creator</Text>
          </View>
          <View style={styles.badge}>
            <CustomIcon name="trophy" size={20} color={Colors.light.gradientStart} />
            <Text style={styles.badgeText}>Season Winner</Text>
          </View>
          <View style={styles.badge}>
            <CustomIcon name="winner" size={20} color={Colors.light.gradientStart} />
            <Text style={styles.badgeText}>Winner</Text>
          </View>
          <View style={styles.badge}>
            <CustomIcon name="gamer" size={20} color={Colors.light.gradientStart} />
            <Text style={styles.badgeText}>Gamer</Text>
          </View>
          <View style={styles.badge}>
            <CustomIcon name="learner" size={20} color={Colors.light.gradientStart} />
            <Text style={styles.badgeText}>Learner</Text>
          </View>
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
  header: {
    padding: Spacing.four,
    backgroundColor: Colors.light.backgroundElement,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  section: {
    padding: Spacing.four,
    marginBottom: Spacing.two,
  },
  privacyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
  },
  privacyText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  toggle: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 16,
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
  },
  itemCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  itemTitle: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
  },
  prizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    marginBottom: Spacing.two,
    gap: Spacing.three,
  },
  prizeTitle: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
