/**
 * KEROLENDA Financial & Microfinance Math Engine
 * Designed for compliance with Tier 4 Microfinance Institutions & Money Lenders Act (Uganda).
 * Invariants:
 * - Deterministic rounding (rounding residual applied to final instalment)
 * - Allocation waterfall (Penalties -> Fees -> Interest -> Principal)
 * - Balanced double-entry journals (Debits === Credits)
 */

export type InterestMethod = 'flat' | 'reducing_balance';
export type PaymentFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface ScheduleInstallment {
  installmentNo: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  feesDue: number;
  totalDue: number;
  remainingPrincipal: number;
}

export interface ScheduleResult {
  installments: ScheduleInstallment[];
  totalPrincipal: number;
  totalInterest: number;
  totalFees: number;
  totalPayable: number;
  periodicInstalment: number;
  effectiveApr: number;
}

export interface PaymentAllocationResult {
  penaltyPaid: number;
  feePaid: number;
  interestPaid: number;
  principalPaid: number;
  unallocated: number;
  remainingPenalty: number;
  remainingFee: number;
  remainingInterest: number;
  remainingPrincipal: number;
}

/**
 * Format an integer or float into official Ugandan Shilling (UGX) display
 */
export function formatUGX(amount: number): string {
  if (isNaN(amount)) return 'UGX 0';
  const rounded = Math.round(amount);
  return `UGX ${rounded.toLocaleString('en-UG')}`;
}

/**
 * Compact UGX format for dashboards (e.g. UGX 4.5M, UGX 850K)
 */
export function formatCompactUGX(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'UGX 0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}UGX ${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}UGX ${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}UGX ${(abs / 1_000).toFixed(0)}K`;
  }
  return `${sign}UGX ${Math.round(abs)}`;
}

/**
 * Generates exact repayment schedule with deterministic rounding
 */
export function calculateSchedule(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
  frequency: PaymentFrequency = 'monthly',
  method: InterestMethod = 'reducing_balance',
  startDate: string = new Date().toISOString().split('T')[0],
  upfrontFeePercent: number = 2.0 // e.g. 2% loan processing fee
): ScheduleResult {
  if (principal <= 0 || termMonths <= 0) {
    return {
      installments: [],
      totalPrincipal: 0,
      totalInterest: 0,
      totalFees: 0,
      totalPayable: 0,
      periodicInstalment: 0,
      effectiveApr: annualRatePercent,
    };
  }

  // Determine number of periods
  let numPeriods = termMonths;
  let periodDays = 30;
  if (frequency === 'weekly') {
    numPeriods = Math.round(termMonths * 4.333);
    periodDays = 7;
  } else if (frequency === 'fortnightly') {
    numPeriods = Math.round(termMonths * 2.166);
    periodDays = 14;
  }

  const installments: ScheduleInstallment[] = [];
  const baseDate = new Date(startDate);
  const upfrontFees = Math.round(principal * (upfrontFeePercent / 100));

  if (method === 'flat') {
    // Flat rate: Total Interest = P * (r/100) * (termMonths / 12)
    const totalInterest = Math.round(principal * (annualRatePercent / 100) * (termMonths / 12));
    const basePrincipalPerPeriod = Math.floor(principal / numPeriods);
    const baseInterestPerPeriod = Math.floor(totalInterest / numPeriods);

    let runningPrincipalSum = 0;
    let runningInterestSum = 0;
    let balance = principal;

    for (let i = 1; i <= numPeriods; i++) {
      const isLast = i === numPeriods;
      const principalDue = isLast ? principal - runningPrincipalSum : basePrincipalPerPeriod;
      const interestDue = isLast ? totalInterest - runningInterestSum : baseInterestPerPeriod;

      runningPrincipalSum += principalDue;
      runningInterestSum += interestDue;
      balance = Math.max(0, balance - principalDue);

      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + i * periodDays);

      installments.push({
        installmentNo: i,
        dueDate: dueDate.toISOString().split('T')[0],
        principalDue,
        interestDue,
        feesDue: i === 1 ? upfrontFees : 0,
        totalDue: principalDue + interestDue + (i === 1 ? upfrontFees : 0),
        remainingPrincipal: balance,
      });
    }

    return {
      installments,
      totalPrincipal: principal,
      totalInterest,
      totalFees: upfrontFees,
      totalPayable: principal + totalInterest + upfrontFees,
      periodicInstalment: basePrincipalPerPeriod + baseInterestPerPeriod,
      effectiveApr: annualRatePercent * 1.6, // Flat rate has ~1.6x effective reducing rate
    };
  } else {
    // Reducing balance: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    // Periodic rate calculation
    const periodsPerYear = frequency === 'weekly' ? 52 : frequency === 'fortnightly' ? 26 : 12;
    const periodicRate = (annualRatePercent / 100) / periodsPerYear;

    let emi: number;
    if (periodicRate === 0) {
      emi = principal / numPeriods;
    } else {
      emi = (principal * periodicRate * Math.pow(1 + periodicRate, numPeriods)) /
        (Math.pow(1 + periodicRate, numPeriods) - 1);
    }
    const roundedEmi = Math.round(emi);

    let balance = principal;
    let totalInterest = 0;

    for (let i = 1; i <= numPeriods; i++) {
      const isLast = i === numPeriods;
      const interestDue = Math.round(balance * periodicRate);
      let principalDue = isLast ? balance : Math.round(roundedEmi - interestDue);
      if (principalDue > balance || isLast) {
        principalDue = balance;
      }

      totalInterest += interestDue;
      balance = Math.max(0, balance - principalDue);

      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + i * periodDays);

      const feesDue = i === 1 ? upfrontFees : 0;
      installments.push({
        installmentNo: i,
        dueDate: dueDate.toISOString().split('T')[0],
        principalDue,
        interestDue,
        feesDue,
        totalDue: principalDue + interestDue + feesDue,
        remainingPrincipal: balance,
      });
    }

    return {
      installments,
      totalPrincipal: principal,
      totalInterest,
      totalFees: upfrontFees,
      totalPayable: principal + totalInterest + upfrontFees,
      periodicInstalment: roundedEmi,
      effectiveApr: annualRatePercent,
    };
  }
}

/**
 * Waterfall allocation:
 * 1. Penalties
 * 2. Unpaid Fees
 * 3. Accrued Interest
 * 4. Principal
 */
export function allocatePayment(
  paymentAmount: number,
  unpaidPenalties: number,
  unpaidFees: number,
  unpaidInterest: number,
  unpaidPrincipal: number
): PaymentAllocationResult {
  let remainingAmount = Math.max(0, paymentAmount);

  // 1. Penalties
  const penaltyPaid = Math.min(remainingAmount, unpaidPenalties);
  remainingAmount -= penaltyPaid;
  const remainingPenalty = unpaidPenalties - penaltyPaid;

  // 2. Fees
  const feePaid = Math.min(remainingAmount, unpaidFees);
  remainingAmount -= feePaid;
  const remainingFee = unpaidFees - feePaid;

  // 3. Interest
  const interestPaid = Math.min(remainingAmount, unpaidInterest);
  remainingAmount -= interestPaid;
  const remainingInterest = unpaidInterest - interestPaid;

  // 4. Principal
  const principalPaid = Math.min(remainingAmount, unpaidPrincipal);
  remainingAmount -= principalPaid;
  const remainingPrincipal = unpaidPrincipal - principalPaid;

  return {
    penaltyPaid,
    feePaid,
    interestPaid,
    principalPaid,
    unallocated: remainingAmount, // Any overpayment held in unallocated suspense
    remainingPenalty,
    remainingFee,
    remainingInterest,
    remainingPrincipal,
  };
}

/**
 * Calculates Portfolio At Risk > 30 Days (PAR 30)
 * Metric: Sum of outstanding principal balance of all loans with >30 days past due / Total gross portfolio
 */
export function calculatePAR30(loans: Array<{ principalOutstanding: number; daysPastDue: number }>): {
  par30Percent: number;
  par30Principal: number;
  totalPrincipal: number;
} {
  const totalPrincipal = loans.reduce((sum, l) => sum + Math.max(0, l.principalOutstanding), 0);
  if (totalPrincipal === 0) {
    return { par30Percent: 0, par30Principal: 0, totalPrincipal: 0 };
  }

  const par30Principal = loans
    .filter(l => l.daysPastDue > 30 && l.principalOutstanding > 0)
    .reduce((sum, l) => sum + l.principalOutstanding, 0);

  const par30Percent = Number(((par30Principal / totalPrincipal) * 100).toFixed(2));
  return { par30Percent, par30Principal, totalPrincipal };
}

export interface LivePAR30Metrics {
  par30Percent: number;
  par30Principal: number;
  totalGrossPortfolio: number;
  par30LoansCount: number;
  healthyLoansCount: number;
  totalActiveLoans: number;
  totalPaymentsCount: number;
  totalCollectionsAmount: number;
  principalRecoveredFromPayments: number;
  atRiskPaymentsCount: number;
  atRiskRecoveredAmount: number;
  umraCapPercent: number;
  isBreached: boolean;
  varianceFromCap: number;
}

/**
 * Calculates live Portfolio at Risk > 30 Days (PAR 30)
 * dynamically derived from both 'loans' and 'payments' data.
 *
 * Metric: Sum of live outstanding principal on active loans past 30 days overdue
 * divided by total live gross outstanding portfolio, reconciled against posted payment receipts.
 */
export function calculateLivePAR30(
  loans: Array<{
    id: string;
    principalOutstanding: number;
    daysPastDue: number;
    status: string;
    tenantId?: string;
  }>,
  payments: Array<{
    id: string;
    loanId?: string;
    amount: number;
    principalAllocated?: number;
    status: string;
    tenantId?: string;
  }>,
  tenantId?: string
): LivePAR30Metrics {
  const filteredLoans = loans.filter((l) => {
    if (tenantId && l.tenantId && l.tenantId !== tenantId) return false;
    return l.status === 'active' || l.status === 'in_arrears';
  });

  const filteredPayments = payments.filter((p) => {
    if (tenantId && p.tenantId && p.tenantId !== tenantId) return false;
    return p.status === 'posted';
  });

  // Map payments by loanId
  const paymentMap = new Map<string, { totalAmount: number; principalAllocated: number; count: number }>();
  let totalCollectionsAmount = 0;
  let principalRecoveredFromPayments = 0;

  for (const p of filteredPayments) {
    totalCollectionsAmount += p.amount;
    const princ = p.principalAllocated || 0;
    principalRecoveredFromPayments += princ;

    if (p.loanId) {
      const existing = paymentMap.get(p.loanId) || { totalAmount: 0, principalAllocated: 0, count: 0 };
      existing.totalAmount += p.amount;
      existing.principalAllocated += princ;
      existing.count += 1;
      paymentMap.set(p.loanId, existing);
    }
  }

  let totalGrossPortfolio = 0;
  let par30Principal = 0;
  let par30LoansCount = 0;
  let healthyLoansCount = 0;
  let atRiskPaymentsCount = 0;
  let atRiskRecoveredAmount = 0;

  for (const loan of filteredLoans) {
    const outstanding = Math.max(0, loan.principalOutstanding || 0);
    totalGrossPortfolio += outstanding;

    const loanPmts = paymentMap.get(loan.id);

    if (loan.daysPastDue > 30 && outstanding > 0) {
      par30Principal += outstanding;
      par30LoansCount += 1;
      if (loanPmts) {
        atRiskPaymentsCount += loanPmts.count;
        atRiskRecoveredAmount += loanPmts.totalAmount;
      }
    } else if (outstanding > 0) {
      healthyLoansCount += 1;
    }
  }

  const par30Percent = totalGrossPortfolio > 0
    ? Number(((par30Principal / totalGrossPortfolio) * 100).toFixed(2))
    : 0;

  const umraCapPercent = 10;
  const isBreached = par30Percent > umraCapPercent;
  const varianceFromCap = Number((par30Percent - umraCapPercent).toFixed(2));

  return {
    par30Percent,
    par30Principal: Math.round(par30Principal),
    totalGrossPortfolio: Math.round(totalGrossPortfolio),
    par30LoansCount,
    healthyLoansCount,
    totalActiveLoans: filteredLoans.length,
    totalPaymentsCount: filteredPayments.length,
    totalCollectionsAmount: Math.round(totalCollectionsAmount),
    principalRecoveredFromPayments: Math.round(principalRecoveredFromPayments),
    atRiskPaymentsCount,
    atRiskRecoveredAmount: Math.round(atRiskRecoveredAmount),
    umraCapPercent,
    isBreached,
    varianceFromCap,
  };
}

export interface PortfolioYieldMetrics {
  annualYieldPercent: number;
  nominalYieldPercent: number;
  totalInterestIncomeUGX: number;
  averageOutstandingPortfolioUGX: number;
  averagePortfolioUGX: number;
  currentOutstandingPortfolioUGX: number;
  endingOutstandingUGX: number;
  beginningPortfolioUGX: number;
  initialDisbursedUGX: number;
  annualizedInterestIncomeUGX: number;
  monthsElapsedInYear: number;
  annualizationFactor: number;
  totalActiveLoans: number;
  weightedContractRatePercent: number;
  weightedAverageContractRate: number;
  spreadOverContractRate: number;
  spreadOverBenchmarkPercent: number;
  benchmarkTargetPercent: number;
  benchmarkYieldPercent: number;
  isPerformingAboveTarget: boolean;
  benchmarkStatus: 'exceeds' | 'meets' | 'below';
  interestSource: 'general_ledger' | 'journals' | 'loan_payments';
}

/**
 * Calculates actualized annual Portfolio Yield for the current year.
 *
 * Microfinance Standard (CGAP / MIX / UMRA Guideline):
 * Portfolio Yield measures the ability of the loan portfolio to generate cash income.
 * Annualized Yield = (Total Interest Income for Period / Average Outstanding Loan Portfolio) * (12 / Months Elapsed) * 100
 */
export function calculatePortfolioYield(
  loans: Array<{
    id: string;
    principalOutstanding: number;
    principalApproved?: number;
    disbursedAmount?: number;
    disbursedAt?: string;
    status: string;
    tenantId?: string;
    interestRateAnnual?: number;
    totalPaidInterest?: number;
    schedule?: Array<{
      dueDate: string;
      remainingPrincipal: number;
      paidInterest?: number;
    }>;
  }>,
  accounts?: Array<{
    code: string;
    currentBalance: number;
    tenantId?: string;
  }>,
  journals?: Array<{
    effectiveDate: string;
    tenantId?: string;
    lines: Array<{
      accountCode: string;
      debit: number;
      credit: number;
    }>;
  }>,
  payments?: Array<{
    amount: number;
    interestAllocated?: number;
    status: string;
    tenantId?: string;
    postedAt?: string;
  }>,
  tenantId?: string,
  referenceDateStr: string = '2026-10-29',
  benchmarkTargetPercent: number = 24.0
): PortfolioYieldMetrics {
  const refDate = new Date(referenceDateStr);
  const currentYear = isNaN(refDate.getFullYear()) ? 2026 : refDate.getFullYear();
  const rawMonth = isNaN(refDate.getMonth()) ? 9 : refDate.getMonth();
  const monthsElapsedInYear = Math.max(1, Math.min(12, rawMonth + 1));
  const annualizationFactor = Number((12 / monthsElapsedInYear).toFixed(4));

  // Filter loans for tenant
  const tenantLoans = loans.filter((l) => {
    if (tenantId && l.tenantId && l.tenantId !== tenantId) return false;
    return l.status === 'active' || l.status === 'in_arrears' || l.status === 'settled';
  });

  const activeLoans = tenantLoans.filter((l) => l.status === 'active' || l.status === 'in_arrears');

  // Current live outstanding gross portfolio
  const currentOutstandingPortfolioUGX = activeLoans.reduce(
    (sum, l) => sum + Math.max(0, l.principalOutstanding || 0),
    0
  );

  // 1. Resolve Total Interest Income for Current Year
  // Source A: General Ledger Account 4000 (Authoritative double-entry ledger balance)
  const acc4000 = accounts?.find(
    (a) => (!tenantId || a.tenantId === tenantId) && a.code === '4000'
  );
  const glInterestIncome = acc4000 ? Math.max(0, acc4000.currentBalance) : 0;

  // Source B: Journals in Current Year crediting account 4000
  let journalInterestIncome = 0;
  if (journals && journals.length > 0) {
    for (const j of journals) {
      if (tenantId && j.tenantId && j.tenantId !== tenantId) continue;
      if (j.effectiveDate && j.effectiveDate.startsWith(String(currentYear))) {
        for (const l of j.lines) {
          if (l.accountCode === '4000') {
            journalInterestIncome += (l.credit || 0) - (l.debit || 0);
          }
        }
      }
    }
  }

  // Source C: Payments with interestAllocated in Current Year
  let paymentInterestIncome = 0;
  if (payments && payments.length > 0) {
    for (const p of payments) {
      if (tenantId && p.tenantId && p.tenantId !== tenantId) continue;
      if (p.status !== 'posted') continue;
      if (!p.postedAt || p.postedAt.startsWith(String(currentYear))) {
        paymentInterestIncome += p.interestAllocated || 0;
      }
    }
  }

  // Source D: Total Paid Interest on Loans
  const loanPaidInterest = tenantLoans.reduce(
    (sum, l) => sum + Math.max(0, l.totalPaidInterest || 0),
    0
  );

  // Determine authoritative interest amount and source
  let totalInterestIncomeUGX = 0;
  let interestSource: 'general_ledger' | 'journals' | 'loan_payments' = 'general_ledger';

  if (glInterestIncome > 0) {
    totalInterestIncomeUGX = glInterestIncome;
    interestSource = 'general_ledger';
  } else if (journalInterestIncome > 0) {
    totalInterestIncomeUGX = journalInterestIncome;
    interestSource = 'journals';
  } else if (paymentInterestIncome > 0) {
    totalInterestIncomeUGX = paymentInterestIncome;
    interestSource = 'loan_payments';
  } else if (loanPaidInterest > 0) {
    totalInterestIncomeUGX = loanPaidInterest;
    interestSource = 'loan_payments';
  }

  // 2. Resolve Average Outstanding Loan Portfolio for Current Year
  const initialPrincipalApproved = tenantLoans.reduce(
    (sum, l) => sum + (l.disbursedAmount || l.principalApproved || l.principalOutstanding || 0),
    0
  );

  // Reconstruct monthly portfolio balances across elapsed months (1..M)
  const monthlyBalances: number[] = [];
  for (let m = 1; m <= monthsElapsedInYear; m++) {
    const monthKey = `${currentYear}-${String(m).padStart(2, '0')}`;
    let monthPortfolio = 0;

    for (const l of tenantLoans) {
      if (l.disbursedAt && l.disbursedAt.slice(0, 7) > monthKey) {
        continue;
      }

      if (l.schedule && l.schedule.length > 0) {
        const validInst = l.schedule.filter(
          (inst) => inst.dueDate.slice(0, 7) <= monthKey
        );
        if (validInst.length > 0) {
          const lastInst = validInst[validInst.length - 1];
          monthPortfolio += Math.max(0, lastInst.remainingPrincipal || 0);
        } else {
          monthPortfolio += l.disbursedAmount || l.principalApproved || l.principalOutstanding || 0;
        }
      } else {
        const initial = l.disbursedAmount || l.principalApproved || l.principalOutstanding || 0;
        const current = l.principalOutstanding || 0;
        const fraction = m / monthsElapsedInYear;
        const interpolated = initial - (initial - current) * fraction;
        monthPortfolio += Math.max(0, interpolated);
      }
    }

    monthlyBalances.push(Math.round(monthPortfolio));
  }

  const validMonthlyBalances = monthlyBalances.filter((b) => b > 0);
  let averageOutstandingPortfolioUGX: number;
  let beginningPortfolioUGX: number;

  if (validMonthlyBalances.length > 0) {
    const sumMonthly = validMonthlyBalances.reduce((acc, val) => acc + val, 0);
    averageOutstandingPortfolioUGX = Math.round(sumMonthly / validMonthlyBalances.length);
    beginningPortfolioUGX = validMonthlyBalances[0];
  } else {
    beginningPortfolioUGX = initialPrincipalApproved > 0 ? initialPrincipalApproved : currentOutstandingPortfolioUGX;
    averageOutstandingPortfolioUGX = Math.round((beginningPortfolioUGX + currentOutstandingPortfolioUGX) / 2);
  }

  if (averageOutstandingPortfolioUGX <= 0) {
    averageOutstandingPortfolioUGX = currentOutstandingPortfolioUGX > 0 ? currentOutstandingPortfolioUGX : 1;
  }

  // 3. Compute Yield Percentages
  const nominalYieldPercent = Number(
    ((totalInterestIncomeUGX / averageOutstandingPortfolioUGX) * 100).toFixed(2)
  );

  const annualizedInterestIncomeUGX = Math.round(
    totalInterestIncomeUGX * (12 / monthsElapsedInYear)
  );

  const annualYieldPercent = Number(
    ((annualizedInterestIncomeUGX / averageOutstandingPortfolioUGX) * 100).toFixed(2)
  );

  const totalWeightPrincipal = tenantLoans.reduce(
    (sum, l) => sum + (l.disbursedAmount || l.principalApproved || 1),
    0
  );
  const weightedContractRate =
    totalWeightPrincipal > 0
      ? Number(
          (
            tenantLoans.reduce(
              (sum, l) =>
                sum +
                (l.disbursedAmount || l.principalApproved || 1) *
                  (l.interestRateAnnual || 18.0),
              0
            ) / totalWeightPrincipal
          ).toFixed(2)
        )
      : 18.0;

  const spreadOverContractRate = Number(
    (annualYieldPercent - weightedContractRate).toFixed(2)
  );

  const spreadOverBenchmarkPercent = Number(
    (annualYieldPercent - benchmarkTargetPercent).toFixed(2)
  );

  const benchmarkStatus: 'exceeds' | 'meets' | 'below' =
    annualYieldPercent > benchmarkTargetPercent
      ? 'exceeds'
      : annualYieldPercent === benchmarkTargetPercent
      ? 'meets'
      : 'below';

  const isPerformingAboveTarget = annualYieldPercent >= benchmarkTargetPercent;

  const roundAvgPortfolio = Math.round(averageOutstandingPortfolioUGX);
  const roundCurrentPortfolio = Math.round(currentOutstandingPortfolioUGX);
  const roundBegPortfolio = Math.round(beginningPortfolioUGX);

  return {
    annualYieldPercent,
    nominalYieldPercent,
    totalInterestIncomeUGX: Math.round(totalInterestIncomeUGX),
    averageOutstandingPortfolioUGX: roundAvgPortfolio,
    averagePortfolioUGX: roundAvgPortfolio,
    currentOutstandingPortfolioUGX: roundCurrentPortfolio,
    endingOutstandingUGX: roundCurrentPortfolio,
    beginningPortfolioUGX: roundBegPortfolio,
    initialDisbursedUGX: roundBegPortfolio,
    annualizedInterestIncomeUGX,
    monthsElapsedInYear,
    annualizationFactor,
    totalActiveLoans: activeLoans.length,
    weightedContractRatePercent: weightedContractRate,
    weightedAverageContractRate: weightedContractRate,
    spreadOverContractRate,
    spreadOverBenchmarkPercent,
    benchmarkTargetPercent,
    benchmarkYieldPercent: benchmarkTargetPercent,
    isPerformingAboveTarget,
    benchmarkStatus,
    interestSource,
  };
}

/**
 * Verifies that a double-entry journal is balanced
 */
export function verifyDoubleEntryJournal(lines: Array<{ debit: number; credit: number }>): {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  discrepancy: number;
} {
  const totalDebits = Math.round(lines.reduce((acc, l) => acc + (l.debit || 0), 0));
  const totalCredits = Math.round(lines.reduce((acc, l) => acc + (l.credit || 0), 0));
  const discrepancy = Math.abs(totalDebits - totalCredits);

  return {
    isBalanced: discrepancy === 0,
    totalDebits,
    totalCredits,
    discrepancy,
  };
}

/**
 * Calculate Affordability & Debt Service Ratio (DSR)
 * Uganda guidelines recommend DSR <= 50%
 */
export function assessAffordability(
  monthlyIncome: number,
  monthlyExpenses: number,
  existingDebtObligations: number,
  proposedMonthlyInstalment: number
): {
  dsrPercent: number;
  netDisposableIncome: number;
  isAffordable: boolean;
  recommendedMaxInstalment: number;
  riskRating: 'Low' | 'Medium' | 'High' | 'Severe';
} {
  const netDisposableIncome = monthlyIncome - monthlyExpenses - existingDebtObligations;
  const totalDebtObligations = existingDebtObligations + proposedMonthlyInstalment;
  const dsrPercent = monthlyIncome > 0 ? Number(((totalDebtObligations / monthlyIncome) * 100).toFixed(1)) : 100;

  // Max safe instalment is 50% of income minus existing debt, or 80% of net disposable
  const recommendedMaxInstalment = Math.max(0, Math.round(monthlyIncome * 0.5 - existingDebtObligations));

  let riskRating: 'Low' | 'Medium' | 'High' | 'Severe' = 'Low';
  if (dsrPercent > 65 || netDisposableIncome < proposedMonthlyInstalment) {
    riskRating = 'Severe';
  } else if (dsrPercent > 50) {
    riskRating = 'High';
  } else if (dsrPercent > 35) {
    riskRating = 'Medium';
  }

  return {
    dsrPercent,
    netDisposableIncome,
    isAffordable: dsrPercent <= 50 && netDisposableIncome >= proposedMonthlyInstalment,
    recommendedMaxInstalment,
    riskRating,
  };
}
