import { Redirect } from 'expo-router';

/** Misma revisión de quizzes que el admin principal. */
export default function WorkerQuizzesRedirect() {
  return <Redirect href="/panel/quizzes" />;
}
