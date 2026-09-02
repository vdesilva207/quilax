import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy route — the real join flow is the enroll modal on quiz detail. */
export default function ConfirmJoinRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/(app)" />;
  return <Redirect href={`/(app)/quiz/${id}`} />;
}
