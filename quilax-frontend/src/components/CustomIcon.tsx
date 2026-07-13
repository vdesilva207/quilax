import { View, Text } from 'react-native';

const ICONS = {
  back: '←',
  check: '✓',
  rules: '≡',
  time: '⏱',
  eye: '👁',
  'eye-off': '🙈',
  plus: '+',
  trash: '🗑',
  image: '🖼',
};

export default function CustomIcon({ name, size = 20, color = '#000' }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.8, color }}>{ICONS[name] || '•'}</Text>
    </View>
  );
}
