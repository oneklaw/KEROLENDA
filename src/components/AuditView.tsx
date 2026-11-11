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
  ClipboardCheck,
  Scale,
  Award,
  Layers,
  Clock,
} from 'lucide-react';
import { ComplianceChecklist } from './ComplianceChecklist';
import { exportAuditLogsCSV } from '../utils/exportService';

interface AuditViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  auditLogs: AuditEvent[];
}

type AuditSidebarTab = 'checklist' | 'audit_logs' | 'statutory_readiness';

export const AuditView: React.FC<AuditViewProps> = ({
  tenant,
  branch,
  currentUser,
  auditLogs,
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<AuditSidebarTab>('checklist');
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
            Audit &amp; UMRA Statutory Oversight
          </h2>
          <p className="text-xs text-slate-500">
            Regulated under Uganda Tier 4 Microfinance Institutions Act 2016 • Immutable ledger and mandatory compliance filing tracker.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono-num font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            UMRA Lic: {tenant.branding.umraLicenseNo}
          </span>
          {activeSidebarTab === 'audit_logs' && (
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
          )}
        </div>
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

      {/* Main Layout with Dedicated Compliance Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sub-Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Regulatory Navigation
            </div>

            {/* Sidebar Item 1: Compliance Checklist */}
            <button
              onClick={() => setActiveSidebarTab('checklist')}
              className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-1.5 border ${
                activeSidebarTab === 'checklist'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                  : 'bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'
              }`}
              data-testid="sidebar-compliance-checklist"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs flex items-center gap-2">
                  <ClipboardCheck className={`w-4 h-4 ${activeSidebarTab === 'checklist' ? 'text-emerald-600' : 'text-slate-500'}`} />
                  Compliance Checklist
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Track statutory returns, due dates, and UMRA filing status indicators.
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Mandatory UMRA returns</span>
              </div>
            </button>

            {/* Sidebar Item 2: Audit Trail & Event Ledger */}
            <button
              onClick={() => setActiveSidebarTab('audit_logs')}
              className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-1.5 border ${
                activeSidebarTab === 'audit_logs'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                  : 'bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'
              }`}
              data-testid="sidebar-audit-logs"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${activeSidebarTab === 'audit_logs' ? 'text-emerald-600' : 'text-slate-500'}`} />
                  Audit Trail &amp; Logs
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold bg-slate-100 text-slate-700">
                  {tenantLogs.length} events
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Immutable financial postings, loan authorizations, and access records.
              </p>
            </button>

            {/* Sidebar Item 3: Statutory Readiness */}
            <button
              onClick={() => setActiveSidebarTab('statutory_readiness')}
              className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-1.5 border ${
                activeSidebarTab === 'statutory_readiness'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                  : 'bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'
              }`}
              data-testid="sidebar-statutory-readiness"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs flex items-center gap-2">
                  <Scale className={`w-4 h-4 ${activeSidebarTab === 'statutory_readiness' ? 'text-emerald-600' : 'text-slate-500'}`} />
                  Statutory Framework
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  Tier 4 Act
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Legal citations, Data Protection (PDPO), and Disaster Recovery RPO/RTO.
              </p>
            </button>
          </div>

          {/* Quick Regulatory Summary Badge */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xs space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <Award className="w-3.5 h-3.5" />
              <span>Supervisory Jurisdiction</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Regulated by Uganda Microfinance Regulatory Authority (UMRA) under Act No. 7 of 2016.
            </p>
            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-mono-num flex justify-between">
              <span>Tenant ID:</span>
              <span>{tenant.id}</span>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: COMPLIANCE CHECKLIST */}
          {activeSidebarTab === 'checklist' && (
            <div className="space-y-4">
              <ComplianceChecklist tenant={tenant} currentUser={currentUser} />
            </div>
          )}

          {/* TAB 2: AUDIT TRAIL & LOGS */}
          {activeSidebarTab === 'audit_logs' && (
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
                    <option value="PAYMENT">Payments &amp; Receipts</option>
                    <option value="APPROVAL">Loan Approvals</option>
                    <option value="EXPENSE">Expense Disbursements</option>
                    <option value="LOAN">Loans &amp; Arrears PTP</option>
                    <option value="CUSTOMER">KYC &amp; Customers</option>
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
                      <th className="py-2.5 px-3">Actor &amp; Role</th>
                      <th className="py-2.5 px-3">Action Type</th>
                      <th className="py-2.5 px-3">Entity Ref</th>
                      <th className="py-2.5 px-3">Audit Summary &amp; Rationale</th>
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
          )}

          {/* TAB 3: STATUTORY FRAMEWORK & READINESS */}
          {activeSidebarTab === 'statutory_readiness' && (
            <div className="space-y-4">
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
                    Data Protection &amp; Privacy Act (2019)
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
                    Disaster Recovery &amp; Redundancy
                  </div>
                  <p className="text-xs text-slate-600">
                    Target RPO ≤ 15 minutes, RTO ≤ 4 hours. Automated point-in-time PostgreSQL wal-g backups with daily restore drills.
                  </p>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Status: Synchronized (99.8%)
                  </span>
                </div>
              </div>

              {/* Additional Statutory Legal Framework card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  Statutory Oversight Directives &amp; Schedule Compliance
                </h3>
                <div className="space-y-2 text-slate-600">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block text-xs">Tier 4 MFIs and Money Lenders Act 2016, Section 52:</strong>
                    <span>Mandates transparent pre-contract disclosure statement, total cost of credit (TCC), effective annual rate (EIR), and statutory prohibition of compounding punitive arrears.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block text-xs">Anti-Money Laundering Act 2013 (As Amended):</strong>
                    <span>Section 21 requires regular risk profiling, verification of ultimate beneficial owners (UBOs), politically exposed persons (PEP) filtering, and suspicious transaction reporting (STR) to the Financial Intelligence Authority.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block text-xs">Credit Reference Bureau Regulations 2005:</strong>
                    <span>Regulation 12 enforces mandatory quarterly portfolio credit feeds and credit history inquiries prior to issuing credit extensions exceeding UGX 1,000,000.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

