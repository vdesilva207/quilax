import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'> & {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * Campo de contraseña con mostrar/ocultar. No quitar.
 */
export default function PasswordInput({
  containerStyle,
  inputStyle,
  style,
  ...rest
}: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TextInput
        key={visible ? 'password-visible' : 'password-hidden'}
        {...rest}
        style={[styles.input, style, inputStyle]}
        secureTextEntry={!visible}
        autoCapitalize={rest.autoCapitalize ?? 'none'}
        autoCorrect={rest.autoCorrect ?? false}
        textContentType={rest.textContentType ?? 'password'}
        placeholderTextColor={rest.placeholderTextColor ?? Colors.textSecondary}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={
          visible ? t('password.hideAccessibility') : t('password.showAccessibility')
        }
      >
        <Text style={styles.toggleText}>
          {visible ? t('password.hide') : t('password.show')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    fontFamily: Fonts.body,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  toggle: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  togglePressed: {
    opacity: 0.6,
  },
  toggleText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
