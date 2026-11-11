import { LoanProduct } from '../types';
import {
  calculateSchedule,
  formatUGX,
  formatCompactUGX,
  PaymentFrequency,
  InterestMethod,
} from './finance';

export interface ProductComparisonMetric {
  product: LoanProduct;
  isPrincipalInBounds: boolean;
  isTermInBounds: boolean;
  benchmarkPrincipal: number;
  benchmarkTermMonths: number;
  frequency: PaymentFrequency;
  
  // Rate & Method
  annualRatePercent: number;
  monthlyRatePercent: number;
  interestMethod: InterestMethod;
  
  // Fees
  processingFeePercent: number;
  processingFeeUGX: number;
  insuranceFeePercent: number;
  insuranceFeeUGX: number;
  totalUpfrontFeesUGX: number;
  netDisbursedUGX: number;
  latePenaltyDailyPercent: number;
  
  // Repayment Terms
  minTermMonths: number;
  maxTermMonths: number;
  minPrincipal: number;
  maxPrincipal: number;
  
  // Simulated Financial Figures
  periodicInstallmentUGX: number;
  totalInterestUGX: number;
  totalRepaymentUGX: number; // Principal + Interest
  totalCostOfCreditUGX: number; // Interest + Upfront Fees
  effectiveAprPercent: number;
}

export interface BestInClassHighlights {
  lowestRateProductId?: string;
  lowestFeeProductId?: string;
  lowestInstallmentProductId?: string;
  highestMaxPrincipalProductId?: string;
  longestTenureProductId?: string;
}

/**
 * Computes side-by-side comparison metrics for a list of loan products
 * using a simulated benchmark principal and term.
 */
export function computeProductComparison(
  products: LoanProduct[],
  benchmarkPrincipal: number,
  benchmarkTermMonths: number,
  frequency: PaymentFrequency = 'monthly'
): {
  metrics: ProductComparisonMetric[];
  highlights: BestInClassHighlights;
} {
  if (!products || products.length === 0) {
    return { metrics: [], highlights: {} };
  }

  const safePrincipal = Math.max(100_000, benchmarkPrincipal || 5_000_000);
  const safeTerm = Math.max(1, benchmarkTermMonths || 6);

  const metrics: ProductComparisonMetric[] = products.map((product) => {
    const isPrincipalInBounds =
      safePrincipal >= product.minPrincipal && safePrincipal <= product.maxPrincipal;
    const isTermInBounds =
      safeTerm >= product.minTermMonths && safeTerm <= product.maxTermMonths;

    const processingFeePercent = product.processingFeePercent || 0;
    const insuranceFeePercent = product.insuranceFeePercent || 0;
    const processingFeeUGX = Math.round((safePrincipal * processingFeePercent) / 100);
    const insuranceFeeUGX = Math.round((safePrincipal * insuranceFeePercent) / 100);
    const totalUpfrontFeesUGX = processingFeeUGX + insuranceFeeUGX;
    const netDisbursedUGX = Math.max(0, safePrincipal - totalUpfrontFeesUGX);

    // Calculate schedule based on product's rate and method
    const schedule = calculateSchedule(
      safePrincipal,
      product.annualRatePercent,
      safeTerm,
      frequency,
      product.interestMethod,
      new Date().toISOString().split('T')[0],
      processingFeePercent
    );

    const periodicInstallmentUGX = schedule.periodicInstalment || 0;
    const totalInterestUGX = schedule.totalInterest || 0;
    const totalRepaymentUGX = safePrincipal + totalInterestUGX;
    const totalCostOfCreditUGX = totalInterestUGX + totalUpfrontFeesUGX;

    return {
      product,
      isPrincipalInBounds,
      isTermInBounds,
      benchmarkPrincipal: safePrincipal,
      benchmarkTermMonths: safeTerm,
      frequency,
      annualRatePercent: product.annualRatePercent,
      monthlyRatePercent: Number((product.annualRatePercent / 12).toFixed(2)),
      interestMethod: product.interestMethod,
      processingFeePercent,
      processingFeeUGX,
      insuranceFeePercent,
      insuranceFeeUGX,
      totalUpfrontFeesUGX,
      netDisbursedUGX,
      latePenaltyDailyPercent: product.penaltyLateDailyPercent || 0.1,
      minTermMonths: product.minTermMonths,
      maxTermMonths: product.maxTermMonths,
      minPrincipal: product.minPrincipal,
      maxPrincipal: product.maxPrincipal,
      periodicInstallmentUGX,
      totalInterestUGX,
      totalRepaymentUGX,
      totalCostOfCreditUGX,
      effectiveAprPercent: schedule.effectiveApr,
    };
  });

  // Calculate Best-in-Class Highlights
  let lowestRate = Infinity;
  let lowestRateId: string | undefined;

  let lowestFee = Infinity;
  let lowestFeeId: string | undefined;

  let lowestInstallment = Infinity;
  let lowestInstallmentId: string | undefined;

  let highestMaxPrincipal = -Infinity;
  let highestMaxPrincipalId: string | undefined;

  let longestTenure = -Infinity;
  let longestTenureId: string | undefined;

  for (const m of metrics) {
    if (m.annualRatePercent < lowestRate) {
      lowestRate = m.annualRatePercent;
      lowestRateId = m.product.id;
    }
    if (m.totalUpfrontFeesUGX < lowestFee) {
      lowestFee = m.totalUpfrontFeesUGX;
      lowestFeeId = m.product.id;
    }
    if (m.periodicInstallmentUGX > 0 && m.periodicInstallmentUGX < lowestInstallment) {
      lowestInstallment = m.periodicInstallmentUGX;
      lowestInstallmentId = m.product.id;
    }
    if (m.maxPrincipal > highestMaxPrincipal) {
      highestMaxPrincipal = m.maxPrincipal;
      highestMaxPrincipalId = m.product.id;
    }
    if (m.maxTermMonths > longestTenure) {
      longestTenure = m.maxTermMonths;
      longestTenureId = m.product.id;
    }
  }

  return {
    metrics,
    highlights: {
      lowestRateProductId: lowestRateId,
      lowestFeeProductId: lowestFeeId,
      lowestInstallmentProductId: lowestInstallmentId,
      highestMaxPrincipalProductId: highestMaxPrincipalId,
      longestTenureProductId: longestTenureId,
    },
  };
}

/**
 * Generates a formatted CSV string for side-by-side product comparisons
 */
export function generateProductComparisonCSV(
  metrics: ProductComparisonMetric[],
  tenantName: string = 'KEROLENDA Microfinance'
): string {
  const headers = [
    'Comparison Feature',
    ...metrics.map((m) => `"${m.product.name} (${m.product.code})"`),
  ];

  const rows: string[][] = [
    ['Product Code', ...metrics.map((m) => m.product.code)],
    ['Status', ...metrics.map((m) => m.product.status.toUpperCase())],
    ['Target Description', ...metrics.map((m) => `"${m.product.description.replace(/"/g, '""')}"`)],
    [
      'Annual Interest Rate (Nominal)',
      ...metrics.map((m) => `${m.annualRatePercent}% p.a.`),
    ],
    [
      'Monthly Nominal Rate',
      ...metrics.map((m) => `${m.monthlyRatePercent}% per month`),
    ],
    [
      'Interest Amortization Method',
      ...metrics.map((m) =>
        m.interestMethod === 'reducing_balance' ? 'Reducing Balance' : 'Flat Rate'
      ),
    ],
    [
      'Processing Fee Rate',
      ...metrics.map((m) => `${m.processingFeePercent}%`),
    ],
    [
      'Insurance / Protection Fee Rate',
      ...metrics.map((m) => `${m.insuranceFeePercent}%`),
    ],
    [
      'Total Upfront Deductions Rate',
      ...metrics.map((m) => `${(m.processingFeePercent + m.insuranceFeePercent).toFixed(1)}%`),
    ],
    [
      'Late Repayment Daily Penalty',
      ...metrics.map((m) => `${m.latePenaltyDailyPercent}% daily`),
    ],
    [
      'Repayment Tenure Range',
      ...metrics.map((m) => `${m.minTermMonths} - ${m.maxTermMonths} Months`),
    ],
    [
      'Principal Borrowing Limits',
      ...metrics.map((m) => `${formatUGX(m.minPrincipal)} - ${formatUGX(m.maxPrincipal)}`),
    ],
    [
      '--- SIMULATED SCENARIO ---',
      ...metrics.map((m) => `Principal: ${formatUGX(m.benchmarkPrincipal)} | Term: ${m.benchmarkTermMonths}m`),
    ],
    [
      'Simulated Monthly Installment',
      ...metrics.map((m) => formatUGX(m.periodicInstallmentUGX)),
    ],
    [
      'Simulated Total Interest',
      ...metrics.map((m) => formatUGX(m.totalInterestUGX)),
    ],
    [
      'Simulated Upfront Fees',
      ...metrics.map((m) => formatUGX(m.totalUpfrontFeesUGX)),
    ],
    [
      'Net Disbursed Cash',
      ...metrics.map((m) => formatUGX(m.netDisbursedUGX)),
    ],
    [
      'Total Cost of Credit (Fees + Interest)',
      ...metrics.map((m) => formatUGX(m.totalCostOfCreditUGX)),
    ],
  ];

  const csvLines = [
    `"KEROLENDA Institutional Loan Product Comparison Matrix - ${tenantName}"`,
    `"Generated: ${new Date().toISOString()}"`,
    '',
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ];

  return csvLines.join('\n');
}
