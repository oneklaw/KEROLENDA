import React, { useState } from 'react';
import {
  BorrowerAccount,
  Tenant,
  LoanProduct,
  Loan,
  BorrowerDirectApplication,
  CreditReview,
  CreditDispute,
  CreditRiskAssessment,
} from '../types';
import { formatUGX } from '../utils/finance';
import { calculateCreditRisk } from '../utils/creditEngine';
import {
  Building,
  CreditCard,
  FileText,
  Search,
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
  Upload,
  Calendar,
  Wallet,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';

interface BorrowerPortalViewProps {
  currentBorrower: BorrowerAccount;
  tenants: Tenant[];
  loanProducts: LoanProduct[];
  loans: Loan[];
  applications: BorrowerDirectApplication[];
  creditReviews: CreditReview[];
  disputes: CreditDispute[];
  onSubmitApplication: (appData: Omit<BorrowerDirectApplication, 'id' | 'applicationNo' | 'submittedAt' | 'status'>) => void;
  onSubmitDispute: (disputeData: Omit<CreditDispute, 'id' | 'filedAt' | 'status'>) => void;
  onMakeRepayment: (loanId: string, amount: number) => void;
}

export const BorrowerPortalView: React.FC<BorrowerPortalViewProps> = ({
  currentBorrower,
  tenants,
  loanProducts,
  loans,
  applications,
  creditReviews,
  disputes,
  onSubmitApplication,
  onSubmitDispute,
  onMakeRepayment,
}) => {
  // Navigation tabs: 'directory' | 'apply' | 'my_loans' | 'credit_report'
  const [activeTab, setActiveTab] = useState<'directory' | 'apply' | 'my_loans' | 'credit_report'>('directory');

  // Search in lenders directory
  const [lenderSearch, setLenderSearch] = useState('');

  // Loan Application Wizard state
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [requestedAmount, setRequestedAmount] = useState<number>(3_000_000);
  const [requestedTermMonths, setRequestedTermMonths] = useState<number>(6);
  const [loanPurpose, setLoanPurpose] = useState('');
  const [repaymentFreq, setRepaymentFreq] = useState<'monthly' | 'weekly'>('monthly');

  // Dispute Modal state
  const [showDisputeModal, setShowDisputeModal] = useState<CreditReview | null>(null);
  const [disputeReason, setDisputeReason] = useState('Payment Delay Recorded in Error');
  const [disputeExplanation, setDisputeExplanation] = useState('');

  // Payment Modal state
  const [showPayModal, setShowPayModal] = useState<Loan | null>(null);
  const [payAmount, setPayAmount] = useState<number>(500_000);

  // Compute Borrower's Credit Risk Profile using pure calculation engine
  const creditAssessment: CreditRiskAssessment = calculateCreditRisk(
    currentBorrower.nin,
    creditReviews
  );

  // Filter applications for current borrower
  const borrowerApps = applications.filter(
    (a) => a.borrowerNin === currentBorrower.nin || a.borrowerId === currentBorrower.id
  );

  // Filter borrower's loans across companies
  const borrowerLoans = loans.filter(
    (l) => l.customerId === currentBorrower.id || l.loanNo.includes(currentBorrower.borrowerNo.slice(-4))
  );

  // Available products for selected company in wizard
  const companyProducts = loanProducts.filter((p) => p.tenantId === selectedTenantId && p.status === 'active');
  const selectedProduct = companyProducts.find((p) => p.id === selectedProductId) || companyProducts[0];

  const handleStartApplicationForLender = (tenantId: string, productId?: string) => {
    setSelectedTenantId(tenantId);
    if (productId) setSelectedProductId(productId);
    setActiveTab('apply');
  };

  const handleSubmitLoanApplication = (e: React.FormEvent) => {
    e.preventDefault();
    const targetTenant = tenants.find((t) => t.id === selectedTenantId);
    if (!targetTenant || !selectedProduct) return;

    onSubmitApplication({
      tenantId: targetTenant.id,
      tenantName: targetTenant.displayName,
      borrowerId: currentBorrower.id,
      borrowerName: currentBorrower.fullName,
      borrowerPhone: currentBorrower.phone,
      borrowerEmail: currentBorrower.email,
      borrowerNin: currentBorrower.nin,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      requestedAmountUGX: Number(requestedAmount),
      requestedTermMonths: Number(requestedTermMonths),
      purpose: loanPurpose || 'Working capital expansion',
      repaymentFrequency: repaymentFreq,
      supportingDocuments: [
        {
          id: `doc-${Date.now()}-nin`,
          title: 'Borrower National Identification Card',
          category: 'KYC Document',
          fileUrl: '#',
          uploadedAt: new Date().toISOString(),
        },
        {
          id: `doc-${Date.now()}-inc`,
          title: 'Proof of Business Revenue & Bank/MoMo Statement',
          category: 'Financial Statement',
          fileUrl: '#',
          uploadedAt: new Date().toISOString(),
        },
      ],
    });

    alert(`Loan application submitted to ${targetTenant.displayName}! You can track its review progress under "My Applications & Active Loans".`);
    setLoanPurpose('');
    setActiveTab('my_loans');
  };

  const handleFileDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDisputeModal || !disputeExplanation.trim()) return;

    onSubmitDispute({
      creditReviewId: showDisputeModal.id,
      borrowerId: currentBorrower.id,
      borrowerName: currentBorrower.fullName,
      borrowerNin: currentBorrower.nin,
      reviewingTenantName: showDisputeModal.reviewingTenantName,
      disputeReason,
      borrowerExplanation: disputeExplanation.trim(),
      supportingEvidenceNotes: 'Transaction receipts and mobile money timestamps submitted for regulatory audit.',
    });

    alert('Dispute formally lodged under Uganda Data Protection & Credit Reporting rules. The reviewing lender has been notified to re-evaluate the record.');
    setShowDisputeModal(null);
    setDisputeExplanation('');
  };

  return (
    <div className="space-y-6">
      {/* Borrower Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-xl flex items-center justify-center shadow-md">
            {currentBorrower.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {currentBorrower.fullName}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono-num border border-slate-700">
                {currentBorrower.borrowerNo}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              NIN: <span className="font-mono-num text-white">{currentBorrower.ninMasked}</span> •{' '}
              {currentBorrower.occupation} • {currentBorrower.residenceTown}, {currentBorrower.residenceDistrict}
            </p>
          </div>
        </div>

        {/* Credit Score & Risk Badge */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-slate-300 font-bold uppercase block tracking-wider">
              Central Credit Score
            </span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-2xl font-black text-emerald-400 font-mono-num">
                {creditAssessment.score}
              </strong>
              <span className="text-[10px] text-slate-400">/ 850</span>
            </div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${creditAssessment.badgeColor}`}>
              {creditAssessment.category} Risk
            </span>
            <span className="block text-[10px] text-slate-300 mt-0.5">
              {creditAssessment.repaymentConsistencyPercent}% Consistency
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-1 flex space-x-1 text-xs">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4 text-emerald-400" />
          <span>Discover Participating Lenders ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('apply')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'apply'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Apply for a Loan</span>
        </button>

        <button
          onClick={() => setActiveTab('my_loans')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'my_loans'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>My Applications &amp; Loans ({borrowerApps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('credit_report')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'credit_report'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>My Credit Intelligence &amp; Disputes</span>
        </button>
      </div>

      {/* TAB 1: DISCOVER LENDING COMPANIES DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search lenders by company name, license, location..."
                value={lenderSearch}
                onChange={(e) => setLenderSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-slate-500 font-medium">
              Regulated by UMRA • Independent lending companies with isolated workspaces
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tenants
              .filter((t) =>
                t.displayName.toLowerCase().includes(lenderSearch.toLowerCase()) ||
                t.registeredAddress.toLowerCase().includes(lenderSearch.toLowerCase())
              )
              .map((tenant) => {
                const prods = loanProducts.filter((p) => p.tenantId === tenant.id && p.status === 'active');
                return (
                  <div
                    key={tenant.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{tenant.displayName}</h3>
                          <p className="text-[11px] text-slate-500">{tenant.legalName}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Licensed Tier 4
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <p className="text-[11px] text-slate-600 line-clamp-1">
                          📍 {tenant.registeredAddress}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono-num">
                          License: {tenant.branding.umraLicenseNo}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono-num">
                          Helpline: {tenant.supportPhone}
                        </p>
                      </div>

                      {/* Loan Products Offered */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Available Loan Products ({prods.length})
                        </span>
                        <div className="space-y-1.5">
                          {prods.slice(0, 3).map((prod) => (
                            <div
                              key={prod.id}
                              className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <strong className="text-slate-800 block text-[11px]">{prod.name}</strong>
                                <span className="text-[10px] text-slate-500 font-mono-num">
                                  {formatUGX(prod.minPrincipal)} - {formatUGX(prod.maxPrincipal)}
                                </span>
                              </div>
                              <span className="font-bold text-emerald-700 text-xs font-mono-num">
                                {prod.annualRatePercent}% p.a.
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartApplicationForLender(tenant.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <span>Apply for Loan from this Lender</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: APPLY FOR A LOAN WIZARD */}
      {activeTab === 'apply' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Apply for a Loan from a Participating Company
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Your application is routed directly into the selected lender's private workspace. The lender can review your shared credit score while keeping their approval workflow strictly isolated.
            </p>
          </div>

          <form onSubmit={handleSubmitLoanApplication} className="space-y-4 text-xs">
            {/* 1. Target Company */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Lending Company *</label>
              <select
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  const firstProd = loanProducts.find((p) => p.tenantId === e.target.value);
                  if (firstProd) setSelectedProductId(firstProd.id);
                }}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.displayName} ({t.legalName})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Target Loan Product */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Choose Loan Product *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {companyProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.annualRatePercent}% p.a. • Max {formatUGX(p.maxPrincipal)})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Amount & Term */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Requested Amount (UGX) *</label>
                <input
                  type="number"
                  required
                  step={500000}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Repayment Term (Months) *</label>
                <select
                  value={requestedTermMonths}
                  onChange={(e) => setRequestedTermMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-mono-num focus:outline-none"
                >
                  <option value={1}>1 Month (Float Advance)</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                </select>
              </div>
            </div>

            {/* Repayment Frequency */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Repayment Schedule Preference</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRepaymentFreq('monthly')}
                  className={`py-2 px-3 rounded-lg border font-bold cursor-pointer text-center ${
                    repaymentFreq === 'monthly'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Monthly Installments
                </button>
                <button
                  type="button"
                  onClick={() => setRepaymentFreq('weekly')}
                  className={`py-2 px-3 rounded-lg border font-bold cursor-pointer text-center ${
                    repaymentFreq === 'weekly'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Weekly Installments (Market Traders)
                </button>
              </div>
            </div>

            {/* 4. Purpose */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loan Purpose &amp; Business Use *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe how the funds will be deployed in your trade or enterprise..."
                value={loanPurpose}
                onChange={(e) => setLoanPurpose(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 5. Documents Note */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <strong className="text-slate-800 block">Automatic Document Attachment:</strong>
              <span>
                Your verified National ID (NIN: {currentBorrower.ninMasked}) and central credit performance report will be bundled with this application.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className="px-4 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Submit Application to Lender
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MY APPLICATIONS & ACTIVE LOANS */}
      {activeTab === 'my_loans' && (
        <div className="space-y-6">
          {/* Applications list */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Applications Submitted to Participating Lenders ({borrowerApps.length})
            </h3>

            {borrowerApps.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                You haven't submitted any loan applications yet. Explore the lender directory above to apply!
              </div>
            ) : (
              <div className="space-y-3">
                {borrowerApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-sm">{app.productName}</strong>
                        <span className="font-mono-num text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {app.applicationNo}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Target Lender: <strong className="text-slate-900">{app.tenantName}</strong> • Amount:{' '}
                        <strong className="text-emerald-700 font-mono-num">{formatUGX(app.requestedAmountUGX)}</strong> ({app.requestedTermMonths} months)
                      </p>
                      <p className="text-[11px] text-slate-500 italic">"{app.purpose}"</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        {app.status === 'under_review' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Under Credit Review
                          </span>
                        )}
                        {app.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Declined
                          </span>
                        )}
                        {app.status === 'submitted' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                            <Send className="w-3.5 h-3.5 text-blue-600" /> Submitted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MY CREDIT INTELLIGENCE & DISPUTE CENTER */}
      {activeTab === 'credit_report' && (
        <div className="space-y-6">
          {/* Credit Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Credit Score</span>
              <strong className="text-2xl font-black text-emerald-600 font-mono-num">
                {creditAssessment.score}
              </strong>
              <span className="text-[11px] text-slate-500 block mt-1">Scale: 300 to 850 (Tier 4)</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Consistency</span>
              <strong className="text-2xl font-black text-slate-800 font-mono-num">
                {creditAssessment.repaymentConsistencyPercent}%
              </strong>
              <span className="text-[11px] text-slate-500 block mt-1">Across all verified lenders</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Fully Settled Facilities</span>
              <strong className="text-2xl font-black text-slate-800 font-mono-num">
                {creditAssessment.totalSettledLoansCount}
              </strong>
              <span className="text-[11px] text-slate-500 block mt-1">Successful completions</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Verified Defaults</span>
              <strong className="text-2xl font-black text-rose-600 font-mono-num">
                {creditAssessment.activeDefaultCount}
              </strong>
              <span className="text-[11px] text-slate-500 block mt-1">Contractual default records</span>
            </div>
          </div>

          {/* Lender-Submitted Reviews List */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified Lender Reviews on Borrower Record ({creditReviews.filter((r) => r.borrowerNin === currentBorrower.nin).length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Under the Data Protection &amp; Privacy Act 2019, you have the statutory right to view all credit reviews and lodge disputes for any inaccurate entries.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {creditReviews
                .filter((r) => r.borrowerNin === currentBorrower.nin)
                .map((review) => (
                  <div
                    key={review.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 text-sm">{review.reviewingTenantName}</strong>
                          <span className="text-[10px] font-mono-num text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Loan: {review.loanRef}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Facility Amount: <strong className="text-slate-800 font-mono-num">{formatUGX(review.loanAmountUGX)}</strong> • Reviewed on {review.reviewDate}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            review.repaymentStatus === 'fully_settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : review.repaymentStatus === 'contractual_default'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {review.repaymentStatus.replace(/_/g, ' ').toUpperCase()}
                        </span>

                        <button
                          onClick={() => setShowDisputeModal(review)}
                          className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] cursor-pointer"
                        >
                          Dispute Review
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                      "{review.supportingEvidenceSummary}"
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE SUBMISSION MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Lodge Credit Review Dispute
              </h3>
              <button
                onClick={() => setShowDisputeModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFileDispute} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Challenged Record</span>
                <strong className="text-slate-900 block text-xs">
                  {showDisputeModal.reviewingTenantName} • Facility {showDisputeModal.loanRef}
                </strong>
                <p className="text-[11px] text-slate-600">
                  Current Status: {showDisputeModal.repaymentStatus.replace(/_/g, ' ')}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispute Reason *</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-medium focus:outline-none"
                >
                  <option value="Payment Delay Recorded in Error">Payment Delay Recorded in Error (Cleared on Time)</option>
                  <option value="Incorrect Outstanding Balance">Incorrect Outstanding Balance</option>
                  <option value="Unrecognized Facility / Identity Theft">Unrecognized Facility / Potential Identity Theft</option>
                  <option value="Full Settlement Receipt Not Updated">Full Settlement Receipt Not Updated by Lender</option>
                  <option value="Other Discrepancy">Other Discrepancy</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Explanation &amp; Evidence *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide transaction receipt references, payment dates, or branch contact details to substantiate this correction..."
                  value={disputeExplanation}
                  onChange={(e) => setDisputeExplanation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(null)}
                  className="px-4 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Submit Formal Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
