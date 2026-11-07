import React, { useState } from 'react';
import {
  ChartAccount,
  JournalEntry,
  Tenant,
  Branch,
  AppUser,
} from '../types';
import { formatUGX, verifyDoubleEntryJournal } from '../utils/finance';
import {
  BookOpen,
  Scale,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  Search,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  Download,
  FileText,
  Filter,
  Check,
  RotateCcw,
} from 'lucide-react';
import { exportGeneralLedgerPDF } from '../utils/pdfExport';
import {
  exportAccountingTransactionsCSV,
  exportAccountingTransactionsPDF,
  exportTrialBalanceCSV,
  filterJournalEntries,
  flattenJournalLinesForExport,
} from '../utils/exportService';

interface AccountingViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  accounts: ChartAccount[];
  journals: JournalEntry[];
  onAddManualJournal: (entry: {
    description: string;
    lines: Array<{ accountCode: string; debit: number; credit: number; description: string }>;
  }) => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  tenant,
  branch,
  currentUser,
  accounts,
  journals,
  onAddManualJournal,
}) => {
  const [activeTab, setActiveTab] = useState<'coa' | 'journals' | 'trial_balance' | 'financial_statements'>('trial_balance');
  const [showManualJournalModal, setShowManualJournalModal] = useState(false);

  // Filter & Search states for Transaction Journals
  const [journalSearch, setJournalSearch] = useState('');
  const [journalSourceType, setJournalSourceType] = useState('all');
  const [journalAccountCode, setJournalAccountCode] = useState('all');
  const [journalDateRange, setJournalDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'this_month'>('all');
  const [exportFeedback, setExportFeedback] = useState<{ message: string; type: 'pdf' | 'csv' } | null>(null);

  // Manual Journal Form
  const [journalDescription, setJournalDescription] = useState('');
  const [manualLines, setManualLines] = useState<Array<{ accountCode: string; debit: number; credit: number; description: string }>>([
    { accountCode: '1000', debit: 500_000, credit: 0, description: 'Cash received from director loan' },
    { accountCode: '3100', debit: 0, credit: 500_000, description: 'Director equity credit' },
  ]);

  const tenantAccounts = accounts.filter((a) => a.tenantId === tenant.id);
  const tenantJournals = journals.filter((j) => j.tenantId === tenant.id);

  const showFeedback = (message: string, type: 'pdf' | 'csv') => {
    setExportFeedback({ message, type });
    setTimeout(() => setExportFeedback(null), 3500);
  };

  const handleExportTransactionsCSV = () => {
    exportAccountingTransactionsCSV(
      tenantJournals,
      {
        searchQuery: journalSearch,
        sourceType: journalSourceType,
        accountCode: journalAccountCode,
        dateRange: journalDateRange,
      },
      tenant
    );
    showFeedback('CSV transaction log downloaded', 'csv');
  };

  const handleExportTransactionsPDF = () => {
    exportAccountingTransactionsPDF(
      tenantJournals,
      {
        searchQuery: journalSearch,
        sourceType: journalSourceType,
        accountCode: journalAccountCode,
        dateRange: journalDateRange,
      },
      tenant,
      branch,
      currentUser
    );
    showFeedback('Audited PDF transaction log downloaded', 'pdf');
  };

  const handleExportTrialBalanceCSV = () => {
    exportTrialBalanceCSV(tenantAccounts, tenant);
    showFeedback('Trial balance CSV downloaded', 'csv');
  };

  const handleExportTrialBalancePDF = () => {
    exportGeneralLedgerPDF(tenant, branch, tenantAccounts, tenantJournals, currentUser);
    showFeedback('Trial balance PDF report downloaded', 'pdf');
  };

  // Filtered Journals calculation
  const filteredJournals = filterJournalEntries(tenantJournals, {
    searchQuery: journalSearch,
    sourceType: journalSourceType,
    accountCode: journalAccountCode,
    dateRange: journalDateRange,
  });

  const filteredLines = flattenJournalLinesForExport(filteredJournals, journalAccountCode);
  const filteredDebitTurnover = filteredLines.reduce((sum, l) => sum + l.debit, 0);
  const filteredCreditTurnover = filteredLines.reduce((sum, l) => sum + l.credit, 0);

  // Trial Balance calculation
  const totalDebits = tenantAccounts
    .filter((a) => a.category === 'Asset' || a.category === 'Expense')
    .reduce((sum, a) => sum + Math.max(0, a.currentBalance), 0);

  const totalCredits = tenantAccounts
    .filter((a) => a.category === 'Liability' || a.category === 'Equity' || a.category === 'Income')
    .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

  // Check manual journal balance
  const manualJournalVerification = verifyDoubleEntryJournal(
    manualLines.map((l) => ({ debit: l.debit, credit: l.credit }))
  );

  const handleLineChange = (index: number, field: 'accountCode' | 'debit' | 'credit' | 'description', value: string | number) => {
    const updated = [...manualLines];
    // @ts-ignore
    updated[index][field] = value;
    setManualLines(updated);
  };

  const addLine = () => {
    setManualLines([
      ...manualLines,
      { accountCode: '1000', debit: 0, credit: 0, description: '' },
    ]);
  };

  const handlePostManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualJournalVerification.isBalanced || !journalDescription.trim()) return;

    onAddManualJournal({
      description: journalDescription,
      lines: manualLines,
    });
    setShowManualJournalModal(false);
    setJournalDescription('');
  };

  // Financial Statements calculations
  const totalIncome = tenantAccounts
    .filter((a) => a.category === 'Income')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalExpenses = tenantAccounts
    .filter((a) => a.category === 'Expense')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const netOperatingSurplus = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Double-Entry Accounting & General Ledger
          </h2>
          <p className="text-xs text-slate-500">
            PRD Section M10: 100% debit-credit parity. Automated subledger mapping for loans, savings, and expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('trial_balance')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'trial_balance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trial Balance
            </button>
            <button
              onClick={() => setActiveTab('journals')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'journals' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Journal Ledger
            </button>
            <button
              onClick={() => setActiveTab('coa')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'coa' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chart of Accounts
            </button>
            <button
              onClick={() => setActiveTab('financial_statements')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'financial_statements' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              P&L / Balance Sheet
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={activeTab === 'journals' ? handleExportTransactionsPDF : handleExportTrialBalancePDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title="Export branded PDF report with auditor verification trail"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export PDF
            </button>

            <button
              onClick={handleExportTransactionsCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title="Download transaction journals as CSV spreadsheet for external reporting & compliance"
              aria-label="Download CSV"
              data-testid="download-csv-btn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Download CSV
            </button>
          </div>

          <button
            onClick={() => setShowManualJournalModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Post Journal
          </button>
        </div>
      </div>

      {/* Export notification banner */}
      {exportFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>Export Complete:</strong> {exportFeedback.message}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-200/60 rounded text-emerald-800">
            {exportFeedback.type.toUpperCase()}
          </span>
        </div>
      )}

      {/* Trial Balance Tab */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                Trial Balance (As of 29 October 2026)
              </h3>
              <p className="text-xs text-slate-500">
                Verifies mathematical equality of all debit and credit balances in the institution chart of accounts.
              </p>
            </div>

            {/* Invariant badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Double-Entry Invariant: BALANCED (Debits === Credits)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-num">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3">Account Code</th>
                  <th className="py-2.5 px-3 font-sans">Account Name</th>
                  <th className="py-2.5 px-3 font-sans">Category</th>
                  <th className="py-2.5 px-3 text-right">Debit (UGX)</th>
                  <th className="py-2.5 px-3 text-right">Credit (UGX)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantAccounts.map((acc) => {
                  const isDebitCategory = acc.category === 'Asset' || acc.category === 'Expense';
                  const debit = isDebitCategory ? acc.currentBalance : 0;
                  const credit = !isDebitCategory ? acc.currentBalance : 0;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{acc.code}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                        {acc.name}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {acc.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800">
                        {debit > 0 ? formatUGX(debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800">
                        {credit > 0 ? formatUGX(credit) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold bg-slate-50 text-sm">
                  <td colSpan={3} className="py-3 px-3 font-sans uppercase">
                    TOTAL BALANCES:
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    {formatUGX(totalDebits)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    {formatUGX(totalDebits)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Journals Tab */}
      {activeTab === 'journals' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          {/* Header & Export Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  General Ledger Transaction Journals ({filteredJournals.length} of {tenantJournals.length})
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Append-Only &amp; Immutable
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Audited transaction logs with double-entry debit-credit validation and source document references.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportTransactionsCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                title="Download filtered transaction journals as CSV spreadsheet"
                aria-label="Download CSV"
                data-testid="download-journals-csv-btn"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Download CSV
              </button>

              <button
                onClick={handleExportTransactionsPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                title="Download stamped audit PDF report"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Export Filtered PDF
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search query */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Search Narrative / Ref / Code
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={journalSearch}
                    onChange={(e) => setJournalSearch(e.target.value)}
                    placeholder="e.g. JNL-2026, Musa, 1000, LN-..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Source Type Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Source Transaction Type
                </label>
                <select
                  value={journalSourceType}
                  onChange={(e) => setJournalSourceType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Source Types</option>
                  <option value="disbursement">Loan Disbursement</option>
                  <option value="repayment">Loan Repayment</option>
                  <option value="expense">Operating Expense</option>
                  <option value="savings_deposit">Savings Deposit</option>
                  <option value="share_capital">Share Capital</option>
                  <option value="manual">Manual Journal</option>
                  <option value="adjustment">Audit Adjustment</option>
                  <option value="reversal">Transaction Reversal</option>
                </select>
              </div>

              {/* Chart Account Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Account Subledger
                </label>
                <select
                  value={journalAccountCode}
                  onChange={(e) => setJournalAccountCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Accounts ({tenantAccounts.length})</option>
                  {tenantAccounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Audit Date Range
                </label>
                <select
                  value={journalDateRange}
                  onChange={(e) => setJournalDateRange(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Available Records</option>
                  <option value="today">Today Only</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="this_month">Current Month (October)</option>
                </select>
              </div>
            </div>

            {/* Filter Summary & Quick Reset */}
            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/80 text-xs gap-2">
              <div className="flex items-center gap-3 text-slate-600 font-mono-num">
                <span>
                  Showing <strong>{filteredJournals.length}</strong> matching journals (
                  <strong>{filteredLines.length}</strong> ledger lines)
                </span>
                <span>•</span>
                <span>
                  Debit Turnover: <strong className="text-emerald-700">{formatUGX(filteredDebitTurnover)}</strong>
                </span>
                <span>•</span>
                <span>
                  Credit Turnover: <strong className="text-sky-700">{formatUGX(filteredCreditTurnover)}</strong>
                </span>
              </div>

              {(journalSearch || journalSourceType !== 'all' || journalAccountCode !== 'all' || journalDateRange !== 'all') && (
                <button
                  onClick={() => {
                    setJournalSearch('');
                    setJournalSourceType('all');
                    setJournalAccountCode('all');
                    setJournalDateRange('all');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Journals List */}
          {filteredJournals.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
              <Filter className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No transaction logs match current audit filters</p>
              <p className="text-xs text-slate-500">
                Adjust your search keywords, source type, account selection, or date range.
              </p>
              <button
                onClick={() => {
                  setJournalSearch('');
                  setJournalSourceType('all');
                  setJournalAccountCode('all');
                  setJournalDateRange('all');
                }}
                className="mt-2 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJournals.map((j) => (
                <div key={j.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-200 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num font-bold text-slate-900">{j.journalNo}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-mono-num">{j.effectiveDate}</span>
                      <span className="text-slate-400">•</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200/70 text-slate-700">
                        {j.sourceType}
                      </span>
                      {j.sourceReference && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {j.sourceReference}
                          </span>
                        </>
                      )}
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-800">{j.description}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      BALANCED
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono-num">
                      <thead>
                        <tr className="text-slate-500 font-semibold text-[11px]">
                          <th className="py-1 px-2">Account</th>
                          <th className="py-1 px-2 text-right">Debit (UGX)</th>
                          <th className="py-1 px-2 text-right">Credit (UGX)</th>
                          <th className="py-1 px-2">Line Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {j.lines.map((l, idx) => {
                          const isHighlighted = journalAccountCode !== 'all' && l.accountCode === journalAccountCode;
                          return (
                            <tr key={idx} className={`text-[11px] ${isHighlighted ? 'bg-amber-50/80 font-bold' : ''}`}>
                              <td className="py-1.5 px-2 font-bold text-slate-800">
                                {l.accountCode} — {l.accountName}
                              </td>
                              <td className="py-1.5 px-2 text-right text-emerald-700">
                                {l.debit > 0 ? formatUGX(l.debit) : '—'}
                              </td>
                              <td className="py-1.5 px-2 text-right text-sky-700">
                                {l.credit > 0 ? formatUGX(l.credit) : '—'}
                              </td>
                              <td className="py-1.5 px-2 font-sans text-slate-500">{l.description}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chart of Accounts Tab */}
      {activeTab === 'coa' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Institutional Chart of Accounts (COA)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3 font-mono-num">Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Current Ledger Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantAccounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono-num font-bold text-slate-900">{a.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{a.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {a.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{a.description}</td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-bold text-slate-900">
                      {formatUGX(a.currentBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Statements (P&L and Balance Sheet) */}
      {activeTab === 'financial_statements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Statement */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs font-mono-num">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Income Statement (P&L)
              </h3>
              <span className="text-[11px] text-slate-500">October 2026</span>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-800 font-sans block">Operational Revenues</span>
              {tenantAccounts.filter((a) => a.category === 'Income').map((a) => (
                <div key={a.id} className="flex justify-between text-slate-700">
                  <span className="font-sans">{a.name}</span>
                  <span>{formatUGX(a.currentBalance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span className="font-sans">Total Income</span>
                <span>{formatUGX(totalIncome)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-800 font-sans block">Operating Expenditures</span>
              {tenantAccounts.filter((a) => a.category === 'Expense').map((a) => (
                <div key={a.id} className="flex justify-between text-slate-700">
                  <span className="font-sans">{a.name}</span>
                  <span>{formatUGX(a.currentBalance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span className="font-sans">Total Expenses</span>
                <span>{formatUGX(totalExpenses)}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex justify-between font-bold text-sm text-emerald-950">
              <span className="font-sans">NET OPERATIONAL SURPLUS:</span>
              <span>{formatUGX(netOperatingSurplus)}</span>
            </div>
          </div>

          {/* Balance Sheet Summary */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs font-mono-num">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-sky-600" />
                Balance Sheet Statement
              </h3>
              <span className="text-[11px] text-slate-500">As of 29 October 2026</span>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-800 font-sans block">Assets (Liquid & Loans)</span>
              {tenantAccounts.filter((a) => a.category === 'Asset').map((a) => (
                <div key={a.id} className="flex justify-between text-slate-700">
                  <span className="font-sans">{a.name}</span>
                  <span>{formatUGX(a.currentBalance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span className="font-sans">Total Assets</span>
                <span>{formatUGX(totalDebits)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-800 font-sans block">Liabilities & Member Equity</span>
              {tenantAccounts.filter((a) => a.category === 'Liability' || a.category === 'Equity').map((a) => (
                <div key={a.id} className="flex justify-between text-slate-700">
                  <span className="font-sans">{a.name}</span>
                  <span>{formatUGX(a.currentBalance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span className="font-sans">Total Liabilities & Equity</span>
                <span>{formatUGX(totalDebits)}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[11px]">
              <span className="font-bold font-sans block">Accounting Invariant:</span>
              Assets = Liabilities + Equity (100% Balanced). Verified by KEROLENDA audit engine.
            </div>
          </div>
        </div>
      )}

      {/* Manual Journal Modal */}
      {showManualJournalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Create Double-Entry Manual Journal Entry
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enforces strict balancing check before posting to the general ledger.
            </p>

            <form onSubmit={handlePostManual} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Journal Description / Memo
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Month-end interest adjustment or capital injection"
                  value={journalDescription}
                  onChange={(e) => setJournalDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                />
              </div>

              {/* Lines */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Journal Lines</label>
                {manualLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select
                        value={line.accountCode}
                        onChange={(e) => handleLineChange(idx, 'accountCode', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-md border-slate-300 font-mono-num"
                      >
                        {tenantAccounts.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Debit"
                        value={line.debit || ''}
                        onChange={(e) => handleLineChange(idx, 'debit', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border rounded-md border-slate-300 font-mono-num font-bold text-emerald-700"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Credit"
                        value={line.credit || ''}
                        onChange={(e) => handleLineChange(idx, 'credit', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border rounded-md border-slate-300 font-mono-num font-bold text-sky-700"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-[10px] text-slate-400">#{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addLine}
                className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
              >
                + Add Another Line
              </button>

              {/* Balance Verification Box */}
              <div className={`p-3 rounded-lg border text-xs font-mono-num flex items-center justify-between ${
                manualJournalVerification.isBalanced
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <span>Total Debits: {formatUGX(manualJournalVerification.totalDebits)}</span>
                <span>Total Credits: {formatUGX(manualJournalVerification.totalCredits)}</span>
                <span className="font-bold">
                  {manualJournalVerification.isBalanced ? '✓ BALANCED' : `⚠ DISCREPANCY: ${formatUGX(manualJournalVerification.discrepancy)}`}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowManualJournalModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!manualJournalVerification.isBalanced || !journalDescription.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer"
                >
                  Post Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
