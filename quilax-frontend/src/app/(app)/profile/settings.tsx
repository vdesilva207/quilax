import { Redirect } from 'expo-router';

/** Legacy route — privacy/account live under Settings. */
export default function ProfileSettingsRedirect() {
  return <Redirect href="/(app)/settings" />;
}
