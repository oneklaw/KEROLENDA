import React, { useState } from 'react';
import { ShareAccount, Customer, Tenant, AppUser } from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import { generatePDFReport } from '../utils/pdfExport';
import {
  PieChart,
  Percent,
  X,
  DollarSign,
  Users,
  ShieldCheck,
  Download,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

interface DividendProjectionModalProps {
  tenant: Tenant;
  currentUser: AppUser;
  shareAccounts: ShareAccount[];
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
}

export const DividendProjectionModal: React.FC<DividendProjectionModalProps> = ({
  tenant,
  currentUser,
  shareAccounts,
  customers,
  isOpen,
  onClose,
}) => {
  const tenantShares = shareAccounts.filter((s) => s.tenantId === tenant.id);

  // Calculation parameters
  const [projectionMode, setProjectionMode] = useState<'rate' | 'profit_pool'>('rate');
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(14.5); // 14.5% p.a.
  const [netSurplusPoolUGX, setNetSurplusPoolUGX] = useState<number>(8_500_000); // 8.5M surplus
  const [statutoryReservePercent, setStatutoryReservePercent] = useState<number>(20); // 20% mandatory statutory reserve retention per Cooperatives Act

  if (!isOpen) return null;

  const totalUnits = tenantShares.reduce((sum, s) => sum + s.unitsHeld, 0);
  const totalShareCapitalUGX = tenantShares.reduce((sum, s) => sum + s.totalValueUGX, 0);

  // Calculate gross and net distributable dividends
  let grossDividendPool = 0;
  if (projectionMode === 'rate') {
    grossDividendPool = Math.round((totalShareCapitalUGX * annualReturnRate) / 100);
  } else {
    grossDividendPool = netSurplusPoolUGX;
  }

  const statutoryReserveUGX = Math.round((grossDividendPool * statutoryReservePercent) / 100);
  const netDistributableDividendUGX = Math.max(0, grossDividendPool - statutoryReserveUGX);
  const dividendPerUnitUGX = totalUnits > 0 ? Math.round(netDistributableDividendUGX / totalUnits) : 0;
  const effectiveReturnOnEquity = totalShareCapitalUGX > 0 ? ((netDistributableDividendUGX / totalShareCapitalUGX) * 100).toFixed(2) : '0.00';

  // Member allocations
  const memberProjections = tenantShares.map((account) => {
    const cust = customers.find((c) => c.id === account.customerId);
    const memberDividendUGX = account.unitsHeld * dividendPerUnitUGX;
    const shareOfPoolPercent = totalUnits > 0 ? ((account.unitsHeld / totalUnits) * 100).toFixed(1) : '0.0';

    return {
      accountNo: account.accountNo,
      memberName: cust?.fullName || 'Member',
      phone: cust?.phone || 'N/A',
      unitsHeld: account.unitsHeld,
      equityValueUGX: account.totalValueUGX,
      shareOfPoolPercent,
      projectedDividendUGX: memberDividendUGX,
    };
  });

  const handleExportPDF = () => {
    generatePDFReport({
      title: 'Projected Share Capital Dividend Allocation',
      subtitle: `Annual dividend distribution model based on ${projectionMode === 'rate' ? `${annualReturnRate}% target return` : `UGX ${formatUGX(netSurplusPoolUGX)} surplus`} (less ${statutoryReservePercent}% statutory reserve)`,
      tenant,
      user: currentUser,
      filename: `${tenant.slug}_dividend_projection_${new Date().toISOString().slice(0, 10)}.pdf`,
      columns: [
        { header: 'Account No', dataKey: 'accountNo' },
        { header: 'Member Name', dataKey: 'memberName' },
        { header: 'Units Held', dataKey: 'units' },
        { header: 'Share Equity (UGX)', dataKey: 'equity' },
        { header: 'Pool %', dataKey: 'poolShare' },
        { header: 'Projected Dividend (UGX)', dataKey: 'dividend' },
      ],
      rows: memberProjections.map((m) => ({
        accountNo: m.accountNo,
        memberName: m.memberName,
        units: m.unitsHeld,
        equity: formatUGX(m.equityValueUGX),
        poolShare: `${m.shareOfPoolPercent}%`,
        dividend: formatUGX(m.projectedDividendUGX),
      })),
      summaryItems: [
        { label: 'Total Share Units', value: String(totalUnits) },
        { label: 'Share Capital Base', value: `UGX ${formatUGX(totalShareCapitalUGX)}` },
        { label: 'Net Dividend Pool', value: `UGX ${formatUGX(netDistributableDividendUGX)}` },
        { label: 'Dividend / Unit', value: `UGX ${formatUGX(dividendPerUnitUGX)}` },
      ],
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: tenant.branding?.primaryColor || '#0f766e' }}
            >
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Share Account Dividend Payout Projection Tool</h3>
              <p className="text-[11px] text-slate-300">
                Simulate member dividend distribution based on statutory retained reserves and annual return yield
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="p-6 space-y-5">
          {/* Simulation Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Projection Method</label>
              <div className="inline-flex w-full rounded-lg bg-white p-1 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setProjectionMode('rate')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer text-center ${
                    projectionMode === 'rate' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Return Rate (%)
                </button>
                <button
                  type="button"
                  onClick={() => setProjectionMode('profit_pool')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer text-center ${
                    projectionMode === 'profit_pool' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Surplus Pool (UGX)
                </button>
              </div>
            </div>

            {projectionMode === 'rate' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Projected Annual Return Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="50"
                    value={annualReturnRate}
                    onChange={(e) => setAnnualReturnRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">% p.a.</span>
                </div>
                <div className="flex gap-1.5 mt-1">
                  {[10, 12, 14.5, 18].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAnnualReturnRate(r)}
                      className="px-2 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 rounded font-medium text-slate-700"
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Net Audited Surplus Pool (UGX)
                </label>
                <input
                  type="number"
                  step="500000"
                  min="100000"
                  value={netSurplusPoolUGX}
                  onChange={(e) => setNetSurplusPoolUGX(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-bold font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Statutory Reserve Retention (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={statutoryReservePercent}
                  onChange={(e) => setStatutoryReservePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">% reserve</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Uganda Cooperative Societies Act requires 20% reserve fund retention.
              </p>
            </div>
          </div>

          {/* Calculated Output Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Share Units</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {totalUnits.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({tenantShares.length} members)
                </span>
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Share Capital Equity</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                UGX {formatCompactUGX(totalShareCapitalUGX)}
              </span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Net Dividend Payout Pool</span>
              <span className="text-base font-extrabold text-emerald-950 font-mono">
                UGX {formatCompactUGX(netDistributableDividendUGX)}
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Dividend Per Share Unit</span>
              <span className="text-base font-extrabold text-amber-950 font-mono">
                UGX {formatUGX(dividendPerUnitUGX)}
              </span>
            </div>
          </div>

          {/* Member Allocation Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Member Dividend Distribution Breakdown ({memberProjections.length} Share Accounts)
              </h4>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Effective Yield: {effectiveReturnOnEquity}% on Capital
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Account #</th>
                    <th className="py-2 px-3">Member Name</th>
                    <th className="py-2 px-3 text-right">Units Held</th>
                    <th className="py-2 px-3 text-right">Equity Value (UGX)</th>
                    <th className="py-2 px-3 text-right">Pool Share</th>
                    <th className="py-2 px-3 text-right">Projected Dividend (UGX)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {memberProjections.map((m) => (
                    <tr key={m.accountNo} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-600">{m.accountNo}</td>
                      <td className="py-2 px-3 font-sans font-bold text-slate-900">{m.memberName}</td>
                      <td className="py-2 px-3 text-right text-slate-800">{m.unitsHeld}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{formatUGX(m.equityValueUGX)}</td>
                      <td className="py-2 px-3 text-right text-slate-500 font-sans">{m.shareOfPoolPercent}%</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        UGX {formatUGX(m.projectedDividendUGX)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <p className="text-[11px] text-slate-500">
              Statutory reserve deduction: <strong>UGX {formatUGX(statutoryReserveUGX)}</strong> ({statutoryReservePercent}% retained in Institutional Capital).
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Export Dividend Schedule PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
