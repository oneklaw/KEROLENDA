import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDividendProjection, exportDividendScheduleCSV } from './dividendCalculator';
import { ShareAccount, Customer } from '../types';

const mockShareAccounts: ShareAccount[] = [
  {
    id: 'sh-01',
    tenantId: 'tenant-victoria',
    accountNo: 'SH-1001',
    customerId: 'cust-01',
    unitsHeld: 100,
    unitPriceUGX: 20_000,
    totalValueUGX: 2_000_000,
    dividendEarnedUGX: 0,
    status: 'active',
    joinedAt: '2026-01-01',
  },
  {
    id: 'sh-02',
    tenantId: 'tenant-victoria',
    accountNo: 'SH-1002',
    customerId: 'cust-02',
    unitsHeld: 300,
    unitPriceUGX: 20_000,
    totalValueUGX: 6_000_000,
    dividendEarnedUGX: 0,
    status: 'active',
    joinedAt: '2026-01-01',
  },
];

const mockCustomers: Customer[] = [
  {
    id: 'cust-01',
    tenantId: 'tenant-victoria',
    branchId: 'branch-01',
    customerNo: 'C-01',
    type: 'individual',
    fullName: 'David Ochieng',
    occupation: 'Farmer',
    phone: '+256770000001',
    monthlyIncome: 2_000_000,
    monthlyExpenses: 800_000,
    creditScoreRating: 'A',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CM900****123A',
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
    fullName: 'Grace Namutebi',
    occupation: 'Accountant',
    phone: '+256770000002',
    monthlyIncome: 4_000_000,
    monthlyExpenses: 1_200_000,
    creditScoreRating: 'A',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CF920****456B',
      verifiedAt: '2026-01-01',
      verificationStatus: 'verified',
    } as any,
    status: 'active',
    createdAt: '2026-01-01',
  },
];

test('calculateDividendProjection correctly computes gross pool, statutory reserves, and withholding tax', () => {
  const result = calculateDividendProjection({
    totalShareCapitalUGX: 8_000_000,
    annualPerformanceRatePercent: 10, // 10% gross = 800,000 UGX
    statutoryReservePercent: 20, // 20% of 800,000 = 160,000 UGX
    withholdingTaxPercent: 15, // 15% of 640,000 = 96,000 UGX
    shareAccounts: mockShareAccounts,
    customers: mockCustomers,
  });

  assert.equal(result.totalShareCapitalUGX, 8_000_000);
  assert.equal(result.totalUnitsHeld, 400);
  assert.equal(result.grossDividendPoolUGX, 800_000);
  assert.equal(result.statutoryReserveUGX, 160_000);
  assert.equal(result.distributableDividendPoolUGX, 640_000);
  assert.equal(result.totalWithholdingTaxUGX, 96_000);
  assert.equal(result.netDividendPayoutUGX, 544_000);
  assert.equal(result.dividendPerShareUnitUGX, 1_600); // 640,000 / 400 = 1,600 UGX/unit
});

test('calculateDividendProjection allocates pro-rata shares accurately to members', () => {
  const result = calculateDividendProjection({
    totalShareCapitalUGX: 8_000_000,
    annualPerformanceRatePercent: 10,
    statutoryReservePercent: 20,
    withholdingTaxPercent: 15,
    shareAccounts: mockShareAccounts,
    customers: mockCustomers,
  });

  assert.equal(result.memberAllocations.length, 2);
  // Member 1 has 100/400 = 25%
  assert.equal(result.memberAllocations[0].ownershipPercent, 25.0);
  assert.equal(result.memberAllocations[0].grossDividendUGX, 160_000);
  assert.equal(result.memberAllocations[0].withholdingTaxUGX, 24_000);
  assert.equal(result.memberAllocations[0].netDividendUGX, 136_000);

  // Member 2 has 300/400 = 75%
  assert.equal(result.memberAllocations[1].ownershipPercent, 75.0);
  assert.equal(result.memberAllocations[1].grossDividendUGX, 480_000);
  assert.equal(result.memberAllocations[1].withholdingTaxUGX, 72_000);
  assert.equal(result.memberAllocations[1].netDividendUGX, 408_000);
});

test('exportDividendScheduleCSV produces RFC 4180 CSV with BOM', () => {
  const result = calculateDividendProjection({
    totalShareCapitalUGX: 8_000_000,
    annualPerformanceRatePercent: 12,
    shareAccounts: mockShareAccounts,
    customers: mockCustomers,
  });

  const csv = exportDividendScheduleCSV(result, 'Victoria Microfinance');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('David Ochieng'));
  assert.ok(csv.includes('Grace Namutebi'));
  assert.ok(csv.includes('Gross Dividend Pool'));
});
