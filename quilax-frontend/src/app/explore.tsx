import { Redirect } from 'expo-router';

/** Removed from navigation — home is (app)/index. */
export default function ExploreRedirect() {
  return <Redirect href="/(app)" />;
}
