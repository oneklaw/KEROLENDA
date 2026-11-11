/**
 * Inactivity Timer and Session Lock Utilities
 * Compliant with UMRA Tier 4 Regulations & Uganda Data Protection and Privacy Act 2019
 */

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes (900,000 ms)
export const DEFAULT_WARNING_THRESHOLD_MS = 13 * 60 * 1000;  // 13 minutes (780,000 ms -> 2 min warning window)
export const ACTIVITY_THROTTLE_MS = 1000; // 1 second activity event throttle

export interface InactivityState {
  elapsedMs: number;
  elapsedSeconds: number;
  remainingMs: number;
  remainingSeconds: number;
  formattedCountdown: string;
  isWarning: boolean;
  isLocked: boolean;
  warningWindowSeconds: number;
}

/**
 * Formats a remaining number of seconds into MM:SS format.
 */
export function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates the current inactivity state based on last activity and current timestamp.
 */
export function calculateInactivityState(
  lastActivityMs: number,
  nowMs: number,
  timeoutMs: number = DEFAULT_INACTIVITY_TIMEOUT_MS,
  warningThresholdMs: number = DEFAULT_WARNING_THRESHOLD_MS
): InactivityState {
  const elapsedMs = Math.max(0, nowMs - lastActivityMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const isLocked = elapsedMs >= timeoutMs;
  const isWarning = !isLocked && elapsedMs >= warningThresholdMs;
  const remainingMs = Math.max(0, timeoutMs - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const warningWindowSeconds = Math.max(0, Math.floor((timeoutMs - warningThresholdMs) / 1000));

  return {
    elapsedMs,
    elapsedSeconds,
    remainingMs,
    remainingSeconds,
    formattedCountdown: formatCountdown(remainingSeconds),
    isWarning,
    isLocked,
    warningWindowSeconds,
  };
}

/**
 * Determines whether an activity event should update the last activity timestamp
 * to prevent excessive re-renders from mousemove / scroll events.
 */
export function shouldRecordActivity(
  lastRecordedMs: number,
  nowMs: number,
  throttleMs: number = ACTIVITY_THROTTLE_MS
): boolean {
  return nowMs - lastRecordedMs >= throttleMs;
}
