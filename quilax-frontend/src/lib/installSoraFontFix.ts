import React from 'react';
import { Platform } from 'react-native';
import { resolveSoraStyle } from '@/lib/soraFonts';

/**
 * Replace RN Text / TextInput so Sora_* + fontWeight never ships to Android
 * (which otherwise falls back to the system font).
 * Must run before app screens import Text (see package.json "main").
 */
export function installSoraFontFix() {
  if (Platform.OS === 'web') return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof import('react-native') & {
    Text: React.ComponentType<any>;
    TextInput: React.ComponentType<any>;
  };

  if ((RN as any).__quilaxSoraPatched) return;
  (RN as any).__quilaxSoraPatched = true;

  const OriginText = RN.Text;
  const OriginTextInput = RN.TextInput;

  RN.Text = React.forwardRef(function QuilaxText(props: any, ref) {
    return React.createElement(OriginText, {
      ...props,
      style: resolveSoraStyle(props.style),
      ref,
    });
  }) as any;

  RN.TextInput = React.forwardRef(function QuilaxTextInput(props: any, ref) {
    return React.createElement(OriginTextInput, {
      ...props,
      style: resolveSoraStyle(props.style),
      ref,
    });
  }) as any;
}

installSoraFontFix();
