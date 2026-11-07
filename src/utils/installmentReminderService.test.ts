import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDaysUntilDue,
  findUpcomingInstallments,
  isReminderAlreadyScheduled,
  generateInstallmentReminderNotifications,
} from './installmentReminderService';
import { Loan, Customer, SystemNotification } from '../types';

const mockCustomer: Customer = {
  id: 'cust-test-1',
  tenantId: 'tenant-victoria',
  branchId: 'branch-1',
  customerNo: 'CUST-001',
  type: 'individual',
  fullName: 'Betty Nabakooza',
  phone: '+256 701 889 123',
  email: 'betty.naba@yahoo.com',
  occupation: 'Trader',
  monthlyIncome: 3000000,
  monthlyExpenses: 1000000,
  creditScoreRating: 'A',
  kyc: {
    idType: 'NIN',
    idNumberMasked: 'CF9107****829M',
    verifiedAt: '2026-01-01',
    verificationStatus: 'verified',
    dateOfBirth: '1991-07-15',
    gender: 'Female',
    nextOfKinName: 'David',
    nextOfKinPhone: '+256 700 000 000',
    nextOfKinRelationship: 'Brother',
    residenceTown: 'Kampala',
    residenceDistrict: 'Kampala',
  },
  status: 'active',
  createdAt: '2026-01-01',
};

const mockLoan: Loan = {
  id: 'loan-test-1',
  tenantId: 'tenant-victoria',
  branchId: 'branch-1',
  loanNo: 'LN-2026-0144',
  applicationId: 'app-1',
  customerId: 'cust-test-1',
  productId: 'prod-1',
  currency: 'UGX',
  principalApproved: 3000000,
  interestRateAnnual: 20,
  interestMethod: 'flat',
  termMonths: 6,
  disbursedAmount: 3000000,
  disbursedAt: '2026-08-01T10:00:00Z',
  disbursementChannel: 'MTN Mobile Money',
  disbursementRef: 'REF123',
  maturityDate: '2027-02-01',
  totalInterestExpected: 300000,
  totalFeesCharged: 60000,
  totalPaidPrincipal: 1000000,
  totalPaidInterest: 100000,
  totalPaidFees: 60000,
  totalPaidPenalties: 0,
  principalOutstanding: 2000000,
  interestAccruedOutstanding: 0,
  feesOutstanding: 0,
  penaltiesOutstanding: 0,
  daysPastDue: 0,
  status: 'active',
  schedule: [
    {
      installmentNo: 1,
      dueDate: '2026-10-01',
      principalDue: 500000,
      interestDue: 50000,
      feesDue: 60000,
      totalDue: 610000,
      remainingPrincipal: 2500000,
      status: 'paid',
      paidPrincipal: 500000,
      paidInterest: 50000,
      paidFees: 60000,
    },
    {
      installmentNo: 2,
      dueDate: '2026-11-06', // Exactly 3 days from 2026-11-03
      principalDue: 500000,
      interestDue: 50000,
      feesDue: 0,
      totalDue: 550000,
      remainingPrincipal: 2000000,
      status: 'pending',
      paidPrincipal: 0,
      paidInterest: 0,
      paidFees: 0,
    },
    {
      installmentNo: 3,
      dueDate: '2026-12-06', // 33 days away
      principalDue: 500000,
      interestDue: 50000,
      feesDue: 0,
      totalDue: 550000,
      remainingPrincipal: 1500000,
      status: 'pending',
      paidPrincipal: 0,
      paidInterest: 0,
      paidFees: 0,
    },
  ],
};

test('calculateDaysUntilDue correctly calculates future, same-day, and past dates', () => {
  const base = '2026-11-03';
  assert.equal(calculateDaysUntilDue('2026-11-06', base), 3);
  assert.equal(calculateDaysUntilDue('2026-11-03', base), 0);
  assert.equal(calculateDaysUntilDue('2026-11-02', base), -1);
  assert.equal(calculateDaysUntilDue('2026-11-10', base), 7);
});

test('findUpcomingInstallments filters and matches installments exactly 3 days away', () => {
  const baseDate = '2026-11-03';
  const matches = findUpcomingInstallments([mockLoan], [mockCustomer], baseDate, 3);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].installment.installmentNo, 2);
  assert.equal(matches[0].daysRemaining, 3);
  assert.equal(matches[0].amountDue, 550000);
  assert.equal(matches[0].customer?.fullName, 'Betty Nabakooza');
});

test('findUpcomingInstallments skips paid installments and settled loans', () => {
  const baseDate = '2026-09-28'; // 3 days before 2026-10-01 which is status: 'paid'
  const matches = findUpcomingInstallments([mockLoan], [mockCustomer], baseDate, 3);
  assert.equal(matches.length, 0);

  const settledLoan: Loan = { ...mockLoan, status: 'settled' };
  const matchesSettled = findUpcomingInstallments([settledLoan], [mockCustomer], '2026-11-03', 3);
  assert.equal(matchesSettled.length, 0);
});

test('generateInstallmentReminderNotifications dispatches both SMS and Email reminders', () => {
  const baseDate = '2026-11-03';
  const matches = findUpcomingInstallments([mockLoan], [mockCustomer], baseDate, 3);
  const existingNotifications: SystemNotification[] = [];

  const { newNotifications, skippedCount, summaries } =
    generateInstallmentReminderNotifications(
      matches,
      existingNotifications,
      'KEROLENDA Microfinance',
      '2026-11-03T10:00:00Z'
    );

  assert.equal(newNotifications.length, 2);
  assert.equal(skippedCount, 0);
  assert.equal(summaries.length, 1);

  const sms = newNotifications.find((n) => n.channel === 'sms');
  assert.ok(sms);
  assert.equal(sms.type, 'repayment_reminder');
  assert.equal(sms.recipientPhone, '+256 701 889 123');
  assert.ok(sms.message.includes('550,000'));
  assert.ok(sms.message.includes('due in 3 days'));
  assert.equal(sms.metadata?.daysRemaining, 3);

  const email = newNotifications.find((n) => n.channel === 'email');
  assert.ok(email);
  assert.equal(email.type, 'repayment_reminder');
  assert.equal(email.recipientEmail, 'betty.naba@yahoo.com');
  assert.ok(email.title.includes('LN-2026-0144'));
  assert.ok(email.message.includes('UGX 550,000'));
  assert.equal(email.metadata?.daysRemaining, 3);
});

test('generateInstallmentReminderNotifications enforces deduplication idempotency', () => {
  const baseDate = '2026-11-03';
  const matches = findUpcomingInstallments([mockLoan], [mockCustomer], baseDate, 3);

  // First run
  const run1 = generateInstallmentReminderNotifications(matches, []);
  assert.equal(run1.newNotifications.length, 2);

  // Second run with existing notifications
  const run2 = generateInstallmentReminderNotifications(matches, run1.newNotifications);
  assert.equal(run2.newNotifications.length, 0);
  assert.equal(run2.skippedCount, 2);
});

test('isReminderAlreadyScheduled detects existing notifications accurately', () => {
  const notif: SystemNotification = {
    id: 'n1',
    channel: 'sms',
    title: 'Reminder',
    message: 'due',
    type: 'repayment_reminder',
    isRead: false,
    createdAt: '2026-11-03T10:00:00Z',
    metadata: {
      loanId: 'loan-test-1',
      installmentNo: 2,
      daysRemaining: 3,
    },
  };

  assert.equal(
    isReminderAlreadyScheduled([notif], 'loan-test-1', 2, 'sms', 3),
    true
  );
  assert.equal(
    isReminderAlreadyScheduled([notif], 'loan-test-1', 2, 'email', 3),
    false
  );
  assert.equal(
    isReminderAlreadyScheduled([notif], 'loan-test-1', 3, 'sms', 3),
    false
  );
});
