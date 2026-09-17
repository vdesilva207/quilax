import { Redirect } from 'expo-router';

/** Bank / Stripe Connect only lives in Gestión (wallet web). */
export default function SettingsBankRemoved() {
  return <Redirect href="/(app)/wallet" />;
}
