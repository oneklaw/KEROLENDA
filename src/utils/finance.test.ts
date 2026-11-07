import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSchedule,
  allocatePayment,
  calculatePAR30,
  calculateLivePAR30,
  calculatePortfolioYield,
  verifyDoubleEntryJournal,
  assessAffordability,
  formatUGX
} from './finance';

test('Format UGX handles standard values', () => {
  assert.equal(formatUGX(1500000), 'UGX 1,500,000');
  assert.equal(formatUGX(0), 'UGX 0');
});

test('Flat rate schedule totals reconcile exactly to principal + total interest', () => {
  const principal = 10_000_000; // UGX 10M
  const rate = 18; // 18% p.a.
  const term = 12; // 12 months
  const schedule = calculateSchedule(principal, rate, term, 'monthly', 'flat', '2026-11-01', 2.0);

  assert.equal(schedule.installments.length, 12);
  assert.equal(schedule.totalPrincipal, 10_000_000);
  assert.equal(schedule.totalInterest, 1_800_000); // 10M * 18% * 1 = 1.8M
  assert.equal(schedule.totalFees, 200_000); // 2% upfront = 200,000

  // Verify sum of principal in installments equals total principal
  const principalSum = schedule.installments.reduce((sum, inst) => sum + inst.principalDue, 0);
  assert.equal(principalSum, principal);

  // Verify sum of interest in installments equals total interest
  const interestSum = schedule.installments.reduce((sum, inst) => sum + inst.interestDue, 0);
  assert.equal(interestSum, schedule.totalInterest);

  // Final instalment leaves 0 remaining principal
  assert.equal(schedule.installments[11].remainingPrincipal, 0);
});

test('Reducing balance schedule reduces balance to 0 and sum of principal equals loan principal', () => {
  const principal = 5_000_000;
  const rate = 24; // 24% p.a. = 2% per month
  const term = 6;
  const schedule = calculateSchedule(principal, rate, term, 'monthly', 'reducing_balance', '2026-11-01', 0);

  assert.equal(schedule.installments.length, 6);
  const principalSum = schedule.installments.reduce((sum, inst) => sum + inst.principalDue, 0);
  assert.equal(principalSum, principal);
  assert.equal(schedule.installments[schedule.installments.length - 1].remainingPrincipal, 0);
});

test('Payment waterfall allocation respects order: penalties -> fees -> interest -> principal', () => {
  // Case 1: Partial payment covering all penalty, fee, partial interest
  const allocation = allocatePayment(
    150_000, // payment
    50_000,  // penalty
    40_000,  // fee
    100_000, // interest
    500_000  // principal
  );

  assert.equal(allocation.penaltyPaid, 50_000);
  assert.equal(allocation.feePaid, 40_000);
  assert.equal(allocation.interestPaid, 60_000); // 150k - 50k - 40k = 60k
  assert.equal(allocation.principalPaid, 0);
  assert.equal(allocation.remainingPenalty, 0);
  assert.equal(allocation.remainingFee, 0);
  assert.equal(allocation.remainingInterest, 40_000);
  assert.equal(allocation.remainingPrincipal, 500_000);
  assert.equal(allocation.unallocated, 0);

  // Case 2: Full payment with excess to unallocated
  const allocationExcess = allocatePayment(800_000, 50_000, 40_000, 100_000, 500_000);
  assert.equal(allocationExcess.penaltyPaid, 50_000);
  assert.equal(allocationExcess.feePaid, 40_000);
  assert.equal(allocationExcess.interestPaid, 100_000);
  assert.equal(allocationExcess.principalPaid, 500_000);
  assert.equal(allocationExcess.unallocated, 110_000); // 800k - 690k = 110k
});

test('PAR 30 calculation correctly computes percentage of loans > 30 days overdue', () => {
  const loans = [
    { principalOutstanding: 10_000_000, daysPastDue: 0 },   // Current
    { principalOutstanding: 5_000_000, daysPastDue: 15 },   // 1-30 days
    { principalOutstanding: 3_000_000, daysPastDue: 45 },   // > 30 days (PAR)
    { principalOutstanding: 2_000_000, daysPastDue: 75 },   // > 30 days (PAR)
  ];
  // Total = 20M. PAR 30 loans = 3M + 2M = 5M. 5M / 20M = 25%
  const par = calculatePAR30(loans);
  assert.equal(par.totalPrincipal, 20_000_000);
  assert.equal(par.par30Principal, 5_000_000);
  assert.equal(par.par30Percent, 25.0);
});

test('calculateLivePAR30 computes live at-risk percentage, recovery metrics, and statutory UMRA breach', () => {
  const mockLoans = [
    { id: 'l1', principalOutstanding: 10_000_000, daysPastDue: 0, status: 'active', tenantId: 't1' },
    { id: 'l2', principalOutstanding: 5_000_000, daysPastDue: 12, status: 'active', tenantId: 't1' },
    { id: 'l3', principalOutstanding: 5_000_000, daysPastDue: 45, status: 'in_arrears', tenantId: 't1' }, // >30 DPD (at risk)
    { id: 'l4', principalOutstanding: 0, daysPastDue: 0, status: 'settled', tenantId: 't1' },
  ];

  const mockPayments = [
    // Payment on healthy loan
    { id: 'p1', loanId: 'l1', amount: 1_200_000, principalAllocated: 1_000_000, status: 'posted', tenantId: 't1' },
    // Payment on at-risk loan
    { id: 'p2', loanId: 'l3', amount: 800_000, principalAllocated: 500_000, status: 'posted', tenantId: 't1' },
    // Pending payment (should not count)
    { id: 'p3', loanId: 'l3', amount: 300_000, principalAllocated: 200_000, status: 'draft', tenantId: 't1' },
  ];

  // Total Gross active = 10M + 5M + 5M = 20M
  // PAR 30 principal = 5M. 5M / 20M = 25.0%
  // Cap is 10%, so it is breached by +15%
  const liveResult = calculateLivePAR30(mockLoans, mockPayments, 't1');

  assert.equal(liveResult.totalGrossPortfolio, 20_000_000);
  assert.equal(liveResult.par30Principal, 5_000_000);
  assert.equal(liveResult.par30Percent, 25.0);
  assert.equal(liveResult.par30LoansCount, 1);
  assert.equal(liveResult.healthyLoansCount, 2);
  assert.equal(liveResult.totalActiveLoans, 3);
  assert.equal(liveResult.totalPaymentsCount, 2); // 2 posted
  assert.equal(liveResult.totalCollectionsAmount, 2_000_000);
  assert.equal(liveResult.principalRecoveredFromPayments, 1_500_000);
  assert.equal(liveResult.atRiskPaymentsCount, 1);
  assert.equal(liveResult.atRiskRecoveredAmount, 800_000);
  assert.equal(liveResult.isBreached, true);
  assert.equal(liveResult.varianceFromCap, 15.0);
});

test('Double-entry journal verification flags imbalances and validates balanced entries', () => {
  const balanced = [
    { debit: 1_000_000, credit: 0 },
    { debit: 0, credit: 900_000 },
    { debit: 0, credit: 100_000 },
  ];
  const resBalanced = verifyDoubleEntryJournal(balanced);
  assert.equal(resBalanced.isBalanced, true);
  assert.equal(resBalanced.discrepancy, 0);

  const unbalanced = [
    { debit: 1_000_000, credit: 0 },
    { debit: 0, credit: 800_000 },
  ];
  const resUnbalanced = verifyDoubleEntryJournal(unbalanced);
  assert.equal(resUnbalanced.isBalanced, false);
  assert.equal(resUnbalanced.discrepancy, 200_000);
});

test('Affordability assessment accurately enforces DSR <= 50% limit', () => {
  // Income 2M, expenses 800k, existing debt 200k, proposed instalment 400k
  // Total debt = 600k / 2M = 30% -> Low Risk, Affordable
  const safe = assessAffordability(2_000_000, 800_000, 200_000, 400_000);
  assert.equal(safe.dsrPercent, 30.0);
  assert.equal(safe.isAffordable, true);

  // Income 2M, expenses 800k, existing debt 300k, proposed instalment 900k
  // Total debt = 1.2M / 2M = 60% -> High Risk, Not Affordable
  const risky = assessAffordability(2_000_000, 800_000, 300_000, 900_000);
  assert.equal(risky.dsrPercent, 60.0);
  assert.equal(risky.isAffordable, false);
});

test('Quick Loan Calculator simulation computes exact weekly and monthly schedules without saving state', () => {
  // Test 1: Monthly schedule simulation
  const monthlySim = calculateSchedule(3_000_000, 24, 6, 'monthly', 'reducing_balance', '2026-11-01', 2.5);
  assert.equal(monthlySim.installments.length, 6);
  assert.equal(monthlySim.totalPrincipal, 3_000_000);
  assert.equal(monthlySim.totalFees, 75_000); // 2.5% of 3M = 75k
  assert.ok(monthlySim.totalInterest > 0);
  assert.equal(monthlySim.installments[5].remainingPrincipal, 0);

  // Test 2: Weekly schedule simulation
  const weeklySim = calculateSchedule(1_000_000, 18, 4, 'weekly', 'flat', '2026-11-01', 0);
  // 4 months term * 4.33 weeks approx = 17 installments
  assert.ok(weeklySim.installments.length >= 16);
  assert.equal(weeklySim.totalPrincipal, 1_000_000);
  assert.equal(weeklySim.totalFees, 0);
  assert.equal(weeklySim.installments[weeklySim.installments.length - 1].remainingPrincipal, 0);
});

test('calculatePortfolioYield calculates actualized annual yield, interest run rate, and benchmark spread', () => {
  const mockLoans = [
    {
      id: 'l1',
      tenantId: 'tenant-victoria',
      principalApproved: 8_000_000,
      disbursedAmount: 8_000_000,
      principalOutstanding: 5_400_000,
      interestRateAnnual: 18.0,
      status: 'active',
      disbursedAt: '2026-06-01T10:00:00Z',
      schedule: [
        { dueDate: '2026-06-28', remainingPrincipal: 7_350_000 },
        { dueDate: '2026-07-28', remainingPrincipal: 6_700_000 },
        { dueDate: '2026-08-28', remainingPrincipal: 6_050_000 },
        { dueDate: '2026-09-28', remainingPrincipal: 5_400_000 },
        { dueDate: '2026-10-28', remainingPrincipal: 5_400_000 },
      ],
    },
    {
      id: 'l2',
      tenantId: 'tenant-victoria',
      principalApproved: 3_000_000,
      disbursedAmount: 3_000_000,
      principalOutstanding: 2_000_000,
      interestRateAnnual: 20.0,
      status: 'active',
      disbursedAt: '2026-08-01T11:00:00Z',
      schedule: [
        { dueDate: '2026-08-28', remainingPrincipal: 2_500_000 },
        { dueDate: '2026-09-28', remainingPrincipal: 2_000_000 },
        { dueDate: '2026-10-28', remainingPrincipal: 2_000_000 },
      ],
    },
  ];

  const mockAccounts = [
    { code: '4000', currentBalance: 2_400_000, tenantId: 'tenant-victoria' }, // Interest income
    { code: '1200', currentBalance: 7_400_000, tenantId: 'tenant-victoria' }, // Gross portfolio
  ];

  // Test at Oct 29, 2026 (10 months elapsed)
  const result = calculatePortfolioYield(
    mockLoans,
    mockAccounts,
    [],
    [],
    'tenant-victoria',
    '2026-10-29',
    24.0
  );

  assert.equal(result.totalInterestIncomeUGX, 2_400_000);
  assert.equal(result.monthsElapsedInYear, 10);
  assert.equal(result.annualizationFactor, 1.2);
  // Annualized interest: 2,400,000 * 1.2 = 2,880,000
  assert.equal(result.annualizedInterestIncomeUGX, 2_880_000);
  assert.equal(result.currentOutstandingPortfolioUGX, 7_400_000);
  assert.ok(result.averageOutstandingPortfolioUGX > 0);
  assert.ok(result.annualYieldPercent > 0);
  assert.ok(result.nominalYieldPercent > 0);
  assert.equal(result.interestSource, 'general_ledger');
  assert.ok(typeof result.isPerformingAboveTarget === 'boolean');
});

test('calculatePortfolioYield falls back to journals and payments when accounts is empty', () => {
  const mockLoans = [
    {
      id: 'l1',
      tenantId: 'tenant-1',
      principalOutstanding: 10_000_000,
      principalApproved: 10_000_000,
      disbursedAmount: 10_000_000,
      status: 'active',
      interestRateAnnual: 22.0,
      totalPaidInterest: 1_500_000,
    },
  ];

  const mockJournals = [
    {
      effectiveDate: '2026-05-15',
      tenantId: 'tenant-1',
      lines: [
        { accountCode: '4000', debit: 0, credit: 1_200_000 },
      ],
    },
    {
      effectiveDate: '2026-07-20',
      tenantId: 'tenant-1',
      lines: [
        { accountCode: '4000', debit: 0, credit: 800_000 },
      ],
    },
  ];

  const result = calculatePortfolioYield(
    mockLoans,
    [],
    mockJournals,
    [],
    'tenant-1',
    '2026-10-29',
    20.0
  );

  // Interest should be derived from journals: 1,200,000 + 800,000 = 2,000,000
  assert.equal(result.totalInterestIncomeUGX, 2_000_000);
  assert.equal(result.interestSource, 'journals');
  assert.equal(result.annualizedInterestIncomeUGX, 2_400_000);
  assert.equal(result.averageOutstandingPortfolioUGX, 10_000_000);
  assert.equal(result.annualYieldPercent, 24.0);
  assert.equal(result.nominalYieldPercent, 20.0);
  assert.equal(result.isPerformingAboveTarget, true);
});


