import React, { useState, useRef } from 'react';
import { Customer, CustomerDocument, DocumentCategory, DocumentVerificationStatus, AppUser, Tenant } from '../types';
import { autoCategorizeDocument, formatDocumentFileSize } from '../utils/documentScanner';
import {
  generateNationalIdFrontSvg,
  generateNationalIdBackSvg,
  generatePassportPhotoSvg,
  generateProofOfIncomeSvg,
  generateLandTitleSvg,
} from '../utils/documentTemplates';
import {
  UploadCloud,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Eye,
  Download,
  Trash2,
  Tag,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  Check,
  Building,
  User,
  ZoomIn,
  RotateCw,
  Maximize2,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';

interface CustomerKycDropZoneProps {
  tenant: Tenant;
  currentUser: AppUser;
  customers: Customer[];
  documents: CustomerDocument[];
  selectedCustomer?: Customer | null;
  onSelectCustomer?: (customer: Customer) => void;
  onAddDocument: (doc: Omit<CustomerDocument, 'id' | 'uploadedAt'>) => void;
  onUpdateDocumentStatus?: (docId: string, status: DocumentVerificationStatus, notes?: string) => void;
  onDeleteDocument?: (docId: string) => void;
}

interface StagedFile {
  id: string;
  file: File | null;
  dataUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  title: string;
  documentNumber: string;
  targetCustomerId: string;
  tags: string[];
}

const CATEGORY_LABELS: Record<DocumentCategory, { label: string; icon: string; badge: string }> = {
  national_id_front: { label: 'National ID (NIN) - Front', icon: '🪪', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  national_id_back: { label: 'National ID (NIN) - Back', icon: '🪪', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  proof_of_income: { label: 'Proof of Income / Bank Statement', icon: '💵', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  passport_photo: { label: 'Passport Photo / Portrait', icon: '👤', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  collateral_proof: { label: 'Collateral Title / Logbook', icon: '📜', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  loan_security: { label: 'Loan Security Agreement', icon: '⚖️', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  guarantor_form: { label: 'Guarantor Undertaking', icon: '🤝', badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  utility_bill: { label: 'Proof of Residence (Utility)', icon: '🏠', badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  business_license: { label: 'Trading License / Registration', icon: '🏢', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  digital_signature: { label: 'Digital Signature Card', icon: '✍️', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  other: { label: 'Other Attachment', icon: '📁', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

export const CustomerKycDropZone: React.FC<CustomerKycDropZoneProps> = ({
  tenant,
  currentUser,
  customers,
  documents,
  selectedCustomer,
  onSelectCustomer,
  onAddDocument,
  onUpdateDocumentStatus,
  onDeleteDocument,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [activeCustomerId, setActiveCustomerId] = useState<string>(selectedCustomer?.id || customers[0]?.id || '');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [vaultSearch, setVaultSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<CustomerDocument | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync active customer if prop changes
  React.useEffect(() => {
    if (selectedCustomer) {
      setActiveCustomerId(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const currentCustomer = customers.find((c) => c.id === activeCustomerId) || customers[0];

  // Process raw File object to DataURL
  const processRawFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const suggestedCategory = autoCategorizeDocument(file.name);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      const newStaged: StagedFile = {
        id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        dataUrl: result,
        fileName: file.name,
        fileType: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
        fileSize: file.size,
        category: suggestedCategory,
        title: cleanTitle,
        documentNumber:
          suggestedCategory === 'national_id_front' || suggestedCategory === 'national_id_back'
            ? currentCustomer?.kyc?.idNumberMasked || ''
            : '',
        targetCustomerId: activeCustomerId,
        tags: [isPdf ? 'PDF' : 'IMAGE', suggestedCategory === 'proof_of_income' ? 'Income' : 'KYC'],
      };

      setStagedFiles((prev) => [newStaged, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if leaving drop zone root
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        // Accept images and PDFs
        if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.match(/\.(jpg|jpeg|png|webp|svg|pdf)$/i)) {
          processRawFile(file);
        }
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => processRawFile(file));
      e.target.value = '';
    }
  };

  // Upload single staged file to permanent vault state
  const handleCommitSingle = (stagedId: string) => {
    const item = stagedFiles.find((s) => s.id === stagedId);
    if (!item) return;

    onAddDocument({
      customerId: item.targetCustomerId || activeCustomerId,
      tenantId: tenant.id,
      category: item.category,
      title: item.title,
      documentNumber: item.documentNumber || undefined,
      fileType: item.fileType,
      fileSize: item.fileSize,
      fileUrl: item.dataUrl,
      uploadedBy: `${currentUser.name} (${currentUser.role})`,
      verificationStatus: 'pending',
      notes: `Uploaded via Customer View Drop Zone. File: ${item.fileName}`,
      tags: item.tags,
    });

    setStagedFiles((prev) => prev.filter((s) => s.id !== stagedId));
  };

  // Upload all staged files in queue
  const handleCommitAll = () => {
    stagedFiles.forEach((item) => {
      onAddDocument({
        customerId: item.targetCustomerId || activeCustomerId,
        tenantId: tenant.id,
        category: item.category,
        title: item.title,
        documentNumber: item.documentNumber || undefined,
        fileType: item.fileType,
        fileSize: item.fileSize,
        fileUrl: item.dataUrl,
        uploadedBy: `${currentUser.name} (${currentUser.role})`,
        verificationStatus: 'pending',
        notes: `Uploaded via Customer View Drop Zone. File: ${item.fileName}`,
        tags: item.tags,
      });
    });
    setStagedFiles([]);
  };

  // Quick 1-click test sample generator
  const handleGenerateSample = (category: DocumentCategory) => {
    if (!currentCustomer) return;

    let title = '';
    let url = '';
    let docNo = '';
    let fileType = 'image/svg+xml';
    let tags = ['KYC Demo', 'Instant'];

    if (category === 'national_id_front') {
      title = `Uganda National ID Front - ${currentCustomer.fullName}`;
      docNo = currentCustomer.kyc.idNumberMasked.replace(/\*/g, '8');
      url = generateNationalIdFrontSvg(currentCustomer.fullName, docNo, currentCustomer.kyc.dateOfBirth, currentCustomer.kyc.gender);
      tags = ['KYC', 'NIN', 'ID Card'];
    } else if (category === 'national_id_back') {
      title = `Uganda National ID Reverse - ${currentCustomer.fullName}`;
      docNo = currentCustomer.kyc.idNumberMasked;
      url = generateNationalIdBackSvg(docNo);
      tags = ['KYC', 'NIRA', 'Barcode'];
    } else if (category === 'proof_of_income') {
      title = `6-Month Stamped Bank Statement - ${currentCustomer.fullName}`;
      docNo = `STMT-${Date.now().toString().slice(-6)}`;
      url = generateProofOfIncomeSvg(
        currentCustomer.fullName,
        currentCustomer.monthlyIncome,
        currentCustomer.businessName || currentCustomer.occupation || 'Retail Merchant'
      );
      tags = ['Proof of Income', 'Bank Statement', 'Affordability'];
    } else if (category === 'passport_photo') {
      title = `Borrower Passport Photo - ${currentCustomer.fullName}`;
      url = generatePassportPhotoSvg(currentCustomer.fullName);
      tags = ['Biometric', 'Portrait'];
    } else {
      title = `Collateral Land Title Plot 114 - ${currentCustomer.fullName}`;
      docNo = 'VOL-4902-FOLIO-12';
      url = generateLandTitleSvg('Plot 114 Block 48 Kyadondo', currentCustomer.kyc.residenceDistrict, currentCustomer.fullName);
      tags = ['Collateral', 'Land Title'];
    }

    onAddDocument({
      customerId: currentCustomer.id,
      tenantId: tenant.id,
      category,
      title,
      documentNumber: docNo || undefined,
      fileType,
      fileSize: 125000,
      fileUrl: url,
      uploadedBy: `${currentUser.name} (${currentUser.role})`,
      verificationStatus: 'verified',
      verifiedAt: new Date().toISOString().split('T')[0],
      verifiedBy: currentUser.name,
      notes: 'Generated via Demo KYC button with digital stamp.',
      tags,
    });
  };

  // Filter vault documents
  const filteredVaultDocs = documents.filter((doc) => {
    const matchesCustomer = !activeCustomerId || doc.customerId === activeCustomerId;
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || doc.verificationStatus === filterStatus;
    const q = vaultSearch.toLowerCase();
    const customerObj = customers.find((c) => c.id === doc.customerId);
    const matchesSearch =
      !q ||
      doc.title.toLowerCase().includes(q) ||
      (doc.documentNumber && doc.documentNumber.toLowerCase().includes(q)) ||
      (customerObj && customerObj.fullName.toLowerCase().includes(q)) ||
      doc.category.toLowerCase().includes(q);

    return matchesCustomer && matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: KYC Drop Zone & Customer Vault Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">KYC Document Drop Zone &amp; Customer Vault</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Image &amp; PDF Blob Vault
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag and drop National IDs, Proof of Income, statements, and collateral deeds directly to the customer vault.
              </p>
            </div>
          </div>

          {/* Customer Selection Pill for Target Vault */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Target Customer:</span>
            <select
              value={activeCustomerId}
              onChange={(e) => {
                setActiveCustomerId(e.target.value);
                const c = customers.find((item) => item.id === e.target.value);
                if (c && onSelectCustomer) onSelectCustomer(c);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 max-w-xs truncate"
            >
              <option value="">All Customers (Global Vault)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.customerNo}) - {c.kyc.idNumberMasked}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DRAG AND DROP ZONE */}
        <div className="mt-5">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none ${
              isDragging
                ? 'border-emerald-400 bg-emerald-500/15 scale-[1.008] shadow-lg shadow-emerald-950/50'
                : 'border-slate-700/80 bg-slate-950/60 hover:bg-slate-950 hover:border-slate-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
                  isDragging ? 'bg-emerald-500 text-slate-950 scale-110 shadow-lg' : 'bg-slate-800 text-emerald-400'
                }`}
              >
                <UploadCloud className="w-7 h-7" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  {isDragging ? (
                    <span className="text-emerald-400 font-bold">Drop files now to stage into Customer Vault!</span>
                  ) : (
                    <>
                      Drag and drop files here, or <span className="text-emerald-400 underline">browse your device</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports <strong className="text-slate-300">National IDs, Proof of Income, Bank Statements, Pay Slips, Deeds</strong> • Formats:{' '}
                  <span className="font-mono text-emerald-400/90">PDF, PNG, JPG, WebP, SVG</span> (Max 15MB)
                </p>
              </div>

              {currentCustomer && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/70 text-xs text-slate-300">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Files will be assigned to: <strong className="text-white">{currentCustomer.fullName}</strong> ({currentCustomer.customerNo})</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Demo Generation Toolbar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Test Generators for {currentCustomer?.fullName || 'Active Customer'}:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateSample('national_id_front');
                }}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
              >
                <span>🪪</span> Demo National ID (Front)
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateSample('national_id_back');
                }}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
              >
                <span>🪪</span> Demo National ID (Back)
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateSample('proof_of_income');
                }}
                className="px-2.5 py-1 rounded-md bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <span>💵</span> Demo Proof of Income / Bank Statement
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateSample('passport_photo');
                }}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
              >
                <span>👤</span> Demo Passport Photo
              </button>
            </div>
          </div>
        </div>

        {/* STAGED FILES QUEUE (WHEN FILES ARE DROPPED) */}
        {stagedFiles.length > 0 && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Staged Files Ready for Vault ({stagedFiles.length})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStagedFiles([])}
                  className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white"
                >
                  Discard All
                </button>
                <button
                  type="button"
                  onClick={handleCommitAll}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Upload All ({stagedFiles.length}) to Vault</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stagedFiles.map((staged) => {
                const isPdf = staged.fileType === 'application/pdf';
                return (
                  <div key={staged.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center text-rose-400">
                          <FileText className="w-6 h-6" />
                          <span className="text-[9px] font-bold mt-0.5">PDF</span>
                        </div>
                      ) : (
                        <img src={staged.dataUrl} alt={staged.fileName} className="w-full h-full object-cover" />
                      )}
                    </div>

                    {/* Staged Details & Inputs */}
                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={staged.title}
                          onChange={(e) =>
                            setStagedFiles((prev) =>
                              prev.map((s) => (s.id === staged.id ? { ...s, title: e.target.value } : s))
                            )
                          }
                          className="font-semibold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 focus:outline-none focus:border-emerald-500 w-full mr-2"
                        />
                        <button
                          type="button"
                          onClick={() => setStagedFiles((prev) => prev.filter((s) => s.id !== staged.id))}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={staged.category}
                          onChange={(e) =>
                            setStagedFiles((prev) =>
                              prev.map((s) =>
                                s.id === staged.id ? { ...s, category: e.target.value as DocumentCategory } : s
                              )
                            )
                          }
                          className="text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-200 focus:outline-none"
                        >
                          <option value="national_id_front">National ID (Front)</option>
                          <option value="national_id_back">National ID (Back)</option>
                          <option value="proof_of_income">Proof of Income / Bank Statement</option>
                          <option value="passport_photo">Passport Photo</option>
                          <option value="collateral_proof">Collateral Proof</option>
                          <option value="utility_bill">Proof of Residence</option>
                          <option value="business_license">Trading License</option>
                          <option value="other">Other</option>
                        </select>
                        <span className="text-[11px] text-slate-400">{formatDocumentFileSize(staged.fileSize)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-emerald-400/90 font-mono">
                          {isPdf ? 'application/pdf blob' : 'image blob'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCommitSingle(staged.id)}
                          className="px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer"
                        >
                          Commit to Vault →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CUSTOMER VAULT DOCUMENT ARCHIVE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>Customer Vault Records</span>
              <span className="text-xs font-normal text-slate-400">
                ({filteredVaultDocs.length} {filteredVaultDocs.length === 1 ? 'file' : 'files'} stored)
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              {activeCustomerId
                ? `Showing active documents for ${currentCustomer?.fullName || 'selected customer'}`
                : 'Showing all customer records across Victoria Microfinance vault'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search documents or customer..."
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs w-48 sm:w-56"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="national_id_front">National ID (Front)</option>
              <option value="national_id_back">National ID (Back)</option>
              <option value="proof_of_income">Proof of Income / Salary</option>
              <option value="passport_photo">Passport Photos</option>
              <option value="collateral_proof">Collateral Titles</option>
              <option value="utility_bill">Proof of Residence</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* DOCUMENTS GRID */}
        {filteredVaultDocs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/40">
            <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-300 font-medium">No KYC documents found in this vault view</p>
            <p className="text-xs text-slate-500 mt-1">
              Drag and drop files in the zone above or click any of the Demo generator buttons.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVaultDocs.map((doc) => {
              const customerObj = customers.find((c) => c.id === doc.customerId);
              const isPdf = doc.fileType === 'application/pdf';
              const catMeta = CATEGORY_LABELS[doc.category] || CATEGORY_LABELS.other;

              return (
                <div
                  key={doc.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-3 transition flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Header: Category Badge & Status */}
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-semibold border ${catMeta.badge} flex items-center gap-1`}>
                        <span>{catMeta.icon}</span>
                        <span className="truncate max-w-[140px]">{catMeta.label}</span>
                      </span>

                      {/* Verification Status Pill */}
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                          doc.verificationStatus === 'verified'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : doc.verificationStatus === 'pending'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {doc.verificationStatus}
                      </span>
                    </div>

                    {/* Preview Thumbnail */}
                    <div
                      onClick={() => setPreviewDoc(doc)}
                      className="w-full h-32 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                    >
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center text-rose-400">
                          <FileText className="w-10 h-10 group-hover:scale-110 transition" />
                          <span className="text-[11px] font-bold mt-1 text-slate-300">PDF Document</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {formatDocumentFileSize(doc.fileSize)}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={doc.fileUrl}
                          alt={doc.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      )}
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition">
                        <span className="p-2 rounded-lg bg-slate-900 text-white shadow-lg">
                          <Eye className="w-4 h-4" />
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div>
                      <h5 className="font-semibold text-white text-xs line-clamp-1" title={doc.title}>
                        {doc.title}
                      </h5>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                        <span className="text-slate-300 font-medium truncate max-w-[160px]">
                          {customerObj?.fullName || 'Customer Record'}
                        </span>
                        <span className="font-mono text-slate-500">{doc.documentNumber || customerObj?.customerNo}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <span>{formatDocumentFileSize(doc.fileSize)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Toolbar */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-1 text-xs">
                    {/* Quick Verification Toggle */}
                    <button
                      type="button"
                      title="Toggle Verification Status"
                      onClick={() => {
                        if (onUpdateDocumentStatus) {
                          const next = doc.verificationStatus === 'verified' ? 'pending' : 'verified';
                          onUpdateDocumentStatus(doc.id, next, `Status updated by ${currentUser.name}`);
                        }
                      }}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium flex items-center gap-1 transition"
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          doc.verificationStatus === 'verified' ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <span>{doc.verificationStatus === 'verified' ? 'Verified' : 'Verify'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Full Inspect */}
                      <button
                        type="button"
                        title="Inspect Document"
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Download File Blob */}
                      <a
                        href={doc.fileUrl}
                        download={`${doc.title.replace(/\s+/g, '_')}${isPdf ? '.pdf' : '.png'}`}
                        title="Download Document"
                        className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      {/* Delete */}
                      {onDeleteDocument && (
                        <button
                          type="button"
                          title="Delete Document"
                          onClick={() => {
                            if (confirm(`Remove "${doc.title}" from customer vault?`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                          className="p-1.5 rounded bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL-SCREEN DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-5 space-y-4 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{previewDoc.title}</h4>
                  <p className="text-xs text-slate-400">
                    Category: {previewDoc.category.replace(/_/g, ' ')} • {formatDocumentFileSize(previewDoc.fileSize)} •{' '}
                    Uploaded: {new Date(previewDoc.uploadedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(2.5, z + 0.25))}
                  className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <a
                  href={previewDoc.fileUrl}
                  download={`${previewDoc.title.replace(/\s+/g, '_')}${
                    previewDoc.fileType === 'application/pdf' ? '.pdf' : '.png'
                  }`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Blob</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDoc(null);
                    setPreviewZoom(1);
                    setPreviewRotation(0);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Stage */}
            <div className="flex-1 min-h-[350px] max-h-[60vh] bg-slate-950 rounded-xl border border-slate-800 p-4 flex items-center justify-center overflow-auto">
              {previewDoc.fileType === 'application/pdf' ? (
                <div className="w-full h-full min-h-[450px] flex flex-col">
                  <iframe
                    src={previewDoc.fileUrl}
                    title={previewDoc.title}
                    className="w-full flex-1 rounded-lg border border-slate-800 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    PDF Document Blob rendered via secure sandbox viewer.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="flex items-center justify-center max-w-full max-h-full"
                >
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.title}
                    className="max-h-[500px] w-auto object-contain rounded-lg shadow-xl"
                  />
                </div>
              )}
            </div>

            {/* Footer Details */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified in accordance with UMRA Tier 4 Customer Due Diligence Rules</span>
              </div>
              <div className="font-mono text-slate-500">MIME: {previewDoc.fileType}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
