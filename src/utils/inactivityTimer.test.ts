import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInactivityState,
  formatCountdown,
  shouldRecordActivity,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  DEFAULT_WARNING_THRESHOLD_MS,
} from './inactivityTimer';

test('formatCountdown formats seconds into MM:SS correctly', () => {
  assert.equal(formatCountdown(120), '02:00');
  assert.equal(formatCountdown(90), '01:30');
  assert.equal(formatCountdown(5), '00:05');
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(-10), '00:00');
});

test('calculateInactivityState returns active state when elapsed is below warning threshold', () => {
  const lastActivity = 1000000;
  // 5 minutes later (300,000 ms)
  const now = lastActivity + 5 * 60 * 1000;
  const state = calculateInactivityState(lastActivity, now);

  assert.equal(state.isWarning, false);
  assert.equal(state.isLocked, false);
  assert.equal(state.remainingSeconds, 10 * 60); // 10 minutes remaining
  assert.equal(state.formattedCountdown, '10:00');
});

test('calculateInactivityState triggers warning when elapsed reaches 13 minutes', () => {
  const lastActivity = 1000000;
  // 13.5 minutes later (810,000 ms)
  const now = lastActivity + 13.5 * 60 * 1000;
  const state = calculateInactivityState(lastActivity, now);

  assert.equal(state.isWarning, true);
  assert.equal(state.isLocked, false);
  assert.equal(state.remainingSeconds, 90); // 1.5 minutes remaining
  assert.equal(state.formattedCountdown, '01:30');
  assert.equal(state.warningWindowSeconds, 120); // 2 minutes window
});

test('calculateInactivityState locks when elapsed reaches or exceeds 15 minutes', () => {
  const lastActivity = 1000000;
  // 15 minutes later (900,000 ms)
  const now = lastActivity + 15 * 60 * 1000;
  const state = calculateInactivityState(lastActivity, now);

  assert.equal(state.isLocked, true);
  assert.equal(state.isWarning, false);
  assert.equal(state.remainingSeconds, 0);
  assert.equal(state.formattedCountdown, '00:00');

  // 20 minutes later
  const later = lastActivity + 20 * 60 * 1000;
  const laterState = calculateInactivityState(lastActivity, later);
  assert.equal(laterState.isLocked, true);
  assert.equal(laterState.remainingSeconds, 0);
});

test('calculateInactivityState respects custom timeout and warning thresholds', () => {
  const lastActivity = 0;
  const customTimeout = 10 * 1000; // 10 seconds
  const customWarning = 5 * 1000;  // 5 seconds

  // At 4 seconds: neither warning nor locked
  const s1 = calculateInactivityState(lastActivity, 4000, customTimeout, customWarning);
  assert.equal(s1.isWarning, false);
  assert.equal(s1.isLocked, false);

  // At 7 seconds: warning active
  const s2 = calculateInactivityState(lastActivity, 7000, customTimeout, customWarning);
  assert.equal(s2.isWarning, true);
  assert.equal(s2.isLocked, false);
  assert.equal(s2.remainingSeconds, 3);
  assert.equal(s2.formattedCountdown, '00:03');

  // At 10 seconds: locked
  const s3 = calculateInactivityState(lastActivity, 10000, customTimeout, customWarning);
  assert.equal(s3.isLocked, true);
});

test('shouldRecordActivity throttles high frequency events', () => {
  const lastTime = 5000;
  // 200ms later -> throttle (false)
  assert.equal(shouldRecordActivity(lastTime, 5200, 1000), false);
  // 999ms later -> throttle (false)
  assert.equal(shouldRecordActivity(lastTime, 5999, 1000), false);
  // 1000ms later -> record (true)
  assert.equal(shouldRecordActivity(lastTime, 6000, 1000), true);
  // 2000ms later -> record (true)
  assert.equal(shouldRecordActivity(lastTime, 7000, 1000), true);
});
