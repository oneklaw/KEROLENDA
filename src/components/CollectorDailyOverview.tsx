import React from 'react';
import { Loan, Customer, RecoveryCase, Tenant } from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  AlertTriangle,
  PhoneCall,
  CalendarCheck,
  ChevronRight,
  Receipt,
  UserCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface CollectorDailyOverviewProps {
  tenant: Tenant;
  loans: Loan[];
  customers: Customer[];
  recoveryCases: RecoveryCase[];
  onQuickCollect: (loan: Loan) => void;
  onNavigateToCollections: () => void;
}

export const CollectorDailyOverview: React.FC<CollectorDailyOverviewProps> = ({
  tenant,
  loans,
  customers,
  recoveryCases,
  onQuickCollect,
  onNavigateToCollections,
}) => {
  const tenantLoans = loans.filter((l) => l.tenantId === tenant.id);
  const tenantCases = recoveryCases.filter((c) => c.tenantId === tenant.id);

  // Active recovery cases
  const activeCases = tenantCases.filter((c) => c.status !== 'resolved');
  const totalArrearsUGX = activeCases.reduce((sum, c) => sum + c.totalArrearsUGX, 0);

  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Extract all pending promises to pay
  const allPTPs = activeCases.flatMap((c) =>
    c.promisesToPay
      .filter((p) => p.status === 'pending')
      .map((p) => ({
        ...p,
        caseId: c.id,
        customerId: c.customerId,
        loanId: c.loanId,
        daysPastDue: c.daysPastDue,
      }))
  );

  // PTPs due today
  const ptpsToday = allPTPs.filter((p) => p.promisedDate <= todayStr);
  const totalPtpTodayUGX = ptpsToday.reduce((sum, p) => sum + p.promisedAmount, 0);

  // Top 5 at-risk loans (ranked by highest days past due then highest outstanding principal)
  const atRiskLoans = [...tenantLoans]
    .filter((l) => l.daysPastDue > 0 && l.principalOutstanding > 0)
    .sort((a, b) => b.daysPastDue - a.daysPastDue || b.principalOutstanding - a.principalOutstanding)
    .slice(0, 5);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Collector Daily Overview</h3>
            <p className="text-xs text-slate-500">
              Active recovery operations, today's promised payments, and prioritized arrears watchlist
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToCollections}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
        >
          <span>Collections Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Active Recovery Cases</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="text-base font-extrabold text-slate-900 font-mono">
            {activeCases.length}{' '}
            <span className="text-xs font-normal text-slate-500">
              (UGX {formatCompactUGX(totalArrearsUGX)} arrears)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
              <CalendarCheck className="w-3 h-3 text-emerald-700" />
              Promised Payments Today
            </span>
            <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded-full">
              {ptpsToday.length} Due
            </span>
          </div>
          <div className="text-base font-extrabold text-emerald-950 font-mono">
            UGX {formatCompactUGX(totalPtpTodayUGX)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-amber-800 uppercase">At-Risk Loan Ratio</span>
            <span className="text-[10px] font-bold text-amber-700">DPD &gt; 0</span>
          </div>
          <div className="text-base font-extrabold text-amber-950 font-mono">
            {atRiskLoans.length} Severe{' '}
            <span className="text-xs font-normal text-amber-800">
              / {tenantLoans.filter((l) => l.daysPastDue > 0).length} Total
            </span>
          </div>
        </div>
      </div>

      {/* Top 5 At-Risk Loans Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">Top 5 At-Risk Loans Requiring Urgent Action</span>
          <span className="text-slate-400 text-[11px]">Ranked by Days Past Due</span>
        </div>

        {atRiskLoans.length === 0 ? (
          <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            No loans currently in arrears. Portfolio performing at 100%!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {atRiskLoans.map((loan) => {
              const cust = customers.find((c) => c.id === loan.customerId);
              const relatedCase = tenantCases.find((c) => c.loanId === loan.id);

              return (
                <div
                  key={loan.id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{cust?.fullName || 'Borrower'}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {loan.loanNo}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                        {loan.daysPastDue} DPD
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Principal: UGX {formatUGX(loan.principalOutstanding)}</span>
                      <span>•</span>
                      <span>Phone: {cust?.phone}</span>
                      {relatedCase && relatedCase.lastContactOutcome && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-600 truncate max-w-xs">
                            "{relatedCase.lastContactOutcome.slice(0, 45)}..."
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onQuickCollect(loan)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Collect
                    </button>
                    <button
                      onClick={onNavigateToCollections}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
                      title="Open case notes"
                    >
                      <PhoneCall className="w-3 h-3 text-slate-500" />
                      Log Call
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
