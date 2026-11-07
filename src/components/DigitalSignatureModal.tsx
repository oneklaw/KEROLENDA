import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Customer, AppUser, Tenant, CustomerDocument } from '../types';
import {
  SignatureStrokePoint,
  validateSignatureStrokes,
  generateSignatureAuditFingerprint,
  generateSignedLoanAgreementSvg,
  generateDigitalSignatureCertificateSvg,
} from '../utils/signatureService';
import {
  PenTool,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Download,
  X,
  Sparkles,
  Info,
  Calendar,
  Lock,
  Stamp,
  UserCheck,
} from 'lucide-react';

interface DigitalSignatureModalProps {
  customer: Customer;
  currentUser: AppUser;
  tenant: Tenant;
  isOpen: boolean;
  preselectedDocumentTitle?: string;
  preselectedLoanReference?: string;
  preselectedAmountUGX?: number;
  onClose: () => void;
  onSaveSignedDocument: (doc: Omit<CustomerDocument, 'id' | 'uploadedAt'>) => void;
}

const INK_COLORS = [
  { label: 'Deep Navy', value: '#0f172a', bgClass: 'bg-slate-900' },
  { label: 'Bank Blue', value: '#1d4ed8', bgClass: 'bg-blue-700' },
  { label: 'Classic Black', value: '#111827', bgClass: 'bg-black' },
  { label: 'Emerald Green', value: '#047857', bgClass: 'bg-emerald-700' },
];

const STROKE_WIDTHS = [
  { label: 'Fine (2px)', value: 2 },
  { label: 'Standard (3.5px)', value: 3.5 },
  { label: 'Bold (5px)', value: 5 },
];

const AGREEMENT_TEMPLATES = [
  {
    title: 'Loan Agreement & Mandatory Disclosure Note',
    category: 'loan_security' as const,
    description: 'Statutory facility agreement with Tier 4 UMRA disclosure terms and amortization schedule.',
  },
  {
    title: 'Chattel Mortgage & Asset Lien Security Deed',
    category: 'loan_security' as const,
    description: 'Security pledge over moveable assets, motor vehicles, or personal property.',
  },
  {
    title: 'Guarantor Personal Guarantee & Indemnity Deed',
    category: 'guarantor_form' as const,
    description: 'Irrevocable undertaking by guarantor guaranteeing customer facility repayment.',
  },
  {
    title: 'Customer KYC & Biometric Data Consent Declaration',
    category: 'digital_signature' as const,
    description: 'Express consent under Data Protection and Privacy Act, 2019 for CRB inquiries.',
  },
  {
    title: 'Promissory Note & Mobile Money Direct Debit Mandate',
    category: 'loan_security' as const,
    description: 'Unconditional promise to pay and authorization for MTN/Airtel collection.',
  },
];

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  customer,
  currentUser,
  tenant,
  isOpen,
  preselectedDocumentTitle,
  preselectedLoanReference,
  preselectedAmountUGX,
  onClose,
  onSaveSignedDocument,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const [strokes, setStrokes] = useState<SignatureStrokePoint[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<SignatureStrokePoint[]>([]);

  // Pen Configuration
  const [selectedColor, setSelectedColor] = useState<string>('#0f172a');
  const [selectedWidth, setSelectedWidth] = useState<number>(3.5);

  // Agreement State
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string>(
    preselectedDocumentTitle || AGREEMENT_TEMPLATES[0].title
  );
  const [signerRole, setSignerRole] = useState<
    'Primary Borrower' | 'Guarantor' | 'Co-Applicant / Spouse' | 'Witness / Credit Officer'
  >('Primary Borrower');
  const [loanReference, setLoanReference] = useState<string>(preselectedLoanReference || 'LN-2026-0092');
  const [facilityAmount, setFacilityAmount] = useState<number>(preselectedAmountUGX || 5_000_000);
  const [hasLegalConsent, setHasLegalConsent] = useState<boolean>(true);
  const [saveFormat, setSaveFormat] = useState<'full_agreement' | 'certificate_only'>('full_agreement');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Redraw canvas whenever strokes change or configuration updates
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background subtle pattern
    ctx.save();
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw baseline guideline
    const baselineY = canvas.height - 45;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(25, baselineY);
    ctx.lineTo(canvas.width - 25, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw "✕ SIGN HERE" helper text
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('✕ SIGN ON THIS LINE', 25, baselineY - 8);
    ctx.restore();

    // Draw all completed strokes
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = selectedWidth;

    const allStrokes = currentStroke.length > 0 ? [...strokes, currentStroke] : strokes;

    allStrokes.forEach((stroke) => {
      if (stroke.length === 0) return;
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, selectedWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = selectedColor;
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        const xc = (stroke[i - 1].x + stroke[i].x) / 2;
        const yc = (stroke[i - 1].y + stroke[i].y) / 2;
        ctx.quadraticCurveTo(stroke[i - 1].x, stroke[i - 1].y, xc, yc);
      }
      const last = stroke[stroke.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    });
  }, [strokes, currentStroke, selectedColor, selectedWidth]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Set physical canvas dimensions once on open
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== 640 || canvas.height !== 240) {
      canvas.width = 640;
      canvas.height = 240;
    }
  }, [isOpen]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    isDrawingRef.current = true;
    setCurrentStroke([{ x, y }]);
    setValidationError(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCurrentStroke((prev) => [...prev, { x, y }]);
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStroke.length > 0) {
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  // Touch Handlers for Tablets / Phones
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    e.preventDefault(); // Stop scrolling while signing
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    isDrawingRef.current = true;
    setCurrentStroke([{ x, y }]);
    setValidationError(null);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || e.touches.length === 0) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    setCurrentStroke((prev) => [...prev, { x, y }]);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStroke.length > 0) {
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  // Clear Canvas
  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setValidationError(null);
  };

  // Undo Last Stroke
  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
    setValidationError(null);
  };

  // Quick Preset Sample Signature (for demonstration or accessibility testing)
  const handleLoadSampleSignature = () => {
    const sampleStrokes: SignatureStrokePoint[][] = [
      // Capital Initial flourish
      [
        { x: 60, y: 155 },
        { x: 75, y: 85 },
        { x: 95, y: 75 },
        { x: 105, y: 95 },
        { x: 110, y: 150 },
      ],
      // First wave curve
      [
        { x: 110, y: 130 },
        { x: 130, y: 110 },
        { x: 145, y: 140 },
        { x: 160, y: 115 },
        { x: 175, y: 142 },
        { x: 190, y: 120 },
      ],
      // Large loop flourish
      [
        { x: 190, y: 120 },
        { x: 220, y: 70 },
        { x: 245, y: 65 },
        { x: 240, y: 110 },
        { x: 220, y: 165 },
        { x: 200, y: 185 },
        { x: 230, y: 175 },
        { x: 290, y: 145 },
      ],
      // Bottom underline flourish
      [
        { x: 80, y: 175 },
        { x: 160, y: 170 },
        { x: 280, y: 165 },
        { x: 380, y: 155 },
        { x: 420, y: 152 },
      ],
      // Final accent dot
      [
        { x: 435, y: 148 },
        { x: 436, y: 149 },
      ],
    ];

    setStrokes(sampleStrokes);
    setValidationError(null);
  };

  const validation = validateSignatureStrokes(strokes);

  // Save Signature & Execute Document
  const handleSaveAndExecute = () => {
    if (!validation.isValid) {
      setValidationError(validation.error || 'Please provide a valid signature stroke on the pad.');
      return;
    }

    if (!hasLegalConsent) {
      setValidationError('You must accept the legal recognition declaration under the Electronic Signatures Act, 2011.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export raw signature PNG data URL
    const signaturePngDataUrl = canvas.toDataURL('image/png');

    const signedAt = new Date().toISOString();
    const documentNumber = `ESIGN-${customer.customerNo}-${Date.now().toString().slice(-6)}`;
    const auditToken = generateSignatureAuditFingerprint(
      customer.fullName,
      customer.kyc.idNumberMasked,
      signedAt,
      documentNumber
    );

    let documentSvgUrl = '';
    let docTitle = selectedTemplateTitle;

    if (saveFormat === 'full_agreement') {
      documentSvgUrl = generateSignedLoanAgreementSvg({
        customerName: customer.fullName,
        nin: customer.kyc.idNumberMasked,
        customerNo: customer.customerNo,
        documentTitle: selectedTemplateTitle,
        documentNumber,
        loanReference,
        facilityAmountUGX: facilityAmount,
        role: signerRole,
        signatureDataUrl: signaturePngDataUrl,
        signedAt,
        companyName: tenant.displayName || tenant.legalName,
        branchName: 'Kampala Main Branch',
        witnessName: `${currentUser.name} (${currentUser.role})`,
        deviceId: 'KEROLENDA-POS-TERM-01',
      });
      docTitle = `Executed: ${selectedTemplateTitle}`;
    } else {
      documentSvgUrl = generateDigitalSignatureCertificateSvg(
        customer.fullName,
        customer.kyc.idNumberMasked,
        signaturePngDataUrl,
        signedAt,
        selectedTemplateTitle,
        tenant.displayName || tenant.legalName
      );
      docTitle = `Digital Signature Attestation: ${customer.fullName}`;
    }

    // Save directly into Customer Document Vault
    onSaveSignedDocument({
      customerId: customer.id,
      tenantId: tenant.id,
      category: 'digital_signature',
      title: docTitle,
      documentNumber,
      fileType: 'image/svg+xml',
      fileSize: Math.round(documentSvgUrl.length * 0.75),
      fileUrl: documentSvgUrl,
      uploadedBy: currentUser.name,
      verificationStatus: 'verified',
      verifiedAt: signedAt,
      verifiedBy: currentUser.name,
      verificationNotes: `Electronically signed on device via touch/mouse input by ${customer.fullName} (${customer.kyc.idNumberMasked}). Verified under Uganda Electronic Signatures Act, 2011. Audit token: ${auditToken}`,
      tags: ['#DigitalSignature', '#ElectronicSignaturesAct2011', '#VerifiedBiometric', '#UMRA'],
      notes: `Signer Role: ${signerRole} • Ref: ${loanReference || 'N/A'} • Device: Touch Screen`,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="signature-modal-title" className="text-lg font-black tracking-tight text-white">
                  Digital Signature &amp; Document Execution
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Electronic Signatures Act, 2011
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Borrower:{' '}
                <strong className="text-white font-bold">{customer.fullName}</strong> ({customer.customerNo}) • NIN:{' '}
                <span className="font-mono text-emerald-300 font-bold">{customer.kyc.idNumberMasked}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close signature modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Agreement Selection & Signer Particulars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">Document to Sign / Agreement *</label>
              <select
                value={selectedTemplateTitle}
                onChange={(e) => setSelectedTemplateTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-hidden"
              >
                {AGREEMENT_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.title} value={tmpl.title}>
                    {tmpl.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Signing Capacity / Role *</label>
              <select
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value as typeof signerRole)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-hidden"
              >
                <option value="Primary Borrower">Primary Borrower</option>
                <option value="Guarantor">Guarantor</option>
                <option value="Co-Applicant / Spouse">Co-Applicant / Spouse</option>
                <option value="Witness / Credit Officer">Witness / Credit Officer</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Loan Facility Reference</label>
              <input
                type="text"
                value={loanReference}
                onChange={(e) => setLoanReference(e.target.value)}
                placeholder="e.g. LN-2026-0092"
                className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Facility Principal (UGX)</label>
              <input
                type="number"
                value={facilityAmount}
                onChange={(e) => setFacilityAmount(Number(e.target.value))}
                placeholder="5000000"
                className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Vault Output Format</label>
              <select
                value={saveFormat}
                onChange={(e) => setSaveFormat(e.target.value as typeof saveFormat)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-hidden"
              >
                <option value="full_agreement">Full Executed Legal Agreement (SVG)</option>
                <option value="certificate_only">Digital Signature Certificate (SVG)</option>
              </select>
            </div>
          </div>

          {/* Interactive Digital Canvas Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  Touch / Mouse Signature Pad
                </span>
                <span className="text-[11px] text-slate-500">
                  (Draw with stylus, finger, or mouse on the white canvas)
                </span>
              </div>

              {/* Ink & Pen Tooling Controls */}
              <div className="flex items-center gap-3">
                {/* Ink Color Picker */}
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500">Ink:</span>
                  {INK_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      title={c.label}
                      className={`w-5 h-5 rounded-full ${c.bgClass} cursor-pointer transition-transform ${
                        selectedColor === c.value
                          ? 'ring-2 ring-emerald-500 ring-offset-1 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`Ink color ${c.label}`}
                    />
                  ))}
                </div>

                {/* Stroke Width Toggle */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs text-[11px]">
                  <span className="text-[10px] font-bold text-slate-500">Pen:</span>
                  {STROKE_WIDTHS.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => setSelectedWidth(w.value)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        selectedWidth === w.value
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {w.value}px
                    </button>
                  ))}
                </div>

                {/* Quick Presets / Clear Actions */}
                <button
                  type="button"
                  onClick={handleLoadSampleSignature}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Draw sample cursive signature"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sample Preset
                </button>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 disabled:opacity-40 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Undo last stroke"
                  aria-label="Undo last signature stroke"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={strokes.length === 0}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Clear canvas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            {/* Canvas Surface with Touch Prevention */}
            <div className="relative w-full bg-white rounded-xl border-2 border-dashed border-slate-300 shadow-inner flex justify-center items-center overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className="w-full max-w-[640px] h-[240px] cursor-crosshair touch-none select-none block"
                style={{ touchAction: 'none' }}
                aria-label="Digital signature drawing canvas. Use touch or mouse to sign."
              />

              {strokes.length === 0 && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
                  <PenTool className="w-8 h-8 mb-1 stroke-1 text-slate-300" />
                  <p className="text-xs font-bold text-slate-400">Press &amp; drag mouse or stylus here to sign</p>
                  <p className="text-[10px] text-slate-400">Uganda Electronic Signatures Act, 2011</p>
                </div>
              )}
            </div>

            {/* Live Stroke Telemetry */}
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                {validation.isValid ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Signature Captured ({validation.strokeCount} strokes, {validation.pointCount} points)
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    Awaiting customer signature on the guideline
                  </span>
                )}
              </div>

              <div className="text-slate-400 font-mono text-[10px]">
                Device Resolution: 640×240 px • Smooth Bezier Interpolation
              </div>
            </div>
          </div>

          {/* Legal Compliance & Consent Agreement */}
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLegalConsent}
                onChange={(e) => setHasLegalConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-medium leading-relaxed">
                <strong className="text-slate-900 font-bold">Legal Acknowledgment &amp; Consent: </strong>
                Under Section 5 of the <em>Uganda Electronic Signatures Act, 2011</em> and UMRA Tier 4 regulations, the
                customer agrees that this electronic signature stroke is equivalent to a physical handwritten signature
                and legally binds them to the covenant terms of{' '}
                <strong className="text-slate-900">{selectedTemplateTitle}</strong>.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 pt-1 border-t border-amber-200/60">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Audit Fingerprint: Encrypted SHA-256 Token
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                Immutable Storage in Customer Vault
              </span>
              <span className="flex items-center gap-1">
                <Stamp className="w-3 h-3 text-indigo-600" />
                UMRA Credit Registry Compliant
              </span>
            </div>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Success Notification */}
          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Signed agreement saved successfully to customer document vault!</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Witnessing Officer: <strong className="text-slate-800 font-semibold">{currentUser.name}</strong> (
            {currentUser.role})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAndExecute}
              disabled={strokes.length === 0 || !hasLegalConsent || isSuccess}
              className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSuccess ? 'Signed & Saved!' : 'Execute & Save to Vault'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
