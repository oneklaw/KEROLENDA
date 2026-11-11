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
import { exportLoanApplicationPDF } from '../utils/pdfExport';
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
  Camera,
  UserCheck,
  Download,
  Trash2,
  Paperclip,
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

  // Mandatory Profile Photo State
  const [borrowerPhotoUrl, setBorrowerPhotoUrl] = useState<string>(
    currentBorrower.photoUrl ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
  );

  // Primary Guarantor (Guarantor 1)
  const [guarantor1Name, setGuarantor1Name] = useState('Dennis Kakooza');
  const [guarantor1Phone, setGuarantor1Phone] = useState('+256 772 312 884');
  const [guarantor1Nin, setGuarantor1Nin] = useState('CM80092384910B');
  const [guarantor1Relationship, setGuarantor1Relationship] = useState('Business Associate / Fellow Merchant');

  // Second Guarantor (Guarantor 2)
  const [guarantor2Name, setGuarantor2Name] = useState('Florence Namubiru');
  const [guarantor2Phone, setGuarantor2Phone] = useState('+256 701 543 219');
  const [guarantor2Nin, setGuarantor2Nin] = useState('CF87019284712P');
  const [guarantor2Relationship, setGuarantor2Relationship] = useState('Spouse / Family Co-Signer');
  const [guarantor2Occupation, setGuarantor2Occupation] = useState('Registered Nurse (Mulago Referral Hospital)');

  // Supporting Documents Upload Registry
  const [supportingDocs, setSupportingDocs] = useState<
    Array<{
      id: string;
      title: string;
      category: string;
      fileUrl: string;
      fileType?: string;
      fileSize?: number;
      uploadedAt: string;
    }>
  >([
    {
      id: 'doc-init-nin',
      title: 'Borrower National Identification Card (Front & Reverse)',
      category: 'KYC Document',
      fileUrl: '#',
      fileType: 'image/jpeg',
      fileSize: 220000,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: 'doc-init-lc1',
      title: 'LC1 Village Chairperson Residence Verification Letter',
      category: 'Proof of Residence',
      fileUrl: '#',
      fileType: 'application/pdf',
      fileSize: 310000,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: 'doc-init-momo',
      title: '6-Month MTN/Airtel Mobile Money & Bank Statement',
      category: 'Financial Statement',
      fileUrl: '#',
      fileType: 'application/pdf',
      fileSize: 580000,
      uploadedAt: new Date().toISOString(),
    },
  ]);

  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('Trading License / Business Permit');
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [lastSubmittedApp, setLastSubmittedApp] = useState<BorrowerDirectApplication | null>(null);

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

  const handleAddSupportingDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const newDoc = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      category: newDocCategory,
      fileUrl: '#',
      fileType: newDocTitle.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image/jpeg',
      fileSize: Math.floor(180000 + Math.random() * 450000),
      uploadedAt: new Date().toISOString(),
    };

    setSupportingDocs((prev) => [...prev, newDoc]);
    setNewDocTitle('');
  };

  const handleRemoveSupportingDocument = (docId: string) => {
    setSupportingDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleSubmitLoanApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setApplicationError(null);

    // MANDATORY PHOTO VALIDATION
    if (!borrowerPhotoUrl.trim()) {
      setApplicationError('Mandatory Requirement: All loan applicants must have a verified profile photo attached to their application in accordance with UMRA KYC regulations.');
      return;
    }

    // MANDATORY SECOND GUARANTOR VALIDATION
    if (!guarantor2Name.trim() || !guarantor2Phone.trim() || !guarantor2Nin.trim()) {
      setApplicationError('Mandatory Requirement: Please provide complete details for Guarantor 2 (Second Guarantor), including Name, Phone, and National ID (NIN).');
      return;
    }

    const targetTenant = tenants.find((t) => t.id === selectedTenantId);
    if (!targetTenant || !selectedProduct) return;

    const appData = {
      tenantId: targetTenant.id,
      tenantName: targetTenant.displayName,
      borrowerId: currentBorrower.id,
      borrowerName: currentBorrower.fullName,
      borrowerPhone: currentBorrower.phone,
      borrowerEmail: currentBorrower.email,
      borrowerNin: currentBorrower.nin,
      borrowerPhotoUrl: borrowerPhotoUrl.trim(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      requestedAmountUGX: Number(requestedAmount),
      requestedTermMonths: Number(requestedTermMonths),
      purpose: loanPurpose.trim() || 'Working capital enterprise expansion',
      repaymentFrequency: repaymentFreq,
      guarantor1Name: guarantor1Name.trim(),
      guarantor1Phone: guarantor1Phone.trim(),
      guarantor1Nin: guarantor1Nin.trim(),
      guarantor1Relationship: guarantor1Relationship.trim(),
      guarantor2Name: guarantor2Name.trim(),
      guarantor2Phone: guarantor2Phone.trim(),
      guarantor2Nin: guarantor2Nin.trim(),
      guarantor2Relationship: guarantor2Relationship.trim(),
      guarantor2Occupation: guarantor2Occupation.trim(),
      supportingDocuments: supportingDocs,
    };

    onSubmitApplication(appData);

    const createdAppStub: BorrowerDirectApplication = {
      ...appData,
      id: `app-submitted-${Date.now()}`,
      applicationNo: `APP-DIR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };
    setLastSubmittedApp(createdAppStub);

    alert(`Loan application submitted successfully to ${targetTenant.displayName}! You can download your official PDF application dossier immediately.`);
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
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Apply for an Institutional Loan from a Participating Lender
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compliant with Section 52 of Uganda Tier 4 Microfinance Institutions Act 2016. Dual guarantors, supporting documents, and verified applicant photo required.
            </p>
          </div>

          {applicationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 animate-fadeIn font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{applicationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitLoanApplication} className="space-y-5 text-xs">
            {/* SECTION A: MANDATORY APPLICANT PROFILE PHOTO */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Applicant Profile Photo (Mandatory KYC) *
                  </span>
                  <span className="text-[11px] text-slate-500">
                    All loan applicants must have a verified profile photo on file in accordance with UMRA KYC regulations.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Required
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative">
                  {borrowerPhotoUrl ? (
                    <img
                      src={borrowerPhotoUrl}
                      alt="Applicant profile"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-200 border-2 border-dashed border-red-300 flex flex-col items-center justify-center text-red-500 text-[10px] font-bold text-center p-1">
                      <Camera className="w-6 h-6 mb-1 opacity-70" />
                      No Photo!
                    </div>
                  )}
                  {borrowerPhotoUrl && (
                    <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Profile Photo URL or Biometric Preset:
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={borrowerPhotoUrl}
                      onChange={(e) => {
                        setBorrowerPhotoUrl(e.target.value);
                        setApplicationError(null);
                      }}
                      className="w-full px-3 py-1.5 border rounded-lg border-slate-300 font-mono-num text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold">Select Portrait Preset:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBorrowerPhotoUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80');
                        setApplicationError(null);
                      }}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700 cursor-pointer"
                    >
                      Preset 1 (Musa)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBorrowerPhotoUrl('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80');
                        setApplicationError(null);
                      }}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700 cursor-pointer"
                    >
                      Preset 2 (Betty)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBorrowerPhotoUrl('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80');
                        setApplicationError(null);
                      }}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700 cursor-pointer"
                    >
                      Preset 3 (Haruna)
                    </button>
                    {borrowerPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setBorrowerPhotoUrl('')}
                        className="px-2 py-1 rounded text-red-600 hover:bg-red-50 text-[10px] font-bold cursor-pointer ml-auto"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION B: TARGET COMPANY & LOAN PRODUCT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            {/* SECTION C: AMOUNT, TERM, FREQUENCY */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Requested Amount (UGX) *</label>
                <input
                  type="number"
                  required
                  step={100000}
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
                  <option value={1}>1 Month (Emergency / Float)</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months</option>
                  <option value={18}>18 Months</option>
                  <option value={24}>24 Months</option>
                  <option value={36}>36 Months (Secured)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Repayment Frequency *</label>
                <select
                  value={repaymentFreq}
                  onChange={(e) => setRepaymentFreq(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-medium focus:outline-none"
                >
                  <option value="monthly">Monthly Installments</option>
                  <option value="weekly">Weekly Installments (Market Traders)</option>
                </select>
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loan Purpose &amp; Enterprise Utilization *</label>
              <textarea
                required
                rows={2}
                placeholder="State how the loan funds will be invested in your enterprise or commercial activity..."
                value={loanPurpose}
                onChange={(e) => setLoanPurpose(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* SECTION D: DUAL GUARANTORS (GUARANTOR 1 & GUARANTOR 2) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Mandatory Dual Guarantors Undertaking (UMRA Tier 4)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Two independent guarantors are required for credit underwriting and statutory co-signing.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Dual Co-Signers
                </span>
              </div>

              {/* Guarantor 1 Fields */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 text-[11px] block text-emerald-700">
                  Primary Guarantor (Guarantor 1)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dennis Kakooza"
                      value={guarantor1Name}
                      onChange={(e) => setGuarantor1Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Phone Contact *</label>
                    <input
                      type="text"
                      required
                      placeholder="+256 7..."
                      value={guarantor1Phone}
                      onChange={(e) => setGuarantor1Phone(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">National ID (NIN) *</label>
                    <input
                      type="text"
                      required
                      placeholder="CM80..."
                      value={guarantor1Nin}
                      onChange={(e) => setGuarantor1Nin(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Relationship *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fellow Trader"
                      value={guarantor1Relationship}
                      onChange={(e) => setGuarantor1Relationship(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Guarantor 2 Fields (Requested explicitly by user) */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] block text-indigo-700">
                    Secondary Guarantor (Guarantor 2) *
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">Co-obligor guarantee</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Florence Namubiru"
                      value={guarantor2Name}
                      onChange={(e) => setGuarantor2Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs"
                      data-testid="guarantor2-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Phone Contact *</label>
                    <input
                      type="text"
                      required
                      placeholder="+256 7..."
                      value={guarantor2Phone}
                      onChange={(e) => setGuarantor2Phone(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs font-mono-num"
                      data-testid="guarantor2-phone-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">National ID (NIN) *</label>
                    <input
                      type="text"
                      required
                      placeholder="CF87..."
                      value={guarantor2Nin}
                      onChange={(e) => setGuarantor2Nin(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs font-mono-num"
                      data-testid="guarantor2-nin-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Relationship *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spouse / Sibling"
                      value={guarantor2Relationship}
                      onChange={(e) => setGuarantor2Relationship(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs"
                      data-testid="guarantor2-rel-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Occupation / Job *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nurse / Teacher"
                      value={guarantor2Occupation}
                      onChange={(e) => setGuarantor2Occupation(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs"
                      data-testid="guarantor2-occ-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION E: UPLOAD OTHER LOAN SUPPORT DOCUMENTS */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-emerald-600" />
                    Upload Loan Supporting Documents ({supportingDocs.length} Attached)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Attach LC1 residence letter, financial / MoMo statements, trading licenses, or collateral asset deeds.
                  </span>
                </div>
              </div>

              {/* Upload Input Row */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Document Title / File Description:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KCCA Trading License 2026 or Land Title Deed"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs"
                  />
                </div>
                <div className="w-full sm:w-56">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Document Category:
                  </label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded border-slate-300 text-xs bg-white"
                  >
                    <option value="Trading License / Business Permit">Trading License &amp; Business Permit</option>
                    <option value="Proof of Residence / LC1 Letter">Proof of Residence (LC1 Letter)</option>
                    <option value="Financial Statement / MoMo">Financial &amp; MoMo Statement</option>
                    <option value="Collateral Asset Deed">Collateral Asset Deed / Logbook</option>
                    <option value="Tenancy Agreement">Tenancy Agreement</option>
                    <option value="Other Supporting Document">Other Supporting Document</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddSupportingDocument}
                  className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  + Attach Doc
                </button>
              </div>

              {/* Attached Documents List */}
              <div className="space-y-1.5">
                {supportingDocs.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="text-slate-800 text-[11px] block">{docItem.title}</strong>
                        <span className="text-[10px] text-slate-500">
                          {docItem.category} • {docItem.fileSize ? `${Math.round(docItem.fileSize / 1024)} KB` : 'Verified on File'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSupportingDocument(docItem.id)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                      title="Remove document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className="px-4 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-2 text-xs"
                data-testid="submit-borrower-app-btn"
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
          {/* Submission Success Banner with 1-Click PDF Export */}
          {lastSubmittedApp && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 animate-fadeIn">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <strong className="text-sm block text-emerald-900">
                    Application #{lastSubmittedApp.applicationNo} Filed Successfully!
                  </strong>
                  <span className="text-emerald-700">
                    Dispatched to {lastSubmittedApp.tenantName} with verified photo, Guarantor 1 ({lastSubmittedApp.guarantor1Name}), and Guarantor 2 ({lastSubmittedApp.guarantor2Name}).
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  const targetTenant = tenants.find((t) => t.id === lastSubmittedApp.tenantId) || tenants[0];
                  const appProd = loanProducts.find((p) => p.id === lastSubmittedApp.productId);
                  exportLoanApplicationPDF({
                    application: lastSubmittedApp,
                    tenant: targetTenant,
                    product: appProd,
                    borrowerAccount: currentBorrower,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                Download PDF Application Form
              </button>
            </div>
          )}

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
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-sm">{app.productName}</strong>
                        <span className="font-mono-num text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                          {app.applicationNo}
                        </span>
                        {app.borrowerPhotoUrl && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Camera className="w-3 h-3" /> Photo Attached
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">
                        Target Lender: <strong className="text-slate-900">{app.tenantName}</strong> • Amount:{' '}
                        <strong className="text-emerald-700 font-mono-num">{formatUGX(app.requestedAmountUGX)}</strong> ({app.requestedTermMonths} months • {app.repaymentFrequency})
                      </p>
                      {(app.guarantor1Name || app.guarantor2Name) && (
                        <p className="text-[11px] text-slate-500">
                          Guarantors: <strong>{app.guarantor1Name || 'Guarantor 1'}</strong> &amp; <strong>{app.guarantor2Name || 'Guarantor 2'}</strong> • {app.supportingDocuments?.length || 2} documents
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 italic">"{app.purpose}"</p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
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

                      {/* PDF Export Button (Requested Feature) */}
                      <button
                        onClick={() => {
                          const targetTenant = tenants.find((t) => t.id === app.tenantId) || tenants[0];
                          const appProd = loanProducts.find((p) => p.id === app.productId);
                          exportLoanApplicationPDF({
                            application: app,
                            tenant: targetTenant,
                            product: appProd,
                            borrowerAccount: currentBorrower,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs cursor-pointer shadow-xs transition-colors"
                        title="Export professional PDF application dossier"
                        data-testid={`export-pdf-app-${app.id}`}
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export PDF Form</span>
                      </button>
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
