import React, { useState } from 'react';
import {
  SavingsAccount,
  SavingsTransaction,
  ShareAccount,
  Customer,
  Tenant,
  Branch,
  AppUser,
} from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  PiggyBank,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Search,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  DollarSign,
  UserCheck,
  PieChart,
  Download,
} from 'lucide-react';
import { DividendProjectionModal } from './DividendProjectionModal';
import { exportSavingsSharesPDF } from '../utils/pdfExport';

interface SavingsSharesViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  savingsAccounts: SavingsAccount[];
  savingsTransactions: SavingsTransaction[];
  shareAccounts: ShareAccount[];
  customers: Customer[];
  onDepositSavings: (accountId: string, amount: number, channel: string) => void;
  onWithdrawSavings: (accountId: string, amount: number) => { success: boolean; error?: string };
  onPurchaseShares: (customerId: string, units: number) => void;
}

export const SavingsSharesView: React.FC<SavingsSharesViewProps> = ({
  tenant,
  branch,
  currentUser,
  savingsAccounts,
  savingsTransactions,
  shareAccounts,
  customers,
  onDepositSavings,
  onWithdrawSavings,
  onPurchaseShares,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'savings' | 'shares'>('savings');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBuySharesModal, setShowBuySharesModal] = useState(false);
  const [showDividendModal, setShowDividendModal] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState(savingsAccounts[0]?.id || '');
  const [txAmount, setTxAmount] = useState<number>(100_000);
  const [channel, setChannel] = useState<string>('MTN Mobile Money');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shares Form
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [shareUnits, setShareUnits] = useState<number>(10);
  const unitPrice = 20_000; // UGX 20,000 per share unit

  const tenantSavings = savingsAccounts.filter((s) => s.tenantId === tenant.id);
  const tenantShares = shareAccounts.filter((s) => s.tenantId === tenant.id);

  const totalSavingsLiability = tenantSavings.reduce((sum, s) => sum + s.currentBalance, 0);
  const totalShareCapital = tenantShares.reduce((sum, s) => sum + s.totalValueUGX, 0);
  const totalDividendsProposed = tenantShares.reduce((sum, s) => sum + s.dividendEarnedUGX, 0);

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || txAmount <= 0) return;
    onDepositSavings(selectedAccountId, txAmount, channel);
    setShowDepositModal(false);
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || txAmount <= 0) return;
    const result = onWithdrawSavings(selectedAccountId, txAmount);
    if (!result.success) {
      setErrorMessage(result.error || 'Withdrawal rejected.');
    } else {
      setShowWithdrawModal(false);
      setErrorMessage(null);
    }
  };

  const handleBuyShares = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || shareUnits <= 0) return;
    onPurchaseShares(selectedCustomerId, shareUnits);
    setShowBuySharesModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
            Member Savings & Share Capital Operations
          </h2>
          <p className="text-xs text-slate-500">
            PRD Section M08 & M09: SACCO & VSLA deposit-taking, minimum balance checks, and share capital equity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('savings')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'savings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Member Savings Accounts
            </button>
            <button
              onClick={() => setActiveSubTab('shares')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'shares' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Share Capital Registry
            </button>
          </div>

          <button
            onClick={() => setShowDividendModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            title="Project share dividends based on share units and return rate"
          >
            <PieChart className="w-3.5 h-3.5 text-emerald-600" />
            Project Dividends
          </button>

          <button
            onClick={() =>
              exportSavingsSharesPDF(tenant, branch, tenantSavings, tenantShares, customers, currentUser)
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            title="Export branded PDF report of savings and share ledger"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export PDF Report
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Savings Liabilities</span>
          <p className="text-xl font-bold text-slate-900 font-mono-num mt-1">
            {formatUGX(totalSavingsLiability)}
          </p>
          <span className="text-[11px] text-slate-400">Demand deposits owed to members</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Paid-Up Member Share Capital</span>
          <p className="text-xl font-bold text-slate-900 font-mono-num mt-1">
            {formatUGX(totalShareCapital)}
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold">
            UGX 20,000 per share unit
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Annual Dividend Pool (12% Yield)</span>
          <p className="text-xl font-bold text-indigo-700 font-mono-num mt-1">
            {formatUGX(totalDividendsProposed)}
          </p>
          <span className="text-[11px] text-slate-400">Subject to AGM confirmation</span>
        </div>
      </div>

      {/* Main Subtab 1: Savings Accounts */}
      {activeSubTab === 'savings' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Member Savings Accounts ({tenantSavings.length})
              </h3>
              <p className="text-xs text-slate-500">
                Locked guarantees for active loans cannot be withdrawn without credit clearance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setShowDepositModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Deposit Funds
              </button>
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setShowWithdrawModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Process Withdrawal
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3">Account No.</th>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Scheme Type</th>
                  <th className="py-2.5 px-3 text-right">Current Balance</th>
                  <th className="py-2.5 px-3 text-right">Locked Collateral</th>
                  <th className="py-2.5 px-3 text-right">Available Balance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-num">
                {tenantSavings.map((acc) => {
                  const cust = customers.find((c) => c.id === acc.customerId);

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{acc.accountNo}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-800">
                        {cust?.fullName}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-600">{acc.productType}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatUGX(acc.currentBalance)}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-700">
                        {formatUGX(acc.lockedGuaranteeAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {formatUGX(acc.availableBalance)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Subtab 2: Share Capital Registry */}
      {activeSubTab === 'shares' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Member Share Capital Register ({tenantShares.length})
              </h3>
              <p className="text-xs text-slate-500">
                Statutory equity capital in compliance with Cooperative Societies Act & UMRA rules.
              </p>
            </div>

            <button
              onClick={() => setShowBuySharesModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Issue Member Shares
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3">Share Reg No.</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3 text-right">Units Held</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total Equity Value</th>
                  <th className="py-2.5 px-3 text-right">2026 Dividend (12%)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-num">
                {tenantShares.map((shr) => {
                  const cust = customers.find((c) => c.id === shr.customerId);

                  return (
                    <tr key={shr.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{shr.accountNo}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-800">
                        {cust?.fullName}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">{shr.unitsHeld} units</td>
                      <td className="py-3 px-3 text-right text-slate-600">{formatUGX(shr.unitPriceUGX)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatUGX(shr.totalValueUGX)}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatUGX(shr.dividendEarnedUGX)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active Shareholder
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
              Post Member Savings Deposit
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Credits member liability and debits liquid cash till or MoMo float.
            </p>

            <form onSubmit={handleDeposit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Member Savings Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                >
                  {tenantSavings.map((s) => {
                    const cust = customers.find((c) => c.id === s.customerId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.accountNo} — {cust?.fullName} (Bal: {formatCompactUGX(s.currentBalance)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deposit Amount (UGX)
                </label>
                <input
                  type="number"
                  min={100}
                  step={1}
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                >
                  <option value="Cash Till">Cash Till (Teller)</option>
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Bank Deposit">Stanbic Bank Operational</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-3 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Post Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-amber-600" />
              Process Member Withdrawal
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enforces available balance checks and locked guarantee limits.
            </p>

            {errorMessage && (
              <div className="p-3 mb-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Member Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                >
                  {tenantSavings.map((s) => {
                    const cust = customers.find((c) => c.id === s.customerId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.accountNo} — {cust?.fullName} (Avail: {formatCompactUGX(s.availableBalance)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Withdrawal Amount (UGX)
                </label>
                <input
                  type="number"
                  min={100}
                  step={1}
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num font-bold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-3 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Approve Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buy Shares Modal */}
      {showBuySharesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Issue SACCO / MFI Member Shares
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Fixed statutory unit price: UGX 20,000 per share.
            </p>

            <form onSubmit={handleBuyShares} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Member
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.customerNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Units to Purchase
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={shareUnits}
                  onChange={(e) => setShareUnits(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num font-bold focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono-num text-xs flex justify-between">
                <span className="text-slate-600">Total Purchase Value:</span>
                <strong className="text-slate-900">{formatUGX(shareUnits * unitPrice)}</strong>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBuySharesModal(false)}
                  className="px-3 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Confirm Share Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dividend Payout Projection Modal */}
      <DividendProjectionModal
        tenant={tenant}
        currentUser={currentUser}
        shareAccounts={shareAccounts}
        customers={customers}
        isOpen={showDividendModal}
        onClose={() => setShowDividendModal(false)}
      />
    </div>
  );
};
