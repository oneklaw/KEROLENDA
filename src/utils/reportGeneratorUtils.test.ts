import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildCustomerStatement,
  buildDailyCashierAudit,
} from './reportGeneratorUtils';
import { Customer, Loan, PaymentReceipt, ExpenseItem } from '../types';

describe('reportGeneratorUtils test suite', () => {
  const mockCustomer: Customer = {
    id: 'cust-1',
    tenantId: 'tenant-victoria',
    branchId: 'branch-kla-main',
    customerNo: 'CUST-001',
    type: 'individual',
    fullName: 'Musa Byaruhanga',
    phone: '+256 772 111 222',
    email: 'musa@example.com',
    businessName: 'Hardware Merchant',
    occupation: 'Merchant',
    monthlyIncome: 6_000_000,
    monthlyExpenses: 2_000_000,
    creditScoreRating: 'B',
    kyc: {
      idType: 'NIN',
      idNumberMasked: 'CM84029482718K',
      verifiedAt: '2026-01-01T00:00:00Z',
      verificationStatus: 'verified',
      dateOfBirth: '1984-05-18',
      gender: 'Male',
      nextOfKinName: 'Jane Byaruhanga',
      nextOfKinPhone: '+256 772 333 444',
      nextOfKinRelationship: 'Spouse',
      residenceTown: 'Katwe',
      residenceDistrict: 'Kampala',
    },
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const mockLoans: Loan[] = [
    {
      id: 'loan-1',
      tenantId: 'tenant-victoria',
      branchId: 'branch-kla-main',
      loanNo: 'LN-2026-0001',
      applicationId: 'app-1',
      customerId: 'cust-1',
      productId: 'prod-sme',
      currency: 'UGX',
      principalApproved: 10_000_000,
      interestRateAnnual: 18.0,
      interestMethod: 'reducing_balance',
      termMonths: 12,
      disbursedAmount: 9_800_000,
      disbursedAt: '2026-01-15T10:00:00Z',
      disbursementChannel: 'Cash Till',
      disbursementRef: 'DISB-001',
      maturityDate: '2027-01-15',
      totalInterestExpected: 1_000_000,
      totalFeesCharged: 200_000,
      totalPaidPrincipal: 4_000_000,
      totalPaidInterest: 600_000,
      totalPaidFees: 200_000,
      totalPaidPenalties: 0,
      principalOutstanding: 6_000_000,
      interestAccruedOutstanding: 50_000,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: [],
    },
  ];

  const mockPayments: PaymentReceipt[] = [
    {
      id: 'pay-1',
      tenantId: 'tenant-victoria',
      branchId: 'branch-kla-main',
      receiptNo: 'RCT-2026-001',
      customerId: 'cust-1',
      loanId: 'loan-1',
      amount: 1_200_000,
      currency: 'UGX',
      channel: 'Cash Till',
      externalReference: 'CASH-REC-1',
      idempotencyKey: 'idemp-1',
      principalAllocated: 1_000_000,
      interestAllocated: 200_000,
      feeAllocated: 0,
      penaltyAllocated: 0,
      unallocatedSuspense: 0,
      receivedByUserId: 'user-teller',
      postedAt: '2026-02-15T12:00:00Z',
      status: 'posted',
    },
    {
      id: 'pay-2',
      tenantId: 'tenant-victoria',
      branchId: 'branch-kla-main',
      receiptNo: 'RCT-2026-002',
      customerId: 'cust-1',
      loanId: 'loan-1',
      amount: 1_200_000,
      currency: 'UGX',
      channel: 'MTN Mobile Money',
      externalReference: 'MM-998811',
      idempotencyKey: 'idemp-2',
      principalAllocated: 1_000_000,
      interestAllocated: 200_000,
      feeAllocated: 0,
      penaltyAllocated: 0,
      unallocatedSuspense: 0,
      receivedByUserId: 'user-teller',
      postedAt: '2026-03-15T14:00:00Z',
      status: 'posted',
    },
  ];

  it('buildCustomerStatement aggregates disbursements, repayments, and running balances accurately', () => {
    const statement = buildCustomerStatement('cust-1', mockLoans, mockPayments);

    assert.strictEqual(statement.totalBorrowedUGX, 10_000_000);
    assert.strictEqual(statement.currentLoanBalanceUGX, 6_000_000);
    assert.strictEqual(statement.activeLoanCount, 1);
    assert.strictEqual(statement.entries.length, 3); // 1 disbursement + 2 repayments

    // First entry is disbursement
    assert.strictEqual(statement.entries[0].type, 'DISBURSEMENT');
    assert.strictEqual(statement.entries[0].debitUGX, 10_000_000);
    assert.strictEqual(statement.entries[0].runningBalanceUGX, 10_000_000);

    // Second entry is repayment of 1.2M
    assert.strictEqual(statement.entries[1].type, 'REPAYMENT');
    assert.strictEqual(statement.entries[1].creditUGX, 1_200_000);
    assert.strictEqual(statement.entries[1].runningBalanceUGX, 8_800_000);
  });

  it('buildDailyCashierAudit calculates cash vs digital totals and expected till reconciliation', () => {
    const mockExpenses: ExpenseItem[] = [
      {
        id: 'exp-1',
        tenantId: 'tenant-victoria',
        branchId: 'branch-kla-main',
        expenseNo: 'EXP-001',
        category: 'Office Supplies & Print',
        vendor: 'Mukwano Stationers',
        amount: 150_000,
        currency: 'UGX',
        channel: 'Petty Cash',
        referenceNo: 'PCV-01',
        expenseDate: '2026-02-15',
        approvedByUserId: 'user-manager',
        notes: 'Printer paper & toners',
        hasReceiptAttachment: true,
        budgetCategoryKey: 'office',
      },
    ];

    // For date 2026-02-15
    const audit = buildDailyCashierAudit(
      '2026-02-15',
      'branch-kla-main',
      mockPayments,
      mockLoans,
      mockExpenses,
      1_000_000 // Opening float
    );

    assert.strictEqual(audit.openingCashFloatUGX, 1_000_000);
    assert.strictEqual(audit.cashLoanRepaymentsUGX, 1_200_000); // RCT-2026-001 was Cash Till on 2026-02-15
    assert.strictEqual(audit.totalCashInflowsUGX, 1_200_000);
    assert.strictEqual(audit.pettyCashExpensesUGX, 150_000);
    assert.strictEqual(audit.totalCashOutflowsUGX, 150_000);

    // Expected closing cash = Opening (1M) + Cash in (1.2M) - Petty Cash (150K) = 2,050,000
    assert.strictEqual(audit.expectedClosingCashUGX, 2_050_000);
  });
});
