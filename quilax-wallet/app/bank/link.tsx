import { Redirect } from 'expo-router';

/** Soft-launch: no Stripe Connect onboarding. */
export default function BankLinkRedirect() {
  return <Redirect href="/" />;
}
