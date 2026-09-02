import apiClient from '@/lib/api';

export const QUIZ_REPORT_REASONS = [
  'INAPPROPRIATE_CONTENT',
  'COPYRIGHT',
  'SPAM',
  'HARASSMENT',
  'OTHER',
];

export const POST_REPORT_REASONS = [
  'INAPPROPRIATE_CONTENT',
  'SPAM',
  'HARASSMENT',
  'COPYRIGHT',
  'OTHER',
];

export async function reportQuiz(quizId, reason, description) {
  return apiClient.post(`/reports/quiz/${quizId}`, { reason, description });
}

export async function reportPost(postId, reason, description) {
  return apiClient.post(`/posts/${postId}/report`, { reason, description });
}
