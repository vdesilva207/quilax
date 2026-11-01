import { Platform } from 'react-native';
import { Redirect } from 'expo-router';

/** Native: IAP. Web: Gestión (manual bank). */
export default function AddFundsRedirect() {
  if (Platform.OS === 'web') {
    return <Redirect href="/(app)/wallet" />;
  }
  return <Redirect href="/(app)/wallet/buy-credits" />;
}
