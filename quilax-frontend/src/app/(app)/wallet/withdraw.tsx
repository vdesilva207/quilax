import { Redirect } from 'expo-router';

/** Retiros solo en la web (quilax-wallet). */
export default function WithdrawRedirect() {
  return <Redirect href="/(app)/wallet" />;
}
