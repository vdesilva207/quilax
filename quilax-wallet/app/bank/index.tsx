import { Redirect } from 'expo-router';

/**
 * Soft-launch: Stripe Connect bank linking paused.
 * Withdrawals collect IBAN on the manual withdraw screen.
 */
export default function BankRedirect() {
  return <Redirect href="/" />;
}
