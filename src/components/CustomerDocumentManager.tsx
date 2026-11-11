import React, { useState, useRef, useEffect } from 'react';
import { Customer, CustomerDocument, DocumentCategory, DocumentVerificationStatus, AppUser, Tenant } from '../types';
import { DigitalSignatureModal } from './DigitalSignatureModal';
import {
  generateNationalIdFrontSvg,
  generateNationalIdBackSvg,
  generatePassportPhotoSvg,
  generateLandTitleSvg,
  generateVehicleLogbookSvg,
  generateTradingLicenseSvg,
  generateGenericDocumentSvg,
} from '../utils/documentTemplates';
import {
  autoCategorizeDocument,
  estimateBase64SizeBytes,
  formatDocumentFileSize,
  extractMimeTypeFromDataUrl,
  isValidDataUrl,
} from '../utils/documentScanner';
import {
  FileText,
  Upload,
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Printer,
  ShieldCheck,
  Calendar,
  Tag,
  Lock,
  X,
  FileCheck,
  Sparkles,
  Info,
  Maximize2,
  VideoOff,
  SlidersHorizontal,
  PenTool,
} from 'lucide-react';

interface CustomerDocumentManagerProps {
  customer: Customer;
  currentUser: AppUser;
  tenant: Tenant;
  documents: CustomerDocument[];
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (doc: Omit<CustomerDocument, 'id' | 'uploadedAt'>) => void;
  onUpdateDocumentStatus: (docId: string, status: DocumentVerificationStatus, notes?: string) => void;
  onDeleteDocument: (docId: string) => void;
}

const CATEGORY_CONFIG: Record<
  DocumentCategory,
  { label: string; badgeColor: string; icon: string; description: string; frameType: 'card' | 'portrait' | 'document' }
> = {
  national_id_front: {
    label: 'National ID (NIN) - Front',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🪪',
    description: 'Uganda National Identification Card (Front face with photo & NIN)',
    frameType: 'card',
  },
  national_id_back: {
    label: 'National ID (NIN) - Back',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🪪',
    description: 'National Identification Card (Reverse barcode & card serial)',
    frameType: 'card',
  },
  passport_photo: {
    label: 'Passport Photo / Portrait',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: '👤',
    description: 'Borrower frontal face photograph for biometric KYC records',
    frameType: 'portrait',
  },
  collateral_proof: {
    label: 'Collateral Proof',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: '📜',
    description: 'Certificate of Land Title, Vehicle Logbook, or Asset Invoices',
    frameType: 'document',
  },
  loan_security: {
    label: 'Loan Security Agreement',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: '⚖️',
    description: 'Chattels mortgage deed, hypothecation agreement, or lien form',
    frameType: 'document',
  },
  guarantor_form: {
    label: 'Guarantor Undertaking',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: '🤝',
    description: 'Signed guarantor declaration with attached guarantor ID',
    frameType: 'document',
  },
  utility_bill: {
    label: 'Proof of Residence',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: '🏠',
    description: 'Recent Umeme power bill, NWSC water invoice, or LC1 verification letter',
    frameType: 'document',
  },
  business_license: {
    label: 'Trading License / Registration',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: '🏢',
    description: 'KCCA/Municipal trade license or URSB certificate of incorporation',
    frameType: 'document',
  },
  digital_signature: {
    label: 'Digital Signature & Executed Agreement',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: '✍️',
    description: 'Electronically executed loan agreement or biometric signature card',
    frameType: 'document',
  },
  proof_of_income: {
    label: 'Proof of Income & Cash Flow',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '💵',
    description: 'Bank account statement, salary payslip, or mobile money statement',
    frameType: 'document',
  },
  other: {
    label: 'Other Attachment',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: '📁',
    description: 'Additional legal, personal, or financial records',
    frameType: 'document',
  },
};

export const CustomerDocumentManager: React.FC<CustomerDocumentManagerProps> = ({
  customer,
  currentUser,
  tenant,
  documents,
  isOpen,
  onClose,
  onAddDocument,
  onUpdateDocumentStatus,
  onDeleteDocument,
}) => {
  // Main view state: 'gallery' | 'upload' | 'camera' | 'signature'
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload' | 'camera' | 'signature'>('gallery');
  const [signDocumentTarget, setSignDocumentTarget] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected document for full preview
  const [previewDoc, setPreviewDoc] = useState<CustomerDocument | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationDegree, setRotationDegree] = useState<number>(0);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNotesInput, setVerifyNotesInput] = useState('');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<{
    dataUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  } | null>(null);
  const [formCategory, setFormCategory] = useState<DocumentCategory>('national_id_front');
  const [formTitle, setFormTitle] = useState('');
  const [formDocNumber, setFormDocNumber] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [cameraGuideMode, setCameraGuideMode] = useState<'card' | 'portrait' | 'document'>('card');
  const [scanFilter, setScanFilter] = useState<'normal' | 'contrast' | 'grayscale'>('normal');
  const [capturedResolution, setCapturedResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Filtered documents for this customer
  const customerDocs = documents.filter((d) => d.customerId === customer.id);

  const filteredDocs = customerDocs.filter((doc) => {
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || doc.verificationStatus === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      doc.title.toLowerCase().includes(q) ||
      (doc.documentNumber && doc.documentNumber.toLowerCase().includes(q)) ||
      (doc.notes && doc.notes.toLowerCase().includes(q)) ||
      doc.category.toLowerCase().includes(q);
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Calculate KYC summary stats
  const hasNinFront = customerDocs.some((d) => d.category === 'national_id_front' && d.verificationStatus === 'verified');
  const hasPhoto = customerDocs.some((d) => d.category === 'passport_photo' && d.verificationStatus === 'verified');
  const hasCollateral = customerDocs.some((d) => d.category === 'collateral_proof' && d.verificationStatus === 'verified');
  const pendingCount = customerDocs.filter((d) => d.verificationStatus === 'pending').length;

  // Stop camera on tab switch or close
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCameraStream();
    }
  }, [isOpen, activeTab]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Initialize camera when entering camera tab
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      // List devices if not already done
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to camera device.';
      setCameraError(message);
      setCameraActive(false);
    }
  };

  // Handle capturing photo from camera with WebRTC and canvas filter processing
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    setCapturedResolution({ width, height });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Apply post-processing filter directly to the 2D canvas context
      if (scanFilter === 'grayscale') {
        ctx.filter = 'grayscale(100%)';
      } else if (scanFilter === 'contrast') {
        ctx.filter = 'contrast(160%) brightness(105%)';
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(video, 0, 0, width, height);
      ctx.filter = 'none'; // reset filter
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPhotoUrl(dataUrl);
      stopCameraStream();
    }
  };

  // Handle local file selection converting directly to Base64
  const handleFileProcess = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const calculatedSize = file.size || estimateBase64SizeBytes(result);
      setUploadFile({
        dataUrl: result,
        fileName: file.name,
        fileType: file.type || extractMimeTypeFromDataUrl(result),
        fileSize: calculatedSize,
      });

      // Suggest title and category based on filename and customer NIN
      const suggestedCat = autoCategorizeDocument(file.name);
      setFormCategory(suggestedCat);
      setFormTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      if (suggestedCat === 'national_id_front' && customer.kyc.idNumberMasked) {
        setFormDocNumber(customer.kyc.idNumberMasked);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Submit new document from Upload tab or Camera capture
  const handleSaveUploadedDocument = (dataUrl: string, fileType: string, fileSize: number) => {
    if (!formTitle.trim()) {
      alert('Please provide a document title.');
      return;
    }

    const tagArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onAddDocument({
      customerId: customer.id,
      tenantId: tenant.id,
      category: formCategory,
      title: formTitle,
      documentNumber: formDocNumber || undefined,
      fileType,
      fileSize,
      fileUrl: dataUrl,
      uploadedBy: `${currentUser.name} (${currentUser.role})`,
      verificationStatus: 'pending',
      expiryDate: formExpiryDate || undefined,
      notes: formNotes || undefined,
      tags: tagArray.length > 0 ? tagArray : ['Customer File'],
    });

    // Reset upload state
    setUploadFile(null);
    setCapturedPhotoUrl(null);
    setFormTitle('');
    setFormDocNumber('');
    setFormExpiryDate('');
    setFormNotes('');
    setFormTags('');
    setActiveTab('gallery');
  };

  // Instant Sample Generator for fast demoing
  const handleQuickGenerate = (type: DocumentCategory) => {
    let title = '';
    let url = '';
    let docNo = '';
    let tags = ['Auto-Generated', 'Verified'];

    if (type === 'national_id_front') {
      title = 'Uganda National ID (NIN) Front';
      docNo = customer.kyc.idNumberMasked.replace(/\*/g, '8');
      url = generateNationalIdFrontSvg(customer.fullName, docNo, customer.kyc.dateOfBirth, customer.kyc.gender);
      tags = ['KYC', 'NIN', 'ID Card'];
    } else if (type === 'national_id_back') {
      title = 'Uganda National ID (NIN) Reverse Barcode';
      docNo = customer.kyc.idNumberMasked;
      url = generateNationalIdBackSvg(docNo);
      tags = ['KYC', 'NIRA'];
    } else if (type === 'passport_photo') {
      title = 'Borrower Frontal Passport Photo';
      url = generatePassportPhotoSvg(customer.fullName);
      tags = ['Photo', 'Biometrics'];
    } else if (type === 'collateral_proof') {
      title = 'Land Title Certificate - Kampala Plot 114';
      docNo = 'VOL-4902-FOLIO-12';
      url = generateLandTitleSvg('Plot 114 Block 48 Kyadondo', customer.kyc.residenceDistrict, customer.fullName);
      tags = ['Collateral', 'Land Title'];
    } else if (type === 'business_license') {
      title = 'KCCA Commercial Trading License 2026';
      docNo = 'KCCA-TL-2026-8812';
      url = generateTradingLicenseSvg(customer.businessName || `${customer.fullName} Enterprises`, customer.fullName);
      tags = ['Trading License', 'Business'];
    } else {
      title = 'General Collateral / Security Deed';
      url = generateGenericDocumentSvg('Security Deposit Receipt', 'loan_security', customer.fullName);
      tags = ['Security'];
    }

    onAddDocument({
      customerId: customer.id,
      tenantId: tenant.id,
      category: type,
      title,
      documentNumber: docNo || undefined,
      fileType: 'image/svg+xml',
      fileSize: 120000,
      fileUrl: url,
      uploadedBy: `${currentUser.name} (${currentUser.role})`,
      verificationStatus: 'verified',
      verifiedAt: new Date().toISOString().split('T')[0],
      verifiedBy: currentUser.name,
      notes: 'Generated and verified in accordance with UMRA KYC procedures.',
      tags,
    });
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Customer Document Vault &amp; KYC Attachments
                </h2>
                <span className="font-mono-num text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  {customer.customerNo}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Borrower: <strong className="text-white">{customer.fullName}</strong> •{' '}
                {customer.businessName ? `${customer.businessName} • ` : ''}
                {customer.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close Vault"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KYC Status Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
              KYC Compliance Status:
            </span>
            <div className="flex items-center gap-1.5 font-medium">
              {hasNinFront ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> NIN Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> NIN Missing/Pending
                </span>
              )}

              {hasPhoto ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Portrait Captured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-slate-400" /> No Photo
                </span>
              )}

              {hasCollateral ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Collateral Deed Filed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-amber-500" /> No Collateral Doc
                </span>
              )}

              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  ⚠️ {pendingCount} Pending Review
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono-num">
              Total <strong>{customerDocs.length}</strong> attachment{customerDocs.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex space-x-1">
            <button
              onClick={() => {
                setActiveTab('gallery');
                stopCameraStream();
              }}
              className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'gallery'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Document Library ({customerDocs.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('upload');
                stopCameraStream();
              }}
              className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Local File
            </button>

            <button
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'camera'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              Scan / Webcam Capture
            </button>

            <button
              onClick={() => {
                setActiveTab('signature');
                stopCameraStream();
              }}
              className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'signature'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Digital Signature Pad
            </button>
          </div>

          {/* Quick Generator Dropdown */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Quick Template:</span>
            <button
              onClick={() => {
                setSignDocumentTarget('Loan Facility Agreement & Mandatory Disclosure');
                setActiveTab('signature');
                stopCameraStream();
              }}
              className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <PenTool className="w-3 h-3 text-emerald-600" />
              + Sign Agreement
            </button>
            <button
              onClick={() => handleQuickGenerate('national_id_front')}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              + NIN Front
            </button>
            <button
              onClick={() => handleQuickGenerate('passport_photo')}
              className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              + Photo
            </button>
            <button
              onClick={() => handleQuickGenerate('collateral_proof')}
              className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              + Land Title
            </button>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: GALLERY & LIST */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              {/* Filter & Search Toolbar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="relative w-full md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search documents, title, NIN, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px] font-medium">Category:</span>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">All Categories ({customerDocs.length})</option>
                      <option value="national_id_front">National ID (Front)</option>
                      <option value="national_id_back">National ID (Back)</option>
                      <option value="passport_photo">Passport Photo</option>
                      <option value="collateral_proof">Collateral Proof</option>
                      <option value="loan_security">Loan Security</option>
                      <option value="guarantor_form">Guarantor Form</option>
                      <option value="utility_bill">Proof of Residence</option>
                      <option value="business_license">Trading License</option>
                      <option value="digital_signature">Digital Signatures ({customerDocs.filter((d) => d.category === 'digital_signature').length})</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px] font-medium">Status:</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">All Statuses</option>
                      <option value="verified">Verified Only</option>
                      <option value="pending">Pending Review</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Document Cards Grid */}
              {filteredDocs.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">No Documents Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      {searchQuery || filterCategory !== 'all' || filterStatus !== 'all'
                        ? 'No documents matched your active search filters. Try resetting the filter.'
                        : 'No files or scans have been attached to this customer profile yet.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Select Local Document
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('camera');
                        startCamera();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Scan via Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocs.map((doc) => {
                    const catInfo = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.other;
                    const isVerified = doc.verificationStatus === 'verified';
                    const isPending = doc.verificationStatus === 'pending';
                    const isRejected = doc.verificationStatus === 'rejected';

                    return (
                      <div
                        key={doc.id}
                        className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
                      >
                        {/* Thumbnail Header Area */}
                        <div
                          onClick={() => {
                            setPreviewDoc(doc);
                            setZoomLevel(1);
                            setRotationDegree(0);
                          }}
                          className="h-44 bg-slate-100 relative cursor-pointer overflow-hidden border-b border-slate-100 flex items-center justify-center group-hover:opacity-95"
                        >
                          {doc.fileUrl.startsWith('data:image/') || doc.fileUrl.startsWith('http') ? (
                            <img
                              src={doc.fileUrl}
                              alt={doc.title}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                              <span className="text-[11px] font-bold text-slate-600 uppercase font-mono-num">
                                {doc.fileType}
                              </span>
                            </div>
                          )}

                          {/* Hover Overlay preview prompt */}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                            <span className="px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-xs text-xs font-bold flex items-center gap-1.5">
                              <Maximize2 className="w-3.5 h-3.5" /> View Fullscreen
                            </span>
                          </div>

                          {/* Category Badge Pill on top left */}
                          <div className="absolute top-2.5 left-2.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-xs ${catInfo.badgeColor}`}
                            >
                              <span>{catInfo.icon}</span>
                              <span>{catInfo.label}</span>
                            </span>
                          </div>

                          {/* Status Badge on top right */}
                          <div className="absolute top-2.5 right-2.5">
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                                <CheckCircle2 className="w-3 h-3" /> Verified
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                                <AlertCircle className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-emerald-700 transition-colors">
                              {doc.title}
                            </h4>
                            {doc.documentNumber && (
                              <p className="text-[11px] font-mono-num text-slate-500 font-semibold mt-0.5">
                                Ref: {doc.documentNumber}
                              </p>
                            )}

                            {doc.notes && (
                              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 italic">
                                "{doc.notes}"
                              </p>
                            )}

                            {doc.expiryDate && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium mt-1">
                                <Calendar className="w-3 h-3" />
                                <span>Expires: {doc.expiryDate}</span>
                              </div>
                            )}

                            {/* Tags */}
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {doc.tags.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Metadata Footer & Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                            <div>
                              <span className="block font-medium text-slate-500">
                                {formatSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                              <span className="text-[9px] text-slate-400 line-clamp-1">
                                By {doc.uploadedBy.split(' ')[0]}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSignDocumentTarget(`Addendum & Signature: ${doc.title}`);
                                  setActiveTab('signature');
                                }}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 cursor-pointer transition-colors"
                                title="Sign or Endorse this document"
                                aria-label={`Sign document ${doc.title}`}
                              >
                                <PenTool className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setPreviewDoc(doc);
                                  setZoomLevel(1);
                                  setRotationDegree(0);
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                                title="Full View"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={doc.fileUrl}
                                download={`${customer.customerNo}-${doc.category}.${doc.fileType.includes('pdf') ? 'pdf' : 'png'}`}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>

                              <button
                                onClick={() => {
                                  if (confirm(`Delete document "${doc.title}"?`)) {
                                    onDeleteDocument(doc.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOCAL FILE UPLOADER */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Attach Document from Local Storage
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select or drag-and-drop National IDs, Land Titles, Vehicle Logbooks, Passports, or legal agreements.
                  </p>
                </div>

                {/* Dropzone Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                      : uploadFile
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf,application/msword"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {uploadFile ? (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{uploadFile.fileName}</p>
                        <p className="text-[11px] text-slate-500 font-mono-num">
                          {formatSize(uploadFile.fileSize)} • {uploadFile.fileType}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Choose another file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Drag and drop your file here, or{' '}
                        <span className="text-emerald-700 underline">browse files</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supported formats: JPEG, PNG, WEBP, SVG, PDF up to 25 MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Form fields for metadata */}
                {uploadFile && (
                  <div className="space-y-4 pt-2 border-t border-slate-100 text-xs animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Document Category <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as DocumentCategory)}
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="national_id_front">National ID (NIN) - Front Face</option>
                          <option value="national_id_back">National ID (NIN) - Reverse Barcode</option>
                          <option value="passport_photo">Borrower Portrait / Passport Photo</option>
                          <option value="collateral_proof">Collateral Proof (Land Title / Logbook)</option>
                          <option value="loan_security">Loan Security Agreement / Chattel Deed</option>
                          <option value="guarantor_form">Guarantor ID &amp; Undertaking Deed</option>
                          <option value="utility_bill">Proof of Residence (Umeme/NWSC/LC1)</option>
                          <option value="business_license">Trading License / Registration</option>
                          <option value="digital_signature">Digital Signature &amp; Executed Agreement</option>
                          <option value="other">Other Attachment</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Document Title / Description <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="e.g. Uganda National ID Front"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Document / Certificate / Plate Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={formDocNumber}
                          onChange={(e) => setFormDocNumber(e.target.value)}
                          placeholder="e.g. CM84029482718K or UFG 812K"
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Expiration Date (If Applicable)
                        </label>
                        <input
                          type="date"
                          value={formExpiryDate}
                          onChange={(e) => setFormExpiryDate(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Physical Storage / Custody Notes
                      </label>
                      <input
                        type="text"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="e.g. Original title deposited in Branch Safe #2; inspected against URSB registry."
                        className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Metadata Tags (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={formTags}
                        onChange={(e) => setFormTags(e.target.value)}
                        placeholder="e.g. KYC, Primary, Verified, Land Title"
                        className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setUploadFile(null)}
                        className="px-4 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveUploadedDocument(uploadFile.dataUrl, uploadFile.fileType, uploadFile.fileSize)
                        }
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Save Document to Customer Vault
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CAMERA / SCANNING CAPTURE */}
          {activeTab === 'camera' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      Live Document Scanner &amp; Webcam Capture
                    </h3>
                    <p className="text-xs text-slate-500">
                      Align document edges within the guide box to scan National ID, Logbook, or Portrait photo.
                    </p>
                  </div>

                  {availableCameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        setSelectedCameraId(e.target.value);
                        startCamera(e.target.value);
                      }}
                      className="text-xs border rounded-lg px-2 py-1 bg-white font-medium"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.deviceId || idx} value={cam.deviceId}>
                          {cam.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Viewfinder Guide Mode & Post-Processing Filters */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Framing Guide:</span>
                    <button
                      type="button"
                      onClick={() => setCameraGuideMode('card')}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                        cameraGuideMode === 'card'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Card Frame (National ID)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraGuideMode('portrait')}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                        cameraGuideMode === 'portrait'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Portrait Oval (Borrower Face)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraGuideMode('document')}
                      className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                        cameraGuideMode === 'document'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Full Page (Title / Logbook)
                    </button>
                  </div>

                  {/* Filter selector */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 ml-1" />
                    <button
                      type="button"
                      onClick={() => setScanFilter('normal')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        scanFilter === 'normal'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Normal Color
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanFilter('contrast')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        scanFilter === 'contrast'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      High Contrast
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanFilter('grayscale')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        scanFilter === 'grayscale'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      B&amp;W Photocopy
                    </button>
                  </div>
                </div>

                {/* Live Camera Viewfinder or Captured Result */}
                <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
                  {capturedPhotoUrl ? (
                    // Captured image preview
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <img
                        src={capturedPhotoUrl}
                        alt="Captured scan"
                        className="max-h-full max-w-full object-contain"
                      />
                      <div className="absolute top-3 left-3 bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Snapshot Captured
                      </div>

                      {/* Base64 & Format Badges */}
                      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md backdrop-blur-xs flex items-center gap-1.5 border border-slate-700">
                            <FileText className="w-3 h-3 text-emerald-400" />
                            Base64 Encoded ({extractMimeTypeFromDataUrl(capturedPhotoUrl)})
                          </span>
                          <span className="bg-slate-900/90 text-emerald-300 text-[11px] font-mono px-2 py-1 rounded-md backdrop-blur-xs border border-slate-700">
                            {formatDocumentFileSize(estimateBase64SizeBytes(capturedPhotoUrl))}
                          </span>
                        </div>
                        {capturedResolution.width > 0 && (
                          <span className="bg-slate-900/90 text-slate-300 text-[11px] font-mono px-2 py-1 rounded-md backdrop-blur-xs border border-slate-700">
                            {capturedResolution.width}×{capturedResolution.height} px
                          </span>
                        )}
                      </div>
                    </div>
                  ) : cameraError ? (
                    // Error state with fallback options
                    <div className="p-8 text-center text-white space-y-3">
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                        <VideoOff className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-rose-300">Camera Unavailable in this Environment</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        {cameraError}. You can either select a local file or generate a high-definition simulated KYC scan.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => startCamera(selectedCameraId)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const scanUrl =
                              cameraGuideMode === 'card'
                                ? generateNationalIdFrontSvg(customer.fullName, customer.kyc.idNumberMasked, customer.kyc.dateOfBirth, customer.kyc.gender)
                                : cameraGuideMode === 'portrait'
                                ? generatePassportPhotoSvg(customer.fullName)
                                : generateLandTitleSvg('Plot 244 Kisaasi', customer.kyc.residenceDistrict, customer.fullName);
                            setCapturedPhotoUrl(scanUrl);
                            setCapturedResolution({ width: 1280, height: 720 });
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Simulate High-Res Scan
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Live Video Feed with Viewfinder Guidelines
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Viewfinder Overlays based on mode */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {cameraGuideMode === 'card' && (
                          <div className="w-[78%] h-[68%] rounded-xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative flex items-center justify-center">
                            {/* Corner Marks */}
                            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400" />
                            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400" />
                            <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded backdrop-blur-xs">
                              Align National ID Card Within Frame
                            </span>
                          </div>
                        )}

                        {cameraGuideMode === 'portrait' && (
                          <div className="w-[45%] h-[75%] rounded-[50%] border-2 border-sky-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative flex items-center justify-center">
                            <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded backdrop-blur-xs">
                              Center Face Inside Oval
                            </span>
                          </div>
                        )}

                        {cameraGuideMode === 'document' && (
                          <div className="w-[85%] h-[85%] rounded-md border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative flex items-center justify-center">
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400" />
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400" />
                            <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded backdrop-blur-xs">
                              Align Document Page / Land Title Deed
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Hidden canvas for drawing snapshot */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Actions Bar */}
                <div className="flex items-center justify-between pt-1">
                  {capturedPhotoUrl ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedPhotoUrl(null);
                          startCamera(selectedCameraId);
                        }}
                        className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Populate upload form with captured snapshot in base64
                          const calculatedSize = estimateBase64SizeBytes(capturedPhotoUrl);
                          const mime = extractMimeTypeFromDataUrl(capturedPhotoUrl);
                          setUploadFile({
                            dataUrl: capturedPhotoUrl,
                            fileName: `scan-${customer.customerNo}-${Date.now()}.${mime.includes('svg') ? 'svg' : 'jpg'}`,
                            fileType: mime,
                            fileSize: calculatedSize,
                          });
                          if (cameraGuideMode === 'card') {
                            setFormCategory('national_id_front');
                            setFormTitle('Uganda National ID (NIN) Front - Camera Scan');
                            setFormDocNumber(customer.kyc.idNumberMasked);
                          } else if (cameraGuideMode === 'portrait') {
                            setFormCategory('passport_photo');
                            setFormTitle('Borrower Portrait Photo - Live Biometric');
                          } else {
                            setFormCategory('collateral_proof');
                            setFormTitle('Collateral Deed - Scanned Document');
                          }
                          setActiveTab('upload');
                        }}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Use Captured Scan &amp; Save Details
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="text-[11px] text-slate-500">
                        {cameraActive ? 'Camera active • Ready to snap' : 'Camera standby'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const scanUrl =
                              cameraGuideMode === 'card'
                                ? generateNationalIdFrontSvg(customer.fullName, customer.kyc.idNumberMasked, customer.kyc.dateOfBirth, customer.kyc.gender)
                                : cameraGuideMode === 'portrait'
                                ? generatePassportPhotoSvg(customer.fullName)
                                : generateLandTitleSvg('Plot 244 Kisaasi', customer.kyc.residenceDistrict, customer.fullName);
                            setCapturedPhotoUrl(scanUrl);
                            setCapturedResolution({ width: 1280, height: 720 });
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Simulate Scan
                        </button>
                        <button
                          type="button"
                          onClick={capturePhoto}
                          disabled={!cameraActive}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Camera className="w-4 h-4" />
                          Snap Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DIGITAL SIGNATURE PAD */}
          {activeTab === 'signature' && (
            <DigitalSignatureModal
              customer={customer}
              currentUser={currentUser}
              tenant={tenant}
              isOpen={true}
              preselectedDocumentTitle={signDocumentTarget}
              onClose={() => {
                setActiveTab('gallery');
                setSignDocumentTarget('');
              }}
              onSaveSignedDocument={(newDoc) => {
                onAddDocument(newDoc);
                setActiveTab('gallery');
                setSignDocumentTarget('');
              }}
            />
          )}
        </div>
      </div>

      {/* FULLSCREEN DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden text-white shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{CATEGORY_CONFIG[previewDoc.category]?.icon || '📄'}</span>
                <div>
                  <h3 className="font-bold text-sm text-white">{previewDoc.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    {previewDoc.documentNumber ? `Ref: ${previewDoc.documentNumber} • ` : ''}
                    {CATEGORY_CONFIG[previewDoc.category]?.label}
                  </p>
                </div>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-slate-300">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1 hover:text-white rounded cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono-num px-2 font-bold">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="p-1 hover:text-white rounded cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                  <button
                    onClick={() => setRotationDegree((r) => (r + 90) % 360)}
                    className="p-1 hover:text-white rounded cursor-pointer"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                <a
                  href={previewDoc.fileUrl}
                  download={`${customer.customerNo}-${previewDoc.category}.png`}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split View: Image Viewer & Metadata / Verification Sidebar */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Document Display Canvas */}
              <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto relative">
                <div
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotationDegree}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-w-full max-h-full flex items-center justify-center shadow-2xl"
                >
                  {previewDoc.fileUrl.startsWith('data:image/') || previewDoc.fileUrl.startsWith('http') ? (
                    <img
                      src={previewDoc.fileUrl}
                      alt={previewDoc.title}
                      className="max-h-[70vh] rounded-lg shadow-lg object-contain bg-white"
                    />
                  ) : (
                    <div className="p-12 bg-white text-slate-900 rounded-xl text-center space-y-3">
                      <FileText className="w-16 h-16 text-slate-400 mx-auto" />
                      <p className="font-bold text-sm">{previewDoc.title}</p>
                      <p className="text-xs text-slate-500 font-mono-num">{previewDoc.fileType}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Metadata & Verification Actions */}
              <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between shrink-0 overflow-y-auto text-xs space-y-4">
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      previewDoc.verificationStatus === 'verified'
                        ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                        : previewDoc.verificationStatus === 'pending'
                        ? 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                        : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                        Verification Status
                      </span>
                      <strong className="text-sm font-bold capitalize">
                        {previewDoc.verificationStatus}
                      </strong>
                    </div>
                    {previewDoc.verificationStatus === 'verified' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                    {previewDoc.verificationStatus === 'pending' && <AlertCircle className="w-6 h-6 text-amber-400" />}
                    {previewDoc.verificationStatus === 'rejected' && <XCircle className="w-6 h-6 text-rose-400" />}
                  </div>

                  {/* Metadata particulars */}
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">
                        Customer Account
                      </span>
                      <strong className="text-white">
                        {customer.fullName} ({customer.customerNo})
                      </strong>
                    </div>

                    {previewDoc.documentNumber && (
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">
                          Document Number
                        </span>
                        <strong className="text-emerald-400 font-mono-num">
                          {previewDoc.documentNumber}
                        </strong>
                      </div>
                    )}

                    {previewDoc.expiryDate && (
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">
                          Expiration Date
                        </span>
                        <strong className="text-amber-400 font-mono-num">
                          {previewDoc.expiryDate}
                        </strong>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">
                        File Particulars
                      </span>
                      <span className="text-slate-300 font-mono-num">
                        {formatSize(previewDoc.fileSize)} • {previewDoc.fileType}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">
                        Uploaded By &amp; Date
                      </span>
                      <span className="text-slate-300">
                        {previewDoc.uploadedBy}
                      </span>
                      <span className="block text-slate-500 font-mono-num text-[11px]">
                        {new Date(previewDoc.uploadedAt).toLocaleString()}
                      </span>
                    </div>

                    {previewDoc.notes && (
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">
                          Audit &amp; Safe Notes
                        </span>
                        <p className="text-slate-300 italic bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 mt-1">
                          "{previewDoc.notes}"
                        </p>
                      </div>
                    )}

                    {previewDoc.verifiedBy && (
                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">
                          Verified By
                        </span>
                        <span className="text-emerald-400 font-semibold">{previewDoc.verifiedBy}</span>
                        {previewDoc.verifiedAt && (
                          <span className="block text-slate-500 text-[10px] font-mono-num">
                            On {previewDoc.verifiedAt}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Control Buttons */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    Officer Compliance Action:
                  </span>

                  {previewDoc.verificationStatus !== 'verified' && (
                    <button
                      onClick={() => {
                        onUpdateDocumentStatus(previewDoc.id, 'verified', 'Verified against primary registry');
                        setPreviewDoc({ ...previewDoc, verificationStatus: 'verified', verifiedBy: currentUser.name });
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve &amp; Verify Document
                    </button>
                  )}

                  {previewDoc.verificationStatus !== 'rejected' && (
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejecting this document (e.g., blurred, expired, mismatched NIN):');
                        if (reason) {
                          onUpdateDocumentStatus(previewDoc.id, 'rejected', reason);
                          setPreviewDoc({ ...previewDoc, verificationStatus: 'rejected', verificationNotes: reason });
                        }
                      }}
                      className="w-full py-2 bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject / Flag Document
                    </button>
                  )}

                  {previewDoc.verificationStatus !== 'pending' && (
                    <button
                      onClick={() => {
                        onUpdateDocumentStatus(previewDoc.id, 'pending', 'Reopened for inspection');
                        setPreviewDoc({ ...previewDoc, verificationStatus: 'pending' });
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-xs cursor-pointer"
                    >
                      Reset to Pending
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
