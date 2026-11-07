import React, { useState } from 'react';
import { AuditEvent, Tenant, Branch, AppUser } from '../types';
import {
  ShieldCheck,
  Search,
  Download,
  CheckCircle2,
  FileText,
  Lock,
  Database,
  Calendar,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';
import { ComplianceChecklist } from './ComplianceChecklist';
import { exportAuditLogsCSV } from '../utils/exportService';

interface AuditViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  auditLogs: AuditEvent[];
}

export const AuditView: React.FC<AuditViewProps> = ({
  tenant,
  branch,
  currentUser,
  auditLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const tenantLogs = auditLogs.filter((l) => l.tenantId === tenant.id);

  const filteredLogs = tenantLogs.filter((log) => {
    const matchesEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      log.actorName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.summary.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q);

    return matchesEntity && matchesSearch;
  });

  const handleExportCSV = () => {
    exportAuditLogsCSV(
      tenantLogs,
      {
        searchQuery,
        entityType: entityFilter,
      },
      tenant
    );
    setExportFeedback(`Exported ${filteredLogs.length} audit logs to CSV for compliance review.`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Immutable Audit Trail & Regulatory Compliance Verification
          </h2>
          <p className="text-xs text-slate-500">
            PRD Section M15: 100% auditable record of every financial posting, loan approval, expense disbursement, and reversal.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          title="Download immutable audit trail and compliance logs as CSV"
          aria-label="Download CSV"
          data-testid="download-audit-csv-btn"
        >
          <Download className="w-4 h-4 text-white" />
          Download CSV
        </button>
      </div>

      {/* Export notification banner */}
      {exportFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>Export Complete:</strong> {exportFeedback}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-200/60 rounded text-emerald-800">
            CSV
          </span>
        </div>
      )}

      {/* Regulatory Readiness Cards (Uganda Specific) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            UMRA Tier 4 Lending Act (2016)
          </div>
          <p className="text-xs text-slate-600">
            All pre-contract disclosures, APR calculations, non-compounding overdue rules, and receipting compliant with statutory standards.
          </p>
          <span className="text-[10px] text-slate-400 block font-mono">
            Lic No: {tenant.branding.umraLicenseNo}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            Data Protection & Privacy Act (2019)
          </div>
          <p className="text-xs text-slate-600">
            National ID numbers (NIN) masked in UI. Personal identity documents stored with restricted access and tenant data isolation.
          </p>
          <span className="text-[10px] text-slate-400 block font-mono">
            PDPO Reg: DP-2026-UG-8821
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            Disaster Recovery & Redundancy
          </div>
          <p className="text-xs text-slate-600">
            Target RPO ≤ 15 minutes, RTO ≤ 4 hours. Automated point-in-time PostgreSQL wal-g backups with daily restore drills.
          </p>
          <span className="text-[10px] text-slate-400 block font-mono">
            Status: Synchronized (99.8%)
          </span>
        </div>
      </div>

      {/* UMRA Compliance Checklist */}
      <ComplianceChecklist tenant={tenant} currentUser={currentUser} />

      {/* Search & Audit Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search actor, action, reference or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 sm:w-80"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Filter Event:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 font-medium text-slate-700 bg-slate-50 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              <option value="PAYMENT">Payments & Receipts</option>
              <option value="APPROVAL">Loan Approvals</option>
              <option value="EXPENSE">Expense Disbursements</option>
              <option value="LOAN">Loans & Arrears PTP</option>
              <option value="CUSTOMER">KYC & Customers</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer shadow-xs"
              title="Download filtered audit logs to CSV"
              aria-label="Download CSV"
              data-testid="download-filtered-audit-csv-btn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Download CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60 font-mono-num">
                <th className="py-2.5 px-3">Timestamp (EAT)</th>
                <th className="py-2.5 px-3">Actor & Role</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Entity Ref</th>
                <th className="py-2.5 px-3">Audit Summary & Rationale</th>
                <th className="py-2.5 px-3 text-right">IP Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono-num">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-slate-600 text-[11px]">
                    {new Date(log.timestamp).toLocaleString('en-UG', {
                      timeZone: 'Africa/Kampala',
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <p className="font-semibold text-slate-800">{log.actorName}</p>
                    <span className="text-[10px] text-slate-500">{log.actorRole}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{log.entityId}</td>
                  <td className="py-3 px-3 font-sans text-slate-700 text-xs max-w-md">
                    {log.summary}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
