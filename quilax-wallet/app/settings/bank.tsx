import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WalletShell } from '@/components/WalletShell';
import { Colors } from '@/constants/theme';

/** Legacy Stripe return/refresh → /bank */
export default function LegacySettingsBankRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refresh?: string; return?: string; connect?: string }>();

  useEffect(() => {
    const connect =
      params.connect ||
      (params.refresh != null ? 'refresh' : params.return != null ? 'return' : undefined);
    const qs = connect ? `?connect=${encodeURIComponent(String(connect))}` : '';
    router.replace(`/bank${qs}`);
  }, [params.connect, params.refresh, params.return, router]);

  return (
    <WalletShell showBack={false} title="Quilax" subtitle="…">
      <ActivityIndicator color={Colors.primary} />
    </WalletShell>
  );
}
