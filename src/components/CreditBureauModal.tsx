import React, { useState } from 'react';
import {
  Tenant,
  AppUser,
  CreditReview,
  CreditRiskAssessment,
  Customer,
} from '../types';
import { calculateCreditRisk } from '../utils/creditEngine';
import { formatUGX } from '../utils/finance';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  PlusCircle,
  X,
  Lock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface CreditBureauModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenant: Tenant;
  currentUser: AppUser;
  customers: Customer[];
  reviews: CreditReview[];
  onSubmitReview: (reviewData: Omit<CreditReview, 'id' | 'reviewDate' | 'status'>) => void;
}

export const CreditBureauModal: React.FC<CreditBureauModalProps> = ({
  isOpen,
  onClose,
  currentTenant,
  currentUser,
  customers,
  reviews,
  onSubmitReview,
}) => {
  const [activeTab, setActiveTab] = useState<'query' | 'submit_review'>('query');

  // Query search
  const [queryNin, setQueryNin] = useState('CM84029482718K');
  const [searchedNin, setSearchedNin] = useState<string | null>('CM84029482718K');

  // Submit Review Form
  const [reviewNin, setReviewNin] = useState('');
  const [reviewBorrowerName, setReviewBorrowerName] = useState('');
  const [reviewLoanRef, setReviewLoanRef] = useState(`LN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [reviewLoanAmount, setReviewLoanAmount] = useState(5_000_000);
  const [reviewRepaymentStatus, setReviewRepaymentStatus] = useState<CreditReview['repaymentStatus']>('fully_settled');
  const [reviewOutstandingBalance, setReviewOutstandingBalance] = useState(0);
  const [reviewDelayedPayments, setReviewDelayedPayments] = useState(0);
  const [reviewConsistencyScore, setReviewConsistencyScore] = useState(95);
  const [reviewEvidenceSummary, setReviewEvidenceSummary] = useState('');

  if (!isOpen) return null;

  // Compute assessment for searched NIN
  const assessment: CreditRiskAssessment | null = searchedNin
    ? calculateCreditRisk(searchedNin, reviews)
    : null;

  const matchedReviews = searchedNin
    ? reviews.filter((r) => r.borrowerNin.replace(/\s+/g, '').toUpperCase() === searchedNin.replace(/\s+/g, '').toUpperCase())
    : [];

  const handleRunQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryNin.trim()) return;
    setSearchedNin(queryNin.trim());
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNin.trim() || !reviewBorrowerName.trim()) return;

    onSubmitReview({
      borrowerNin: reviewNin.trim().toUpperCase(),
      borrowerName: reviewBorrowerName.trim(),
      reviewingTenantId: currentTenant.id,
      reviewingTenantName: currentTenant.displayName,
      loanRef: reviewLoanRef,
      loanAmountUGX: Number(reviewLoanAmount),
      repaymentStatus: reviewRepaymentStatus,
      outstandingBalanceUGX: Number(reviewOutstandingBalance),
      delayedPaymentsCount: Number(reviewDelayedPayments),
      defaultHistoryVerified: reviewRepaymentStatus === 'contractual_default',
      paymentConsistencyScore: Number(reviewConsistencyScore),
      reviewerName: currentUser.name,
      reviewerRole: currentUser.role,
      supportingEvidenceSummary:
        reviewEvidenceSummary || 'Verified against bank settlement receipts and core ledger records.',
    });

    alert(`Credit review submitted to shared bureau for ${reviewBorrowerName}!`);
    setSearchedNin(reviewNin.trim().toUpperCase());
    setActiveTab('query');
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">
                  Cross-Company Shared Credit Intelligence Bureau
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tier 4 Network
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authorized credit performance queries and verified lender reviews under UMRA &amp; Data Protection Act 2019.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="bg-slate-100 p-1 flex border-b border-slate-200 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('query')}
            className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'query' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4 text-emerald-600" />
            <span>Search Borrower Credit Records</span>
          </button>

          <button
            onClick={() => setActiveTab('submit_review')}
            className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'submit_review' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Submit Lender Performance Review</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'query' && (
            <div className="space-y-5">
              {/* Query search form */}
              <form onSubmit={handleRunQuery} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex gap-3 text-xs">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter borrower National ID (NIN), e.g. CM84029482718K..."
                    value={queryNin}
                    onChange={(e) => setQueryNin(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg border-slate-300 font-mono-num uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Run Bureau Search
                </button>
              </form>

              {/* Assessment Results */}
              {assessment && searchedNin && (
                <div className="space-y-4 animate-in fade-in">
                  {/* High level score box */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Credit Risk Assessment • NIN {searchedNin}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <strong className="text-3xl font-black text-slate-900 font-mono-num">
                          {assessment.score}
                        </strong>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${assessment.badgeColor}`}>
                          {assessment.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 max-w-lg">
                        {assessment.recommendation}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 text-right">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Consistency</span>
                        <strong className="text-slate-800 font-mono-num">{assessment.repaymentConsistencyPercent}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Settled Loans</span>
                        <strong className="text-slate-800 font-mono-num">{assessment.totalSettledLoansCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Active Defaults</span>
                        <strong className="text-rose-600 font-mono-num">{assessment.activeDefaultCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Active Debt Exposure</span>
                        <strong className="text-slate-800 font-mono-num">{formatUGX(assessment.totalKnownActiveObligationsUGX)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Reviews breakdown list */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span>Lender Submissions on Record ({matchedReviews.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Confidential lender notes excluded
                      </span>
                    </h4>

                    {matchedReviews.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">
                        No historical reviews recorded for this NIN. Borrower has not been reported to the bureau yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5 text-xs">
                        {matchedReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <strong className="text-slate-900">{rev.reviewingTenantName}</strong>
                                <span className="text-[11px] text-slate-500 ml-2 font-mono-num">
                                  Loan: {rev.loanRef} • {formatUGX(rev.loanAmountUGX)}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rev.repaymentStatus === 'fully_settled'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rev.repaymentStatus === 'contractual_default'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {rev.repaymentStatus.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <p className="text-slate-700 italic bg-white p-2 rounded border border-slate-200 text-[11px]">
                              "{rev.supportingEvidenceSummary}"
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                              <span>
                                Reviewed by {rev.reviewerName} ({rev.reviewerRole}) on {rev.reviewDate}
                              </span>
                              <span>Delayed payments: {rev.delayedPaymentsCount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUBMIT LENDER REVIEW */}
          {activeTab === 'submit_review' && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Report Borrower Performance to Shared Credit Intelligence Layer
                </h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Submitting verified payment performance enables participating lenders in Uganda to make informed credit decisions while safeguarding against serial defaulters.
                </p>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Borrower Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Bosco Katamba"
                      value={reviewBorrowerName}
                      onChange={(e) => setReviewBorrowerName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Borrower National ID (NIN) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CM84029482718K"
                      value={reviewNin}
                      onChange={(e) => setReviewNin(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num uppercase focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Facility Amount (UGX) *</label>
                    <input
                      type="number"
                      required
                      step={500000}
                      value={reviewLoanAmount}
                      onChange={(e) => setReviewLoanAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Repayment Status *</label>
                    <select
                      value={reviewRepaymentStatus}
                      onChange={(e) =>
                        setReviewRepaymentStatus(e.target.value as CreditReview['repaymentStatus'])
                      }
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-medium focus:outline-none"
                    >
                      <option value="fully_settled">Fully Settled (100% Repaid)</option>
                      <option value="performing_on_time">Performing On-Time</option>
                      <option value="slow_payer_resolved">Slow Payer (Resolved / Rescheduled)</option>
                      <option value="contractual_default">Contractual Default (&gt;90 Days Overdue)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Remaining Outstanding Balance (UGX)</label>
                    <input
                      type="number"
                      value={reviewOutstandingBalance}
                      onChange={(e) => setReviewOutstandingBalance(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Consistency Score (1-100)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={reviewConsistencyScore}
                      onChange={(e) => setReviewConsistencyScore(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supporting Evidence Summary &amp; Historical Behaviour *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide factual summary of payment compliance, bank/MoMo transaction records, or restructuring details..."
                    value={reviewEvidenceSummary}
                    onChange={(e) => setReviewEvidenceSummary(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('query')}
                    className="px-4 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Publish Verified Credit Review
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
