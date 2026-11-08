import { Loan, Customer } from '../types';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskLevelInfo {
  key: RiskLevel;
  label: string;
  shortLabel: string;
  subLabel: string;
  dpdRange: string;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  statutoryProvisionPercent: number;
}

export const RISK_LEVELS_CONFIG: Record<RiskLevel, RiskLevelInfo> = {
  low: {
    key: 'low',
    label: 'Low Risk (Performing)',
    shortLabel: 'Low (0d)',
    subLabel: 'Standard Performing Facilities',
    dpdRange: '0 DPD',
    colorHex: '#10b981', // emerald-500
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeText: 'text-emerald-700',
    statutoryProvisionPercent: 1.0, // general portfolio provision
  },
  moderate: {
    key: 'moderate',
    label: 'Moderate Risk (Watchlist)',
    shortLabel: 'Watchlist (1-30d)',
    subLabel: 'Early Stage Arrears (Special Mention)',
    dpdRange: '1 - 30 DPD',
    colorHex: '#f59e0b', // amber-500
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'text-amber-700',
    statutoryProvisionPercent: 5.0,
  },
  high: {
    key: 'high',
    label: 'High Risk (Substandard)',
    shortLabel: 'Substandard (31-60d)',
    subLabel: 'Significant Impairment Risk',
    dpdRange: '31 - 60 DPD',
    colorHex: '#f97316', // orange-500
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
    badgeText: 'text-orange-700',
    statutoryProvisionPercent: 20.0,
  },
  critical: {
    key: 'critical',
    label: 'Critical Risk (Doubtful & Loss)',
    shortLabel: 'Doubtful/Loss (61+d)',
    subLabel: 'Non-Performing Assets (NPA)',
    dpdRange: '61+ DPD',
    colorHex: '#ef4444', // rose-500
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    badgeText: 'text-rose-700',
    statutoryProvisionPercent: 50.0, // to 100%
  },
};

export type IndustrySectorKey =
  | 'trade_commerce'
  | 'agriculture'
  | 'transport'
  | 'manufacturing_crafts'
  | 'services_hospitality'
  | 'salary_payroll'
  | 'other';

export interface SectorDefinition {
  key: IndustrySectorKey;
  name: string;
  shortName: string;
  iconName: string;
  description: string;
  regulatoryThresholdPercent: number; // UMRA recommended max concentration: 35%
}

export const SECTORS_CONFIG: Record<IndustrySectorKey, SectorDefinition> = {
  trade_commerce: {
    key: 'trade_commerce',
    name: 'Trade & Retail Commerce',
    shortName: 'Trade & Retail',
    iconName: 'Store',
    description: 'Wholesale, hardware merchants, market vendors, supermarkets, groceries',
    regulatoryThresholdPercent: 35,
  },
  agriculture: {
    key: 'agriculture',
    name: 'Agriculture & Agribusiness',
    shortName: 'Agriculture',
    iconName: 'Wheat',
    description: 'Crop production, poultry farms, dairy farming, agricultural inputs & harvesting',
    regulatoryThresholdPercent: 35,
  },
  transport: {
    key: 'transport',
    name: 'Transport & Logistics',
    shortName: 'Transport',
    iconName: 'Bike',
    description: 'Commercial boda boda, taxis, logistics fleet, cargo freight operators',
    regulatoryThresholdPercent: 35,
  },
  manufacturing_crafts: {
    key: 'manufacturing_crafts',
    name: 'Manufacturing & Artisan Crafts',
    shortName: 'Manufacturing',
    iconName: 'Hammer',
    description: 'Textile tailoring, metal fabrication, carpentry workshops, food processing',
    regulatoryThresholdPercent: 30,
  },
  services_hospitality: {
    key: 'services_hospitality',
    name: 'Services & Hospitality',
    shortName: 'Services',
    iconName: 'Briefcase',
    description: 'Salons, restaurants, catering services, IT & professional repair shops',
    regulatoryThresholdPercent: 30,
  },
  salary_payroll: {
    key: 'salary_payroll',
    name: 'Salary & Formal Payroll',
    shortName: 'Salary/Payroll',
    iconName: 'UserCheck',
    description: 'Employed professionals, civil servants, teachers, check-off salary advances',
    regulatoryThresholdPercent: 25,
  },
  other: {
    key: 'other',
    name: 'General / Diversified',
    shortName: 'General',
    iconName: 'Boxes',
    description: 'Diversified micro-enterprises and group multi-purpose facilities',
    regulatoryThresholdPercent: 25,
  },
};

export interface HeatmapCell {
  sectorKey: IndustrySectorKey;
  sectorName: string;
  riskLevel: RiskLevel;
  riskLabel: string;
  colorHex: string;
  loanCount: number;
  totalPrincipal: number;
  totalExposure: number; // principal + interest + fees + penalties
  concentrationPercent: number; // percentage of entire active loan portfolio
  sectorSharePercent: number; // percentage of this sector's total outstanding
  intensityScore: number; // 0.0 to 1.0 (relative heat intensity)
  loanIds: string[];
  loanRefs: string[];
}

export interface SectorHeatmapRow {
  sectorKey: IndustrySectorKey;
  sectorName: string;
  shortName: string;
  iconName: string;
  description: string;
  totalLoans: number;
  totalOutstanding: number;
  portfolioSharePercent: number;
  regulatoryLimitExceeded: boolean;
  regulatoryThresholdPercent: number;
  cells: Record<RiskLevel, HeatmapCell>;
  // Recharts-ready fields for stacked bar representation
  lowRiskAmount: number;
  moderateRiskAmount: number;
  highRiskAmount: number;
  criticalRiskAmount: number;
  lowRiskCount: number;
  moderateRiskCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  // Weighted Risk Score (1 = all low, 4 = all critical)
  weightedRiskIndex: number;
}

export interface PortfolioHeatmapSummary {
  totalPortfolioValue: number;
  totalActiveLoans: number;
  rows: SectorHeatmapRow[];
  riskTotals: Record<
    RiskLevel,
    {
      key: RiskLevel;
      label: string;
      colorHex: string;
      count: number;
      amount: number;
      percent: number;
    }
  >;
  topSector: {
    key: IndustrySectorKey;
    name: string;
    amount: number;
    percent: number;
  } | null;
  highRiskExposure: number; // High + Critical amount
  highRiskPercent: number;
  diversificationStatus: 'Optimal (Well Diversified)' | 'Moderate Concentration' | 'High Concentration Warning';
  maxSectorSharePercent: number;
  concentrationWarningCount: number;
}

/**
 * Classifies a loan into a standardized risk level based on Days Past Due (DPD) and status.
 */
export function classifyLoanRiskLevel(loan: Loan): RiskLevel {
  const dpd = Math.max(0, loan.daysPastDue || 0);

  // If settled or written off, status takes precedence
  if (loan.status === 'settled') {
    return 'low';
  }
  if (loan.status === 'written_off') {
    return 'critical';
  }

  if (dpd === 0) {
    return 'low';
  } else if (dpd <= 30) {
    return 'moderate';
  } else if (dpd <= 60) {
    return 'high';
  } else {
    return 'critical';
  }
}

/**
 * Classifies a loan and its associated borrower into an industry sector.
 */
export function classifyLoanSector(loan: Loan, customer?: Customer): IndustrySectorKey {
  const occupation = (customer?.occupation || '').toLowerCase();
  const businessName = (customer?.businessName || '').toLowerCase();
  const productId = (loan.productId || '').toLowerCase();
  const combinedText = `${occupation} ${businessName} ${productId}`;

  // Agriculture checks
  if (
    productId.includes('agri') ||
    combinedText.includes('poultry') ||
    combinedText.includes('crop') ||
    combinedText.includes('farm') ||
    combinedText.includes('dairy') ||
    combinedText.includes('feed') ||
    combinedText.includes('livestock') ||
    combinedText.includes('harvest') ||
    combinedText.includes('coffee') ||
    combinedText.includes('horticulture')
  ) {
    return 'agriculture';
  }

  // Transport checks
  if (
    productId.includes('boda') ||
    combinedText.includes('boda') ||
    combinedText.includes('motorcycle') ||
    combinedText.includes('taxi') ||
    combinedText.includes('matatu') ||
    combinedText.includes('transport') ||
    combinedText.includes('logistics') ||
    combinedText.includes('driver') ||
    combinedText.includes('vehicle') ||
    combinedText.includes('fleet')
  ) {
    return 'transport';
  }

  // Salary / Payroll checks
  if (
    productId.includes('salary') ||
    productId.includes('payroll') ||
    combinedText.includes('salary') ||
    combinedText.includes('teacher') ||
    combinedText.includes('civil servant') ||
    combinedText.includes('payroll') ||
    combinedText.includes('nurse') ||
    combinedText.includes('clerk')
  ) {
    return 'salary_payroll';
  }

  // Manufacturing & Crafts
  if (
    combinedText.includes('tailor') ||
    combinedText.includes('textile') ||
    combinedText.includes('fashion designer') ||
    combinedText.includes('carpenter') ||
    combinedText.includes('carpentry') ||
    combinedText.includes('metalwork') ||
    combinedText.includes('welder') ||
    combinedText.includes('manufactur') ||
    combinedText.includes('bakery') ||
    combinedText.includes('artisan')
  ) {
    return 'manufacturing_crafts';
  }

  // Services & Hospitality
  if (
    combinedText.includes('salon') ||
    combinedText.includes('barber') ||
    combinedText.includes('restaurant') ||
    combinedText.includes('hotel') ||
    combinedText.includes('catering') ||
    combinedText.includes('cafe') ||
    combinedText.includes('laundry') ||
    combinedText.includes('repair') ||
    combinedText.includes('consultant') ||
    combinedText.includes('clinic')
  ) {
    return 'services_hospitality';
  }

  // Trade & Commerce (Retail, Wholesale, Hardware, Market)
  if (
    combinedText.includes('merchant') ||
    combinedText.includes('hardware') ||
    combinedText.includes('market') ||
    combinedText.includes('vendor') ||
    combinedText.includes('shop') ||
    combinedText.includes('store') ||
    combinedText.includes('retail') ||
    combinedText.includes('wholesale') ||
    combinedText.includes('grocery') ||
    combinedText.includes('produce') ||
    combinedText.includes('materials') ||
    combinedText.includes('fruits') ||
    combinedText.includes('kiosk') ||
    combinedText.includes('trade')
  ) {
    return 'trade_commerce';
  }

  // Default fallback for business loans
  if (customer?.type === 'business') {
    return 'trade_commerce';
  }

  return 'other';
}

/**
 * Generates the complete Loan Portfolio Heatmap aggregation matrix.
 */
export function generatePortfolioHeatmap(
  loans: Loan[],
  customers: Customer[],
  options?: {
    filterBranchId?: string;
    includeSettled?: boolean;
  }
): PortfolioHeatmapSummary {
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  // Filter loans to active / portfolio exposure
  const activeLoans = loans.filter((loan) => {
    if (options?.filterBranchId && loan.branchId !== options.filterBranchId) {
      return false;
    }
    if (!options?.includeSettled && (loan.status === 'settled' || loan.status === 'written_off')) {
      return false;
    }
    return true;
  });

  const totalPortfolioValue = activeLoans.reduce((acc, l) => acc + (l.principalOutstanding || 0), 0);
  const totalActiveLoans = activeLoans.length;

  // Initialize matrix by sector and risk level
  const sectorOrder: IndustrySectorKey[] = [
    'trade_commerce',
    'agriculture',
    'transport',
    'manufacturing_crafts',
    'services_hospitality',
    'salary_payroll',
    'other',
  ];

  const riskOrder: RiskLevel[] = ['low', 'moderate', 'high', 'critical'];

  // Temporary aggregation map
  interface TempCell {
    loans: Loan[];
    principal: number;
    exposure: number;
  }

  const matrix: Record<IndustrySectorKey, Record<RiskLevel, TempCell>> = {} as any;

  sectorOrder.forEach((sectorKey) => {
    matrix[sectorKey] = {} as any;
    riskOrder.forEach((riskKey) => {
      matrix[sectorKey][riskKey] = {
        loans: [],
        principal: 0,
        exposure: 0,
      };
    });
  });

  // Populate matrix with active loans
  activeLoans.forEach((loan) => {
    const customer = customerMap.get(loan.customerId);
    const sectorKey = classifyLoanSector(loan, customer);
    const riskLevel = classifyLoanRiskLevel(loan);

    const cell = matrix[sectorKey][riskLevel];
    cell.loans.push(loan);
    cell.principal += loan.principalOutstanding || 0;
    cell.exposure +=
      (loan.principalOutstanding || 0) +
      (loan.interestAccruedOutstanding || 0) +
      (loan.feesOutstanding || 0) +
      (loan.penaltiesOutstanding || 0);
  });

  // Find max cell principal for intensity normalization
  let maxCellPrincipal = 0;
  sectorOrder.forEach((sectorKey) => {
    riskOrder.forEach((riskKey) => {
      if (matrix[sectorKey][riskKey].principal > maxCellPrincipal) {
        maxCellPrincipal = matrix[sectorKey][riskKey].principal;
      }
    });
  });

  // Risk totals
  const riskTotals: Record<
    RiskLevel,
    { key: RiskLevel; label: string; colorHex: string; count: number; amount: number; percent: number }
  > = {
    low: { key: 'low', label: RISK_LEVELS_CONFIG.low.label, colorHex: RISK_LEVELS_CONFIG.low.colorHex, count: 0, amount: 0, percent: 0 },
    moderate: { key: 'moderate', label: RISK_LEVELS_CONFIG.moderate.label, colorHex: RISK_LEVELS_CONFIG.moderate.colorHex, count: 0, amount: 0, percent: 0 },
    high: { key: 'high', label: RISK_LEVELS_CONFIG.high.label, colorHex: RISK_LEVELS_CONFIG.high.colorHex, count: 0, amount: 0, percent: 0 },
    critical: { key: 'critical', label: RISK_LEVELS_CONFIG.critical.label, colorHex: RISK_LEVELS_CONFIG.critical.colorHex, count: 0, amount: 0, percent: 0 },
  };

  let maxSectorSharePercent = 0;
  let concentrationWarningCount = 0;

  // Build sector rows
  const allRows: SectorHeatmapRow[] = sectorOrder.map((sectorKey) => {
    const config = SECTORS_CONFIG[sectorKey];
    let sectorTotalPrincipal = 0;
    let sectorTotalLoans = 0;

    riskOrder.forEach((riskKey) => {
      const cell = matrix[sectorKey][riskKey];
      sectorTotalPrincipal += cell.principal;
      sectorTotalLoans += cell.loans.length;
      riskTotals[riskKey].count += cell.loans.length;
      riskTotals[riskKey].amount += cell.principal;
    });

    const portfolioSharePercent =
      totalPortfolioValue > 0 ? Number(((sectorTotalPrincipal / totalPortfolioValue) * 100).toFixed(1)) : 0;

    if (portfolioSharePercent > maxSectorSharePercent) {
      maxSectorSharePercent = portfolioSharePercent;
    }

    const regulatoryLimitExceeded = portfolioSharePercent > config.regulatoryThresholdPercent;
    if (regulatoryLimitExceeded) {
      concentrationWarningCount++;
    }

    // Build finalized cells for this row
    const rowCells = {} as Record<RiskLevel, HeatmapCell>;
    let weightedRiskSum = 0;

    riskOrder.forEach((riskKey, riskIdx) => {
      const cell = matrix[sectorKey][riskKey];
      const concentrationPercent =
        totalPortfolioValue > 0 ? Number(((cell.principal / totalPortfolioValue) * 100).toFixed(1)) : 0;
      const sectorSharePercent =
        sectorTotalPrincipal > 0 ? Number(((cell.principal / sectorTotalPrincipal) * 100).toFixed(1)) : 0;
      const intensityScore =
        maxCellPrincipal > 0 ? Number((cell.principal / maxCellPrincipal).toFixed(2)) : 0;

      // riskIdx: 0=low (weight 1), 1=moderate (weight 2), 2=high (weight 3), 3=critical (weight 4)
      weightedRiskSum += cell.principal * (riskIdx + 1);

      rowCells[riskKey] = {
        sectorKey,
        sectorName: config.name,
        riskLevel: riskKey,
        riskLabel: RISK_LEVELS_CONFIG[riskKey].label,
        colorHex: RISK_LEVELS_CONFIG[riskKey].colorHex,
        loanCount: cell.loans.length,
        totalPrincipal: cell.principal,
        totalExposure: cell.exposure,
        concentrationPercent,
        sectorSharePercent,
        intensityScore,
        loanIds: cell.loans.map((l) => l.id),
        loanRefs: cell.loans.map((l) => l.loanNo),
      };
    });

    const weightedRiskIndex =
      sectorTotalPrincipal > 0 ? Number((weightedRiskSum / sectorTotalPrincipal).toFixed(2)) : 1.0;

    return {
      sectorKey,
      sectorName: config.name,
      shortName: config.shortName,
      iconName: config.iconName,
      description: config.description,
      totalLoans: sectorTotalLoans,
      totalOutstanding: sectorTotalPrincipal,
      portfolioSharePercent,
      regulatoryLimitExceeded,
      regulatoryThresholdPercent: config.regulatoryThresholdPercent,
      cells: rowCells,
      lowRiskAmount: rowCells.low.totalPrincipal,
      moderateRiskAmount: rowCells.moderate.totalPrincipal,
      highRiskAmount: rowCells.high.totalPrincipal,
      criticalRiskAmount: rowCells.critical.totalPrincipal,
      lowRiskCount: rowCells.low.loanCount,
      moderateRiskCount: rowCells.moderate.loanCount,
      highRiskCount: rowCells.high.loanCount,
      criticalRiskCount: rowCells.critical.loanCount,
      weightedRiskIndex,
    };
  });

  // Calculate risk percentages
  riskOrder.forEach((riskKey) => {
    riskTotals[riskKey].percent =
      totalPortfolioValue > 0
        ? Number(((riskTotals[riskKey].amount / totalPortfolioValue) * 100).toFixed(1))
        : 0;
  });

  // High risk exposure = High + Critical
  const highRiskExposure = riskTotals.high.amount + riskTotals.critical.amount;
  const highRiskPercent =
    totalPortfolioValue > 0 ? Number(((highRiskExposure / totalPortfolioValue) * 100).toFixed(1)) : 0;

  // Filter rows that have loans or display top relevant
  const rows = allRows.filter((r) => r.totalLoans > 0 || r.totalOutstanding > 0);
  // If all are zero, provide default active configuration
  const finalizedRows = rows.length > 0 ? rows : allRows.slice(0, 4);

  // Top sector
  const sortedByExposure = [...finalizedRows].sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  const topSector =
    sortedByExposure.length > 0 && sortedByExposure[0].totalOutstanding > 0
      ? {
          key: sortedByExposure[0].sectorKey,
          name: sortedByExposure[0].sectorName,
          amount: sortedByExposure[0].totalOutstanding,
          percent: sortedByExposure[0].portfolioSharePercent,
        }
      : null;

  // Diversification Assessment
  let diversificationStatus: 'Optimal (Well Diversified)' | 'Moderate Concentration' | 'High Concentration Warning';
  if (maxSectorSharePercent > 45 || concentrationWarningCount > 0) {
    diversificationStatus = 'High Concentration Warning';
  } else if (maxSectorSharePercent > 30) {
    diversificationStatus = 'Moderate Concentration';
  } else {
    diversificationStatus = 'Optimal (Well Diversified)';
  }

  return {
    totalPortfolioValue,
    totalActiveLoans,
    rows: finalizedRows,
    riskTotals,
    topSector,
    highRiskExposure,
    highRiskPercent,
    diversificationStatus,
    maxSectorSharePercent,
    concentrationWarningCount,
  };
}

/**
 * Returns CSS classes for heat intensity of a cell based on percentage or intensity score.
 */
export function getHeatmapCellBg(
  riskLevel: RiskLevel,
  intensityScore: number,
  concentrationPercent: number
): {
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  if (intensityScore === 0 || concentrationPercent === 0) {
    return {
      bgClass: 'bg-slate-50/60',
      borderClass: 'border-slate-100',
      textClass: 'text-slate-400',
    };
  }

  switch (riskLevel) {
    case 'low':
      if (intensityScore > 0.6) {
        return {
          bgClass: 'bg-emerald-600 text-white',
          borderClass: 'border-emerald-700',
          textClass: 'text-white',
        };
      } else if (intensityScore > 0.3) {
        return {
          bgClass: 'bg-emerald-200 text-emerald-950',
          borderClass: 'border-emerald-300',
          textClass: 'text-emerald-950',
        };
      } else {
        return {
          bgClass: 'bg-emerald-50 text-emerald-900',
          borderClass: 'border-emerald-200',
          textClass: 'text-emerald-900',
        };
      }

    case 'moderate':
      if (intensityScore > 0.6) {
        return {
          bgClass: 'bg-amber-500 text-white',
          borderClass: 'border-amber-600',
          textClass: 'text-white',
        };
      } else if (intensityScore > 0.3) {
        return {
          bgClass: 'bg-amber-200 text-amber-950',
          borderClass: 'border-amber-300',
          textClass: 'text-amber-950',
        };
      } else {
        return {
          bgClass: 'bg-amber-50 text-amber-900',
          borderClass: 'border-amber-200',
          textClass: 'text-amber-900',
        };
      }

    case 'high':
      if (intensityScore > 0.6) {
        return {
          bgClass: 'bg-orange-600 text-white',
          borderClass: 'border-orange-700',
          textClass: 'text-white',
        };
      } else if (intensityScore > 0.3) {
        return {
          bgClass: 'bg-orange-200 text-orange-950',
          borderClass: 'border-orange-300',
          textClass: 'text-orange-950',
        };
      } else {
        return {
          bgClass: 'bg-orange-50 text-orange-900',
          borderClass: 'border-orange-200',
          textClass: 'text-orange-900',
        };
      }

    case 'critical':
      if (intensityScore > 0.6) {
        return {
          bgClass: 'bg-rose-600 text-white',
          borderClass: 'border-rose-700',
          textClass: 'text-white',
        };
      } else if (intensityScore > 0.3) {
        return {
          bgClass: 'bg-rose-200 text-rose-950',
          borderClass: 'border-rose-300',
          textClass: 'text-rose-950',
        };
      } else {
        return {
          bgClass: 'bg-rose-50 text-rose-900',
          borderClass: 'border-rose-200',
          textClass: 'text-rose-900',
        };
      }

    default:
      return {
        bgClass: 'bg-slate-50',
        borderClass: 'border-slate-200',
        textClass: 'text-slate-700',
      };
  }
}
