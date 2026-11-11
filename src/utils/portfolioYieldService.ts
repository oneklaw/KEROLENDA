import { Loan, LoanProduct } from '../types';

export interface ProductYieldMetric {
  productId: string;
  productCode: string;
  productName: string;
  interestMethod: 'flat' | 'reducing_balance';
  nominalRateAnnual: number;
  processingFeePercent: number;
  insuranceFeePercent: number;
  upfrontFeesPercent: number;
  effectiveInterestRate: number; // EIR % p.a.
  yieldSpread: number; // EIR - nominalRateAnnual (% points)
  activeLoansCount: number;
  activeOutstandingPrincipalUGX: number;
  totalDisbursedUGX: number;
  annualizedGrossYieldUGX: number;
  averageTenorMonths: number;
  profitabilityTier: 'High Margin' | 'Moderate Margin' | 'Competitive';
}

export interface PortfolioYieldComparisonResult {
  products: ProductYieldMetric[];
  weightedNominalRate: number;
  weightedEIR: number;
  portfolioYieldSpread: number;
  totalActivePortfolioUGX: number;
  totalAnnualizedYieldUGX: number;
  highestYieldProduct: ProductYieldMetric | null;
  lowestYieldProduct: ProductYieldMetric | null;
  mostProfitableProductByVolume: ProductYieldMetric | null;
}

/**
 * Computes exact Internal Rate of Return (IRR) using Newton-Raphson.
 * Cash flows: -netDisbursement at t=0, +pmt at t=1..n
 */
export function calculateReducingBalanceMonthlyIRR(
  netDisbursement: number,
  monthlyPayment: number,
  termMonths: number,
  maxIterations: number = 50,
  tolerance: number = 1e-7
): number {
  if (netDisbursement <= 0 || monthlyPayment <= 0 || termMonths <= 0) {
    return 0;
  }

  // Initial guess
  let r = (monthlyPayment * termMonths - netDisbursement) / (netDisbursement * termMonths);
  if (r <= 0) r = 0.01;

  for (let iter = 0; iter < maxIterations; iter++) {
    // f(r) = -netDisbursement + sum_{k=1}^n pmt / (1+r)^k
    // Using closed form for annuity: sum_{k=1}^n 1/(1+r)^k = [1 - (1+r)^(-n)] / r
    const onePlusR = 1 + r;
    const powN = Math.pow(onePlusR, termMonths);
    const annuityFactor = (1 - 1 / powN) / r;
    const npv = -netDisbursement + monthlyPayment * annuityFactor;

    if (Math.abs(npv) < tolerance) {
      return r;
    }

    // Derivative of f(r) with respect to r
    // d/dr [ (1 - (1+r)^(-n)) / r ] = [ -r * (-n)*(1+r)^(-n-1) - (1 - (1+r)^(-n)) ] / r^2
    const dAnnuity = (termMonths * (1 / (powN * onePlusR)) * r - (1 - 1 / powN)) / (r * r);
    const dNpv = monthlyPayment * dAnnuity;

    if (Math.abs(dNpv) < 1e-12) {
      break;
    }

    const nextR = r - npv / dNpv;
    if (nextR <= -0.99) {
      r = r / 2;
    } else {
      r = nextR;
    }
  }

  return Math.max(0, r);
}

/**
 * Calculates the Effective Interest Rate (EIR) / Annualized Real Yield for a loan product,
 * taking into account flat vs reducing balance amortization and upfront loan fees.
 *
 * Under central bank / UMRA actuarial disclosure guidelines:
 * - Flat interest: EIR accounts for the declining balance effect plus upfront origination fees.
 * - Reducing balance: EIR accounts for compounding plus net cash disbursement after fees.
 */
export function calculateProductEIR(
  nominalRateAnnual: number,
  interestMethod: 'flat' | 'reducing_balance',
  termMonths: number,
  upfrontFeesPercent: number = 0
): number {
  const safeTerm = Math.max(1, termMonths);
  const safeNominal = Math.max(0, nominalRateAnnual);
  const safeFees = Math.max(0, upfrontFeesPercent);

  const principal = 1_000_000; // Reference base
  const upfrontFeeUGX = principal * (safeFees / 100);
  const netDisbursement = principal - upfrontFeeUGX;

  if (interestMethod === 'flat') {
    // Total interest = P * (r/100) * (term / 12)
    const totalInterest = principal * (safeNominal / 100) * (safeTerm / 12);
    const totalCharges = totalInterest + upfrontFeeUGX;

    // Actuarial / UMRA installment formula for flat rate EIR:
    // EIR = [2 * 12 * Total Charges] / [Net Disbursement * (Term + 1)] * 100
    if (netDisbursement <= 0) return safeNominal;
    const eir = (2 * 12 * totalCharges) / (netDisbursement * (safeTerm + 1)) * 100;
    return Number(eir.toFixed(2));
  } else {
    // Reducing balance
    const monthlyRate = (safeNominal / 100) / 12;
    let emi: number;
    if (monthlyRate === 0) {
      emi = principal / safeTerm;
    } else {
      emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, safeTerm)) /
        (Math.pow(1 + monthlyRate, safeTerm) - 1);
    }

    if (safeFees === 0) {
      // Standard EAR from monthly compounding: (1 + r/12)^12 - 1
      const ear = (Math.pow(1 + monthlyRate, 12) - 1) * 100;
      return Number(ear.toFixed(2));
    }

    // With upfront fees, solve for effective monthly IRR
    const monthlyIRR = calculateReducingBalanceMonthlyIRR(netDisbursement, emi, safeTerm);
    const annualEIR = (Math.pow(1 + monthlyIRR, 12) - 1) * 100;
    return Number(annualEIR.toFixed(2));
  }
}

/**
 * Analyzes and compares Nominal Rate vs Effective Interest Rate (EIR) across all loan products,
 * cross-referencing with active loans to provide real profitability metrics.
 */
export function calculatePortfolioYieldComparison(
  products: LoanProduct[],
  loans: Loan[] = []
): PortfolioYieldComparisonResult {
  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'in_arrears');

  const productMetrics: ProductYieldMetric[] = products.map((prod) => {
    // Aggregate matching active loans
    const matchedLoans = activeLoans.filter((l) => l.productId === prod.id);
    const activeLoansCount = matchedLoans.length;

    const activeOutstandingPrincipalUGX = matchedLoans.reduce(
      (sum, l) => sum + (l.principalOutstanding ?? l.principalApproved ?? 0),
      0
    );

    const totalDisbursedUGX = matchedLoans.reduce(
      (sum, l) => sum + (l.disbursedAmount ?? l.principalApproved ?? 0),
      0
    );

    // Average tenor from active loans, or fallback to product midpoint
    const averageTenorMonths =
      matchedLoans.length > 0
        ? Math.round(matchedLoans.reduce((sum, l) => sum + l.termMonths, 0) / matchedLoans.length)
        : Math.round((prod.minTermMonths + prod.maxTermMonths) / 2) || 12;

    const upfrontFeesPercent = Number(
      ((prod.processingFeePercent || 0) + (prod.insuranceFeePercent || 0)).toFixed(2)
    );

    const effectiveInterestRate = calculateProductEIR(
      prod.annualRatePercent,
      prod.interestMethod,
      averageTenorMonths,
      upfrontFeesPercent
    );

    const yieldSpread = Number((effectiveInterestRate - prod.annualRatePercent).toFixed(2));

    // Annualized yield in UGX generated by this product based on current outstanding book
    const effectiveDecimal = effectiveInterestRate / 100;
    const baseBook = activeOutstandingPrincipalUGX > 0 ? activeOutstandingPrincipalUGX : prod.minPrincipal;
    const annualizedGrossYieldUGX = Math.round(baseBook * effectiveDecimal);

    // Categorize profitability tier
    let profitabilityTier: 'High Margin' | 'Moderate Margin' | 'Competitive' = 'Competitive';
    if (effectiveInterestRate >= 35) {
      profitabilityTier = 'High Margin';
    } else if (effectiveInterestRate >= 22) {
      profitabilityTier = 'Moderate Margin';
    }

    return {
      productId: prod.id,
      productCode: prod.code,
      productName: prod.name,
      interestMethod: prod.interestMethod,
      nominalRateAnnual: prod.annualRatePercent,
      processingFeePercent: prod.processingFeePercent || 0,
      insuranceFeePercent: prod.insuranceFeePercent || 0,
      upfrontFeesPercent,
      effectiveInterestRate,
      yieldSpread,
      activeLoansCount,
      activeOutstandingPrincipalUGX,
      totalDisbursedUGX,
      annualizedGrossYieldUGX,
      averageTenorMonths,
      profitabilityTier,
    };
  });

  // Calculate portfolio-wide weighted averages
  const totalActivePortfolioUGX = productMetrics.reduce(
    (sum, p) => sum + p.activeOutstandingPrincipalUGX,
    0
  );

  let weightedNominalRate = 0;
  let weightedEIR = 0;

  if (totalActivePortfolioUGX > 0) {
    weightedNominalRate = Number(
      (
        productMetrics.reduce(
          (sum, p) => sum + p.nominalRateAnnual * p.activeOutstandingPrincipalUGX,
          0
        ) / totalActivePortfolioUGX
      ).toFixed(2)
    );

    weightedEIR = Number(
      (
        productMetrics.reduce(
          (sum, p) => sum + p.effectiveInterestRate * p.activeOutstandingPrincipalUGX,
          0
        ) / totalActivePortfolioUGX
      ).toFixed(2)
    );
  } else if (productMetrics.length > 0) {
    // Unweighted average if no active loans
    weightedNominalRate = Number(
      (
        productMetrics.reduce((sum, p) => sum + p.nominalRateAnnual, 0) / productMetrics.length
      ).toFixed(2)
    );
    weightedEIR = Number(
      (
        productMetrics.reduce((sum, p) => sum + p.effectiveInterestRate, 0) / productMetrics.length
      ).toFixed(2)
    );
  }

  const portfolioYieldSpread = Number((weightedEIR - weightedNominalRate).toFixed(2));
  const totalAnnualizedYieldUGX = productMetrics.reduce((sum, p) => sum + p.annualizedGrossYieldUGX, 0);

  // Identify standout products
  const sortedByEIR = [...productMetrics].sort(
    (a, b) => b.effectiveInterestRate - a.effectiveInterestRate
  );
  const highestYieldProduct = sortedByEIR.length > 0 ? sortedByEIR[0] : null;
  const lowestYieldProduct = sortedByEIR.length > 0 ? sortedByEIR[sortedByEIR.length - 1] : null;

  const sortedByVolume = [...productMetrics].sort(
    (a, b) => b.activeOutstandingPrincipalUGX - a.activeOutstandingPrincipalUGX
  );
  const mostProfitableProductByVolume = sortedByVolume.length > 0 ? sortedByVolume[0] : null;

  return {
    products: productMetrics,
    weightedNominalRate,
    weightedEIR,
    portfolioYieldSpread,
    totalActivePortfolioUGX,
    totalAnnualizedYieldUGX,
    highestYieldProduct,
    lowestYieldProduct,
    mostProfitableProductByVolume,
  };
}
