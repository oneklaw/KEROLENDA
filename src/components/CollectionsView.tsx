import React, { useState } from 'react';
import {
  RecoveryCase,
  Loan,
  Customer,
  AppUser,
  Tenant,
  Branch,
} from '../types';
import { formatUGX, formatCompactUGX, calculatePAR30 } from '../utils/finance';
import {
  AlertTriangle,
  PhoneCall,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  UserCheck,
  PlusCircle,
  FileText,
  Search,
  ShieldAlert,
  MessageSquare,
  Send,
  X,
  CheckCheck,
  Smartphone,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Check,
  Filter,
} from 'lucide-react';
import { PARAgingReport } from './PARAgingReport';
import {
  exportRecoveryReportCSV,
  exportRecoveryReportPDF,
  filterRecoveryCases,
} from '../utils/exportService';

interface CollectionsViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  cases: RecoveryCase[];
  loans: Loan[];
  customers: Customer[];
  officers: AppUser[];
  onAddPromiseToPay: (caseId: string, amount: number, date: string) => void;
  onRecordContactNote: (caseId: string, note: string) => void;
  onQuickCollect: (loan: Loan) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  tenant,
  branch,
  currentUser,
  cases,
  loans,
  customers,
  officers,
  onAddPromiseToPay,
  onRecordContactNote,
  onQuickCollect,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || '');
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [officerFilter, setOfficerFilter] = useState<string>('all');
  const [exportFeedback, setExportFeedback] = useState<{ message: string; type: 'pdf' | 'csv' } | null>(null);

  const [newPtpAmount, setNewPtpAmount] = useState<number>(500_000);
  const [newPtpDate, setNewPtpDate] = useState<string>('2026-11-05');
  const [newNote, setNewNote] = useState<string>('');
  const [contactType, setContactType] = useState<string>('Phone Call');
  const [showSmsModal, setShowSmsModal] = useState<boolean>(false);
  const [smsTemplateType, setSmsTemplateType] = useState<'friendly' | 'overdue' | 'formal'>('overdue');
  const [smsDeliveryStatus, setSmsDeliveryStatus] = useState<'idle' | 'sending' | 'delivered'>('idle');

  const showFeedback = (message: string, type: 'pdf' | 'csv') => {
    setExportFeedback({ message, type });
    setTimeout(() => setExportFeedback(null), 3500);
  };

  const handleExportPDF = () => {
    exportRecoveryReportPDF(
      cases,
      loans,
      customers,
      officers,
      {
        agingBucket: selectedAgingBucket,
        status: statusFilter,
        assignedOfficerId: officerFilter,
        searchQuery,
      },
      tenant,
      branch,
      currentUser
    );
    showFeedback('Audited PDF recovery report downloaded', 'pdf');
  };

  const handleExportCSV = () => {
    exportRecoveryReportCSV(
      cases,
      loans,
      customers,
      officers,
      {
        agingBucket: selectedAgingBucket,
        status: statusFilter,
        assignedOfficerId: officerFilter,
        searchQuery,
      },
      tenant
    );
    showFeedback('Recovery audit CSV log downloaded', 'csv');
  };

  // Filter cases by aging bucket, status, officer, and search query
  const filteredCases = filterRecoveryCases(cases, loans, customers, {
    agingBucket: selectedAgingBucket,
    status: statusFilter,
    assignedOfficerId: officerFilter,
    searchQuery,
  });

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || filteredCases[0];
  const activeLoan = selectedCase ? loans.find((l) => l.id === selectedCase.loanId) : null;
  const activeCustomer = selectedCase ? customers.find((c) => c.id === selectedCase.customerId) : null;
  const assignedOfficer = selectedCase ? officers.find((o) => o.id === selectedCase.assignedOfficerId) : null;

  // Calculate PAR metrics
  const tenantLoans = loans.filter((l) => l.tenantId === tenant.id);
  const parMetrics = calculatePAR30(tenantLoans);

  const getSmsContent = () => {
    if (!activeCustomer || !activeLoan || !selectedCase) return '';
    if (smsTemplateType === 'friendly') {
      return `Dear ${activeCustomer.fullName}, gentle reminder from ${tenant.displayName} that your loan instalment for ${activeLoan.loanNo} of UGX ${formatUGX(selectedCase.totalArrearsUGX)} is due. Kindly remit via MTN MoMo / Airtel Money. Thank you!`;
    }
    if (smsTemplateType === 'overdue') {
      return `URGENT: Dear ${activeCustomer.fullName}, your loan ${activeLoan.loanNo} is ${selectedCase.daysPastDue} days in arrears (UGX ${formatUGX(selectedCase.totalArrearsUGX)}). Please remit payment today to avoid default penalties. ${tenant.displayName} Credit Desk.`;
    }
    return `FINAL STATUTORY DEMAND: In accordance with Uganda Tier 4 Microfinance Act 2016, you have 7 days to clear arrears of UGX ${formatUGX(selectedCase.totalArrearsUGX)} on ${activeLoan.loanNo}. Failure to regularize will trigger guarantor and legal enforcement. Contact ${branch.name}.`;
  };

  const handleSendSms = () => {
    setSmsDeliveryStatus('sending');
    setTimeout(() => {
      setSmsDeliveryStatus('delivered');
      if (selectedCase) {
        onRecordContactNote(
          selectedCase.id,
          `[SMS Sent via Gateway] Template: ${smsTemplateType.toUpperCase()} | Recipient: ${activeCustomer?.phone}`
        );
      }
      setTimeout(() => {
        setShowSmsModal(false);
        setSmsDeliveryStatus('idle');
      }, 1200);
    }, 800);
  };

  const handleSavePTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || newPtpAmount <= 0) return;
    onAddPromiseToPay(selectedCaseId, newPtpAmount, newPtpDate);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !newNote.trim()) return;
    onRecordContactNote(selectedCaseId, `[${contactType}] ${newNote}`);
    setNewNote('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Collections, Arrears Aging & Recovery Operations
          </h2>
          <p className="text-xs text-slate-500">
            Work overdue accounts, enforce non-harassing lawful recovery guidelines, and track customer promises-to-pay.
          </p>
        </div>

        {/* Right side: Export buttons & PAR Target Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title="Export official delinquency & recovery audit report to PDF"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Export PDF (Audit)
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title="Export filtered arrears and recovery records to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
              Export CSV
            </button>
          </div>

          {/* PAR 30 Target Badge */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-right">
            <span className="text-[11px] text-amber-800 font-semibold block">
              Institution PAR &gt; 30 Days
            </span>
            <span className="text-base font-bold text-amber-950 font-mono-num">
              {parMetrics.par30Percent}%{' '}
              <span className="text-xs font-normal text-amber-800">
                ({formatCompactUGX(parMetrics.par30Principal)})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Export notification banner */}
      {exportFeedback && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950 font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-600" />
            <span>
              <strong>Export Complete:</strong> {exportFeedback.message}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-200/80 rounded text-amber-900">
            {exportFeedback.type.toUpperCase()}
          </span>
        </div>
      )}

      {/* Portfolio At Risk (PAR) Aging Component */}
      <PARAgingReport
        tenant={tenant}
        loans={loans}
        selectedBucket={selectedAgingBucket}
        onSelectBucket={setSelectedAgingBucket}
      />

      {/* Grid: Cases Queue & Case Management Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases List (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Assigned Arrears Cases ({filteredCases.length})
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Ranked by risk and arrears aging</p>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportCSV}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer text-xs flex items-center gap-1"
                title="Download filtered cases to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline font-semibold">CSV</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer text-xs flex items-center gap-1 font-semibold"
                title="Download audit report PDF"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>

          {/* Recovery Filter Bar */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search borrower, loan #, phone, occupation..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">All Recovery Statuses</option>
                <option value="active_followup">Active Follow-up</option>
                <option value="promise_to_pay">Promise to Pay (PTP)</option>
                <option value="legal_escalation">Legal Escalation</option>
                <option value="resolved">Resolved / Current</option>
              </select>

              <select
                value={officerFilter}
                onChange={(e) => setOfficerFilter(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">All Officers ({officers.length})</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active filter badges */}
            {(selectedAgingBucket || statusFilter !== 'all' || officerFilter !== 'all' || searchQuery) && (
              <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] text-slate-600 gap-1 border-t border-slate-200/60">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-semibold text-slate-500">Filters:</span>
                  {selectedAgingBucket && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                      Bucket: {selectedAgingBucket}
                      <button onClick={() => setSelectedAgingBucket(null)} className="hover:text-rose-600 cursor-pointer">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                      {statusFilter.replace(/_/g, ' ')}
                      <button onClick={() => setStatusFilter('all')} className="hover:text-rose-600 cursor-pointer">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                  {officerFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                      Officer: {officers.find((o) => o.id === officerFilter)?.name}
                      <button onClick={() => setOfficerFilter('all')} className="hover:text-rose-600 cursor-pointer">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px]">
                      "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 cursor-pointer">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedAgingBucket(null);
                    setStatusFilter('all');
                    setOfficerFilter('all');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Cases List Content */}
          {filteredCases.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-1.5">
              <Filter className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No recovery cases match selected audit filters</p>
              <p className="text-[11px] text-slate-500">
                Clear the aging bucket or search query to view all assigned delinquent loans.
              </p>
              <button
                onClick={() => {
                  setSelectedAgingBucket(null);
                  setStatusFilter('all');
                  setOfficerFilter('all');
                  setSearchQuery('');
                }}
                className="mt-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
          <div className="space-y-2">
            {filteredCases.map((c) => {
              const loan = loans.find((l) => l.id === c.loanId);
              const cust = customers.find((cust) => cust.id === c.customerId);
              const isSelected = selectedCaseId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-num font-bold text-slate-900">
                      {loan?.loanNo || 'LN-2026-X'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      {c.daysPastDue} Days Past Due
                    </span>
                  </div>

                  <p className="font-semibold text-slate-800">{cust?.fullName}</p>
                  <p className="text-[11px] text-slate-500">{cust?.phone} • {cust?.occupation}</p>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-mono-num">
                    <span className="text-slate-500">Arrears:</span>
                    <strong className="text-rose-700 font-bold">{formatUGX(c.totalArrearsUGX)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Case Detail, PTP Recorder & Activity Log (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
          {selectedCase && activeCustomer && activeLoan ? (
            <>
              {/* Header Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Recovery Case</span>
                  <h3 className="text-base font-bold text-slate-900">{activeCustomer.fullName}</h3>
                  <p className="text-xs text-slate-600 font-mono-num">
                    Loan: {activeLoan.loanNo} • Balance: {formatUGX(activeLoan.principalOutstanding)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Assigned Officer: <strong className="text-slate-700">{assignedOfficer?.name || 'Recovery Desk'}</strong>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {selectedCase.daysPastDue} Days Overdue
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowSmsModal(true)}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Send SMS Reminder
                    </button>
                    <button
                      onClick={() => onQuickCollect(activeLoan)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Post Recovery Receipt
                    </button>
                  </div>
                </div>
              </div>

              {/* Latest Contact Outcome */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                <span className="font-bold text-blue-900 block mb-0.5">Last Contact Outcome:</span>
                <p className="text-blue-800">{selectedCase.lastContactOutcome}</p>
              </div>

              {/* Promises to Pay (PTP) */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Promises to Pay (PTP) Schedule
                </h4>

                <div className="space-y-2">
                  {selectedCase.promisesToPay.map((ptp) => (
                    <div
                      key={ptp.id}
                      className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-mono-num"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Promised Date: {ptp.promisedDate}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Recorded: {new Date(ptp.recordedAt).toLocaleDateString('en-UG')}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-slate-900 block font-bold">
                          {formatUGX(ptp.promisedAmount)}
                        </strong>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ptp.status === 'fulfilled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ptp.status === 'broken'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ptp.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Record New PTP Form */}
                <form onSubmit={handleSavePTP} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                  <span className="font-bold text-slate-800 block">Log New Borrower Commitment (PTP)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Promised Amount (UGX)
                      </label>
                      <input
                        type="number"
                        min={10000}
                        step={10000}
                        value={newPtpAmount}
                        onChange={(e) => setNewPtpAmount(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-mono-num font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Commitment Date
                      </label>
                      <input
                        type="date"
                        value={newPtpDate}
                        onChange={(e) => setNewPtpDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 font-mono-num focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md text-xs cursor-pointer"
                    >
                      Save Commitment
                    </button>
                  </div>
                </form>
              </div>

              {/* Log Recovery Note */}
              <form onSubmit={handleSaveNote} className="space-y-2 text-xs">
                <label className="block font-bold text-slate-800">
                  Record Officer Contact Attempt & Field Note
                </label>
                <div className="flex gap-2 mb-2">
                  {['Phone Call', 'Physical Field Visit', 'Demand Letter', 'Guarantor Call'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContactType(type)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                        contactType === type
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Detail borrower response, reason for delay, next steps..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-right">
                  <button
                    type="submit"
                    disabled={!newNote.trim()}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Append to Audit Log
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Select an arrears case to view recovery timeline.
            </div>
          )}
        </div>
      </div>

      {/* SMS Gateway Simulator Modal */}
      {showSmsModal && selectedCase && activeCustomer && activeLoan && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm">Automated SMS Notification Gateway</h3>
                  <p className="text-[10px] text-slate-400">Africa's Talking / Uganda Telecom Gateway Simulator</p>
                </div>
              </div>
              <button
                onClick={() => setShowSmsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Recipient Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-mono-num">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Borrower Recipient</span>
                  <strong className="text-slate-900">{activeCustomer.fullName}</strong>
                  <span className="text-slate-500 block text-[11px]">{activeCustomer.phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Arrears Due</span>
                  <strong className="text-rose-700 font-bold">{formatUGX(selectedCase.totalArrearsUGX)}</strong>
                  <span className="text-[10px] text-slate-500 block">{selectedCase.daysPastDue} Days Past Due</span>
                </div>
              </div>

              {/* Template Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select Approved Notification Template:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSmsTemplateType('friendly')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      smsTemplateType === 'friendly'
                        ? 'border-emerald-600 bg-emerald-50/60 font-bold text-emerald-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="block text-[11px] font-bold">1. Friendly Reminder</span>
                    <span className="text-[9px] text-slate-400">Pre-due / Grace period</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSmsTemplateType('overdue')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      smsTemplateType === 'overdue'
                        ? 'border-amber-600 bg-amber-50/60 font-bold text-amber-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="block text-[11px] font-bold">2. First Overdue Notice</span>
                    <span className="text-[9px] text-slate-400">1-30 Days DPD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSmsTemplateType('formal')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      smsTemplateType === 'formal'
                        ? 'border-rose-600 bg-rose-50/60 font-bold text-rose-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="block text-[11px] font-bold">3. Statutory Demand</span>
                    <span className="text-[9px] text-slate-400">30+ Days (UMRA Notice)</span>
                  </button>
                </div>
              </div>

              {/* Live SMS Content Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Live SMS Dispatch Preview:</label>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    {getSmsContent().length} chars ({Math.ceil(getSmsContent().length / 160)} SMS)
                  </span>
                </div>
                <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono-num text-[11px] leading-relaxed border border-slate-800 shadow-inner">
                  {getSmsContent()}
                </div>
              </div>

              {/* Status Banner */}
              {smsDeliveryStatus === 'delivered' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2 text-xs font-semibold">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  SMS dispatched successfully via MTN/Airtel SMS Gateway! Note logged in recovery case.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[10px] text-slate-400">
                Adheres to Uganda Tier 4 Non-Harassment recovery rules.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSmsModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  disabled={smsDeliveryStatus !== 'idle'}
                  onClick={handleSendSms}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {smsDeliveryStatus === 'sending' ? 'Transmitting SMS...' : 'Dispatch SMS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
