import { Loan, RecoveryCase, Customer } from '../types';

export interface UnassignedDelinquentLoanAlert {
  loanId: string;
  loanNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  businessName?: string;
  principalOutstandingUGX: number;
  totalArrearsUGX: number;
  daysPastDue: number;
  riskCategory: 'Substandard (31-60d)' | 'Doubtful (61-90d)' | 'Loss (91+d)';
  statutoryProvisionPercent: number;
  statutoryProvisionUGX: number;
  disbursedAmount: number;
  maturityDate: string;
  hasActiveRecoveryCase: boolean;
  activeCaseId?: string;
}

export interface RiskAlertsSummary {
  totalAlertsCount: number;
  totalUnassignedPrincipalExposureUGX: number;
  totalUnassignedArrearsExposureUGX: number;
  totalRecommendedProvisionUGX: number;
  alerts: UnassignedDelinquentLoanAlert[];
  substandardCount: number;
  doubtfulCount: number;
  lossCount: number;
}

/**
 * Identifies and lists any loans with 30+ days past due that do NOT yet have an active recovery case attached to them.
 * Active recovery case statuses include 'active_followup', 'promise_to_pay', and 'legal_escalation'.
 * Resolved cases are excluded from being considered active.
 */
export function identifyUnassignedDelinquentLoans(
  loans: Loan[],
  recoveryCases: RecoveryCase[] = [],
  customers: Customer[] = [],
  tenantId?: string
): RiskAlertsSummary {
  // Filter for tenant if specified
  const filteredLoans = tenantId ? loans.filter((l) => l.tenantId === tenantId) : loans;
  const filteredCases = tenantId ? recoveryCases.filter((c) => c.tenantId === tenantId) : recoveryCases;

  // Set of loanIds with active (unresolved) recovery cases
  const activeCaseMap = new Map<string, RecoveryCase>();
  filteredCases.forEach((c) => {
    if (c.status !== 'resolved') {
      activeCaseMap.set(c.loanId, c);
    }
  });

  const alerts: UnassignedDelinquentLoanAlert[] = [];

  filteredLoans.forEach((loan) => {
    const dpd = loan.daysPastDue || 0;
    const isOverdue30Plus = dpd >= 30;
    const isDelinquentStatus = loan.status === 'in_arrears' || (loan.status === 'active' && dpd >= 30);
    const hasActiveCase = activeCaseMap.has(loan.id);

    if (isOverdue30Plus && isDelinquentStatus && !hasActiveCase) {
      const cust = customers.find((c) => c.id === loan.customerId);
      const principal = loan.principalOutstanding || 0;

      // Calculate total arrears (installments due and unpaid)
      let totalArrears = 0;
      if (loan.schedule && loan.schedule.length > 0) {
        totalArrears = loan.schedule
          .filter((inst) => inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.dueDate) < new Date()))
          .reduce((sum, inst) => sum + (inst.totalDue - (inst.paidPrincipal + inst.paidInterest + inst.paidFees)), 0);
      }
      if (totalArrears <= 0) {
        totalArrears = Math.round(principal * 0.25); // conservative estimate
      }

      // UMRA Statutory Provisioning brackets
      let riskCategory: UnassignedDelinquentLoanAlert['riskCategory'];
      let statutoryProvisionPercent: number;

      if (dpd <= 60) {
        riskCategory = 'Substandard (31-60d)';
        statutoryProvisionPercent = 20;
      } else if (dpd <= 90) {
        riskCategory = 'Doubtful (61-90d)';
        statutoryProvisionPercent = 50;
      } else {
        riskCategory = 'Loss (91+d)';
        statutoryProvisionPercent = 100;
      }

      const statutoryProvisionUGX = Math.round((principal * statutoryProvisionPercent) / 100);

      alerts.push({
        loanId: loan.id,
        loanNo: loan.loanNo,
        customerId: loan.customerId,
        customerName: cust?.fullName || 'Valued Customer',
        customerPhone: cust?.phone || 'N/A',
        businessName: cust?.businessName,
        principalOutstandingUGX: principal,
        totalArrearsUGX: totalArrears,
        daysPastDue: dpd,
        riskCategory,
        statutoryProvisionPercent,
        statutoryProvisionUGX,
        disbursedAmount: loan.disbursedAmount || 0,
        maturityDate: loan.maturityDate || 'N/A',
        hasActiveRecoveryCase: false,
      });
    }
  });

  // Sort by highest days past due descending (most urgent first)
  alerts.sort((a, b) => b.daysPastDue - a.daysPastDue);

  const totalUnassignedPrincipalExposureUGX = alerts.reduce((sum, a) => sum + a.principalOutstandingUGX, 0);
  const totalUnassignedArrearsExposureUGX = alerts.reduce((sum, a) => sum + a.totalArrearsUGX, 0);
  const totalRecommendedProvisionUGX = alerts.reduce((sum, a) => sum + a.statutoryProvisionUGX, 0);

  const substandardCount = alerts.filter((a) => a.daysPastDue <= 60).length;
  const doubtfulCount = alerts.filter((a) => a.daysPastDue > 60 && a.daysPastDue <= 90).length;
  const lossCount = alerts.filter((a) => a.daysPastDue > 90).length;

  return {
    totalAlertsCount: alerts.length,
    totalUnassignedPrincipalExposureUGX,
    totalUnassignedArrearsExposureUGX,
    totalRecommendedProvisionUGX,
    alerts,
    substandardCount,
    doubtfulCount,
    lossCount,
  };
}
