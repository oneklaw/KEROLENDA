import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runAutomatedAffordabilityCheck,
  determineApprovalRoutingTier,
} from './affordabilityEngine';

test('runAutomatedAffordabilityCheck approves clean applicant meeting all DSTI and collateral rules', () => {
  const result = runAutomatedAffordabilityCheck({
    loanAmountUGX: 5_000_000,
    termMonths: 6,
    proposedInstallmentUGX: 950_000,
    monthlyIncomeUGX: 4_000_000,
    monthlyExpensesUGX: 1_800_000,
    existingDebtObligationsUGX: 0,
    collateralEstimatedValueUGX: 8_000_000,
    hasGuarantor1: true,
    hasGuarantor2: true,
    hasApplicantPhoto: true,
  });

  assert.equal(result.scorecardVerdict, 'APPROVED_AUTOMATED');
  assert.equal(result.ruleChecks.dstiPassed, true);
  assert.equal(result.ruleChecks.disposableBufferPassed, true);
  assert.equal(result.ruleChecks.twoGuarantorsProvided, true);
  assert.equal(result.ruleChecks.photoVerified, true);
  assert.ok(result.recommendedLimitUGX > 0);
});

test('runAutomatedAffordabilityCheck flags borderline when missing second guarantor', () => {
  const result = runAutomatedAffordabilityCheck({
    loanAmountUGX: 3_000_000,
    termMonths: 6,
    proposedInstallmentUGX: 550_000,
    monthlyIncomeUGX: 3_000_000,
    monthlyExpensesUGX: 1_000_000,
    existingDebtObligationsUGX: 0,
    collateralEstimatedValueUGX: 5_000_000,
    hasGuarantor1: true,
    hasGuarantor2: false, // Missing second guarantor
    hasApplicantPhoto: true,
  });

  assert.equal(result.scorecardVerdict, 'BORDERLINE_COMMITTEE');
  assert.equal(result.ruleChecks.twoGuarantorsProvided, false);
});

test('runAutomatedAffordabilityCheck declines when DSTI exceeds safe limits and disposable buffer is negative', () => {
  const result = runAutomatedAffordabilityCheck({
    loanAmountUGX: 15_000_000,
    termMonths: 6,
    proposedInstallmentUGX: 3_200_000,
    monthlyIncomeUGX: 3_500_000,
    monthlyExpensesUGX: 2_000_000,
    existingDebtObligationsUGX: 500_000,
    collateralEstimatedValueUGX: 4_000_000,
    hasGuarantor1: true,
    hasGuarantor2: true,
    hasApplicantPhoto: true,
  });

  assert.equal(result.scorecardVerdict, 'DECLINED_AFFORDABILITY');
  assert.equal(result.ruleChecks.dstiPassed, false);
  assert.equal(result.ruleChecks.disposableBufferPassed, false);
});

test('determineApprovalRoutingTier accurately classifies by loan threshold', () => {
  assert.equal(determineApprovalRoutingTier(1_500_000), 'tier1_officer');
  assert.equal(determineApprovalRoutingTier(2_000_000), 'tier1_officer');
  assert.equal(determineApprovalRoutingTier(5_000_000), 'tier2_manager');
  assert.equal(determineApprovalRoutingTier(10_000_000), 'tier2_manager');
  assert.equal(determineApprovalRoutingTier(25_000_000), 'tier3_committee');
});
