import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateProductEIR,
  calculateReducingBalanceMonthlyIRR,
  calculatePortfolioYieldComparison,
} from './portfolioYieldService';
import { LoanProduct, Loan } from '../types';

describe('portfolioYieldService', () => {
  it('calculateProductEIR for flat rate products produces realistic elevated EIR', () => {
    // 20% nominal flat rate over 12 months with 3.5% upfront fees (Boda Boda style)
    const eir = calculateProductEIR(20.0, 'flat', 12, 3.5);
    // Flat rate EIR should be significantly higher than nominal (~40-46%)
    assert.ok(eir > 35, `Expected flat rate EIR > 35%, got ${eir}`);
    assert.ok(eir < 55, `Expected flat rate EIR < 55%, got ${eir}`);
  });

  it('calculateProductEIR for reducing balance with zero fees equals compounded EAR', () => {
    // 18% nominal reducing balance with 0% upfront fees
    const eir = calculateProductEIR(18.0, 'reducing_balance', 12, 0);
    // EAR = (1 + 0.18/12)^12 - 1 = ~19.56%
    assert.strictEqual(eir, 19.56);
  });

  it('calculateProductEIR for reducing balance with upfront fees elevates EIR above EAR', () => {
    // 18% nominal reducing balance with 2.5% upfront fees over 12 months
    const eir = calculateProductEIR(18.0, 'reducing_balance', 12, 2.5);
    // Should be elevated by fee amortization (~24% - 26%)
    assert.ok(eir > 22, `Expected reducing balance EIR > 22%, got ${eir}`);
    assert.ok(eir < 28, `Expected reducing balance EIR < 28%, got ${eir}`);
  });

  it('calculateReducingBalanceMonthlyIRR converges accurately', () => {
    // Net disbursement: 9,750,000, monthly payment: 916,800, 12 months
    const irr = calculateReducingBalanceMonthlyIRR(9_750_000, 916_800, 12);
    assert.ok(irr > 0.015 && irr < 0.025, `Expected monthly IRR between 1.5% and 2.5%, got ${irr}`);
  });

  it('calculatePortfolioYieldComparison aggregates product metrics and calculates portfolio weighted spread', () => {
    const mockProducts: LoanProduct[] = [
      {
        id: 'prod-sme',
        tenantId: 'tenant-test',
        code: 'SME-WC',
        name: 'SME Working Capital',
        currency: 'UGX',
        interestMethod: 'reducing_balance',
        annualRatePercent: 18.0,
        minPrincipal: 1_000_000,
        maxPrincipal: 20_000_000,
        minTermMonths: 6,
        maxTermMonths: 24,
        processingFeePercent: 2.0,
        insuranceFeePercent: 0.5,
        penaltyLateDailyPercent: 0.05,
        description: 'SME loan',
        status: 'active',
      },
      {
        id: 'prod-boda',
        tenantId: 'tenant-test',
        code: 'ASSET-BODA',
        name: 'Boda Boda Asset Finance',
        currency: 'UGX',
        interestMethod: 'flat',
        annualRatePercent: 20.0,
        minPrincipal: 2_000_000,
        maxPrincipal: 8_000_000,
        minTermMonths: 6,
        maxTermMonths: 18,
        processingFeePercent: 2.5,
        insuranceFeePercent: 1.0,
        penaltyLateDailyPercent: 0.1,
        description: 'Asset loan',
        status: 'active',
      },
    ];

    const mockLoans: Loan[] = [
      {
        id: 'loan-1',
        tenantId: 'tenant-test',
        branchId: 'b-1',
        loanNo: 'LN-001',
        applicationId: 'app-001',
        customerId: 'cust-1',
        productId: 'prod-sme',
        currency: 'UGX',
        principalApproved: 10_000_000,
        principalOutstanding: 8_000_000,
        disbursedAmount: 10_000_000,
        disbursedAt: '2026-01-01',
        disbursementChannel: 'Cash Till',
        disbursementRef: 'REF-001',
        maturityDate: '2027-01-01',
        termMonths: 12,
        interestRateAnnual: 18.0,
        interestMethod: 'reducing_balance',
        status: 'active',
        totalInterestExpected: 1_000_000,
        totalFeesCharged: 250_000,
        totalPaidPrincipal: 2_000_000,
        totalPaidInterest: 500_000,
        totalPaidFees: 250_000,
        totalPaidPenalties: 0,
        interestAccruedOutstanding: 0,
        feesOutstanding: 0,
        penaltiesOutstanding: 0,
        daysPastDue: 0,
        schedule: [],
      },
      {
        id: 'loan-2',
        tenantId: 'tenant-test',
        branchId: 'b-1',
        loanNo: 'LN-002',
        applicationId: 'app-002',
        customerId: 'cust-2',
        productId: 'prod-boda',
        currency: 'UGX',
        principalApproved: 5_000_000,
        principalOutstanding: 4_000_000,
        disbursedAmount: 5_000_000,
        disbursedAt: '2026-02-01',
        disbursementChannel: 'Cash Till',
        disbursementRef: 'REF-002',
        maturityDate: '2027-02-01',
        termMonths: 12,
        interestRateAnnual: 20.0,
        interestMethod: 'flat',
        status: 'active',
        totalInterestExpected: 1_000_000,
        totalFeesCharged: 175_000,
        totalPaidPrincipal: 1_000_000,
        totalPaidInterest: 300_000,
        totalPaidFees: 175_000,
        totalPaidPenalties: 0,
        interestAccruedOutstanding: 0,
        feesOutstanding: 0,
        penaltiesOutstanding: 0,
        daysPastDue: 0,
        schedule: [],
      },
    ];

    const result = calculatePortfolioYieldComparison(mockProducts, mockLoans);

    assert.strictEqual(result.products.length, 2);
    assert.strictEqual(result.totalActivePortfolioUGX, 12_000_000); // 8M + 4M

    // SME product checks
    const sme = result.products.find((p) => p.productId === 'prod-sme');
    assert.ok(sme);
    assert.strictEqual(sme.nominalRateAnnual, 18.0);
    assert.strictEqual(sme.interestMethod, 'reducing_balance');
    assert.ok(sme.effectiveInterestRate > 18.0, 'EIR should exceed nominal due to fees');
    assert.strictEqual(sme.activeLoansCount, 1);
    assert.strictEqual(sme.activeOutstandingPrincipalUGX, 8_000_000);

    // Boda product checks
    const boda = result.products.find((p) => p.productId === 'prod-boda');
    assert.ok(boda);
    assert.strictEqual(boda.nominalRateAnnual, 20.0);
    assert.strictEqual(boda.interestMethod, 'flat');
    assert.ok(boda.effectiveInterestRate > 35.0, 'Flat rate EIR should be > 35%');
    assert.strictEqual(boda.profitabilityTier, 'High Margin');

    // Portfolio level checks
    assert.ok(result.weightedNominalRate > 18 && result.weightedNominalRate < 20);
    assert.ok(result.weightedEIR > result.weightedNominalRate, 'Weighted EIR must exceed Nominal');
    assert.ok(result.portfolioYieldSpread > 0, 'Portfolio yield spread must be positive');
    assert.strictEqual(result.highestYieldProduct?.productId, 'prod-boda');
  });

  it('handles empty loans gracefully with zero division safety', () => {
    const mockProducts: LoanProduct[] = [
      {
        id: 'prod-salary',
        tenantId: 'tenant-test',
        code: 'SAL-ADV',
        name: 'Quick Salary Advance',
        currency: 'UGX',
        interestMethod: 'flat',
        annualRatePercent: 12.0,
        minPrincipal: 500_000,
        maxPrincipal: 3_000_000,
        minTermMonths: 1,
        maxTermMonths: 6,
        processingFeePercent: 1.5,
        insuranceFeePercent: 0,
        penaltyLateDailyPercent: 0.1,
        description: 'Salary advance',
        status: 'active',
      },
    ];

    const result = calculatePortfolioYieldComparison(mockProducts, []);
    assert.strictEqual(result.products.length, 1);
    assert.strictEqual(result.totalActivePortfolioUGX, 0);
    assert.strictEqual(result.products[0].activeLoansCount, 0);
    assert.ok(!Number.isNaN(result.weightedNominalRate));
    assert.ok(!Number.isNaN(result.weightedEIR));
    assert.ok(!Number.isNaN(result.portfolioYieldSpread));
  });
});
