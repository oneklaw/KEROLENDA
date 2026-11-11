import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeProductComparison,
  generateProductComparisonCSV,
} from './loanComparisonUtils';
import { LoanProduct } from '../types';

describe('loanComparisonUtils test suite', () => {
  const mockProducts: LoanProduct[] = [
    {
      id: 'prod-sme',
      tenantId: 'tenant-victoria',
      code: 'SME-WC',
      name: 'SME Working Capital Loan',
      currency: 'UGX',
      interestMethod: 'reducing_balance',
      annualRatePercent: 18.0,
      minPrincipal: 2_000_000,
      maxPrincipal: 50_000_000,
      minTermMonths: 3,
      maxTermMonths: 24,
      processingFeePercent: 2.0,
      insuranceFeePercent: 0.5,
      penaltyLateDailyPercent: 0.05,
      description: 'Affordable reducing balance credit line for trading and stock purchase.',
      status: 'active',
    },
    {
      id: 'prod-salary',
      tenantId: 'tenant-victoria',
      code: 'SAL-ADV',
      name: 'Quick Salary Advance',
      currency: 'UGX',
      interestMethod: 'flat',
      annualRatePercent: 12.0,
      minPrincipal: 500_000,
      maxPrincipal: 5_000_000,
      minTermMonths: 1,
      maxTermMonths: 6,
      processingFeePercent: 1.5,
      insuranceFeePercent: 0.0,
      penaltyLateDailyPercent: 0.1,
      description: 'Short-term emergency liquidity for formally employed individuals.',
      status: 'active',
    },
    {
      id: 'prod-land',
      tenantId: 'tenant-victoria',
      code: 'LAND-SEC',
      name: 'Land Title Secured Micro-Mortgage',
      currency: 'UGX',
      interestMethod: 'reducing_balance',
      annualRatePercent: 17.5,
      minPrincipal: 10_000_000,
      maxPrincipal: 150_000_000,
      minTermMonths: 12,
      maxTermMonths: 36,
      processingFeePercent: 2.5,
      insuranceFeePercent: 1.0,
      penaltyLateDailyPercent: 0.04,
      description: 'Long-term mortgage backed by registered freehold or mailo land titles.',
      status: 'active',
    },
  ];

  it('computes side-by-side metrics correctly for given benchmark amount and term', () => {
    const { metrics, highlights } = computeProductComparison(mockProducts, 5_000_000, 6, 'monthly');

    assert.strictEqual(metrics.length, 3);

    // Verify prod-sme metrics
    const sme = metrics.find((m) => m.product.id === 'prod-sme')!;
    assert.strictEqual(sme.annualRatePercent, 18.0);
    assert.strictEqual(sme.processingFeePercent, 2.0);
    assert.strictEqual(sme.processingFeeUGX, 100_000); // 2% of 5M
    assert.strictEqual(sme.insuranceFeeUGX, 25_000); // 0.5% of 5M
    assert.strictEqual(sme.totalUpfrontFeesUGX, 125_000);
    assert.strictEqual(sme.netDisbursedUGX, 4_875_000);
    assert.strictEqual(sme.isPrincipalInBounds, true); // 5M is between 2M and 50M
    assert.strictEqual(sme.isTermInBounds, true); // 6m is between 3 and 24m

    // Verify prod-salary metrics
    const salary = metrics.find((m) => m.product.id === 'prod-salary')!;
    assert.strictEqual(salary.annualRatePercent, 12.0);
    assert.strictEqual(salary.processingFeeUGX, 75_000); // 1.5% of 5M
    assert.strictEqual(salary.insuranceFeeUGX, 0);
    assert.strictEqual(salary.netDisbursedUGX, 4_925_000);
    assert.strictEqual(salary.isPrincipalInBounds, true); // 5M is max principal
    assert.strictEqual(salary.isTermInBounds, true); // 6m is max term

    // Verify prod-land bounds check: 5M is under min 10M, 6m is under min 12m
    const land = metrics.find((m) => m.product.id === 'prod-land')!;
    assert.strictEqual(land.isPrincipalInBounds, false);
    assert.strictEqual(land.isTermInBounds, false);

    // Verify highlights
    assert.strictEqual(highlights.lowestRateProductId, 'prod-salary'); // 12% is lowest
    assert.strictEqual(highlights.lowestFeeProductId, 'prod-salary'); // 75,000 is lowest fee
    assert.strictEqual(highlights.highestMaxPrincipalProductId, 'prod-land'); // 150M is highest
    assert.strictEqual(highlights.longestTenureProductId, 'prod-land'); // 36 months is longest
  });

  it('handles empty product list without throwing', () => {
    const { metrics, highlights } = computeProductComparison([], 5_000_000, 6);
    assert.strictEqual(metrics.length, 0);
    assert.deepStrictEqual(highlights, {});
  });

  it('generates non-empty CSV formatted report', () => {
    const { metrics } = computeProductComparison(mockProducts, 3_000_000, 4);
    const csv = generateProductComparisonCSV(metrics, 'Victoria Microfinance');
    assert.ok(csv.includes('Victoria Microfinance'));
    assert.ok(csv.includes('SME-WC'));
    assert.ok(csv.includes('SAL-ADV'));
    assert.ok(csv.includes('LAND-SEC'));
    assert.ok(csv.includes('Processing Fee Rate'));
  });
});
