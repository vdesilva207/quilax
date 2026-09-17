import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { brandGradientProps } from '@/constants/gradients';
import { useAuth } from '@/context/AuthContext';
import { AppScreen } from '@/components/ui/AppScreen';
import { QuizCard } from '@/components/QuizCard';
import CustomIcon from '@/components/CustomIcon';
import apiClient from '@/lib/api';
import settingsService from '@/services/settingsService';
import { getDateLocale, formatQuizStart, resolveViewerTimezone } from '@/utils/timezone';

type Tab = 'posts' | 'history';

type Post = {
  id: number;
  text?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  status?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout, refreshProfile } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [history, setHistory] = useState<any>(null);
  const [historyPrivate, setHistoryPrivate] = useState(false);
  const [showQuizHistory, setShowQuizHistory] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeImage, setComposeImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [recoverable, setRecoverable] = useState<any[]>([]);
  const [recoveringId, setRecoveringId] = useState<number | 'all' | null>(null);

  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const refreshed = await refreshProfile?.();
      const profile = refreshed?.profile;
      if (profile?.showQuizHistory != null) {
        setShowQuizHistory(!!profile.showQuizHistory);
      }

      const [postsRes, histRes, privacyRes, upcomingRes, recoverableRes] = await Promise.all([
        apiClient.get(`/posts/user/${userId}?limit=30`).catch(() => ({ posts: [] })),
        apiClient.get(`/profile/${userId}/history`).catch(() => null),
        settingsService.getPrivacySettings().catch(() => null),
        apiClient.get('/profile/me/upcoming-enrollments').catch(() => ({ enrollments: [] })),
        apiClient.get('/profile/me/recoverable-enrollments').catch(() => ({ enrollments: [] })),
      ]);

      setPosts(postsRes.posts || []);
      setUpcoming(upcomingRes?.enrollments || []);
      setRecoverable(recoverableRes?.enrollments || []);
      if (histRes?.private) {
        setHistoryPrivate(true);
        setHistory(null);
      } else {
        setHistoryPrivate(false);
        setHistory(histRes?.history || null);
      }
      const p = privacyRes?.data?.privacy || privacyRes?.data || privacyRes?.privacy;
      if (p?.showQuizHistory != null) setShowQuizHistory(!!p.showQuizHistory);
    } finally {
      setLoading(false);
    }
  }, [userId, refreshProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const pickPostImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    setComposeImage(
      asset.base64 ? `data:${mime};base64,${asset.base64}` : asset.uri
    );
  };

  const publish = async () => {
    if (!composeText.trim() && !composeImage) {
      Alert.alert(t('profile.emptyTitle'), t('profile.emptyPostBody'));
      return;
    }
    setPosting(true);
    try {
      const data = await apiClient.post('/posts', {
        text: composeText.trim() || undefined,
        imageUrl: composeImage || undefined,
      });
      setPosts((prev) => [data.post, ...prev]);
      setComposeText('');
      setComposeImage(null);
      setShowCompose(false);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('profile.publishError'));
    } finally {
      setPosting(false);
    }
  };

  const deletePost = (postId: number) => {
    Alert.alert(t('profile.deleteConfirmTitle'), t('profile.deletePostConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/posts/${postId}`);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('profile.deletePostError'));
          }
        },
      },
    ]);
  };

  const openPostMenu = (postId: number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('common.delete')],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) deletePost(postId);
        },
      );
      return;
    }
    Alert.alert(t('profile.postOptions'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deletePost(postId),
      },
    ]);
  };

  const toggleHistoryPrivacy = async (value: boolean) => {
    setShowQuizHistory(value);
    setSavingPrivacy(true);
    const result = await settingsService.updatePrivacySettings({ showQuizHistory: value });
    setSavingPrivacy(false);
    if (!result.success) {
      setShowQuizHistory(!value);
      Alert.alert(t('common.error'), t('profile.privacySaveError'));
    }
  };

  const recoverOne = async (quizId: number) => {
    setRecoveringId(quizId);
    try {
      await apiClient.post(`/profile/me/recoverable-enrollments/${quizId}/recover`);
      setRecoverable((prev) => prev.filter((x) => x.quizId !== quizId));
      await refreshProfile?.();
      Alert.alert(t('profile.recoverSuccess'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('profile.recoverError'));
    } finally {
      setRecoveringId(null);
    }
  };

  const recoverAll = async () => {
    setRecoveringId('all');
    try {
      const res = await apiClient.post('/profile/me/recoverable-enrollments/recover-all');
      const n = res?.refunded ?? recoverable.length;
      setRecoverable([]);
      await refreshProfile?.();
      Alert.alert(t('profile.recoverAllSuccess', { n }));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('profile.recoverError'));
    } finally {
      setRecoveringId(null);
    }
  };

  const displayName = user?.fullName || user?.email || t('profile.title');
  const stats = user?.statistics;

  if (loading && !user) {
    return (
      <AppScreen>
        <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 80 }} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {/* Banner + avatar (Twitter-like) */}
      <LinearGradient {...brandGradientProps} style={styles.banner}>
        <View style={styles.bannerTop}>
          <View>
            <Text style={styles.brand}>QUILAX</Text>
            <Text style={styles.bannerScreen}>{t('profile.title')}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.avatarRow}>
        <View style={styles.avatarWrap}>
          {user?.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <CustomIcon name="user" size={36} color={Colors.light.primary} />
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.editBtn} onPress={() => router.push('/(app)/profile/edit')}>
            <Text style={styles.editBtnText}>{t('profile.edit')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.identity}>
        <Text style={styles.name}>{displayName}</Text>
        {user?.username ? (
          <Text style={styles.handle}>@{user.username}</Text>
        ) : (
          <Text style={styles.handle}>{user?.email}</Text>
        )}
        {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        <View style={styles.statsRow}>
          <Pressable style={styles.stat} onPress={() => router.push('/(app)/profile/following')}>
            <Text style={styles.statNum}>{stats?.following ?? 0}</Text>
            <Text style={styles.statLabel}>{t('profile.statFollowing')}</Text>
          </Pressable>
          <Pressable style={styles.stat} onPress={() => router.push('/(app)/profile/followers')}>
            <Text style={styles.statNum}>{stats?.followers ?? 0}</Text>
            <Text style={styles.statLabel}>{t('profile.statFollowers')}</Text>
          </Pressable>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{stats?.posts ?? posts.length}</Text>
            <Text style={styles.statLabel}>{t('profile.statPosts')}</Text>
          </View>
        </View>

        <View style={styles.seasonCard}>
          <Text style={styles.seasonLabel}>{t('profile.seasonPointsHeading')}</Text>
          <Text style={styles.seasonPoints}>
            {t('profile.seasonPointsValue', {
              n: user?.seasonPoints ?? stats?.seasonPoints ?? 0,
            })}
          </Text>
          {user?.seasonRank ? (
            <Text style={styles.seasonRank}>
              {t('profile.seasonRankValue', { n: user.seasonRank })}
            </Text>
          ) : (
            <Text style={styles.seasonRank}>{t('profile.seasonPointsHint')}</Text>
          )}
        </View>
      </View>

      {recoverable.length > 0 ? (
        <View style={styles.upcomingBlock}>
          <Text style={styles.upcomingHeading}>{t('profile.recoverSection')}</Text>
          <Text style={styles.upcomingSub}>{t('profile.recoverSubtitle')}</Text>
          {recoverable.length > 1 ? (
            <Pressable
              style={({ pressed }) => [styles.recoverAllBtn, pressed && { opacity: 0.9 }]}
              disabled={recoveringId != null}
              onPress={recoverAll}
            >
              {recoveringId === 'all' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.recoverAllText}>{t('profile.recoverAll')}</Text>
              )}
            </Pressable>
          ) : null}
          {recoverable.map((item) => {
            const reason =
              item.reason === 'CANCELLED'
                ? t('profile.recoverReasonCancelled')
                : t('profile.recoverReasonNeverRan');
            const when = item.scheduledAt
              ? formatQuizStart(item.scheduledAt, resolveViewerTimezone()).compactLabel
              : null;
            return (
              <View key={item.enrollmentId || item.quizId} style={styles.upcomingCard}>
                <View style={styles.upcomingTop}>
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingBadgeText}>{reason}</Text>
                  </View>
                  {when ? (
                    <Text style={styles.upcomingWhen} numberOfLines={1}>
                      {when}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.upcomingTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.recoverBtn, pressed && { opacity: 0.9 }]}
                  disabled={recoveringId != null}
                  onPress={() => recoverOne(item.quizId)}
                >
                  {recoveringId === item.quizId ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.recoverBtnText}>{t('profile.recoverOne')}</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <View style={styles.upcomingBlock}>
          <Text style={styles.upcomingHeading}>{t('profile.upcomingHeading')}</Text>
          <Text style={styles.upcomingSub}>{t('profile.upcomingSub')}</Text>
          {upcoming.map((item) => {
            const tz = resolveViewerTimezone();
            const when = item.startsAt
              ? formatQuizStart(item.startsAt, tz).compactLabel
              : item.lobby
                ? t('profile.lobbyOpen')
                : item.live
                  ? t('profile.liveNow')
                  : t('profile.dateTBD');
            const badge = item.live ? t('profile.badgeLive') : item.lobby ? t('profile.badgeLobby') : t('profile.badgeEnrolled');
            return (
              <Pressable
                key={item.enrollmentId || item.quizId}
                style={({ pressed }) => [
                  styles.upcomingCard,
                  pressed && { opacity: 0.92 },
                  item.live && styles.upcomingLive,
                ]}
                onPress={() => {
                  if (item.activeRunId && (item.live || item.lobby)) {
                    router.push(`/(app)/quiz/run/${item.activeRunId}` as any);
                  } else {
                    router.push(`/(app)/quiz/${item.quizId}` as any);
                  }
                }}
              >
                <View style={styles.upcomingTop}>
                  <View
                    style={[
                      styles.upcomingBadge,
                      item.live && styles.upcomingBadgeLive,
                    ]}
                  >
                    <Text style={styles.upcomingBadgeText}>{badge}</Text>
                  </View>
                  <Text style={styles.upcomingWhen} numberOfLines={1}>
                    {when}
                  </Text>
                </View>
                <Text style={styles.upcomingTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.upcomingMeta}>
                  {(item.category || t('profile.quizFallback')) +
                    (item.questionsCount
                      ? ` · ${t('profile.questionsCount', { n: item.questionsCount })}`
                      : '') +
                    (item.enrollmentCount
                      ? ` · ${t('home.enrolled', { n: item.enrollmentCount })}`
                      : '')}
                </Text>
                <Text style={styles.upcomingCta}>{t('profile.openQuiz')}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'posts' && styles.tabActive]}
          onPress={() => setTab('posts')}
        >
          <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>
            {t('profile.tabPosts')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            {t('profile.tabHistory')}
          </Text>
        </Pressable>
        {tab === 'posts' ? (
          <Pressable
            style={styles.newPostFab}
            onPress={() => setShowCompose((v) => !v)}
            hitSlop={6}
            accessibilityLabel={t('profile.newPostA11y')}
          >
            <CustomIcon name={showCompose ? 'close' : 'add'} size={20} color="#FFF" />
          </Pressable>
        ) : null}
      </View>

      {tab === 'posts' && showCompose ? (
        <View style={styles.composeBox}>
          <TextInput
            style={styles.composeInput}
            placeholder={t('profile.composePlaceholder')}
            placeholderTextColor={Colors.light.textSecondary}
            value={composeText}
            onChangeText={setComposeText}
            multiline
            maxLength={500}
          />
          {composeImage ? (
            <Image source={{ uri: composeImage }} style={styles.composePreview} />
          ) : null}
          <View style={styles.composeActions}>
            <Pressable onPress={pickPostImage}>
              <Text style={styles.linkAction}>{t('profile.addPhoto')}</Text>
            </Pressable>
            {composeImage ? (
              <Pressable onPress={() => setComposeImage(null)}>
                <Text style={styles.linkMuted}>{t('profile.removePhoto')}</Text>
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }} />
            <Pressable
              style={[styles.publishBtn, posting && { opacity: 0.6 }]}
              onPress={publish}
              disabled={posting}
            >
              <Text style={styles.publishBtnText}>{posting ? '…' : t('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {tab === 'posts' ? (
        <View style={styles.feed}>
          {posts.length === 0 ? (
            <Text style={styles.empty}>{t('profile.noPostsYet')}</Text>
          ) : (
            posts
              .filter((p) => p.status !== 'REMOVED')
              .map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHead}>
                    <View style={styles.postAuthor}>
                      {user?.profilePhoto ? (
                        <Image source={{ uri: user.profilePhoto }} style={styles.postAvatar} />
                      ) : (
                        <View style={[styles.postAvatar, styles.postAvatarPlaceholder]}>
                          <CustomIcon name="user" size={16} color={Colors.light.primary} />
                        </View>
                      )}
                      <View style={styles.postAuthorText}>
                        <Text style={styles.postAuthorName} numberOfLines={1}>
                          {user?.username ? `@${user.username}` : displayName}
                        </Text>
                        <Text style={styles.postDate}>
                          {new Date(post.createdAt).toLocaleString(getDateLocale())}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => openPostMenu(post.id)}
                      hitSlop={10}
                      accessibilityLabel={t('profile.postOptions')}
                      style={styles.postMenuBtn}
                    >
                      <Text style={styles.postMenuDots}>⋯</Text>
                    </Pressable>
                  </View>
                  {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}
                  {post.imageUrl ? (
                    <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                  ) : null}
                  {post.status === 'HIDDEN' ? (
                    <Text style={styles.hiddenTag}>{t('profile.hiddenByModeration')}</Text>
                  ) : null}
                </View>
              ))
          )}
        </View>
      ) : (
        <View style={styles.historyBox}>
          <View style={styles.privacyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyTitle}>{t('profile.publicHistoryTitle')}</Text>
              <Text style={styles.privacySub}>{t('profile.publicHistorySub')}</Text>
            </View>
            <Switch
              value={showQuizHistory}
              onValueChange={toggleHistoryPrivacy}
              disabled={savingPrivacy}
              trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.primary }}
            />
          </View>

          {!showQuizHistory ? (
            <Text style={styles.empty}>{t('profile.historyPrivateNote')}</Text>
          ) : null}

          {historyPrivate ? (
            <Text style={styles.empty}>{t('profile.historyPrivateLabel')}</Text>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{t('profile.playedQuizzesSection')}</Text>
              {(history?.participated || []).length === 0 ? (
                <Text style={styles.muted}>{t('common.noneYet')}</Text>
              ) : (
                history.participated.slice(0, 12).map((item: any, index: number) => (
                  <QuizCard
                    key={`p-${item.id}`}
                    staggerIndex={index}
                    title={item.title}
                    category={item.category}
                    language={item.language}
                    meta={item.score != null ? `${item.score} pts` : undefined}
                    onPress={
                      item.quizId
                        ? () => router.push(`/(app)/quiz/${item.quizId}`)
                        : undefined
                    }
                  />
                ))
              )}

              <Text style={styles.sectionTitle}>{t('profile.prizesWonSection')}</Text>
              {(history?.prizes || []).length === 0 ? (
                <Text style={styles.muted}>{t('common.noneYet')}</Text>
              ) : (
                history.prizes.slice(0, 12).map((item: any, index: number) => (
                  <QuizCard
                    key={`w-${item.id}`}
                    staggerIndex={index}
                    title={item.title}
                    category={item.category}
                    language={item.language}
                    meta={t('profile.creditsWon', { n: item.creditsWon })}
                    onPress={
                      item.quizId
                        ? () => router.push(`/(app)/quiz/${item.quizId}`)
                        : undefined
                    }
                  />
                ))
              )}

              <Text style={styles.sectionTitle}>{t('profile.createdQuizzesSection')}</Text>
              {(history?.created || []).length === 0 ? (
                <Text style={styles.muted}>{t('common.noneYet')}</Text>
              ) : (
                history.created.slice(0, 12).map((item: any, index: number) => (
                  <QuizCard
                    key={`c-${item.id}`}
                    staggerIndex={index}
                    title={item.title}
                    category={item.category}
                    language={item.language}
                    meta={item.status}
                    onPress={() => router.push(`/(app)/quiz/${item.id}`)}
                  />
                ))
              )}
            </>
          )}

          <Pressable
            style={styles.linkRow}
            onPress={() => router.push('/(app)/profile/achievements')}
          >
            <Text style={styles.linkAction}>{t('profile.viewAchievementsLink')}</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.logout} onPress={logout} testID="logout-button">
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </Pressable>
      <View style={{ height: Spacing.six }} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 120,
    paddingTop: Platform.OS === 'web' ? 24 : 48,
    paddingHorizontal: Spacing.four,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    ...titleTypeface,
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bannerScreen: {
    ...titleTypeface,
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginTop: -36,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: Colors.light.background,
    backgroundColor: Colors.light.backgroundElement,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  editBtn: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: { fontWeight: '700', color: Colors.light.text, fontSize: 13 },
  identity: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  name: {
    ...titleTypeface,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
  },
  handle: { color: Colors.light.textSecondary, marginTop: 2, fontSize: 14 },
  bio: {
    marginTop: Spacing.two,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.light.text,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.three,
    gap: Spacing.four,
  },
  stat: { alignItems: 'flex-start', minWidth: 72 },
  statNum: { fontWeight: '800', fontSize: 16, color: Colors.light.text },
  statLabel: { fontSize: 13, color: Colors.light.textSecondary },
  seasonCard: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundSelected,
    gap: 4,
  },
  seasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  seasonPoints: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
  },
  seasonRank: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  composeBox: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
    backgroundColor: Colors.light.background,
  },
  composeInput: {
    minHeight: 72,
    fontSize: 16,
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  composePreview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: Spacing.two,
  },
  composeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  publishBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  publishBtnText: { color: '#FFF', fontWeight: '800' },
  linkAction: { color: Colors.light.primary, fontWeight: '700', fontSize: 14 },
  linkMuted: { color: Colors.light.textSecondary, fontSize: 13 },
  upcomingBlock: {
    marginTop: Spacing.four,
    marginHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  upcomingHeading: {
    ...titleTypeface,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  upcomingSub: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  upcomingCard: {
    borderWidth: 2,
    borderColor: '#F0D0A8',
    backgroundColor: '#FFF4E8',
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: 4,
  },
  upcomingLive: {
    borderColor: Colors.light.primary,
    backgroundColor: '#FFE8D6',
  },
  upcomingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  upcomingBadge: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  upcomingBadgeLive: {
    backgroundColor: Colors.light.error,
  },
  upcomingBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  upcomingWhen: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'capitalize',
  },
  upcomingTitle: {
    ...titleTypeface,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.text,
    lineHeight: 22,
  },
  upcomingMeta: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  upcomingCta: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  recoverBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  recoverBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  recoverAllBtn: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  recoverAllText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
    paddingRight: Spacing.three,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.light.primary },
  tabText: { fontWeight: '600', color: Colors.light.textSecondary },
  tabTextActive: { color: Colors.light.text, fontWeight: '800' },
  newPostFab: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
    marginBottom: 4,
  },
  feed: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  empty: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  postCard: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  postHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: Spacing.two,
  },
  postAuthor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundElement,
  },
  postAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  postAuthorText: { flex: 1, minWidth: 0 },
  postAuthorName: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  postDate: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  postMenuBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: -2,
  },
  postMenuDots: {
    fontSize: 22,
    lineHeight: 24,
    color: Colors.light.textSecondary,
    fontWeight: '700',
  },
  postText: { fontSize: 15, lineHeight: 22, color: Colors.light.text },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
  },
  hiddenTag: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  historyBox: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.four,
    padding: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
  },
  privacyTitle: { fontWeight: '700', color: Colors.light.text, fontSize: 15 },
  privacySub: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: Colors.light.text,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  histRow: {
    fontSize: 14,
    color: Colors.light.text,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  muted: { color: Colors.light.textSecondary, fontSize: 13, marginBottom: Spacing.two },
  linkRow: { marginTop: Spacing.four, marginBottom: Spacing.two },
  logout: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.five,
    padding: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.error,
    alignItems: 'center',
  },
  logoutText: { color: Colors.light.error, fontWeight: '700' },
});
