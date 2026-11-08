import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyLoanRiskLevel,
  classifyLoanSector,
  generatePortfolioHeatmap,
  getHeatmapCellBg,
  RISK_LEVELS_CONFIG,
  SECTORS_CONFIG,
} from './portfolioHeatmapService';
import { Loan, Customer } from '../types';

function createMockCustomer(overrides: Partial<Customer>): Customer {
  return {
    id: 'cust-1',
    tenantId: 'tenant-victoria',
    branchId: 'branch-kla-main',
    customerNo: 'CUST-001',
    type: 'individual',
    fullName: 'Test Borrower',
    phone: '+256 700 000 000',
    occupation: 'Retail Shopkeeper',
    monthlyIncome: 2_000_000,
    monthlyExpenses: 800_000,
    creditScoreRating: 'B',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CM900****123K',
      verifiedAt: '2026-01-01',
      verificationStatus: 'verified',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      nextOfKinName: 'Kin Name',
      nextOfKinPhone: '+256 700 111 222',
      nextOfKinRelationship: 'Spouse',
      residenceTown: 'Kampala',
      residenceDistrict: 'Kampala',
    },
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockLoan(overrides: Partial<Loan>): Loan {
  return {
    id: 'loan-1',
    tenantId: 'tenant-victoria',
    branchId: 'branch-kla-main',
    loanNo: 'LN-001',
    applicationId: 'app-1',
    customerId: 'cust-1',
    productId: 'prod-sme',
    currency: 'UGX',
    principalApproved: 5_000_000,
    interestRateAnnual: 18,
    interestMethod: 'reducing_balance',
    termMonths: 6,
    disbursedAmount: 5_000_000,
    disbursedAt: '2026-01-01T00:00:00Z',
    disbursementChannel: 'Cash Till',
    disbursementRef: 'REF-001',
    maturityDate: '2026-07-01',
    totalInterestExpected: 450_000,
    totalFeesCharged: 100_000,
    totalPaidPrincipal: 1_000_000,
    totalPaidInterest: 150_000,
    totalPaidFees: 100_000,
    totalPaidPenalties: 0,
    principalOutstanding: 4_000_000,
    interestAccruedOutstanding: 0,
    feesOutstanding: 0,
    penaltiesOutstanding: 0,
    daysPastDue: 0,
    status: 'active',
    schedule: [],
    ...overrides,
  };
}

test('classifyLoanRiskLevel correctly buckets loans according to DPD and status', () => {
  // Performing 0 DPD -> Low
  const loanLow = createMockLoan({ daysPastDue: 0, status: 'active' });
  assert.equal(classifyLoanRiskLevel(loanLow), 'low');

  // Watchlist 15 DPD -> Moderate
  const loanMod = createMockLoan({ daysPastDue: 15, status: 'in_arrears' });
  assert.equal(classifyLoanRiskLevel(loanMod), 'moderate');

  // Substandard 45 DPD -> High
  const loanHigh = createMockLoan({ daysPastDue: 45, status: 'in_arrears' });
  assert.equal(classifyLoanRiskLevel(loanHigh), 'high');

  // Doubtful / Loss 90 DPD -> Critical
  const loanCritical = createMockLoan({ daysPastDue: 90, status: 'in_arrears' });
  assert.equal(classifyLoanRiskLevel(loanCritical), 'critical');

  // Settled loan -> Low
  const loanSettled = createMockLoan({ daysPastDue: 50, status: 'settled', principalOutstanding: 0 });
  assert.equal(classifyLoanRiskLevel(loanSettled), 'low');

  // Written off -> Critical
  const loanWrittenOff = createMockLoan({ daysPastDue: 0, status: 'written_off' });
  assert.equal(classifyLoanRiskLevel(loanWrittenOff), 'critical');
});

test('classifyLoanSector classifies diverse occupations and business types', () => {
  // Agriculture
  const custAgri = createMockCustomer({ occupation: 'Poultry & Feed Producer', businessName: 'Kira Egg Farm' });
  const loanAgri = createMockLoan({ customerId: custAgri.id, productId: 'prod-sme' });
  assert.equal(classifyLoanSector(loanAgri, custAgri), 'agriculture');

  // Transport
  const custBoda = createMockCustomer({ occupation: 'Commercial Boda Boda Operator' });
  const loanBoda = createMockLoan({ customerId: custBoda.id, productId: 'prod-boda' });
  assert.equal(classifyLoanSector(loanBoda, custBoda), 'transport');

  // Trade / Retail
  const custRetail = createMockCustomer({ occupation: 'Hardware Merchant', businessName: 'Katwe Building Supplies' });
  const loanRetail = createMockLoan({ customerId: custRetail.id, productId: 'prod-sme' });
  assert.equal(classifyLoanSector(loanRetail, custRetail), 'trade_commerce');

  // Manufacturing / Crafts
  const custTailor = createMockCustomer({ occupation: 'Fashion Designer & Textile Tailor' });
  const loanTailor = createMockLoan({ customerId: custTailor.id, productId: 'prod-sme' });
  assert.equal(classifyLoanSector(loanTailor, custTailor), 'manufacturing_crafts');

  // Salary advance
  const custSalary = createMockCustomer({ occupation: 'Secondary School Teacher' });
  const loanSalary = createMockLoan({ customerId: custSalary.id, productId: 'prod-salary' });
  assert.equal(classifyLoanSector(loanSalary, custSalary), 'salary_payroll');
});

test('generatePortfolioHeatmap computes matrix concentration, totals, and percentages accurately', () => {
  const custAgri = createMockCustomer({ id: 'c-agri', occupation: 'Crop Farmer' });
  const custTrade = createMockCustomer({ id: 'c-trade', occupation: 'Market Wholesaler' });
  const custTransport = createMockCustomer({ id: 'c-trans', occupation: 'Taxi Driver' });

  const loans: Loan[] = [
    // Agri: 5,000,000 Low Risk (0 DPD)
    createMockLoan({
      id: 'l-1',
      loanNo: 'LN-001',
      customerId: custAgri.id,
      principalOutstanding: 5_000_000,
      daysPastDue: 0,
      status: 'active',
    }),
    // Trade: 10,000,000 Moderate Risk (10 DPD)
    createMockLoan({
      id: 'l-2',
      loanNo: 'LN-002',
      customerId: custTrade.id,
      principalOutstanding: 10_000_000,
      daysPastDue: 10,
      status: 'in_arrears',
    }),
    // Trade: 5,000,000 High Risk (45 DPD)
    createMockLoan({
      id: 'l-3',
      loanNo: 'LN-003',
      customerId: custTrade.id,
      principalOutstanding: 5_000_000,
      daysPastDue: 45,
      status: 'in_arrears',
    }),
    // Transport: 5,000,000 Critical Risk (75 DPD)
    createMockLoan({
      id: 'l-4',
      loanNo: 'LN-004',
      customerId: custTransport.id,
      principalOutstanding: 5_000_000,
      daysPastDue: 75,
      status: 'in_arrears',
    }),
  ];

  const customers = [custAgri, custTrade, custTransport];
  const summary = generatePortfolioHeatmap(loans, customers);

  // Total portfolio: 5M + 10M + 5M + 5M = 25M
  assert.equal(summary.totalPortfolioValue, 25_000_000);
  assert.equal(summary.totalActiveLoans, 4);

  // Risk totals check
  assert.equal(summary.riskTotals.low.amount, 5_000_000);
  assert.equal(summary.riskTotals.low.percent, 20.0);
  assert.equal(summary.riskTotals.moderate.amount, 10_000_000);
  assert.equal(summary.riskTotals.moderate.percent, 40.0);
  assert.equal(summary.riskTotals.high.amount, 5_000_000);
  assert.equal(summary.riskTotals.high.percent, 20.0);
  assert.equal(summary.riskTotals.critical.amount, 5_000_000);
  assert.equal(summary.riskTotals.critical.percent, 20.0);

  // High risk exposure: high (5M) + critical (5M) = 10M (40%)
  assert.equal(summary.highRiskExposure, 10_000_000);
  assert.equal(summary.highRiskPercent, 40.0);

  // Top sector check: Trade (15M, 60%)
  assert.ok(summary.topSector);
  assert.equal(summary.topSector.key, 'trade_commerce');
  assert.equal(summary.topSector.amount, 15_000_000);
  assert.equal(summary.topSector.percent, 60.0);

  // High concentration check: Trade is 60% > 45% threshold
  assert.equal(summary.diversificationStatus, 'High Concentration Warning');

  // Verify Trade row Recharts fields
  const tradeRow = summary.rows.find((r) => r.sectorKey === 'trade_commerce');
  assert.ok(tradeRow);
  assert.equal(tradeRow.totalLoans, 2);
  assert.equal(tradeRow.totalOutstanding, 15_000_000);
  assert.equal(tradeRow.lowRiskAmount, 0);
  assert.equal(tradeRow.moderateRiskAmount, 10_000_000);
  assert.equal(tradeRow.highRiskAmount, 5_000_000);
  assert.equal(tradeRow.criticalRiskAmount, 0);
});

test('getHeatmapCellBg generates styling classes based on intensity and risk', () => {
  const zeroStyle = getHeatmapCellBg('low', 0, 0);
  assert.ok(zeroStyle.bgClass.includes('bg-slate-50'));

  const highIntensityLow = getHeatmapCellBg('low', 0.8, 25);
  assert.ok(highIntensityLow.bgClass.includes('emerald-600'));

  const highIntensityCritical = getHeatmapCellBg('critical', 0.9, 30);
  assert.ok(highIntensityCritical.bgClass.includes('rose-600'));

  const medIntensityMod = getHeatmapCellBg('moderate', 0.4, 15);
  assert.ok(medIntensityMod.bgClass.includes('amber-200'));
});
