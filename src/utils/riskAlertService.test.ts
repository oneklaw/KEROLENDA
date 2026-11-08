import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyUnassignedDelinquentLoans } from './riskAlertService';
import { Loan, RecoveryCase, Customer } from '../types';

const mockLoans: Loan[] = [
  {
    id: 'loan-delinquent-unassigned-1',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    loanNo: 'LN-2026-9001',
    applicationId: 'app-01',
    customerId: 'cust-01',
    productId: 'prod-01',
    currency: 'UGX',
    principalApproved: 10_000_000,
    interestRateAnnual: 18,
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
    principalOutstanding: 8_000_000,
    interestAccruedOutstanding: 0,
    feesOutstanding: 0,
    penaltiesOutstanding: 0,
    daysPastDue: 45, // 30+ DPD Substandard
    status: 'in_arrears',
    schedule: [],
  },
  {
    id: 'loan-delinquent-with-active-case',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    loanNo: 'LN-2026-9002',
    applicationId: 'app-02',
    customerId: 'cust-02',
    productId: 'prod-01',
    currency: 'UGX',
    principalApproved: 5_000_000,
    interestRateAnnual: 18,
    interestMethod: 'reducing_balance',
    termMonths: 6,
    disbursedAmount: 5_000_000,
    disbursedAt: '2026-01-01',
    disbursementChannel: 'Stanbic Bank',
    disbursementRef: 'REF-02',
    maturityDate: '2026-07-01',
    totalInterestExpected: 500_000,
    totalFeesCharged: 50_000,
    totalPaidPrincipal: 1_000_000,
    totalPaidInterest: 100_000,
    totalPaidFees: 50_000,
    totalPaidPenalties: 0,
    principalOutstanding: 4_000_000,
    interestAccruedOutstanding: 0,
    feesOutstanding: 0,
    penaltiesOutstanding: 0,
    daysPastDue: 50, // 30+ DPD but HAS active case
    status: 'in_arrears',
    schedule: [],
  },
  {
    id: 'loan-performing-current',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    loanNo: 'LN-2026-9003',
    applicationId: 'app-03',
    customerId: 'cust-01',
    productId: 'prod-01',
    currency: 'UGX',
    principalApproved: 3_000_000,
    interestRateAnnual: 18,
    interestMethod: 'reducing_balance',
    termMonths: 6,
    disbursedAmount: 3_000_000,
    disbursedAt: '2026-01-01',
    disbursementChannel: 'Stanbic Bank',
    disbursementRef: 'REF-03',
    maturityDate: '2026-07-01',
    totalInterestExpected: 300_000,
    totalFeesCharged: 30_000,
    totalPaidPrincipal: 1_000_000,
    totalPaidInterest: 100_000,
    totalPaidFees: 30_000,
    totalPaidPenalties: 0,
    principalOutstanding: 2_000_000,
    interestAccruedOutstanding: 0,
    feesOutstanding: 0,
    penaltiesOutstanding: 0,
    daysPastDue: 0, // Performing
    status: 'active',
    schedule: [],
  },
];

const mockCases: RecoveryCase[] = [
  {
    id: 'case-01',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    loanId: 'loan-delinquent-with-active-case',
    customerId: 'cust-02',
    assignedOfficerId: 'user-01',
    daysPastDue: 50,
    totalArrearsUGX: 1_000_000,
    status: 'active_followup', // ACTIVE CASE
    nextActionDate: '2026-11-01',
    lastContactOutcome: 'Called customer',
    notesCount: 1,
    promisesToPay: [],
  },
];

const mockCustomers: Customer[] = [
  {
    id: 'cust-01',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    customerNo: 'C-01',
    type: 'individual',
    fullName: 'Jane Nakato',
    occupation: 'Retailer',
    phone: '+256778899001',
    monthlyIncome: 3_000_000,
    monthlyExpenses: 1_000_000,
    creditScoreRating: 'B',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CF890****123D',
      verifiedAt: '2026-01-01',
      verificationStatus: 'verified',
    } as any,
    status: 'active',
    createdAt: '2026-01-01',
  },
  {
    id: 'cust-02',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    customerNo: 'C-02',
    type: 'individual',
    fullName: 'Samuel Kintu',
    occupation: 'Mechanic',
    phone: '+256778899002',
    monthlyIncome: 2_000_000,
    monthlyExpenses: 800_000,
    creditScoreRating: 'C',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CM870****456E',
      verifiedAt: '2026-01-01',
      verificationStatus: 'verified',
    } as any,
    status: 'active',
    createdAt: '2026-01-01',
  },
];

test('identifyUnassignedDelinquentLoans filters 30+ DPD loans without active recovery cases', () => {
  const result = identifyUnassignedDelinquentLoans(mockLoans, mockCases, mockCustomers, 'tenant-victoria');

  // Only loan-delinquent-unassigned-1 should be returned
  assert.equal(result.totalAlertsCount, 1);
  assert.equal(result.alerts[0].loanId, 'loan-delinquent-unassigned-1');
  assert.equal(result.alerts[0].loanNo, 'LN-2026-9001');
  assert.equal(result.alerts[0].customerName, 'Jane Nakato');
  assert.equal(result.alerts[0].daysPastDue, 45);
  assert.equal(result.alerts[0].riskCategory, 'Substandard (31-60d)');
  assert.equal(result.alerts[0].statutoryProvisionPercent, 20);
  assert.equal(result.alerts[0].statutoryProvisionUGX, 1_600_000); // 20% of 8,000,000
  assert.equal(result.totalUnassignedPrincipalExposureUGX, 8_000_000);
});

test('identifyUnassignedDelinquentLoans ignores resolved cases so re-opened risk appears if unhandled', () => {
  const resolvedCases: RecoveryCase[] = [
    {
      id: 'case-resolved',
      tenantId: 'tenant-victoria',
      branchId: 'branch-01',
      loanId: 'loan-delinquent-unassigned-1',
      customerId: 'cust-01',
      assignedOfficerId: 'user-01',
      daysPastDue: 45,
      totalArrearsUGX: 1_000_000,
      status: 'resolved', // Resolved!
      nextActionDate: '2026-10-01',
      lastContactOutcome: 'Old resolved case',
      notesCount: 1,
      promisesToPay: [],
    },
    {
      id: 'case-active-2',
      tenantId: 'tenant-victoria',
      branchId: 'branch-01',
      loanId: 'loan-delinquent-with-active-case',
      customerId: 'cust-02',
      assignedOfficerId: 'user-01',
      daysPastDue: 50,
      totalArrearsUGX: 1_000_000,
      status: 'active_followup', // Still active
      nextActionDate: '2026-11-01',
      lastContactOutcome: 'In progress',
      notesCount: 1,
      promisesToPay: [],
    },
  ];

  const result = identifyUnassignedDelinquentLoans(mockLoans, resolvedCases, mockCustomers, 'tenant-victoria');
  // Since case-resolved is resolved, loan-delinquent-unassigned-1 is unassigned. loan-delinquent-with-active-case is active.
  assert.equal(result.totalAlertsCount, 1);
  assert.equal(result.alerts[0].loanId, 'loan-delinquent-unassigned-1');
});
