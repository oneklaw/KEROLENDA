import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMfaChallenge, verifyMfaChallenge, maskDestination } from './mfaService';
import { AppUser } from '../types';

const mockUser: AppUser = {
  id: 'user-test',
  tenantId: 'tenant-victoria',
  branchId: 'branch-kla',
  name: 'Sarah Namubiru',
  email: 'sarah.namubiru@victoriamfi.ug',
  phone: '+256 701 445 200',
  role: 'TENANT_OWNER',
  approvalLimitUGX: 100_000_000,
  mfaEnabled: true,
  status: 'active',
};

test('maskDestination hides sensitive email and phone details', () => {
  const maskedEmail = maskDestination('email', mockUser.email, mockUser.phone);
  assert.equal(maskedEmail.includes('@victoriamfi.ug'), true);
  assert.equal(maskedEmail.startsWith('sa***'), true);

  const maskedSms = maskDestination('sms', mockUser.email, mockUser.phone);
  assert.equal(maskedSms.startsWith('+256'), true);
  assert.equal(maskedSms.endsWith('200'), true);
});

test('generateMfaChallenge creates a 6-digit code with correct expiration and attempts', () => {
  const challenge = generateMfaChallenge(mockUser, 'email');
  assert.equal(challenge.code.length, 6);
  assert.ok(/^[0-9]{6}$/.test(challenge.code));
  assert.equal(challenge.attemptsLeft, 3);
  assert.equal(challenge.isVerified, false);
  assert.ok(challenge.expiresAt > Date.now());
});

test('verifyMfaChallenge succeeds with matching code and fails with bad code', () => {
  const challenge = generateMfaChallenge(mockUser, 'sms');

  // Bad code attempt
  const badRes = verifyMfaChallenge(challenge, '000000');
  assert.equal(badRes.success, false);
  assert.equal(badRes.attemptsLeft, 2);

  // Correct code attempt
  const goodRes = verifyMfaChallenge(challenge, challenge.code);
  assert.equal(goodRes.success, true);
});

test('verifyMfaChallenge correctly identifies expired challenge', () => {
  const challenge = generateMfaChallenge(mockUser, 'whatsapp');
  // Pass time after expiration
  const expiredRes = verifyMfaChallenge(challenge, challenge.code, challenge.expiresAt + 1000);
  assert.equal(expiredRes.success, false);
  assert.equal(expiredRes.isExpired, true);
});
