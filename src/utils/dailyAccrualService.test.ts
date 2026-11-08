import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDailyInterestAccruals, exportDailyAccrualsCSV } from './dailyAccrualService';
import { Loan, Customer } from '../types';

const mockLoans: Loan[] = [
  {
    id: 'loan-01',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    loanNo: 'LN-2026-0001',
    applicationId: 'app-01',
    customerId: 'cust-01',
    productId: 'prod-01',
    currency: 'UGX',
    principalApproved: 10_000_000,
    interestRateAnnual: 18.25, // 18.25% p.a. -> 18.25 / 365 = 0.05% per day
    interestMethod: 'reducing_balance',
    termMonths: 12,
    disbursedAmount: 10_000_000,
    disbursedAt: '2026-01-01',
    disbursementChannel: 'Stanbic Bank',
    disbursementRef: 'REF-01',
    maturityDate: '2027-01-01',
    totalInterestExpected: 1_000_000,
    totalFeesCharged: 100_000,
    totalPaidPrincipal: 2_000_000,
    totalPaidInterest: 200_000,
    totalPaidFees: 100_000,
    totalPaidPenalties: 0,
    principalOutstanding: 8_000_000, // 8,000,000 * (18.25% / 365) = 4,000 UGX/day
    interestAccruedOutstanding: 0,
    feesOutstanding: 0,
    penaltiesOutstanding: 0,
    daysPastDue: 0,
    status: 'active',
    schedule: [],
  },
  {
    id: 'loan-settled',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    loanNo: 'LN-2026-0002',
    applicationId: 'app-02',
    customerId: 'cust-01',
    productId: 'prod-01',
    currency: 'UGX',
    principalApproved: 5_000_000,
    interestRateAnnual: 20,
    interestMethod: 'flat',
    termMonths: 6,
    disbursedAmount: 5_000_000,
    disbursedAt: '2026-01-01',
    disbursementChannel: 'Cash Till',
    disbursementRef: 'REF-02',
    maturityDate: '2026-07-01',
    totalInterestExpected: 500_000,
    totalFeesCharged: 50_000,
    totalPaidPrincipal: 5_000_000,
    totalPaidInterest: 500_000,
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

const mockCustomers: Customer[] = [
  {
    id: 'cust-01',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    customerNo: 'C-01',
    type: 'individual',
    fullName: 'Peter Mugabi',
    occupation: 'Trader',
    phone: '+256771122334',
    monthlyIncome: 3_000_000,
    monthlyExpenses: 1_000_000,
    creditScoreRating: 'A',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CM880****789C',
      verifiedAt: '2026-01-01',
      verificationStatus: 'verified',
    } as any,
    status: 'active',
    createdAt: '2026-01-01',
  },
];

test('generateDailyInterestAccruals computes 365-day statutory daily interest accurately', () => {
  const summary = generateDailyInterestAccruals(mockLoans, mockCustomers, '2026-10-29');

  // Should ignore settled loan with 0 balance
  assert.equal(summary.totalActiveLoans, 1);
  assert.equal(summary.totalEarningPrincipalUGX, 8_000_000);

  const entry = summary.entries[0];
  assert.equal(entry.loanNo, 'LN-2026-0001');
  assert.equal(entry.borrowerName, 'Peter Mugabi');
  assert.equal(entry.principalOutstandingUGX, 8_000_000);
  // 8,000,000 * (18.25 / 100 / 365) = 4,000 UGX
  assert.equal(entry.dailyAccruedInterestUGX, 4_000);
  assert.equal(entry.debitAccountCode, '1310');
  assert.equal(entry.creditAccountCode, '4100');
  assert.equal(summary.totalDailyAccruedInterestUGX, 4_000);
});

test('exportDailyAccrualsCSV produces valid CSV output', () => {
  const summary = generateDailyInterestAccruals(mockLoans, mockCustomers, '2026-10-29');
  const csv = exportDailyAccrualsCSV(summary, 'Victoria Microfinance');

  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('LN-2026-0001'));
  assert.ok(csv.includes('Peter Mugabi'));
  assert.ok(csv.includes('1310 - Accrued Interest Receivable'));
  assert.ok(csv.includes('4100 - Interest Income on Loans'));
});
