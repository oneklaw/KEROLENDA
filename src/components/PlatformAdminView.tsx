import React, { useState } from 'react';
import {
  Tenant,
  AppUser,
  CreditReview,
  CreditDispute,
  AuditEvent,
  Loan,
  BorrowerAccount,
} from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  Building2,
  ShieldCheck,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  ExternalLink,
  Sparkles,
  Layers,
  Settings,
  Scale,
  Activity,
  UserCheck,
} from 'lucide-react';

interface PlatformAdminViewProps {
  tenants: Tenant[];
  currentUser: AppUser;
  loans: Loan[];
  borrowers: BorrowerAccount[];
  creditReviews: CreditReview[];
  disputes: CreditDispute[];
  auditLogs: AuditEvent[];
  onUpdateTenantStatus: (tenantId: string, status: 'active' | 'suspended' | 'trial') => void;
  onUpdateTenantPlan: (tenantId: string, plan: 'Starter' | 'Growth Pro' | 'Enterprise SACCO') => void;
  onResolveDispute: (disputeId: string, resolution: 'upheld_corrected' | 'dismissed', notes: string) => void;
}

export const PlatformAdminView: React.FC<PlatformAdminViewProps> = ({
  tenants,
  currentUser,
  loans,
  borrowers,
  creditReviews,
  disputes,
  auditLogs,
  onUpdateTenantStatus,
  onUpdateTenantPlan,
  onResolveDispute,
}) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'disputes' | 'credit_integrity' | 'audit'>('tenants');
  const [searchQuery, setSearchQuery] = useState('');

  // Total metrics
  const totalVolumeUGX = loans.reduce((acc, l) => acc + l.principalApproved, 0);
  const activeTenantsCount = tenants.filter((t) => t.status === 'active').length;
  const pendingDisputes = disputes.filter((d) => d.status === 'pending' || d.status === 'under_investigation');

  const filteredTenants = tenants.filter(
    (t) =>
      t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.legalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              Environment 1 of 3: Platform Super Administration
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            KEROLENDA SaaS Platform &amp; Tenant Ecosystem
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Global management of registered lending companies, subscriptions, cross-company credit network integrity, and security audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Lenders</span>
            <strong className="text-xl font-black text-white font-mono-num">
              {activeTenantsCount} Companies
            </strong>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Registered Lenders</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <strong className="text-2xl font-bold text-slate-900 font-mono-num mt-1 block">
            {tenants.length}
          </strong>
          <span className="text-[11px] text-emerald-600 font-medium">100% Tenant Isolation Enforced</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Network Loan Volume</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <strong className="text-2xl font-bold text-slate-900 font-mono-num mt-1 block">
            {formatCompactUGX(totalVolumeUGX)}
          </strong>
          <span className="text-[11px] text-slate-500">Across all tenant ledgers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Central Borrowers</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <strong className="text-2xl font-bold text-slate-900 font-mono-num mt-1 block">
            {borrowers.length}
          </strong>
          <span className="text-[11px] text-sky-600 font-medium">Centralized Identity &amp; KYC</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Credit Bureau Disputes</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <strong className="text-2xl font-bold text-amber-600 font-mono-num mt-1 block">
            {pendingDisputes.length}
          </strong>
          <span className="text-[11px] text-slate-500">Pending statutory mediation</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-1 flex space-x-1 text-xs">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'tenants' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Lending Companies Directory ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'disputes' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Credit Disputes Mediation ({disputes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('credit_integrity')}
          className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'credit_integrity' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Shared Bureau Oversight ({creditReviews.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Platform Cross-Tenant Audit Log</span>
        </button>
      </div>

      {/* TAB 1: TENANTS DIRECTORY */}
      {activeTab === 'tenants' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search lending companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-slate-500 font-medium">
              Every company operates in a strictly isolated workspace
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3">Company Name</th>
                  <th className="py-2.5 px-3">UMRA License &amp; TIN</th>
                  <th className="py-2.5 px-3">SaaS Subscription</th>
                  <th className="py-2.5 px-3 text-center">MFA Enforcement</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <strong className="text-slate-900 block">{t.displayName}</strong>
                        <span className="text-[10px] text-slate-400 font-mono-num">{t.id}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <p className="text-slate-800 font-mono-num">{t.branding.umraLicenseNo}</p>
                      <p className="text-[10px] text-slate-400 font-mono-num">{t.branding.taxRegistrationNo}</p>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={t.planName}
                        onChange={(e) =>
                          onUpdateTenantPlan(
                            t.id,
                            e.target.value as 'Starter' | 'Growth Pro' | 'Enterprise SACCO'
                          )
                        }
                        className="px-2 py-1 rounded border border-slate-300 bg-white font-bold text-[11px] text-slate-800"
                      >
                        <option value="Starter">Starter (Up to 10 Users)</option>
                        <option value="Growth Pro">Growth Pro (Up to 25 Users)</option>
                        <option value="Enterprise SACCO">Enterprise SACCO (50 Users)</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.mfaEnforced
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.mfaEnforced ? 'Mandatory MFA' : 'Optional'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'suspended'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() =>
                          onUpdateTenantStatus(t.id, t.status === 'active' ? 'suspended' : 'active')
                        }
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                          t.status === 'active'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {t.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CREDIT DISPUTES MEDIATION */}
      {activeTab === 'disputes' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              Statutory Credit Report Dispute Mediation
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Uganda Data Protection &amp; Credit Bureau rules: Borrowers may challenge inaccurate late payment or default records. Platform super admins mediate and enforce corrections.
            </p>
          </div>

          <div className="space-y-3">
            {disputes.map((disp) => (
              <div
                key={disp.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 text-sm">{disp.borrowerName}</strong>
                      <span className="text-[10px] font-mono-num text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        NIN: {disp.borrowerNin}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Target Lender: <strong>{disp.reviewingTenantName}</strong> • Reason: <strong className="text-amber-800">{disp.disputeReason}</strong>
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      disp.status === 'upheld_corrected'
                        ? 'bg-emerald-100 text-emerald-800'
                        : disp.status === 'dismissed'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {disp.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                  <strong>Borrower Explanation:</strong> "{disp.borrowerExplanation}"
                </p>

                {disp.status === 'under_investigation' && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() =>
                        onResolveDispute(disp.id, 'dismissed', 'Investigation confirmed record matches valid ledger entries.')
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Dismiss Dispute
                    </button>
                    <button
                      onClick={() =>
                        onResolveDispute(disp.id, 'upheld_corrected', 'Bank statement verified early clearing. Credit review status upgraded.')
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Uphold &amp; Correct Record
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SHARED CREDIT BUREAU INTEGRITY */}
      {activeTab === 'credit_integrity' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Central Credit Review Registry ({creditReviews.length})
              </h3>
              <p className="text-slate-500 text-xs">
                Performance reports submitted by participating lenders.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3">Borrower (NIN)</th>
                  <th className="py-2.5 px-3">Submitting Lender</th>
                  <th className="py-2.5 px-3">Loan Ref &amp; Amount</th>
                  <th className="py-2.5 px-3">Repayment Performance</th>
                  <th className="py-2.5 px-3 text-center">Score</th>
                  <th className="py-2.5 px-3 text-right">Review Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creditReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <strong>{r.borrowerName}</strong>
                      <span className="block text-[10px] text-slate-400 font-mono-num">{r.borrowerNin}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{r.reviewingTenantName}</td>
                    <td className="py-2.5 px-3 font-mono-num">
                      {r.loanRef} ({formatUGX(r.loanAmountUGX)})
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.repaymentStatus === 'fully_settled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.repaymentStatus === 'contractual_default'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {r.repaymentStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-mono-num">
                      {r.paymentConsistencyScore}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-mono-num">
                      {r.reviewDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM AUDIT */}
      {activeTab === 'audit' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">Cross-Tenant Immutable Audit Trail</h3>
          <div className="space-y-2">
            {auditLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between font-mono-num"
              >
                <div>
                  <span className="font-bold text-indigo-700 mr-2">[{log.action}]</span>
                  <span className="text-slate-800 font-sans">{log.summary}</span>
                </div>
                <span className="text-slate-400 text-[10px]">{log.timestamp.split('T')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
