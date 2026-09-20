/** Minimum lead time before a creator-scheduled quiz can start. */
export const QUIZ_SCHEDULE_MIN_LEAD_DAYS = 14;
export const QUIZ_SCHEDULE_MIN_LEAD_MS = QUIZ_SCHEDULE_MIN_LEAD_DAYS * 24 * 60 * 60 * 1000;

export function getQuizScheduleYears(startYear = new Date().getFullYear(), count = 3) {
  return Array.from({ length: count }, (_, index) => startYear + index);
}

export function buildScheduleDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/** Earliest instant a creator may schedule (exactly now + 14 days). */
export function getMinScheduleDate(reference = new Date()) {
  return new Date(reference.getTime() + QUIZ_SCHEDULE_MIN_LEAD_MS);
}

export function isFutureSchedule(date: Date, reference = new Date()) {
  return date.getTime() > reference.getTime();
}

/** Creator rule: scheduledAt must be at least 14 days from now. */
export function isValidCreatorSchedule(date: Date, reference = new Date()) {
  return date.getTime() >= getMinScheduleDate(reference).getTime();
}

export default {
  getQuizScheduleYears,
  buildScheduleDate,
  getMinScheduleDate,
  isFutureSchedule,
  isValidCreatorSchedule,
  QUIZ_SCHEDULE_MIN_LEAD_DAYS,
  QUIZ_SCHEDULE_MIN_LEAD_MS,
};
