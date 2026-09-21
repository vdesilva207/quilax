/** Minimum lead time before a creator-scheduled quiz can start. */
export const QUIZ_SCHEDULE_MIN_LEAD_DAYS = 14;
export const QUIZ_SCHEDULE_MIN_LEAD_MS = QUIZ_SCHEDULE_MIN_LEAD_DAYS * 24 * 60 * 60 * 1000;

/** Allowed minute steps for scheduling (real clock slots). */
export const QUIZ_SCHEDULE_MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;

export const QUIZ_SCHEDULE_HOURS = Array.from({ length: 24 }, (_, i) => i);

export function getQuizScheduleYears(startYear = new Date().getFullYear(), count = 3) {
  return Array.from({ length: count }, (_, index) => startYear + index);
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function clampScheduleParts(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}) {
  const years = getQuizScheduleYears();
  const year = years.includes(parts.year) ? parts.year : years[0];
  const month = Math.min(12, Math.max(1, Math.round(parts.month) || 1));
  const maxDay = daysInMonth(year, month);
  const day = Math.min(maxDay, Math.max(1, Math.round(parts.day) || 1));
  const hour = Math.min(23, Math.max(0, Math.round(parts.hour) || 0));
  const rawMin = Math.round(parts.minute) || 0;
  const minute =
    QUIZ_SCHEDULE_MINUTE_STEPS.find((m) => m === rawMin) ??
    QUIZ_SCHEDULE_MINUTE_STEPS.reduce((best, m) =>
      Math.abs(m - rawMin) < Math.abs(best - rawMin) ? m : best
    );
  return { year, month, day, hour, minute };
}

export function buildScheduleDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const c = clampScheduleParts({ year, month, day, hour, minute });
  return new Date(c.year, c.month - 1, c.day, c.hour, c.minute, 0, 0);
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
  daysInMonth,
  clampScheduleParts,
  QUIZ_SCHEDULE_MIN_LEAD_DAYS,
  QUIZ_SCHEDULE_MIN_LEAD_MS,
  QUIZ_SCHEDULE_MINUTE_STEPS,
  QUIZ_SCHEDULE_HOURS,
};
