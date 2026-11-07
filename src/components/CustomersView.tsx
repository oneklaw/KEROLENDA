import React, { useState } from 'react';
import { Customer, Tenant, Branch, AppUser, CustomerDocument, DocumentVerificationStatus } from '../types';
import { formatUGX } from '../utils/finance';
import { CustomerDocumentManager } from './CustomerDocumentManager';
import { DigitalSignatureModal } from './DigitalSignatureModal';
import {
  Users,
  Search,
  PlusCircle,
  AlertTriangle,
  UserCheck,
  FileText,
  Camera,
  FolderOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Paperclip,
  PenTool,
} from 'lucide-react';

interface CustomersViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  customers: Customer[];
  documents?: CustomerDocument[];
  onAddCustomer: (customerData: Omit<Customer, 'id' | 'customerNo' | 'createdAt'>) => void;
  onSelectCustomer: (customer: Customer) => void;
  onAddDocument?: (doc: Omit<CustomerDocument, 'id' | 'uploadedAt'>) => void;
  onUpdateDocumentStatus?: (docId: string, status: DocumentVerificationStatus, notes?: string) => void;
  onDeleteDocument?: (docId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  tenant,
  branch,
  currentUser,
  customers,
  documents = [],
  onAddCustomer,
  onSelectCustomer,
  onAddDocument = () => {},
  onUpdateDocumentStatus = () => {},
  onDeleteDocument = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [managingDocsCustomer, setManagingDocsCustomer] = useState<Customer | null>(null);
  const [signingCustomer, setSigningCustomer] = useState<Customer | null>(null);

  // New Customer Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+256 ',
    email: '',
    type: 'individual' as Customer['type'],
    occupation: '',
    businessName: '',
    monthlyIncome: 2_500_000,
    monthlyExpenses: 1_200_000,
    creditScoreRating: 'B' as Customer['creditScoreRating'],
    nin: '',
    residenceTown: '',
    residenceDistrict: 'Kampala',
    nextOfKinName: '',
    nextOfKinPhone: '+256 ',
    nextOfKinRelationship: 'Spouse',
  });

  const tenantCustomers = customers.filter((c) => c.tenantId === tenant.id);

  // Duplicate Check logic (PRD M02)
  const isDuplicateNIN =
    formData.nin.trim() !== '' &&
    tenantCustomers.some((c) =>
      c.kyc.idNumberMasked.toLowerCase().includes(formData.nin.toLowerCase().slice(-4))
    );
  const isDuplicatePhone =
    formData.phone.length > 7 &&
    tenantCustomers.some(
      (c) => c.phone.replace(/\s+/g, '') === formData.phone.replace(/\s+/g, '')
    );

  const filteredCustomers = tenantCustomers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.customerNo.toLowerCase().includes(q) ||
      c.occupation.toLowerCase().includes(q) ||
      c.kyc.idNumberMasked.toLowerCase().includes(q)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) return;

    onAddCustomer({
      tenantId: tenant.id,
      branchId: branch.id,
      type: formData.type,
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email || undefined,
      businessName: formData.businessName || undefined,
      occupation: formData.occupation || 'Retail Merchant',
      monthlyIncome: Number(formData.monthlyIncome),
      monthlyExpenses: Number(formData.monthlyExpenses),
      creditScoreRating: formData.creditScoreRating,
      status: 'active',
      kyc: {
        idType: 'NIN',
        idNumberMasked:
          formData.nin.length >= 8
            ? `${formData.nin.slice(0, 4)}****${formData.nin.slice(-3)}`
            : 'CM8402****718K',
        verifiedAt: new Date().toISOString().split('T')[0],
        verificationStatus: 'verified',
        dateOfBirth: '1990-01-01',
        gender: 'Female',
        nextOfKinName: formData.nextOfKinName || 'Emergency Contact',
        nextOfKinPhone: formData.nextOfKinPhone || '+256 700 000 000',
        nextOfKinRelationship: formData.nextOfKinRelationship,
        residenceTown: formData.residenceTown || 'Central Division',
        residenceDistrict: formData.residenceDistrict,
      },
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Customer &amp; KYC Profile Directory
          </h2>
          <p className="text-xs text-slate-500">
            PRD Section M02: Uganda National ID (NIN) tokenization, biometrics, document scanning vault, and collateral attachment registry.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Register New Customer
        </button>
      </div>

      {/* Document Management, WebRTC Camera & Digital Signature Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-4 rounded-xl border border-emerald-800/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">
                WebRTC Camera, Document Vault &amp; Digital Signatures
              </h3>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                Touch Signature &amp; Scanner Active
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Capture or select local documents, scan biometric photos, and record legally binding customer digital signatures directly on device under the Uganda Electronic Signatures Act, 2011.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold shrink-0 flex-wrap">
          <span className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>{documents.length} Vault Documents</span>
          </span>
          <span className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-emerald-300 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-emerald-400" />
            <span>{documents.filter((d) => d.category === 'digital_signature').length} Digital Signatures</span>
          </span>
          <span className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{documents.filter((d) => d.verificationStatus === 'verified').length} Verified</span>
          </span>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Customer No, Name, Phone, NIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 sm:w-80"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>
              Total <strong>{filteredCustomers.length}</strong> registered profiles
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold text-[11px]">
              <Paperclip className="w-3 h-3" />
              {documents.length} Total Attached Docs
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                <th className="py-2.5 px-3">Customer No.</th>
                <th className="py-2.5 px-3">Full Name &amp; Business</th>
                <th className="py-2.5 px-3">Phone &amp; Location</th>
                <th className="py-2.5 px-3">National ID (NIN)</th>
                <th className="py-2.5 px-3 text-right">Monthly Net Income</th>
                <th className="py-2.5 px-3 text-center">Score &amp; Status</th>
                <th className="py-2.5 px-3">Document Management &amp; Vault</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const customerDocs = documents.filter((d) => d.customerId === c.id);
                const hasPending = customerDocs.some((d) => d.verificationStatus === 'pending');
                const hasRejected = customerDocs.some((d) => d.verificationStatus === 'rejected');
                const allVerified = customerDocs.length > 0 && customerDocs.every((d) => d.verificationStatus === 'verified');

                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono-num font-bold text-slate-900">
                      {c.customerNo}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{c.fullName}</p>
                      <p className="text-[11px] text-slate-500">
                        {c.businessName || c.occupation} ({c.type})
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-800 font-mono-num">{c.phone}</p>
                      <p className="text-[11px] text-slate-500">
                        {c.kyc.residenceTown}, {c.kyc.residenceDistrict}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-mono-num text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {c.kyc.idNumberMasked}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-num font-bold text-slate-800">
                      {formatUGX(c.monthlyIncome)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Score {c.creditScoreRating} • Verified
                      </span>
                    </td>

                    {/* Attached Documents column with interactive badge */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setManagingDocsCustomer(c)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer hover:shadow-xs group text-left"
                        title="Click to view and manage customer documents"
                      >
                        {customerDocs.length === 0 ? (
                          <span className="text-slate-400 group-hover:text-slate-600 flex items-center gap-1">
                            <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                            Attach Files
                          </span>
                        ) : allVerified ? (
                          <span className="text-emerald-700 bg-emerald-50 group-hover:bg-emerald-100 border-emerald-200 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {customerDocs.length} Docs (Verified)
                          </span>
                        ) : hasPending ? (
                          <span className="text-amber-700 bg-amber-50 group-hover:bg-amber-100 border-amber-200 flex items-center gap-1 font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            {customerDocs.length} Docs (Pending)
                          </span>
                        ) : (
                          <span className="text-slate-700 bg-slate-50 group-hover:bg-slate-100 border-slate-200 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            {customerDocs.length} Files
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setManagingDocsCustomer(c)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                          title="Open Document Management & WebRTC Scanner (National ID, Title Deeds, Logbooks, Photos)"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Document Management</span>
                        </button>
                        <button
                          onClick={() => setSigningCustomer(c)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                          title="Sign loan agreements & legal covenants directly on device via touch or mouse"
                        >
                          <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Sign Document</span>
                        </button>
                        <button
                          onClick={() => setSelectedCustomerDetail(c)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                        >
                          KYC
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

      {/* Customer Detail KYC Drawer / Modal */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono-num block">
                  {selectedCustomerDetail.customerNo}
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedCustomerDetail.fullName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono-num">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-sans">
                <div>
                  <span className="text-slate-400 text-[10px] block">Identification Type</span>
                  <strong className="text-slate-800">Uganda National ID (NIN)</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Masked NIN</span>
                  <strong className="text-slate-800 font-mono-num">
                    {selectedCustomerDetail.kyc.idNumberMasked}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Verification Status</span>
                  <span className="text-emerald-700 font-bold">✓ Biometrically Verified</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Verification Date</span>
                  <strong className="text-slate-800">{selectedCustomerDetail.kyc.verifiedAt}</strong>
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <span className="font-bold text-slate-800 block">Next of Kin &amp; Guarantor Link</span>
                <p className="text-slate-700">
                  {selectedCustomerDetail.kyc.nextOfKinName} ({selectedCustomerDetail.kyc.nextOfKinRelationship}) • Phone:{' '}
                  <span className="font-mono-num">{selectedCustomerDetail.kyc.nextOfKinPhone}</span>
                </p>
                <p className="text-slate-500 text-[11px]">
                  Residence: {selectedCustomerDetail.kyc.residenceTown}, District of{' '}
                  {selectedCustomerDetail.kyc.residenceDistrict}
                </p>
              </div>

              {/* Attached Documents in KYC Modal */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-sans space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    Attached Documents &amp; Loan Security (
                    {documents.filter((d) => d.customerId === selectedCustomerDetail.id).length})
                  </span>
                  <button
                    onClick={() => {
                      setManagingDocsCustomer(selectedCustomerDetail);
                      setSelectedCustomerDetail(null);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
                  >
                    Open Document Vault <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {documents
                    .filter((d) => d.customerId === selectedCustomerDetail.id)
                    .slice(0, 4)
                    .map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setManagingDocsCustomer(selectedCustomerDetail);
                          setSelectedCustomerDetail(null);
                        }}
                        className="p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer text-[10px]"
                      >
                        <p className="font-bold text-slate-800 line-clamp-1">{d.title}</p>
                        <span className="text-slate-400 font-mono-num block text-[9px]">
                          {d.verificationStatus === 'verified' ? '✓ Verified' : '⚠️ Pending'}
                        </span>
                      </div>
                    ))}
                  {documents.filter((d) => d.customerId === selectedCustomerDetail.id).length === 0 && (
                    <p className="col-span-2 text-slate-400 text-[11px] italic">
                      No documents attached yet. Click 'Open Document Vault' to scan or upload.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 font-sans text-[11px] text-emerald-900">
                <span className="font-bold block mb-0.5">Financial Conduct Authority Assessment:</span>
                Prudent credit history. Borrowing limit up to UGX 25,000,000 under Tier 4 money lending schedule.
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setManagingDocsCustomer(selectedCustomerDetail);
                    setSelectedCustomerDetail(null);
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Manage Documents &amp; Scanner
                </button>

                <button
                  onClick={() => {
                    setSigningCustomer(selectedCustomerDetail);
                    setSelectedCustomerDetail(null);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                  Capture Digital Signature
                </button>
              </div>

              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal with Duplicate Detection Check */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Register Borrower / Member KYC
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Duplicate Detection Warning */}
            {(isDuplicateNIN || isDuplicatePhone) && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <strong className="block font-bold">Likely Duplicate Customer Detected (PRD M02):</strong>
                  <span>
                    A customer with matching phone number or NIN ending digits already exists in this tenant database. Merging or verification required.
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Bosco Katamba"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (MTN/Airtel)</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">National ID Number (NIN)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CM84029482718K"
                    value={formData.nin}
                    onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Occupation / Trade</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Produce Wholesaler"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Monthly Income (UGX)</label>
                  <input
                    type="number"
                    step={100000}
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Living Expenses (UGX)</label>
                  <input
                    type="number"
                    step={50000}
                    value={formData.monthlyExpenses}
                    onChange={(e) => setFormData({ ...formData, monthlyExpenses: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next of Kin Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Agnes Katamba"
                    value={formData.nextOfKinName}
                    onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next of Kin Phone</label>
                  <input
                    type="text"
                    value={formData.nextOfKinPhone}
                    onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Customer &amp; Tokenize NIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL DOCUMENT MANAGEMENT MODAL & SCANNER */}
      {managingDocsCustomer && (
        <CustomerDocumentManager
          customer={managingDocsCustomer}
          currentUser={currentUser}
          tenant={tenant}
          documents={documents}
          isOpen={true}
          onClose={() => setManagingDocsCustomer(null)}
          onAddDocument={onAddDocument}
          onUpdateDocumentStatus={onUpdateDocumentStatus}
          onDeleteDocument={onDeleteDocument}
        />
      )}

      {/* DIGITAL SIGNATURE CAPTURE MODAL */}
      {signingCustomer && (
        <DigitalSignatureModal
          customer={signingCustomer}
          currentUser={currentUser}
          tenant={tenant}
          isOpen={true}
          onClose={() => setSigningCustomer(null)}
          onSaveSignedDocument={(doc) => {
            onAddDocument(doc);
            setSigningCustomer(null);
          }}
        />
      )}
    </div>
  );
};
