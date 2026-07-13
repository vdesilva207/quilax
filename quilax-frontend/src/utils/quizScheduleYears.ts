export function getQuizScheduleYears(startYear = new Date().getFullYear(), count = 3) {
  return Array.from({ length: count }, (_, index) => startYear + index);
}

export function buildScheduleDate(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function isFutureSchedule(date: Date, reference = new Date()) {
  return date.getTime() > reference.getTime();
}

export default {
  getQuizScheduleYears,
  buildScheduleDate,
  isFutureSchedule,
};
