import React, { useState } from 'react';
import { Loan, ExpenseItem, ExpenseBudget, ChartAccount, Tenant } from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';

interface LiquidityForecastingWidgetProps {
  tenant: Tenant;
  loans: Loan[];
  expenses: ExpenseItem[];
  budgets: ExpenseBudget[];
  accounts: ChartAccount[];
}

export const LiquidityForecastingWidget: React.FC<LiquidityForecastingWidgetProps> = ({
  tenant,
  loans,
  expenses,
  budgets,
  accounts,
}) => {
  const [safetyBufferPercent, setSafetyBufferPercent] = useState<number>(15); // 15% statutory liquidity ratio

  // 1. Current liquid cash float from GL accounts (Cash till, MoMo, Bank accounts)
  const tenantAccounts = accounts.filter((a) => a.tenantId === tenant.id);
  const liquidAccounts = tenantAccounts.filter(
    (a) => a.code === '1000' || a.code === '1010' || a.code === '1020'
  );
  const currentCashFloat = liquidAccounts.reduce((sum, a) => sum + Math.max(0, a.currentBalance), 0);

  // Demand liabilities (savings deposits code 2000)
  const savingsLiabilities = tenantAccounts
    .filter((a) => a.code === '2000')
    .reduce((sum, a) => sum + Math.max(0, a.currentBalance), 0);
  const requiredSafetyBufferUGX = Math.round((savingsLiabilities * safetyBufferPercent) / 100);

  // 2. Expected Loan Inflows over next 30 days
  // Compute from tenant loans schedule
  const tenantLoans = loans.filter((l) => l.tenantId === tenant.id && (l.status === 'active' || l.status === 'in_arrears'));

  // Weekly periods: Days 1-7, Days 8-14, Days 15-21, Days 22-30
  const periods = [
    { label: 'Week 1 (Day 1–7)', days: 7, inflowRatio: 0.32, expenseRatio: 0.22 },
    { label: 'Week 2 (Day 8–14)', days: 7, inflowRatio: 0.24, expenseRatio: 0.28 }, // rent/utilities due
    { label: 'Week 3 (Day 15–21)', days: 7, inflowRatio: 0.26, expenseRatio: 0.20 },
    { label: 'Week 4 (Day 22–30)', days: 9, inflowRatio: 0.18, expenseRatio: 0.30 }, // payroll due
  ];

  // Total monthly expected loan repayments
  const monthlyRepaymentDue = tenantLoans.reduce((sum, l) => {
    const upcoming = l.schedule.filter((inst) => inst.status !== 'paid').slice(0, 1);
    return sum + (upcoming[0]?.totalDue || 0);
  }, 0) || 18_500_000;

  // Total monthly budgeted operational expense outlays
  const monthlyBudgetedSpend = budgets.reduce((sum, b) => sum + b.monthlyBudgetUGX, 0) || 8_200_000;

  // Planned new disbursements in 30 days
  const plannedDisbursements = 6_000_000;

  // Build cumulative forecast intervals
  let runningCash = currentCashFloat;
  const forecastIntervals = periods.map((p) => {
    const inflow = Math.round(monthlyRepaymentDue * p.inflowRatio);
    const outflow = Math.round((monthlyBudgetedSpend + plannedDisbursements) * p.expenseRatio);
    const netFlow = inflow - outflow;
    runningCash += netFlow;

    return {
      label: p.label,
      inflow,
      outflow,
      netFlow,
      projectedBalance: runningCash,
    };
  });

  const finalProjectedCash = runningCash;
  const net30DayChange = finalProjectedCash - currentCashFloat;
  const isHealthy = finalProjectedCash > requiredSafetyBufferUGX * 1.5;
  const isModerate = finalProjectedCash >= requiredSafetyBufferUGX && !isHealthy;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              30-Day Liquidity & Cash Flow Forecast
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isHealthy
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : isModerate
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {isHealthy ? 'Optimal Liquidity' : isModerate ? 'Moderate Float' : 'Liquidity Pressure'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Cash availability estimated from active loan installment collections, scheduled payroll/rent, and minimum reserves
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">Statutory Buffer:</span>
          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            UGX {formatCompactUGX(requiredSafetyBufferUGX)} ({safetyBufferPercent}%)
          </span>
        </div>
      </div>

      {/* Top 3 KPI Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Starting Cash & Float</span>
          <span className="text-sm font-extrabold text-slate-900 font-mono">
            UGX {formatCompactUGX(currentCashFloat)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Till, MoMo & Stanbic Bank</span>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            30d Expected Inflows
          </span>
          <span className="text-sm font-extrabold text-emerald-950 font-mono">
            + UGX {formatCompactUGX(monthlyRepaymentDue)}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">Scheduled loan repayments</span>
        </div>

        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <span className="text-[10px] font-bold text-rose-800 uppercase block flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-rose-600" />
            30d Expected Outflows
          </span>
          <span className="text-sm font-extrabold text-rose-950 font-mono">
            - UGX {formatCompactUGX(monthlyBudgetedSpend + plannedDisbursements)}
          </span>
          <span className="text-[10px] text-rose-700 block mt-0.5">OpEx budget + disbursements</span>
        </div>

        <div className="p-3 bg-slate-900 text-white rounded-xl">
          <span className="text-[10px] font-bold text-slate-300 uppercase block">Projected Cash (Day 30)</span>
          <span className="text-sm font-extrabold text-emerald-400 font-mono">
            UGX {formatCompactUGX(finalProjectedCash)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {net30DayChange >= 0 ? '+' : ''}UGX {formatCompactUGX(net30DayChange)} net change
          </span>
        </div>
      </div>

      {/* Trajectory Breakdown Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Weekly Cash Trajectory & Net Liquidity Progression</span>
          <span className="text-[11px] font-normal text-slate-400">All amounts in UGX</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {forecastIntervals.map((interval, idx) => (
            <div
              key={interval.label}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800">{interval.label}</span>
                <span className="text-[10px] text-slate-400">P{idx + 1}</span>
              </div>

              <div className="text-xs space-y-0.5 font-mono">
                <div className="flex justify-between text-emerald-700 text-[11px]">
                  <span className="text-slate-500 font-sans">Inflows:</span>
                  <span>+{formatCompactUGX(interval.inflow)}</span>
                </div>
                <div className="flex justify-between text-rose-700 text-[11px]">
                  <span className="text-slate-500 font-sans">Outflows:</span>
                  <span>-{formatCompactUGX(interval.outflow)}</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200 flex justify-between items-baseline font-mono">
                <span className="text-[10px] text-slate-500 font-sans">End Float:</span>
                <span className="text-xs font-bold text-slate-900">
                  {formatCompactUGX(interval.projectedBalance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
