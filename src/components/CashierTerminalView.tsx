import React, { useState } from 'react';
import {
  Loan,
  Customer,
  PaymentReceipt,
  Tenant,
  Branch,
  AppUser,
  TelecomProvider,
  MobileMoneyTransaction,
  ProviderFloatSummary,
} from '../types';
import { formatUGX, allocatePayment } from '../utils/finance';
import {
  executeMobileMoneyPayment,
  reconcileProviderFloat,
} from '../utils/mobileMoneyService';
import {
  SEED_MOBILE_MONEY_TRANSACTIONS,
  SEED_PROVIDER_FLOATS,
} from '../data/seedData';
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
  Send,
  RefreshCw,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Check,
} from 'lucide-react';

interface CashierTerminalViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  loans: Loan[];
  customers: Customer[];
  payments: PaymentReceipt[];
  transactions?: MobileMoneyTransaction[];
  providerFloats?: ProviderFloatSummary[];
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
  onRecordMobileMoneyTx?: (tx: MobileMoneyTransaction) => void;
}

export const CashierTerminalView: React.FC<CashierTerminalViewProps> = ({
  tenant,
  branch,
  currentUser,
  loans,
  customers,
  payments,
  transactions: propTransactions,
  providerFloats: propFloats,
  onPostPayment,
  onReversePayment,
  onViewReceipt,
  initialSelectedLoan,
  onRecordMobileMoneyTx,
}) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'disbursements' | 'reconciliation'>('collections');

  // Core collections state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(initialSelectedLoan || null);
  const [paymentAmount, setPaymentAmount] = useState<number>(500_000);
  const [channel, setChannel] = useState<TelecomProvider | 'Cash'>('MTN Mobile Money');
  const [accountOrPhone, setAccountOrPhone] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [recentReceipt, setRecentReceipt] = useState<PaymentReceipt | null>(null);

  // Simulation mode
  const [simulateErrorMode, setSimulateErrorMode] = useState<'NONE' | 'INSUFFICIENT_FLOAT' | 'NAME_MISMATCH' | 'TIMEOUT_RETRY'>('NONE');
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [lastTxnError, setLastTxnError] = useState<string | null>(null);

  // Outgoing disbursement state
  const [disburseLoanId, setDisburseLoanId] = useState<string>(loans[0]?.id || '');
  const [disburseAmount, setDisburseAmount] = useState<number>(2_500_000);
  const [disburseProvider, setDisburseProvider] = useState<TelecomProvider>('MTN Mobile Money');
  const [disburseAccount, setDisburseAccount] = useState('');
  const [disburseRecipientName, setDisburseRecipientName] = useState('');
  const [disburseSuccessMessage, setDisburseSuccessMessage] = useState<string | null>(null);

  // Reversal Modal
  const [reversingReceiptId, setReversingReceiptId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Mobile money transactions & provider floats state
  const [transactions, setTransactions] = useState<MobileMoneyTransaction[]>(
    propTransactions && propTransactions.length > 0 ? propTransactions : SEED_MOBILE_MONEY_TRANSACTIONS
  );
  const [providerFloats, setProviderFloats] = useState<ProviderFloatSummary[]>(
    propFloats && propFloats.length > 0 ? propFloats : SEED_PROVIDER_FLOATS
  );
  const [reconciliationNotice, setReconciliationNotice] = useState<string | null>(null);

  // Find customer for selected loan
  const customer = selectedLoan ? customers.find((c) => c.id === selectedLoan.customerId) : null;

  // Auto-populate phone/account when loan selected
  React.useEffect(() => {
    if (customer) {
      setAccountOrPhone(customer.phone);
    }
  }, [customer]);

  // Auto-populate disbursement details when disburse loan changes
  const disburseTargetLoan = loans.find((l) => l.id === disburseLoanId);
  const disburseTargetCustomer = disburseTargetLoan ? customers.find((c) => c.id === disburseTargetLoan.customerId) : null;

  React.useEffect(() => {
    if (disburseTargetCustomer) {
      setDisburseAccount(disburseTargetCustomer.phone);
      setDisburseRecipientName(disburseTargetCustomer.fullName);
    }
  }, [disburseTargetCustomer]);

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

  const handleExecuteIncomingCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !customer || paymentAmount <= 0) return;

    setLastTxnError(null);
    setProcessingStatus('Connecting to Telecom Switch / Bank Gateway...');

    // If channel is Cash, handle direct posting
    if (channel === 'Cash') {
      const receipt = onPostPayment({
        loanId: selectedLoan.id,
        customerId: customer.id,
        amount: paymentAmount,
        channel: 'Cash Till',
        externalReference: externalReference || `CASH-${Date.now().toString().slice(-6)}`,
      });
      setRecentReceipt(receipt);
      setProcessingStatus(null);
      return;
    }

    // Mobile Money / Bank execution
    const execution = executeMobileMoneyPayment({
      tenantId: tenant.id,
      provider: channel,
      transactionType: 'INCOMING_COLLECTION',
      amount: paymentAmount,
      phoneNumberOrAccount: accountOrPhone || customer.phone,
      recipientLegalName: customer.fullName,
      internalReference: selectedLoan.loanNo,
      simulateFailureMode: simulateErrorMode,
    });

    if (!execution.success) {
      setLastTxnError(execution.message);
      setProcessingStatus(null);
      // Still log failed transaction for audit reconciliation
      setTransactions((prev) => [execution.transaction, ...prev]);
      return;
    }

    // Success flow
    setTransactions((prev) => [execution.transaction, ...prev]);
    if (onRecordMobileMoneyTx) {
      onRecordMobileMoneyTx(execution.transaction);
    }

    const receipt = onPostPayment({
      loanId: selectedLoan.id,
      customerId: customer.id,
      amount: paymentAmount,
      channel: channel as any,
      externalReference: execution.transaction.externalReference,
    });

    setRecentReceipt(receipt);
    setProcessingStatus(null);
  };

  const handleExecuteDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseTargetCustomer || disburseAmount <= 0) return;

    setLastTxnError(null);
    setDisburseSuccessMessage(null);

    const execution = executeMobileMoneyPayment({
      tenantId: tenant.id,
      provider: disburseProvider,
      transactionType: 'OUTGOING_DISBURSEMENT',
      amount: disburseAmount,
      phoneNumberOrAccount: disburseAccount,
      recipientLegalName: disburseRecipientName,
      internalReference: disburseTargetLoan ? disburseTargetLoan.loanNo : `DISB-${Date.now().toString().slice(-6)}`,
      simulateFailureMode: simulateErrorMode,
    });

    if (!execution.success) {
      setLastTxnError(execution.message);
      setTransactions((prev) => [execution.transaction, ...prev]);
      return;
    }

    setTransactions((prev) => [execution.transaction, ...prev]);
    if (onRecordMobileMoneyTx) {
      onRecordMobileMoneyTx(execution.transaction);
    }

    // Deduct from provider float
    setProviderFloats((prev) =>
      prev.map((f) => {
        if (f.provider === disburseProvider) {
          return {
            ...f,
            currentFloatUGX: Math.max(0, f.currentFloatUGX - disburseAmount),
            unreconciledOutflowUGX: f.unreconciledOutflowUGX + disburseAmount,
          };
        }
        return f;
      })
    );

    setDisburseSuccessMessage(
      `Disbursement of UGX ${disburseAmount.toLocaleString()} dispatched to ${disburseRecipientName} via ${disburseProvider} (Ref: ${execution.transaction.externalReference})`
    );
  };

  const handleRunReconciliation = (providerName: TelecomProvider) => {
    const float = providerFloats.find((f) => f.provider === providerName);
    const opening = float ? float.currentFloatUGX : 50_000_000;
    const result = reconcileProviderFloat(transactions, providerName, opening);

    // Mark provider's transactions as RECONCILED
    setTransactions((prev) =>
      prev.map((t) => (t.provider === providerName ? { ...t, reconciliationStatus: 'MATCHED', status: 'RECONCILED' } : t))
    );

    setProviderFloats((prev) =>
      prev.map((f) =>
        f.provider === providerName
          ? {
              ...f,
              unreconciledInflowUGX: 0,
              unreconciledOutflowUGX: 0,
              lastReconciledDate: new Date().toISOString().split('T')[0],
              status: 'healthy',
            }
          : f
      )
    );

    setReconciliationNotice(
      `Reconciliation Complete for ${providerName}: ${result.matchedCount} items cleared. Closing float: UGX ${result.closingFloatUGX.toLocaleString()} (Zero variance).`
    );
  };

  const handleConfirmReversal = () => {
    if (!reversingReceiptId || !reversalReason.trim()) return;
    onReversePayment(reversingReceiptId, reversalReason);
    setReversingReceiptId(null);
    setReversalReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Cashier Terminal & Ugandan Payment Integrations
              </h2>
              <p className="text-xs text-slate-400">
                Direct integration with MTN Mobile Money, Airtel Money, Stanbic Bank & Centenary Bank
              </p>
            </div>
          </div>

          {/* Test Simulation Controls */}
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Gateway Mode:</span>
            <select
              value={simulateErrorMode}
              onChange={(e) => setSimulateErrorMode(e.target.value as any)}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="NONE">Live (Instant Success)</option>
              <option value="INSUFFICIENT_FLOAT">Simulate: Insufficient Float</option>
              <option value="NAME_MISMATCH">Simulate: KYC SIM Name Mismatch</option>
              <option value="TIMEOUT_RETRY">Simulate: Gateway Timeout</option>
            </select>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'collections'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            Incoming Collections (Repayments & Deposits)
          </button>
          <button
            onClick={() => setActiveTab('disbursements')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'disbursements'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
            Outgoing Disbursements (Loan Payouts)
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'reconciliation'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-purple-400" />
            Bank & MoMo Float Reconciliation
          </button>
        </div>
      </div>

      {/* Error or Notice Alert */}
      {lastTxnError && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{lastTxnError}</span>
          </div>
          <button onClick={() => setLastTxnError(null)} className="text-rose-400 hover:text-rose-200">
            Dismiss
          </button>
        </div>
      )}

      {reconciliationNotice && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{reconciliationNotice}</span>
          </div>
          <button onClick={() => setReconciliationNotice(null)} className="text-emerald-400 hover:text-emerald-200">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: Incoming Collections */}
      {activeTab === 'collections' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Search & Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Search Loan / Borrower */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  Select Loan Account for Collection
                </h3>
                {selectedLoan && (
                  <span className="text-xs text-emerald-400 font-medium">
                    Selected: {selectedLoan.loanNo}
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by loan number (e.g. LN-2026-0041) or customer name/phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick Loan List */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800 rounded-lg">
                {filteredLoans.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No matching loans found.</div>
                ) : (
                  filteredLoans.map((loan) => {
                    const cust = customers.find((c) => c.id === loan.customerId);
                    const isSelected = selectedLoan?.id === loan.id;
                    return (
                      <div
                        key={loan.id}
                        onClick={() => setSelectedLoan(loan)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition text-xs ${
                          isSelected ? 'bg-emerald-600/15 border-l-4 border-emerald-500' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white">{cust?.fullName || 'Unknown Customer'}</div>
                          <div className="text-[11px] text-slate-400">
                            {loan.loanNo} • {cust?.phone}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            Balance: {formatUGX(loan.principalOutstanding + loan.interestAccruedOutstanding + loan.feesOutstanding + loan.penaltiesOutstanding)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Principal: {formatUGX(loan.principalOutstanding)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 2: Payment Parameters & Channel Selection */}
            {selectedLoan && customer && (
              <form onSubmit={handleExecuteIncomingCollection} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      2
                    </span>
                    Payment Details & Payment Gateway
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Borrower: {customer.fullName}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Payment Amount (UGX) *</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="50000"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Payment Channel / Gateway *</label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="MTN Mobile Money">MTN Mobile Money (Uganda)</option>
                      <option value="Airtel Money">Airtel Money (Uganda)</option>
                      <option value="Stanbic Bank">Stanbic Bank Uganda (Direct EFT)</option>
                      <option value="Centenary Bank">Centenary Bank (Agent / App)</option>
                      <option value="Cash">Cash Till (In-Branch)</option>
                    </select>
                  </div>
                </div>

                {channel !== 'Cash' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Payer Phone / Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={accountOrPhone}
                        onChange={(e) => setAccountOrPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Subscriber Legal Name (Verified)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={customer.fullName}
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Waterfall Allocation Live Preview */}
                {liveAllocation && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400 font-semibold uppercase text-[11px]">
                      <span>Prudential Waterfall Allocation Preview</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {formatUGX(paymentAmount)}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">1. Penalties</div>
                        <div className="text-white font-mono font-medium">{formatUGX(liveAllocation.penaltyPaid)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">2. Fees</div>
                        <div className="text-white font-mono font-medium">{formatUGX(liveAllocation.feePaid)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">3. Interest</div>
                        <div className="text-white font-mono font-medium">{formatUGX(liveAllocation.interestPaid)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">4. Principal</div>
                        <div className="text-emerald-400 font-mono font-medium">{formatUGX(liveAllocation.principalPaid)}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 transition"
                  >
                    <Send className="w-4 h-4" />
                    {channel === 'Cash' ? 'Post Cash Receipt' : `Push ${channel} Prompt`}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Col: Instant Receipt Slip */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Latest Transaction Receipt
              </h3>

              {recentReceipt ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <div className="font-bold text-white uppercase">{tenant.displayName}</div>
                    <div className="text-[11px] text-slate-400">{branch.name} • Tier 4 Microfinance</div>
                    <div className="font-mono text-emerald-400 text-xs mt-1">{recentReceipt.receiptNo}</div>
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payer:</span>
                      <span className="text-white font-medium">{customer?.fullName || 'Customer'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Channel:</span>
                      <span className="text-white">{recentReceipt.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">External Ref:</span>
                      <span className="text-emerald-400 font-mono text-[11px]">{recentReceipt.externalReference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date:</span>
                      <span className="text-slate-300">{new Date(recentReceipt.postedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-white">
                      <span>Total Paid:</span>
                      <span className="text-emerald-400 font-mono text-sm">{formatUGX(recentReceipt.amount)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onViewReceipt(recentReceipt)}
                    className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Official Receipt
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Post a payment or initiate mobile money collection to generate printable receipt.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Outgoing Disbursements */}
      {activeTab === 'disbursements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-400" />
                Electronic Loan Disbursement Terminal
              </h3>
              <p className="text-xs text-slate-400">
                Disburse approved loans directly into borrower's MTN MoMo, Airtel Money, or Ugandan Bank account.
              </p>

              {disburseSuccessMessage && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{disburseSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleExecuteDisbursement} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Target Approved Loan *</label>
                    <select
                      value={disburseLoanId}
                      onChange={(e) => setDisburseLoanId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      {loans.map((l) => {
                        const cust = customers.find((c) => c.id === l.customerId);
                        return (
                          <option key={l.id} value={l.id}>
                            {l.loanNo} - {cust?.fullName || 'Customer'} ({formatUGX(l.principalApproved)})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Disbursement Amount (UGX) *</label>
                    <input
                      type="number"
                      required
                      min="10000"
                      step="100000"
                      value={disburseAmount}
                      onChange={(e) => setDisburseAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Disbursement Provider *</label>
                    <select
                      value={disburseProvider}
                      onChange={(e) => setDisburseProvider(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="MTN Mobile Money">MTN Mobile Money</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Stanbic Bank">Stanbic Bank Uganda</option>
                      <option value="Centenary Bank">Centenary Bank</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Phone / Account Number *</label>
                    <input
                      type="text"
                      required
                      value={disburseAccount}
                      onChange={(e) => setDisburseAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Registered Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={disburseRecipientName}
                      onChange={(e) => setDisburseRecipientName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Safety check badge */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Identity Match: Recipient name matches National ID database KYC record.</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">Ready for Release</span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition"
                  >
                    <Send className="w-4 h-4" />
                    Authorize & Disburse via {disburseProvider}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Float Balance Check */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white">Disbursement Float Summary</h3>
              <div className="space-y-3">
                {providerFloats.map((float) => (
                  <div key={float.provider} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">{float.provider}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {float.status}
                      </span>
                    </div>
                    <div className="text-base font-bold text-white font-mono mt-1">
                      {formatUGX(float.currentFloatUGX)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Account: {float.accountNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Float Reconciliation */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Provider Float Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {providerFloats.map((float) => (
              <div key={float.provider} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{float.provider}</span>
                  <button
                    onClick={() => handleRunReconciliation(float.provider)}
                    className="px-2 py-1 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-[10px] font-semibold transition"
                  >
                    Reconcile
                  </button>
                </div>

                <div>
                  <div className="text-xs text-slate-400">Current Balance</div>
                  <div className="text-xl font-bold text-white font-mono">{formatUGX(float.currentFloatUGX)}</div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Unreconciled In:</span>
                    <span className="text-emerald-400 font-mono">{formatUGX(float.unreconciledInflowUGX)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unreconciled Out:</span>
                    <span className="text-blue-400 font-mono">{formatUGX(float.unreconciledOutflowUGX)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Cleared:</span>
                    <span className="text-slate-300 font-mono">{float.lastReconciledDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transactions Clearing Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-white">Clearing & Settlement Audit Trail</h4>
                <p className="text-xs text-slate-400">Real-time gateway transactions and reconciliation status</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">{transactions.length} Total Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Provider & Type</th>
                    <th className="py-3 px-4">Customer / Account</th>
                    <th className="py-3 px-4">External Reference</th>
                    <th className="py-3 px-4">Internal Ref</th>
                    <th className="py-3 px-4 text-right">Amount (UGX)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Reconciliation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{tx.provider}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          {tx.transactionType === 'INCOMING_COLLECTION' ? (
                            <span className="text-emerald-400 font-medium">Inflow (Collection)</span>
                          ) : (
                            <span className="text-blue-400 font-medium">Outflow (Disbursement)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">{tx.recipientLegalName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{tx.phoneNumberOrAccount}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400 text-[11px]">
                        {tx.externalReference}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {tx.internalReference}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {formatUGX(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            tx.status === 'SUCCESS' || tx.status === 'RECONCILED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            tx.reconciliationStatus === 'MATCHED'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {tx.reconciliationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
