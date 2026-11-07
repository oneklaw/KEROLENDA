import React from 'react';
import { Loan, Tenant } from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import { AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, Info } from 'lucide-react';

export interface PARAgingReportProps {
  tenant: Tenant;
  loans: Loan[];
  selectedBucket?: string | null;
  onSelectBucket?: (bucketKey: string | null) => void;
}

export interface AgingBucketMetric {
  key: string;
  label: string;
  rangeDesc: string;
  minDPD: number;
  maxDPD: number;
  count: number;
  outstandingPrincipal: number;
  percentOfPortfolio: number;
  statutoryProvisionRate: number; // Percentage per UMRA guidelines
  provisionAmountUGX: number;
  colorClass: string;
  badgeClass: string;
}

export const PARAgingReport: React.FC<PARAgingReportProps> = ({
  tenant,
  loans,
  selectedBucket,
  onSelectBucket,
}) => {
  const tenantLoans = loans.filter((l) => l.tenantId === tenant.id);
  const totalOutstanding = tenantLoans.reduce((sum, l) => sum + (l.principalOutstanding || 0), 0);

  // Define aging buckets
  const bucketConfigs = [
    {
      key: 'current',
      label: 'Current / Performing',
      rangeDesc: '0 Days Past Due',
      minDPD: 0,
      maxDPD: 0,
      provisionRate: 1, // 1% general provision
      colorClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      key: '1-30',
      label: '1 – 30 Days',
      rangeDesc: 'Watchlist / Early Arrears',
      minDPD: 1,
      maxDPD: 30,
      provisionRate: 5, // 5% statutory provision
      colorClass: 'bg-amber-400',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      key: '31-60',
      label: '31 – 60 Days',
      rangeDesc: 'Substandard (PAR 30)',
      minDPD: 31,
      maxDPD: 60,
      provisionRate: 20, // 20% statutory provision
      colorClass: 'bg-orange-500',
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    },
    {
      key: '61-90',
      label: '61 – 90 Days',
      rangeDesc: 'Doubtful (PAR 60)',
      minDPD: 61,
      maxDPD: 90,
      provisionRate: 50, // 50% statutory provision
      colorClass: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    },
    {
      key: '90+',
      label: '90+ Days',
      rangeDesc: 'Loss / Non-Performing (NPL)',
      minDPD: 91,
      maxDPD: 999999,
      provisionRate: 100, // 100% full provision
      colorClass: 'bg-rose-700',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    },
  ];

  const buckets: AgingBucketMetric[] = bucketConfigs.map((cfg) => {
    const matchingLoans = tenantLoans.filter((l) => {
      if (cfg.minDPD === 0 && cfg.maxDPD === 0) {
        return l.daysPastDue === 0;
      }
      return l.daysPastDue >= cfg.minDPD && l.daysPastDue <= cfg.maxDPD;
    });

    const outstandingPrincipal = matchingLoans.reduce((sum, l) => sum + (l.principalOutstanding || 0), 0);
    const percentOfPortfolio = totalOutstanding > 0 ? (outstandingPrincipal / totalOutstanding) * 100 : 0;
    const provisionAmountUGX = Math.round((outstandingPrincipal * cfg.provisionRate) / 100);

    return {
      key: cfg.key,
      label: cfg.label,
      rangeDesc: cfg.rangeDesc,
      minDPD: cfg.minDPD,
      maxDPD: cfg.maxDPD,
      count: matchingLoans.length,
      outstandingPrincipal,
      percentOfPortfolio: parseFloat(percentOfPortfolio.toFixed(1)),
      statutoryProvisionRate: cfg.provisionRate,
      provisionAmountUGX,
      colorClass: cfg.colorClass,
      badgeClass: cfg.badgeClass,
    };
  });

  // Calculate PAR > 30 Days (all loans with DPD > 30)
  const par30Loans = tenantLoans.filter((l) => l.daysPastDue > 30);
  const par30Principal = par30Loans.reduce((sum, l) => sum + (l.principalOutstanding || 0), 0);
  const par30Rate = totalOutstanding > 0 ? ((par30Principal / totalOutstanding) * 100).toFixed(1) : '0.0';
  const totalProvisionsRequired = buckets.reduce((sum, b) => sum + b.provisionAmountUGX, 0);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header and Aggregate Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Portfolio At Risk (PAR) & Statutory Arrears Aging
          </h3>
          <p className="text-xs text-slate-500">
            Computed per Uganda Microfinance Regulatory Authority (UMRA) loan classification standards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-right">
            <span className="text-[10px] font-semibold text-amber-800 uppercase block">PAR &gt; 30 Days</span>
            <span className="text-sm font-black text-amber-950 font-mono">
              {par30Rate}% <span className="text-xs font-normal">({formatCompactUGX(par30Principal)})</span>
            </span>
          </div>

          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right">
            <span className="text-[10px] font-semibold text-slate-600 uppercase block">Total Statutory Reserve</span>
            <span className="text-sm font-black text-slate-900 font-mono">
              UGX {formatCompactUGX(totalProvisionsRequired)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Aging Bar */}
      <div className="space-y-1.5">
        <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden border border-slate-200">
          {buckets.map((b) => (
            <div
              key={b.key}
              style={{ width: `${Math.max(b.percentOfPortfolio, b.count > 0 ? 3 : 0)}%` }}
              className={`${b.colorClass} transition-all duration-300 relative group cursor-pointer`}
              title={`${b.label}: ${b.count} loans, UGX ${formatUGX(b.outstandingPrincipal)} (${b.percentOfPortfolio}%)`}
              onClick={() => onSelectBucket && onSelectBucket(selectedBucket === b.key ? null : b.key)}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
          <span>0 Days (Current)</span>
          <span>1 – 30 Days</span>
          <span>31 – 60 Days</span>
          <span>61 – 90 Days</span>
          <span>90+ Days (Loss)</span>
        </div>
      </div>

      {/* Aging Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {buckets.map((bucket) => {
          const isSelected = selectedBucket === bucket.key;
          return (
            <div
              key={bucket.key}
              onClick={() => onSelectBucket && onSelectBucket(isSelected ? null : bucket.key)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-slate-800 ring-2 ring-slate-800/10 bg-slate-50 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bucket.badgeClass}`}>
                  {bucket.label}
                </span>
                <span className="text-xs font-bold text-slate-700 font-mono">
                  {bucket.count} {bucket.count === 1 ? 'loan' : 'loans'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-extrabold text-slate-900 font-mono">
                  UGX {formatCompactUGX(bucket.outstandingPrincipal)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{bucket.percentOfPortfolio}% of port.</span>
                  <span className="text-slate-400">{bucket.rangeDesc}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">UMRA Provision:</span>
                  <span className="font-semibold text-slate-700">
                    {bucket.statutoryProvisionRate}% ({formatCompactUGX(bucket.provisionAmountUGX)})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedBucket && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 text-xs text-slate-700">
          <span>
            Filtering active collections queue to: <strong>{buckets.find((b) => b.key === selectedBucket)?.label}</strong>
          </span>
          <button
            onClick={() => onSelectBucket && onSelectBucket(null)}
            className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
          >
            Clear Filter (Show All)
          </button>
        </div>
      )}
    </div>
  );
};
