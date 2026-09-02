import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, bodyTypeface } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'> & {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * Password field with show/hide toggle.
 * KEEP THIS — do not replace with plain secureTextEntry TextInput.
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
        // Remount when toggling visibility — avoids RN secureTextEntry glitches
        key={visible ? 'password-visible' : 'password-hidden'}
        {...rest}
        style={[styles.input, style, inputStyle]}
        secureTextEntry={!visible}
        autoCapitalize={rest.autoCapitalize ?? 'none'}
        autoCorrect={rest.autoCorrect ?? false}
        textContentType={rest.textContentType ?? 'password'}
        placeholderTextColor={rest.placeholderTextColor ?? Colors.light.textSecondary}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? t('common.hidePassword') : t('common.showPassword')}
        testID={rest.testID ? `${rest.testID}-toggle` : 'password-visibility-toggle'}
      >
        <CustomIcon
          name={visible ? 'eye-off' : 'eye'}
          size={20}
          color={Colors.light.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    marginBottom: Spacing.two,
    overflow: 'hidden',
    minHeight: 52,
  },
  input: {
    ...bodyTypeface,
    flex: 1,
    paddingVertical: 14,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  toggle: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  togglePressed: {
    opacity: 0.6,
  },
});
