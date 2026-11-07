import React, { useState } from 'react';
import { Tenant, AppUser, UMRAComplianceItem } from '../types';
import { generatePDFReport } from '../utils/pdfExport';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Download,
  Filter,
  Check,
  Building,
  Award,
} from 'lucide-react';

interface ComplianceChecklistProps {
  tenant: Tenant;
  currentUser: AppUser;
}

const INITIAL_UMRA_FILINGS: UMRAComplianceItem[] = [
  {
    id: 'umra-m1',
    category: 'monthly',
    formCode: 'UMRA-M1',
    title: 'Monthly Arrears Aging & PAR 30 Portfolio Return',
    description: 'Statutory submission of performing, watchlist, substandard, doubtful, and loss loan buckets along with required provisioning reserves.',
    legalBasis: 'Uganda Tier 4 MFIs and Money Lenders Act 2016, Sec. 52(1)',
    dueDateDescription: '10th of every calendar month',
    frequency: 'Monthly',
    status: 'completed',
    lastFiledDate: '2026-10-10',
    assignedOfficer: 'Grace Nakimera (Branch Manager)',
  },
  {
    id: 'umra-m2',
    category: 'monthly',
    formCode: 'UMRA-M2',
    title: 'Monthly Liquidity & Cash Float Reserve Statement',
    description: 'Mandatory verification of liquid cash, bank deposits, and mobile money floats against short-term member liabilities.',
    legalBasis: 'UMRA Regulations (Microfinance Institutions) 2017, Reg. 18',
    dueDateDescription: '15th of every calendar month',
    frequency: 'Monthly',
    status: 'completed',
    lastFiledDate: '2026-10-15',
    assignedOfficer: 'Moses Ochieng (Accountant)',
  },
  {
    id: 'ura-paye',
    category: 'monthly',
    formCode: 'URA-DT101',
    title: 'URA Monthly PAYE & Withholding Tax Remittance',
    description: 'Statutory tax deductions on staff remuneration and withholding taxes on director fees / professional services.',
    legalBasis: 'Income Tax Act Cap 340, Section 116',
    dueDateDescription: '15th of every calendar month',
    frequency: 'Monthly',
    status: 'completed',
    lastFiledDate: '2026-10-14',
    assignedOfficer: 'Moses Ochieng (Accountant)',
  },
  {
    id: 'umra-q1',
    category: 'quarterly',
    formCode: 'UMRA-Q1',
    title: 'Quarterly Prudential Financial Statements & Capital Adequacy',
    description: 'Full trial balance, balance sheet, profit and loss, core capital ratio, and gearing ratios for supervisory evaluation.',
    legalBasis: 'Uganda Tier 4 MFIs Act 2016, Sec. 54',
    dueDateDescription: 'Within 30 days after quarter-end (30 Oct 2026)',
    frequency: 'Quarterly',
    status: 'in_progress',
    lastFiledDate: '2026-07-28',
    assignedOfficer: 'Moses Ochieng (Accountant)',
  },
  {
    id: 'crb-q',
    category: 'quarterly',
    formCode: 'CRB-02',
    title: 'Credit Reference Bureau (CRB) Mandatory Portfolio Feed',
    description: 'Electronic submission of borrower credit repayment history and default telemetry to licensed bureaus (Metropol / Compuscan).',
    legalBasis: 'Credit Reference Bureau Regulations 2005, Reg. 12',
    dueDateDescription: 'End of each calendar quarter',
    frequency: 'Quarterly',
    status: 'completed',
    lastFiledDate: '2026-09-30',
    assignedOfficer: 'Grace Nakimera (Branch Manager)',
  },
  {
    id: 'gov-minutes',
    category: 'quarterly',
    formCode: 'GOV-Q3',
    title: 'Board Risk & Credit Committee Governance Oversight Minutes',
    description: 'Documented approvals for non-accrual loans, loan restructures exceeding UGX 10M, and staff conflict-of-interest declarations.',
    legalBasis: 'UMRA Corporate Governance Directive 2018',
    dueDateDescription: 'Within 15 days of committee sitting',
    frequency: 'Quarterly',
    status: 'completed',
    lastFiledDate: '2026-10-04',
    assignedOfficer: 'Grace Nakimera (Branch Manager)',
  },
  {
    id: 'umra-a1',
    category: 'annual',
    formCode: 'UMRA-A1',
    title: 'Audited Annual Financial Statements by Certified Public Auditor',
    description: 'Independent auditor report endorsed by an ICPAU practitioner and accredited by UMRA for statutory publication.',
    legalBasis: 'Tier 4 MFIs Act 2016, Sec. 56(2)',
    dueDateDescription: 'Within 3 months after close of fiscal year',
    frequency: 'Annual',
    status: 'in_progress',
    lastFiledDate: '2026-03-25',
    assignedOfficer: 'Moses Ochieng (Accountant)',
  },
  {
    id: 'umra-lic-ren',
    category: 'annual',
    formCode: 'UMRA-LIC-2027',
    title: 'UMRA Tier 4 Institutional License Annual Renewal',
    description: 'Application for statutory operating certificate renewal, accompanied by certificate of good standing and inspection clearance.',
    legalBasis: 'Tier 4 MFIs Act 2016, Sec. 16(3)',
    dueDateDescription: 'Due 31 October annually for upcoming operational calendar',
    frequency: 'Annual',
    status: 'pending',
    lastFiledDate: '2025-10-28',
    assignedOfficer: 'Grace Nakimera (Branch Manager)',
  },
  {
    id: 'fia-aml',
    category: 'annual',
    formCode: 'FIA-AML-ANN',
    title: 'Financial Intelligence Authority (FIA) AML/CFT Annual Return',
    description: 'Risk assessment of politically exposed persons (PEPs), suspicious transaction reporting (STR) registry, and staff AML training logs.',
    legalBasis: 'Anti-Money Laundering Act 2013 (As Amended), Sec. 21',
    dueDateDescription: '31 January annually',
    frequency: 'Annual',
    status: 'pending',
    lastFiledDate: '2026-01-20',
    assignedOfficer: 'Grace Nakimera (Branch Manager)',
  },
];

export const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({
  tenant,
  currentUser,
}) => {
  const [items, setItems] = useState<UMRAComplianceItem[]>(INITIAL_UMRA_FILINGS);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'monthly' | 'quarterly' | 'annual'>('all');

  const filteredItems = items.filter(
    (item) => categoryFilter === 'all' || item.category === categoryFilter
  );

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const inProgressCount = items.filter((i) => i.status === 'in_progress').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const overdueCount = items.filter((i) => i.status === 'overdue').length;
  const complianceScore = Math.round((completedCount / items.length) * 100);

  const toggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus: Record<UMRAComplianceItem['status'], UMRAComplianceItem['status']> = {
          pending: 'in_progress',
          in_progress: 'completed',
          completed: 'pending',
          overdue: 'in_progress',
        };
        const newStatus = nextStatus[item.status];
        return {
          ...item,
          status: newStatus,
          lastFiledDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : item.lastFiledDate,
        };
      })
    );
  };

  const handleExportPDF = () => {
    generatePDFReport({
      title: 'UMRA Statutory Regulatory Compliance Checklist',
      subtitle: `Mandatory monthly, quarterly, and annual supervisory filings under Uganda Tier 4 Microfinance Act 2016`,
      tenant,
      user: currentUser,
      filename: `${tenant.slug}_umra_compliance_${new Date().toISOString().slice(0, 10)}.pdf`,
      columns: [
        { header: 'Form Code', dataKey: 'code' },
        { header: 'Statutory Obligation', dataKey: 'title' },
        { header: 'Frequency', dataKey: 'freq' },
        { header: 'Statutory Due Date', dataKey: 'due' },
        { header: 'Compliance Status', dataKey: 'status' },
        { header: 'Assigned Officer', dataKey: 'officer' },
      ],
      rows: items.map((i) => ({
        code: i.formCode,
        title: i.title,
        freq: i.frequency,
        due: i.dueDateDescription,
        status: i.status.replace('_', ' ').toUpperCase(),
        officer: i.assignedOfficer,
      })),
      summaryItems: [
        { label: 'Overall Readiness', value: `${complianceScore}%` },
        { label: 'Completed Filings', value: `${completedCount} of ${items.length}` },
        { label: 'In Progress', value: String(inProgressCount) },
        { label: 'Pending Action', value: String(pendingCount) },
      ],
    });
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header and Compliance Score Gauge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            UMRA Regulatory Filings & Statutory Compliance Checklist
          </h3>
          <p className="text-xs text-slate-500">
            Mandatory supervisory reporting obligations under Uganda Tier 4 Microfinance & Money Lenders Act (2016)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <Award className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-[10px] text-emerald-800 font-bold uppercase block leading-none">
                Compliance Score
              </span>
              <span className="text-base font-black text-emerald-950 font-mono leading-tight">
                {complianceScore}% <span className="text-xs font-semibold text-emerald-700">Good Standing</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export PDF Checklist
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Filings ({items.length})
          </button>
          <button
            onClick={() => setCategoryFilter('monthly')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              categoryFilter === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly (3)
          </button>
          <button
            onClick={() => setCategoryFilter('quarterly')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              categoryFilter === 'quarterly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quarterly (3)
          </button>
          <button
            onClick={() => setCategoryFilter('annual')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              categoryFilter === 'annual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual (3)
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> {completedCount} Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> {inProgressCount} In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> {pendingCount} Pending
          </span>
        </div>
      </div>

      {/* Checklist Items Table */}
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
        {filteredItems.map((item) => {
          const isDone = item.status === 'completed';
          const isInProgress = item.status === 'in_progress';
          const isPending = item.status === 'pending';
          const isOverdue = item.status === 'overdue';

          return (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-colors ${
                isDone ? 'bg-white hover:bg-slate-50' : isInProgress ? 'bg-blue-50/30' : 'bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleStatus(item.id)}
                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    isDone
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isInProgress
                      ? 'border-2 border-blue-500 text-blue-600 bg-white'
                      : 'border-2 border-slate-300 text-transparent hover:border-slate-400 bg-white'
                  }`}
                  title="Click to toggle status (Pending -> In Progress -> Completed)"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                      {item.formCode}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">{item.title}</h4>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                      {item.frequency}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Due: {item.dueDateDescription}
                    </span>
                    <span>•</span>
                    <span className="italic text-slate-500">Legal: {item.legalBasis}</span>
                    <span>•</span>
                    <span>Lead: <strong>{item.assignedOfficer}</strong></span>
                    {item.lastFiledDate && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">Last Filed: {item.lastFiledDate}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status pill & toggle */}
              <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer ${
                    isDone
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isInProgress
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : isPending
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                  onClick={() => toggleStatus(item.id)}
                >
                  {isDone
                    ? 'Completed'
                    : isInProgress
                    ? 'In Progress'
                    : isPending
                    ? 'Pending Filing'
                    : 'Overdue'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
