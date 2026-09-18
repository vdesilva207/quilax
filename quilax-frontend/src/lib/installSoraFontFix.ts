import React from 'react';
import { Platform } from 'react-native';
import { resolveSoraStyle } from '@/lib/soraFonts';

/**
 * Remap Sora_* + fontWeight so Android never falls back to the system font.
 * RN 0.81 exports Text/TextInput as getters — use defineProperty, never plain assign
 * (assignment throws and used to leave TestFlight stuck on splash).
 */
export function installSoraFontFix() {
  if (Platform.OS === 'web') return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof import('react-native') & {
    __quilaxSoraPatched?: boolean;
  };

  if (RN.__quilaxSoraPatched) return;
  RN.__quilaxSoraPatched = true;

  const OriginText = RN.Text;
  const OriginTextInput = RN.TextInput;

  const androidTextTweaks =
    Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : null;

  const QuilaxText = React.forwardRef(function QuilaxText(props: any, ref) {
    return React.createElement(OriginText, {
      ...props,
      style: resolveSoraStyle([androidTextTweaks, props.style]),
      allowFontScaling: props.allowFontScaling ?? true,
      maxFontSizeMultiplier: props.maxFontSizeMultiplier ?? 1.35,
      ref,
    });
  });
  (QuilaxText as any).displayName = 'Text';

  const QuilaxTextInput = React.forwardRef(function QuilaxTextInput(props: any, ref) {
    return React.createElement(OriginTextInput, {
      ...props,
      style: resolveSoraStyle([androidTextTweaks, props.style]),
      allowFontScaling: props.allowFontScaling ?? true,
      maxFontSizeMultiplier: props.maxFontSizeMultiplier ?? 1.35,
      ref,
    });
  });
  (QuilaxTextInput as any).displayName = 'TextInput';

  try {
    Object.defineProperty(RN, 'Text', {
      configurable: true,
      enumerable: true,
      get: () => QuilaxText,
    });
    Object.defineProperty(RN, 'TextInput', {
      configurable: true,
      enumerable: true,
      get: () => QuilaxTextInput,
    });
  } catch (err) {
    console.warn('[sora] Text patch skipped:', err);
  }
}

installSoraFontFix();
