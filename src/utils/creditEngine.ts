import { CreditReview, CreditRiskAssessment } from '../types';

/**
 * Pure creditworthiness calculation engine for the shared cross-company credit bureau.
 * Evaluates verified lender reviews, settled facilities, delayed payments, and contractual defaults.
 */
export function calculateCreditRisk(
  borrowerNin: string,
  reviews: CreditReview[]
): CreditRiskAssessment {
  const borrowerReviews = reviews.filter(
    (r) => r.borrowerNin.replace(/\s+/g, '').toUpperCase() === borrowerNin.replace(/\s+/g, '').toUpperCase()
  );

  if (borrowerReviews.length === 0) {
    return {
      score: 500,
      category: 'Insufficient',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      repaymentConsistencyPercent: 0,
      totalKnownActiveObligationsUGX: 0,
      totalSettledLoansCount: 0,
      activeDefaultCount: 0,
      estimatedDefaultProbabilityPercent: 25.0,
      recommendation: 'New borrower with no cross-company credit records. Standard Tier 4 onboarding with guarantor and collateral requirements recommended.',
    };
  }

  // Aggregate metrics
  let totalConsistencySum = 0;
  let totalObligations = 0;
  let settledCount = 0;
  let activeDefaultCount = 0;
  let delayedPaymentsSum = 0;

  for (const review of borrowerReviews) {
    totalConsistencySum += review.paymentConsistencyScore;
    totalObligations += review.outstandingBalanceUGX;
    delayedPaymentsSum += review.delayedPaymentsCount;

    if (review.repaymentStatus === 'fully_settled') {
      settledCount++;
    }
    if (review.repaymentStatus === 'contractual_default' || review.defaultHistoryVerified) {
      activeDefaultCount++;
    }
  }

  const averageConsistency = Math.round(totalConsistencySum / borrowerReviews.length);

  // Base score 550, adjusts upwards with high consistency and settled loans, penalizes defaults and delays
  let computedScore = 550;
  computedScore += (averageConsistency - 70) * 2.5; // +- up to 75 pts
  computedScore += settledCount * 35;              // Up to +140 for 4 settled loans
  computedScore -= delayedPaymentsSum * 15;        // -15 per delayed payment
  computedScore -= activeDefaultCount * 160;       // -160 per verified default

  // Clamp score between 300 and 850
  computedScore = Math.max(300, Math.min(850, Math.round(computedScore)));

  // Determine risk category & recommendations
  let category: CreditRiskAssessment['category'];
  let badgeColor: string;
  let defaultProb: number;
  let recommendation: string;

  if (activeDefaultCount > 0 || computedScore < 560) {
    category = 'High Risk';
    badgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
    defaultProb = Math.min(85, 45 + activeDefaultCount * 15);
    recommendation = `High contractual default risk detected (${activeDefaultCount} verified default records across participating lenders). Unsecured credit NOT recommended. Mandatory liquid security or chattel required.`;
  } else if (computedScore < 640) {
    category = 'Moderate';
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
    defaultProb = 18.5;
    recommendation = 'Moderate risk profile with occasional repayment delays. Lower loan ticket size and bi-weekly collections schedule recommended.';
  } else if (computedScore < 740) {
    category = 'Good';
    badgeColor = 'bg-blue-50 text-blue-800 border-blue-300';
    defaultProb = 6.2;
    recommendation = 'Reliable borrower with proven track record of timely repayment across lenders. Eligible for standard money lending limits.';
  } else {
    category = 'Excellent';
    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    defaultProb = 1.4;
    recommendation = 'Prime microfinance borrower with immaculate payment consistency. Eligible for preferential interest rate schedule and expedited disbursement.';
  }

  return {
    score: computedScore,
    category,
    badgeColor,
    repaymentConsistencyPercent: averageConsistency,
    totalKnownActiveObligationsUGX: totalObligations,
    totalSettledLoansCount: settledCount,
    activeDefaultCount,
    estimatedDefaultProbabilityPercent: defaultProb,
    recommendation,
  };
}
