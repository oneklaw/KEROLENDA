import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCreditRisk } from './creditEngine';
import { CreditReview } from '../types';

const sampleReviews: CreditReview[] = [
  {
    id: 'rev-1',
    borrowerNin: 'CM84029482718K',
    borrowerName: 'Musa Byaruhanga',
    reviewingTenantId: 'tenant-victoria',
    reviewingTenantName: 'Victoria Microfinance',
    loanRef: 'LN-2026-001',
    loanAmountUGX: 10_000_000,
    repaymentStatus: 'fully_settled',
    outstandingBalanceUGX: 0,
    delayedPaymentsCount: 0,
    defaultHistoryVerified: false,
    paymentConsistencyScore: 98,
    reviewDate: '2026-01-15',
    reviewerName: 'David Okello',
    reviewerRole: 'Branch Manager',
    supportingEvidenceSummary: 'Full settlement with 0 late days.',
    status: 'verified',
  },
  {
    id: 'rev-2',
    borrowerNin: 'CM84029482718K',
    borrowerName: 'Musa Byaruhanga',
    reviewingTenantId: 'tenant-rwenzori',
    reviewingTenantName: 'Rwenzori SACCO',
    loanRef: 'RWZ-LN-881',
    loanAmountUGX: 5_000_000,
    repaymentStatus: 'performing_on_time',
    outstandingBalanceUGX: 1_200_000,
    delayedPaymentsCount: 0,
    defaultHistoryVerified: false,
    paymentConsistencyScore: 95,
    reviewDate: '2026-03-20',
    reviewerName: 'Julius Mugisa',
    reviewerRole: 'Credit Officer',
    supportingEvidenceSummary: 'Active facility, all 6 installments received on or before due date.',
    status: 'verified',
  },
];

test('calculateCreditRisk returns Insufficient for unknown borrowers', () => {
  const assessment = calculateCreditRisk('UNKNOWN-NIN', []);
  assert.equal(assessment.category, 'Insufficient');
  assert.equal(assessment.score, 500);
});

test('calculateCreditRisk computes High score for prime borrower with settled facilities', () => {
  const assessment = calculateCreditRisk('CM84029482718K', sampleReviews);
  assert.ok(['Good', 'Excellent'].includes(assessment.category));
  assert.ok(assessment.score >= 650);
  assert.equal(assessment.activeDefaultCount, 0);
  assert.equal(assessment.totalSettledLoansCount, 1);
});

test('calculateCreditRisk drastically reduces score and flags High Risk when default is recorded', () => {
  const defaultReview: CreditReview = {
    id: 'rev-bad',
    borrowerNin: 'BAD-BORROWER-99',
    borrowerName: 'John Doe',
    reviewingTenantId: 'tenant-victoria',
    reviewingTenantName: 'Victoria Microfinance',
    loanRef: 'LN-DEF-09',
    loanAmountUGX: 3_000_000,
    repaymentStatus: 'contractual_default',
    outstandingBalanceUGX: 2_800_000,
    delayedPaymentsCount: 6,
    defaultHistoryVerified: true,
    paymentConsistencyScore: 20,
    reviewDate: '2026-04-01',
    reviewerName: 'David Okello',
    reviewerRole: 'Branch Manager',
    supportingEvidenceSummary: 'Over 120 days past due. Borrower relocated shop.',
    status: 'verified',
  };

  const assessment = calculateCreditRisk('BAD-BORROWER-99', [defaultReview]);
  assert.equal(assessment.category, 'High Risk');
  assert.ok(assessment.score < 560);
  assert.equal(assessment.activeDefaultCount, 1);
});
