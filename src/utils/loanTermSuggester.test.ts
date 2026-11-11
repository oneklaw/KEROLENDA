import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestLoanTerms } from './loanTermSuggester';
import { Customer, LoanProduct, Loan } from '../types';

const mockProduct: LoanProduct = {
  id: 'prod-sme',
  tenantId: 'tenant-1',
  code: 'SME-01',
  name: 'SME Working Capital',
  currency: 'UGX',
  interestMethod: 'flat',
  annualRatePercent: 18.0,
  minPrincipal: 500_000,
  maxPrincipal: 20_000_000,
  minTermMonths: 3,
  maxTermMonths: 24,
  processingFeePercent: 2.5,
  insuranceFeePercent: 1.0,
  penaltyLateDailyPercent: 0.1,
  description: 'SME loan product',
  status: 'active',
};

const primeCustomer: Customer = {
  id: 'cust-prime',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  customerNo: 'CUST-001',
  type: 'individual',
  fullName: 'Grace Nakato',
  phone: '+256772123456',
  occupation: 'Pharmacy Proprietor',
  monthlyIncome: 6_000_000,
  monthlyExpenses: 2_000_000,
  creditScoreRating: 'A',
  kyc: {
    idType: 'NIN',
    idNumberMasked: 'CM90***123',
    verifiedAt: '2026-01-01',
    verificationStatus: 'verified',
    dateOfBirth: '1990-05-12',
    gender: 'Female',
    nextOfKinName: 'Moses Nakato',
    nextOfKinPhone: '+256772999000',
    nextOfKinRelationship: 'Brother',
    residenceTown: 'Kampala',
    residenceDistrict: 'Kampala',
  },
  status: 'active',
  createdAt: '2025-01-01',
};

const historicalSettledLoans: Loan[] = [
  {
    id: 'loan-settled-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    loanNo: 'LN-2025-001',
    applicationId: 'app-1',
    customerId: 'cust-prime',
    productId: 'prod-sme',
    currency: 'UGX',
    principalApproved: 4_000_000,
    interestRateAnnual: 18.0,
    interestMethod: 'flat',
    termMonths: 6,
    disbursedAmount: 4_000_000,
    disbursedAt: '2025-02-01',
    disbursementChannel: 'Stanbic Bank',
    disbursementRef: 'REF-1',
    maturityDate: '2025-08-01',
    totalInterestExpected: 360_000,
    totalFeesCharged: 100_000,
    totalPaidPrincipal: 4_000_000,
    totalPaidInterest: 360_000,
    totalPaidFees: 100_000,
    totalPaidPenalties: 0,
    principalOutstanding: 0,
    interestAccruedOutstanding: 0,
    feesOutstanding: 0,
    penaltiesOutstanding: 0,
    daysPastDue: 0,
    status: 'settled',
    schedule: [],
  },
];

const distressedCustomer: Customer = {
  ...primeCustomer,
  id: 'cust-distressed',
  fullName: 'Paul Mukasa',
  creditScoreRating: 'D',
  monthlyIncome: 1_200_000,
  monthlyExpenses: 800_000,
};

const delinquentLoan: Loan = {
  ...historicalSettledLoans[0],
  id: 'loan-arrears-1',
  customerId: 'cust-distressed',
  status: 'in_arrears',
  daysPastDue: 45,
  principalOutstanding: 2_500_000,
};

test('suggestLoanTerms awards prime rate discount and optimal duration for Grade A customer with settled loans', () => {
  const result = suggestLoanTerms({
    customer: primeCustomer,
    product: mockProduct,
    requestedAmount: 5_000_000,
    historicalLoans: historicalSettledLoans,
  });

  assert.equal(result.creditBehaviorSummary.creditRating, 'A');
  assert.equal(result.creditBehaviorSummary.settledLoansCount, 1);
  assert.equal(result.creditBehaviorSummary.repaymentReputation, 'Prime Repayer (Discount Tier)');
  // Base rate was 18.0%, should receive -2.0% discount -> 16.0%
  assert.equal(result.suggestedAnnualRatePercent, 16.0);
  assert.equal(result.rateAdjustmentPercent, -2.0);
  assert(result.estimatedInterestSavingsUGX > 0);
  assert(result.suggestedTermMonths >= mockProduct.minTermMonths);
  assert(result.suggestedTermMonths <= mockProduct.maxTermMonths);
  assert.equal(result.affordabilityStatus, 'Optimal');
});

test('suggestLoanTerms assigns risk premium and shorter probationary duration for customer with arrears history', () => {
  const result = suggestLoanTerms({
    customer: distressedCustomer,
    product: mockProduct,
    requestedAmount: 2_000_000,
    historicalLoans: [delinquentLoan],
  });

  assert.equal(result.creditBehaviorSummary.creditRating, 'D');
  assert.equal(result.creditBehaviorSummary.activeDelinquentCount, 1);
  assert.equal(result.creditBehaviorSummary.repaymentReputation, 'Cautionary Arrears History');
  // Base rate was 18.0%, should receive +2.0% risk premium -> 20.0%
  assert.equal(result.suggestedAnnualRatePercent, 20.0);
  assert.equal(result.rateAdjustmentPercent, 2.0);
  // Probationary limit caps at 6 months
  assert(result.suggestedTermMonths <= 6);
});

test('suggestLoanTerms handles first-time borrower with baseline standard product rate', () => {
  const firstTimeCustomer: Customer = {
    ...primeCustomer,
    id: 'cust-first-timer',
    creditScoreRating: 'B',
  };

  const result = suggestLoanTerms({
    customer: firstTimeCustomer,
    product: mockProduct,
    requestedAmount: 3_000_000,
    historicalLoans: [],
  });

  assert.equal(result.creditBehaviorSummary.repaymentReputation, 'First-Time Applicant');
  assert.equal(result.suggestedAnnualRatePercent, mockProduct.annualRatePercent);
  assert.equal(result.rateAdjustmentPercent, 0);
  assert(result.rationales.some((r) => r.title.includes('Standard Introductory Pricing')));
});

test('suggestLoanTerms extends duration when requested loan is large relative to monthly income', () => {
  const moderateIncomeCustomer: Customer = {
    ...primeCustomer,
    id: 'cust-mod',
    monthlyIncome: 1_500_000,
    monthlyExpenses: 800_000,
    creditScoreRating: 'B',
  };

  const result = suggestLoanTerms({
    customer: moderateIncomeCustomer,
    product: mockProduct,
    requestedAmount: 6_000_000,
    historicalLoans: [],
  });

  // To keep installment within safe DTI of ~35% of 1.5M (approx <= 525K/mo), term must be extended
  assert(result.suggestedTermMonths >= 12);
  assert(result.projectedDtiPercent <= 45);
});

test('suggestLoanTerms clamps duration and rate within product and statutory limits', () => {
  const restrictiveProduct: LoanProduct = {
    ...mockProduct,
    minTermMonths: 4,
    maxTermMonths: 8,
    annualRatePercent: 35.0,
  };

  const result = suggestLoanTerms({
    customer: distressedCustomer,
    product: restrictiveProduct,
    requestedAmount: 2_000_000,
    historicalLoans: [delinquentLoan],
  });

  assert(result.suggestedTermMonths >= restrictiveProduct.minTermMonths);
  assert(result.suggestedTermMonths <= restrictiveProduct.maxTermMonths);
  // Statutory max is 36.0%
  assert(result.suggestedAnnualRatePercent <= 36.0);
});
