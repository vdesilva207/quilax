import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import CustomIcon from '@/components/CustomIcon';

export default function DifficultyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const questionsCount = params.questionsCount as string;
  const [difficulty, setDifficulty] = useState<number>(5);

  const handleDifficultySelect = (level: number) => {
    setDifficulty(level);
  };

  const handleNext = () => {
    router.push({
      pathname: '/quiz/schedule',
      params: {
        difficulty: difficulty.toString(),
        questionsCount: questionsCount || '0'
      }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd, Colors.light.error]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CustomIcon name="back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.title}>Dificultad del Quiz</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.description}>
          Selecciona el nivel de dificultad de tu quiz del 1 (menos difícil) al 10 (más difícil)
        </Text>

        <View style={styles.difficultyGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <Pressable
              key={level}
              style={[
                styles.difficultyButton,
                difficulty === level && styles.difficultyButtonActive
              ]}
              onPress={() => handleDifficultySelect(level)}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === level && styles.difficultyButtonTextActive
              ]}>
                {level}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.selectedDifficulty}>
          <Text style={styles.selectedDifficultyText}>
            Dificultad seleccionada: {difficulty}/10
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Siguiente</Text>
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
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  backButton: {
    padding: Spacing.two,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: Spacing.four,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.six,
    textAlign: 'center',
  },
  difficultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  difficultyButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: Colors.light.gradientStart,
    borderColor: Colors.light.gradientStart,
  },
  difficultyButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  difficultyButtonTextActive: {
    color: '#FFFFFF',
  },
  selectedDifficulty: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  selectedDifficultyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  buttonContainer: {
    marginTop: Spacing.four,
  },
  nextButton: {
    backgroundColor: Colors.light.gradientEnd,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
