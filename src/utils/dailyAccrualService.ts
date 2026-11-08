import { Loan, Customer } from '../types';

export interface DailyInterestAccrualEntry {
  id: string;
  accrualDate: string;
  loanId: string;
  loanNo: string;
  customerId: string;
  borrowerName: string;
  borrowerPhone: string;
  principalOutstandingUGX: number;
  interestRateAnnual: number;
  dailyRatePercent: number; // e.g. 18 / 365 = 0.049315%
  dailyAccruedInterestUGX: number;
  monthlyRunRateUGX: number;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  recognitionStatus: 'recognized' | 'posted';
  interestMethod: 'reducing_balance' | 'flat';
  isPastDue: boolean;
  daysPastDue: number;
}

export interface DailyAccrualSummary {
  accrualDate: string;
  totalActiveLoans: number;
  totalEarningPrincipalUGX: number;
  totalDailyAccruedInterestUGX: number;
  projectedMonthlyAccrualUGX: number;
  projectedAnnualAccrualUGX: number;
  entries: DailyInterestAccrualEntry[];
}

/**
 * Calculates daily interest accrual entries for all active loans on a specified date.
 * Accrual convention: Actual / 365 days.
 * Double entry: DR 1310 (Accrued Interest Receivable) / CR 4100 (Interest Income on Loans)
 */
export function generateDailyInterestAccruals(
  loans: Loan[],
  customers: Customer[],
  accrualDate: string = new Date().toISOString().split('T')[0]
): DailyAccrualSummary {
  // Only active loans with positive principal balance
  const activeLoans = loans.filter((l) => (l.status === 'active' || l.status === 'in_arrears') && (l.principalOutstanding || 0) > 0);

  const entries: DailyInterestAccrualEntry[] = activeLoans.map((loan) => {
    const cust = customers.find((c) => c.id === loan.customerId);
    const principal = loan.principalOutstanding || 0;
    const rateAnnual = loan.interestRateAnnual || 18.0;

    // Daily interest rate using 365-day statutory banking standard
    const dailyRateFraction = (rateAnnual / 100) / 365;
    const dailyRatePercent = Number((dailyRateFraction * 100).toFixed(6));
    const dailyAccruedInterestUGX = Math.round(principal * dailyRateFraction);
    const monthlyRunRateUGX = dailyAccruedInterestUGX * 30;

    return {
      id: `accrual-${loan.id}-${accrualDate}`,
      accrualDate,
      loanId: loan.id,
      loanNo: loan.loanNo,
      customerId: loan.customerId,
      borrowerName: cust?.fullName || 'Borrower',
      borrowerPhone: cust?.phone || 'N/A',
      principalOutstandingUGX: principal,
      interestRateAnnual: rateAnnual,
      dailyRatePercent,
      dailyAccruedInterestUGX,
      monthlyRunRateUGX,
      debitAccountCode: '1310',
      debitAccountName: 'Accrued Interest Receivable',
      creditAccountCode: '4100',
      creditAccountName: 'Interest Income on Loans',
      recognitionStatus: 'recognized',
      interestMethod: loan.interestMethod || 'reducing_balance',
      isPastDue: (loan.daysPastDue || 0) > 0,
      daysPastDue: loan.daysPastDue || 0,
    };
  });

  const totalEarningPrincipalUGX = entries.reduce((sum, e) => sum + e.principalOutstandingUGX, 0);
  const totalDailyAccruedInterestUGX = entries.reduce((sum, e) => sum + e.dailyAccruedInterestUGX, 0);
  const projectedMonthlyAccrualUGX = totalDailyAccruedInterestUGX * 30;
  const projectedAnnualAccrualUGX = totalDailyAccruedInterestUGX * 365;

  return {
    accrualDate,
    totalActiveLoans: entries.length,
    totalEarningPrincipalUGX,
    totalDailyAccruedInterestUGX,
    projectedMonthlyAccrualUGX,
    projectedAnnualAccrualUGX,
    entries,
  };
}

/**
 * Exports daily accrual journal entries to RFC 4180 CSV
 */
export function exportDailyAccrualsCSV(summary: DailyAccrualSummary, tenantName: string): string {
  const headers = [
    'Accrual Date',
    'Loan Ref',
    'Borrower Name',
    'Interest Method',
    'Principal Outstanding (UGX)',
    'Annual Rate (%)',
    'Daily Rate (%)',
    'Daily Accrual (UGX)',
    'Monthly Run-Rate (UGX)',
    'Debit Account',
    'Credit Account',
    'Accounting Status',
    'Days Past Due',
  ];

  const rows = summary.entries.map((e) => [
    `"${e.accrualDate}"`,
    `"${e.loanNo}"`,
    `"${e.borrowerName.replace(/"/g, '""')}"`,
    `"${e.interestMethod}"`,
    e.principalOutstandingUGX,
    `${e.interestRateAnnual}%`,
    `${e.dailyRatePercent}%`,
    e.dailyAccruedInterestUGX,
    e.monthlyRunRateUGX,
    `"${e.debitAccountCode} - ${e.debitAccountName}"`,
    `"${e.creditAccountCode} - ${e.creditAccountName}"`,
    `"${e.recognitionStatus.toUpperCase()}"`,
    e.daysPastDue,
  ]);

  const summarySection = [
    [],
    [`"--- Daily Interest Accrual Summary (${summary.accrualDate}): ${tenantName} ---"`],
    [`"Total Earning Principal:"`, `"${summary.totalEarningPrincipalUGX} UGX"`],
    [`"Daily Interest Recognized:"`, `"${summary.totalDailyAccruedInterestUGX} UGX"`],
    [`"Monthly Projected Run-Rate:"`, `"${summary.projectedMonthlyAccrualUGX} UGX"`],
    [`"Active Loan Count:"`, `"${summary.totalActiveLoans}"`],
    [`"Accounting Convention:"`, `"Actual / 365 (DR 1310 / CR 4100)"`],
  ];

  const lines = [headers.join(','), ...rows.map((r) => r.join(',')), ...summarySection.map((s) => s.join(','))];
  return '\uFEFF' + lines.join('\r\n');
}
