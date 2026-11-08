import React, { useState } from 'react';
import { Tenant, Branch, AppUser, ShareAccount, Customer } from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  calculateDividendProjection,
  exportDividendScheduleCSV,
  DividendProjectionResult,
} from '../utils/dividendCalculator';
import {
  PieChart,
  Percent,
  DollarSign,
  TrendingUp,
  Download,
  RotateCcw,
  ShieldCheck,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  Coins,
  ArrowRight,
} from 'lucide-react';

interface DividendCalculatorWidgetProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  shareAccounts: ShareAccount[];
  customers: Customer[];
}

export const DividendCalculatorWidget: React.FC<DividendCalculatorWidgetProps> = ({
  tenant,
  branch,
  currentUser,
  shareAccounts = [],
  customers = [],
}) => {
  const tenantShares = shareAccounts.filter((s) => s.tenantId === tenant.id);
  const actualLedgerShareCapital = tenantShares.reduce((sum, s) => sum + s.totalValueUGX, 0);

  // Simulation inputs
  const [shareCapitalInput, setShareCapitalInput] = useState<number>(actualLedgerShareCapital || 16_800_000);
  const [performanceRate, setPerformanceRate] = useState<number>(12.0); // 12% p.a.
  const [statutoryReservePercent, setStatutoryReservePercent] = useState<number>(20); // 20% Cooperatives Act
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState<number>(15); // 15% statutory WHT
  const [feedback, setFeedback] = useState<string | null>(null);

  const projection: DividendProjectionResult = calculateDividendProjection({
    totalShareCapitalUGX: shareCapitalInput,
    annualPerformanceRatePercent: performanceRate,
    statutoryReservePercent,
    withholdingTaxPercent,
    shareAccounts: tenantShares,
    customers,
  });

  const handleResetToActual = () => {
    setShareCapitalInput(actualLedgerShareCapital || 16_800_000);
    setPerformanceRate(12.0);
    setStatutoryReservePercent(20);
    setWithholdingTaxPercent(15);
  };

  const handleDownloadCSV = () => {
    const csvContent = exportDividendScheduleCSV(projection, tenant.displayName);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tenant.slug}_dividend_projection_${performanceRate}pct.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback('Dividend schedule CSV exported successfully!');
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <PieChart className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white tracking-tight">
                Share Capital Dividend Projection Calculator
              </h3>
              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                Cooperatives Act Compliant
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Simulate and model aggregate dividend distributions across varying institutional performance tiers and member share accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToActual}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Actuals
          </button>
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV Allocation
          </button>
        </div>
      </div>

      {feedback && (
        <div className="mx-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="p-6 pt-0 space-y-6">
        {/* Input Parameters vs Projected Key KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Simulation Parameters */}
          <div className="lg:col-span-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-indigo-600" />
              Dividend Performance Drivers
            </h4>

            {/* Share Capital Balance Input */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Total Share Capital Balance (UGX)
                </label>
                <span className="font-bold text-sm text-indigo-700 font-mono-num">
                  {formatUGX(shareCapitalInput)}
                </span>
              </div>
              <input
                type="number"
                min={1_000_000}
                max={500_000_000}
                step={500_000}
                value={shareCapitalInput}
                onChange={(e) => setShareCapitalInput(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono-num focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Current Ledger Total: {formatUGX(actualLedgerShareCapital)}</span>
                <button
                  type="button"
                  onClick={() => setShareCapitalInput(actualLedgerShareCapital)}
                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Use Exact Ledger Balance
                </button>
              </div>
            </div>

            {/* Performance Return Rate (%) with Benchmarks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Annual Return / Performance Percentage: <strong className="text-indigo-700">{performanceRate}%</strong>
                </label>
                <span className="text-[11px] text-slate-400">Target Return Rate</span>
              </div>
              <input
                type="range"
                min={2}
                max={30}
                step={0.5}
                value={performanceRate}
                onChange={(e) => setPerformanceRate(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />

              {/* Scenario Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[5, 8, 10, 12, 14.5, 18, 20].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPerformanceRate(rate)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      performanceRate === rate
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Statutory Reserves & Tax Adjustments */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Statutory Reserve (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={statutoryReservePercent}
                    onChange={(e) => setStatutoryReservePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono-num focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-7"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">20% Cooperatives Act mandatory</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Withholding Tax (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={withholdingTaxPercent}
                    onChange={(e) => setWithholdingTaxPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono-num focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-7"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">15% standard URA dividend WHT</span>
              </div>
            </div>
          </div>

          {/* RIGHT: High-Impact KPI Projections */}
          <div className="lg:col-span-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Projected Payout Results ({performanceRate}%)
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                {projection.totalUnitsHeld} Paid-Up Units
              </span>
            </div>

            {/* Top Net Payout Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 font-medium">Net Distributable Cash to Shareholders</span>
              <p className="text-2xl font-black text-indigo-900 font-mono-num mt-1">
                {formatUGX(projection.netDividendPayoutUGX)}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                <span>Per Share Payout: <strong className="text-emerald-700 font-mono-num">{formatUGX(projection.dividendPerShareUnitUGX)}</strong></span>
                <span>•</span>
                <span>Effective Net Yield: <strong className="text-indigo-700 font-mono-num">{projection.effectiveNetYieldPercent}%</strong></span>
              </div>
            </div>

            {/* Waterfall Allocation Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Gross Pool ({performanceRate}%)</span>
                <span className="text-xs font-bold text-slate-900 font-mono-num">
                  {formatUGX(projection.grossDividendPoolUGX)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Statutory Reserve ({statutoryReservePercent}%)</span>
                <span className="text-xs font-bold text-amber-700 font-mono-num">
                  {formatUGX(projection.statutoryReserveUGX)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Distributable Pre-Tax</span>
                <span className="text-xs font-bold text-slate-900 font-mono-num">
                  {formatUGX(projection.distributableDividendPoolUGX)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Withholding Tax ({withholdingTaxPercent}%)</span>
                <span className="text-xs font-bold text-rose-700 font-mono-num">
                  {formatUGX(projection.totalWithholdingTaxUGX)}
                </span>
              </div>
            </div>

            {/* Statutory Compliance note */}
            <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-[11px] text-indigo-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                Under the Uganda Cooperative Societies Act, dividends may only be paid from realized net operational surplus after retaining statutory reserves and satisfying member obligations.
              </span>
            </div>
          </div>
        </div>

        {/* Varying Performance Scenarios Comparison Grid */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Varying Performance Scenario Comparison
            </h4>
            <span className="text-[11px] text-slate-500">Side-by-side sensitivity analysis</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {projection.varyingPerformanceScenarios.map((sc) => {
              const isSelected = performanceRate === sc.ratePercent;
              return (
                <button
                  key={sc.ratePercent}
                  type="button"
                  onClick={() => setPerformanceRate(sc.ratePercent)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-900">{sc.ratePercent}%</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">Net Payout:</span>
                  <p className="text-xs font-bold text-slate-900 font-mono-num truncate">
                    {formatCompactUGX(sc.netPayoutUGX)}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-mono-num block mt-0.5">
                    {formatUGX(sc.dividendPerShareUGX)}/sh
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Member-by-Member Allocation Table */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              Shareholder Allocation Schedule ({projection.memberAllocations.length} Members)
            </h4>
            <span className="text-[11px] text-slate-500">Pro-rata equity breakdown</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Account No</th>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3 text-right">Units Held</th>
                  <th className="py-2.5 px-3 text-right">Share Capital (UGX)</th>
                  <th className="py-2.5 px-3 text-right">Ownership</th>
                  <th className="py-2.5 px-3 text-right">Gross Dividend</th>
                  <th className="py-2.5 px-3 text-right">WHT (15%)</th>
                  <th className="py-2.5 px-3 text-right">Net Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-num text-slate-700">
                {projection.memberAllocations.map((m) => (
                  <tr key={m.accountId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-900">{m.accountNo}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">{m.memberName}</td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-700">{m.unitsHeld}</td>
                    <td className="py-2 px-3 text-right">{formatUGX(m.shareCapitalUGX)}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{m.ownershipPercent}%</td>
                    <td className="py-2 px-3 text-right">{formatUGX(m.grossDividendUGX)}</td>
                    <td className="py-2 px-3 text-right text-rose-600">{formatUGX(m.withholdingTaxUGX)}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-800">{formatUGX(m.netDividendUGX)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
