import { Redirect } from 'expo-router';

/** Soft-launch: Stripe card deposits paused → manual IBAN transfer. */
export default function DepositRedirect() {
  return <Redirect href="/deposit-manual" />;
}
