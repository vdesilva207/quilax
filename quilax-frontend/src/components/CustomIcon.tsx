import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '@/constants/theme';

const VIEW = 24;

/** Filled minimal icons — same 24×24 box, solid shapes. */
const ICONS: Record<string, (c: string) => React.ReactNode> = {
  home: (c) => (
    <Path
      fill={c}
      d="M12 2.8 2.8 10.5c-.25.2-.35.45-.35.75V20c0 .85.7 1.55 1.55 1.55H9v-5.5c0-.55.45-1 1-1h4c.55 0 1 .45 1 1V21.55h5c.85 0 1.55-.7 1.55-1.55v-8.75c0-.3-.1-.55-.35-.75L12 2.8z"
    />
  ),
  search: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M10.5 3.2a7.3 7.3 0 0 1 5.8 11.75l4.15 4.15a1.2 1.2 0 0 1-1.7 1.7l-4.15-4.15A7.3 7.3 0 1 1 10.5 3.2zm0 2.4a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8z"
    />
  ),
  add: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm-.9 5.2h1.8v3.6h3.6v1.8h-3.6v3.6h-1.8v-3.6H7.5v-1.8h3.6V7.7z"
    />
  ),
  plus: (c) => ICONS.add(c),
  create: (c) => ICONS.add(c),
  user: (c) => (
    <>
      <Circle cx="12" cy="8" r="3.8" fill={c} />
      <Path fill={c} d="M4.8 20.2c0-3.85 3.2-6.2 7.2-6.2s7.2 2.35 7.2 6.2c0 .55-.4 1-1 1H5.8c-.6 0-1-.45-1-1z" />
    </>
  ),
  profile: (c) => ICONS.user(c),
  wallet: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M4 7.2C4 6 5 5 6.2 5h11.6C19 5 20 6 20 7.2v1.3H4V7.2zm0 2.8h16v8.2c0 1.2-1 2.2-2.2 2.2H6.2C5 20.4 4 19.4 4 18.2V10zm11.2 3.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z"
    />
  ),
  gestion: (c) => ICONS.wallet(c),
  message: (c) => (
    <Path
      fill={c}
      d="M4.2 4.8c-.9 0-1.7.8-1.7 1.7v9c0 .9.8 1.7 1.7 1.7h2.3v3.2c0 .55.65.85 1.1.5l4-3.2h8.2c.9 0 1.7-.8 1.7-1.7v-9c0-.9-.8-1.7-1.7-1.7H4.2z"
    />
  ),
  messages: (c) => ICONS.message(c),
  settings: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M11.05 2.4h1.9l.4 2.55c.55.18 1.07.45 1.55.78l2.35-.9 1.35 1.35-.9 2.35c.33.48.6 1 .78 1.55L22 11.05v1.9l-2.55.4c-.18.55-.45 1.07-.78 1.55l.9 2.35-1.35 1.35-2.35-.9c-.48.33-1 .6-1.55.78L12.95 22h-1.9l-.4-2.55a6.7 6.7 0 0 1-1.55-.78l-2.35.9-1.35-1.35.9-2.35a6.7 6.7 0 0 1-.78-1.55L2 12.95v-1.9l2.55-.4c.18-.55.45-1.07.78-1.55l-.9-2.35L5.78 5.4l2.35.9c.48-.33 1-.6 1.55-.78L11.05 2.4zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
    />
  ),
  config: (c) => ICONS.settings(c),
  back: (c) => (
    <Path fill={c} d="M15.2 5.1 8.3 12l6.9 6.9-1.6 1.6L5.1 12l8.5-8.5 1.6 1.6z" />
  ),
  check: (c) => (
    <Path fill={c} d="M9.1 16.8 4.4 12.1l1.7-1.7 3 3 8.1-8.1 1.7 1.7-9.8 9.8z" />
  ),
  close: (c) => (
    <Path
      fill={c}
      d="M6.1 4.9 12 10.8l5.9-5.9 1.4 1.4-5.9 5.9 5.9 5.9-1.4 1.4L12 13.6l-5.9 5.9-1.4-1.4 5.9-5.9-5.9-5.9 1.4-1.4z"
    />
  ),
  star: (c) => (
    <Path
      fill={c}
      d="M12 2.5 14.9 9l6.8.6-5.2 4.5 1.6 6.6L12 17.4 6 20.7l1.6-6.6-5.2-4.5L9.1 9 12 2.5z"
    />
  ),
  time: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm.8 4.3h-1.8v5.2l3.9 2.4.95-1.55-3.05-1.85V6.8z"
    />
  ),
  warning: (c) => (
    <Path
      fill={c}
      d="M10.95 3.6c.4-.75 1.5-.75 1.9 0l8.4 14.6c.4.7-.1 1.55-.95 1.55H3.5c-.85 0-1.35-.85-.95-1.55L10.95 3.6zM11 9v4.8h2V9h-2zm0 6.2v2h2v-2h-2z"
    />
  ),
  arrow: (c) => (
    <Path fill={c} d="M8.8 5.1 15.7 12l-6.9 6.9-1.6-1.6L12.5 12 7.2 6.7l1.6-1.6z" />
  ),
  rules: (c) => (
    <>
      <Rect x="3.5" y="5.5" width="17" height="3" rx="1.5" fill={c} />
      <Rect x="3.5" y="10.5" width="17" height="3" rx="1.5" fill={c} />
      <Rect x="3.5" y="15.5" width="12" height="3" rx="1.5" fill={c} />
    </>
  ),
  image: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M4 5.5C4 4.7 4.7 4 5.5 4h13c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5h-13C4.7 20 4 19.3 4 18.5v-13zM9 10.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zm-3.2 7.3 4.2-4.8 2.8 2.8 2.2-2.1 4.2 4.1H5.8z"
    />
  ),
  photo: (c) => ICONS.image(c),
  eye: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M1.2 12.5C2.5 8.2 6.8 5.2 12 5.2s9.5 3 10.8 7.3c-1.3 4.3-5.6 7.3-10.8 7.3S2.5 16.8 1.2 12.5zM12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"
    />
  ),
  'eye-off': (c) => (
    <>
      <Path
        fill={c}
        fillRule="evenodd"
        d="M3.4 5.1 4.8 3.7 20.3 19.2 18.9 20.6l-2.1-2.1C15.3 19.4 13.7 19.8 12 19.8c-5.2 0-9.5-3-10.8-7.3.55-1.8 1.7-3.45 3.25-4.7L3.4 5.1zm4.35 4.35A3.48 3.48 0 0 0 8.5 12.5a3.5 3.5 0 0 0 4.55 3.3l-1.55-1.55A1.5 1.5 0 0 1 10.5 12.5c0-.35.12-.67.32-.93L7.75 9.45zM12 5.2c1.4 0 2.72.22 3.95.62L14.4 7.37A3.5 3.5 0 0 0 9.55 10.1L7.95 8.5C9.05 6.5 10.45 5.2 12 5.2zm10.8 7.3c-.5 1.65-1.45 3.15-2.7 4.35l-1.5-1.5c.85-.85 1.55-1.85 2-2.85C19.4 9.4 16 7 12 7c-.35 0-.7.02-1.05.06L9.4 5.5c.82-.2 1.7-.3 2.6-.3 5.2 0 9.5 3 10.8 7.3z"
      />
    </>
  ),
  trash: (c) => (
    <Path
      fill={c}
      d="M9 3.5h6l.7 1.5h3.8v2H4.5v-2H8.3L9 3.5zM6 8.5h12l-.85 11.1c-.05.75-.7 1.35-1.45 1.35H8.3c-.75 0-1.4-.6-1.45-1.35L6 8.5z"
    />
  ),
  quiz: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm-1.7 5.8c0-1.15.95-2 2.1-2s2.1.8 2.1 1.9c0 .85-.4 1.3-1.15 1.8-.7.45-1.25.95-1.25 1.9v.35h1.7v-.25c0-.55.3-1 .95-1.45.95-.7 1.75-1.45 1.75-2.9 0-2-1.55-3.4-3.95-3.4S8.5 6.9 8.5 9h1.8zm.7 7h1.9v1.9h-1.9V14.3z"
    />
  ),
  // Aliases / filled minimal extras used across screens
  edit: (c) => (
    <Path
      fill={c}
      d="M4.2 16.4 14.8 5.8l3.4 3.4L7.6 19.8H4.2v-3.4zm12.1-12.1 1.7-1.7c.4-.4 1-.4 1.4 0l2 2c.4.4.4 1 0 1.4l-1.7 1.7-3.4-3.4z"
    />
  ),
  camera: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M9.2 4.5h5.6l1.3 1.8H19c.8 0 1.5.7 1.5 1.5v10.2c0 .8-.7 1.5-1.5 1.5H5c-.8 0-1.5-.7-1.5-1.5V7.8c0-.8.7-1.5 1.5-1.5h2.9L9.2 4.5zM12 9a3.8 3.8 0 1 0 0 7.6A3.8 3.8 0 0 0 12 9z"
    />
  ),
  lock: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M12 2.8a4.2 4.2 0 0 0-4.2 4.2v2.2H6.5C5.7 9.2 5 9.9 5 10.7v7.8c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5v-7.8c0-.8-.7-1.5-1.5-1.5h-1.3V7A4.2 4.2 0 0 0 12 2.8zm-2.4 6.4V7a2.4 2.4 0 1 1 4.8 0v2.2h-4.8zM12 13.2a1.6 1.6 0 0 0-.8 3v1.2h1.6V16.2a1.6 1.6 0 0 0-.8-3z"
    />
  ),
  trophy: (c) => (
    <Path
      fill={c}
      d="M7 4h10v2.2h2.5v2.3c0 2.1-1.5 3.9-3.5 4.4L15 15.5h2v2H7v-2h2l-.9-2.6C6 12.4 4.5 10.6 4.5 8.5V6.2H7V4zm1.8 2.2H6.3v2.3c0 1.2.7 2.3 1.8 2.8l.7-5.1zm7.4 0 .7 5.1c1.1-.5 1.8-1.6 1.8-2.8V6.2h-2.5zM9 19.5h6V21H9v-1.5z"
    />
  ),
  notification: (c) => (
    <Path
      fill={c}
      d="M12 2.8c-3.1 0-5.5 2.4-5.5 5.4v3.1l-1.8 2.4c-.25.35 0 .85.45.85h14.7c.45 0 .7-.5.45-.85l-1.8-2.4V8.2c0-3-2.4-5.4-5.5-5.4zm0 16.4c1.1 0 2-.7 2.3-1.6h-4.6c.3.9 1.2 1.6 2.3 1.6z"
    />
  ),
  notifications: (c) => ICONS.notification(c),
  security: (c) => ICONS.lock(c),
  bank: (c) => ICONS.wallet(c),
  target: (c) => (
    <Path
      fill={c}
      fillRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm0 3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 2.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"
    />
  ),
  winner: (c) => ICONS.trophy(c),
  gamer: (c) => ICONS.quiz(c),
  learner: (c) => ICONS.star(c),
};

export default function CustomIcon({
  name,
  size = 24,
  color = Colors.light.text,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const draw = ICONS[name] || ICONS.quiz;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
        {draw(color)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
