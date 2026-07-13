import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const resolvedScheme = scheme === 'dark' || scheme === 'light' ? scheme : 'light';
  const colors = Colors[resolvedScheme];

  return null;
}
