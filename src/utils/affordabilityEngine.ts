import { LoanAffordabilityResult } from '../types';

export interface AffordabilityInput {
  loanAmountUGX: number;
  termMonths: number;
  proposedInstallmentUGX: number;
  monthlyIncomeUGX: number;
  monthlyExpensesUGX: number;
  existingDebtObligationsUGX?: number;
  collateralEstimatedValueUGX: number;
  hasGuarantor1: boolean;
  hasGuarantor2: boolean;
  hasApplicantPhoto: boolean;
  maxDstiRatioPercent?: number; // default 50%
  minDisposableBufferUGX?: number; // default 300,000 UGX
  maxLoanMultiplier?: number; // default 4.0x
  minCollateralCoveragePercent?: number; // default 120%
}

/**
 * Evaluates loan affordability and generates automated scorecard verdict under UMRA guidelines.
 */
export function runAutomatedAffordabilityCheck(input: AffordabilityInput): LoanAffordabilityResult {
  const income = Math.max(1, input.monthlyIncomeUGX);
  const expenses = Math.max(0, input.monthlyExpensesUGX);
  const debt = Math.max(0, input.existingDebtObligationsUGX || 0);
  const installment = Math.max(0, input.proposedInstallmentUGX);
  const loan = Math.max(0, input.loanAmountUGX);
  const collateral = Math.max(0, input.collateralEstimatedValueUGX);

  const netDisposableIncome = Math.max(0, income - expenses);
  const dstiRatio = Math.round(((installment + debt) / income) * 1000) / 10;
  const disposableBuffer = netDisposableIncome - installment - debt;
  const loanMultiplier = Math.round((loan / income) * 10) / 10;
  const collateralCoverage = loan > 0 ? Math.round((collateral / loan) * 1000) / 10 : 0;

  const maxDsti = input.maxDstiRatioPercent ?? 50.0;
  const minBuffer = input.minDisposableBufferUGX ?? 300_000;
  const maxMultiplier = input.maxLoanMultiplier ?? 4.0;
  const minCollateral = input.minCollateralCoveragePercent ?? 120.0;

  const dstiPassed = dstiRatio <= maxDsti;
  const disposableBufferPassed = disposableBuffer >= minBuffer;
  const loanMultiplierPassed = loanMultiplier <= maxMultiplier;
  const collateralPassed = collateralCoverage >= minCollateral;
  const twoGuarantorsProvided = input.hasGuarantor1 && input.hasGuarantor2;
  const photoVerified = input.hasApplicantPhoto;

  const ruleChecks = {
    dstiPassed,
    disposableBufferPassed,
    loanMultiplierPassed,
    collateralPassed,
    twoGuarantorsProvided,
    photoVerified,
  };

  // Determine overall scorecard verdict
  let scorecardVerdict: LoanAffordabilityResult['scorecardVerdict'] = 'APPROVED_AUTOMATED';

  const criticalFails = [!dstiPassed, !disposableBufferPassed, !twoGuarantorsProvided, !photoVerified].filter(Boolean).length;
  const secondaryFails = [!loanMultiplierPassed, !collateralPassed].filter(Boolean).length;

  if (criticalFails >= 2 || disposableBuffer < 0 || dstiRatio > 70) {
    scorecardVerdict = 'DECLINED_AFFORDABILITY';
  } else if (criticalFails > 0 || secondaryFails > 0) {
    scorecardVerdict = 'BORDERLINE_COMMITTEE';
  } else {
    scorecardVerdict = 'APPROVED_AUTOMATED';
  }

  // Recommended safe loan ceiling based on 45% DSTI cap
  const maxAffordableMonthlyInstallment = Math.max(0, income * 0.45 - debt);
  const recommendedLimitUGX = Math.round(maxAffordableMonthlyInstallment * input.termMonths * 0.9);

  return {
    monthlyIncomeUGX: income,
    monthlyExpensesUGX: expenses,
    netDisposableIncomeUGX: netDisposableIncome,
    proposedInstallmentUGX: installment,
    dstiRatioPercent: dstiRatio,
    disposableBufferUGX: disposableBuffer,
    loanToIncomeMultiplier: loanMultiplier,
    collateralCoverageRatioPercent: collateralCoverage,
    ruleChecks,
    scorecardVerdict,
    recommendedLimitUGX,
  };
}

/**
 * Determines statutory and policy approval routing tier based on requested loan amount.
 */
export function determineApprovalRoutingTier(
  amountUGX: number
): 'tier1_officer' | 'tier2_manager' | 'tier3_committee' {
  if (amountUGX <= 2_000_000) {
    return 'tier1_officer'; // Fast-track Loan Officer / Credit Officer
  }
  if (amountUGX <= 10_000_000) {
    return 'tier2_manager'; // Branch Manager authorization
  }
  return 'tier3_committee'; // Credit Committee & Company Admin joint signoff
}
