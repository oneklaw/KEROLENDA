import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCSVValue,
  generateCSVString,
  filterJournalEntries,
  flattenJournalLinesForExport,
  getAgingBucketInfo,
  filterRecoveryCases,
  flattenRecoveryCasesForExport,
  exportAccountingTransactionsCSV,
  exportTrialBalanceCSV,
  exportRecoveryReportCSV,
  filterAuditLogs,
  flattenAuditLogsForExport,
  exportAuditLogsCSV,
} from './exportService';
import { JournalEntry, ChartAccount, RecoveryCase, Loan, Customer, AppUser, Tenant, AuditEvent } from '../types';

// Mock test data
const mockTenant: Tenant = {
  id: 'tenant-1',
  slug: 'victoria-mfi',
  displayName: 'Victoria Microfinance',
  legalName: 'Victoria Microfinance Ltd',
  planName: 'Growth Pro',
  status: 'active',
  defaultCurrency: 'UGX',
  timezone: 'Africa/Kampala',
  maxBranches: 5,
  maxUsers: 25,
  registeredAddress: 'Plot 14 Kampala Rd',
  supportPhone: '+256 414 123 456',
  branding: {
    primaryColor: '#0f766e',
    accentColor: '#0284c7',
    umraLicenseNo: 'UMRA/MFI/2026/0491',
    taxRegistrationNo: '1004928192',
    receiptFooter: 'Thank you for banking with Victoria Microfinance',
  },
};

const mockJournals: JournalEntry[] = [
  {
    id: 'jnl-1',
    tenantId: 'tenant-1',
    journalNo: 'JNL-2026-0041',
    effectiveDate: '2026-10-29',
    sourceType: 'disbursement',
    sourceReference: 'LN-2026-0092',
    description: 'Loan Disbursement - Musa Byaruhanga',
    lines: [
      {
        accountId: 'acc-1',
        accountCode: '1200',
        accountName: 'Gross Loan Portfolio',
        debit: 5_000_000,
        credit: 0,
        description: 'Principal disbursed',
      },
      {
        accountId: 'acc-2',
        accountCode: '1000',
        accountName: 'Vault Cash',
        debit: 0,
        credit: 5_000_000,
        description: 'Cash payout to borrower',
      },
    ],
    postedByUserId: 'usr-1',
    postedAt: '2026-10-29T10:00:00Z',
    isBalanced: true,
  },
  {
    id: 'jnl-2',
    tenantId: 'tenant-1',
    journalNo: 'JNL-2026-0042',
    effectiveDate: '2026-10-25',
    sourceType: 'repayment',
    sourceReference: 'LN-2026-0014',
    description: 'Instalment Repayment - Betty Nabakooza',
    lines: [
      {
        accountId: 'acc-2',
        accountCode: '1000',
        accountName: 'Vault Cash',
        debit: 450_000,
        credit: 0,
        description: 'Cash received at till',
      },
      {
        accountId: 'acc-1',
        accountCode: '1200',
        accountName: 'Gross Loan Portfolio',
        debit: 0,
        credit: 350_000,
        description: 'Principal allocation',
      },
      {
        accountId: 'acc-3',
        accountCode: '4000',
        accountName: 'Interest Income',
        debit: 0,
        credit: 100_000,
        description: 'Interest allocation',
      },
    ],
    postedByUserId: 'usr-1',
    postedAt: '2026-10-25T11:00:00Z',
    isBalanced: true,
  },
  {
    id: 'jnl-3',
    tenantId: 'tenant-1',
    journalNo: 'JNL-2026-0043',
    effectiveDate: '2026-10-02',
    sourceType: 'manual',
    sourceReference: 'ADJ-001',
    description: 'Director capital injection adjustment',
    lines: [
      {
        accountId: 'acc-2',
        accountCode: '1000',
        accountName: 'Vault Cash',
        debit: 1_000_000,
        credit: 0,
        description: 'Cash received',
      },
      {
        accountId: 'acc-4',
        accountCode: '3100',
        accountName: 'Director Capital Equity',
        debit: 0,
        credit: 1_000_000,
        description: 'Capital injected',
      },
    ],
    postedByUserId: 'usr-2',
    postedAt: '2026-10-02T09:00:00Z',
    isBalanced: true,
  },
];

const mockAccounts: ChartAccount[] = [
  {
    id: 'acc-1',
    tenantId: 'tenant-1',
    code: '1200',
    name: 'Gross Loan Portfolio',
    category: 'Asset',
    currentBalance: 89_000_000,
    currency: 'UGX',
    description: 'Active loan portfolio balance',
  },
  {
    id: 'acc-2',
    tenantId: 'tenant-1',
    code: '1000',
    name: 'Vault Cash',
    category: 'Asset',
    currentBalance: 12_500_000,
    currency: 'UGX',
    description: 'Physical cash in main branch safe',
  },
  {
    id: 'acc-3',
    tenantId: 'tenant-1',
    code: '4000',
    name: 'Interest Income',
    category: 'Income',
    currentBalance: 14_800_000,
    currency: 'UGX',
    description: 'Interest earned from lending operations',
  },
];

const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    tenantId: 'tenant-1',
    branchId: 'br-1',
    customerNo: 'CUST-2026-0041',
    type: 'business',
    fullName: 'Musa Byaruhanga',
    phone: '+256 772 458 920',
    occupation: 'Hardware Merchant',
    monthlyIncome: 6_500_000,
    monthlyExpenses: 2_000_000,
    creditScoreRating: 'A',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CM8402****718K',
      verificationStatus: 'verified',
    } as any,
    status: 'active',
    createdAt: '2026-01-10',
  },
  {
    id: 'cust-2',
    tenantId: 'tenant-1',
    branchId: 'br-1',
    customerNo: 'CUST-2026-0112',
    type: 'business',
    fullName: 'Haruna Mugerwa',
    phone: '+256 779 665 441',
    occupation: 'Poultry Farmer',
    monthlyIncome: 4_800_000,
    monthlyExpenses: 2_500_000,
    creditScoreRating: 'C',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CM7903****105P',
      verificationStatus: 'verified',
    } as any,
    status: 'active',
    createdAt: '2026-02-15',
  },
];

const mockLoans: Loan[] = [
  {
    id: 'loan-1',
    tenantId: 'tenant-1',
    branchId: 'br-1',
    loanNo: 'LN-2026-0092',
    customerId: 'cust-1',
    productId: 'prod-1',
    disbursedAmount: 5_000_000,
    principalOutstanding: 5_400_000,
    interestMethod: 'flat',
    interestRateAnnual: 24,
    termMonths: 6,
    disbursedAt: '2026-05-01',
    maturityDate: '2026-11-01',
    daysPastDue: 0,
    status: 'active',
    feesOutstanding: 0,
    penaltiesOutstanding: 0,
  } as any,
  {
    id: 'loan-2',
    tenantId: 'tenant-1',
    branchId: 'br-1',
    loanNo: 'LN-2026-0067',
    customerId: 'cust-2',
    productId: 'prod-1',
    disbursedAmount: 10_000_000,
    principalOutstanding: 7_600_000,
    interestMethod: 'flat',
    interestRateAnnual: 24,
    termMonths: 12,
    disbursedAt: '2026-01-01',
    maturityDate: '2027-01-01',
    daysPastDue: 44,
    status: 'in_arrears',
    feesOutstanding: 0,
    penaltiesOutstanding: 150_000,
  } as any,
];

const mockOfficers: AppUser[] = [
  {
    id: 'off-1',
    tenantId: 'tenant-1',
    email: 'agnes.babirye@victoriamfi.ug',
    name: 'Agnes Babirye',
    role: 'RECOVERY_OFFICER',
    branchId: 'br-1',
    status: 'active',
    phone: '+256 700 111 222',
    approvalLimitUGX: 5_000_000,
    mfaEnabled: true,
  },
];

const mockCases: RecoveryCase[] = [
  {
    id: 'case-1',
    tenantId: 'tenant-1',
    branchId: 'br-1',
    loanId: 'loan-1',
    customerId: 'cust-1',
    assignedOfficerId: 'off-1',
    daysPastDue: 0,
    totalArrearsUGX: 0,
    status: 'resolved',
    nextActionDate: '2026-11-01',
    lastContactOutcome: 'Performing normally; reminder sent',
    notesCount: 2,
    promisesToPay: [],
  },
  {
    id: 'case-2',
    tenantId: 'tenant-1',
    branchId: 'br-1',
    loanId: 'loan-2',
    customerId: 'cust-2',
    assignedOfficerId: 'off-1',
    daysPastDue: 44,
    totalArrearsUGX: 7_600_000,
    status: 'promise_to_pay',
    nextActionDate: '2026-11-05',
    lastContactOutcome: 'Promised UGX 1,500,000 after harvest sales on 5th Nov',
    notesCount: 4,
    promisesToPay: [
      {
        id: 'ptp-1',
        promisedDate: '2026-11-05',
        promisedAmount: 1_500_000,
        status: 'pending',
        recordedAt: '2026-10-28',
      },
    ],
  },
];

// TESTS
test('escapeCSVValue correctly escapes quotes, commas and newlines', () => {
  assert.equal(escapeCSVValue('standard text'), '"standard text"');
  assert.equal(escapeCSVValue('text, with comma'), '"text, with comma"');
  assert.equal(escapeCSVValue('text with "quotes"'), '"text with ""quotes"""');
  assert.equal(escapeCSVValue('line1\nline2'), '"line1\nline2"');
  assert.equal(escapeCSVValue(null), '""');
  assert.equal(escapeCSVValue(undefined), '""');
  assert.equal(escapeCSVValue(12345), '"12345"');
});

test('generateCSVString formats headers and row values with UTF-8 BOM', () => {
  const columns = [
    { header: 'ID', dataKey: 'id' },
    { header: 'Name', dataKey: 'name' },
    { header: 'Amount', dataKey: 'amount' },
  ];
  const rows = [
    { id: '1', name: 'John Doe', amount: 5000 },
    { id: '2', name: 'Jane, Smith', amount: 7500 },
  ];
  const csv = generateCSVString(columns, rows);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"ID","Name","Amount"'));
  assert.ok(csv.includes('"1","John Doe","5000"'));
  assert.ok(csv.includes('"2","Jane, Smith","7500"'));
});

test('filterJournalEntries filters by search query accurately', () => {
  const result = filterJournalEntries(mockJournals, { searchQuery: 'Musa' });
  assert.equal(result.length, 1);
  assert.equal(result[0].journalNo, 'JNL-2026-0041');

  const resultByCode = filterJournalEntries(mockJournals, { searchQuery: '4000' });
  assert.equal(resultByCode.length, 1);
  assert.equal(resultByCode[0].journalNo, 'JNL-2026-0042');
});

test('filterJournalEntries filters by source type and account code', () => {
  const disbursementOnly = filterJournalEntries(mockJournals, { sourceType: 'disbursement' });
  assert.equal(disbursementOnly.length, 1);
  assert.equal(disbursementOnly[0].sourceType, 'disbursement');

  const manualOnly = filterJournalEntries(mockJournals, { sourceType: 'manual' });
  assert.equal(manualOnly.length, 1);
  assert.equal(manualOnly[0].sourceType, 'manual');

  const account1000 = filterJournalEntries(mockJournals, { accountCode: '1000' });
  // All 3 journals have Vault Cash (1000)
  assert.equal(account1000.length, 3);

  const account4000 = filterJournalEntries(mockJournals, { accountCode: '4000' });
  assert.equal(account4000.length, 1);
  assert.equal(account4000[0].journalNo, 'JNL-2026-0042');
});

test('filterJournalEntries filters by date range correctly', () => {
  const refDate = '2026-10-29T12:00:00Z';
  const todayOnly = filterJournalEntries(mockJournals, { dateRange: 'today', referenceDate: refDate });
  assert.equal(todayOnly.length, 1);
  assert.equal(todayOnly[0].journalNo, 'JNL-2026-0041');

  const sevenDays = filterJournalEntries(mockJournals, { dateRange: '7days', referenceDate: refDate });
  assert.equal(sevenDays.length, 2); // 29th and 25th

  const thisMonth = filterJournalEntries(mockJournals, { dateRange: 'this_month', referenceDate: refDate });
  assert.equal(thisMonth.length, 3); // All 3 are October 2026
});

test('flattenJournalLinesForExport flattens lines into audit rows', () => {
  const rows = flattenJournalLinesForExport(mockJournals);
  // jnl-1 has 2 lines, jnl-2 has 3 lines, jnl-3 has 2 lines => 7 rows
  assert.equal(rows.length, 7);
  assert.equal(rows[0].journalNo, 'JNL-2026-0041');
  assert.equal(rows[0].accountCode, '1200');
  assert.equal(rows[0].debit, 5_000_000);
  assert.equal(rows[0].credit, 0);
  assert.equal(rows[0].isBalanced, 'BALANCED');
});

test('getAgingBucketInfo correctly applies UMRA statutory provisioning rules', () => {
  const current = getAgingBucketInfo(0);
  assert.equal(current.label, 'Current (0d)');
  assert.equal(current.provisionPercent, 0);

  const watch = getAgingBucketInfo(15);
  assert.equal(watch.label, '1 - 30 Days (Watch)');
  assert.equal(watch.provisionPercent, 5);

  const substandard = getAgingBucketInfo(44);
  assert.equal(substandard.label, '31 - 60 Days (PAR Substandard)');
  assert.equal(substandard.provisionPercent, 25);

  const doubtful = getAgingBucketInfo(75);
  assert.equal(doubtful.label, '61 - 90 Days (Doubtful)');
  assert.equal(doubtful.provisionPercent, 50);

  const loss = getAgingBucketInfo(120);
  assert.equal(loss.label, '90+ Days (Loss / NPL)');
  assert.equal(loss.provisionPercent, 100);
});

test('filterRecoveryCases filters by aging bucket and status accurately', () => {
  const par30Cases = filterRecoveryCases(mockCases, mockLoans, mockCustomers, { agingBucket: '31-60' });
  assert.equal(par30Cases.length, 1);
  assert.equal(par30Cases[0].loanId, 'loan-2');

  const ptpCases = filterRecoveryCases(mockCases, mockLoans, mockCustomers, { status: 'promise_to_pay' });
  assert.equal(ptpCases.length, 1);
  assert.equal(ptpCases[0].id, 'case-2');

  const queryCases = filterRecoveryCases(mockCases, mockLoans, mockCustomers, { searchQuery: 'Haruna' });
  assert.equal(queryCases.length, 1);
  assert.equal(queryCases[0].id, 'case-2');
});

test('flattenRecoveryCasesForExport computes PTP amount and statutory impairment', () => {
  const rows = flattenRecoveryCasesForExport(mockCases, mockLoans, mockCustomers, mockOfficers);
  assert.equal(rows.length, 2);

  const harunaRow = rows.find((r) => r.customerName === 'Haruna Mugerwa');
  assert.ok(harunaRow);
  assert.equal(harunaRow.daysPastDue, 44);
  assert.equal(harunaRow.totalArrearsUGX, 7_600_000);
  assert.equal(harunaRow.activePtpAmountUGX, 1_500_000);
  assert.equal(harunaRow.activePtpDate, '2026-11-05');
  assert.equal(harunaRow.statutoryProvisionPercent, '25%');
  // 25% of 7,600,000 = 1,900,000
  assert.equal(harunaRow.statutoryProvisionUGX, 1_900_000);
  assert.equal(harunaRow.assignedOfficerName, 'Agnes Babirye');
});

test('exportAccountingTransactionsCSV, exportTrialBalanceCSV and exportRecoveryReportCSV produce valid CSV content', () => {
  const acctCsv = exportAccountingTransactionsCSV(mockJournals, {}, mockTenant);
  assert.ok(acctCsv.includes('"Journal No","Effective Date"'));
  assert.ok(acctCsv.includes('"JNL-2026-0041"'));
  assert.ok(acctCsv.includes('"Gross Loan Portfolio"'));

  const tbCsv = exportTrialBalanceCSV(mockAccounts, mockTenant);
  assert.ok(tbCsv.includes('"Account Code","Account Name"'));
  assert.ok(tbCsv.includes('"1200","Gross Loan Portfolio"'));

  const recCsv = exportRecoveryReportCSV(mockCases, mockLoans, mockCustomers, mockOfficers, {}, mockTenant);
  assert.ok(recCsv.includes('"Loan No","Customer Name"'));
  assert.ok(recCsv.includes('"LN-2026-0067"'));
  assert.ok(recCsv.includes('"Haruna Mugerwa"'));
  assert.ok(recCsv.includes('"25%"'));
});

const mockAuditLogs: AuditEvent[] = [
  {
    id: 'audit-1',
    tenantId: 'tenant-1',
    actorName: 'Sarah Namubiru',
    actorRole: 'COMPANY_ADMIN',
    action: 'DISBURSE_LOAN',
    entityType: 'LOAN',
    entityId: 'LN-2026-0092',
    summary: 'Disbursed UGX 5,000,000 to Musa Byaruhanga via MTN Mobile Money',
    ipAddress: '102.134.14.88',
    timestamp: '2026-10-29T10:30:00Z',
  },
  {
    id: 'audit-2',
    tenantId: 'tenant-1',
    actorName: 'Peter Mukasa',
    actorRole: 'ACCOUNTANT',
    action: 'POST_JOURNAL',
    entityType: 'JOURNAL',
    entityId: 'JNL-2026-0041',
    summary: 'Manual adjusting journal posted for bank fee reconciliation',
    ipAddress: '102.134.14.89',
    timestamp: '2026-10-28T14:15:00Z',
  },
  {
    id: 'audit-3',
    tenantId: 'tenant-1',
    actorName: 'Agnes Babirye',
    actorRole: 'LOAN_OFFICER',
    action: 'LOG_PTP_PROMISE',
    entityType: 'LOAN',
    entityId: 'LN-2026-0067',
    summary: 'Logged promise to pay UGX 1,500,000 for Haruna Mugerwa on 2026-11-05',
    ipAddress: '102.134.14.90',
    timestamp: '2026-10-25T09:00:00Z',
  },
];

test('filterAuditLogs filters by entity type and search query accurately', () => {
  const allLogs = filterAuditLogs(mockAuditLogs, { entityType: 'ALL' });
  assert.equal(allLogs.length, 3);

  const loanLogs = filterAuditLogs(mockAuditLogs, { entityType: 'LOAN' });
  assert.equal(loanLogs.length, 2);
  assert.equal(loanLogs[0].entityId, 'LN-2026-0092');

  const searchLogs = filterAuditLogs(mockAuditLogs, { searchQuery: 'Musa Byaruhanga' });
  assert.equal(searchLogs.length, 1);
  assert.equal(searchLogs[0].actorName, 'Sarah Namubiru');

  const actionSearch = filterAuditLogs(mockAuditLogs, { searchQuery: 'POST_JOURNAL' });
  assert.equal(actionSearch.length, 1);
  assert.equal(actionSearch[0].actorName, 'Peter Mukasa');
});

test('flattenAuditLogsForExport flattens and formats timestamps for audit compliance', () => {
  const flattened = flattenAuditLogsForExport(mockAuditLogs);
  assert.equal(flattened.length, 3);
  assert.equal(flattened[0].actorName, 'Sarah Namubiru');
  assert.equal(flattened[0].actorRole, 'COMPANY_ADMIN');
  assert.equal(flattened[0].action, 'DISBURSE_LOAN');
  assert.equal(flattened[0].entityId, 'LN-2026-0092');
  assert.equal(flattened[0].ipAddress, '102.134.14.88');
  assert.ok(flattened[0].timestampEAT.length > 0);
});

test('exportAuditLogsCSV produces valid RFC 4180 CSV with UTF-8 BOM', () => {
  const csv = exportAuditLogsCSV(mockAuditLogs, { entityType: 'ALL' }, mockTenant);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Timestamp (UTC/ISO)","Timestamp (EAT)","Actor Name","Actor Role","Action Type"'));
  assert.ok(csv.includes('"Sarah Namubiru"'));
  assert.ok(csv.includes('"LN-2026-0092"'));
  assert.ok(csv.includes('"102.134.14.88"'));
  assert.ok(csv.includes('"Disbursed UGX 5,000,000 to Musa Byaruhanga via MTN Mobile Money"'));
});

