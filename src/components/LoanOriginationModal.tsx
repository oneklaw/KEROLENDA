import React, { useState, useEffect } from 'react';
import {
  Customer,
  LoanProduct,
  AppUser,
  Tenant,
  Branch,
  LoanApplication,
  Loan,
} from '../types';
import {
  formatUGX,
  formatCompactUGX,
  calculateSchedule,
} from '../utils/finance';
import {
  runAutomatedAffordabilityCheck,
  determineApprovalRoutingTier,
} from '../utils/affordabilityEngine';
import {
  suggestLoanTerms,
  LoanTermSuggestionResult,
} from '../utils/loanTermSuggester';
import {
  PlusCircle,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  X,
  UserCheck,
  Camera,
  Layers,
  Paperclip,
  Award,
  Sparkles,
  TrendingUp,
  History,
  Percent,
} from 'lucide-react';

interface LoanOriginationModalProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  customers: Customer[];
  products: LoanProduct[];
  loans?: Loan[];
  onClose: () => void;
  onSubmitApplication: (applicationData: {
    customerId: string;
    productId: string;
    requestedAmount: number;
    requestedTermMonths: number;
    interestRateAnnual?: number;
    purpose: string;
    collateralDescription: string;
    collateralEstimatedValue: number;
    guarantorCustomerId?: string;
    guarantor2Name?: string;
    guarantor2Phone?: string;
    guarantor2Nin?: string;
    guarantor2Relationship?: string;
    guarantor2Occupation?: string;
    applicantPhotoUrl?: string;
    routingTier?: 'tier1_officer' | 'tier2_manager' | 'tier3_committee';
    affordabilityCheck?: any;
    stageHistory?: any[];
  }) => void;
}

export const LoanOriginationModal: React.FC<LoanOriginationModalProps> = ({
  tenant,
  branch,
  currentUser,
  customers,
  products,
  loans = [],
  onClose,
  onSubmitApplication,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [amount, setAmount] = useState<number>(5_000_000);
  const [termMonths, setTermMonths] = useState<number>(6);
  const [interestRate, setInterestRate] = useState<number>(products[0]?.annualRatePercent || 18.0);
  const [purpose, setPurpose] = useState('');
  const [collateralDescription, setCollateralDescription] = useState('Land Title Block 12, Katwe / Household Goods');
  const [collateralValue, setCollateralValue] = useState<number>(12_000_000);

  // Dual Guarantors
  const [guarantor1CustomerId, setGuarantor1CustomerId] = useState<string>(
    customers.length > 1 ? customers[1].id : ''
  );
  const [guarantor2Name, setGuarantor2Name] = useState('David Kigozi');
  const [guarantor2Phone, setGuarantor2Phone] = useState('+256 772 901 884');
  const [guarantor2Nin, setGuarantor2Nin] = useState('CM800188291M');
  const [guarantor2Relationship, setGuarantor2Relationship] = useState('Business Supplier');
  const [guarantor2Occupation, setGuarantor2Occupation] = useState('Wholesale Hardware Dealer');

  // Profile Photo
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Dynamic loan term suggestions based on historical credit behavior and current income profile
  const suggestedTerms = selectedCustomer && selectedProduct
    ? suggestLoanTerms({
        customer: selectedCustomer,
        product: selectedProduct,
        requestedAmount: amount,
        historicalLoans: loans,
      })
    : null;

  // Sync default rate on product change
  useEffect(() => {
    if (selectedProduct) {
      setInterestRate(selectedProduct.annualRatePercent);
    }
  }, [selectedProductId]);

  // Schedule preview using current interest rate (default or custom/suggested)
  const previewSchedule = calculateSchedule(
    amount,
    interestRate,
    termMonths,
    'monthly',
    selectedProduct.interestMethod,
    new Date().toISOString().split('T')[0],
    selectedProduct.processingFeePercent
  );

  // Run Automated Affordability Check Engine
  const monthlyIncome = selectedCustomer?.monthlyIncome || 3_000_000;
  const monthlyExpenses = selectedCustomer?.monthlyExpenses || 1_200_000;
  const proposedInstallment = previewSchedule.periodicInstalment || Math.round(amount / termMonths);

  const affordabilityResult = runAutomatedAffordabilityCheck({
    loanAmountUGX: amount,
    termMonths,
    proposedInstallmentUGX: proposedInstallment,
    monthlyIncomeUGX: monthlyIncome,
    monthlyExpensesUGX: monthlyExpenses,
    collateralEstimatedValueUGX: collateralValue,
    hasGuarantor1: Boolean(guarantor1CustomerId),
    hasGuarantor2: Boolean(guarantor2Name.trim() && guarantor2Phone.trim()),
    hasApplicantPhoto: Boolean(photoUrl),
  });

  const routingTier = determineApprovalRoutingTier(amount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedProductId || amount <= 0) return;

    onSubmitApplication({
      customerId: selectedCustomerId,
      productId: selectedProductId,
      requestedAmount: amount,
      requestedTermMonths: termMonths,
      interestRateAnnual: interestRate,
      purpose: purpose || 'Working capital stock purchase for commercial retail operations.',
      collateralDescription,
      collateralEstimatedValue: collateralValue,
      guarantorCustomerId: guarantor1CustomerId,
      guarantor2Name,
      guarantor2Phone,
      guarantor2Nin,
      guarantor2Relationship,
      guarantor2Occupation,
      applicantPhotoUrl: photoUrl,
      routingTier,
      affordabilityCheck: affordabilityResult,
      stageHistory: [
        {
          stage: 'submitted',
          transitionedAt: new Date().toISOString(),
          performedByUserId: currentUser.id,
          notes: `Application captured with dual guarantors, photo, and tailored terms (${termMonths}M @ ${interestRate}% APR).`,
        },
      ],
    });
    onClose();
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'APPROVED_AUTOMATED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved (Automated Scorecard)
          </span>
        );
      case 'BORDERLINE_COMMITTEE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Borderline (Requires Committee Review)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Declined (Affordability Cap Exceeded)
          </span>
        );
    }
  };

  const getRoutingLabel = (tier: string) => {
    switch (tier) {
      case 'tier1_officer':
        return 'Tier 1: Fast-track Loan Officer Approval (<= UGX 2M)';
      case 'tier2_manager':
        return 'Tier 2: Branch Manager Sign-off (UGX 2M - 10M)';
      default:
        return 'Tier 3: Full Credit Committee Approval (> UGX 10M)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Originate Loan & Automated Workflow</h3>
              <p className="text-xs text-slate-400">
                Tier 4 Prudential Underwriting with Real-Time Affordability Engine
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Section 1: Customer & Loan Product */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Borrower / Applicant *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.customerNo}) - {c.occupation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Loan Product *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.annualRatePercent}% {p.interestMethod})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Smart Term Recommendation Panel (Historical Credit Behavior & Current Income Profile) */}
          {suggestedTerms && (
            <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-emerald-950/70 p-4 rounded-xl border border-indigo-500/30 space-y-3 shadow-lg shadow-indigo-950/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-2">
                      <span>Smart Terms Suggestion Engine</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Credit Behavior &amp; Cash Flow Aligned
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Underwriting suggestions tailored for {selectedCustomer?.fullName} based on repayment history and declared monthly income.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTermMonths(suggestedTerms.suggestedTermMonths);
                    setInterestRate(suggestedTerms.suggestedAnnualRatePercent);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/40 cursor-pointer transition transform active:scale-95"
                  title="Apply recommended duration and interest rate to the application"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Suggested Terms</span>
                </button>
              </div>

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span>Suggested Duration</span>
                  </div>
                  <div className="text-base font-extrabold text-emerald-400 font-mono">
                    {suggestedTerms.suggestedTermMonths} Months
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Product ceiling: {selectedProduct.minTermMonths}–{selectedProduct.maxTermMonths}M
                  </div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Percent className="w-3 h-3 text-indigo-400" />
                    <span>Suggested Rate</span>
                  </div>
                  <div className="text-base font-extrabold text-indigo-400 font-mono flex items-center gap-1.5">
                    <span>{suggestedTerms.suggestedAnnualRatePercent}%</span>
                    {suggestedTerms.rateAdjustmentPercent !== 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                          suggestedTerms.rateAdjustmentPercent < 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {suggestedTerms.rateAdjustmentPercent > 0 ? '+' : ''}
                        {suggestedTerms.rateAdjustmentPercent}% APR
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Standard card: {selectedProduct.annualRatePercent}%
                  </div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <History className="w-3 h-3 text-teal-400" />
                    <span>Credit Behavior Track</span>
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    Grade {suggestedTerms.creditBehaviorSummary.creditRating} • {suggestedTerms.creditBehaviorSummary.repaymentReputation}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {suggestedTerms.creditBehaviorSummary.settledLoansCount} settled • {suggestedTerms.creditBehaviorSummary.maxHistoricalDpd}d max DPD
                  </div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Income Affordability</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-300 truncate">
                    {suggestedTerms.projectedDtiPercent}% DTI ({suggestedTerms.affordabilityStatus})
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Net Disp: {formatCompactUGX(suggestedTerms.incomeProfileSummary.netDisposableUGX)} /mo
                  </div>
                </div>
              </div>

              {/* Rationale Breakdown Pills */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Underwriting Factors &amp; Rationale:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedTerms.rationales.map((r, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-xl text-[11px] border flex items-start gap-2.5 ${
                        r.type === 'positive'
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                          : r.type === 'caution'
                          ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span
                        className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight ${
                          r.type === 'positive'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : r.type === 'caution'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {r.impact}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-white">{r.title}: </span>
                        <span className="text-slate-300">{r.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Financial Terms & Collateral */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Principal Amount (UGX) *</label>
              <input
                type="number"
                required
                min="100000"
                step="any"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                <span>Tenure (Months) *</span>
                {suggestedTerms && termMonths === suggestedTerms.suggestedTermMonths && (
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">Suggested</span>
                )}
              </label>
              <input
                type="number"
                required
                min={selectedProduct.minTermMonths || 1}
                max={selectedProduct.maxTermMonths || 36}
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                <span>Interest Rate (% p.a.) *</span>
                {suggestedTerms && interestRate === suggestedTerms.suggestedAnnualRatePercent && (
                  <span className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 px-1 rounded">Suggested</span>
                )}
              </label>
              <input
                type="number"
                required
                step="0.1"
                min="5"
                max="40"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Collateral Value (UGX)</label>
              <input
                type="number"
                required
                min="0"
                step="500000"
                value={collateralValue}
                onChange={(e) => setCollateralValue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Monthly Installment</label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold truncate">
                {formatUGX(proposedInstallment)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Collateral Description & Title Reference</label>
            <input
              type="text"
              value={collateralDescription}
              onChange={(e) => setCollateralDescription(e.target.value)}
              placeholder="e.g. Land Title Kyadondo Block 244 Plot 89 / Logbook Reg UFL 820K"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Section 3: Dual Guarantors & Applicant Profile Photo */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white uppercase text-[11px] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Mandatory Dual Guarantors & Profile Photo Verification
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                UMRA Prudential Requirement
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Guarantor 1 */}
              <div className="space-y-2 border border-slate-800/80 p-3 rounded-lg bg-slate-900/40">
                <div className="font-medium text-slate-300 text-xs">Primary Guarantor (Registered Borrower)</div>
                <select
                  value={guarantor1CustomerId}
                  onChange={(e) => setGuarantor1CustomerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Registered Customer...</option>
                  {customers
                    .filter((c) => c.id !== selectedCustomerId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} - {c.phone}
                      </option>
                    ))}
                </select>
              </div>

              {/* Guarantor 2 */}
              <div className="space-y-2 border border-slate-800/80 p-3 rounded-lg bg-slate-900/40">
                <div className="font-medium text-slate-300 text-xs">Secondary Guarantor (External)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={guarantor2Name}
                    onChange={(e) => setGuarantor2Name(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Phone (+256)"
                    value={guarantor2Phone}
                    onChange={(e) => setGuarantor2Phone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="NIN (CM...)"
                    value={guarantor2Nin}
                    onChange={(e) => setGuarantor2Nin(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white font-mono uppercase text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Relationship"
                    value={guarantor2Relationship}
                    onChange={(e) => setGuarantor2Relationship(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Occupation"
                    value={guarantor2Occupation}
                    onChange={(e) => setGuarantor2Occupation(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Applicant Profile Photo */}
            <div className="flex items-center gap-3 pt-2">
              <img
                src={photoUrl}
                alt="Applicant preview"
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50 shadow"
              />
              <div className="flex-1">
                <label className="block text-slate-400 text-[11px] mb-1">Applicant Profile Photo URL</label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Live Affordability Scorecard Preview */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 uppercase text-[11px] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                Automated Underwriting & Policy Rule Checks
              </span>
              <div>{getVerdictBadge(affordabilityResult.scorecardVerdict)}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">DSTI Ratio</div>
                <div
                  className={`text-base font-bold font-mono ${
                    affordabilityResult.ruleChecks.dstiPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {affordabilityResult.dstiRatioPercent}%
                </div>
                <div className="text-[10px] text-slate-500">Cap: 50.0% max</div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Disposable Buffer</div>
                <div
                  className={`text-base font-bold font-mono ${
                    affordabilityResult.ruleChecks.disposableBufferPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatUGX(affordabilityResult.disposableBufferUGX)}
                </div>
                <div className="text-[10px] text-slate-500">Min: UGX 300,000</div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Collateral Coverage</div>
                <div
                  className={`text-base font-bold font-mono ${
                    affordabilityResult.ruleChecks.collateralPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {affordabilityResult.collateralCoverageRatioPercent}%
                </div>
                <div className="text-[10px] text-slate-500">Min: 120.0%</div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Safe Recommended Limit</div>
                <div className="text-base font-bold text-white font-mono">
                  {formatCompactUGX(affordabilityResult.recommendedLimitUGX)}
                </div>
                <div className="text-[10px] text-emerald-400">Max Sustainable</div>
              </div>
            </div>

            {/* Routing Tier Box */}
            <div className="p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-lg text-blue-300 text-xs flex items-center justify-between">
              <span className="font-medium">Assigned Approval Routing Tier:</span>
              <span className="font-semibold">{getRoutingLabel(routingTier)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 transition flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Submit to Automated Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
