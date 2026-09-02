import { Redirect } from 'expo-router';

/** Depósitos solo en la web (quilax-wallet). */
export default function AddFundsRedirect() {
  return <Redirect href="/(app)/wallet" />;
}
