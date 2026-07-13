import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import AdminSidebar from '@/components/AdminSidebar';
import AdminBackBar from '@/components/admin/AdminBackBar';
import PanelAuthGate from '@/components/PanelAuthGate';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { SCREEN_BACKGROUND } from '@/constants/gradients';

export default function PanelLayout() {
  const { isDesktop } = useBreakpoint();

  return (
    <PanelAuthGate>
      <View style={[styles.container, { flexDirection: isDesktop ? 'row' : 'column' }]}>
        {isDesktop ? <AdminSidebar /> : null}
        <View style={styles.content}>
          <AdminBackBar />
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </View>
    </PanelAuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  content: {
    flex: 1,
  },
});
