import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isLiquidCashAccount,
  getWeekDates,
  aggregateCashFlowTrends,
  aggregateWeeklyCollectionsHeatmap,
  aggregatePortfolioMaturityDistribution,
  aggregateSavingsAndShareGrowth,
  aggregatePerformanceMetricsOverTime,
} from './dashboardAnalytics';
import { JournalEntry, PaymentReceipt, Loan, SavingsAccount, ShareAccount, ChartAccount } from '../types';

describe('dashboardAnalytics - isLiquidCashAccount', () => {
  it('correctly identifies standard liquid cash accounts', () => {
    assert.equal(isLiquidCashAccount('1000'), true); // Cash Till
    assert.equal(isLiquidCashAccount('1010'), true); // MoMo Float
    assert.equal(isLiquidCashAccount('1020'), true); // Bank Account
    assert.equal(isLiquidCashAccount('1030'), true); // Other cash prefix
    assert.equal(isLiquidCashAccount('1200'), false); // Loans Receivable (Asset, non-liquid)
    assert.equal(isLiquidCashAccount('2000'), false); // Savings Liability
    assert.equal(isLiquidCashAccount('4000'), false); // Interest Income
    assert.equal(isLiquidCashAccount('5000'), false); // Salaries Expense
    assert.equal(isLiquidCashAccount(''), false);
  });
});

describe('dashboardAnalytics - getWeekDates', () => {
  it('returns Monday through Sunday dates for a mid-week date', () => {
    // 2026-10-29 is a Thursday
    const dates = getWeekDates('2026-10-29');
    assert.equal(dates.length, 7);
    assert.equal(dates[0], '2026-10-26'); // Monday
    assert.equal(dates[1], '2026-10-27'); // Tuesday
    assert.equal(dates[2], '2026-10-28'); // Wednesday
    assert.equal(dates[3], '2026-10-29'); // Thursday
    assert.equal(dates[4], '2026-10-30'); // Friday
    assert.equal(dates[5], '2026-10-31'); // Saturday
    assert.equal(dates[6], '2026-11-01'); // Sunday
  });

  it('returns current week when reference date is Sunday', () => {
    // 2026-11-01 is a Sunday
    const dates = getWeekDates('2026-11-01');
    assert.equal(dates[0], '2026-10-26'); // Monday
    assert.equal(dates[6], '2026-11-01'); // Sunday
  });

  it('returns current week when reference date is Monday', () => {
    // 2026-10-26 is a Monday
    const dates = getWeekDates('2026-10-26');
    assert.equal(dates[0], '2026-10-26'); // Monday
    assert.equal(dates[6], '2026-11-01'); // Sunday
  });
});

describe('dashboardAnalytics - aggregateCashFlowTrends', () => {
  const mockJournals: JournalEntry[] = [
    // May 2026: Repayment (Cash In: 1,000,000)
    {
      id: 'je-may-01',
      tenantId: 'tenant-01',
      journalNo: 'JRN-MAY-1',
      effectiveDate: '2026-05-15',
      sourceType: 'repayment',
      sourceReference: 'RCPT-01',
      description: 'Customer Repayment May',
      lines: [
        { accountId: 'acc-1020', accountCode: '1020', accountName: 'Stanbic Bank', debit: 1_000_000, credit: 0, description: 'Bank in' },
        { accountId: 'acc-1200', accountCode: '1200', accountName: 'Loans Rec', debit: 0, credit: 900_000, description: 'Principal' },
        { accountId: 'acc-4000', accountCode: '4000', accountName: 'Interest', debit: 0, credit: 100_000, description: 'Interest' },
      ],
      postedByUserId: 'user-01',
      postedAt: '2026-05-15T10:00:00Z',
      isBalanced: true,
    },
    // June 2026: Disbursement (Cash Out: 3,000,000)
    {
      id: 'je-jun-01',
      tenantId: 'tenant-01',
      journalNo: 'JRN-JUN-1',
      effectiveDate: '2026-06-10',
      sourceType: 'disbursement',
      sourceReference: 'LN-01',
      description: 'Loan Disbursement',
      lines: [
        { accountId: 'acc-1200', accountCode: '1200', accountName: 'Loans Rec', debit: 3_000_000, credit: 0, description: 'Loan asset' },
        { accountId: 'acc-1010', accountCode: '1010', accountName: 'MTN MoMo', debit: 0, credit: 3_000_000, description: 'Float out' },
      ],
      postedByUserId: 'user-01',
      postedAt: '2026-06-10T12:00:00Z',
      isBalanced: true,
    },
    // October 2026: Both In and Out
    {
      id: 'je-oct-01',
      tenantId: 'tenant-01',
      journalNo: 'JRN-OCT-1',
      effectiveDate: '2026-10-14',
      sourceType: 'repayment',
      sourceReference: 'RCPT-OCT-1',
      description: 'Repayment Oct',
      lines: [
        { accountId: 'acc-1000', accountCode: '1000', accountName: 'Cash Till', debit: 2_500_000, credit: 0, description: 'Cash in' },
        { accountId: 'acc-1200', accountCode: '1200', accountName: 'Loans Rec', debit: 0, credit: 2_500_000, description: 'Principal' },
      ],
      postedByUserId: 'user-01',
      postedAt: '2026-10-14T10:00:00Z',
      isBalanced: true,
    },
    {
      id: 'je-oct-02',
      tenantId: 'tenant-01',
      journalNo: 'JRN-OCT-2',
      effectiveDate: '2026-10-20',
      sourceType: 'expense',
      sourceReference: 'EXP-OCT-1',
      description: 'Branch Office Rent',
      lines: [
        { accountId: 'acc-5100', accountCode: '5100', accountName: 'Rent Expense', debit: 1_200_000, credit: 0, description: 'Rent' },
        { accountId: 'acc-1020', accountCode: '1020', accountName: 'Bank', debit: 0, credit: 1_200_000, description: 'Bank transfer out' },
      ],
      postedByUserId: 'user-01',
      postedAt: '2026-10-20T11:00:00Z',
      isBalanced: true,
    },
    // Other Tenant (should be filtered out)
    {
      id: 'je-other-tenant',
      tenantId: 'tenant-OTHER',
      journalNo: 'JRN-OTHER',
      effectiveDate: '2026-10-22',
      sourceType: 'repayment',
      sourceReference: 'RCPT-OTHER',
      description: 'Other tenant cash',
      lines: [
        { accountId: 'acc-1000', accountCode: '1000', accountName: 'Cash Till', debit: 99_000_000, credit: 0, description: 'Ignore' },
        { accountId: 'acc-1200', accountCode: '1200', accountName: 'Loans Rec', debit: 0, credit: 99_000_000, description: 'Ignore' },
      ],
      postedByUserId: 'user-02',
      postedAt: '2026-10-22T10:00:00Z',
      isBalanced: true,
    },
  ];

  it('aggregates exactly 6 trailing months relative to reference date', () => {
    const res = aggregateCashFlowTrends(mockJournals, 'tenant-01', '2026-10-29');
    assert.equal(res.monthlyData.length, 6);
    
    // Check keys: May 2026 to October 2026
    const keys = res.monthlyData.map((m) => m.monthKey);
    assert.deepEqual(keys, ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);

    // May 2026: Cash In 1M, Cash Out 0, Net +1M
    const may = res.monthlyData.find((m) => m.monthKey === '2026-05')!;
    assert.equal(may.cashIn, 1_000_000);
    assert.equal(may.cashOut, 0);
    assert.equal(may.netCashFlow, 1_000_000);
    assert.equal(may.transactionCount, 1);

    // June 2026: Cash In 0, Cash Out 3M, Net -3M
    const jun = res.monthlyData.find((m) => m.monthKey === '2026-06')!;
    assert.equal(jun.cashIn, 0);
    assert.equal(jun.cashOut, 3_000_000);
    assert.equal(jun.netCashFlow, -3_000_000);

    // October 2026: Cash In 2.5M, Cash Out 1.2M, Net +1.3M
    const oct = res.monthlyData.find((m) => m.monthKey === '2026-10')!;
    assert.equal(oct.cashIn, 2_500_000);
    assert.equal(oct.cashOut, 1_200_000);
    assert.equal(oct.netCashFlow, 1_300_000);
    assert.equal(oct.transactionCount, 2);

    // Totals
    assert.equal(res.totalCashIn, 3_500_000);
    assert.equal(res.totalCashOut, 4_200_000);
    assert.equal(res.netLiquidityChange, -700_000);
    assert.equal(res.averageMonthlyNet, Math.round(-700_000 / 6));
  });
});

describe('dashboardAnalytics - aggregateWeeklyCollectionsHeatmap', () => {
  const mockPayments: PaymentReceipt[] = [
    // Mon 2026-10-26: 500,000 MoMo
    {
      id: 'p1',
      tenantId: 'tenant-01',
      branchId: 'b1',
      receiptNo: 'R1',
      customerId: 'c1',
      loanId: 'l1',
      amount: 500_000,
      currency: 'UGX',
      channel: 'MTN Mobile Money',
      externalReference: 'REF1',
      idempotencyKey: 'ID1',
      principalAllocated: 400_000,
      interestAllocated: 100_000,
      feeAllocated: 0,
      penaltyAllocated: 0,
      unallocatedSuspense: 0,
      receivedByUserId: 'u1',
      postedAt: '2026-10-26T09:00:00Z',
      status: 'posted',
    },
    // Wed 2026-10-28: 2 payments (1,000,000 + 1,500,000 = 2,500,000) -> Peak day
    {
      id: 'p2',
      tenantId: 'tenant-01',
      branchId: 'b1',
      receiptNo: 'R2',
      customerId: 'c2',
      loanId: 'l2',
      amount: 1_000_000,
      currency: 'UGX',
      channel: 'Bank Transfer',
      externalReference: 'REF2',
      idempotencyKey: 'ID2',
      principalAllocated: 900_000,
      interestAllocated: 100_000,
      feeAllocated: 0,
      penaltyAllocated: 0,
      unallocatedSuspense: 0,
      receivedByUserId: 'u1',
      postedAt: '2026-10-28T11:00:00Z',
      status: 'posted',
    },
    {
      id: 'p3',
      tenantId: 'tenant-01',
      branchId: 'b1',
      receiptNo: 'R3',
      customerId: 'c3',
      loanId: 'l3',
      amount: 1_500_000,
      currency: 'UGX',
      channel: 'Cash Till',
      externalReference: 'REF3',
      idempotencyKey: 'ID3',
      principalAllocated: 1_300_000,
      interestAllocated: 200_000,
      feeAllocated: 0,
      penaltyAllocated: 0,
      unallocatedSuspense: 0,
      receivedByUserId: 'u1',
      postedAt: '2026-10-28T15:30:00Z',
      status: 'posted',
    },
    // Thu 2026-10-29: 800,000 MoMo (Today)
    {
      id: 'p4',
      tenantId: 'tenant-01',
      branchId: 'b1',
      receiptNo: 'R4',
      customerId: 'c4',
      loanId: 'l4',
      amount: 800_000,
      currency: 'UGX',
      channel: 'Airtel Money',
      externalReference: 'REF4',
      idempotencyKey: 'ID4',
      principalAllocated: 700_000,
      interestAllocated: 100_000,
      feeAllocated: 0,
      penaltyAllocated: 0,
      unallocatedSuspense: 0,
      receivedByUserId: 'u1',
      postedAt: '2026-10-29T10:00:00Z',
      status: 'posted',
    },
    // Payment outside the week: 2026-10-15 (should not be included)
    {
      id: 'p5',
      tenantId: 'tenant-01',
      branchId: 'b1',
      receiptNo: 'R5',
      customerId: 'c5',
      loanId: 'l5',
      amount: 400_000,
      currency: 'UGX',
      channel: 'Cash Till',
      externalReference: 'REF5',
      idempotencyKey: 'ID5',
      principalAllocated: 400_000,
      interestAllocated: 0,
      feeAllocated: 0,
      penaltyAllocated: 0,
      unallocatedSuspense: 0,
      receivedByUserId: 'u1',
      postedAt: '2026-10-15T10:00:00Z',
      status: 'posted',
    },
  ];

  it('aggregates collections by day with correct intensity levels and peak detection', () => {
    const res = aggregateWeeklyCollectionsHeatmap(mockPayments, 'tenant-01', '2026-10-29');

    assert.equal(res.days.length, 7);
    assert.equal(res.totalWeekCollections, 3_800_000); // 500k + 2500k + 800k
    assert.equal(res.totalWeekCount, 4);

    // Mon 2026-10-26: 500k / 2500k = 20% -> intensity 1
    const mon = res.days[0];
    assert.equal(mon.dateStr, '2026-10-26');
    assert.equal(mon.totalAmount, 500_000);
    assert.equal(mon.count, 1);
    assert.equal(mon.intensityLevel, 1);
    assert.equal(mon.isToday, false);
    assert.equal(mon.channels.mobileMoney, 500_000);

    // Tue 2026-10-27: 0 -> intensity 0
    const tue = res.days[1];
    assert.equal(tue.totalAmount, 0);
    assert.equal(tue.count, 0);
    assert.equal(tue.intensityLevel, 0);

    // Wed 2026-10-28: 2,500,000 (100%) -> intensity 4 (peak)
    const wed = res.days[2];
    assert.equal(wed.totalAmount, 2_500_000);
    assert.equal(wed.count, 2);
    assert.equal(wed.intensityLevel, 4);
    assert.equal(wed.channels.bankTransfer, 1_000_000);
    assert.equal(wed.channels.cashTill, 1_500_000);

    // Thu 2026-10-29: 800,000 (32%) -> intensity 2, isToday = true
    const thu = res.days[3];
    assert.equal(thu.totalAmount, 800_000);
    assert.equal(thu.count, 1);
    assert.equal(thu.intensityLevel, 2);
    assert.equal(thu.isToday, true);

    // Peak day check
    assert.ok(res.peakDay);
    assert.equal(res.peakDay?.dateStr, '2026-10-28');
    assert.equal(res.peakDay?.totalAmount, 2_500_000);

    // Average daily collection (3,800,000 / 7)
    assert.equal(res.averageDailyCollection, Math.round(3_800_000 / 7));
  });
});

describe('dashboardAnalytics - aggregatePortfolioMaturityDistribution', () => {
  const mockLoans: Loan[] = [
    // Loan 1: 0-30 days age (disbursed 14 days ago on 2026-10-15, maturity in 166 days)
    {
      id: 'loan-fresh-01',
      tenantId: 'tenant-test',
      branchId: 'branch-01',
      loanNo: 'LN-TEST-001',
      applicationId: 'app-01',
      customerId: 'cust-01',
      productId: 'prod-sme',
      currency: 'UGX',
      principalApproved: 5_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 6,
      disbursedAmount: 5_000_000,
      disbursedAt: '2026-10-15T10:00:00Z',
      disbursementChannel: 'Cash Till',
      disbursementRef: 'REF-01',
      maturityDate: '2027-04-15',
      totalInterestExpected: 450_000,
      totalFeesCharged: 100_000,
      totalPaidPrincipal: 0,
      totalPaidInterest: 0,
      totalPaidFees: 100_000,
      totalPaidPenalties: 0,
      principalOutstanding: 5_000_000,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
    // Loan 2: 31-60 days age (disbursed 58 days ago on 2026-09-01, maturity in 123 days)
    {
      id: 'loan-early-02',
      tenantId: 'tenant-test',
      branchId: 'branch-01',
      loanNo: 'LN-TEST-002',
      applicationId: 'app-02',
      customerId: 'cust-02',
      productId: 'prod-sme',
      currency: 'UGX',
      principalApproved: 4_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 6,
      disbursedAmount: 4_000_000,
      disbursedAt: '2026-09-01T12:00:00Z',
      disbursementChannel: 'Airtel Money',
      disbursementRef: 'REF-02',
      maturityDate: '2027-03-01',
      totalInterestExpected: 360_000,
      totalFeesCharged: 80_000,
      totalPaidPrincipal: 650_000,
      totalPaidInterest: 110_000,
      totalPaidFees: 80_000,
      totalPaidPenalties: 0,
      principalOutstanding: 3_350_000,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
    // Loan 3: 61-90 days age (disbursed 89 days ago on 2026-08-01, maturity in 95 days)
    {
      id: 'loan-mid-03',
      tenantId: 'tenant-test',
      branchId: 'branch-01',
      loanNo: 'LN-TEST-003',
      applicationId: 'app-03',
      customerId: 'cust-03',
      productId: 'prod-boda',
      currency: 'UGX',
      principalApproved: 3_000_000,
      interestRateAnnual: 20.0,
      interestMethod: 'flat',
      termMonths: 6,
      disbursedAmount: 3_000_000,
      disbursedAt: '2026-08-01T11:30:00Z',
      disbursementChannel: 'MTN Mobile Money',
      disbursementRef: 'REF-03',
      maturityDate: '2027-02-01',
      totalInterestExpected: 300_000,
      totalFeesCharged: 60_000,
      totalPaidPrincipal: 1_000_000,
      totalPaidInterest: 100_000,
      totalPaidFees: 60_000,
      totalPaidPenalties: 0,
      principalOutstanding: 2_000_000,
      interestAccruedOutstanding: 50_000,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
    // Loan 4: 91-180 days age (disbursed 150 days ago on 2026-06-01, maturity in 215 days)
    {
      id: 'loan-core-04',
      tenantId: 'tenant-test',
      branchId: 'branch-01',
      loanNo: 'LN-TEST-004',
      applicationId: 'app-04',
      customerId: 'cust-04',
      productId: 'prod-sme',
      currency: 'UGX',
      principalApproved: 8_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 12,
      disbursedAmount: 8_000_000,
      disbursedAt: '2026-06-01T10:00:00Z',
      disbursementChannel: 'Stanbic Bank',
      disbursementRef: 'REF-04',
      maturityDate: '2027-06-01',
      totalInterestExpected: 900_000,
      totalFeesCharged: 160_000,
      totalPaidPrincipal: 2_600_000,
      totalPaidInterest: 390_000,
      totalPaidFees: 160_000,
      totalPaidPenalties: 0,
      principalOutstanding: 5_400_000,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
    // Loan 5: 180+ days age (disbursed 211 days ago on 2026-04-01, in arrears, maturity in 154 days)
    {
      id: 'loan-late-05',
      tenantId: 'tenant-test',
      branchId: 'branch-01',
      loanNo: 'LN-TEST-005',
      applicationId: 'app-05',
      customerId: 'cust-05',
      productId: 'prod-sme',
      currency: 'UGX',
      principalApproved: 10_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 12,
      disbursedAmount: 10_000_000,
      disbursedAt: '2026-04-01T09:00:00Z',
      disbursementChannel: 'Stanbic Bank',
      disbursementRef: 'REF-05',
      maturityDate: '2027-04-01',
      totalInterestExpected: 1_200_000,
      totalFeesCharged: 200_000,
      totalPaidPrincipal: 2_400_000,
      totalPaidInterest: 420_000,
      totalPaidFees: 200_000,
      totalPaidPenalties: 50_000,
      principalOutstanding: 7_600_000,
      interestAccruedOutstanding: 240_000,
      feesOutstanding: 35_000,
      penaltiesOutstanding: 120_000,
      daysPastDue: 44,
      status: 'in_arrears',
      schedule: [],
    },
    // Loan 6: Settled loan (should be excluded from active maturity distribution)
    {
      id: 'loan-settled-06',
      tenantId: 'tenant-test',
      branchId: 'branch-01',
      loanNo: 'LN-TEST-006',
      applicationId: 'app-06',
      customerId: 'cust-06',
      productId: 'prod-sme',
      currency: 'UGX',
      principalApproved: 3_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 6,
      disbursedAmount: 3_000_000,
      disbursedAt: '2026-01-01T09:00:00Z',
      disbursementChannel: 'Cash Till',
      disbursementRef: 'REF-06',
      maturityDate: '2026-07-01',
      totalInterestExpected: 200_000,
      totalFeesCharged: 50_000,
      totalPaidPrincipal: 3_000_000,
      totalPaidInterest: 200_000,
      totalPaidFees: 50_000,
      totalPaidPenalties: 0,
      principalOutstanding: 0,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'settled',
      schedule: [],
    },
  ];

  it('correctly categorizes active loans into 5 age distribution buckets', () => {
    const res = aggregatePortfolioMaturityDistribution(mockLoans, 'tenant-test', '2026-10-29');

    // Only the 5 active/in_arrears loans should be included, settled is excluded
    assert.equal(res.totalActiveLoans, 5);
    // Total outstanding: 5M + 3.35M + 2M + 5.4M + 7.6M = 23,350,000
    assert.equal(res.totalActivePrincipalOutstanding, 23_350_000);
    assert.equal(res.totalInitialDisbursed, 30_000_000);

    assert.equal(res.ageBuckets.length, 5);

    // Bucket 1: 0 - 30 Days (1 loan, 5,000,000)
    const b0_30 = res.ageBuckets[0];
    assert.equal(b0_30.bucketKey, '0-30');
    assert.equal(b0_30.label, '0 - 30 Days');
    assert.equal(b0_30.count, 1);
    assert.equal(b0_30.totalPrincipalOutstanding, 5_000_000);
    assert.equal(b0_30.performingCount, 1);
    assert.equal(b0_30.inArrearsCount, 0);

    // Bucket 2: 31 - 60 Days (1 loan, 3,350,000)
    const b31_60 = res.ageBuckets[1];
    assert.equal(b31_60.bucketKey, '31-60');
    assert.equal(b31_60.count, 1);
    assert.equal(b31_60.totalPrincipalOutstanding, 3_350_000);

    // Bucket 3: 61 - 90 Days (1 loan, 2,000,000)
    const b61_90 = res.ageBuckets[2];
    assert.equal(b61_90.bucketKey, '61-90');
    assert.equal(b61_90.count, 1);
    assert.equal(b61_90.totalPrincipalOutstanding, 2_000_000);

    // Bucket 4: 91 - 180 Days (1 loan, 5,400,000)
    const b91_180 = res.ageBuckets[3];
    assert.equal(b91_180.bucketKey, '91-180');
    assert.equal(b91_180.count, 1);
    assert.equal(b91_180.totalPrincipalOutstanding, 5_400_000);

    // Bucket 5: 180+ Days (1 loan in arrears, 7,600,000)
    const b180 = res.ageBuckets[4];
    assert.equal(b180.bucketKey, '180+');
    assert.equal(b180.count, 1);
    assert.equal(b180.totalPrincipalOutstanding, 7_600_000);
    assert.equal(b180.inArrearsCount, 1);

    // Check sum of percentages is approx 100%
    const pctSum = res.ageBuckets.reduce((sum, b) => sum + b.percentageOfOutstanding, 0);
    assert.ok(Math.abs(pctSum - 100) < 0.5);

    // Check weighted average age is between youngest (14) and oldest (211)
    assert.ok(res.weightedAverageAgeDays > 14);
    assert.ok(res.weightedAverageAgeDays < 211);
    assert.equal(res.youngestLoanAgeDays, 14);
    assert.equal(res.oldestLoanAgeDays, 211);
  });

  it('correctly handles empty or non-matching tenant loans safely', () => {
    const res = aggregatePortfolioMaturityDistribution([], 'unknown-tenant');
    assert.equal(res.totalActiveLoans, 0);
    assert.equal(res.totalActivePrincipalOutstanding, 0);
    assert.equal(res.weightedAverageAgeDays, 0);
    assert.equal(res.ageBuckets.length, 5);
    assert.equal(res.ageBuckets[0].count, 0);
    assert.equal(res.ageBuckets[0].totalPrincipalOutstanding, 0);
  });
});

describe('dashboardAnalytics - aggregateSavingsAndShareGrowth', () => {
  const mockSavings: SavingsAccount[] = [
    {
      id: 'sav-1',
      tenantId: 'tenant-test',
      branchId: 'b1',
      accountNo: 'SAV-01',
      customerId: 'cust-1',
      productType: 'Voluntary Savings',
      currentBalance: 5_000_000,
      lockedGuaranteeAmount: 500_000,
      availableBalance: 4_500_000,
      interestRateAnnual: 6,
      status: 'active',
      openedAt: '2026-02-01T10:00:00Z',
    },
    {
      id: 'sav-2',
      tenantId: 'tenant-test',
      branchId: 'b1',
      accountNo: 'SAV-02',
      customerId: 'cust-2',
      productType: 'Group VSLA Pool',
      currentBalance: 7_000_000,
      lockedGuaranteeAmount: 1_000_000,
      availableBalance: 6_000_000,
      interestRateAnnual: 7,
      status: 'active',
      openedAt: '2026-04-15T10:00:00Z',
    },
  ];

  const mockShares: ShareAccount[] = [
    {
      id: 'share-1',
      tenantId: 'tenant-test',
      customerId: 'cust-1',
      accountNo: 'SHR-01',
      unitsHeld: 100,
      unitPriceUGX: 20_000,
      totalValueUGX: 2_000_000,
      dividendEarnedUGX: 200_000,
      status: 'active',
      joinedAt: '2026-02-01T10:00:00Z',
    },
    {
      id: 'share-2',
      tenantId: 'tenant-test',
      customerId: 'cust-2',
      accountNo: 'SHR-02',
      unitsHeld: 50,
      unitPriceUGX: 20_000,
      totalValueUGX: 1_000_000,
      dividendEarnedUGX: 100_000,
      status: 'active',
      joinedAt: '2026-04-15T10:00:00Z',
    },
  ];

  const mockAccounts: ChartAccount[] = [
    {
      id: 'acc-3000',
      tenantId: 'tenant-test',
      code: '3000',
      name: 'Paid-Up Share Capital',
      category: 'Equity',
      currentBalance: 25_000_000,
      currency: 'UGX',
      description: 'Founding share capital',
    },
  ];

  it('correctly calculates 6-month trailing trajectory and summary metrics', () => {
    const res = aggregateSavingsAndShareGrowth(
      mockSavings,
      mockShares,
      'tenant-test',
      '2026-10-29',
      mockAccounts
    );

    // Should return 6 monthly data points (May '26 to Oct '26)
    assert.equal(res.monthlyData.length, 6);
    assert.equal(res.monthlyData[0].monthKey, '2026-05');
    assert.equal(res.monthlyData[5].monthKey, '2026-10');

    // Current totals reconcile exactly to account sums (5M + 7M = 12M, 2M + 1M = 3M)
    assert.equal(res.currentTotalSavings, 12_000_000);
    assert.equal(res.currentTotalShareCapital, 3_000_000);
    assert.equal(res.monthlyData[5].totalSavingsBalance, 12_000_000);
    assert.equal(res.monthlyData[5].totalShareCapital, 3_000_000);

    // Both accounts were opened before May '26, so active accounts count is 2 throughout
    assert.equal(res.monthlyData[0].activeSavingsAccountsCount, 2);
    assert.equal(res.monthlyData[5].activeSavingsAccountsCount, 2);

    // Net savings growth over 6 months should be positive
    assert.ok(res.sixMonthSavingsGrowthAmount > 0);
    assert.ok(res.sixMonthSavingsGrowthPercent > 0);

    // Net shares growth over 6 months should be positive
    assert.ok(res.sixMonthSharesGrowthAmount > 0);
    assert.ok(res.sixMonthSharesGrowthPercent > 0);

    // Current ratio = 12M / 3M = 4.0
    assert.equal(res.savingsToSharesCurrentRatio, 4.0);
    assert.equal(res.totalDepositors, 2);
    assert.equal(res.totalShareholders, 2);

    // Institutional equity buffer pulled from ChartAccount 3000
    assert.equal(res.institutionalEquityBufferUGX, 25_000_000);
  });

  it('correctly handles empty accounts safely without division by zero', () => {
    const res = aggregateSavingsAndShareGrowth([], [], 'empty-tenant');
    assert.equal(res.monthlyData.length, 6);
    assert.equal(res.currentTotalSavings, 0);
    assert.equal(res.currentTotalShareCapital, 0);
    assert.equal(res.sixMonthSavingsGrowthAmount, 0);
    assert.equal(res.sixMonthSavingsGrowthPercent, 0);
    assert.equal(res.savingsToSharesCurrentRatio, 0);
    assert.equal(res.monthlyData[0].totalSavingsBalance, 0);
    assert.equal(res.monthlyData[5].totalSavingsBalance, 0);
  });
});

describe('dashboardAnalytics - aggregatePerformanceMetricsOverTime', () => {
  const mockLoans: Loan[] = [
    {
      id: 'loan-1',
      tenantId: 'tenant-test',
      branchId: 'b-1',
      loanNo: 'LN-001',
      applicationId: 'app-1',
      customerId: 'c-1',
      productId: 'p-1',
      currency: 'UGX',
      principalApproved: 10_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 12,
      disbursedAmount: 10_000_000,
      disbursedAt: '2026-04-01T09:00:00Z',
      disbursementChannel: 'Stanbic Bank',
      disbursementRef: 'REF1',
      maturityDate: '2027-04-01',
      totalInterestExpected: 1_200_000,
      totalFeesCharged: 200_000,
      totalPaidPrincipal: 2_000_000,
      totalPaidInterest: 300_000,
      totalPaidFees: 200_000,
      totalPaidPenalties: 0,
      principalOutstanding: 8_000_000,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
    {
      id: 'loan-2',
      tenantId: 'tenant-test',
      branchId: 'b-1',
      loanNo: 'LN-002',
      applicationId: 'app-2',
      customerId: 'c-2',
      productId: 'p-1',
      currency: 'UGX',
      principalApproved: 8_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 12,
      disbursedAmount: 8_000_000,
      disbursedAt: '2026-06-01T10:00:00Z',
      disbursementChannel: 'Stanbic Bank',
      disbursementRef: 'REF2',
      maturityDate: '2027-06-01',
      totalInterestExpected: 960_000,
      totalFeesCharged: 160_000,
      totalPaidPrincipal: 2_600_000,
      totalPaidInterest: 390_000,
      totalPaidFees: 160_000,
      totalPaidPenalties: 0,
      principalOutstanding: 5_400_000,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
    {
      id: 'loan-3',
      tenantId: 'tenant-test',
      branchId: 'b-1',
      loanNo: 'LN-003',
      applicationId: 'app-3',
      customerId: 'c-3',
      productId: 'p-2',
      currency: 'UGX',
      principalApproved: 3_000_000,
      interestRateAnnual: 20.0,
      interestMethod: 'flat',
      termMonths: 6,
      disbursedAmount: 3_000_000,
      disbursedAt: '2026-08-01T11:00:00Z',
      disbursementChannel: 'MTN Mobile Money',
      disbursementRef: 'REF3',
      maturityDate: '2027-02-01',
      totalInterestExpected: 300_000,
      totalFeesCharged: 60_000,
      totalPaidPrincipal: 1_000_000,
      totalPaidInterest: 100_000,
      totalPaidFees: 60_000,
      totalPaidPenalties: 0,
      principalOutstanding: 2_000_000,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
    {
      id: 'loan-4',
      tenantId: 'tenant-test',
      branchId: 'b-2',
      loanNo: 'LN-004',
      applicationId: 'app-4',
      customerId: 'c-4',
      productId: 'p-1',
      currency: 'UGX',
      principalApproved: 4_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 6,
      disbursedAmount: 4_000_000,
      disbursedAt: '2026-09-01T12:00:00Z',
      disbursementChannel: 'Airtel Money',
      disbursementRef: 'REF4',
      maturityDate: '2027-03-01',
      totalInterestExpected: 360_000,
      totalFeesCharged: 80_000,
      totalPaidPrincipal: 650_000,
      totalPaidInterest: 110_000,
      totalPaidFees: 80_000,
      totalPaidPenalties: 0,
      principalOutstanding: 3_350_000,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
  ];

  it('correctly calculates 12-month trailing trajectory for Monthly Active Loans and Average Loan Size', () => {
    const res = aggregatePerformanceMetricsOverTime(mockLoans, 'tenant-test', '2026-10-29');

    // Should return 12 monthly data points: Nov '25 through Oct '26
    assert.equal(res.monthlyData.length, 12);
    assert.equal(res.monthlyData[0].monthKey, '2025-11');
    assert.equal(res.monthlyData[0].label, "Nov '25");
    assert.equal(res.monthlyData[11].monthKey, '2026-10');
    assert.equal(res.monthlyData[11].label, "Oct '26");

    // Month 11 (October 2026) must reconcile to exact current active loans and portfolio
    assert.equal(res.currentActiveLoans, 4);
    assert.equal(res.monthlyData[11].activeLoansCount, 4);

    // Total disbursed: 10M + 8M + 3M + 4M = 25M; Average loan size = 25M / 4 = 6.25M
    assert.equal(res.currentAverageLoanSize, 6_250_000);
    assert.equal(res.monthlyData[11].averageLoanSize, 6_250_000);

    // Gross outstanding portfolio: 8M + 5.4M + 2M + 3.35M = 18.75M
    assert.equal(res.currentGrossPortfolio, 18_750_000);
    assert.equal(res.monthlyData[11].grossPortfolioVolume, 18_750_000);

    // Active loans and average loan size should show positive YoY growth
    assert.ok(res.activeLoansChangeYoY > 0);
    assert.ok(res.activeLoansChangeYoYPercent > 0);
    assert.ok(res.averageLoanSizeChangeYoY > 0);
    assert.ok(res.averageLoanSizeChangeYoYPercent > 0);

    // Peak active loans should be at least current active loans (4)
    assert.ok(res.peakActiveLoans.count >= 4);

    // Peak average loan size should equal current average loan size (6,250,000)
    assert.equal(res.peakAverageLoanSize.amount, 6_250_000);

    // Monthly data points should all have valid non-zero values
    res.monthlyData.forEach((dp) => {
      assert.ok(dp.activeLoansCount > 0, `Month ${dp.monthKey} activeLoansCount should be > 0`);
      assert.ok(dp.averageLoanSize > 0, `Month ${dp.monthKey} averageLoanSize should be > 0`);
      assert.ok(dp.grossPortfolioVolume > 0, `Month ${dp.monthKey} grossPortfolioVolume should be > 0`);
    });
  });

  it('correctly handles empty loans array safely without division by zero', () => {
    const res = aggregatePerformanceMetricsOverTime([], 'tenant-empty');

    assert.equal(res.monthlyData.length, 12);
    assert.equal(res.currentActiveLoans, 0);
    assert.equal(res.startActiveLoans, 0);
    assert.equal(res.activeLoansChangeYoY, 0);
    assert.equal(res.activeLoansChangeYoYPercent, 0);
    assert.equal(res.currentAverageLoanSize, 0);
    assert.equal(res.startAverageLoanSize, 0);
    assert.equal(res.averageLoanSizeChangeYoY, 0);
    assert.equal(res.averageLoanSizeChangeYoYPercent, 0);
    assert.equal(res.currentGrossPortfolio, 0);

    res.monthlyData.forEach((dp) => {
      assert.equal(dp.activeLoansCount, 0);
      assert.equal(dp.averageLoanSize, 0);
      assert.equal(dp.grossPortfolioVolume, 0);
    });
  });

  it('filters loans properly by tenantId', () => {
    const mixedLoans: Loan[] = [
      ...mockLoans,
      {
        id: 'other-loan',
        tenantId: 'tenant-other',
        branchId: 'b-99',
        loanNo: 'LN-999',
        applicationId: 'app-999',
        customerId: 'c-999',
        productId: 'p-1',
        currency: 'UGX',
        principalApproved: 50_000_000,
        interestRateAnnual: 18.0,
        interestMethod: 'reducing_balance',
        termMonths: 12,
        disbursedAmount: 50_000_000,
        disbursedAt: '2026-10-01T09:00:00Z',
        disbursementChannel: 'Stanbic Bank',
        disbursementRef: 'REF99',
        maturityDate: '2027-10-01',
        totalInterestExpected: 5_000_000,
        totalFeesCharged: 1_000_000,
        totalPaidPrincipal: 0,
        totalPaidInterest: 0,
        totalPaidFees: 1_000_000,
        totalPaidPenalties: 0,
        principalOutstanding: 50_000_000,
        interestAccruedOutstanding: 0,
        feesOutstanding: 0,
        penaltiesOutstanding: 0,
        daysPastDue: 0,
        status: 'active',
        schedule: [],
      },
    ];

    const res = aggregatePerformanceMetricsOverTime(mixedLoans, 'tenant-test', '2026-10-29');
    // Should NOT include the 50M loan from tenant-other
    assert.equal(res.currentActiveLoans, 4);
    assert.equal(res.currentAverageLoanSize, 6_250_000);
  });
});


