import { Customer, LoanProduct, Loan } from '../types';

export interface LoanTermSuggestionParams {
  customer: Customer;
  product: LoanProduct;
  requestedAmount: number;
  historicalLoans?: Loan[];
}

export interface TermRationale {
  title: string;
  description: string;
  impact: string;
  type: 'positive' | 'caution' | 'neutral';
}

export interface LoanTermSuggestionResult {
  suggestedTermMonths: number;
  suggestedAnnualRatePercent: number;
  baseProductRatePercent: number;
  rateAdjustmentPercent: number;
  estimatedMonthlyInstallmentUGX: number;
  projectedDtiPercent: number;
  affordabilityStatus: 'Optimal' | 'Manageable' | 'Caution' | 'High Burden';
  creditBehaviorSummary: {
    creditRating: 'A' | 'B' | 'C' | 'D';
    totalPastLoans: number;
    settledLoansCount: number;
    activeDelinquentCount: number;
    maxHistoricalDpd: number;
    repaymentReputation:
      | 'Prime Repayer (Discount Tier)'
      | 'Proven Performer'
      | 'First-Time Applicant'
      | 'Cautionary Arrears History';
  };
  incomeProfileSummary: {
    monthlyIncomeUGX: number;
    monthlyExpensesUGX: number;
    netDisposableUGX: number;
    disposableCoverageRatio: number;
  };
  rationales: TermRationale[];
  estimatedInterestSavingsUGX: number;
}

/**
 * Calculates a quick monthly flat or reducing installment for estimation.
 */
function estimateInstallment(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
  method: 'flat' | 'reducing_balance'
): number {
  if (termMonths <= 0) return principal;
  if (method === 'flat') {
    const totalInterest = principal * (annualRatePercent / 100) * (termMonths / 12);
    return Math.round((principal + totalInterest) / termMonths);
  } else {
    const monthlyRate = annualRatePercent / 100 / 12;
    if (monthlyRate === 0) return Math.round(principal / termMonths);
    const pmt =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    return Math.round(pmt);
  }
}

/**
 * Suggests loan terms (duration and interest rate) tailored to the specific customer's
 * historical credit repayment behavior and current income profile.
 */
export function suggestLoanTerms({
  customer,
  product,
  requestedAmount,
  historicalLoans = [],
}: LoanTermSuggestionParams): LoanTermSuggestionResult {
  const baseRate = product.annualRatePercent;
  const minTerm = product.minTermMonths || 1;
  const maxTerm = product.maxTermMonths || 36;
  const amount = Math.max(100_000, requestedAmount);

  // 1. Analyze Historical Credit Behavior
  const customerLoans = historicalLoans.filter((l) => l.customerId === customer.id);
  const totalPastLoans = customerLoans.length;
  const settledLoans = customerLoans.filter((l) => l.status === 'settled');
  const settledLoansCount = settledLoans.length;
  const delinquentLoans = customerLoans.filter(
    (l) => l.status === 'in_arrears' || (l.daysPastDue && l.daysPastDue > 0)
  );
  const activeDelinquentCount = delinquentLoans.length;
  const maxHistoricalDpd = customerLoans.reduce(
    (max, l) => Math.max(max, l.daysPastDue || 0),
    0
  );

  let creditReputation: LoanTermSuggestionResult['creditBehaviorSummary']['repaymentReputation'] =
    'First-Time Applicant';
  let rateAdjustment = 0; // In percentage points
  const rationales: TermRationale[] = [];

  const rating = customer.creditScoreRating || 'B';

  if (activeDelinquentCount > 0 || maxHistoricalDpd >= 30 || rating === 'D') {
    creditReputation = 'Cautionary Arrears History';
    rateAdjustment = 2.0; // +2.0% risk premium
    rationales.push({
      title: 'Elevated Credit Risk Margin',
      description: `Customer has history of ${maxHistoricalDpd} DPD arrears or Grade D rating. A risk margin of +2.0% is assigned to mitigate expected loss provisions.`,
      impact: '+2.0% APR',
      type: 'caution',
    });
  } else if (rating === 'A' && settledLoansCount >= 1 && maxHistoricalDpd === 0) {
    creditReputation = 'Prime Repayer (Discount Tier)';
    rateAdjustment = -2.0; // -2.0% prime concession
    rationales.push({
      title: 'Prime Credit Track Record Concession',
      description: `Customer holds Grade A credit rating with ${settledLoansCount} past facility settled on schedule without delinquency. Rewarded with prime rate discount.`,
      impact: '-2.0% APR',
      type: 'positive',
    });
  } else if (rating === 'A' || (settledLoansCount >= 1 && maxHistoricalDpd === 0)) {
    creditReputation = 'Proven Performer';
    rateAdjustment = -1.0; // -1.0% discount
    rationales.push({
      title: 'Loyalty Performance Discount',
      description: `Reliable history of scheduled repayments with zero active arrears warrants a 1.0% interest rate discount below standard card rates.`,
      impact: '-1.0% APR',
      type: 'positive',
    });
  } else if (rating === 'C') {
    rateAdjustment = 1.0;
    rationales.push({
      title: 'Grade C Risk Cushion',
      description: 'Moderate credit grade requires a prudent +1.0% APR risk buffer.',
      impact: '+1.0% APR',
      type: 'caution',
    });
  } else {
    creditReputation = 'First-Time Applicant';
    rateAdjustment = 0;
    rationales.push({
      title: 'Standard Introductory Pricing',
      description: 'First-time borrower with clean initial KYC. Standard benchmark card rate applied.',
      impact: '0.0% APR',
      type: 'neutral',
    });
  }

  // Calculate final suggested interest rate (clamped within regulatory and product ceilings)
  const statutoryMinRate = 12.0;
  const statutoryMaxRate = 36.0;
  const suggestedRate = Math.min(
    statutoryMaxRate,
    Math.max(statutoryMinRate, Number((baseRate + rateAdjustment).toFixed(1)))
  );

  // 2. Analyze Current Income Profile & Debt Affordability
  const monthlyIncome = Math.max(100_000, customer.monthlyIncome || 2_500_000);
  const monthlyExpenses = Math.max(0, customer.monthlyExpenses || Math.round(monthlyIncome * 0.4));
  const netDisposable = Math.max(10_000, monthlyIncome - monthlyExpenses);

  // Under UMRA responsible lending rules, proposed installment shouldn't exceed 35% of gross income
  // or 50% of net disposable income.
  const targetMaxDti = 0.35;
  const targetMaxDisposableShare = 0.5;
  const maxSafeInstallment = Math.min(
    monthlyIncome * targetMaxDti,
    netDisposable * targetMaxDisposableShare
  );

  // Search for the optimal duration (term in months) within [minTerm, maxTerm]
  // We want the shortest tenor where the installment is safe (so customer doesn't pay excessive interest),
  // but if income is constrained or risk is high, adjust accordingly.
  let optimalTerm = minTerm;
  let bestFitScore = Infinity;

  // If borrower has cautionary arrears history, avoid tenors longer than 12 months (probationary facility)
  const effectiveMaxTerm =
    creditReputation === 'Cautionary Arrears History' ? Math.min(maxTerm, 6) : maxTerm;

  for (let t = minTerm; t <= effectiveMaxTerm; t++) {
    const installment = estimateInstallment(amount, suggestedRate, t, product.interestMethod);
    const dti = installment / monthlyIncome;

    if (installment <= maxSafeInstallment) {
      // Installment fits comfortably.
      // We balance affordability with not over-extending duration.
      // Preferred DTI corridor is 20% - 30% of gross income.
      const dtiDiff = Math.abs(dti - 0.25);
      if (dtiDiff < bestFitScore) {
        bestFitScore = dtiDiff;
        optimalTerm = t;
      }
    }
  }

  // If even at maximum term the installment is over budget, select effectiveMaxTerm
  if (bestFitScore === Infinity) {
    optimalTerm = effectiveMaxTerm;
  }

  // Ensure term is at least 3 months for larger loans (> UGX 3M) unless product permits shorter
  if (amount >= 3_000_000 && optimalTerm < 3 && maxTerm >= 3) {
    optimalTerm = 3;
  }

  const finalInstallment = estimateInstallment(
    amount,
    suggestedRate,
    optimalTerm,
    product.interestMethod
  );
  const projectedDti = Number(((finalInstallment / monthlyIncome) * 100).toFixed(1));
  const disposableCoverage = Number((netDisposable / Math.max(1, finalInstallment)).toFixed(2));

  // Determine Affordability Status
  let affordabilityStatus: LoanTermSuggestionResult['affordabilityStatus'] = 'Optimal';
  if (projectedDti <= 30 && disposableCoverage >= 1.8) {
    affordabilityStatus = 'Optimal';
    rationales.push({
      title: `Optimal Affordability Corridor (${optimalTerm} Months)`,
      description: `Projected installment of UGX ${finalInstallment.toLocaleString()} represents ${projectedDti}% of monthly income with a ${disposableCoverage}x net disposable buffer.`,
      impact: `${optimalTerm}M Tenor`,
      type: 'positive',
    });
  } else if (projectedDti <= 40 && disposableCoverage >= 1.2) {
    affordabilityStatus = 'Manageable';
    rationales.push({
      title: `Manageable Debt Service Level (${optimalTerm} Months)`,
      description: `Tenor of ${optimalTerm} months maintains debt service within statutory 40% prudential guideline.`,
      impact: `${optimalTerm}M Tenor`,
      type: 'neutral',
    });
  } else {
    affordabilityStatus = 'Caution';
    rationales.push({
      title: `Extended Tenor Due to Income Constraints (${optimalTerm} Months)`,
      description: `Duration extended to ${optimalTerm} months to reduce monthly cash-flow pressure given monthly disposable income of UGX ${netDisposable.toLocaleString()}.`,
      impact: `${optimalTerm}M Tenor`,
      type: 'caution',
    });
  }

  // Calculate estimated interest savings compared to standard base product rate
  const standardInstallment = estimateInstallment(
    amount,
    baseRate,
    optimalTerm,
    product.interestMethod
  );
  const totalStandardPaid = standardInstallment * optimalTerm;
  const totalSuggestedPaid = finalInstallment * optimalTerm;
  const estimatedSavings = Math.max(0, Math.round(totalStandardPaid - totalSuggestedPaid));

  if (estimatedSavings > 0) {
    rationales.push({
      title: 'Customer Interest Benefit',
      description: `The recommended ${rateAdjustment}% rate discount saves the customer an estimated UGX ${estimatedSavings.toLocaleString()} in interest over ${optimalTerm} months.`,
      impact: `Save UGX ${estimatedSavings.toLocaleString()}`,
      type: 'positive',
    });
  }

  return {
    suggestedTermMonths: optimalTerm,
    suggestedAnnualRatePercent: suggestedRate,
    baseProductRatePercent: baseRate,
    rateAdjustmentPercent: Number(rateAdjustment.toFixed(1)),
    estimatedMonthlyInstallmentUGX: finalInstallment,
    projectedDtiPercent: projectedDti,
    affordabilityStatus,
    creditBehaviorSummary: {
      creditRating: rating,
      totalPastLoans,
      settledLoansCount,
      activeDelinquentCount,
      maxHistoricalDpd,
      repaymentReputation: creditReputation,
    },
    incomeProfileSummary: {
      monthlyIncomeUGX: monthlyIncome,
      monthlyExpensesUGX: monthlyExpenses,
      netDisposableUGX: netDisposable,
      disposableCoverageRatio: disposableCoverage,
    },
    rationales,
    estimatedInterestSavingsUGX: estimatedSavings,
  };
}
