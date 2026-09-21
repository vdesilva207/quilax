import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface, MaxContentWidth } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useChromeInsets } from '@/hooks/useChromeInsets';
import * as ImagePicker from 'expo-image-picker';
import CustomIcon from '@/components/CustomIcon';
import quizService from '@/services/quizService';
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

const MAX_QUESTIONS = 50;
const MIN_QUESTIONS = 5;
const MAX_DURATION_MINUTES = 20;
const START_TIME = 3;
const FIXED_CORRECTION_TIME = 2;
const FIXED_RANKING_TIME = 6;
const DEFAULT_DIFFICULTY = 5;

function recommendedPoints(answerSeconds: number): number {
  if (!answerSeconds || answerSeconds <= 0) return 1;
  return Math.max(1, Math.ceil(1000 / (answerSeconds * 100)));
}

function isPortableImageUri(uri: string): boolean {
  const u = (uri || '').trim();
  return /^data:image\//i.test(u) || /^https:\/\//i.test(u);
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

type QuestionType = 'true_false' | 'four_options';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  imageUrl?: string;
  questionReadDuration: number;
  questionAnswerDuration: number;
  questionType: QuestionType;
  points: number;
}

type Step = 'info' | 'question';

function emptyQuestion(t: (k: string) => string, type: QuestionType = 'four_options'): Question {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: '',
    options:
      type === 'true_false'
        ? [t('createQuiz.true'), t('createQuiz.false')]
        : ['', '', '', ''],
    correctOption: 0,
    questionReadDuration: 10,
    questionAnswerDuration: 30,
    questionType: type,
    points: recommendedPoints(30),
  };
}

function mapDraftQuestions(raw: any[], t: (k: string) => string): Question[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyQuestion(t)];
  return raw.map((q) => {
    const answers = Array.isArray(q.answers) ? q.answers : [];
    const options = answers.map((a: any) => String(a.text || ''));
    const correctOption = Math.max(
      0,
      answers.findIndex((a: any) => a.isCorrect)
    );
    const isTf =
      options.length === 2 &&
      /verdadero|true|vrai|wahr|vero|waar/i.test(options[0] || '') &&
      /falso|false|faux|falsch|falso|onwaar/i.test(options[1] || '');
    const normalized =
      isTf
        ? options.slice(0, 2)
        : [...options, '', '', '', ''].slice(0, 4);
    while (normalized.length < (isTf ? 2 : 4)) normalized.push('');
    return {
      id: String(q.id || Date.now()),
      text: String(q.text || ''),
      options: normalized,
      correctOption: correctOption >= 0 ? correctOption : 0,
      imageUrl: q.imageUrl && isPortableImageUri(q.imageUrl) ? q.imageUrl : undefined,
      questionReadDuration: Number(q.readTime) || 10,
      questionAnswerDuration: Number(q.answerTime) || 30,
      questionType: isTf ? 'true_false' : 'four_options',
      points: recommendedPoints(Number(q.answerTime) || 30),
    };
  });
}

export default function CreateQuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const chrome = useChromeInsets();

  const [step, setStep] = useState<Step>('info');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [quizLanguage, setQuizLanguage] = useState<QuizContentLanguage>('es');
  const [description, setDescription] = useState('');
  const [tips, setTips] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion(t)]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [loadingDraftId, setLoadingDraftId] = useState<number | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    const res = await quizService.getMyDrafts();
    if (res.success) setDrafts(res.data || []);
    setLoadingDrafts(false);
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const totalDurationSeconds = useMemo(() => {
    const fixed = questions.length * (FIXED_CORRECTION_TIME + FIXED_RANKING_TIME);
    const qTime = questions.reduce(
      (sum, q) => sum + (q.questionReadDuration || 0) + (q.questionAnswerDuration || 0),
      0
    );
    return START_TIME + fixed + qTime;
  }, [questions]);

  const completeCount = useMemo(
    () => questions.filter((q) => isQuestionComplete(q)).length,
    [questions]
  );

  const currentQuestion = questions[questionIndex] || questions[0];

  const pickImage = async (aspect: [number, number]): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality: 0.55,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return null;
      const asset = result.assets[0];
      const mime = (asset.mimeType || 'image/jpeg').toLowerCase();
      const ok =
        mime.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif)$/i.test(asset.uri || '');
      if (!ok) {
        Alert.alert(t('createQuiz.invalidFormatTitle'), t('createQuiz.invalidFormatBody'));
        return null;
      }
      if (asset.base64) {
        return `data:${mime.startsWith('image/') ? mime : 'image/jpeg'};base64,${asset.base64}`;
      }
      if (asset.uri && isPortableImageUri(asset.uri) && !isUnusableLocalImageUri(asset.uri)) {
        return asset.uri;
      }
      Alert.alert(t('common.error'), t('createQuiz.imageReadError'));
      return null;
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('createQuiz.imageReadError'));
      return null;
    }
  };

  const buildMetaPayload = () => ({
    title: title.trim(),
    category: category || undefined,
    language: quizLanguage,
    coverImage:
      coverImage && isPortableImageUri(coverImage) && !isUnusableLocalImageUri(coverImage)
        ? coverImage
        : undefined,
    description: description.trim() || undefined,
    tips: tips.trim() || undefined,
  });

  const buildQuestionsPayload = () =>
    questions
      .filter((q) => q.text.trim())
      .map((q) => ({
        text: q.text.trim(),
        imageUrl:
          q.imageUrl && isPortableImageUri(q.imageUrl) && !isUnusableLocalImageUri(q.imageUrl)
            ? q.imageUrl
            : undefined,
        timeReadMs: (q.questionReadDuration || 5) * 1000,
        timeAnswerMs: (q.questionAnswerDuration || 10) * 1000,
        answers: q.options.map((opt, idx) => ({
          text: opt.trim() || '—',
          isCorrect: idx === q.correctOption,
        })),
      }));

  const persist = async (opts: { includeQuestions: boolean }) => {
    if (!title.trim()) {
      return { success: false as const, error: t('createQuiz.titleRequiredError') };
    }
    const payload: any = { ...buildMetaPayload() };
    if (opts.includeQuestions) {
      payload.questions = buildQuestionsPayload();
    }
    if (quizId) {
      const updated = await quizService.updateQuiz(quizId, payload);
      return updated;
    }
    const created = await quizService.createQuiz(payload);
    if (!created.success || !created.data?.id) return created;
    const id = created.data.id as number;
    setQuizId(id);
    if (opts.includeQuestions && payload.questions?.length) {
      const updated = await quizService.updateQuiz(id, payload);
      if (updated.success) return { success: true, data: { ...updated.data, id } };
      return updated;
    }
    return { success: true, data: { ...created.data, id } };
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('createQuiz.titleRequiredError'));
      return;
    }
    setSaving(true);
    const result = await persist({ includeQuestions: step === 'question' || questions.some((q) => q.text.trim()) });
    setSaving(false);
    if (!result.success) {
      Alert.alert(t('common.error'), result.error || t('createQuiz.saveErrorBody'));
      return;
    }
    if (result.data?.id) setQuizId(result.data.id);
    await loadDrafts();
    Alert.alert(t('common.success'), t('createQuiz.draftSavedBody'));
  };

  const openDraft = async (draft: any) => {
    setLoadingDraftId(draft.id);
    setQuizId(draft.id);
    setTitle(draft.title || '');
    setCategory(draft.category || '');
    setQuizLanguage((draft.language || 'es') as QuizContentLanguage);
    setDescription(draft.description || '');
    setTips(draft.tips || '');
    setCoverImage(
      draft.coverImage && isPortableImageUri(draft.coverImage) ? draft.coverImage : ''
    );
    setQuestions(mapDraftQuestions(draft.questions || [], t));
    setStep('info');
    setQuestionIndex(0);
    setLoadingDraftId(null);
  };

  const goForwardFromInfo = () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('createQuiz.titleRequiredError'));
      return;
    }
    if (!category) {
      Alert.alert(t('common.error'), t('createQuiz.categoryRequiredError'));
      return;
    }
    if (!questions.length) setQuestions([emptyQuestion(t)]);
    setQuestionIndex(0);
    setStep('question');
  };

  const goBack = () => {
    if (step === 'info') {
      router.back();
      return;
    }
    if (questionIndex <= 0) {
      setStep('info');
      return;
    }
    setQuestionIndex((i) => i - 1);
  };

  const goForwardQuestion = () => {
    const q = questions[questionIndex];
    if (!isQuestionComplete(q)) {
      Alert.alert(t('common.error'), t('createQuiz.questionIncompleteError'));
      return;
    }
    if (totalDurationSeconds / 60 > MAX_DURATION_MINUTES) {
      Alert.alert(
        t('createQuiz.timeLimitTitle'),
        t('createQuiz.timeLimitBody', { minutes: MAX_DURATION_MINUTES })
      );
      return;
    }
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    if (questions.length >= MAX_QUESTIONS) {
      Alert.alert(
        t('createQuiz.limitReachedTitle'),
        t('createQuiz.limitReachedBody', { count: MAX_QUESTIONS })
      );
      return;
    }
    const next = emptyQuestion(t);
    setQuestions([...questions, next]);
    setQuestionIndex(questions.length);
  };

  const goToSchedule = async () => {
    if (completeCount < MIN_QUESTIONS) {
      Alert.alert(
        t('common.error'),
        t('createQuiz.minQuestionsError', { count: MIN_QUESTIONS })
      );
      return;
    }
    const q = questions[questionIndex];
    if (!isQuestionComplete(q)) {
      Alert.alert(t('common.error'), t('createQuiz.questionIncompleteError'));
      return;
    }
    setSaving(true);
    const result = await persist({ includeQuestions: true });
    setSaving(false);
    if (!result.success) {
      Alert.alert(t('common.error'), result.error || t('createQuiz.nextErrorBody'));
      return;
    }
    const id = result.data?.id ?? quizId;
    if (id) setQuizId(id);
    router.push({
      pathname: '/(app)/quiz/schedule',
      params: {
        quizId: String(id || ''),
        difficulty: String(DEFAULT_DIFFICULTY),
        questionsCount: String(completeCount),
      },
    });
  };

  const updateCurrent = (patch: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === questionIndex ? { ...q, ...patch } : q))
    );
  };

  const setQuestionType = (type: QuestionType) => {
    if (type === 'true_false') {
      updateCurrent({
        questionType: type,
        options: [t('createQuiz.true'), t('createQuiz.false')],
        correctOption: 0,
      });
    } else {
      updateCurrent({
        questionType: type,
        options: ['', '', '', ''],
        correctOption: 0,
      });
    }
  };

  const showScheduleCta = step === 'question' && completeCount >= MIN_QUESTIONS;

  return (
    <CreateGate>
      <View style={styles.root}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.phoneColumn}>
            <LinearGradient
              {...brandGradientProps}
              style={[styles.gradientHeader, { paddingTop: chrome.headerPaddingTop }]}
            >
              <View style={styles.header}>
                <Pressable onPress={goBack} style={styles.backButton} hitSlop={12}>
                  <CustomIcon name="back" size={24} color="#FFFFFF" />
                </Pressable>
                <View style={styles.headerTextCol}>
                  <Text style={styles.brand}>QUILAX</Text>
                  <Text style={styles.title}>
                    {step === 'info'
                      ? t('createQuiz.title')
                      : t('createQuiz.questionNumber', { n: questionIndex + 1 })}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {step === 'info' ? (
              <View style={styles.form}>
                <View style={styles.draftsBox}>
                  <Text style={styles.draftsTitle}>{t('createQuiz.draftsTitle')}</Text>
                  {loadingDrafts ? (
                    <ActivityIndicator color={Colors.light.primary} />
                  ) : drafts.length === 0 ? (
                    <Text style={styles.draftsEmpty}>{t('createQuiz.draftsEmpty')}</Text>
                  ) : (
                    drafts.map((d) => (
                      <Pressable
                        key={d.id}
                        style={styles.draftRow}
                        onPress={() => void openDraft(d)}
                        disabled={loadingDraftId === d.id}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.draftRowTitle} numberOfLines={1}>
                            {d.title || t('createQuiz.untitledDraft')}
                          </Text>
                          <Text style={styles.draftRowMeta}>
                            {t('createQuiz.draftsMeta', {
                              n: d._count?.questions ?? d.questions?.length ?? 0,
                            })}
                          </Text>
                        </View>
                        {loadingDraftId === d.id ? (
                          <ActivityIndicator size="small" color={Colors.light.primary} />
                        ) : (
                          <Text style={styles.draftOpen}>{t('createQuiz.openDraft')}</Text>
                        )}
                      </Pressable>
                    ))
                  )}
                </View>

                <View style={styles.pointsBanner}>
                  <CustomIcon name="star" size={18} color={Colors.light.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pointsBannerTitle}>
                      {t('createQuiz.rulesMaxPointsTitle')}
                    </Text>
                    <Text style={styles.pointsBannerBody}>
                      {t('createQuiz.rulesMaxPointsBody')}
                    </Text>
                  </View>
                </View>

                <View style={styles.spellBanner}>
                  <Text style={styles.spellBannerTitle}>{t('createQuiz.spellBannerTitle')}</Text>
                  <Text style={styles.spellBannerBody}>{t('createQuiz.spellOnlyMessage')}</Text>
                </View>

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
                  <View style={styles.coverPreviewWrap}>
                    <Image source={{ uri: coverImage }} style={styles.coverPreview} resizeMode="cover" />
                    <Pressable
                      style={styles.removePhotoBtn}
                      onPress={() => setCoverImage('')}
                    >
                      <Text style={styles.removePhotoText}>{t('common.delete')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.addImageButton}
                    onPress={async () => {
                      const uri = await pickImage([16, 9]);
                      if (uri) setCoverImage(uri);
                    }}
                  >
                    <CustomIcon name="camera" size={16} color={Colors.light.text} />
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
                  >
                    {category
                      ? getCategoryLabel(category, t)
                      : t('createQuiz.selectCategory')}
                  </Text>
                </Pressable>

                <Text style={styles.label}>{t('createQuiz.languageLabel')}</Text>
                <View style={styles.langRow}>
                  {QUIZ_CONTENT_LANGUAGES.map((lang) => (
                    <Pressable
                      key={lang.code}
                      onPress={() => setQuizLanguage(lang.code)}
                      style={[
                        styles.langChip,
                        quizLanguage === lang.code && styles.langChipActive,
                      ]}
                    >
                      <QuizLanguageBadge language={lang.code} />
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>{t('createQuiz.descriptionLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('createQuiz.descriptionPlaceholder')}
                  placeholderTextColor={Colors.light.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />

                <Text style={styles.label}>{t('createQuiz.tipsLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('createQuiz.tipsPlaceholder')}
                  placeholderTextColor={Colors.light.textSecondary}
                  value={tips}
                  onChangeText={setTips}
                  multiline
                />
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.progressHint}>
                  {t('createQuiz.questionProgress', {
                    current: questionIndex + 1,
                    total: questions.length,
                    complete: completeCount,
                    min: MIN_QUESTIONS,
                  })}
                </Text>

                <Text style={styles.label}>{t('createQuiz.questionTypeLabel')}</Text>
                <View style={styles.typeRow}>
                  <Pressable
                    style={[
                      styles.typeChip,
                      currentQuestion.questionType === 'true_false' && styles.typeChipActive,
                    ]}
                    onPress={() => setQuestionType('true_false')}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        currentQuestion.questionType === 'true_false' && styles.typeChipTextActive,
                      ]}
                    >
                      {t('createQuiz.questionTypeTrueFalse')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.typeChip,
                      currentQuestion.questionType === 'four_options' && styles.typeChipActive,
                    ]}
                    onPress={() => setQuestionType('four_options')}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        currentQuestion.questionType === 'four_options' &&
                          styles.typeChipTextActive,
                      ]}
                    >
                      {t('createQuiz.questionTypeFour')}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.label}>{t('createQuiz.questionNumber', { n: questionIndex + 1 })}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('createQuiz.questionPlaceholder')}
                  placeholderTextColor={Colors.light.textSecondary}
                  value={currentQuestion.text}
                  onChangeText={(text) => updateCurrent({ text })}
                  multiline
                />

                <Text style={styles.label}>{t('createQuiz.addPhoto')}</Text>
                {currentQuestion.imageUrl ? (
                  <View style={styles.coverPreviewWrap}>
                    <Image
                      source={{ uri: currentQuestion.imageUrl }}
                      style={styles.questionPreview}
                      resizeMode="cover"
                    />
                    <Pressable
                      style={styles.removePhotoBtn}
                      onPress={() => updateCurrent({ imageUrl: undefined })}
                    >
                      <Text style={styles.removePhotoText}>{t('common.delete')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.addImageButton}
                    onPress={async () => {
                      const uri = await pickImage([4, 3]);
                      if (uri) updateCurrent({ imageUrl: uri });
                    }}
                  >
                    <CustomIcon name="camera" size={16} color={Colors.light.text} />
                    <Text style={styles.addImageText}>{t('createQuiz.addPhoto')}</Text>
                  </Pressable>
                )}

                <Text style={styles.label}>{t('createQuiz.answersLabel')}</Text>
                {currentQuestion.options.map((opt, optIndex) => {
                  const selected = currentQuestion.correctOption === optIndex;
                  return (
                    <View key={optIndex} style={styles.optionRow}>
                      <Pressable
                        style={[styles.correctCircle, selected && styles.correctCircleActive]}
                        onPress={() => updateCurrent({ correctOption: optIndex })}
                        hitSlop={8}
                      >
                        {selected ? (
                          <CustomIcon name="check" size={22} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.correctLetter}>
                            {String.fromCharCode(65 + optIndex)}
                          </Text>
                        )}
                      </Pressable>
                      <TextInput
                        style={[styles.input, styles.optionInput]}
                        placeholder={t('createQuiz.optionPlaceholder', {
                          letter: String.fromCharCode(65 + optIndex),
                        })}
                        placeholderTextColor={Colors.light.textSecondary}
                        value={opt}
                        editable={currentQuestion.questionType !== 'true_false'}
                        onChangeText={(text) => {
                          const options = [...currentQuestion.options];
                          options[optIndex] = text;
                          updateCurrent({ options });
                        }}
                      />
                    </View>
                  );
                })}

                <View style={styles.durationRow}>
                  <View style={styles.durationHalf}>
                    <Text style={styles.label}>{t('createQuiz.readTimeLabel')}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={String(currentQuestion.questionReadDuration)}
                      onChangeText={(v) =>
                        updateCurrent({ questionReadDuration: parseInt(v, 10) || 0 })
                      }
                    />
                  </View>
                  <View style={styles.durationHalf}>
                    <Text style={styles.label}>{t('createQuiz.answerTimeLabel')}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={String(currentQuestion.questionAnswerDuration)}
                      onChangeText={(v) => {
                        const secs = parseInt(v, 10) || 0;
                        updateCurrent({
                          questionAnswerDuration: secs,
                          points: recommendedPoints(secs),
                        });
                      }}
                    />
                  </View>
                </View>

                <View style={styles.pointsFieldHighlight}>
                  <Text style={styles.pointsFieldKicker}>{t('createQuiz.pointsFieldKicker')}</Text>
                  <Text style={styles.label}>{t('createQuiz.pointsLabel')}</Text>
                  <TextInput
                    style={styles.pointsInput}
                    keyboardType="number-pad"
                    value={String(currentQuestion.points)}
                    onChangeText={(v) => updateCurrent({ points: parseInt(v, 10) || 0 })}
                  />
                  <Text style={styles.durationHint}>
                    {t('createQuiz.pointsRecommended', {
                      points: recommendedPoints(currentQuestion.questionAnswerDuration),
                      centiseconds: currentQuestion.questionAnswerDuration * 100,
                    })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(chrome.bottomPadding, Spacing.three) }]}>
          <View style={styles.footerRow}>
            <Pressable style={styles.navBtn} onPress={goBack}>
              <Text style={styles.navBtnText}>{t('createQuiz.navBack')}</Text>
            </Pressable>
            <Pressable
              style={[styles.navBtn, styles.navBtnPrimary]}
              onPress={step === 'info' ? goForwardFromInfo : goForwardQuestion}
            >
              <Text style={[styles.navBtnText, styles.navBtnTextPrimary]}>
                {t('createQuiz.navForward')}
              </Text>
            </Pressable>
          </View>
          <GradientButton
            label={saving ? t('createQuiz.savingDraft') : t('createQuiz.saveDraft')}
            onPress={() => void handleSaveDraft()}
            disabled={saving}
          />
          {showScheduleCta ? (
            <GradientButton
              label={t('createQuiz.continueToSchedule')}
              onPress={() => void goToSchedule()}
              disabled={saving}
            />
          ) : null}
        </View>

        <Modal visible={showCategoryModal} transparent animationType="fade">
          <MobileModalFrame>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t('createQuiz.selectCategory')}</Text>
              <ScrollView style={{ maxHeight: 360 }}>
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
                      <Text style={[styles.categoryItemText, { color: pastel.text }]}>
                        {getCategoryLabel(cat, t)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable
                style={styles.modalClose}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </MobileModalFrame>
        </Modal>
      </View>
    </CreateGate>
  );
}

function isQuestionComplete(q: Question | undefined): boolean {
  if (!q) return false;
  if (!q.text.trim()) return false;
  if (q.questionReadDuration <= 0 || q.questionAnswerDuration <= 0) return false;
  if (q.questionType === 'true_false') {
    return q.options.length === 2 && q.options.every((o) => o.trim());
  }
  if (q.options.length !== 4) return false;
  if (!q.options.every((o) => o.trim())) return false;
  if (q.correctOption < 0 || q.correctOption > 3) return false;
  return true;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  container: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingBottom: 160 },
  phoneColumn: { width: '100%', maxWidth: MaxContentWidth },
  gradientHeader: { paddingBottom: Spacing.four, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerTextCol: { flex: 1 },
  backButton: { padding: Spacing.two },
  brand: {
    ...titleTypeface,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  title: {
    ...titleTypeface,
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  form: { padding: Spacing.four, gap: Spacing.three },
  draftsBox: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    gap: Spacing.two,
  },
  draftsTitle: { fontSize: 15, fontWeight: '800', color: Colors.light.text },
  draftsEmpty: { fontSize: 13, color: Colors.light.textSecondary },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
  },
  draftRowTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  draftRowMeta: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  draftOpen: { fontSize: 13, fontWeight: '700', color: Colors.light.primary },
  pointsBanner: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 10,
    padding: Spacing.three,
  },
  pointsBannerTitle: { fontSize: 15, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  pointsBannerBody: { fontSize: 13, lineHeight: 18, color: Colors.light.textSecondary },
  spellBanner: {
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: Spacing.three,
  },
  spellBannerTitle: { fontSize: 14, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  spellBannerBody: { fontSize: 13, lineHeight: 18, color: Colors.light.textSecondary },
  label: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    color: Colors.light.text,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  coverPreviewWrap: { gap: Spacing.two },
  coverPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSelected,
  },
  questionPreview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSelected,
  },
  removePhotoBtn: { alignSelf: 'flex-start' },
  removePhotoText: { color: Colors.light.error, fontWeight: '700' },
  addImageButton: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.three,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addImageText: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  categoryButton: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  categoryText: { fontSize: 15, fontWeight: '700' },
  categoryPlaceholder: { fontSize: 15, color: Colors.light.textSecondary },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  langChip: {
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  langChipActive: { borderColor: Colors.light.primary, backgroundColor: '#EFF6FF' },
  progressHint: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: Spacing.two },
  typeChip: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
  },
  typeChipActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  typeChipText: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  typeChipTextActive: { color: '#FFFFFF' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  correctCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctCircleActive: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  correctLetter: { fontSize: 16, fontWeight: '800', color: Colors.light.textSecondary },
  optionInput: { flex: 1 },
  durationRow: { flexDirection: 'row', gap: Spacing.two },
  durationHalf: { flex: 1, gap: Spacing.one },
  pointsFieldHighlight: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
    backgroundColor: Colors.light.background,
  },
  pointsFieldKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.light.primary,
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
  durationHint: { fontSize: 11, color: Colors.light.textSecondary },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    backgroundColor: Colors.light.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
    gap: Spacing.two,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.two },
  navBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  navBtnPrimary: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  navBtnText: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  navBtnTextPrimary: { color: '#FFFFFF' },
  modalCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.light.text },
  categoryItem: {
    padding: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },
  categoryItemText: { fontSize: 14, fontWeight: '700' },
  modalClose: { alignItems: 'center', padding: Spacing.two },
  modalCloseText: { fontWeight: '700', color: Colors.light.textSecondary },
});
