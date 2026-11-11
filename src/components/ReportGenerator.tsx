import React, { useState, useMemo } from 'react';
import {
  Tenant,
  Branch,
  AppUser,
  Loan,
  Customer,
  PaymentReceipt,
  LoanProduct,
  SavingsAccount,
  SavingsTransaction,
  ExpenseItem,
} from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  buildCustomerStatement,
  buildDailyCashierAudit,
} from '../utils/reportGeneratorUtils';
import {
  Printer,
  FileText,
  Calendar,
  Clock,
  User,
  CreditCard,
  Receipt,
  Building,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Search,
  Sparkles,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react';

export type ReportType = 'loan_schedule' | 'customer_statement' | 'daily_cashier';

interface ReportGeneratorProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  loans: Loan[];
  customers: Customer[];
  payments: PaymentReceipt[];
  products: LoanProduct[];
  savingsAccounts?: SavingsAccount[];
  savingsTransactions?: SavingsTransaction[];
  expenses?: ExpenseItem[];
  users?: AppUser[];
  initialReportType?: ReportType;
  initialLoanId?: string;
  initialCustomerId?: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  tenant,
  branch,
  currentUser,
  loans = [],
  customers = [],
  payments = [],
  products = [],
  savingsAccounts = [],
  savingsTransactions = [],
  expenses = [],
  users = [],
  initialReportType = 'loan_schedule',
  initialLoanId,
  initialCustomerId,
}) => {
  // Tenant-scoped records
  const tenantLoans = useMemo(() => loans.filter((l) => l.tenantId === tenant.id), [loans, tenant.id]);
  const tenantCustomers = useMemo(() => customers.filter((c) => c.tenantId === tenant.id), [customers, tenant.id]);
  const tenantPayments = useMemo(() => payments.filter((p) => p.tenantId === tenant.id), [payments, tenant.id]);
  const tenantExpenses = useMemo(() => expenses.filter((e) => e.tenantId === tenant.id), [expenses, tenant.id]);

  // Report Type Selection
  const [reportType, setReportType] = useState<ReportType>(initialReportType);

  // Filters for Loan Schedule
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    initialLoanId || tenantLoans[0]?.id || ''
  );
  const [loanSearch, setLoanSearch] = useState<string>('');

  // Filters for Customer Statement
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || tenantCustomers[0]?.id || ''
  );
  const [statementRange, setStatementRange] = useState<'all' | '30d' | '90d' | 'ytd'>('all');

  // Filters for Daily Cashier Report
  const [cashierDate, setCashierDate] = useState<string>('2026-11-03');
  const [cashierBranchId, setCashierBranchId] = useState<string>(branch.id);
  const [cashierUserId, setCashierUserId] = useState<string>(currentUser.id);
  const [openingFloatUGX, setOpeningFloatUGX] = useState<number>(2_500_000);
  const [actualCountedCashUGX, setActualCountedCashUGX] = useState<number>(0);

  // Selected Loan & Customer Objects
  const selectedLoan = useMemo(() => {
    return tenantLoans.find((l) => l.id === selectedLoanId) || tenantLoans[0] || null;
  }, [tenantLoans, selectedLoanId]);

  const selectedLoanCustomer = useMemo(() => {
    if (!selectedLoan) return null;
    return tenantCustomers.find((c) => c.id === selectedLoan.customerId) || null;
  }, [tenantCustomers, selectedLoan]);

  const selectedLoanProduct = useMemo(() => {
    if (!selectedLoan) return null;
    return products.find((p) => p.id === selectedLoan.productId) || null;
  }, [products, selectedLoan]);

  const selectedCustomer = useMemo(() => {
    return tenantCustomers.find((c) => c.id === selectedCustomerId) || tenantCustomers[0] || null;
  }, [tenantCustomers, selectedCustomerId]);

  // Customer Statement Data
  const customerStatement = useMemo(() => {
    if (!selectedCustomer) return null;
    let startDate: string | undefined;
    if (statementRange === '30d') startDate = '2026-10-04';
    else if (statementRange === '90d') startDate = '2026-08-04';
    else if (statementRange === 'ytd') startDate = '2026-01-01';

    return buildCustomerStatement(
      selectedCustomer.id,
      tenantLoans,
      tenantPayments,
      savingsAccounts,
      savingsTransactions,
      startDate
    );
  }, [selectedCustomer, tenantLoans, tenantPayments, savingsAccounts, savingsTransactions, statementRange]);

  // Daily Cashier Audit Data
  const dailyCashierAudit = useMemo(() => {
    const audit = buildDailyCashierAudit(
      cashierDate,
      cashierBranchId,
      tenantPayments,
      tenantLoans,
      tenantExpenses,
      openingFloatUGX
    );
    return audit;
  }, [cashierDate, cashierBranchId, tenantPayments, tenantLoans, tenantExpenses, openingFloatUGX]);

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Format Date for Display
  const currentDateDisplay = new Date().toLocaleDateString('en-UG', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* CONTROL PANEL BAR - EXCLUDED FROM PRINT MEDIA VIA .no-print */}
      <div className="no-print space-y-4">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-2xl border border-emerald-500/20 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Statutory Reporting &amp; Print Desk</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Official Institutional Report Generator
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Generate and print certified loan repayment schedules, comprehensive customer account
                statements, and daily cashier till audit reconciliations compliant with UMRA Tier 4
                financial guidelines.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-emerald-600/30"
              >
                <Printer className="w-4 h-4" />
                <span>Print Report (Ctrl + P)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Report Type Switcher & Selector Controls */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            {/* Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setReportType('loan_schedule')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  reportType === 'loan_schedule'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>1. Loan Repayment Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('customer_statement')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  reportType === 'customer_statement'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>2. Customer Account Statement</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('daily_cashier')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  reportType === 'daily_cashier'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>3. Daily Cashier Audit</span>
              </button>
            </div>

            {/* Quick Helper Text */}
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Utilizes official print styles in index.css (removes margins &amp; navbars when printing)</span>
            </div>
          </div>

          {/* DYNAMIC PARAMETER SELECTORS */}
          {reportType === 'loan_schedule' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Loan Facility Account *
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer"
                >
                  {tenantLoans.map((l) => {
                    const c = tenantCustomers.find((cust) => cust.id === l.customerId);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.loanNo} • {c?.fullName || 'Unknown Customer'} • {formatUGX(l.principalApproved)} ({l.termMonths} mos • {l.status.toUpperCase()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {tenantLoans.slice(0, 3).map((l) => {
                    const c = tenantCustomers.find((cust) => cust.id === l.customerId);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setSelectedLoanId(l.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          selectedLoanId === l.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {c?.fullName?.split(' ')[0] || l.loanNo}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {reportType === 'customer_statement' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Borrower / Customer Dossier *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer"
                >
                  {tenantCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} • NIN: {c.kyc?.idNumberMasked || 'N/A'} • {c.businessName || c.occupation || 'Borrower'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Statement Period / Date Filter:
                </label>
                <div className="inline-flex w-full rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setStatementRange('all')}
                    className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                      statementRange === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    All History
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementRange('30d')}
                    className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                      statementRange === '30d' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    Last 30d
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementRange('90d')}
                    className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                      statementRange === '90d' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    Last 90d
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementRange('ytd')}
                    className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-colors ${
                      statementRange === 'ytd' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    FY 2026
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">Customer Quick Picks:</span>
                <div className="flex flex-wrap gap-1.5">
                  {tenantCustomers.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        selectedCustomerId === c.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {c.fullName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reportType === 'daily_cashier' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audit Reconciliation Date *
                </label>
                <input
                  type="date"
                  value={cashierDate}
                  onChange={(e) => setCashierDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Branch Location *
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${branch.name} (${branch.code})`}
                  className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Opening Till Cash Float (UGX) *
                </label>
                <input
                  type="number"
                  step="100000"
                  value={openingFloatUGX}
                  onChange={(e) => setOpeningFloatUGX(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cashier / Teller Audited
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${currentUser.name} (${currentUser.role})`}
                  className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          PRINT-FRIENDLY DOCUMENT CANVAS (Utilizes .print-card from index.css)
          ========================================================================= */}
      <div className="print-card bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto font-sans text-slate-900 space-y-6">
        {/* INSTITUTIONAL LETTERHEAD */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shrink-0">
                {tenant.displayName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  {tenant.legalName}
                </h1>
                <p className="text-xs font-bold text-emerald-800">
                  Licensed by Uganda Microfinance Regulatory Authority (UMRA)
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Statutory Tier 4 Microfinance Institution • License Ref: UMRA/MFI/2026/0491
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-[11px] text-slate-600">
              <p className="font-bold text-slate-900">{branch.name}</p>
              <p>{branch.address}, {branch.city}, Uganda</p>
              <p>Helpline: {branch.phone} • Email: info@{tenant.slug || 'mfi'}.ug</p>
              <p className="font-mono text-[10px] text-slate-500 mt-1">
                Printed: {currentDateDisplay} | Auth: {currentUser.name}
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            VIEW 1: LOAN REPAYMENT SCHEDULE & AMORTIZATION REPORT
            ===================================================================== */}
        {reportType === 'loan_schedule' && selectedLoan && selectedLoanCustomer && (
          <div className="space-y-6">
            {/* Document Title */}
            <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Official Statutory Document
                </span>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Loan Repayment Schedule &amp; Amortization Dossier
                </h2>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded border border-slate-300 inline-block">
                  Ref: {selectedLoan.loanNo}
                </span>
              </div>
            </div>

            {/* Borrower & Loan Details Dossier (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Borrower Particulars */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  Borrower Particulars
                </h3>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Full Legal Name:</span>
                  <span className="font-bold text-slate-900">{selectedLoanCustomer.fullName}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">National ID (NIN):</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLoanCustomer.kyc?.idNumberMasked || 'CM8402****718K'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Phone Contact:</span>
                  <span className="font-mono text-slate-900">{selectedLoanCustomer.phone}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Enterprise / Trade:</span>
                  <span className="text-slate-900">{selectedLoanCustomer.businessName || selectedLoanCustomer.occupation || 'General Merchandise'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Physical Address:</span>
                  <span className="text-slate-900">{selectedLoanCustomer.kyc?.residenceTown ? `${selectedLoanCustomer.kyc.residenceTown}, ${selectedLoanCustomer.kyc.residenceDistrict}` : 'Kampala Central'}</span>
                </div>
              </div>

              {/* Facility Terms */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                  Facility Terms &amp; Conditions
                </h3>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Loan Product:</span>
                  <span className="font-bold text-slate-900">{selectedLoanProduct?.name || 'SME Working Capital'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Principal Approved:</span>
                  <span className="font-mono font-black text-slate-900">{formatUGX(selectedLoan.principalApproved)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Contract Rate &amp; Method:</span>
                  <span className="font-bold text-emerald-800">
                    {selectedLoan.interestRateAnnual}% p.a. ({selectedLoan.interestMethod === 'reducing_balance' ? 'Reducing Balance' : 'Flat Rate'})
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Repayment Tenure:</span>
                  <span className="font-bold text-slate-900">{selectedLoan.termMonths} Monthly Installments</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Disbursed Date:</span>
                  <span className="font-mono text-slate-900">{selectedLoan.disbursedAt?.split('T')[0] || '2026-06-01'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Maturity Date:</span>
                  <span className="font-mono text-slate-900">{selectedLoan.maturityDate || '2027-05-31'}</span>
                </div>
              </div>
            </div>

            {/* Installments Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Detailed Amortization &amp; Repayment Schedule
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2.5 text-center w-10">#</th>
                      <th className="p-2.5">Due Date</th>
                      <th className="p-2.5 text-right">Principal</th>
                      <th className="p-2.5 text-right">Interest</th>
                      <th className="p-2.5 text-right">Fees</th>
                      <th className="p-2.5 text-right font-black">Total Due</th>
                      <th className="p-2.5 text-right">Remaining Principal</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedLoan.schedule && selectedLoan.schedule.length > 0 ? (
                      selectedLoan.schedule.map((inst) => (
                        <tr key={inst.installmentNo} className={inst.status === 'paid' ? 'bg-emerald-50/30' : inst.status === 'overdue' ? 'bg-red-50/30' : 'hover:bg-slate-50'}>
                          <td className="p-2 text-center font-bold text-slate-500">{inst.installmentNo}</td>
                          <td className="p-2 font-mono">{inst.dueDate}</td>
                          <td className="p-2 text-right font-mono-num font-mono">{formatUGX(inst.principalDue)}</td>
                          <td className="p-2 text-right font-mono-num font-mono">{formatUGX(inst.interestDue)}</td>
                          <td className="p-2 text-right font-mono-num font-mono">{formatUGX(inst.feesDue)}</td>
                          <td className="p-2 text-right font-mono-num font-mono font-bold text-slate-900">{formatUGX(inst.totalDue)}</td>
                          <td className="p-2 text-right font-mono-num font-mono text-slate-600">{formatUGX(inst.remainingPrincipal)}</td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inst.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inst.status === 'overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {inst.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                          No schedule installments recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={2} className="p-2.5 text-right uppercase">Schedule Totals:</td>
                      <td className="p-2.5 text-right font-mono font-black">{formatUGX(selectedLoan.principalApproved)}</td>
                      <td className="p-2.5 text-right font-mono font-black">{formatUGX(selectedLoan.totalInterestExpected)}</td>
                      <td className="p-2.5 text-right font-mono font-black">{formatUGX(selectedLoan.totalFeesCharged || 0)}</td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-900">
                        {formatUGX(selectedLoan.principalApproved + selectedLoan.totalInterestExpected + (selectedLoan.totalFeesCharged || 0))}
                      </td>
                      <td colSpan={2} className="p-2.5 text-center text-slate-500 text-[10px]">
                        Outstanding: {formatUGX(selectedLoan.principalOutstanding)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Statutory Notice */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Statutory Prepayment &amp; Disclosure Notice (Tier 4 MFIs Act 2016, Sec. 51):</strong>{' '}
              Borrowers are entitled to settle this facility ahead of maturity without penalty, with early payoff rebates calculated on unearned interest. Payments made after due dates accrue statutory default fees of {selectedLoanProduct?.penaltyLateDailyPercent || 0.1}% daily.
            </div>

            {/* Formal Execution Signatures Block */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-6 text-xs">
              <div className="space-y-6">
                <p className="font-bold text-slate-700">Borrower Signature</p>
                <div className="border-b border-slate-400 pt-6"></div>
                <p className="text-[10px] text-slate-500">{selectedLoanCustomer.fullName} • Date</p>
              </div>

              <div className="space-y-6">
                <p className="font-bold text-slate-700">Credit Officer Endorsement</p>
                <div className="border-b border-slate-400 pt-6"></div>
                <p className="text-[10px] text-slate-500">{currentUser.name} • Date</p>
              </div>

              <div className="space-y-2 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center">
                <p className="font-bold text-slate-700 text-[10px] uppercase">Official Seal / Branch Stamp</p>
                <div className="h-12 flex items-center justify-center text-slate-400 text-[10px] font-mono">
                  [ AFFIX INSTITUTIONAL STAMP ]
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 2: CUSTOMER CONSOLIDATED ACCOUNT STATEMENT
            ===================================================================== */}
        {reportType === 'customer_statement' && selectedCustomer && customerStatement && (
          <div className="space-y-6">
            {/* Document Title */}
            <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Confidential Financial Record
                </span>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Customer Consolidated Statement of Account
                </h2>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded border border-slate-300 inline-block">
                  Customer Ref: {selectedCustomer.customerNo || selectedCustomer.id}
                </span>
              </div>
            </div>

            {/* Borrower KYC Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-1">
                  Account Holder Identification
                </h3>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="font-bold text-slate-900">{selectedCustomer.fullName}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">National ID (NIN):</span>
                  <span className="font-mono font-bold text-slate-900">{selectedCustomer.kyc?.idNumberMasked || 'CM8402****718K'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Phone Contact:</span>
                  <span className="font-mono text-slate-900">{selectedCustomer.phone}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Address / Location:</span>
                  <span className="text-slate-900">{selectedCustomer.kyc?.residenceTown ? `${selectedCustomer.kyc.residenceTown}, ${selectedCustomer.kyc.residenceDistrict}` : 'Kampala, Uganda'}</span>
                </div>
              </div>

              {/* Portfolio Balances Summary */}
              <div className="border border-slate-200 rounded-xl p-4 bg-emerald-50/40 space-y-1.5">
                <h3 className="font-bold text-emerald-950 text-[11px] uppercase tracking-wider border-b border-emerald-200 pb-1">
                  Institutional Exposure &amp; Balances
                </h3>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Total Borrowed (Lifetime):</span>
                  <span className="font-mono font-bold text-slate-900">{formatUGX(customerStatement.totalBorrowedUGX)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Total Repaid Principal:</span>
                  <span className="font-mono font-bold text-emerald-800">{formatUGX(customerStatement.totalRepaidPrincipalUGX)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Active Outstanding Debt:</span>
                  <span className="font-mono font-black text-rose-700">{formatUGX(customerStatement.currentLoanBalanceUGX)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Member Savings Liability:</span>
                  <span className="font-mono font-bold text-sky-800">{formatUGX(customerStatement.totalSavingsBalanceUGX)}</span>
                </div>
              </div>
            </div>

            {/* Unified Chronological Activity Ledger */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Consolidated Transaction History &amp; Ledger Entries
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Ref #</th>
                      <th className="p-2.5">Facility / Item</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Channel</th>
                      <th className="p-2.5 text-right">Debit (UGX)</th>
                      <th className="p-2.5 text-right">Credit (UGX)</th>
                      <th className="p-2.5 text-right font-black">Net Debt Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {customerStatement.entries && customerStatement.entries.length > 0 ? (
                      customerStatement.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono whitespace-nowrap">{entry.date}</td>
                          <td className="p-2 font-mono text-[10px] text-slate-500">{entry.refNo}</td>
                          <td className="p-2 font-bold text-slate-800 whitespace-nowrap">{entry.facility}</td>
                          <td className="p-2 text-slate-600 text-[10px]">{entry.description}</td>
                          <td className="p-2 text-[10px] text-slate-500 whitespace-nowrap">{entry.channel}</td>
                          <td className="p-2 text-right font-mono-num font-mono text-slate-900 font-bold">
                            {entry.debitUGX > 0 ? formatUGX(entry.debitUGX) : '—'}
                          </td>
                          <td className="p-2 text-right font-mono-num font-mono text-emerald-700 font-bold">
                            {entry.creditUGX > 0 ? formatUGX(entry.creditUGX) : '—'}
                          </td>
                          <td className="p-2 text-right font-mono-num font-mono font-black text-slate-900">
                            {formatUGX(entry.runningBalanceUGX)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                          No transactions found for the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Certified True Copy Verification */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-4">
                <p className="font-bold text-slate-700">Accounting Officer Certification</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  I hereby certify that this statement represents a true and accurate record of transactions
                  posted to the institutional core banking database of {tenant.legalName}.
                </p>
                <div className="border-b border-slate-400 pt-4"></div>
                <p className="text-[10px] text-slate-500">{currentUser.name} • Authorized Signatory</p>
              </div>

              <div className="space-y-2 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center">
                <p className="font-bold text-slate-700 text-[10px] uppercase">Audit Stamp &amp; Certification</p>
                <div className="h-12 flex items-center justify-center text-slate-400 text-[10px] font-mono">
                  [ VERIFIED ACCREDITED RECORD ]
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW 3: DAILY CASHIER RECONCILIATION & TELLER AUDIT REPORT
            ===================================================================== */}
        {reportType === 'daily_cashier' && dailyCashierAudit && (
          <div className="space-y-6">
            {/* Document Title */}
            <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Cash Operations &amp; Shift Balancing Register
                </span>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Daily Cashier Terminal Reconciliation &amp; Audit Report
                </h2>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded border border-slate-300 inline-block">
                  Shift Date: {cashierDate}
                </span>
              </div>
            </div>

            {/* Reconciliation KPI Matrix (3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Cash Till Balance */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-1">
                  1. Cash Till Float (Physical)
                </h3>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Opening Till Float:</span>
                  <span className="font-mono font-bold text-slate-900">{formatUGX(dailyCashierAudit.openingCashFloatUGX)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">(+) Cash Inflows Collected:</span>
                  <span className="font-mono font-bold text-emerald-800">+{formatUGX(dailyCashierAudit.totalCashInflowsUGX)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">(-) Cash Outflows / Vouchers:</span>
                  <span className="font-mono font-bold text-rose-700">-{formatUGX(dailyCashierAudit.totalCashOutflowsUGX)}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-300 mt-1">
                  <span className="font-bold text-slate-900">Expected Closing Cash:</span>
                  <span className="font-mono font-black text-slate-900">{formatUGX(dailyCashierAudit.expectedClosingCashUGX)}</span>
                </div>
              </div>

              {/* Digital & Mobile Money Channels */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider border-b border-slate-200 pb-1">
                  2. Digital / Mobile Money
                </h3>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">MTN Mobile Money:</span>
                  <span className="font-mono font-bold text-slate-900">{formatUGX(dailyCashierAudit.momoRepaymentsUGX)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Airtel Money Float:</span>
                  <span className="font-mono font-bold text-slate-900">{formatUGX(dailyCashierAudit.airtelRepaymentsUGX)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Bank Direct Deposits:</span>
                  <span className="font-mono font-bold text-slate-900">{formatUGX(dailyCashierAudit.bankTransferRepaymentsUGX)}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-300 mt-1">
                  <span className="font-bold text-slate-900">Total Digital Volume:</span>
                  <span className="font-mono font-black text-emerald-800">{formatUGX(dailyCashierAudit.totalElectronicInflowsUGX)}</span>
                </div>
              </div>

              {/* Consolidated Daily Turnover */}
              <div className="border border-emerald-300 rounded-xl p-4 bg-emerald-50/50 space-y-1.5">
                <h3 className="font-bold text-emerald-950 text-[11px] uppercase tracking-wider border-b border-emerald-200 pb-1">
                  3. Total Daily Collections
                </h3>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Total Posted Receipts:</span>
                  <span className="font-bold text-slate-900">{dailyCashierAudit.totalReceiptsCount} Receipts</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Cash Loan Disbursements:</span>
                  <span className="font-mono font-bold text-slate-900">{formatUGX(dailyCashierAudit.cashDisbursementsUGX)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Petty Cash Vouchers:</span>
                  <span className="font-mono font-bold text-slate-900">{formatUGX(dailyCashierAudit.pettyCashExpensesUGX)}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-emerald-300 mt-1">
                  <span className="font-bold text-emerald-950">Grand Daily Inflow:</span>
                  <span className="font-mono font-black text-emerald-900">
                    {formatUGX(dailyCashierAudit.totalCashInflowsUGX + dailyCashierAudit.totalElectronicInflowsUGX)}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Receipt Transaction Breakdown */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Shift Payment Receipts Log ({dailyCashierAudit.receipts.length} Transactions)
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Receipt #</th>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5">Channel</th>
                      <th className="p-2.5">Ext. Ref</th>
                      <th className="p-2.5 text-right font-black">Amount (UGX)</th>
                      <th className="p-2.5 text-right">Principal</th>
                      <th className="p-2.5 text-right">Interest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dailyCashierAudit.receipts && dailyCashierAudit.receipts.length > 0 ? (
                      dailyCashierAudit.receipts.map((r) => {
                        const cust = tenantCustomers.find((c) => c.id === r.customerId);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-[10px] text-slate-500">
                              {r.postedAt ? r.postedAt.split('T')[1]?.substring(0, 5) || '12:00' : '12:00'}
                            </td>
                            <td className="p-2 font-mono font-bold text-slate-800">{r.receiptNo}</td>
                            <td className="p-2 font-semibold text-slate-900">{cust?.fullName || 'Customer'}</td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {r.channel}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-500">{r.externalReference || '—'}</td>
                            <td className="p-2 text-right font-mono-num font-mono font-bold text-emerald-800">
                              {formatUGX(r.amount)}
                            </td>
                            <td className="p-2 text-right font-mono-num font-mono text-slate-600">
                              {formatUGX(r.principalAllocated)}
                            </td>
                            <td className="p-2 text-right font-mono-num font-mono text-slate-600">
                              {formatUGX(r.interestAllocated)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                          No transactions recorded on {cashierDate}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Denomination Balancing Table & Declarations */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="space-y-4">
                <p className="font-bold text-slate-700">Cashier / Teller Declaration</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  I hereby declare that the physical cash in my till matches the reconciled figures
                  and that all receipts and disbursements have been faithfully entered into the core ledger.
                </p>
                <div className="border-b border-slate-400 pt-4"></div>
                <p className="text-[10px] text-slate-500">{currentUser.name} • Teller</p>
              </div>

              <div className="space-y-4">
                <p className="font-bold text-slate-700">Head Cashier / Branch Accountant Review</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Cash safe count verified. Cash deposit prepared for secure banking transit.
                </p>
                <div className="border-b border-slate-400 pt-4"></div>
                <p className="text-[10px] text-slate-500">Moses Ochieng • Branch Accountant</p>
              </div>

              <div className="space-y-2 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center">
                <p className="font-bold text-slate-700 text-[10px] uppercase">Branch Manager Endorsement</p>
                <div className="h-12 flex items-center justify-center text-slate-400 text-[10px] font-mono">
                  [ CASH DRAWER BALANCED ]
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
