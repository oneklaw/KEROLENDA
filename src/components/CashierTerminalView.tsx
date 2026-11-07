import React, { useState } from 'react';
import {
  Loan,
  Customer,
  PaymentReceipt,
  Tenant,
  Branch,
  AppUser,
} from '../types';
import { formatUGX, allocatePayment } from '../utils/finance';
import {
  Receipt,
  Search,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Printer,
  Smartphone,
  CreditCard,
  Building,
  DollarSign,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface CashierTerminalViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  loans: Loan[];
  customers: Customer[];
  payments: PaymentReceipt[];
  onPostPayment: (paymentData: {
    loanId: string;
    customerId: string;
    amount: number;
    channel: PaymentReceipt['channel'];
    externalReference: string;
  }) => PaymentReceipt;
  onReversePayment: (receiptId: string, reason: string) => void;
  onViewReceipt: (receipt: PaymentReceipt) => void;
  initialSelectedLoan?: Loan | null;
}

export const CashierTerminalView: React.FC<CashierTerminalViewProps> = ({
  tenant,
  branch,
  currentUser,
  loans,
  customers,
  payments,
  onPostPayment,
  onReversePayment,
  onViewReceipt,
  initialSelectedLoan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(initialSelectedLoan || null);
  const [paymentAmount, setPaymentAmount] = useState<number>(500_000);
  const [channel, setChannel] = useState<PaymentReceipt['channel']>('MTN Mobile Money');
  const [externalReference, setExternalReference] = useState('');
  const [recentReceipt, setRecentReceipt] = useState<PaymentReceipt | null>(null);

  // Reversal Modal
  const [reversingReceiptId, setReversingReceiptId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Find customer for selected loan
  const customer = selectedLoan ? customers.find((c) => c.id === selectedLoan.customerId) : null;

  // Filter loans for search
  const filteredLoans = loans.filter((l) => {
    if (l.tenantId !== tenant.id) return false;
    const cust = customers.find((c) => c.id === l.customerId);
    const query = searchQuery.toLowerCase();
    return (
      l.loanNo.toLowerCase().includes(query) ||
      (cust && (cust.fullName.toLowerCase().includes(query) || cust.phone.includes(query)))
    );
  });

  // Calculate live preview of waterfall allocation
  const liveAllocation = selectedLoan
    ? allocatePayment(
        paymentAmount,
        selectedLoan.penaltiesOutstanding,
        selectedLoan.feesOutstanding,
        selectedLoan.interestAccruedOutstanding,
        selectedLoan.principalOutstanding
      )
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !customer || paymentAmount <= 0) return;

    const receipt = onPostPayment({
      loanId: selectedLoan.id,
      customerId: customer.id,
      amount: paymentAmount,
      channel,
      externalReference: externalReference || `${channel.substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    setRecentReceipt(receipt);
    setExternalReference('');
  };

  const handleConfirmReversal = () => {
    if (!reversingReceiptId || !reversalReason.trim()) return;
    onReversePayment(reversingReceiptId, reversalReason);
    setReversingReceiptId(null);
    setReversalReason('');
  };

  // Calculate today's cashier total collections
  const todayReceipts = payments.filter((p) => p.tenantId === tenant.id && p.status === 'posted');
  const totalCollectedToday = todayReceipts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Cashier & Teller Collection Terminal
          </h2>
          <p className="text-xs text-slate-500">
            Rapid repayment posting with instant waterfall allocation, mobile money reference validation, and printable vouchers.
          </p>
        </div>

        {/* Till Balance badge */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-right">
            <span className="text-[11px] text-emerald-700 font-medium block">
              Today&apos;s Posted Collections
            </span>
            <span className="text-base font-bold text-emerald-950 font-mono-num">
              {formatUGX(totalCollectedToday)}
            </span>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">
            <span className="block font-semibold text-slate-700">Cashier: {currentUser.name}</span>
            <span className="text-[11px]">Branch: {branch.name}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Loan Search & Borrower Selection (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600" />
            1. Select Active Loan Account
          </h3>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Loan No, Borrower Name or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick list of loans */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredLoans.map((loan) => {
              const cust = customers.find((c) => c.id === loan.customerId);
              const isSelected = selectedLoan?.id === loan.id;

              return (
                <div
                  key={loan.id}
                  onClick={() => {
                    setSelectedLoan(loan);
                    // default payment amount to scheduled instalment or principal outstanding
                    const nextPending = loan.schedule.find((i) => i.status === 'pending' || i.status === 'overdue');
                    if (nextPending) {
                      setPaymentAmount(nextPending.totalDue);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 font-mono-num">{loan.loanNo}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        loan.status === 'in_arrears'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {loan.status === 'in_arrears' ? `${loan.daysPastDue}d Arrears` : 'Performing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{cust?.fullName}</p>
                      <p className="text-[11px] text-slate-500">{cust?.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Balance</span>
                      <span className="font-mono-num font-bold text-slate-900">
                        {formatUGX(loan.principalOutstanding)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Payment Form & Waterfall Allocation Preview (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            2. Payment Parameters & Legal Waterfall Allocation
          </h3>

          {!selectedLoan ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Loan Selected</p>
              <p className="text-[11px] text-slate-500">
                Search and click a loan account from the left panel to proceed with collection.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Selected Loan Snapshot Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Borrower Profile</span>
                  <p className="text-sm font-bold text-slate-900">{customer?.fullName}</p>
                  <p className="text-[11px] text-slate-500">NIN: {customer?.kyc.idNumberMasked} • Phone: {customer?.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Payoff Balance</span>
                  <p className="text-sm font-bold text-slate-900 font-mono-num">
                    {formatUGX(
                      selectedLoan.principalOutstanding +
                        selectedLoan.interestAccruedOutstanding +
                        selectedLoan.feesOutstanding +
                        selectedLoan.penaltiesOutstanding
                    )}
                  </p>
                </div>
              </div>

              {/* Amount & Channel Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount Tendered (UGX)
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono-num font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as PaymentReceipt['channel'])}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="MTN Mobile Money">MTN Mobile Money</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Bank Transfer">Bank Transfer (Stanbic/Centenary)</option>
                    <option value="Cash Till">Cash Till (Physical Currency)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Provider Transaction Reference / Till Voucher No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. MTN-MM-994821 or STB-FT-44120"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-num rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Dynamic Waterfall Allocation Breakdown Box */}
              {liveAllocation && (
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-[11px] font-semibold text-emerald-400">
                      Tier 4 Statutory Allocation Waterfall
                    </span>
                    <span className="text-[10px] text-slate-400">Deterministic Engine</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 font-mono-num">
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-slate-400 block">1. Penalties</span>
                      <strong className="text-xs text-rose-400">
                        {formatUGX(liveAllocation.penaltyPaid)}
                      </strong>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-slate-400 block">2. Fees</span>
                      <strong className="text-xs text-amber-400">
                        {formatUGX(liveAllocation.feePaid)}
                      </strong>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-slate-400 block">3. Interest</span>
                      <strong className="text-xs text-sky-400">
                        {formatUGX(liveAllocation.interestPaid)}
                      </strong>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-slate-400 block">4. Principal</span>
                      <strong className="text-xs text-emerald-400">
                        {formatUGX(liveAllocation.principalPaid)}
                      </strong>
                    </div>
                  </div>

                  {liveAllocation.unallocated > 0 && (
                    <div className="text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-800 flex justify-between">
                      <span>Overpayment allocated to Suspense Float:</span>
                      <strong className="font-mono-num">{formatUGX(liveAllocation.unallocated)}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  Post Repayment & Print Receipt
                </button>
              </div>
            </form>
          )}

          {/* Last receipt banner if just completed */}
          {recentReceipt && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    Payment Posted: {recentReceipt.receiptNo}
                  </p>
                  <p className="text-[11px] text-emerald-800 font-mono-num">
                    {formatUGX(recentReceipt.amount)} via {recentReceipt.channel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onViewReceipt(recentReceipt)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                View & Print Receipt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Today's Transactions & Controlled Reversal Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Posted Receipts Log & Audited Reversals
            </h3>
            <p className="text-xs text-slate-500">
              PRD Section M06 compliance: In case of cashier error, reversals create linked compensating entries and never erase history.
            </p>
          </div>
          <span className="text-xs text-slate-400">Total {payments.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                <th className="py-2.5 px-3">Receipt No.</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Channel & Ref</th>
                <th className="py-2.5 px-3 text-right">Amount (UGX)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => {
                const cust = customers.find((c) => c.id === p.customerId);
                const isReversed = p.status === 'reversed';

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono-num font-bold text-slate-900">
                      {p.receiptNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono-num text-[11px]">
                      {new Date(p.postedAt).toLocaleString('en-UG', {
                        timeZone: 'Africa/Kampala',
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {cust?.fullName || 'Borrower'}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-slate-800">{p.channel}</p>
                      <p className="text-[11px] text-slate-400 font-mono-num">{p.externalReference}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-bold text-slate-900">
                      {formatUGX(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isReversed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Reversed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Posted
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewReceipt(p)}
                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                        >
                          Print
                        </button>
                        {!isReversed && (
                          <button
                            onClick={() => setReversingReceiptId(p.id)}
                            className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] cursor-pointer"
                            title="Reverse payment with compensating audit entry"
                          >
                            Reverse
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controlled Reversal Modal */}
      {reversingReceiptId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">
                Compensating Reversal Authorization
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              In accordance with financial compliance rules, this will NOT delete the original payment. It will generate a linked reversal journal entry and restore the loan balance.
            </p>

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-semibold text-slate-700">
                Reason for Reversal (Mandatory for Audit Trail)
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Cashier error entering customer account number; funds redirected to correct loan LN-2026-..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setReversingReceiptId(null);
                  setReversalReason('');
                }}
                className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReversal}
                disabled={!reversalReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Execute Reversal & Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
