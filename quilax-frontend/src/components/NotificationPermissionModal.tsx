import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, titleTypeface } from '@/constants/theme';
import { MobileModalFrame } from '@/components/ui/MobileModalFrame';

type Props = {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
};

/**
 * Soft-ask de Quilax antes del diálogo del sistema.
 * Formato móvil (max width phone), bottom sheet.
 */
export function NotificationPermissionModal({ visible, onAllow, onDeny }: Props) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDeny}
    >
      <MobileModalFrame onBackdropPress={onDeny}>
        <View
          style={[
            styles.card,
            {
              maxHeight: Math.min(height * 0.78, 520),
              marginBottom: Platform.OS === 'ios' ? 24 : Spacing.four,
              marginHorizontal: Spacing.three,
            },
          ]}
        >
          <Text style={styles.brand}>QUILAX</Text>
          <Text style={styles.title}>{t('notif.title')}</Text>
          <Text style={styles.body}>{t('notif.body')}</Text>
          <Text style={styles.reasons}>{t('notif.reasons')}</Text>
          <Pressable style={styles.primaryBtn} onPress={onAllow}>
            <Text style={styles.primaryBtnText}>{t('notif.allow')}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onDeny}>
            <Text style={styles.secondaryBtnText}>{t('notif.notNow')}</Text>
          </Pressable>
          <Text style={styles.footnote}>
            {Platform.OS === 'web' ? t('notif.footnoteWeb') : t('notif.footnoteNative')}
          </Text>
        </View>
      </MobileModalFrame>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: Colors.light.background || '#FFF',
    borderRadius: 18,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    zIndex: 2,
  },
  brand: {
    ...titleTypeface,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: 1,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  reasons: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.light.text,
    marginBottom: Spacing.four,
  },
  primaryBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: Spacing.two,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.light.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  footnote: {
    marginTop: Spacing.two,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.light.textSecondary,
  },
});

export default NotificationPermissionModal;
