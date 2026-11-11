import test from 'node:test';
import assert from 'node:assert/strict';
import { executeMobileMoneyPayment, reconcileProviderFloat } from './mobileMoneyService';
import { MobileMoneyTransaction } from '../types';

test('executeMobileMoneyPayment generates successful transaction with reference for MTN MoMo', () => {
  const result = executeMobileMoneyPayment({
    tenantId: 'tenant-victoria',
    provider: 'MTN Mobile Money',
    transactionType: 'INCOMING_COLLECTION',
    amount: 500_000,
    phoneNumberOrAccount: '+256 772 123 456',
    recipientLegalName: 'Sarah Namubiru',
    internalReference: 'RCP-2026-001',
  });

  assert.equal(result.success, true);
  assert.equal(result.transaction.status, 'SUCCESS');
  assert.ok(result.transaction.externalReference.startsWith('MTN-'));
  assert.equal(result.transaction.amount, 500_000);
});

test('executeMobileMoneyPayment handles simulated insufficient float error', () => {
  const result = executeMobileMoneyPayment({
    tenantId: 'tenant-victoria',
    provider: 'Airtel Money',
    transactionType: 'OUTGOING_DISBURSEMENT',
    amount: 2_000_000,
    phoneNumberOrAccount: '+256 752 987 654',
    recipientLegalName: 'Haruna Mugerwa',
    internalReference: 'DISB-LN-001',
    simulateFailureMode: 'INSUFFICIENT_FLOAT',
  });

  assert.equal(result.success, false);
  assert.equal(result.transaction.status, 'FAILED');
  assert.equal(result.errorCode, 'ERR_INSUFFICIENT_FLOAT');
});

test('reconcileProviderFloat computes inflow, outflow, and closing balance correctly', () => {
  const txns: MobileMoneyTransaction[] = [
    {
      id: 'tx-1',
      tenantId: 'tenant-victoria',
      provider: 'MTN Mobile Money',
      transactionType: 'INCOMING_COLLECTION',
      amount: 1_000_000,
      currency: 'UGX',
      phoneNumberOrAccount: '+256 772 111 222',
      recipientLegalName: 'Musa Byaruhanga',
      externalReference: 'MTN-101',
      internalReference: 'RCP-01',
      status: 'SUCCESS',
      initiatedAt: '2026-10-01',
      reconciliationStatus: 'MATCHED',
    },
    {
      id: 'tx-2',
      tenantId: 'tenant-victoria',
      provider: 'MTN Mobile Money',
      transactionType: 'OUTGOING_DISBURSEMENT',
      amount: 400_000,
      currency: 'UGX',
      phoneNumberOrAccount: '+256 772 333 444',
      recipientLegalName: 'Betty Nabakooza',
      externalReference: 'MTN-102',
      internalReference: 'DISB-01',
      status: 'SUCCESS',
      initiatedAt: '2026-10-01',
      reconciliationStatus: 'MATCHED',
    },
  ];

  const recon = reconcileProviderFloat(txns, 'MTN Mobile Money', 5_000_000);
  assert.equal(recon.totalInflowUGX, 1_000_000);
  assert.equal(recon.totalOutflowUGX, 400_000);
  assert.equal(recon.closingFloatUGX, 5_600_000);
  assert.equal(recon.matchedCount, 2);
});
