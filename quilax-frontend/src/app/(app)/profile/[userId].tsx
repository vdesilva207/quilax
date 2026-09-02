import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import userService from '@/services/userService';
import apiClient from '@/lib/api';
import { AppScreen, AppHeader, AppSection, AppCard, AppPlaceholder } from '@/components/ui/AppScreen';
import { GradientButton } from '@/components/ui/ScreenChrome';
import CustomIcon from '@/components/CustomIcon';
import ReportSheet from '@/components/moderation/ReportSheet';
import { reportPost, POST_REPORT_REASONS } from '@/services/reportService';
import { getDateLocale } from '@/utils/timezone';

type Post = {
  id: number;
  text?: string | null;
  imageUrl?: string | null;
  status: string;
  createdAt: string;
};

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const numericId = Number(userId);

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [seasonPoints, setSeasonPoints] = useState(0);
  const [seasonRank, setSeasonRank] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reportPostId, setReportPostId] = useState<number | null>(null);

  useEffect(() => {
    if (!numericId) {
      setLoading(false);
      return;
    }

    (async () => {
      if (me?.id === numericId) {
        router.replace('/(app)/profile');
        return;
      }

      const [publicRes, statusRes, postsRes] = await Promise.all([
        apiClient.get(`/profile/${numericId}/public`).catch((e: any) => ({
          error: e?.message,
          private: e?.private || String(e?.message || '').toLowerCase().includes('privado'),
        })),
        me?.id ? userService.getFollowStatus(numericId) : Promise.resolve({ success: false }),
        apiClient.get(`/posts/user/${numericId}?limit=20`).catch(() => ({ posts: [] })),
      ]);

      if (publicRes?.profile) {
        const p = publicRes.profile;
        setDisplayName(p.username || p.fullName || t('profile.userFallback', { id: numericId }));
        setIsPrivate(false);
        setFollowersCount(p.statistics?.followers ?? null);
        setFollowingCount(p.statistics?.following ?? null);
        setSeasonPoints(p.seasonPoints ?? p.season?.seasonPoints ?? p.statistics?.seasonPoints ?? 0);
        setSeasonRank(p.seasonRank ?? p.season?.seasonRank ?? p.statistics?.seasonRank ?? null);
      } else if (publicRes?.private || publicRes?.error) {
        setDisplayName(t('profile.userFallback', { id: numericId }));
        setIsPrivate(true);
        const [followersRes, followingRes] = await Promise.all([
          userService.getFollowers(numericId),
          userService.getFollowing(numericId),
        ]);
        if (followersRes.success) {
          const pagination = followersRes.data?.pagination;
          const list = followersRes.data?.followers;
          setFollowersCount(pagination?.total ?? (Array.isArray(list) ? list.length : null));
        }
        if (followingRes.success) {
          const pagination = followingRes.data?.pagination;
          const list = followingRes.data?.following;
          setFollowingCount(pagination?.total ?? (Array.isArray(list) ? list.length : null));
        }
      }

      setPosts((postsRes?.posts || []).filter((p: Post) => p.status === 'VISIBLE'));

      if (statusRes.success) {
        setIsFollowing(!!statusRes.data?.isFollowing);
      }

      setLoading(false);
    })();
  }, [numericId, me?.id]);

  const handleFollowToggle = async () => {
    setActionLoading(true);
    const result = isFollowing
      ? await userService.unfollowUser(numericId)
      : await userService.followUser(numericId);
    setActionLoading(false);
    if (result.success) {
      setIsFollowing(!isFollowing);
      if (followersCount != null) {
        setFollowersCount((c) => (c == null ? c : isFollowing ? Math.max(0, c - 1) : c + 1));
      }
    }
  };

  const isSelf = me?.id === numericId;

  if (loading) {
    return (
      <AppScreen>
        <AppHeader title={t('profile.title')} showBack />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.light.primary} />
        </View>
      </AppScreen>
    );
  }

  const fallbackName = t('profile.userFallback', { id: numericId });

  return (
    <AppScreen>
      <AppHeader title={displayName || fallbackName} showBack />

      <AppSection title={t('profile.aboutSection')} accentIndex={0}>
        <AppCard>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <CustomIcon name="user" size={32} color={Colors.light.textSecondary} />
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.name}>{displayName || fallbackName}</Text>
              {followersCount !== null && followingCount !== null ? (
                <Text style={styles.metaText}>
                  {t('profile.followersFollowingMeta', {
                    followers: followersCount,
                    following: followingCount,
                  })}
                </Text>
              ) : null}
            </View>
          </View>

          {!isPrivate ? (
            <View style={styles.seasonCard}>
              <Text style={styles.seasonLabel}>{t('profile.seasonPointsHeading')}</Text>
              <Text style={styles.seasonPoints}>
                {t('profile.seasonPointsValue', { n: seasonPoints })}
              </Text>
              {seasonRank ? (
                <Text style={styles.seasonRank}>
                  {t('profile.seasonRankValue', { n: seasonRank })}
                </Text>
              ) : null}
            </View>
          ) : null}
        </AppCard>

        {isPrivate ? <AppPlaceholder text={t('profile.privateProfileNotice')} /> : null}

        {!isSelf ? (
          <GradientButton
            label={actionLoading ? '...' : isFollowing ? t('profile.unfollow') : t('profile.follow')}
            onPress={handleFollowToggle}
            disabled={actionLoading}
          />
        ) : null}
      </AppSection>

      {!isPrivate ? (
        <AppSection title={t('profile.tabPosts')} accentIndex={1}>
          {posts.length === 0 ? (
            <Text style={styles.emptyPosts}>{t('profile.noPostsYet')}</Text>
          ) : (
            posts.map((post) => (
              <AppCard key={post.id}>
                <View style={styles.postHead}>
                  <Text style={styles.postDate}>
                    {new Date(post.createdAt).toLocaleString(getDateLocale())}
                  </Text>
                  {!isSelf ? (
                    <Pressable onPress={() => setReportPostId(post.id)} hitSlop={8}>
                      <Text style={styles.reportBtn}>{t('report.cta')}</Text>
                    </Pressable>
                  ) : null}
                </View>
                {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}
                {post.imageUrl ? (
                  <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                ) : null}
              </AppCard>
            ))
          )}
        </AppSection>
      ) : null}

      <ReportSheet
        visible={reportPostId != null}
        title={t('report.titlePost')}
        reasons={POST_REPORT_REASONS}
        reasonKeyPrefix="report.postReasons"
        onClose={() => setReportPostId(null)}
        onSubmit={async (reason, description) => {
          if (reportPostId == null) return;
          try {
            await reportPost(
              reportPostId,
              t(`report.postReasons.${reason}`),
              description || undefined,
            );
          } catch (e: any) {
            Alert.alert(t('report.error'), e?.message || t('report.error'));
            throw e;
          }
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loadingBox: { padding: Spacing.six, alignItems: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  metaText: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 4 },
  seasonCard: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
    gap: 2,
  },
  seasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  seasonPoints: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
  },
  seasonRank: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  emptyPosts: { color: Colors.light.textSecondary, fontSize: 14 },
  postHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  postDate: { fontSize: 12, color: Colors.light.textSecondary },
  reportBtn: { fontSize: 12, fontWeight: '700', color: Colors.light.textSecondary },
  postText: { fontSize: 15, color: Colors.light.text, lineHeight: 21 },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSelected,
  },
});
