import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { Colors, Spacing, bodyTypeface, titleTypeface } from '@/constants/theme';

/** Shared auth field look — Sora + consistent radius (avoids thin system inputs). */
export const authFormStyles = StyleSheet.create({
  label: {
    ...bodyTypeface,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  hint: {
    ...bodyTypeface,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
    fontWeight: '500',
  } satisfies TextStyle,
  input: {
    ...bodyTypeface,
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  } satisfies TextStyle,
  inputError: {
    borderColor: Colors.light.error,
  } satisfies ViewStyle,
  errorText: {
    ...bodyTypeface,
    color: Colors.light.error,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: Spacing.two,
  } satisfies TextStyle,
  note: {
    ...bodyTypeface,
    marginTop: Spacing.one,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  } satisfies TextStyle,
  link: {
    ...bodyTypeface,
    alignSelf: 'flex-end',
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  } satisfies TextStyle,
  buttonLabel: {
    ...titleTypeface,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  } satisfies TextStyle,
  secondaryButtonLabel: {
    ...titleTypeface,
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '700',
  } satisfies TextStyle,
});
