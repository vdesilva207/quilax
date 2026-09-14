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
import { Colors, Spacing } from '@/constants/theme';

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
        placeholderTextColor={rest.placeholderTextColor ?? Colors.light.textSecondary}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Text style={styles.toggleText}>{visible ? 'Ocultar' : 'Mostrar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  toggle: {
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  togglePressed: {
    opacity: 0.6,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
  },
});
