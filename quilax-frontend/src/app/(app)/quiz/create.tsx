import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import CustomIcon from '@/components/CustomIcon';
import quizService from '@/services/quizService';
import { useAuth } from '@/context/AuthContext';

const QUIZ_CATEGORIES = [
  'Ciencias', 'Matemáticas', 'Historia', 'Geografía', 'Literatura',
  'Arte', 'Música', 'Cine', 'Deportes', 'Tecnología',
  'Programación', 'Física', 'Química', 'Biología', 'Medicina',
  'Economía', 'Política', 'Filosofía', 'Religión', 'Mitología',
  'Naturaleza', 'Animales', 'Astronomía', 'Arquitectura', 'Gastronomía',
  'Idiomas', 'Cultura', 'Videojuegos', 'Anime', 'Cómics'
];

const MAX_QUESTIONS = 50;
const MIN_QUESTIONS = 5;
const MAX_DURATION_MINUTES = 20;
const MAX_DURATION_SECONDS = MAX_DURATION_MINUTES * 60;

// Tiempos fijos del backend (quizEngine.js)
const START_TIME = 3; // Segundos de inicio del quiz (animación)
const FIXED_CORRECTION_TIME = 2; // Segundos de corrección por pregunta
const FIXED_RANKING_TIME = 6; // Segundos de ranking por pregunta

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  imageUrl?: string;
  questionReadDuration: number;
  questionAnswerDuration: number;
  questionType: 'true_false' | 'multiple_choice';
  points: number;
}

export default function CreateQuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tips, setTips] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [warnings, setWarnings] = useState('');
  const [creatorMessage, setCreatorMessage] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [difficultySuggested, setDifficultySuggested] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [showWritingAssistant, setShowWritingAssistant] = useState(false);
  const [suggestedDifficulty, setSuggestedDifficulty] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', options: ['', '', '', ''], correctOption: 0, questionReadDuration: 10, questionAnswerDuration: 30, questionType: 'multiple_choice', points: 100 }
  ]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) {
      Alert.alert('Límite alcanzado', `Máximo ${MAX_QUESTIONS} preguntas`);
      return;
    }
    
    const newQuestionDuration = 10 + 30; // 10 seg lectura + 30 seg respuesta por defecto
    const currentTotalDuration = calculateTotalDuration();
    const newTotalDuration = currentTotalDuration + newQuestionDuration;
    const newTotalMinutes = newTotalDuration / 60;
    
    if (newTotalMinutes > MAX_DURATION_MINUTES) {
      Alert.alert('Límite de tiempo', `No puedes añadir más preguntas. El tiempo total excedería los ${MAX_DURATION_MINUTES} minutos.`);
      return;
    }
    
    setQuestions([
      ...questions,
      { id: Date.now().toString(), text: '', options: ['', '', '', ''], correctOption: 0, questionReadDuration: 10, questionAnswerDuration: 30, questionType: 'multiple_choice', points: 100 }
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= MIN_QUESTIONS) {
      Alert.alert('Mínimo requerido', `Mínimo ${MIN_QUESTIONS} preguntas`);
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleQuestionChange = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const handleOptionChange = (questionId: string, optionIndex: number, text: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map((opt, i) => i === optionIndex ? text : opt) }
        : q
    ));
  };

  const handleSetCorrect = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, correctOption: optionIndex } : q
    ));
  };

  const handleDurationChange = (questionId: string, field: 'questionReadDuration' | 'questionAnswerDuration' | 'points', value: string) => {
    const numValue = parseInt(value) || 0;
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const updatedQuestion = { ...q, [field]: numValue };
        // Si applyToAll está activo, aplicar a todas las preguntas
        if (applyToAll) {
          setQuestions(questions.map(q => ({ ...q, [field]: numValue })));
          return q;
        }
        return updatedQuestion;
      }
      return q;
    }));
  };

  const handleQuestionTypeChange = (questionId: string, type: 'true_false' | 'multiple_choice') => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        if (type === 'true_false') {
          return { ...q, questionType: type, options: ['Verdadero', 'Falso'], correctOption: 0 };
        } else {
          return { ...q, questionType: type, options: ['', '', '', ''], correctOption: 0 };
        }
      }
      return q;
    }));
  };

  const calculateTotalDuration = () => {
    // START_TIME se suma solo una vez al principio
    const startTime = START_TIME;
    // Por cada pregunta se suman los tiempos fijos
    const fixedTimesPerQuestion = questions.length * (FIXED_CORRECTION_TIME + FIXED_RANKING_TIME);
    // Sumar tiempos de lectura y respuesta de cada pregunta
    const questionTimes = questions.reduce((total, q) => {
      const readSeconds = q.questionReadDuration || 0;
      const answerSeconds = q.questionAnswerDuration || 0;
      return total + readSeconds + answerSeconds;
    }, 0);
    return startTime + fixedTimesPerQuestion + questionTimes;
  };

  const calculatePoints = (answerDuration: number) => {
    // Cálculo automático de puntos basado en tiempo ANSWER
    // Calcula puntos para que al final del tiempo sean 0 puntos
    // Valor base: 100 puntos por pregunta
    const basePoints = 100;
    return basePoints;
  };

  const handleSuggestDifficulty = () => {
    // Sugerir dificultad después de crear todas las preguntas
    const avgAnswerTime = questions.reduce((sum, q) => sum + q.questionAnswerDuration, 0) / questions.length;
    let difficulty = '';
    if (avgAnswerTime < 15) {
      difficulty = 'Fácil';
    } else if (avgAnswerTime < 30) {
      difficulty = 'Medio';
    } else {
      difficulty = 'Difícil';
    }
    setSuggestedDifficulty(difficulty);
    setDifficultySuggested(true);
  };

  const handleImproveWriting = (questionId: string) => {
    // Autocorrector ortográfico
    Alert.alert('Autocorrector', 'Esta función corregirá automáticamente la ortografía de tu pregunta.');
  };

  const totalDurationSeconds = calculateTotalDuration();
  const progressPercentage = Math.min((totalDurationSeconds / MAX_DURATION_SECONDS) * 100, 100);

  const handleAddImage = async (questionId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.uri && (asset.uri.endsWith('.jpg') || asset.uri.endsWith('.jpeg'))) {
        setQuestions(questions.map(q => 
          q.id === questionId ? { ...q, imageUrl: asset.uri } : q
        ));
      } else {
        Alert.alert('Formato no válido', 'Solo se permiten archivos JPG o JPEG');
      }
    }
  };

  const handleRemoveImage = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, imageUrl: undefined } : q
    ));
  };

  const handleAddCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.uri && (asset.uri.endsWith('.jpg') || asset.uri.endsWith('.jpeg'))) {
        setCoverImage(asset.uri);
      } else {
        Alert.alert('Formato no válido', 'Solo se permiten archivos JPG o JPEG');
      }
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage('');
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    if (questions.length < MIN_QUESTIONS) {
      Alert.alert('Error', `Mínimo ${MIN_QUESTIONS} preguntas requeridas`);
      return;
    }

    try {
      setSaving(true);

      const quizData = {
        title,
        category,
        description,
        tips,
        syllabus,
        warnings,
        creatorMessage,
        coverImage,
        difficulty: suggestedDifficulty || 'Medio',
        questions: questions.map(q => ({
          question: q.text,
          options: q.options,
          correctOption: q.correctOption,
          questionReadDuration: q.questionReadDuration,
          questionAnswerDuration: q.questionAnswerDuration,
          questionType: q.questionType,
          points: q.points,
          imageUrl: q.imageUrl,
        })),
      };

      const result = await quizService.createQuiz(quizData);

      if (result.success) {
        Alert.alert('Éxito', 'Quiz guardado como borrador');
        router.back();
      } else {
        Alert.alert('Error', result.error || 'Error al guardar el quiz');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Error al guardar el quiz');
    } finally {
      setSaving(false);
    }
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
          <Text style={styles.title}>Crear Quiz</Text>
        </View>
      </LinearGradient>

      <View style={styles.rulesBar}>
        <View style={styles.ruleItem}>
          <CustomIcon name="rules" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.rulesText}>
            Reglas: Mínimo {MIN_QUESTIONS} preguntas, Máximo {MAX_QUESTIONS} preguntas
          </Text>
        </View>
        <View style={styles.ruleItem}>
          <CustomIcon name="time" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.rulesText}>
            Duración máxima: {MAX_DURATION_MINUTES} minutos
          </Text>
        </View>
        <View style={styles.ruleItem}>
          <CustomIcon name="warning" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.rulesText}>
            Vigila la ortografía, no inventes respuestas, evita contenido irrespetuoso u obsceno, y procura no poner preguntas con respuestas subjetivas (mayor probabilidad de rechazo)
          </Text>
        </View>
        <View style={styles.ruleItem}>
          <CustomIcon name="star" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.rulesText}>
            Los quizzes con más preguntas son más atractivos y dan más puntos a los jugadores
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Título del quiz (obligatorio)</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe un título atractivo..."
          placeholderTextColor={Colors.light.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Foto de portada (opcional)</Text>
        {coverImage ? (
          <View style={styles.imageContainer}>
            <CustomIcon name="photo" size={16} color={Colors.light.text} />
            <Text style={styles.imageText}>Foto de portada añadida</Text>
            <Pressable onPress={handleRemoveCoverImage}>
              <Text style={styles.removeImageText}>Eliminar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable 
            style={styles.addImageButton}
            onPress={handleAddCoverImage}
          >
            <CustomIcon name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.addImageText}>Añadir foto de portada (JPG/JPEG) - opcional</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Categoría (obligatorio)</Text>
        <Pressable 
          style={styles.categoryButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={category ? styles.categoryText : styles.categoryPlaceholder}>
            {category || 'Selecciona una categoría'}
          </Text>
          <CustomIcon name="arrow" size={16} color={Colors.light.text} />
        </Pressable>

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe de qué trata el quiz..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Consejos para los jugadores (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Dale consejos útiles a los jugadores..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={2}
          value={tips}
          onChangeText={setTips}
        />

        <Text style={styles.label}>Temario (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Temas que cubre el quiz..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={2}
          value={syllabus}
          onChangeText={setSyllabus}
        />

        <Text style={styles.label}>Advertencias (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Advertencias importantes (opcional)..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={2}
          value={warnings}
          onChangeText={setWarnings}
        />

        <Text style={styles.label}>Mensaje del creador (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Mensaje o indicaciones para los jugadores..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={2}
          value={creatorMessage}
          onChangeText={setCreatorMessage}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preguntas (Máximo {MAX_QUESTIONS})</Text>
          </View>
          
          {questions.map((question, index) => (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>Pregunta {index + 1}</Text>
                {questions.length > MIN_QUESTIONS && (
                  <Pressable onPress={() => handleRemoveQuestion(question.id)}>
                    <CustomIcon name="close" size={16} color={Colors.light.error} />
                  </Pressable>
                )}
              </View>

              <View style={styles.questionTypeContainer}>
                <Text style={styles.questionTypeLabel}>Tipo de pregunta:</Text>
                <View style={styles.questionTypeSelector}>
                  <Pressable
                    style={[
                      styles.questionTypeOption,
                      question.questionType === 'true_false' && styles.questionTypeOptionActive
                    ]}
                    onPress={() => handleQuestionTypeChange(question.id, 'true_false')}
                  >
                    <Text style={[
                      styles.questionTypeOptionText,
                      question.questionType === 'true_false' && styles.questionTypeOptionTextActive
                    ]}>Verdadero/Falso</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.questionTypeOption,
                      question.questionType === 'multiple_choice' && styles.questionTypeOptionActive
                    ]}
                    onPress={() => handleQuestionTypeChange(question.id, 'multiple_choice')}
                  >
                    <Text style={[
                      styles.questionTypeOptionText,
                      question.questionType === 'multiple_choice' && styles.questionTypeOptionTextActive
                    ]}>3-6 opciones</Text>
                  </Pressable>
                </View>
              </View>
              
              <TextInput
                style={styles.questionInput}
                placeholder="Escribe tu pregunta..."
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                value={question.text}
                onChangeText={(text) => handleQuestionChange(question.id, text)}
              />

              <Pressable
                style={styles.writingAssistantButton}
                onPress={() => handleImproveWriting(question.id)}
              >
                <CustomIcon name="edit" size={16} color="#FFFFFF" />
                <Text style={styles.writingAssistantText}>🔧 Autocorrector ortográfico</Text>
              </Pressable>

              {question.imageUrl && (
                <View style={styles.imageContainer}>
                  <CustomIcon name="photo" size={16} color={Colors.light.text} />
                  <Text style={styles.imageText}>Foto añadida</Text>
                  <Pressable onPress={() => handleRemoveImage(question.id)}>
                    <Text style={styles.removeImageText}>Eliminar</Text>
                  </Pressable>
                </View>
              )}

              <Pressable 
                style={styles.addImageButton}
                onPress={() => handleAddImage(question.id)}
              >
                <CustomIcon name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.addImageText}>Añadir foto (JPG/JPEG) - opcional</Text>
              </Pressable>

              <View style={styles.durationContainer}>
                {index === 0 && (
                  <View style={styles.applyToAllContainer}>
                    <Pressable
                      style={styles.applyToAllCheckbox}
                      onPress={() => setApplyToAll(!applyToAll)}
                    >
                      <View style={[styles.checkbox, applyToAll && styles.checkboxChecked]}>
                        {applyToAll && <CustomIcon name="check" size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.applyToAllText}>Aplicar a todas las preguntas</Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.durationField}>
                  <Text style={styles.durationLabel}>Tiempo lectura (seg)</Text>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="10"
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType="number-pad"
                    value={question.questionReadDuration.toString()}
                    onChangeText={(text) => handleDurationChange(question.id, 'questionReadDuration', text)}
                  />
                </View>
                <View style={styles.durationField}>
                  <Text style={styles.durationLabel}>Tiempo respuesta (seg)</Text>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="30"
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType="number-pad"
                    value={question.questionAnswerDuration.toString()}
                    onChangeText={(text) => handleDurationChange(question.id, 'questionAnswerDuration', text)}
                  />
                </View>
                <View style={styles.durationField}>
                  <Text style={styles.durationLabel}>Puntos a restar por décima de segundo</Text>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="Auto"
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType="number-pad"
                    value={question.points.toString()}
                    onChangeText={(text) => handleDurationChange(question.id, 'points', text)}
                  />
                  <Text style={styles.durationHint}>
                    Recomendado: {question.questionAnswerDuration > 0 ? Math.round(1000 / (question.questionAnswerDuration * 10)) : 0} puntos (1000 ÷ {question.questionAnswerDuration * 10} décimas)
                  </Text>
                </View>
              </View>

              <View style={styles.optionsContainer}>
                {question.options.map((option, optIndex) => (
                  <View key={optIndex} style={styles.optionWrapper}>
                    <Pressable
                      style={[
                        styles.correctIndicator,
                        question.correctOption === optIndex && styles.correctIndicatorActive
                      ]}
                      onPress={() => handleSetCorrect(question.id, optIndex)}
                    >
                      <View style={styles.correctIndicator}>
                        {question.correctOption === optIndex && (
                          <CustomIcon name="check" size={16} color={Colors.light.success} />
                        )}
                        <Text style={styles.correctIndicatorText}>
                          {question.correctOption === optIndex ? '' : String.fromCharCode(65 + optIndex)}
                        </Text>
                      </View>
                    </Pressable>
                    <TextInput
                      style={styles.optionInput}
                      placeholder={`Opción ${String.fromCharCode(65 + optIndex)}`}
                      placeholderTextColor={Colors.light.textSecondary}
                      value={option}
                      onChangeText={(text) => handleOptionChange(question.id, optIndex, text)}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.addButton} onPress={handleAddQuestion}>
            <Text style={styles.addButtonText}>+ Añadir Pregunta</Text>
          </Pressable>
          <Pressable 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSaveDraft}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar borrador'}</Text>
          </Pressable>
        </View>

        <View style={styles.progressBarContainer}>
          <Text style={styles.progressBarLabel}>Duración total: {totalDurationSeconds} segundos / {MAX_DURATION_SECONDS} segundos ({MAX_DURATION_MINUTES} minutos)</Text>
          <View style={styles.progressBarBackground}>
            <LinearGradient
              colors={[Colors.light.gradientStart, Colors.light.gradientEnd, Colors.light.error]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
            />
          </View>
          <Text style={styles.progressBarInfoText}>
            Por cada pregunta se suman automáticamente {START_TIME + FIXED_CORRECTION_TIME + FIXED_RANKING_TIME} segundos de tiempos fijos (inicio, corrección y ranking)
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.nextButton, questions.length < MIN_QUESTIONS && styles.nextButtonDisabled]}
            onPress={() => questions.length >= MIN_QUESTIONS && router.push({
              pathname: '/quiz/difficulty',
              params: { questionsCount: questions.length.toString() }
            })}
            disabled={questions.length < MIN_QUESTIONS}
          >
            <Text style={[styles.nextButtonText, questions.length < MIN_QUESTIONS && styles.nextButtonTextDisabled]}>
              Siguiente
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona una categoría</Text>
            <ScrollView style={styles.categoryList}>
              {QUIZ_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={styles.categoryItem}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.categoryItemText}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    gap: Spacing.three,
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
  rulesBar: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    margin: Spacing.four,
    borderRadius: 8,
    gap: Spacing.one,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  rulesText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  progressBarContainer: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    borderRadius: 8,
  },
  progressBarLabel: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.two,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.light.gradientStart,
    borderRadius: 4,
  },
  progressBarInfoText: {
    fontSize: 12,
    color: '#666666',
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  input: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryButton: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  categoryArrow: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  questionCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    gap: Spacing.three,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  questionTypeContainer: {
    marginBottom: Spacing.three,
  },
  questionTypeLabel: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.two,
    fontWeight: '600',
  },
  questionTypeSelector: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  questionTypeOption: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
  },
  questionTypeOptionActive: {
    backgroundColor: Colors.light.gradientStart,
    borderColor: Colors.light.gradientStart,
  },
  questionTypeOptionText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
  },
  questionTypeOptionTextActive: {
    color: '#FFFFFF',
  },
  removeButton: {
    fontSize: 20,
    color: Colors.light.error,
    fontWeight: 'bold',
    padding: Spacing.one,
  },
  questionInput: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  writingAssistantButton: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  writingAssistantText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  imageText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  removeImageText: {
    fontSize: 14,
    color: Colors.light.error,
    fontWeight: '600',
  },
  addImageButton: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  addImageText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  durationField: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.one,
    fontWeight: '600',
  },
  durationHint: {
    fontSize: 11,
    color: '#666666',
    marginTop: Spacing.one,
    fontStyle: 'italic',
  },
  durationInput: {
    backgroundColor: Colors.light.background,
    padding: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  applyToAllContainer: {
    marginBottom: Spacing.three,
  },
  applyToAllCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.gradientStart,
    borderColor: Colors.light.gradientStart,
  },
  applyToAllText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  optionsContainer: {
    gap: Spacing.two,
  },
  optionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  correctIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  correctIndicatorActive: {
    backgroundColor: Colors.light.gradientStart,
    borderColor: Colors.light.gradientStart,
  },
  correctIndicatorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  optionInput: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  addButton: {
    flex: 1,
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.gradientStart,
  },
  saveButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  publishButton: {
    flex: 1,
    backgroundColor: Colors.light.gradientEnd,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  difficultySection: {
    marginVertical: Spacing.four,
  },
  suggestDifficultyButton: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestDifficultyButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyResult: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  difficultyResultText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.light.gradientEnd,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: Colors.light.backgroundSelected,
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonTextDisabled: {
    color: Colors.light.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: Spacing.four,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 400,
    marginBottom: Spacing.three,
  },
  categoryItem: {
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  categoryItemText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  modalCloseButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
