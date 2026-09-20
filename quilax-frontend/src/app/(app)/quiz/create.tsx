import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface, MaxContentWidth } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChromeInsets } from '@/hooks/useChromeInsets';
import * as ImagePicker from 'expo-image-picker';
import CustomIcon from '@/components/CustomIcon';
import quizService from '@/services/quizService';
import { useAuth } from '@/context/AuthContext';
import CreateGate from '@/components/quiz/CreateGate';
import { brandGradientProps } from '@/constants/gradients';
import { GradientButton } from '@/components/ui/ScreenChrome';
import { MobileModalFrame } from '@/components/ui/MobileModalFrame';
import { QUIZ_CATEGORIES, getCategoryStyle, getCategoryLabel } from '@/constants/quizCategories';
import {
  QUIZ_CONTENT_LANGUAGES,
  type QuizContentLanguage,
} from '@/constants/quizLanguages';
import { QuizLanguageBadge } from '@/components/QuizLanguageBadge';
import { spellcheckText, spellOverrideKey } from '@/utils/spellcheck';

const MAX_QUESTIONS = 50;
const MIN_QUESTIONS = 5;
const MAX_DURATION_MINUTES = 20;
const MAX_DURATION_SECONDS = MAX_DURATION_MINUTES * 60;

// Tiempos fijos del backend (quizEngine.js)
const START_TIME = 3; // Segundos de inicio del quiz (animación)
const FIXED_CORRECTION_TIME = 2; // Segundos de corrección por pregunta
const FIXED_RANKING_TIME = 6; // Segundos de ranking por pregunta

function recommendedPointsPerCentisecond(answerSeconds: number): number {
  if (!answerSeconds || answerSeconds <= 0) return 1;
  return Math.max(1, Math.ceil(1000 / (answerSeconds * 100)));
}

function isUnusableLocalImageUri(uri: string): boolean {
  const u = (uri || '').toLowerCase();
  return (
    u.startsWith('file://') ||
    u.startsWith('ph://') ||
    u.startsWith('assets-library://') ||
    u.includes('useractivityd') ||
    u.includes('shared-pasteboard') ||
    u.includes('/var/folders/') ||
    u.includes('.rtfd')
  );
}

function isPortableImageUri(uri: string): boolean {
  const u = (uri || '').trim();
  return /^data:image\//i.test(u) || /^https:\/\//i.test(u);
}

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
  const insets = useSafeAreaInsets();
  const chrome = useChromeInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [quizLanguage, setQuizLanguage] = useState<QuizContentLanguage>('es');
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
  const [spellOverrides, setSpellOverrides] = useState<Record<string, string[]>>({});
  const [lastSpellApplied, setLastSpellApplied] = useState<
    Record<string, { from: string; to: string }>
  >({});
  const [spellCheckingId, setSpellCheckingId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', options: ['', '', '', ''], correctOption: 0, questionReadDuration: 10, questionAnswerDuration: 30, questionType: 'multiple_choice', points: recommendedPointsPerCentisecond(30) }
  ]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [quizId, setQuizId] = useState<number | null>(null);

  const handleAddQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) {
      Alert.alert(t('createQuiz.limitReachedTitle'), t('createQuiz.limitReachedBody', { count: MAX_QUESTIONS }));
      return;
    }
    
    const newQuestionDuration = 10 + 30; // 10 seg lectura + 30 seg respuesta por defecto
    const currentTotalDuration = calculateTotalDuration();
    const newTotalDuration = currentTotalDuration + newQuestionDuration;
    const newTotalMinutes = newTotalDuration / 60;
    
    if (newTotalMinutes > MAX_DURATION_MINUTES) {
      Alert.alert(t('createQuiz.timeLimitTitle'), t('createQuiz.timeLimitBody', { minutes: MAX_DURATION_MINUTES }));
      return;
    }
    
    setQuestions([
      ...questions,
      { id: Date.now().toString(), text: '', options: ['', '', '', ''], correctOption: 0, questionReadDuration: 10, questionAnswerDuration: 30, questionType: 'multiple_choice', points: recommendedPointsPerCentisecond(30) }
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= MIN_QUESTIONS) {
      Alert.alert(t('createQuiz.minRequiredTitle'), t('createQuiz.minRequiredBody', { count: MIN_QUESTIONS }));
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleQuestionChange = (id: string, text: string) => {
    const prev = questions.find((q) => q.id === id);
    const applied = lastSpellApplied[id];
    // Si tras aplicar el corrector el usuario vuelve a su redacción original, respetarla
    if (applied && prev?.text === applied.to && text === applied.from) {
      const key = spellOverrideKey(applied.from, applied.to);
      setSpellOverrides((map) => {
        const list = map[id] || [];
        if (list.includes(key)) return map;
        return { ...map, [id]: [...list, key] };
      });
    }
    setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  const rememberOverride = (questionId: string, from: string, to: string) => {
    const key = spellOverrideKey(from, to);
    setSpellOverrides((map) => {
      const list = map[questionId] || [];
      if (list.includes(key)) return map;
      return { ...map, [questionId]: [...list, key] };
    });
  };

  const handleImproveWriting = async (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    const text = question?.text?.trim() || '';
    if (!text) {
      Alert.alert(t('createQuiz.autocorrectorTitle'), t('createQuiz.spellEmpty'));
      return;
    }

    setSpellCheckingId(questionId);
    try {
      const data = await spellcheckText(text, quizLanguage);
      const corrected = typeof data.corrected === 'string' ? data.corrected : text;
      const changed = !!data.changed && corrected !== text;
      const overrideKey = spellOverrideKey(text, corrected);

      if (!changed) {
        Alert.alert(t('createQuiz.autocorrectorTitle'), t('createQuiz.spellNoChanges'));
        return;
      }

      if ((spellOverrides[questionId] || []).includes(overrideKey)) {
        Alert.alert(t('createQuiz.autocorrectorTitle'), t('createQuiz.spellKeptUserVersion'));
        return;
      }

      Alert.alert(
        t('createQuiz.autocorrectorTitle'),
        t('createQuiz.spellSuggestBody', {
          count: data.count || 1,
          preview: corrected.length > 180 ? `${corrected.slice(0, 180)}…` : corrected,
        }),
        [
          {
            text: t('createQuiz.spellKeepMine'),
            style: 'cancel',
            onPress: () => rememberOverride(questionId, text, corrected),
          },
          {
            text: t('createQuiz.spellApply'),
            onPress: () => {
              setQuestions((qs) =>
                qs.map((q) => (q.id === questionId ? { ...q, text: corrected } : q)),
              );
              setLastSpellApplied((map) => ({
                ...map,
                [questionId]: { from: text, to: corrected },
              }));
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('createQuiz.spellError'));
    } finally {
      setSpellCheckingId(null);
    }
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
    setQuestions((prev) => {
      const apply = (q: Question) => {
        if (field === 'questionAnswerDuration') {
          return {
            ...q,
            questionAnswerDuration: numValue,
            points: recommendedPointsPerCentisecond(numValue),
          };
        }
        return { ...q, [field]: numValue };
      };
      if (applyToAll) {
        return prev.map(apply);
      }
      return prev.map((q) => (q.id === questionId ? apply(q) : q));
    });
  };

  const handleQuestionTypeChange = (questionId: string, type: 'true_false' | 'multiple_choice') => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        if (type === 'true_false') {
          return { ...q, questionType: type, options: [t('createQuiz.true'), t('createQuiz.false')], correctOption: 0 };
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

  const handleSuggestDifficulty = () => {
    if (!questions.length) {
      Alert.alert(t('common.error'), t('createQuiz.suggestNeedQuestions'));
      return;
    }
    const avgAnswerTime = questions.reduce((sum, q) => sum + q.questionAnswerDuration, 0) / questions.length;
    let difficulty = '';
    if (avgAnswerTime < 15) {
      difficulty = t('createQuiz.difficultyEasy');
    } else if (avgAnswerTime < 30) {
      difficulty = t('createQuiz.difficultyMedium');
    } else {
      difficulty = t('createQuiz.difficultyHard');
    }
    setSuggestedDifficulty(difficulty);
    setDifficultySuggested(true);
  };

  const totalDurationSeconds = calculateTotalDuration();
  const progressPercentage = Math.min((totalDurationSeconds / MAX_DURATION_SECONDS) * 100, 100);

  const handleAddImage = async (questionId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const uri = asset.uri || '';
      const mime = (asset.mimeType || 'image/jpeg').toLowerCase();
      const ok =
        mime.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif)$/i.test(uri) ||
        uri.toLowerCase().startsWith('data:image/');

      if (!ok) {
        Alert.alert(t('createQuiz.invalidFormatTitle'), t('createQuiz.invalidFormatBody'));
        return;
      }

      let imageUrl: string | null = null;
      if (asset.base64) {
        imageUrl = `data:${mime.startsWith('image/') ? mime : 'image/jpeg'};base64,${asset.base64}`;
      } else if (isPortableImageUri(uri)) {
        imageUrl = uri;
      }

      if (!imageUrl || isUnusableLocalImageUri(imageUrl)) {
        Alert.alert(t('common.error'), t('createQuiz.imageReadError'));
        return;
      }

      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, imageUrl } : q))
      );
    } catch (error) {
      console.error('Error adding question image:', error);
      Alert.alert(t('common.error'), t('createQuiz.imageReadError'));
    }
  };

  const handleRemoveImage = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, imageUrl: undefined } : q
    ));
  };

  const handleAddCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const mime = (asset.mimeType || 'image/jpeg').toLowerCase();
      if (asset.base64) {
        setCoverImage(`data:${mime.startsWith('image/') ? mime : 'image/jpeg'};base64,${asset.base64}`);
      } else if (asset.uri && isPortableImageUri(asset.uri) && !isUnusableLocalImageUri(asset.uri)) {
        setCoverImage(asset.uri);
      } else {
        Alert.alert(t('common.error'), t('createQuiz.imageReadError'));
      }
    } catch (error) {
      console.error('Error adding cover image:', error);
      Alert.alert(t('common.error'), t('createQuiz.imageReadError'));
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage('');
  };

  const buildQuizPayload = () => {
    const cover =
      coverImage && isPortableImageUri(coverImage) && !isUnusableLocalImageUri(coverImage)
        ? coverImage
        : undefined;

    return {
      title: title.trim(),
      category: category || undefined,
      language: quizLanguage,
      coverImage: cover,
      description: description.trim() || undefined,
      tips: tips.trim() || undefined,
      questions: questions.map((q) => {
        const imageUrl =
          q.imageUrl && isPortableImageUri(q.imageUrl) && !isUnusableLocalImageUri(q.imageUrl)
            ? q.imageUrl
            : undefined;
        return {
          text: q.text,
          imageUrl,
          timeReadMs: (q.questionReadDuration || 5) * 1000,
          timeAnswerMs: (q.questionAnswerDuration || 10) * 1000,
          answers: (q.options || []).map((opt: string, idx: number) => ({
            text: opt,
            isCorrect: idx === q.correctOption,
          })),
        };
      }),
    };
  };

  /** createDraft only stores title — always follow with update so questions persist. */
  const persistQuiz = async () => {
    const quizData = buildQuizPayload();
    if (quizId) {
      return quizService.updateQuiz(quizId, quizData);
    }
    const created = await quizService.createQuiz(quizData);
    if (!created.success || !created.data?.id) {
      return created;
    }
    const id = created.data.id as number;
    const updated = await quizService.updateQuiz(id, quizData);
    if (updated.success) {
      return { success: true, data: { ...(updated.data || {}), id } };
    }
    return updated;
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('createQuiz.titleRequiredError'));
      return;
    }

    if (!category) {
      Alert.alert(t('common.error'), t('createQuiz.categoryRequiredError'));
      return;
    }

    if (questions.length < MIN_QUESTIONS) {
      Alert.alert(t('common.error'), t('createQuiz.minQuestionsError', { count: MIN_QUESTIONS }));
      return;
    }

    try {
      setSaving(true);

      const result = await persistQuiz();

      if (result.success) {
        if (result.data?.id) setQuizId(result.data.id);
        Alert.alert(t('common.success'), t('createQuiz.draftSavedBody'));
        router.back();
      } else {
        Alert.alert(t('common.error'), result.error || t('createQuiz.saveErrorBody'));
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert(t('common.error'), t('createQuiz.saveErrorBody'));
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (questions.length < MIN_QUESTIONS) {
      Alert.alert(t('common.error'), t('createQuiz.minQuestionsError', { count: MIN_QUESTIONS }));
      return;
    }

    if (!title.trim()) {
      Alert.alert(t('common.error'), t('createQuiz.titleRequiredError'));
      return;
    }

    if (!category) {
      Alert.alert(t('common.error'), t('createQuiz.categoryRequiredError'));
      return;
    }

    Alert.alert(t('createQuiz.spellReviewTitle'), t('createQuiz.spellReviewBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('createQuiz.spellReviewContinue'),
        onPress: () => void advanceToDifficulty(),
      },
    ]);
  };

  const advanceToDifficulty = async () => {
    try {
      setAdvancing(true);

      const result = await persistQuiz();

      if (!result.success) {
        Alert.alert(t('common.error'), result.error || t('createQuiz.nextErrorBody'));
        return;
      }

      const nextQuizId = result.data?.id ?? quizId;
      if (nextQuizId) setQuizId(nextQuizId);

      router.push({
        pathname: '/(app)/quiz/difficulty',
        params: {
          quizId: nextQuizId ? String(nextQuizId) : '',
          questionsCount: questions.length.toString(),
        },
      });
    } catch (error) {
      console.error('Error advancing to difficulty:', error);
      Alert.alert(t('common.error'), t('createQuiz.nextErrorBody'));
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <CreateGate>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.phoneColumn}>
      <LinearGradient
        {...brandGradientProps}
        style={[styles.gradientHeader, { paddingTop: chrome.headerPaddingTop }]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CustomIcon name="back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTextCol}>
            <Text style={styles.brand}>QUILAX</Text>
            <Text style={styles.title}>{t('createQuiz.title')}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.rulesBar}>
        <View style={styles.pointsBanner}>
          <CustomIcon name="star" size={18} color={Colors.light.primary} />
          <View style={styles.pointsBannerTextCol}>
            <Text style={styles.pointsBannerTitle}>{t('createQuiz.rulesMaxPointsTitle')}</Text>
            <Text style={styles.pointsBannerBody}>{t('createQuiz.rulesMaxPointsBody')}</Text>
          </View>
        </View>
        <View style={styles.ruleItem}>
          <CustomIcon name="rules" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.rulesText}>
            {t('createQuiz.rulesQuestions', { min: MIN_QUESTIONS, max: MAX_QUESTIONS })}
          </Text>
        </View>
        <View style={styles.ruleItem}>
          <CustomIcon name="time" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.rulesText}>
            {t('createQuiz.rulesDuration', { minutes: MAX_DURATION_MINUTES })}
          </Text>
        </View>
        <View style={styles.ruleItem}>
          <CustomIcon name="warning" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.rulesText}>
            {t('createQuiz.rulesSpelling')}
          </Text>
        </View>
        <View style={styles.spellBanner}>
          <Text style={styles.spellBannerTitle}>{t('createQuiz.spellBannerTitle')}</Text>
          <Text style={styles.spellBannerBody}>{t('createQuiz.spellBannerBody')}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>{t('createQuiz.titleLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('createQuiz.titlePlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>{t('createQuiz.coverPhotoLabel')}</Text>
        {coverImage ? (
          <View style={styles.imageContainer}>
            <CustomIcon name="photo" size={16} color={Colors.light.text} />
            <Text style={styles.imageText}>{t('createQuiz.coverPhotoAdded')}</Text>
            <Pressable onPress={handleRemoveCoverImage}>
              <Text style={styles.removeImageText}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable 
            style={styles.addImageButton}
            onPress={handleAddCoverImage}
          >
            <CustomIcon name="camera" size={16} color="#FFFFFF" />
            <Text style={styles.addImageText}>{t('createQuiz.addCoverPhoto')}</Text>
          </Pressable>
        )}

        <Text style={styles.label}>{t('createQuiz.categoryLabel')}</Text>
        <Pressable 
          style={[
            styles.categoryButton,
            category
              ? {
                  backgroundColor: getCategoryStyle(category).bg,
                  borderColor: getCategoryStyle(category).border,
                }
              : null,
          ]}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text
            style={[
              category ? styles.categoryText : styles.categoryPlaceholder,
              category ? { color: getCategoryStyle(category).text } : null,
            ]}
            numberOfLines={1}
          >
            {category ? getCategoryLabel(category, t) : t('createQuiz.selectCategory')}
          </Text>
          <CustomIcon
            name="arrow"
            size={16}
            color={category ? getCategoryStyle(category).text : Colors.light.text}
          />
        </Pressable>

        <Text style={styles.label}>{t('quizLanguage.label')} *</Text>
        <Text style={styles.langHint}>{t('quizLanguage.hint')}</Text>
        <View style={styles.langRow}>
          {QUIZ_CONTENT_LANGUAGES.map((lang) => {
            const active = quizLanguage === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setQuizLanguage(lang.code)}
                style={[styles.langOption, active && styles.langOptionActive]}
              >
                <QuizLanguageBadge language={lang.code} />
                <Text style={[styles.langOptionText, active && styles.langOptionTextActive]}>
                  {t(lang.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.langNotTranslated}>{t('quizLanguage.notTranslated')}</Text>

        <Text style={styles.label}>{t('createQuiz.descriptionLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createQuiz.descriptionPlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>{t('createQuiz.tipsLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createQuiz.tipsPlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={2}
          value={tips}
          onChangeText={setTips}
        />

        <Text style={styles.label}>{t('createQuiz.syllabusLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createQuiz.syllabusPlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={2}
          value={syllabus}
          onChangeText={setSyllabus}
        />

        <Text style={styles.label}>{t('createQuiz.warningsLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createQuiz.warningsPlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={2}
          value={warnings}
          onChangeText={setWarnings}
        />

        <Text style={styles.label}>{t('createQuiz.creatorMessageLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createQuiz.creatorMessagePlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={2}
          value={creatorMessage}
          onChangeText={setCreatorMessage}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('createQuiz.questionsSectionTitle', { max: MAX_QUESTIONS })}</Text>
          </View>
          
          {questions.map((question, index) => (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionAccent} />
              <View style={styles.questionCardInner}>
              <View style={styles.questionHeader}>
                <View style={styles.questionNumberBadge}>
                  <Text style={styles.questionNumber}>
                    {t('createQuiz.questionNumber', { n: index + 1 })}
                  </Text>
                </View>
                {questions.length > MIN_QUESTIONS && (
                  <Pressable
                    onPress={() => handleRemoveQuestion(question.id)}
                    style={styles.questionRemoveBtn}
                    hitSlop={8}
                  >
                    <CustomIcon name="close" size={16} color={Colors.light.error} />
                  </Pressable>
                )}
              </View>

              <View style={styles.questionTypeContainer}>
                <Text style={styles.questionTypeLabel}>{t('createQuiz.questionTypeLabel')}</Text>
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
                    ]}>{t('createQuiz.questionTypeTrueFalse')}</Text>
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
                    ]}>{t('createQuiz.questionTypeMultiple')}</Text>
                  </Pressable>
                </View>
              </View>
              
              <TextInput
                style={styles.questionInput}
                placeholder={t('createQuiz.questionPlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                multiline
                value={question.text}
                onChangeText={(text) => handleQuestionChange(question.id, text)}
              />

              <Pressable
                style={[
                  styles.writingAssistantButton,
                  spellCheckingId === question.id && styles.writingAssistantBusy,
                ]}
                onPress={() => handleImproveWriting(question.id)}
                disabled={spellCheckingId === question.id}
              >
                <CustomIcon name="edit" size={16} color="#FFFFFF" />
                <Text style={styles.writingAssistantText}>
                  {spellCheckingId === question.id
                    ? t('createQuiz.spellChecking')
                    : t('createQuiz.spellCheckButton')}
                </Text>
              </Pressable>

              {question.imageUrl && (
                <View style={styles.imageContainer}>
                  <CustomIcon name="photo" size={16} color={Colors.light.text} />
                  <Text style={styles.imageText}>{t('createQuiz.photoAdded')}</Text>
                  <Pressable onPress={() => handleRemoveImage(question.id)}>
                    <Text style={styles.removeImageText}>{t('common.delete')}</Text>
                  </Pressable>
                </View>
              )}

              <Pressable 
                style={styles.addImageButton}
                onPress={() => handleAddImage(question.id)}
              >
                <CustomIcon name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.addImageText}>{t('createQuiz.addPhoto')}</Text>
              </Pressable>

              {index === 0 ? (
                <View style={styles.applyToAllContainer}>
                  <Pressable
                    style={styles.applyToAllCheckbox}
                    onPress={() => setApplyToAll(!applyToAll)}
                  >
                    <View style={[styles.checkbox, applyToAll && styles.checkboxChecked]}>
                      {applyToAll && <CustomIcon name="check" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.applyToAllText}>{t('createQuiz.applyToAll')}</Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.durationContainer}>
                <View style={styles.durationRow}>
                  <View style={[styles.durationField, styles.durationFieldHalf]}>
                    <Text style={styles.durationLabel}>{t('createQuiz.readTimeLabel')}</Text>
                    <TextInput
                      style={styles.durationInput}
                      placeholder="10"
                      placeholderTextColor={Colors.light.textSecondary}
                      keyboardType="number-pad"
                      value={question.questionReadDuration.toString()}
                      onChangeText={(text) => handleDurationChange(question.id, 'questionReadDuration', text)}
                    />
                  </View>
                  <View style={[styles.durationField, styles.durationFieldHalf]}>
                    <Text style={styles.durationLabel}>{t('createQuiz.answerTimeLabel')}</Text>
                    <TextInput
                      style={styles.durationInput}
                      placeholder="30"
                      placeholderTextColor={Colors.light.textSecondary}
                      keyboardType="number-pad"
                      value={question.questionAnswerDuration.toString()}
                      onChangeText={(text) => handleDurationChange(question.id, 'questionAnswerDuration', text)}
                    />
                  </View>
                </View>
                <View style={styles.pointsFieldHighlight}>
                  <Text style={styles.pointsFieldKicker}>{t('createQuiz.pointsFieldKicker')}</Text>
                  <Text style={styles.durationLabel}>{t('createQuiz.pointsLabel')}</Text>
                  <TextInput
                    style={styles.pointsInput}
                    placeholder={t('createQuiz.autoPlaceholder')}
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType="number-pad"
                    value={question.points.toString()}
                    onChangeText={(text) => handleDurationChange(question.id, 'points', text)}
                  />
                  <Text style={styles.durationHint}>
                    {t('createQuiz.pointsRecommended', {
                      points:
                        question.questionAnswerDuration > 0
                          ? recommendedPointsPerCentisecond(question.questionAnswerDuration)
                          : 0,
                      centiseconds: question.questionAnswerDuration * 100,
                    })}
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
                      placeholder={t('createQuiz.optionPlaceholder', { letter: String.fromCharCode(65 + optIndex) })}
                      placeholderTextColor={Colors.light.textSecondary}
                      value={option}
                      onChangeText={(text) => handleOptionChange(question.id, optIndex, text)}
                    />
                  </View>
                ))}
              </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.addButton} onPress={handleAddQuestion}>
            <Text style={styles.addButtonText}>{t('createQuiz.addQuestion')}</Text>
          </Pressable>
          <GradientButton
            label={saving ? t('common.saving') : t('createQuiz.saveDraft')}
            onPress={handleSaveDraft}
            disabled={saving}
          />
        </View>

        <View style={styles.progressBarContainer}>
          <Text style={styles.progressBarLabel}>
            {t('createQuiz.totalDuration', {
              total: totalDurationSeconds,
              max: MAX_DURATION_SECONDS,
              minutes: MAX_DURATION_MINUTES,
            })}
          </Text>
          <View style={styles.progressBarBackground}>
            <LinearGradient
              {...brandGradientProps}
              style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
            />
          </View>
          <Text style={styles.progressBarInfoText}>
            {t('createQuiz.autoTimeInfo', {
              seconds: START_TIME + FIXED_CORRECTION_TIME + FIXED_RANKING_TIME,
            })}
          </Text>
        </View>

        <View style={styles.difficultySection}>
          <Pressable style={styles.suggestDifficultyButton} onPress={handleSuggestDifficulty}>
            <Text style={styles.suggestDifficultyButtonText}>
              {t('createQuiz.suggestDifficulty')}
            </Text>
          </Pressable>
          {difficultySuggested && suggestedDifficulty ? (
            <View style={styles.difficultyResult}>
              <Text style={styles.difficultyResultText}>
                {t('createQuiz.suggestedDifficulty', { difficulty: suggestedDifficulty })}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.buttonContainer}>
          <GradientButton
            label={advancing ? t('common.saving') : t('createQuiz.next')}
            onPress={handleNext}
            disabled={questions.length < MIN_QUESTIONS || advancing}
          />
        </View>
      </View>

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <MobileModalFrame onBackdropPress={() => setShowCategoryModal(false)}>
          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.four),
                maxHeight: Math.min(windowHeight * 0.78, 560),
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('createQuiz.selectCategory')}</Text>
            <ScrollView
              style={styles.categoryList}
              contentContainerStyle={styles.categoryListContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {QUIZ_CATEGORIES.map((cat) => {
                const pastel = getCategoryStyle(cat);
                const selected = category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryItem,
                      {
                        backgroundColor: pastel.bg,
                        borderColor: selected ? pastel.text : pastel.border,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text
                      style={[styles.categoryItemText, { color: pastel.text }]}
                      numberOfLines={2}
                    >
                      {getCategoryLabel(cat, t)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </MobileModalFrame>
      </Modal>
      </View>
    </ScrollView>
    </CreateGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  phoneColumn: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  gradientHeader: {
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerTextCol: {
    flex: 1,
  },
  backButton: {
    padding: Spacing.two,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  brand: {
    ...titleTypeface,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  title: {
    ...titleTypeface,
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  rulesBar: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    margin: Spacing.four,
    borderRadius: 12,
    gap: Spacing.two,
  },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 10,
    padding: Spacing.three,
    marginBottom: Spacing.one,
  },
  pointsBannerTextCol: {
    flex: 1,
  },
  pointsBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 4,
  },
  pointsBannerBody: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  rulesText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
  },
  progressBarContainer: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingRight: Spacing.two,
  },
  categoryPlaceholder: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    color: Colors.light.textSecondary,
    paddingRight: Spacing.two,
  },
  categoryArrow: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  langHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: -8,
    marginBottom: 4,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  langOptionActive: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  langOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  langOptionTextActive: {
    color: Colors.light.primary,
  },
  langNotTranslated: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  section: {
    gap: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...titleTypeface,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D6D0C8',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  questionAccent: {
    width: 5,
    backgroundColor: Colors.light.primary,
  },
  questionCardInner: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    backgroundColor: '#FFFFFF',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionNumberBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  questionNumber: {
    ...titleTypeface,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: 0.2,
  },
  questionRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  questionTypeContainer: {
    marginBottom: Spacing.one,
  },
  questionTypeLabel: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.two,
    fontWeight: '600',
  },
  questionTypeSelector: {
    flexDirection: 'column',
    gap: Spacing.two,
  },
  questionTypeOption: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: 12,
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
    textAlign: 'center',
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D6D0C8',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    color: Colors.light.text,
  },
  writingAssistantButton: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  writingAssistantBusy: {
    opacity: 0.7,
  },
  writingAssistantText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  spellBanner: {
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
    padding: Spacing.three,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 4,
  },
  spellBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  spellBannerBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#78350F',
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: Spacing.three,
    borderRadius: 12,
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
    borderRadius: 12,
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
    flexDirection: 'column',
    gap: Spacing.three,
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  durationField: {
    width: '100%',
  },
  durationFieldHalf: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.one,
    fontWeight: '600',
  },
  pointsFieldHighlight: {
    width: '100%',
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  pointsFieldKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.light.primary,
    marginBottom: 2,
  },
  pointsInput: {
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
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
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D6D0C8',
    fontSize: 16,
    color: Colors.light.text,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: Spacing.three,
    width: '100%',
  },
  addButton: {
    width: '100%',
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
    borderRadius: 12,
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
    borderRadius: 12,
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
  modalSheet: {
    width: '100%',
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.light.backgroundSelected,
    zIndex: 2,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.backgroundSelected,
    marginBottom: Spacing.three,
  },
  modalTitle: {
    ...titleTypeface,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  categoryList: {
    flexGrow: 0,
    marginBottom: Spacing.three,
  },
  categoryListContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  categoryItem: {
    width: '48.5%',
    minHeight: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryItemText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
  },
  modalCloseButton: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  modalCloseButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
