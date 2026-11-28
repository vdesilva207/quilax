/**
 * Soft-launch: if the user leaves PRE_START lobby, don't yank them back every 4s.
 * Still allow EnrolledQuizGate to re-enter once questions have started (msUntil <= 0).
 */
const snoozeUntilByRunId = new Map();

/** Snooze lobby auto-reentry until the scheduled start (plus small grace). */
export function snoozeLobbyReentry(runId, untilMs) {
  const id = Number(runId);
  if (!Number.isFinite(id) || id <= 0) return;
  const until = Number(untilMs);
  if (!Number.isFinite(until)) return;
  snoozeUntilByRunId.set(id, until);
}

/** True while user asked to stay out of PRE_START lobby for this run. */
export function isLobbyReentrySnoozed(runId, now = Date.now()) {
  const id = Number(runId);
  if (!Number.isFinite(id) || id <= 0) return false;
  const until = snoozeUntilByRunId.get(id);
  if (until == null) return false;
  if (now >= until) {
    snoozeUntilByRunId.delete(id);
    return false;
  }
  return true;
}

export function clearLobbyReentrySnooze(runId) {
  const id = Number(runId);
  if (!Number.isFinite(id)) return;
  snoozeUntilByRunId.delete(id);
}
