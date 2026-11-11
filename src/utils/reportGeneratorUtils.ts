import {
  Customer,
  Loan,
  PaymentReceipt,
  SavingsAccount,
  SavingsTransaction,
  ExpenseItem,
  AppUser,
} from '../types';

export interface CustomerStatementEntry {
  id: string;
  date: string;
  refNo: string;
  facility: string;
  type: 'DISBURSEMENT' | 'REPAYMENT' | 'SAVINGS_DEPOSIT' | 'SAVINGS_WITHDRAWAL' | 'FEE_CHARGE';
  description: string;
  channel: string;
  debitUGX: number; // Increases borrower obligation or decreases savings
  creditUGX: number; // Decreases borrower obligation or increases savings
  runningBalanceUGX: number;
}

export interface CustomerStatementSummary {
  totalBorrowedUGX: number;
  totalRepaidPrincipalUGX: number;
  totalRepaidInterestUGX: number;
  totalRepaidFeesUGX: number;
  currentLoanBalanceUGX: number;
  totalSavingsBalanceUGX: number;
  totalShareCapitalUGX: number;
  activeLoanCount: number;
  settledLoanCount: number;
  entries: CustomerStatementEntry[];
}

export interface DailyCashierAuditSummary {
  reportDate: string;
  branchId: string;
  openingCashFloatUGX: number;
  
  // Inflows
  cashLoanRepaymentsUGX: number;
  cashSavingsDepositsUGX: number;
  cashFeesCollectedUGX: number;
  totalCashInflowsUGX: number;

  // Electronic / Digital
  momoRepaymentsUGX: number;
  airtelRepaymentsUGX: number;
  bankTransferRepaymentsUGX: number;
  totalElectronicInflowsUGX: number;

  // Outflows
  cashDisbursementsUGX: number;
  cashSavingsWithdrawalsUGX: number;
  pettyCashExpensesUGX: number;
  totalCashOutflowsUGX: number;

  // Reconciliation
  expectedClosingCashUGX: number;
  totalReceiptsCount: number;
  totalDisbursementsCount: number;
  totalExpenseVouchersCount: number;
  receipts: PaymentReceipt[];
}

/**
 * Builds a unified chronological financial ledger for a customer across all facilities and savings.
 */
export function buildCustomerStatement(
  customerId: string,
  loans: Loan[],
  payments: PaymentReceipt[],
  savingsAccounts: SavingsAccount[] = [],
  savingsTransactions: SavingsTransaction[] = [],
  startDate?: string,
  endDate?: string
): CustomerStatementSummary {
  const customerLoans = loans.filter((l) => l.customerId === customerId);
  const customerPayments = payments.filter((p) => p.customerId === customerId);
  const customerSavings = savingsAccounts.filter((s) => s.customerId === customerId);
  const customerSavingsIds = customerSavings.map((s) => s.id);
  const customerSavingsTxs = savingsTransactions.filter((tx) =>
    customerSavingsIds.includes(tx.accountId)
  );

  const accountMap = new Map<string, string>();
  for (const acc of customerSavings) {
    accountMap.set(acc.id, acc.accountNo);
  }

  const rawEntries: Omit<CustomerStatementEntry, 'runningBalanceUGX'>[] = [];

  // Add loan disbursements
  for (const loan of customerLoans) {
    rawEntries.push({
      id: `disb-${loan.id}`,
      date: loan.disbursedAt || '2026-01-01',
      refNo: loan.disbursementRef || loan.loanNo,
      facility: `Loan: ${loan.loanNo}`,
      type: 'DISBURSEMENT',
      description: `Loan Disbursement approved (${loan.termMonths} mos @ ${loan.interestRateAnnual}% p.a.)`,
      channel: loan.disbursementChannel,
      debitUGX: loan.principalApproved,
      creditUGX: 0,
    });
  }

  // Add repayments
  for (const p of customerPayments) {
    if (p.status !== 'reversed') {
      rawEntries.push({
        id: `pay-${p.id}`,
        date: p.postedAt.split('T')[0],
        refNo: p.receiptNo,
        facility: p.loanId ? `Loan Payment` : 'Direct Payment',
        type: 'REPAYMENT',
        description: `Instalment Repayment (Principal: UGX ${p.principalAllocated.toLocaleString()}, Interest: UGX ${p.interestAllocated.toLocaleString()})`,
        channel: p.channel,
        debitUGX: 0,
        creditUGX: p.amount,
      });
    }
  }

  // Add savings transactions
  for (const tx of customerSavingsTxs) {
    const isDeposit = tx.type === 'deposit';
    const accNo = accountMap.get(tx.accountId) || 'VSLA-DEP';
    rawEntries.push({
      id: `sav-${tx.id}`,
      date: tx.postedAt.split('T')[0],
      refNo: tx.reference || tx.id,
      facility: `Savings: ${accNo}`,
      type: isDeposit ? 'SAVINGS_DEPOSIT' : 'SAVINGS_WITHDRAWAL',
      description: isDeposit ? 'Voluntary Savings Deposit' : 'Savings Withdrawal Float',
      channel: tx.channel || 'Cash Till',
      debitUGX: isDeposit ? 0 : tx.amount,
      creditUGX: isDeposit ? tx.amount : 0,
    });
  }

  // Sort chronologically ascending
  rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter date range if provided
  const filteredEntries = rawEntries.filter((entry) => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });

  // Calculate cumulative net loan balance running balance
  let runningLoanObligation = 0;
  const entries: CustomerStatementEntry[] = filteredEntries.map((e) => {
    if (e.type === 'DISBURSEMENT') {
      runningLoanObligation += e.debitUGX;
    } else if (e.type === 'REPAYMENT') {
      runningLoanObligation = Math.max(0, runningLoanObligation - e.creditUGX);
    }
    return {
      ...e,
      runningBalanceUGX: runningLoanObligation,
    };
  });

  // Calculate high-level summary
  const totalBorrowedUGX = customerLoans.reduce((sum, l) => sum + l.principalApproved, 0);
  const totalRepaidPrincipalUGX = customerLoans.reduce((sum, l) => sum + (l.totalPaidPrincipal || 0), 0);
  const totalRepaidInterestUGX = customerLoans.reduce((sum, l) => sum + (l.totalPaidInterest || 0), 0);
  const totalRepaidFeesUGX = customerLoans.reduce((sum, l) => sum + (l.totalPaidFees || 0), 0);
  const currentLoanBalanceUGX = customerLoans
    .filter((l) => l.status === 'active' || l.status === 'in_arrears')
    .reduce((sum, l) => sum + (l.principalOutstanding || 0), 0);

  const totalSavingsBalanceUGX = customerSavings.reduce((sum, s) => sum + (s.currentBalance || 0), 0);
  const activeLoanCount = customerLoans.filter((l) => l.status === 'active' || l.status === 'in_arrears').length;
  const settledLoanCount = customerLoans.filter((l) => l.status === 'settled').length;

  return {
    totalBorrowedUGX,
    totalRepaidPrincipalUGX,
    totalRepaidInterestUGX,
    totalRepaidFeesUGX,
    currentLoanBalanceUGX,
    totalSavingsBalanceUGX,
    totalShareCapitalUGX: 0,
    activeLoanCount,
    settledLoanCount,
    entries,
  };
}

/**
 * Builds the daily cashier end-of-day reconciliation and audit report.
 */
export function buildDailyCashierAudit(
  date: string,
  branchId: string,
  payments: PaymentReceipt[],
  loans: Loan[],
  expenses: ExpenseItem[] = [],
  openingFloatUGX: number = 2_000_000
): DailyCashierAuditSummary {
  // Filter payments on that date for this branch
  const dayPayments = payments.filter((p) => {
    const pDate = p.postedAt.split('T')[0];
    const matchesDate = !date || pDate === date;
    const matchesBranch = !branchId || p.branchId === branchId;
    return matchesDate && matchesBranch && p.status !== 'reversed';
  });

  // Calculate inflows by channel
  let cashLoanRepaymentsUGX = 0;
  let cashSavingsDepositsUGX = 0;
  let cashFeesCollectedUGX = 0;
  let momoRepaymentsUGX = 0;
  let airtelRepaymentsUGX = 0;
  let bankTransferRepaymentsUGX = 0;

  for (const p of dayPayments) {
    if (p.channel === 'Cash Till') {
      cashLoanRepaymentsUGX += p.amount;
      cashFeesCollectedUGX += p.feeAllocated || 0;
    } else if (p.channel === 'MTN Mobile Money') {
      momoRepaymentsUGX += p.amount;
    } else if (p.channel === 'Airtel Money') {
      airtelRepaymentsUGX += p.amount;
    } else if (p.channel === 'Bank Transfer') {
      bankTransferRepaymentsUGX += p.amount;
    }
  }

  const totalCashInflowsUGX = cashLoanRepaymentsUGX + cashSavingsDepositsUGX;
  const totalElectronicInflowsUGX = momoRepaymentsUGX + airtelRepaymentsUGX + bankTransferRepaymentsUGX;

  // Calculate cash disbursements for that date and branch
  const dayCashLoans = loans.filter((l) => {
    const lDate = l.disbursedAt ? l.disbursedAt.split('T')[0] : '';
    return lDate === date && (!branchId || l.branchId === branchId) && l.disbursementChannel === 'Cash Till';
  });
  const cashDisbursementsUGX = dayCashLoans.reduce((sum, l) => sum + (l.disbursedAmount || l.principalApproved), 0);

  // Calculate petty cash expenses for that date and branch
  const dayPettyCashExpenses = expenses.filter((e) => {
    return (
      e.expenseDate === date &&
      (!branchId || e.branchId === branchId) &&
      e.channel === 'Petty Cash'
    );
  });
  const pettyCashExpensesUGX = dayPettyCashExpenses.reduce((sum, e) => sum + e.amount, 0);

  const cashSavingsWithdrawalsUGX = 0;
  const totalCashOutflowsUGX = cashDisbursementsUGX + cashSavingsWithdrawalsUGX + pettyCashExpensesUGX;
  const expectedClosingCashUGX = openingFloatUGX + totalCashInflowsUGX - totalCashOutflowsUGX;

  return {
    reportDate: date,
    branchId,
    openingCashFloatUGX: openingFloatUGX,
    cashLoanRepaymentsUGX,
    cashSavingsDepositsUGX,
    cashFeesCollectedUGX,
    totalCashInflowsUGX,
    momoRepaymentsUGX,
    airtelRepaymentsUGX,
    bankTransferRepaymentsUGX,
    totalElectronicInflowsUGX,
    cashDisbursementsUGX,
    cashSavingsWithdrawalsUGX,
    pettyCashExpensesUGX,
    totalCashOutflowsUGX,
    expectedClosingCashUGX,
    totalReceiptsCount: dayPayments.length,
    totalDisbursementsCount: dayCashLoans.length,
    totalExpenseVouchersCount: dayPettyCashExpenses.length,
    receipts: dayPayments,
  };
}
