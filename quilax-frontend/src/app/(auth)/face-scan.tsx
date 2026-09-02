import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

/** Legacy route: KYC is Stripe Identity only. */
export default function FaceScanRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(auth)/id-verification');
  }, [router]);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={Colors.light.primary} />
    </View>
  );
}
