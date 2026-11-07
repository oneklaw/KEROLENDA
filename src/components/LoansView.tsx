import React, { useState } from 'react';
import {
  Loan,
  Customer,
  LoanProduct,
  Tenant,
  Branch,
  AppUser,
  SystemNotification,
} from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  CreditCard,
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  X,
  Calculator,
  Download,
  Smartphone,
  Mail,
  Bell,
  Sparkles,
  RefreshCw,
  Send,
} from 'lucide-react';
import { exportLoanPortfolioPDF } from '../utils/pdfExport';
import { LoanCalculatorModal } from './LoanCalculatorModal';
import {
  findUpcomingInstallments,
  calculateDaysUntilDue,
} from '../utils/installmentReminderService';

interface LoansViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  loans: Loan[];
  customers: Customer[];
  products: LoanProduct[];
  notifications?: SystemNotification[];
  onOpenOrigination: () => void;
  onQuickCollect: (loan: Loan) => void;
  onRestructureLoan: (loanId: string, newTermMonths: number, reason: string) => void;
  onTriggerReminderScan?: (refDate: string) => void;
  onOpenNotificationsModal?: () => void;
}

export const LoansView: React.FC<LoansViewProps> = ({
  tenant,
  branch,
  currentUser,
  loans,
  customers,
  products,
  notifications = [],
  onOpenOrigination,
  onQuickCollect,
  onRestructureLoan,
  onTriggerReminderScan,
  onOpenNotificationsModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'in_arrears' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showPayoffQuote, setShowPayoffQuote] = useState<boolean>(false);
  const [showRestructureModal, setShowRestructureModal] = useState<boolean>(false);
  const [showLoanAgreement, setShowLoanAgreement] = useState<boolean>(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState<boolean>(false);
  const [newRestructureTerm, setNewRestructureTerm] = useState<number>(12);
  const [restructureReason, setRestructureReason] = useState<string>('');

  const tenantLoans = loans.filter((l) => l.tenantId === tenant.id);

  const filteredLoans = tenantLoans.filter((l) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'in_arrears'
        ? l.status === 'in_arrears' || l.daysPastDue > 0
        : l.status === statusFilter;

    const cust = customers.find((c) => c.id === l.customerId);
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      l.loanNo.toLowerCase().includes(query) ||
      (cust && (cust.fullName.toLowerCase().includes(query) || cust.phone.includes(query)));

    return matchesStatus && matchesSearch;
  });

  const activeLoanCustomer = selectedLoan ? customers.find((c) => c.id === selectedLoan.customerId) : null;
  const activeLoanProduct = selectedLoan ? products.find((p) => p.id === selectedLoan.productId) : null;

  // Compute facilities with installments due in 3 days
  const upcoming3DayMatches = findUpcomingInstallments(tenantLoans, customers, '2026-11-03', 3);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Loan Servicing & Amortization Schedules
          </h2>
          <p className="text-xs text-slate-500">
            Monitor performing loans, inspect statutory schedules, compute early payoff quotes, and process restructures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCalculatorModal(true)}
            data-testid="quick-loan-calculator-button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
            title="Simulate loan amortization and generate repayment schedules without creating an application"
          >
            <Calculator className="w-4 h-4 text-emerald-700" />
            Quick Loan Calculator
          </button>

          <button
            onClick={() => exportLoanPortfolioPDF(tenant, branch, filteredLoans, customers, currentUser)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title="Export branded PDF report with tenant logo, colors & UMRA details"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export PDF Report
          </button>

          <button
            onClick={onOpenOrigination}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            Originate New Loan
          </button>
        </div>
      </div>

      {/* Automated 3-Day Upcoming Installment Reminders Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 text-white p-5 rounded-2xl border border-emerald-500/30 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  Automated 3-Day Installment Reminders Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  SMS &amp; Email Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Automatically scans active facilities and schedules SMS and Email payment notices 3 days prior to installment maturity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onTriggerReminderScan && (
              <button
                type="button"
                onClick={() => onTriggerReminderScan('2026-11-03')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Scan 3-Day Reminders
              </button>
            )}
            {onOpenNotificationsModal && (
              <button
                type="button"
                onClick={onOpenNotificationsModal}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                Open Notification Hub
              </button>
            )}
          </div>
        </div>

        {/* 3-Day Matched Facilities List */}
        {upcoming3DayMatches.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming3DayMatches.map((m) => {
              const cust = m.customer;
              return (
                <div
                  key={`${m.loan.id}-${m.installment.installmentNo}`}
                  className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-bold">{cust?.fullName || 'Borrower'}</strong>
                      <span className="text-emerald-400 font-mono text-[11px]">{m.loan.loanNo}</span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                        Instalment #{m.installment.installmentNo}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>
                        Due:{' '}
                        <strong className="text-slate-200 font-mono-num">
                          {m.installment.dueDate} (in 3 days)
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Amount:{' '}
                        <strong className="text-emerald-300 font-mono-num">
                          {formatUGX(m.amountDue)}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 text-sky-300">
                        <Smartphone className="w-2.5 h-2.5" /> SMS: {cust?.phone}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-indigo-300">
                        <Mail className="w-2.5 h-2.5" /> Email: {cust?.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-md">
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> Auto-Scheduled
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuickCollect(m.loan)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline"
                    >
                      Receive Payment →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              No installments currently falling exactly 3 days away for the simulated date. Next automatic evaluation runs on date advancement.
            </span>
          </div>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search loan no, borrower name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-60 sm:w-72"
            />
          </div>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Loans ({tenantLoans.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'active' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Performing ({tenantLoans.filter((l) => l.status === 'active' && l.daysPastDue === 0).length})
          </button>
          <button
            onClick={() => setStatusFilter('in_arrears')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'in_arrears' ? 'bg-white text-slate-900 shadow-xs font-bold text-rose-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Arrears ({tenantLoans.filter((l) => l.status === 'in_arrears' || l.daysPastDue > 0).length})
          </button>
          <button
            onClick={() => setStatusFilter('settled')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'settled' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settled ({tenantLoans.filter((l) => l.status === 'settled').length})
          </button>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-3 px-3">Loan Account</th>
                <th className="py-3 px-3">Borrower & NIN</th>
                <th className="py-3 px-3">Product & Rate</th>
                <th className="py-3 px-3 text-right">Approved</th>
                <th className="py-3 px-3 text-right">Outstanding</th>
                <th className="py-3 px-3 text-center">Status & DPD</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.map((loan) => {
                const cust = customers.find((c) => c.id === loan.customerId);
                const prod = products.find((p) => p.id === loan.productId);
                const isOverdue = loan.status === 'in_arrears' || loan.daysPastDue > 0;

                return (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-mono-num font-bold text-slate-900">{loan.loanNo}</p>
                      <span className="text-[10px] text-slate-400 font-mono-num">
                        Disbursed: {loan.disbursedAt.split('T')[0]}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{cust?.fullName}</p>
                      <p className="text-[11px] text-slate-500 font-mono-num">
                        {cust?.phone} • NIN: {cust?.kyc.idNumberMasked}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-700">{prod?.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {loan.interestRateAnnual}% p.a. ({loan.interestMethod === 'flat' ? 'Flat' : 'Reducing'}) • {loan.termMonths} mos
                      </p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-num font-semibold text-slate-700">
                      {formatUGX(loan.principalApproved)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-num font-bold text-slate-900">
                      {formatUGX(loan.principalOutstanding)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isOverdue ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {loan.daysPastDue}d Arrears
                        </span>
                      ) : loan.status === 'settled' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Performing
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onQuickCollect(loan)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Collect
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLoan(loan);
                            setShowLoanAgreement(true);
                          }}
                          className="px-2 py-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] cursor-pointer flex items-center gap-1 border border-sky-200"
                          title="UMRA Tier 4 Pre-Contract Disclosure & Agreement"
                        >
                          <FileText className="w-3 h-3" />
                          Contract
                        </button>
                        <button
                          onClick={() => setSelectedLoan(loan)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                        >
                          Schedule
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amortization Schedule & Servicing Drawer / Modal */}
      {selectedLoan && !showLoanAgreement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Amortization Schedule & Servicing: {selectedLoan.loanNo}
                </h3>
                <p className="text-xs text-slate-400">
                  Borrower: {activeLoanCustomer?.fullName} • Product: {activeLoanProduct?.name} ({selectedLoan.interestRateAnnual}% {selectedLoan.interestMethod})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLoanAgreement(true)}
                  className="px-3 py-1.5 bg-sky-900/60 hover:bg-sky-800 text-sky-200 text-xs font-semibold rounded-lg border border-sky-700/60 cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Pre-Contract & Agreement
                </button>
                <button
                  onClick={() => setShowPayoffQuote(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 cursor-pointer"
                >
                  Payoff Quote
                </button>
                <button
                  onClick={() => setShowRestructureModal(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 cursor-pointer"
                >
                  Restructure
                </button>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Balances Ribbon */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-num shrink-0">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Approved Principal</span>
                <strong className="text-slate-900">{formatUGX(selectedLoan.principalApproved)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Principal Outstanding</span>
                <strong className="text-emerald-700 font-bold">{formatUGX(selectedLoan.principalOutstanding)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Interest & Fees Paid</span>
                <strong className="text-slate-800">
                  {formatUGX(selectedLoan.totalPaidInterest + selectedLoan.totalPaidFees)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Maturity Date</span>
                <strong className="text-slate-800">{selectedLoan.maturityDate}</strong>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs font-mono-num">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="py-2 px-3 text-center">Instalment #</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3 text-right">Principal Due</th>
                    <th className="py-2 px-3 text-right">Interest Due</th>
                    <th className="py-2 px-3 text-right">Fees Due</th>
                    <th className="py-2 px-3 text-right">Total Due</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedLoan.schedule.map((inst) => {
                    const isPaid = inst.status === 'paid';
                    const isOverdue = inst.status === 'overdue';

                    const daysAway = calculateDaysUntilDue(inst.dueDate, '2026-11-03');
                    const isDueIn3Days = daysAway === 3;

                    return (
                      <tr key={inst.installmentNo} className={isPaid ? 'bg-slate-50/40 text-slate-400' : isDueIn3Days ? 'bg-sky-50/50 hover:bg-sky-50' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-3 text-center font-bold">{inst.installmentNo}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {inst.dueDate}
                          {isDueIn3Days && (
                            <span className="block text-[10px] text-sky-700 font-bold">
                              (in 3 days)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatUGX(inst.principalDue)}</td>
                        <td className="py-2.5 px-3 text-right text-sky-700">{formatUGX(inst.interestDue)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-700">{formatUGX(inst.feesDue)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatUGX(inst.totalDue)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatUGX(inst.remainingPrincipal)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                          ) : isDueIn3Days ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-sky-600" /> Due in 3d
                              </span>
                              <span className="text-[9px] text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                                <Smartphone className="w-2.5 h-2.5 text-sky-600" />
                                <Mail className="w-2.5 h-2.5 text-indigo-600" />
                                Reminders Sent
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Uganda UMRA Day-Count Convention: 30/360 deterministic schedule.
              </span>
              <button
                onClick={() => onQuickCollect(selectedLoan)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
              >
                Collect Repayment on this Loan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payoff Quote Modal */}
      {showPayoffQuote && selectedLoan && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Official Loan Payoff Quote
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Valid through 29 October 2026. Includes statutory unearned interest rebate for early settlement.
            </p>

            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono-num mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Principal Outstanding:</span>
                <strong className="text-slate-900">{formatUGX(selectedLoan.principalOutstanding)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Accrued Interest to Date:</span>
                <strong className="text-slate-900">{formatUGX(selectedLoan.interestAccruedOutstanding)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Administrative Fees:</span>
                <strong className="text-slate-900">{formatUGX(selectedLoan.feesOutstanding)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Penalties:</span>
                <strong className="text-slate-900">{formatUGX(selectedLoan.penaltiesOutstanding)}</strong>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Early Settlement Rebate:</span>
                <strong>-UGX 150,000</strong>
              </div>
              <div className="pt-2 border-t-2 border-slate-900 flex justify-between text-sm font-bold text-slate-900">
                <span>TOTAL PAYOFF FIGURE:</span>
                <span>
                  {formatUGX(
                    Math.max(
                      0,
                      selectedLoan.principalOutstanding +
                        selectedLoan.interestAccruedOutstanding +
                        selectedLoan.feesOutstanding +
                        selectedLoan.penaltiesOutstanding -
                        150_000
                    )
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPayoffQuote(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restructure / Reschedule Modal */}
      {showRestructureModal && selectedLoan && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              Loan Reschedule / Restructure (PRD M05)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Requires documented rationale. Retains prior payment history and generates a new versioned schedule.
            </p>

            <div className="space-y-3 mb-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Extended Term (Months)
                </label>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={newRestructureTerm}
                  onChange={(e) => setNewRestructureTerm(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Restructure (Audited Requirement)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Borrower experienced supply chain delays due to road works; extending term reduces monthly burden to sustainable level."
                  value={restructureReason}
                  onChange={(e) => setRestructureReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRestructureModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!restructureReason.trim()}
                onClick={() => {
                  onRestructureLoan(selectedLoan.id, newRestructureTerm, restructureReason);
                  setShowRestructureModal(false);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Approve Restructure & Version Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UMRA Tier 4 Pre-Contract Disclosure & Loan Agreement Modal */}
      {showLoanAgreement && selectedLoan && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm">UMRA Pre-Contract Disclosure & Loan Agreement</h3>
                  <p className="text-[11px] text-slate-400 font-mono-num">{selectedLoan.loanNo} • Tier 4 Microfinance Compliance</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Contract
                </button>
                <button
                  onClick={() => setShowLoanAgreement(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contract Body (Printable) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-800">
              {/* Institution Header */}
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-lg font-black tracking-tight text-slate-900">{tenant.legalName}</h2>
                <p className="text-slate-500 text-[11px]">
                  {tenant.registeredAddress} • UMRA License No: <span className="font-mono-num font-bold text-slate-800">{tenant.branding.umraLicenseNo}</span>
                </p>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-md border border-slate-200 font-bold text-[11px] text-slate-700 tracking-wide uppercase">
                  Standard Credit Facility Agreement & Statutory Key Facts Statement
                </div>
              </div>

              {/* 1. Parties */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lending Institution</span>
                  <p className="font-bold text-slate-900">{tenant.legalName}</p>
                  <p className="text-[11px] text-slate-600">Branch: {branch.name}</p>
                  <p className="text-[11px] text-slate-600 font-mono-num">UMRA Lic: {tenant.branding.umraLicenseNo}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Borrower Particulars</span>
                  <p className="font-bold text-slate-900">{activeLoanCustomer?.fullName}</p>
                  <p className="text-[11px] text-slate-600 font-mono-num">NIN: {activeLoanCustomer?.kyc.idNumberMasked}</p>
                  <p className="text-[11px] text-slate-600 font-mono-num">Tel: {activeLoanCustomer?.phone}</p>
                  <p className="text-[11px] text-slate-600">
                    {activeLoanCustomer?.kyc.residenceTown}, {activeLoanCustomer?.kyc.residenceDistrict}
                  </p>
                </div>
              </div>

              {/* 2. Key Financial Terms */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Key Facts Statement (Schedule of Credit Terms)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-num">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Principal Approved</span>
                    <strong className="text-slate-900 text-sm">{formatUGX(selectedLoan.principalApproved)}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Interest Rate</span>
                    <strong className="text-slate-900 text-sm">{selectedLoan.interestRateAnnual}% p.a.</strong>
                    <span className="text-[10px] text-slate-500 block capitalize">{selectedLoan.interestMethod}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Term</span>
                    <strong className="text-slate-900 text-sm">{selectedLoan.termMonths} Months</strong>
                    <span className="text-[10px] text-slate-500 block">Monthly Instalments</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Total Repayable</span>
                    <strong className="text-emerald-900 text-sm">
                      {formatUGX(selectedLoan.principalApproved + selectedLoan.totalInterestExpected + selectedLoan.totalFeesCharged)}
                    </strong>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-mono-num p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Interest:</span>
                    <strong>{formatUGX(selectedLoan.totalInterestExpected)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Processing & Admin Fees:</span>
                    <strong>{formatUGX(selectedLoan.totalFeesCharged)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Effective APR:</span>
                    <strong className="text-slate-900">
                      {((selectedLoan.totalInterestExpected / selectedLoan.principalApproved) * (12 / selectedLoan.termMonths) * 100).toFixed(1)}% p.a.
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Statutory Disclosures */}
              <div className="space-y-2 text-[11px] text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 text-xs">
                  Statutory Disclosures under Uganda Tier 4 Microfinance Institutions & Money Lenders Act, 2016:
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    <strong>Statutory Allocation Waterfall (Section 61):</strong> All payments received from the borrower shall be allocated in strict order: first to outstanding default penalties, second to unpaid administrative fees, third to accrued interest, and lastly to reducing principal.
                  </li>
                  <li>
                    <strong>Early Settlement Rebate:</strong> The borrower has the statutory right to settle the facility at any time before maturity without penal fee. Unearned future interest will be deducted from the settlement sum.
                  </li>
                  <li>
                    <strong>Default & Recovery:</strong> In the event of default exceeding 30 days past due (PAR 30), formal statutory notices will be issued. At 90 days past due, collateral recovery or guarantor enforcement will proceed per legal process.
                  </li>
                  <li>
                    <strong>Data Protection:</strong> Client records are processed in compliance with Uganda Data Protection and Privacy Act, 2019. National ID (NIN) credentials are encrypted and access-audited.
                  </li>
                </ol>
              </div>

              {/* 4. Execution & Signatures */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-3">Borrower Signature</span>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1 flex items-end">
                    <span className="font-serif italic text-slate-700 text-sm">{activeLoanCustomer?.fullName}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono-num">Date: {selectedLoan.disbursedAt.split('T')[0]}</p>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-3">Guarantor Signature</span>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1 flex items-end">
                    <span className="font-serif italic text-slate-400 text-xs">[Guarantor on File]</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono-num">Date: {selectedLoan.disbursedAt.split('T')[0]}</p>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-white">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-3">For {tenant.displayName}</span>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1 flex items-end justify-between">
                    <span className="font-serif italic text-slate-800 text-xs">{currentUser.name}</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      APPROVED
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono-num">Credit Officer / Branch Seal</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 shrink-0">
              <span>Original copy stored electronically in KEROLENDA tenant repository.</span>
              <button
                onClick={() => setShowLoanAgreement(false)}
                className="px-4 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close Agreement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Quick Loan Calculator Modal */}
      <LoanCalculatorModal
        tenant={tenant}
        branch={branch}
        currentUser={currentUser}
        products={products}
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
        onApplyWithParams={() => {
          onOpenOrigination();
        }}
      />
    </div>
  );
};
