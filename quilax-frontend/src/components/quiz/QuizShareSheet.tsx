import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { APP_GRADIENT_SOFT, GRADIENT_HORIZONTAL } from '@/constants/gradients';
import { MobileModalFrame } from '@/components/ui/MobileModalFrame';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  buildQuizShareUrl,
} from '@/constants/storeLinks';

type QuizShareSheetProps = {
  visible: boolean;
  quizId: string | number;
  quizTitle?: string;
  onClose: () => void;
};

async function copyText(text: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

export default function QuizShareSheet({
  visible,
  quizId,
  quizTitle,
  onClose,
}: QuizShareSheetProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => buildQuizShareUrl(quizId), [quizId]);
  const message = t('quizDetail.shareMessage', {
    title: quizTitle || t('quizDetail.headerFallback'),
    link,
  });

  const copyLink = async () => {
    const ok = await copyText(link);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const nativeShare = async () => {
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message, url: link }
          : { message, title: quizTitle || 'Quilax' }
      );
    } catch {
      /* cancelled */
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <MobileModalFrame onBackdropPress={onClose}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={[...APP_GRADIENT_SOFT]}
            {...GRADIENT_HORIZONTAL}
            style={styles.softBand}
          />
          <View style={styles.body}>
            <Text style={styles.kicker}>{t('quizDetail.shareKicker')}</Text>
            <Text style={styles.title}>{t('quizDetail.shareTitle')}</Text>
            <Text style={styles.subtitle}>{t('quizDetail.shareSubtitle')}</Text>

            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={2} selectable>
                {link}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.btn, styles.primaryBtn, pressed && styles.pressed]}
                onPress={nativeShare}
              >
                <Text style={styles.primaryText}>{t('quizDetail.shareNative')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btn, styles.secondaryBtn, pressed && styles.pressed]}
                onPress={copyLink}
              >
                <Text style={styles.secondaryText}>
                  {copied ? t('quizDetail.shareCopied') : t('quizDetail.shareCopy')}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.storeNote}>{t('quizDetail.shareNoAppNote')}</Text>
            <View style={styles.storeRow}>
              <Pressable
                style={({ pressed }) => [styles.storeChip, pressed && styles.pressed]}
                onPress={() => Linking.openURL(APP_STORE_URL).catch(() => {})}
              >
                <Text style={styles.storeChipText}>{t('quizDetail.shareAppStore')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.storeChip, pressed && styles.pressed]}
                onPress={() => Linking.openURL(PLAY_STORE_URL).catch(() => {})}
              >
                <Text style={styles.storeChipText}>{t('quizDetail.sharePlayStore')}</Text>
              </Pressable>
            </View>

            <Pressable onPress={onClose} style={styles.closeTap} hitSlop={8}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </MobileModalFrame>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    backgroundColor: Colors.light.backgroundElement,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    zIndex: 2,
  },
  softBand: {
    height: 6,
    width: '100%',
    opacity: 0.85,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  title: {
    ...titleTypeface,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    marginTop: Spacing.two,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
  },
  linkBox: {
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: 14,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  linkText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.text,
    fontWeight: '600',
  },
  actions: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: Colors.light.primary,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  secondaryText: {
    color: Colors.light.text,
    fontWeight: '700',
    fontSize: 15,
  },
  storeNote: {
    marginTop: Spacing.four,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  storeRow: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  storeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.light.backgroundSelected,
  },
  storeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  closeTap: {
    marginTop: Spacing.four,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  pressed: { opacity: 0.88 },
});
