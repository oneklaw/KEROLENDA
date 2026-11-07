import React, { useState } from 'react';
import {
  Loan,
  Customer,
  PaymentReceipt,
  ExpenseItem,
  ExpenseBudget,
  ChartAccount,
  Tenant,
  Branch,
  RecoveryCase,
  JournalEntry,
  SavingsAccount,
  ShareAccount,
} from '../types';
import { formatUGX, formatCompactUGX, calculatePAR30, calculateLivePAR30, calculatePortfolioYield } from '../utils/finance';
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Users,
  CreditCard,
  PieChart,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Receipt,
  FileSpreadsheet,
  Activity,
  Flame,
  ArrowRight,
  Info,
  Clock,
  PiggyBank,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  aggregateCashFlowTrends,
  aggregateWeeklyCollectionsHeatmap,
  aggregatePortfolioMaturityDistribution,
  aggregateSavingsAndShareGrowth,
  aggregatePerformanceMetricsOverTime,
  MonthlyCashFlow,
  WeeklyHeatmapDay,
  LoanAgeBucket,
  MonthlySavingsShareDataPoint,
  SavingsShareGrowthAnalyticsResult,
  MonthlyPerformanceDataPoint,
  PerformanceMetricsAnalyticsResult,
} from '../utils/dashboardAnalytics';
import { CollectorDailyOverview } from './CollectorDailyOverview';
import { LiquidityForecastingWidget } from './LiquidityForecastingWidget';
import { LoanPortfolioPerformanceD3 } from './LoanPortfolioPerformanceD3';

interface DashboardViewProps {
  tenant: Tenant;
  branch: Branch;
  loans: Loan[];
  customers: Customer[];
  payments: PaymentReceipt[];
  expenses: ExpenseItem[];
  budgets: ExpenseBudget[];
  accounts: ChartAccount[];
  recoveryCases?: RecoveryCase[];
  journals?: JournalEntry[];
  savingsAccounts?: SavingsAccount[];
  shareAccounts?: ShareAccount[];
  onSelectLoan: (loan: Loan) => void;
  onQuickCollect: (loan: Loan) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tenant,
  branch,
  loans,
  customers,
  payments,
  expenses,
  budgets,
  accounts,
  recoveryCases = [],
  journals = [],
  savingsAccounts = [],
  shareAccounts = [],
  onSelectLoan,
  onQuickCollect,
  onNavigateTab,
}) => {
  const [timeframe, setTimeframe] = useState<'today' | 'this_month' | 'quarter'>('this_month');
  const [selectedProductHover, setSelectedProductHover] = useState<string | null>(null);
  const [cashFlowMode, setCashFlowMode] = useState<'area' | 'bar'>('area');
  const [activeHeatmapDay, setActiveHeatmapDay] = useState<string | null>(null);
  const [maturityMetricMode, setMaturityMetricMode] = useState<'volume' | 'count'>('volume');
  const [maturityDimension, setMaturityDimension] = useState<'age' | 'runway'>('age');
  const [selectedAgeBucketKey, setSelectedAgeBucketKey] = useState<string | null>(null);
  const [savingsChartMode, setSavingsChartMode] = useState<'both' | 'savings' | 'shares'>('both');
  const [savingsMetricView, setSavingsMetricView] = useState<'volume' | 'growth'>('volume');
  const [selectedSavingsMonthKey, setSelectedSavingsMonthKey] = useState<string | null>(null);
  const [selectedPerformanceMonthKey, setSelectedPerformanceMonthKey] = useState<string | null>(null);
  const [performanceFocusMetric, setPerformanceFocusMetric] = useState<
    'all' | 'active_loans' | 'avg_size' | 'portfolio'
  >('all');

  // Trailing 6 months Cash-In vs Cash-Out analytics from general ledger journal entries
  const cashFlowResult = aggregateCashFlowTrends(journals, tenant.id, '2026-10-29');

  // Weekly loan collections heatmap for Monday through Sunday of current week
  const weeklyHeatmap = aggregateWeeklyCollectionsHeatmap(payments, tenant.id, '2026-10-29');

  // Portfolio maturity & age distribution analytics (0-30d, 31-60d, 61-90d, 91-180d, 180+d)
  const portfolioMaturity = aggregatePortfolioMaturityDistribution(loans, tenant.id, '2026-10-29');

  // Trailing 6 months Savings Growth vs Share Capital trend analytics
  const savingsGrowthData = aggregateSavingsAndShareGrowth(
    savingsAccounts,
    shareAccounts,
    tenant.id,
    '2026-10-29',
    accounts
  );

  // Filter loans for tenant (and optionally branch)
  const tenantLoans = loans.filter((l) => l.tenantId === tenant.id);
  const activeLoans = tenantLoans.filter((l) => l.status === 'active' || l.status === 'in_arrears');

  // Trailing 12 months (last year) Performance Metrics (Monthly Active Loans, Average Loan Size, Gross Portfolio)
  const performanceMetrics = aggregatePerformanceMetricsOverTime(
    tenantLoans,
    tenant.id,
    '2026-10-29'
  );

  // Gross Portfolio Outstanding
  const grossPortfolio = tenantLoans.reduce((sum, l) => sum + (l.principalOutstanding || 0), 0);

  // PAR 30 calculations (Standard and Live Reconciled with Payments Stream)
  const parInfo = calculatePAR30(tenantLoans);
  const liveParMetrics = calculateLivePAR30(loans, payments, tenant.id);

  // Portfolio Yield calculation (Actualized Annual Yield for current year)
  const portfolioYield = calculatePortfolioYield(
    loans,
    accounts,
    journals,
    payments,
    tenant.id,
    '2026-10-29',
    24.0
  );

  // Total Disbursed in Period
  const totalDisbursed = tenantLoans.reduce((sum, l) => sum + (l.disbursedAmount || 0), 0);

  // Total Collections
  const totalCollections = payments
    .filter((p) => p.tenantId === tenant.id && p.status === 'posted')
    .reduce((sum, p) => sum + p.amount, 0);

  // Cash and Liquid Float from Chart of Accounts
  const liquidCash = accounts
    .filter((a) => a.tenantId === tenant.id && (a.code === '1000' || a.code === '1010' || a.code === '1020'))
    .reduce((sum, a) => sum + a.currentBalance, 0);

  // Savings Liabilities
  const savingsLiabilities = accounts
    .filter((a) => a.tenantId === tenant.id && a.code === '2000')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  // Total Budget and Spent
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyBudgetUGX, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spentUGX, 0);
  const budgetUtilizationPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Expected Collections this month vs Actual
  const expectedCollections = 22_500_000;
  const actualCollections = totalCollections;
  const collectionEfficiency = Math.round((actualCollections / expectedCollections) * 100);

  // Portfolio by Product
  const productDistribution = [
    { name: 'SME Working Capital', count: 18, amount: 48_500_000, color: '#0f766e', percent: 55 },
    { name: 'Boda Boda Asset Finance', count: 12, amount: 24_200_000, color: '#0284c7', percent: 27 },
    { name: 'Agricultural Group Crop', count: 8, amount: 12_800_000, color: '#16a34a', percent: 14 },
    { name: 'Salary Advance Quick', count: 6, amount: 3_500_000, color: '#f59e0b', percent: 4 },
  ];

  // Arrears aging buckets
  const agingBuckets = [
    { label: 'Current (0d)', amount: 14_250_000, count: 24, color: 'bg-emerald-500' },
    { label: '1 - 30 Days', amount: 3_100_000, count: 5, color: 'bg-amber-400' },
    { label: '31 - 60 Days (PAR)', amount: 2_600_000, count: 3, color: 'bg-orange-500' },
    { label: '61 - 90 Days', amount: 950_000, count: 2, color: 'bg-rose-500' },
    { label: '90+ Days (NPL)', amount: 450_000, count: 1, color: 'bg-rose-700' },
  ];

  // Collections weekly trend
  const weeklyTrend = [
    { week: 'W1 Oct', expected: 4_500_000, actual: 4_350_000 },
    { week: 'W2 Oct', expected: 5_200_000, actual: 5_100_000 },
    { week: 'W3 Oct', expected: 6_000_000, actual: 5_850_000 },
    { week: 'W4 Oct', expected: 6_800_000, actual: 6_200_000 },
  ];
  const maxWeekly = Math.max(...weeklyTrend.map((w) => Math.max(w.expected, w.actual)));

  // Urgent loans needing attention today / arrears
  const urgentLoans = tenantLoans.filter(
    (l) => l.status === 'in_arrears' || (l.daysPastDue === 0 && l.principalOutstanding > 0)
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Operations & Performance Command Center
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Feed
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time portfolio analytics, collections efficiency, and institutional expense telemetry for {tenant.displayName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                timeframe === 'today' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('this_month')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                timeframe === 'this_month' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              October 2026
            </button>
            <button
              onClick={() => setTimeframe('quarter')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                timeframe === 'quarter' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Q4 2026
            </button>
          </div>

          <button
            onClick={() => onNavigateTab('reports')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export</span> Reports
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (8 Crucial Microfinance & Budgeting Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gross Loan Portfolio */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Gross Loan Portfolio</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono-num mb-1">
            {formatUGX(grossPortfolio)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% MoM</span>
            <span className="text-slate-400 font-normal">({activeLoans.length} active loans)</span>
          </div>
        </div>

        {/* 2. Collection Efficiency % */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Collection Efficiency</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono-num mb-1 flex items-baseline gap-2">
            <span>{collectionEfficiency}%</span>
            <span className="text-xs font-normal text-slate-500">
              ({formatCompactUGX(actualCollections)} recvd)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Target ≥ 95%</span>
            <span className="text-slate-400 font-normal">Expected {formatCompactUGX(expectedCollections)}</span>
          </div>
        </div>

        {/* 3. PAR 30 (Live Portfolio at Risk) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span className="flex items-center gap-1.5">
              Portfolio at Risk (PAR 30)
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live data synced from loans & payments" />
            </span>
            <span className={`p-1.5 rounded-lg ${liveParMetrics.isBreached ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono-num mb-1 flex items-baseline gap-2">
            <span className={liveParMetrics.isBreached ? 'text-rose-600' : 'text-emerald-600'}>
              {liveParMetrics.par30Percent}%
            </span>
            <span className="text-xs font-normal text-slate-500">
              ({formatCompactUGX(liveParMetrics.par30Principal)} at risk)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`font-semibold ${liveParMetrics.isBreached ? 'text-rose-600' : 'text-emerald-600'}`}>
              UMRA Cap: ≤10% {liveParMetrics.isBreached ? `(+${liveParMetrics.varianceFromCap}% breach)` : '(compliant)'}
            </span>
            <span className="text-slate-400">• {liveParMetrics.par30LoansCount} loan{liveParMetrics.par30LoansCount === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* 4. Cash & MoMo Liquid Float */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Liquid Cash & MoMo Float</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono-num mb-1">
            {formatUGX(liquidCash)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Till: UGX 8.4M</span>
            <span>MoMo: UGX 14.2M</span>
            <span>Bank: UGX 64.8M</span>
          </div>
        </div>

        {/* 5. Total Disbursed (Period) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Total Disbursed (YTD)</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono-num mb-1">
            {formatUGX(totalDisbursed)}
          </div>
          <p className="text-xs text-slate-500">
            Average loan size: <span className="font-semibold text-slate-700">UGX 6.2M</span>
          </p>
        </div>

        {/* 6. Member Savings & Share Capital */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Member Savings Liabilities</span>
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono-num mb-1">
            {formatUGX(savingsLiabilities)}
          </div>
          <p className="text-xs text-slate-500">
            Share Capital: <span className="font-semibold text-slate-700">UGX 45,000,000</span>
          </p>
        </div>

        {/* 7. Actualized Annual Portfolio Yield */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span className="font-semibold text-slate-800">Portfolio Yield (Annualized)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl font-bold text-slate-900 font-mono-num">
              {portfolioYield.annualYieldPercent}%
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              +{portfolioYield.spreadOverBenchmarkPercent}% vs target
            </span>
          </div>
          <p className="text-xs text-slate-500">
            YTD Nominal: <span className="font-semibold text-slate-700">{portfolioYield.nominalYieldPercent}%</span> • Target: 24.0%
          </p>
        </div>

        {/* 8. Real-Time Operational Expense Budget Utilization */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span className="font-semibold text-slate-800">
              Expense Budget Burn Rate
            </span>
            <span className="text-xs font-bold text-slate-700">
              {budgetUtilizationPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetUtilizationPercent > 90
                  ? 'bg-rose-500'
                  : budgetUtilizationPercent > 75
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetUtilizationPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Remaining:{' '}
              <strong className="text-emerald-700 font-mono-num">
                {formatCompactUGX(totalBudget - totalSpent)}
              </strong>
            </span>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              Budgets →
            </button>
          </div>
        </div>
      </div>

      {/* Live Portfolio at Risk (PAR 30) Calculation Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Strip */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Portfolio at Risk (PAR 30) Live Assessment
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Reconciled
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dynamic computation derived from active loan principals ({tenantLoans.length} total) and posted repayment stream ({payments.length} receipts).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                liveParMetrics.isBreached
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {liveParMetrics.isBreached ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  UMRA Cap Breach: +{liveParMetrics.varianceFromCap}%
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  UMRA Compliant (≤ 10.0%)
                </>
              )}
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-5 space-y-5">
          {/* Top Row: Gauge & Key Ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Primary KPI Callout */}
            <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Live Portfolio at Risk (PAR &gt; 30d)
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-extrabold font-mono-num tracking-tight ${
                    liveParMetrics.isBreached ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {liveParMetrics.par30Percent}%
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  of Gross Active Portfolio
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                {liveParMetrics.isBreached
                  ? `Breaches statutory 10.0% prudential ceiling by +${liveParMetrics.varianceFromCap}%. Mandatory loan loss provisions apply.`
                  : `Within UMRA statutory prudential ceiling of 10.0%. Portfolio quality is stable.`}
              </p>
            </div>

            {/* Regulatory Benchmark Gauge Bar */}
            <div className="lg:col-span-8 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  Regulatory Benchmark Gauge
                  <span className="text-slate-400 font-normal">
                    (Uganda Microfinance Regulatory Authority Prudential Guideline)
                  </span>
                </span>
                <span className="font-mono-num font-bold">
                  {liveParMetrics.par30Percent}% / 100%
                </span>
              </div>

              {/* Progress Track */}
              <div className="relative w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200 shadow-inner">
                {/* 10% UMRA Threshold Marker background safe zone */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-emerald-100/60 border-r border-dashed border-emerald-500 z-0"
                  style={{ width: '10%' }}
                  title="UMRA 10% Prudential Ceiling"
                />
                {/* Active PAR Fill */}
                <div
                  className={`h-full rounded-full transition-all duration-700 z-10 ${
                    liveParMetrics.isBreached
                      ? 'bg-rose-500 shadow-sm shadow-rose-300'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, liveParMetrics.par30Percent))}%` }}
                />
              </div>

              {/* Ticks and Legend */}
              <div className="relative text-[11px] text-slate-500 flex justify-between pt-0.5 font-mono">
                <span>0%</span>
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  ▲ 10.0% UMRA Ceiling
                </span>
                <span>25% (Substandard)</span>
                <span>50% (Doubtful)</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* 4 Reconciled Component Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {/* Tile 1: At-Risk Principal */}
            <div className="p-3.5 rounded-lg border border-rose-200/80 bg-rose-50/40">
              <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wide flex items-center justify-between mb-1">
                <span>At-Risk Principal (&gt; 30 DPD)</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-lg font-bold text-rose-700 font-mono-num">
                {formatUGX(liveParMetrics.par30Principal)}
              </div>
              <div className="text-[11px] text-rose-600 mt-1">
                {liveParMetrics.par30LoansCount} loan account(s) overdue &gt; 30 days
              </div>
            </div>

            {/* Tile 2: Gross Active Portfolio */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex items-center justify-between mb-1">
                <span>Gross Active Portfolio</span>
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono-num">
                {formatUGX(liveParMetrics.totalGrossPortfolio)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {liveParMetrics.healthyLoansCount} performing loan accounts (≤ 30 DPD)
              </div>
            </div>

            {/* Tile 3: Recoveries on At-Risk Loans */}
            <div className="p-3.5 rounded-lg border border-amber-200/80 bg-amber-50/40">
              <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide flex items-center justify-between mb-1">
                <span>Recovered on At-Risk Loans</span>
                <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div className="text-lg font-bold text-amber-800 font-mono-num">
                {formatUGX(liveParMetrics.atRiskRecoveredAmount)}
              </div>
              <div className="text-[11px] text-amber-700 mt-1">
                {liveParMetrics.atRiskPaymentsCount} posted receipt(s) collected from arrears
              </div>
            </div>

            {/* Tile 4: Total Collections Stream */}
            <div className="p-3.5 rounded-lg border border-emerald-200/80 bg-emerald-50/40">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide flex items-center justify-between mb-1">
                <span>Total Posted Collections</span>
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-emerald-800 font-mono-num">
                {formatUGX(liveParMetrics.totalCollectionsAmount)}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                {liveParMetrics.totalPaymentsCount} posted receipts ({formatCompactUGX(liveParMetrics.principalRecoveredFromPayments)} principal)
              </div>
            </div>
          </div>

          {/* Formula Transparency Strip & Action Shortcuts */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong className="text-slate-800 font-semibold">Live PAR 30 Formula:</strong>{' '}
                <span className="font-mono text-slate-700">
                  (Overdue Principal &gt; 30d: {formatCompactUGX(liveParMetrics.par30Principal)} ÷ Gross Active Portfolio: {formatCompactUGX(liveParMetrics.totalGrossPortfolio)}) × 100 = <strong>{liveParMetrics.par30Percent}%</strong>
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigateTab('collections')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                Collections Desk
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => onNavigateTab('teller')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                Post Recovery Receipt
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Yield & Interest Generation Live Calculation Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Strip */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Portfolio Yield (Actualized Annual Yield)
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Ledger Sync (FY 2026)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Annualized return derived from booked interest revenues against the average outstanding loan portfolio across {portfolioYield.monthsElapsedInYear} elapsed months.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              GL Acc 4000 Reconciled
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Yield Spread: +{portfolioYield.spreadOverBenchmarkPercent}% vs Target
            </span>
          </div>
        </div>

        {/* Primary Callout & Yield Corridor */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Primary KPI Callout */}
            <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between text-emerald-200/80 text-xs font-medium mb-1">
                  <span>Actualized Annual Portfolio Yield</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Annualized 12M
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono-num text-white">
                    {portfolioYield.annualYieldPercent}%
                  </span>
                  <span className="text-xs text-emerald-300 font-semibold">
                    p.a.
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Projected 12-month interest income run-rate of <strong className="text-emerald-300 font-mono-num">{formatCompactUGX(portfolioYield.annualizedInterestIncomeUGX)}</strong> on an average active portfolio base of <strong className="text-white font-mono-num">{formatCompactUGX(portfolioYield.averagePortfolioUGX)}</strong>.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                <span className="text-emerald-200/90">
                  Nominal YTD (10M): <strong className="text-white font-mono-num">{portfolioYield.nominalYieldPercent}%</strong>
                </span>
                <span className="text-emerald-200/90">
                  Benchmark: <strong className="text-white font-mono-num">{portfolioYield.benchmarkYieldPercent}%</strong>
                </span>
              </div>
            </div>

            {/* Yield Corridor & Regulatory Benchmark Gauge */}
            <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Institutional Yield Performance Corridor
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    UMRA Compliant &bull; High Repayment Velocity
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Microcredit returns reflect short-tenor SME and asset finance cycles where flat contract rates (avg {portfolioYield.weightedAverageContractRate}%) cycle principal multiple times per fiscal year.
                </p>

                {/* Multi-segment corridor bar */}
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-200 rounded-full overflow-hidden flex relative">
                    {/* Cost of Funds Segment (0 - 12%) */}
                    <div style={{ width: '15%' }} className="bg-slate-400/80 h-full" title="Cost of Funds Threshold (12%)" />
                    {/* Baseline Target Segment (12% - 24%) */}
                    <div style={{ width: '15%' }} className="bg-amber-400 h-full" title="Target Minimum Corridor (24%)" />
                    {/* Fair Return Segment (24% - 60%) */}
                    <div style={{ width: '45%' }} className="bg-emerald-500 h-full" title="Optimal Microfinance Corridor" />
                    {/* High Velocity Expansion (> 60%) */}
                    <div style={{ width: '25%' }} className="bg-teal-600 h-full" title="High Turnover Velocity" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>0% Base</span>
                    <span>12% Cost of Funds</span>
                    <span className="font-bold text-slate-700">24% UMRA Target</span>
                    <span className="font-bold text-emerald-700">{portfolioYield.annualYieldPercent}% Current Actualized</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500">Target Spread</div>
                  <div className="font-bold text-emerald-700 font-mono-num">+{portfolioYield.spreadOverBenchmarkPercent}%</div>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500">Annualization Factor</div>
                  <div className="font-bold text-slate-800 font-mono-num">{(12 / portfolioYield.monthsElapsedInYear).toFixed(2)}x (10M YTD)</div>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500">Weighted Contract Rate</div>
                  <div className="font-bold text-slate-800 font-mono-num">{portfolioYield.weightedAverageContractRate}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Component Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tile 1: Total Interest Income */}
            <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Interest Income (YTD 2026)
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono-num">
                {formatUGX(portfolioYield.totalInterestIncomeUGX)}
              </div>
              <p className="text-[11px] text-slate-500">
                Source: <span className="font-medium text-slate-700">GL Account 4000</span> (General Ledger)
              </p>
            </div>

            {/* Tile 2: Average Outstanding Portfolio */}
            <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Average Outstanding Portfolio
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono-num">
                {formatUGX(portfolioYield.averagePortfolioUGX)}
              </div>
              <p className="text-[11px] text-slate-500">
                Active Book: <span className="font-medium text-slate-700">{formatCompactUGX(portfolioYield.endingOutstandingUGX)}</span> (Disbursed {formatCompactUGX(portfolioYield.initialDisbursedUGX)})
              </p>
            </div>

            {/* Tile 3: Annualized Interest Run-Rate */}
            <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Annualized Interest Run-Rate
              </div>
              <div className="text-lg font-bold text-emerald-800 font-mono-num">
                {formatUGX(portfolioYield.annualizedInterestIncomeUGX)}
              </div>
              <p className="text-[11px] text-slate-500">
                Projection: <span className="font-medium text-slate-700">12 / {portfolioYield.monthsElapsedInYear} months elapsed</span>
              </p>
            </div>

            {/* Tile 4: Nominal Yield vs Spread */}
            <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Nominal YTD Yield
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono-num">
                {portfolioYield.nominalYieldPercent}%
              </div>
              <p className="text-[11px] text-slate-500">
                Spread: <span className="font-medium text-emerald-700 font-semibold">+{portfolioYield.spreadOverBenchmarkPercent}%</span> above hurdle
              </p>
            </div>
          </div>

          {/* Formula Transparency Strip & Action Shortcuts */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong className="text-slate-800 font-semibold">Annualized Yield Formula:</strong>{' '}
                <span className="font-mono text-slate-700">
                  (Annualized Interest: {formatCompactUGX(portfolioYield.annualizedInterestIncomeUGX)} ÷ Average Outstanding Portfolio: {formatCompactUGX(portfolioYield.averagePortfolioUGX)}) × 100 = <strong>{portfolioYield.annualYieldPercent}%</strong>
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigateTab('accounting')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                Chart of Accounts (Acc 4000)
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => onNavigateTab('loans')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                Loan Portfolio Book
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Performance Metrics Card (Sparkline Charts for Key KPIs over the Last Year using Recharts) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Strip */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-slate-900 text-white">
                <Target className="w-4 h-4 text-emerald-400" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Performance Metrics &amp; 12-Month Sparkline Trends
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                1-Year Trailing Trend
              </span>
            </div>
            <p className="text-xs text-slate-500">
              High-frequency rolling performance telemetry over the last year: tracking operational scale across Monthly Active Loans, Average Loan Size (ticket graduation), and Gross Portfolio Volume.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter / Focus Metric Switcher */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setPerformanceFocusMetric('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  performanceFocusMetric === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View all key KPI sparklines side-by-side"
              >
                All KPIs
              </button>
              <button
                onClick={() => setPerformanceFocusMetric('active_loans')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  performanceFocusMetric === 'active_loans'
                    ? 'bg-teal-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Focus on Monthly Active Loans sparkline"
              >
                Active Loans
              </button>
              <button
                onClick={() => setPerformanceFocusMetric('avg_size')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  performanceFocusMetric === 'avg_size'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Focus on Average Loan Size sparkline"
              >
                Avg Loan Size
              </button>
              <button
                onClick={() => setPerformanceFocusMetric('portfolio')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  performanceFocusMetric === 'portfolio'
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Focus on Gross Portfolio Volume sparkline"
              >
                Portfolio
              </button>
            </div>

            <button
              onClick={() => onNavigateTab('loans')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Loan Book
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Sparkline KPI Cards Grid */}
        <div className="p-4 sm:p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Sparkline Card 1: Monthly Active Loans */}
            {(performanceFocusMetric === 'all' || performanceFocusMetric === 'active_loans') && (
              <div
                className={`p-4 rounded-xl border transition-all ${
                  performanceFocusMetric === 'active_loans'
                    ? 'md:col-span-2 xl:col-span-4 bg-teal-50/20 border-teal-300 ring-1 ring-teal-400'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span className="flex items-center gap-1.5 text-teal-800">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    Monthly Active Loans
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                    <ArrowUpRight className="w-3 h-3 text-teal-700" />
                    +{performanceMetrics.activeLoansChangeYoYPercent}% YoY
                  </span>
                </div>

                <div className="flex items-baseline gap-2 my-1">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono-num tracking-tight">
                    {performanceMetrics.currentActiveLoans}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Active Accounts ({performanceMetrics.activeLoansChangeYoY >= 0 ? '+' : ''}{performanceMetrics.activeLoansChangeYoY} YoY)
                  </span>
                </div>

                {/* Recharts Sparkline */}
                <div className="w-full h-[72px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={performanceMetrics.monthlyData}
                      margin={{ top: 4, right: 2, left: 2, bottom: 2 }}
                    >
                      <defs>
                        <linearGradient id="sparklineActiveLoansGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const dp = payload[0].payload as MonthlyPerformanceDataPoint;
                            return (
                              <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700 text-xs">
                                <div className="text-[10px] text-slate-400 font-medium">{dp.fullMonth}</div>
                                <div className="font-bold text-teal-300 font-mono-num">
                                  {dp.activeLoansCount} active loan accounts
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="activeLoansCount"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        fill="url(#sparklineActiveLoansGrad)"
                        dot={{ r: 2.5, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 1 }}
                        activeDot={{ r: 5, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-1">
                  <span>12M: {performanceMetrics.minActiveLoans.count} – {performanceMetrics.peakActiveLoans.count} loans</span>
                  <span className="font-semibold text-teal-700">Run-rate: {performanceMetrics.averageActiveLoansRunRate}/mo</span>
                </div>
              </div>
            )}

            {/* Sparkline Card 2: Average Loan Size */}
            {(performanceFocusMetric === 'all' || performanceFocusMetric === 'avg_size') && (
              <div
                className={`p-4 rounded-xl border transition-all ${
                  performanceFocusMetric === 'avg_size'
                    ? 'md:col-span-2 xl:col-span-4 bg-indigo-50/20 border-indigo-300 ring-1 ring-indigo-400'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span className="flex items-center gap-1.5 text-indigo-800">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                    Average Loan Size
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    <ArrowUpRight className="w-3 h-3 text-indigo-700" />
                    +{performanceMetrics.averageLoanSizeChangeYoYPercent}% YoY
                  </span>
                </div>

                <div className="flex items-baseline gap-2 my-1">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono-num tracking-tight">
                    {formatUGX(performanceMetrics.currentAverageLoanSize)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    / Loan (+{formatCompactUGX(performanceMetrics.averageLoanSizeChangeYoY)})
                  </span>
                </div>

                {/* Recharts Sparkline */}
                <div className="w-full h-[72px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={performanceMetrics.monthlyData}
                      margin={{ top: 4, right: 2, left: 2, bottom: 2 }}
                    >
                      <defs>
                        <linearGradient id="sparklineAvgLoanSizeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const dp = payload[0].payload as MonthlyPerformanceDataPoint;
                            return (
                              <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700 text-xs">
                                <div className="text-[10px] text-slate-400 font-medium">{dp.fullMonth}</div>
                                <div className="font-bold text-indigo-300 font-mono-num">
                                  Avg Size: {formatUGX(dp.averageLoanSize)}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="averageLoanSize"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#sparklineAvgLoanSizeGrad)"
                        dot={{ r: 2.5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 1 }}
                        activeDot={{ r: 5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-1">
                  <span>12M: {formatCompactUGX(performanceMetrics.minAverageLoanSize.amount)} – {formatCompactUGX(performanceMetrics.peakAverageLoanSize.amount)}</span>
                  <span className="font-semibold text-indigo-700">SME Graduation</span>
                </div>
              </div>
            )}

            {/* Sparkline Card 3: Gross Active Loan Portfolio */}
            {(performanceFocusMetric === 'all' || performanceFocusMetric === 'portfolio') && (
              <div
                className={`p-4 rounded-xl border transition-all ${
                  performanceFocusMetric === 'portfolio'
                    ? 'md:col-span-2 xl:col-span-4 bg-sky-50/20 border-sky-300 ring-1 ring-sky-400'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span className="flex items-center gap-1.5 text-sky-800">
                    <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                    Gross Active Portfolio
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                    <ArrowUpRight className="w-3 h-3 text-sky-700" />
                    +{performanceMetrics.grossPortfolioChangeYoYPercent}% YoY
                  </span>
                </div>

                <div className="flex items-baseline gap-2 my-1">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono-num tracking-tight">
                    {formatUGX(performanceMetrics.currentGrossPortfolio)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    (+{formatCompactUGX(performanceMetrics.grossPortfolioChangeYoY)})
                  </span>
                </div>

                {/* Recharts Sparkline */}
                <div className="w-full h-[72px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={performanceMetrics.monthlyData}
                      margin={{ top: 4, right: 2, left: 2, bottom: 2 }}
                    >
                      <defs>
                        <linearGradient id="sparklineGrossPortfolioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const dp = payload[0].payload as MonthlyPerformanceDataPoint;
                            return (
                              <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700 text-xs">
                                <div className="text-[10px] text-slate-400 font-medium">{dp.fullMonth}</div>
                                <div className="font-bold text-sky-300 font-mono-num">
                                  Portfolio: {formatUGX(dp.grossPortfolioVolume)}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="grossPortfolioVolume"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        fill="url(#sparklineGrossPortfolioGrad)"
                        dot={{ r: 2.5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 1 }}
                        activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-1">
                  <span>Start: {formatCompactUGX(performanceMetrics.startGrossPortfolio)}</span>
                  <span className="font-semibold text-emerald-700">Earning Interest</span>
                </div>
              </div>
            )}

            {/* Sparkline Card 4: Total Annual Lending Volume */}
            {performanceFocusMetric === 'all' && (
              <div className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Annual Lending Disbursed
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {performanceMetrics.totalNewLoansDisbursed} Cycles
                  </span>
                </div>

                <div className="flex items-baseline gap-2 my-1">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono-num tracking-tight">
                    {formatUGX(performanceMetrics.totalAnnualDisbursed)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    12M Total
                  </span>
                </div>

                {/* Recharts Sparkline */}
                <div className="w-full h-[72px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={performanceMetrics.monthlyData}
                      margin={{ top: 4, right: 2, left: 2, bottom: 2 }}
                    >
                      <defs>
                        <linearGradient id="sparklineDisbursementsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const dp = payload[0].payload as MonthlyPerformanceDataPoint;
                            return (
                              <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700 text-xs">
                                <div className="text-[10px] text-slate-400 font-medium">{dp.fullMonth}</div>
                                <div className="font-bold text-emerald-300 font-mono-num">
                                  Disbursements: {formatUGX(dp.monthlyDisbursements)}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="monthlyDisbursements"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#sparklineDisbursementsGrad)"
                        dot={{ r: 2.5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1 }}
                        activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-1">
                  <span>12 Months Activity</span>
                  <span className="font-semibold text-slate-700">Capital Velocity</span>
                </div>
              </div>
            )}
          </div>

          {/* 12-Month Trajectory Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Trailing 12-Month Timeline (Click month to inspect)
              </span>
              <span className="text-[11px] text-slate-400">
                Chronological monthly sequence • Nov 2025 to Oct 2026
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-2">
              {performanceMetrics.monthlyData.map((m, idx) => {
                const isSelected = selectedPerformanceMonthKey === m.monthKey;
                const isLatest = idx === performanceMetrics.monthlyData.length - 1;

                return (
                  <div
                    key={m.monthKey}
                    onClick={() =>
                      setSelectedPerformanceMonthKey(isSelected ? null : m.monthKey)
                    }
                    className={`p-2 rounded-lg border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500 shadow-xs'
                        : isLatest
                        ? 'border-teal-300 bg-teal-50/30 hover:bg-teal-50/60'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-800">
                        {m.label}
                      </span>
                      {isLatest && (
                        <span className="text-[8px] font-extrabold uppercase px-1 rounded bg-teal-100 text-teal-800">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Loans:</span>
                        <span className="font-bold text-teal-700 font-mono-num">
                          {m.activeLoansCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Avg:</span>
                        <span className="font-bold text-indigo-700 font-mono-num">
                          {formatCompactUGX(m.averageLoanSize)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspected Month Drilldown Drawer if selected */}
          {selectedPerformanceMonthKey && (() => {
            const m = performanceMetrics.monthlyData.find(
              (d) => d.monthKey === selectedPerformanceMonthKey
            );
            if (!m) return null;

            return (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-teal-100 text-teal-800">
                      <Activity className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {m.fullMonth} Performance Milestone Audit
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                      {m.monthKey}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPerformanceMonthKey(null)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs font-semibold"
                  >
                    ✕ Close Inspector
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Active Borrower Accounts</span>
                    <span className="text-lg font-bold text-teal-800 font-mono-num">
                      {m.activeLoansCount} loans
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Performing &amp; in-grace facilities
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Average Loan Ticket Size</span>
                    <span className="text-lg font-bold text-indigo-800 font-mono-num">
                      {formatUGX(m.averageLoanSize)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Average active contract commitment
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Gross Portfolio Outstanding</span>
                    <span className="text-lg font-bold text-sky-800 font-mono-num">
                      {formatUGX(m.grossPortfolioVolume)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Earning principal assets
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Monthly Disbursements</span>
                    <span className="text-lg font-bold text-emerald-800 font-mono-num">
                      {formatUGX(m.monthlyDisbursements)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {m.newLoansDisbursedCount} cycle(s) disbursed
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Footer Methodology & UMRA Compliance Context */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong className="text-slate-700 font-semibold">Microfinance Growth Telemetry:</strong>{' '}
                Simultaneous expansion in Monthly Active Loans (+{performanceMetrics.activeLoansChangeYoYPercent}%) and Average Loan Size (+{performanceMetrics.averageLoanSizeChangeYoYPercent}%) indicates healthy customer graduation from group working capital into SME credit lines, improving operating expense efficiency per shilling disbursed.
              </span>
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-slate-700 font-semibold">
                Current Ticket: {formatCompactUGX(performanceMetrics.currentAverageLoanSize)}
              </span>
              <span>•</span>
              <span className="font-mono text-teal-800 font-bold">
                {performanceMetrics.currentActiveLoans} Active Loans
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Collector Daily Overview Widget */}
      <CollectorDailyOverview
        tenant={tenant}
        loans={loans}
        customers={customers}
        recoveryCases={recoveryCases}
        onQuickCollect={onQuickCollect}
        onNavigateToCollections={() => onNavigateTab('collections')}
      />

      {/* Loan Portfolio Performance D3 Visual Report */}
      <LoanPortfolioPerformanceD3
        tenant={tenant}
        loans={loans}
        payments={payments}
      />

      {/* 30-Day Liquidity Forecasting Widget */}
      <LiquidityForecastingWidget
        tenant={tenant}
        loans={loans}
        expenses={expenses}
        budgets={budgets}
        accounts={accounts}
      />

      {/* SECTION: Weekly Collections Heatmap (Custom Grid Layout: Mon - Sun) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Flame className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 text-sm">
                Weekly Loan Collections Heatmap
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Mon – Sun
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily volume of loan repayments collected across Cash Till, Mobile Money (MTN/Airtel), and Bank Transfers for {weeklyHeatmap.weekRangeLabel}.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
              <span className="text-slate-500 font-normal">Week Collections: </span>
              <strong className="text-emerald-800 font-mono font-bold">
                {formatUGX(weeklyHeatmap.totalWeekCollections)}
              </strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <span className="text-slate-500">Total Receipts: </span>
              <strong className="font-bold">{weeklyHeatmap.totalWeekCount}</strong>
            </div>
            {weeklyHeatmap.peakDay && weeklyHeatmap.peakDay.totalAmount > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-800">
                <span className="text-teal-600">Peak Day: </span>
                <strong className="font-bold">{weeklyHeatmap.peakDay.dayFullName} ({formatCompactUGX(weeklyHeatmap.peakDay.totalAmount)})</strong>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Responsive Heatmap Grid (Mon through Sun) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {weeklyHeatmap.days.map((day) => {
            const isSelected = activeHeatmapDay === day.dateStr;
            const hasCollections = day.totalAmount > 0;
            const isPeak = day.dateStr === weeklyHeatmap.peakDay?.dateStr && hasCollections;

            // Heatmap intensity style classes
            let tileBg = 'bg-slate-50/90 border-slate-200 hover:border-slate-300 text-slate-700';
            let amountColor = 'text-slate-400';
            let badgeBg = 'bg-slate-200 text-slate-600';
            let progressBg = 'bg-slate-300';

            if (day.intensityLevel === 4) {
              tileBg = 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-800 text-white shadow-xs';
              amountColor = 'text-white font-extrabold';
              badgeBg = 'bg-white/20 text-white border border-white/30';
              progressBg = 'bg-white';
            } else if (day.intensityLevel === 3) {
              tileBg = 'bg-emerald-100 border-emerald-300 hover:border-emerald-400 text-emerald-950 shadow-2xs';
              amountColor = 'text-emerald-950 font-bold';
              badgeBg = 'bg-emerald-200 text-emerald-900 border border-emerald-300';
              progressBg = 'bg-emerald-600';
            } else if (day.intensityLevel === 2) {
              tileBg = 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-300 text-emerald-900';
              amountColor = 'text-emerald-900 font-bold';
              badgeBg = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
              progressBg = 'bg-emerald-500';
            } else if (day.intensityLevel === 1) {
              tileBg = 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200 text-emerald-800';
              amountColor = 'text-emerald-800 font-semibold';
              badgeBg = 'bg-emerald-100/70 text-emerald-700 border border-emerald-200';
              progressBg = 'bg-emerald-400';
            }

            return (
              <div
                key={day.dateStr}
                onClick={() => setActiveHeatmapDay(isSelected ? null : day.dateStr)}
                className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[148px] ${tileBg} ${
                  isSelected ? 'ring-2 ring-emerald-500 ring-offset-1 scale-[1.02]' : ''
                }`}
                title={`Click to inspect ${day.dayFullName} breakdown (${formatUGX(day.totalAmount)})`}
              >
                {/* Day Header Row */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider">{day.dayName}</span>
                    <span className={`text-[11px] ${day.intensityLevel === 4 ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {day.formattedDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {day.isToday && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${
                        day.intensityLevel === 4 ? 'bg-white text-emerald-800' : 'bg-emerald-600 text-white'
                      }`}>
                        Today
                      </span>
                    )}
                    {isPeak && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                        day.intensityLevel === 4 ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        Peak
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Volume Number */}
                <div className="my-1">
                  <div className={`text-base sm:text-lg font-mono-num font-bold tracking-tight ${amountColor}`}>
                    {hasCollections ? formatCompactUGX(day.totalAmount) : 'UGX 0'}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-0.5 opacity-90">
                    <span className={`px-1.5 py-0.2 rounded-full font-semibold ${badgeBg}`}>
                      {day.count} {day.count === 1 ? 'receipt' : 'receipts'}
                    </span>
                  </div>
                </div>

                {/* Bottom Channel Breakdown & Mini Progress Bar */}
                <div className="mt-2 pt-2 border-t border-current/15 text-[10px]">
                  {hasCollections ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-mono-num text-[10px]">
                        <span>MoMo:</span>
                        <span className="font-semibold">{formatCompactUGX(day.channels.mobileMoney)}</span>
                      </div>
                      <div className="flex items-center justify-between font-mono-num text-[10px]">
                        <span>Till/Bank:</span>
                        <span className="font-semibold">{formatCompactUGX(day.channels.cashTill + day.channels.bankTransfer)}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] opacity-70 italic">No collections posted</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Heatmap Footer Legend & Summary Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-600">
          {/* Intensity Color Scale Key */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Intensity:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span className="w-3 h-3 rounded-xs bg-slate-100 border border-slate-200"></span> Zero
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                <span className="w-3 h-3 rounded-xs bg-emerald-50 border border-emerald-200"></span> Low (&lt;25%)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-700">
                <span className="w-3 h-3 rounded-xs bg-emerald-100 border border-emerald-300"></span> Mid (25-55%)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-800">
                <span className="w-3 h-3 rounded-xs bg-emerald-200 border border-emerald-400"></span> High (55-85%)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold">
                <span className="w-3 h-3 rounded-xs bg-emerald-600 border border-emerald-700"></span> Peak (≥85%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <span>
              Daily Run Rate: <strong className="text-slate-800 font-mono font-bold">{formatUGX(weeklyHeatmap.averageDailyCollection)}</strong> / day
            </span>
            <span>•</span>
            <button
              onClick={() => onNavigateTab('teller')}
              className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Post Collection at Terminal <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Expanded Day Inspector Drawer when day clicked */}
        {activeHeatmapDay && (() => {
          const inspectedDay = weeklyHeatmap.days.find((d) => d.dateStr === activeHeatmapDay);
          if (!inspectedDay) return null;
          return (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Collection Channel Breakdown for {inspectedDay.dayFullName}, {inspectedDay.formattedDate}
                </span>
                <button
                  onClick={() => setActiveHeatmapDay(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer text-[11px]"
                >
                  ✕ Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Total Day Volume</span>
                  <span className="font-bold text-slate-900 font-mono-num text-sm">{formatUGX(inspectedDay.totalAmount)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Mobile Money (MTN/Airtel)</span>
                  <span className="font-bold text-emerald-700 font-mono-num text-sm">{formatUGX(inspectedDay.channels.mobileMoney)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Physical Cash Till</span>
                  <span className="font-bold text-amber-700 font-mono-num text-sm">{formatUGX(inspectedDay.channels.cashTill)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Commercial Bank Transfers</span>
                  <span className="font-bold text-sky-700 font-mono-num text-sm">{formatUGX(inspectedDay.channels.bankTransfer)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* SECTION: Recharts Cash-In vs Cash-Out Trends (Last 6 Months from Journal Entries) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 text-sm">
                Cash-In vs Cash-Out Trends (Last 6 Months)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                General Ledger Driven
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Double-entry tracking of cash inflows (collections, fees, deposits debited to accounts 1000/1010/1020) vs cash outflows (loan disbursements, opex expenses credited) from journal records.
            </p>
          </div>

          {/* Chart Display Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setCashFlowMode('area')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  cashFlowMode === 'area' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Area Trend
              </button>
              <button
                onClick={() => setCashFlowMode('bar')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  cashFlowMode === 'bar' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bar Compare
              </button>
            </div>
            <button
              onClick={() => onNavigateTab('accounting')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Audit</span> Journals
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Chips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[11px] font-semibold text-emerald-800 block">6-Month Total Cash-In</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-emerald-900">
              {formatUGX(cashFlowResult.totalCashIn)}
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Collections, fees &amp; member deposits</span>
          </div>

          <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200/80">
            <span className="text-[11px] font-semibold text-rose-800 block">6-Month Total Cash-Out</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-rose-900">
              {formatUGX(cashFlowResult.totalCashOut)}
            </span>
            <span className="text-[10px] text-rose-700 block mt-0.5">Disbursements &amp; operational expenses</span>
          </div>

          <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200/80">
            <span className="text-[11px] font-semibold text-sky-800 block">Net Liquidity Float Delta</span>
            <span className={`text-base sm:text-lg font-bold font-mono-num ${cashFlowResult.netLiquidityChange >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              {cashFlowResult.netLiquidityChange >= 0 ? '+' : ''}{formatUGX(cashFlowResult.netLiquidityChange)}
            </span>
            <span className="text-[10px] text-sky-700 block mt-0.5">Institutional liquidity buffer</span>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200/80">
            <span className="text-[11px] font-semibold text-indigo-800 block">Average Monthly Net Flow</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-indigo-900">
              {cashFlowResult.averageMonthlyNet >= 0 ? '+' : ''}{formatUGX(cashFlowResult.averageMonthlyNet)}
            </span>
            <span className="text-[10px] text-indigo-700 block mt-0.5">6-month monthly run rate</span>
          </div>
        </div>

        {/* Recharts Container with Explicit Height */}
        <div className="w-full h-[320px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {cashFlowMode === 'area' ? (
              <AreaChart
                data={cashFlowResult.monthlyData}
                margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCashOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tickFormatter={(val) => formatCompactUGX(val)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={65}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyCashFlow;
                      const isPositive = data.netCashFlow >= 0;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[240px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                            <span className="font-bold text-sm text-slate-100">{data.fullMonth}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                              {data.transactionCount} journal entries
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-emerald-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                                Cash-In (Collections):
                              </span>
                              <span className="font-mono font-bold">{formatUGX(data.cashIn)}</span>
                            </div>
                            <div className="flex items-center justify-between text-rose-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
                                Cash-Out (Disb./Opex):
                              </span>
                              <span className="font-mono font-bold">{formatUGX(data.cashOut)}</span>
                            </div>
                            <div className="pt-2 mt-1 border-t border-slate-800 flex items-center justify-between font-semibold">
                              <span className="text-slate-300">Net Monthly Float:</span>
                              <span className={`font-mono font-bold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {isPositive ? '+' : ''}{formatUGX(data.netCashFlow)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="cashIn"
                  name="Cash-In (Collections & Inflows)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCashIn)"
                />
                <Area
                  type="monotone"
                  dataKey="cashOut"
                  name="Cash-Out (Disbursements & Opex)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCashOut)"
                />
              </AreaChart>
            ) : (
              <BarChart
                data={cashFlowResult.monthlyData}
                margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tickFormatter={(val) => formatCompactUGX(val)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={65}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyCashFlow;
                      const isPositive = data.netCashFlow >= 0;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[240px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                            <span className="font-bold text-sm text-slate-100">{data.fullMonth}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                              {data.transactionCount} journal entries
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-emerald-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                                Cash-In:
                              </span>
                              <span className="font-mono font-bold">{formatUGX(data.cashIn)}</span>
                            </div>
                            <div className="flex items-center justify-between text-rose-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
                                Cash-Out:
                              </span>
                              <span className="font-mono font-bold">{formatUGX(data.cashOut)}</span>
                            </div>
                            <div className="pt-2 mt-1 border-t border-slate-800 flex items-center justify-between font-semibold">
                              <span className="text-slate-300">Net Flow:</span>
                              <span className={`font-mono font-bold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {isPositive ? '+' : ''}{formatUGX(data.netCashFlow)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="cashIn"
                  name="Cash-In (Collections & Inflows)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="cashOut"
                  name="Cash-Out (Disbursements & Opex)"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Cash-In tracks debits to liquid cash accounts (1000 Till, 1010 MoMo, 1020 Bank). Cash-Out tracks credits.
          </span>
          <span className="font-semibold text-slate-700">
            Source: General Ledger ({cashFlowResult.monthlyData.reduce((s, m) => s + m.transactionCount, 0)} transactions)
          </span>
        </div>
      </div>

      {/* SECTION: Active Loan Distribution by Age & Portfolio Maturity (Recharts) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        {/* Header Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 text-sm">
                Active Loan Distribution by Age &amp; Portfolio Maturity
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Recharts • Portfolio Vintage Aging
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Analysis of active loan principal categorized by age since disbursement (0-30d, 31-60d, 61-90d, 91-180d, 180+d) and remaining runway to evaluate portfolio seasoning and repayment maturity.
            </p>
          </div>

          {/* Controls: Dimension Toggle + Metric Toggle + Action */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Dimension Toggle: Seasoning Age vs Maturity Runway */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium">
              <button
                onClick={() => {
                  setMaturityDimension('age');
                  setSelectedAgeBucketKey(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  maturityDimension === 'age'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Loan Age (Seasoning)
              </button>
              <button
                onClick={() => {
                  setMaturityDimension('runway');
                  setSelectedAgeBucketKey(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  maturityDimension === 'runway'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Remaining Runway
              </button>
            </div>

            {/* Metric Mode Toggle: Volume (UGX) vs Loan Count */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setMaturityMetricMode('volume')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  maturityMetricMode === 'volume'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Volume (UGX)
              </button>
              <button
                onClick={() => setMaturityMetricMode('count')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  maturityMetricMode === 'count'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Loan Count
              </button>
            </div>

            <button
              onClick={() => onNavigateTab('loans')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Loan Book
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Chips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 block">Total Active Portfolio</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-slate-900">
              {formatUGX(portfolioMaturity.totalActivePrincipalOutstanding)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {portfolioMaturity.totalActiveLoans} active loans across book
            </span>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200/80">
            <span className="text-[11px] font-semibold text-indigo-800 block">Weighted Average Age</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-indigo-900">
              {portfolioMaturity.weightedAverageAgeDays} Days
            </span>
            <span className="text-[10px] text-indigo-700 block mt-0.5">
              ~{(portfolioMaturity.weightedAverageAgeDays / 30).toFixed(1)} months average seasoning
            </span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[11px] font-semibold text-emerald-800 block">Seasoned Ratio (≥60d)</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-emerald-900">
              {portfolioMaturity.seasonedRatioPercent}%
            </span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              Stable repayment track record
            </span>
          </div>

          <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200/80">
            <span className="text-[11px] font-semibold text-teal-800 block">Avg Remaining Runway</span>
            <span className="text-base sm:text-lg font-bold font-mono-num text-teal-900">
              {portfolioMaturity.weightedAverageRemainingDays} Days
            </span>
            <span className="text-[10px] text-teal-700 block mt-0.5">
              Weighted maturity horizon
            </span>
          </div>
        </div>

        {/* Recharts BarChart Container */}
        {(() => {
          const displayBuckets =
            maturityDimension === 'age'
              ? portfolioMaturity.ageBuckets
              : portfolioMaturity.maturityRunwayBuckets;

          return (
            <div>
              <div className="w-full h-[320px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={displayBuckets}
                    margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tickFormatter={(val) =>
                        maturityMetricMode === 'volume' ? formatCompactUGX(val) : `${val}`
                      }
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      width={maturityMetricMode === 'volume' ? 70 : 40}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const bucket = payload[0].payload as LoanAgeBucket;
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[260px]">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: bucket.color }}
                                  />
                                  <span className="font-bold text-sm text-slate-100">
                                    {bucket.label}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded font-medium">
                                  {bucket.stage}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-400 mb-2.5">
                                {bucket.description}
                              </p>

                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-slate-200">
                                  <span>Outstanding Principal:</span>
                                  <span className="font-mono font-bold text-white">
                                    {formatUGX(bucket.totalPrincipalOutstanding)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300">
                                  <span>Share of Portfolio:</span>
                                  <span className="font-mono font-semibold text-emerald-400">
                                    {bucket.percentageOfOutstanding}%
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300">
                                  <span>Active Accounts:</span>
                                  <span className="font-mono font-semibold text-sky-400">
                                    {bucket.count} loan(s) ({bucket.percentageOfCount}%)
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300">
                                  <span>Average Age:</span>
                                  <span className="font-mono font-semibold text-slate-200">
                                    {bucket.averageAgeDays} days
                                  </span>
                                </div>
                                <div className="pt-2 mt-1 border-t border-slate-800 flex items-center justify-between text-[11px]">
                                  <span className="text-emerald-400 font-medium">
                                    {bucket.performingCount} Performing
                                  </span>
                                  {bucket.inArrearsCount > 0 ? (
                                    <span className="text-rose-400 font-semibold">
                                      {bucket.inArrearsCount} in Arrears
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">0 in Arrears</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey={
                        maturityMetricMode === 'volume' ? 'totalPrincipalOutstanding' : 'count'
                      }
                      name={
                        maturityMetricMode === 'volume'
                          ? 'Outstanding Principal (UGX)'
                          : 'Active Loan Count'
                      }
                      radius={[6, 6, 0, 0]}
                      onClick={(data) => {
                        const b = data as unknown as LoanAgeBucket;
                        if (b && b.bucketKey) {
                          setSelectedAgeBucketKey((prev) => (prev === b.bucketKey ? null : b.bucketKey));
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {displayBuckets.map((bucket, index) => {
                        const isSelected = selectedAgeBucketKey === bucket.bucketKey;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={bucket.color}
                            fillOpacity={selectedAgeBucketKey ? (isSelected ? 1 : 0.4) : 0.9}
                            stroke={isSelected ? '#0f172a' : 'none'}
                            strokeWidth={isSelected ? 2 : 0}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 5 Interactive Age Bucket Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
                {displayBuckets.map((bucket) => {
                  const isSelected = selectedAgeBucketKey === bucket.bucketKey;
                  return (
                    <div
                      key={bucket.bucketKey}
                      onClick={() =>
                        setSelectedAgeBucketKey((prev) =>
                          prev === bucket.bucketKey ? null : bucket.bucketKey
                        )
                      }
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-slate-800 bg-slate-50 shadow-sm ring-1 ring-slate-800'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: bucket.color }}
                          />
                          <span className="font-bold text-xs text-slate-800">{bucket.label}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {bucket.stage}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-slate-900 font-mono-num">
                        {formatCompactUGX(bucket.totalPrincipalOutstanding)}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>{bucket.percentageOfOutstanding}% portfolio</span>
                        <span className="font-semibold text-slate-700">{bucket.count} loans</span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Avg {bucket.averageAgeDays}d</span>
                        {bucket.inArrearsCount > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            {bucket.inArrearsCount} arrears
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">All current</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bucket Loan Accounts Inspector (when a bucket is clicked) */}
              {selectedAgeBucketKey && (() => {
                const activeBucket = displayBuckets.find(
                  (b) => b.bucketKey === selectedAgeBucketKey
                );
                if (!activeBucket) return null;

                return (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: activeBucket.color }}
                        />
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                          Loans in {activeBucket.label} ({activeBucket.stage}) — {activeBucket.count} Active Account(s)
                        </h4>
                      </div>
                      <button
                        onClick={() => setSelectedAgeBucketKey(null)}
                        className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        ✕ Close Inspector
                      </button>
                    </div>

                    {activeBucket.loansSummary.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        No active loans currently in this maturity bucket. Newly disbursed loans will automatically populate here.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {activeBucket.loansSummary.map((item) => {
                          const customerObj = customers.find(
                            (c) =>
                              c.id ===
                              tenantLoans.find((l) => l.id === item.id)?.customerId
                          );
                          return (
                            <div
                              key={item.id}
                              className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-900 font-mono">
                                    {item.loanNo}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                      item.status === 'in_arrears'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {item.status === 'in_arrears' ? 'In Arrears' : 'Active'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium truncate max-w-[150px]">
                                  {customerObj?.fullName || 'Borrower'}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Age: <strong className="text-slate-700">{item.ageDays}d</strong> • Remaining: <strong className="text-slate-700">{item.remainingDays}d</strong>
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-xs text-slate-900 font-mono-num">
                                  {formatUGX(item.principalOutstanding)}
                                </div>
                                <button
                                  onClick={() => {
                                    const loanObj = tenantLoans.find((l) => l.id === item.id);
                                    if (loanObj) onSelectLoan(loanObj);
                                  }}
                                  className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer mt-1 inline-block"
                                >
                                  View Loan →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Footer & Institutional Guidance Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              <strong className="text-slate-700 font-semibold">Tier 4 Portfolio Seasoning:</strong>{' '}
              Loans aged &gt;60 days have completed primary verification cycles. Loans in 0-30 days represent newly onboarded portfolio ramp-up.
            </span>
          </span>
          <span className="font-semibold text-slate-700 shrink-0">
            Active Book: {formatUGX(portfolioMaturity.totalActivePrincipalOutstanding)}
          </span>
        </div>
      </div>

      {/* SECTION: Savings Growth vs. Share Capital Trend (Trailing 6 Months) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Header & Controls Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-emerald-600" />
                Savings Growth &amp; Share Capital Trend (Trailing 6 Months)
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                SACCO / VSLA Deposit Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Trajectory of member voluntary savings deposits compared against statutory SACCO share capital equity under UMRA Tier 4 guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Series Toggle: Both | Savings Only | Shares Only */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setSavingsChartMode('both')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  savingsChartMode === 'both'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Compare both Savings and Share Capital lines"
              >
                Comparative
              </button>
              <button
                onClick={() => setSavingsChartMode('savings')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  savingsChartMode === 'savings'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Savings Account Balance growth trend only"
              >
                Savings Only
              </button>
              <button
                onClick={() => setSavingsChartMode('shares')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  savingsChartMode === 'shares'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Member Share Capital equity trend only"
              >
                Share Capital
              </button>
            </div>

            {/* Metric Mode Toggle: Volume (UGX) vs Growth Rate (%) */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setSavingsMetricView('volume')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  savingsMetricView === 'volume'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Plot balances in Uganda Shillings (UGX)"
              >
                UGX Volume
              </button>
              <button
                onClick={() => setSavingsMetricView('growth')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  savingsMetricView === 'growth'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Plot month-on-month percentage growth rates"
              >
                Growth (%)
              </button>
            </div>

            {/* Quick jump to Savings & Shares tab */}
            <button
              onClick={() => onNavigateTab('savings')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Navigate to Member Savings & Share Capital management ledger"
            >
              <span>Savings &amp; Shares</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Metric Chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Chip 1: Total Current Savings */}
          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Total Savings Liability
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatUGX(savingsGrowthData.currentTotalSavings)}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                +{savingsGrowthData.sixMonthSavingsGrowthPercent}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {savingsGrowthData.totalDepositors} active deposit accounts • 6mo +{formatCompactUGX(savingsGrowthData.sixMonthSavingsGrowthAmount)}
            </span>
          </div>

          {/* Chip 2: Total Share Capital */}
          <div className="p-3 rounded-lg bg-sky-50/60 border border-sky-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block">
              Member Share Capital
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatUGX(savingsGrowthData.currentTotalShareCapital)}
              </span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1 rounded">
                +{savingsGrowthData.sixMonthSharesGrowthPercent}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {savingsGrowthData.totalShareholders} registered shareholders • Core Tier 1 Equity
            </span>
          </div>

          {/* Chip 3: Savings to Shares Ratio */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Savings-to-Shares Ratio
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-slate-900 font-mono">
                {savingsGrowthData.savingsToSharesCurrentRatio}x
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                Healthy Thrift
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              SACCO deposit multiple against member equity base
            </span>
          </div>

          {/* Chip 4: Avg Monthly Deposit Inflow */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Avg Monthly Inflow
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-slate-900 font-mono">
                +{formatCompactUGX(savingsGrowthData.averageMonthlySavingsDeposit)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                / month
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Net thrift mobilization run rate over 6 months
            </span>
          </div>
        </div>

        {/* Recharts Line Chart Visualization */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={savingsGrowthData.monthlyData}
              margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  savingsMetricView === 'volume'
                    ? formatCompactUGX(val)
                    : `${val}%`
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const dataPoint = payload[0]?.payload as MonthlySavingsShareDataPoint;
                  if (!dataPoint) return null;

                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[220px] font-sans">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                        <span className="font-bold text-slate-200">
                          {dataPoint.fullMonth}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {dataPoint.monthKey}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {(savingsChartMode === 'both' || savingsChartMode === 'savings') && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Total Savings:
                            </span>
                            <div className="text-right">
                              <span className="font-bold text-white font-mono">
                                {formatUGX(dataPoint.totalSavingsBalance)}
                              </span>
                              {dataPoint.netSavingsChange !== 0 && (
                                <span className={`text-[10px] ml-1.5 font-semibold ${
                                  dataPoint.netSavingsChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {dataPoint.netSavingsChange >= 0 ? '+' : ''}
                                  {formatCompactUGX(dataPoint.netSavingsChange)} ({dataPoint.savingsGrowthRatePercent}%)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {(savingsChartMode === 'both' || savingsChartMode === 'shares') && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                              Share Capital:
                            </span>
                            <div className="text-right">
                              <span className="font-bold text-white font-mono">
                                {formatUGX(dataPoint.totalShareCapital)}
                              </span>
                              {dataPoint.netShareChange !== 0 && (
                                <span className={`text-[10px] ml-1.5 font-semibold ${
                                  dataPoint.netShareChange >= 0 ? 'text-sky-400' : 'text-rose-400'
                                }`}>
                                  {dataPoint.netShareChange >= 0 ? '+' : ''}
                                  {formatCompactUGX(dataPoint.netShareChange)} ({dataPoint.sharesGrowthRatePercent}%)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Deposit-to-Share Ratio:</span>
                          <span className="font-bold text-slate-200 font-mono">
                            {dataPoint.savingsToSharesRatio}x
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Active Depositors:</span>
                          <span className="font-semibold text-slate-300">
                            {dataPoint.activeSavingsAccountsCount} accounts
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
                iconType="circle"
              />

              {(savingsChartMode === 'both' || savingsChartMode === 'savings') && (
                <Line
                  type="monotone"
                  dataKey={savingsMetricView === 'volume' ? 'totalSavingsBalance' : 'savingsGrowthRatePercent'}
                  name={savingsMetricView === 'volume' ? 'Total Savings Balances (UGX)' : 'Savings MoM Growth (%)'}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 7, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {(savingsChartMode === 'both' || savingsChartMode === 'shares') && (
                <Line
                  type="monotone"
                  dataKey={savingsMetricView === 'volume' ? 'totalShareCapital' : 'sharesGrowthRatePercent'}
                  name={savingsMetricView === 'volume' ? 'Share Capital Equity (UGX)' : 'Shares MoM Growth (%)'}
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  strokeDasharray={savingsChartMode === 'both' ? '4 4' : undefined}
                  dot={{ r: 4, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 7, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 6-Month Trajectory Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          {savingsGrowthData.monthlyData.map((m, idx) => {
            const isSelected = selectedSavingsMonthKey === m.monthKey;
            const isLatest = idx === savingsGrowthData.monthlyData.length - 1;

            return (
              <div
                key={m.monthKey}
                onClick={() =>
                  setSelectedSavingsMonthKey(isSelected ? null : m.monthKey)
                }
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : isLatest
                    ? 'border-slate-300 bg-slate-50/70 hover:bg-slate-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-800">
                    {m.label}
                  </span>
                  {isLatest && (
                    <span className="text-[9px] font-bold uppercase px-1 rounded bg-emerald-100 text-emerald-800">
                      Current
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Savings:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {formatCompactUGX(m.totalSavingsBalance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Shares:</span>
                    <span className="font-bold text-sky-700 font-mono">
                      {formatCompactUGX(m.totalShareCapital)}
                    </span>
                  </div>
                </div>

                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">MoM Net:</span>
                  <span
                    className={`font-semibold font-mono ${
                      m.netSavingsChange >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {m.netSavingsChange >= 0 ? '+' : ''}
                    {formatCompactUGX(m.netSavingsChange)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Month Detail Modal/Accordion if clicked */}
        {selectedSavingsMonthKey && (() => {
          const m = savingsGrowthData.monthlyData.find((d) => d.monthKey === selectedSavingsMonthKey);
          if (!m) return null;
          return (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div>
                <span className="font-bold text-slate-900 block text-xs">
                  {m.fullMonth} Month-End Reconciled Balances
                </span>
                <span className="text-[11px] text-slate-500">
                  Total Member Savings: <strong>{formatUGX(m.totalSavingsBalance)}</strong> • Member Share Capital: <strong>{formatUGX(m.totalShareCapital)}</strong> • Ratio: <strong>{m.savingsToSharesRatio}x</strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedSavingsMonthKey(null)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          );
        })()}

        {/* Footer & Institutional Guidance Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              <strong className="text-slate-700 font-semibold">Tier 4 Liquidity Float &amp; Equity Guidance:</strong>{' '}
              Member savings deposits are callable on demand, mandating a 15% liquid cash float. Share capital forms non-withdrawable institutional core equity protecting the SACCO against unexpected loan loss impairments.
            </span>
          </span>
          <span className="font-semibold text-slate-700 shrink-0 font-mono">
            Deposit Base: {formatUGX(savingsGrowthData.currentTotalSavings)}
          </span>
        </div>
      </div>

      {/* Visual Analytics Row: 2 High-Fidelity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Collections Trend (Expected vs Actual) (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Repayment Collections: Expected vs Actual (October 2026)
              </h3>
              <p className="text-xs text-slate-500">
                Weekly recovery milestones against scheduled customer instalments.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-3 h-3 rounded-xs bg-slate-300"></span> Expected
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="w-3 h-3 rounded-xs bg-emerald-600"></span> Actual Collected
              </span>
            </div>
          </div>

          {/* SVG Bar / Area visualization */}
          <div className="h-64 flex items-end gap-6 pt-6 pb-2 px-2 border-b border-slate-200">
            {weeklyTrend.map((item, idx) => {
              const expectedHeight = Math.round((item.expected / maxWeekly) * 180);
              const actualHeight = Math.round((item.actual / maxWeekly) * 180);
              const variancePercent = Math.round((item.actual / item.expected) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-[11px] font-bold text-slate-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {variancePercent}%
                  </div>
                  <div className="w-full flex items-end justify-center gap-2">
                    {/* Expected bar */}
                    <div
                      className="w-1/2 bg-slate-200 group-hover:bg-slate-300 rounded-t-md transition-all relative"
                      style={{ height: `${expectedHeight}px` }}
                      title={`Expected: ${formatUGX(item.expected)}`}
                    />
                    {/* Actual bar */}
                    <div
                      className="w-1/2 bg-emerald-600 group-hover:bg-emerald-700 rounded-t-md transition-all shadow-xs relative"
                      style={{ height: `${actualHeight}px` }}
                      title={`Actual: ${formatUGX(item.actual)}`}
                    />
                  </div>
                  <span className="mt-3 text-xs font-semibold text-slate-600">
                    {item.week}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    {formatCompactUGX(item.actual)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-2">
            <span>Overall Collection Rate: <strong className="text-emerald-700">96.8%</strong></span>
            <span>Total Month Variance: <strong className="text-slate-800 font-mono-num">-UGX 950,000</strong></span>
          </div>
        </div>

        {/* Chart 2: Portfolio Composition by Loan Product (Donut & Breakdown) (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-600" />
                Loan Portfolio by Product
              </h3>
              <span className="text-xs text-slate-500 font-mono-num">
                Total {formatCompactUGX(89_000_000)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Asset allocation across micro-enterprise, asset finance, and agriculture.
            </p>

            {/* Segmented Bar Visualization */}
            <div className="w-full h-5 rounded-lg overflow-hidden flex shadow-inner mb-4">
              {productDistribution.map((prod, idx) => (
                <div
                  key={idx}
                  className="h-full transition-all duration-300 hover:opacity-90 cursor-pointer"
                  style={{ width: `${prod.percent}%`, backgroundColor: prod.color }}
                  title={`${prod.name}: ${prod.percent}% (${formatUGX(prod.amount)})`}
                  onMouseEnter={() => setSelectedProductHover(prod.name)}
                  onMouseLeave={() => setSelectedProductHover(null)}
                />
              ))}
            </div>

            {/* Product breakdown list */}
            <div className="space-y-2.5">
              {productDistribution.map((prod, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg transition-colors flex items-center justify-between text-xs ${
                    selectedProductHover === prod.name ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: prod.color }}
                    />
                    <div>
                      <p className="font-semibold text-slate-800">{prod.name}</p>
                      <p className="text-[11px] text-slate-500">{prod.count} active accounts</p>
                    </div>
                  </div>
                  <div className="text-right font-mono-num">
                    <p className="font-bold text-slate-900">{formatCompactUGX(prod.amount)}</p>
                    <p className="text-[11px] text-slate-500">{prod.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Tier 4 Diversification Index:</span>
            <span className="font-semibold text-emerald-600">Optimal (Low Risk)</span>
          </div>
        </div>
      </div>

      {/* Row 3: Arrears Aging Distribution + Urgent Loan Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Arrears Aging Buckets (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Arrears Aging & PAR Distribution
            </h3>
            <span className="text-xs font-semibold text-slate-500">UMRA Grading</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Aging analysis of scheduled installments overdue. Accounts past 30 days trigger PAR provisioning.
          </p>

          <div className="space-y-3">
            {agingBuckets.map((bucket, idx) => {
              const maxBucketAmount = 15_000_000;
              const widthPercent = Math.min(100, Math.round((bucket.amount / maxBucketAmount) * 100));

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{bucket.label}</span>
                    <span className="font-mono-num text-slate-900 font-bold">
                      {formatUGX(bucket.amount)}{' '}
                      <span className="text-slate-400 font-normal">({bucket.count})</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bucket.color}`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <p className="font-semibold mb-0.5">Statutory Provisioning Notice:</p>
            <p className="text-[11px] text-amber-800">
              Loans in 31-60d require a 25% impairment provision; 61-90d require 50%; 90+d (NPL) require 100% full loss provisioning under Tier 4 guidelines.
            </p>
          </div>
        </div>

        {/* Priority Collections & Overdue Queue (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Due Today & Overdue Collections Queue
                </h3>
                <p className="text-xs text-slate-500">
                  Borrowers with instalments maturing today or under active recovery follow-up.
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('collections')}
                className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
              >
                View Full Queue →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-2">Loan No.</th>
                    <th className="py-2.5 px-2">Customer</th>
                    <th className="py-2.5 px-2 text-right">Balance</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {urgentLoans.slice(0, 4).map((loan) => {
                    const cust = customers.find((c) => c.id === loan.customerId);
                    const isOverdue = loan.status === 'in_arrears' || loan.daysPastDue > 0;

                    return (
                      <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-2 font-mono-num font-bold text-slate-900">
                          {loan.loanNo}
                        </td>
                        <td className="py-2.5 px-2">
                          <p className="font-semibold text-slate-800">{cust?.fullName || 'Borrower'}</p>
                          <p className="text-[11px] text-slate-500">{cust?.phone}</p>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono-num font-bold text-slate-800">
                          {formatUGX(loan.principalOutstanding)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {isOverdue ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              {loan.daysPastDue}d Arrears
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Due Today
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onQuickCollect(loan)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                              title="Post Repayment"
                            >
                              Collect
                            </button>
                            <button
                              onClick={() => onSelectLoan(loan)}
                              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Fast teller lookup enabled for MTN & Airtel MoMo callbacks</span>
            <button
              onClick={() => onNavigateTab('teller')}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              Open Cashier Terminal →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
