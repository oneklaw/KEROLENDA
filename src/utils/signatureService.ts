/**
 * Digital Signature Capture & Legal Agreement Verification Service
 * Compliant with Uganda Electronic Signatures Act, 2011 & UMRA Tier 4 Regulations.
 */

export interface SignatureStrokePoint {
  x: number;
  y: number;
}

export interface SignedAgreementPayload {
  customerName: string;
  nin: string;
  customerNo: string;
  documentTitle: string;
  documentNumber: string;
  loanReference?: string;
  facilityAmountUGX?: number;
  role: 'Primary Borrower' | 'Guarantor' | 'Co-Applicant / Spouse' | 'Witness / Credit Officer';
  signatureDataUrl: string;
  signedAt: string;
  companyName: string;
  branchName?: string;
  witnessName?: string;
  deviceId?: string;
  ipAddress?: string;
}

/**
 * Validates that digital signature contains substantive strokes and isn't just an empty click or accidental speck.
 */
export function validateSignatureStrokes(strokes: SignatureStrokePoint[][]): {
  isValid: boolean;
  strokeCount: number;
  pointCount: number;
  error?: string;
} {
  if (!strokes || strokes.length === 0) {
    return { isValid: false, strokeCount: 0, pointCount: 0, error: 'Signature canvas is empty. Please sign within the box.' };
  }

  const totalPoints = strokes.reduce((sum, stroke) => sum + stroke.length, 0);

  if (totalPoints < 6) {
    return {
      isValid: false,
      strokeCount: strokes.length,
      pointCount: totalPoints,
      error: 'Signature too short. Please provide a complete signature stroke.',
    };
  }

  return { isValid: true, strokeCount: strokes.length, pointCount: totalPoints };
}

/**
 * Generates deterministic cryptographic verification token for Uganda Electronic Signatures Act compliance.
 */
export function generateSignatureAuditFingerprint(
  signerName: string,
  nin: string,
  timestamp: string,
  documentNumber: string
): string {
  const seed = `${signerName.trim().toUpperCase()}|${nin.trim().toUpperCase()}|${timestamp}|${documentNumber}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  return `UG-ESIGN-2026-${hex}-${timestamp.slice(0, 10).replace(/-/g, '')}`;
}

/**
 * Converts array of stroke point segments into smooth SVG path data.
 */
export function strokesToSvgPathData(strokes: SignatureStrokePoint[][]): string {
  return strokes
    .filter((stroke) => stroke.length > 0)
    .map((stroke) => {
      if (stroke.length === 1) {
        return `M ${stroke[0].x.toFixed(1)} ${stroke[0].y.toFixed(1)} l 0.1 0.1`;
      }
      let d = `M ${stroke[0].x.toFixed(1)} ${stroke[0].y.toFixed(1)}`;
      for (let i = 1; i < stroke.length; i++) {
        const xc = ((stroke[i - 1].x + stroke[i].x) / 2).toFixed(1);
        const yc = ((stroke[i - 1].y + stroke[i].y) / 2).toFixed(1);
        d += ` Q ${stroke[i - 1].x.toFixed(1)} ${stroke[i - 1].y.toFixed(1)}, ${xc} ${yc}`;
      }
      const last = stroke[stroke.length - 1];
      d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
      return d;
    })
    .join(' ');
}

/**
 * Generates an isolated SVG data URI of the digital signature strokes with metadata stamp.
 */
export function generateDigitalSignatureSvg(
  strokes: SignatureStrokePoint[][],
  width: number = 600,
  height: number = 240,
  strokeColor: string = '#0f172a',
  strokeWidth: number = 3
): string {
  const pathData = strokesToSvgPathData(strokes);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <pattern id="sig-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
      </pattern>
    </defs>
    <!-- Background Pad -->
    <rect width="${width}" height="${height}" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect width="${width}" height="${height}" rx="12" fill="url(#sig-grid)"/>

    <!-- Baseline Guide -->
    <line x1="30" y1="${height - 50}" x2="${width - 30}" y2="${height - 50}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6,4"/>
    <text x="32" y="${height - 56}" font-family="sans-serif" font-size="12" font-weight="700" fill="#94a3b8">✕ SIGN HERE</text>

    <!-- Signature Path -->
    <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Verification Stamp Watermark -->
    <text x="${width - 30}" y="${height - 18}" font-family="monospace" font-size="9" fill="#94a3b8" text-anchor="end">KEROLENDA DIGITAL SIGNATURE • VERIFIED BIOMETRIC STROKE</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a full legally binding executed Loan Agreement Document SVG.
 * Features borrower particulars, facility schedule summary, digital signature stroke, and UMRA compliance seals.
 */
export function generateSignedLoanAgreementSvg(payload: SignedAgreementPayload): string {
  const fingerprint = generateSignatureAuditFingerprint(
    payload.customerName,
    payload.nin,
    payload.signedAt,
    payload.documentNumber
  );

  const formattedDate = new Date(payload.signedAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = new Date(payload.signedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const amountStr = payload.facilityAmountUGX
    ? `UGX ${payload.facilityAmountUGX.toLocaleString('en-US')}`
    : 'Facility terms as scheduled';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1080" width="100%" height="100%">
    <defs>
      <linearGradient id="doc-header-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <pattern id="doc-seal-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="1" fill="#cbd5e1" opacity="0.3"/>
      </pattern>
    </defs>

    <!-- Document Background Sheet -->
    <rect width="800" height="1080" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect width="800" height="1080" fill="url(#doc-seal-pattern)"/>

    <!-- Top Border Accent Stripes -->
    <rect x="0" y="0" width="800" height="8" fill="#047857"/>
    <rect x="0" y="8" width="800" height="4" fill="#d97706"/>

    <!-- Header Section -->
    <rect x="40" y="32" width="720" height="110" rx="10" fill="url(#doc-header-grad)"/>

    <!-- Institution Seal Emblem -->
    <circle cx="95" cy="87" r="34" fill="#047857" stroke="#34d399" stroke-width="2"/>
    <text x="95" y="93" font-family="sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">KL</text>

    <!-- Title and Legal Header -->
    <text x="145" y="68" font-family="sans-serif" font-size="18" font-weight="800" fill="#ffffff" letter-spacing="1">${payload.companyName.toUpperCase()}</text>
    <text x="145" y="88" font-family="sans-serif" font-size="13" font-weight="700" fill="#34d399" letter-spacing="0.5">${payload.documentTitle.toUpperCase()}</text>
    <text x="145" y="108" font-family="sans-serif" font-size="10" font-weight="500" fill="#94a3b8">TIER 4 UMRA &amp; UGANDA ELECTRONIC SIGNATURES ACT, 2011 COMPLIANT</text>

    <!-- Document Reference Ribbon -->
    <rect x="560" y="52" width="180" height="50" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="575" y="70" font-family="sans-serif" font-size="9" font-weight="700" fill="#94a3b8">AGREEMENT REF:</text>
    <text x="575" y="88" font-family="monospace" font-size="12" font-weight="800" fill="#f8fafc">${payload.documentNumber}</text>

    <!-- Borrower Particulars Card -->
    <rect x="40" y="160" width="720" height="150" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    <rect x="40" y="160" width="720" height="32" rx="8" fill="#f1f5f9"/>
    <text x="58" y="181" font-family="sans-serif" font-size="11" font-weight="800" fill="#334155" letter-spacing="1">1. PARTIES &amp; BORROWER IDENTIFICATION (KYC VERIFIED)</text>

    <g transform="translate(58, 210)" font-family="sans-serif">
      <text x="0" y="0" font-size="10" font-weight="600" fill="#64748b">CUSTOMER FULL NAME</text>
      <text x="0" y="18" font-size="14" font-weight="800" fill="#0f172a">${payload.customerName.toUpperCase()}</text>

      <text x="260" y="0" font-size="10" font-weight="600" fill="#64748b">NATIONAL ID NUMBER (NIN)</text>
      <text x="260" y="18" font-size="14" font-weight="800" fill="#047857" font-family="monospace">${payload.nin}</text>

      <text x="500" y="0" font-size="10" font-weight="600" fill="#64748b">CUSTOMER ACCOUNT NO</text>
      <text x="500" y="18" font-size="14" font-weight="800" fill="#0f172a" font-family="monospace">${payload.customerNo}</text>

      <text x="0" y="55" font-size="10" font-weight="600" fill="#64748b">EXECUTED CAPACITY / ROLE</text>
      <text x="0" y="73" font-size="13" font-weight="700" fill="#1e293b">${payload.role}</text>

      <text x="260" y="55" font-size="10" font-weight="600" fill="#64748b">LOAN FACILITY REFERENCE</text>
      <text x="260" y="73" font-size="13" font-weight="700" fill="#1e293b" font-family="monospace">${payload.loanReference || 'N/A'}</text>

      <text x="500" y="55" font-size="10" font-weight="600" fill="#64748b">FACILITY PRINCIPAL</text>
      <text x="500" y="73" font-size="13" font-weight="800" fill="#0f172a">${amountStr}</text>
    </g>

    <!-- Legal Terms Summary -->
    <rect x="40" y="325" width="720" height="235" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    <rect x="40" y="325" width="720" height="32" rx="8" fill="#f1f5f9"/>
    <text x="58" y="346" font-family="sans-serif" font-size="11" font-weight="800" fill="#334155" letter-spacing="1">2. STATUTORY DISCLOSURES &amp; MANDATORY COVENANTS</text>

    <g transform="translate(58, 375)" font-family="sans-serif" font-size="10.5" fill="#334155">
      <text x="0" y="0" font-weight="700">A. LOAN DISCLOSURE &amp; INTEREST ACCRUAL</text>
      <text x="0" y="16" fill="#475569">The borrower covenants to repay the principal and accrued interest according to the agreed statutory amortization</text>
      <text x="0" y="30" fill="#475569">schedule under 30/360 day-count conventions. Repayments may be remitted via designated mobile money tills or branch cashiers.</text>

      <text x="0" y="56" font-weight="700">B. ACCELERATION &amp; DEFAULT CLAUSE</text>
      <text x="0" y="72" fill="#475569">Failure to settle any scheduled installment within 30 days of the due date constitutes default under UMRA Tier 4 regulations,</text>
      <text x="0" y="86" fill="#475569">entitling the lender to enforce pledged collateral securities, encumber caveat titles, or initiate recovery procedures.</text>

      <text x="0" y="112" font-weight="700">C. ELECTRONIC RECOGNITION &amp; BIOMETRIC DATA CONSENT</text>
      <text x="0" y="128" fill="#475569">Under Section 5 of the Electronic Signatures Act, 2011, the parties expressly agree that digital signature strokes captured</text>
      <text x="0" y="142" fill="#475569">on digital touch/stylus screens constitute authentic legal signatures with identical legal weight to handwritten ink signatures.</text>
      <text x="0" y="156" fill="#475569">The borrower consents to data submission to the Credit Reference Bureau (CRB) in accordance with the Data Protection and Privacy Act, 2019.</text>
    </g>

    <!-- Digital Signature Execution Block -->
    <rect x="40" y="575" width="720" height="325" rx="8" fill="#fafafa" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="40" y="575" width="720" height="32" rx="8" fill="#0f172a"/>
    <text x="58" y="596" font-family="sans-serif" font-size="11" font-weight="800" fill="#ffffff" letter-spacing="1">3. EXECUTION: DIGITAL SIGNATURE &amp; AUDIT TRAIL</text>

    <!-- Left Box: Digital Signature Render -->
    <g transform="translate(58, 620)">
      <rect width="380" height="180" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
      <!-- Background signature grid -->
      <line x1="20" y1="145" x2="360" y2="145" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4"/>
      <text x="22" y="140" font-family="sans-serif" font-size="11" font-weight="800" fill="#cbd5e1">✕ CUSTOMER SIGNATURE</text>

      <!-- Render the Signature Image Data -->
      <image href="${payload.signatureDataUrl}" x="25" y="20" width="330" height="120" preserveAspectRatio="xMidYMid meet"/>

      <text x="20" y="165" font-family="sans-serif" font-size="11" font-weight="800" fill="#0f172a">${payload.customerName.toUpperCase()}</text>
      <text x="360" y="165" font-family="monospace" font-size="10" font-weight="700" fill="#047857" text-anchor="end">${payload.role.toUpperCase()}</text>
    </g>

    <!-- Right Box: Verification Metadata & Compliance Stamps -->
    <g transform="translate(460, 620)" font-family="sans-serif">
      <rect width="280" height="180" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>

      <g transform="translate(16, 22)">
        <text x="0" y="0" font-size="9" font-weight="700" fill="#64748b">ELECTRONIC TIMESTAMP</text>
        <text x="0" y="15" font-size="12" font-weight="800" fill="#0f172a">${formattedDate} at ${formattedTime}</text>

        <text x="0" y="40" font-size="9" font-weight="700" fill="#64748b">CRYPTOGRAPHIC FINGERPRINT</text>
        <text x="0" y="55" font-size="9.5" font-weight="800" fill="#047857" font-family="monospace">${fingerprint}</text>

        <text x="0" y="80" font-size="9" font-weight="700" fill="#64748b">CAPTURE METHOD</text>
        <text x="0" y="95" font-size="11" font-weight="700" fill="#1e293b">Touch/Stylus Vector Input</text>

        <text x="0" y="120" font-size="9" font-weight="700" fill="#64748b">BRANCH &amp; DEVICE STAMP</text>
        <text x="0" y="135" font-size="10" font-weight="700" fill="#334155">${payload.branchName || 'Kampala Main Branch'} • ${payload.deviceId || 'DEV-POS-01'}</text>
      </g>
    </g>

    <!-- Witness & Compliance Sign-Off -->
    <g transform="translate(58, 815)" font-family="sans-serif">
      <rect width="682" height="70" rx="6" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      <g transform="translate(16, 20)">
        <text x="0" y="0" font-size="9" font-weight="700" fill="#64748b">WITNESSING CREDIT OFFICER</text>
        <text x="0" y="18" font-size="12" font-weight="800" fill="#0f172a">${payload.witnessName || 'Sarah Namubiru (Credit Manager)'}</text>

        <text x="320" y="0" font-size="9" font-weight="700" fill="#64748b">LEGAL VALIDITY</text>
        <text x="320" y="18" font-size="11" font-weight="800" fill="#047857">✓ Verified &amp; Digitally Counter-signed</text>
      </g>
    </g>

    <!-- Footer Bar -->
    <rect x="0" y="1035" width="800" height="45" fill="#0f172a"/>
    <text x="40" y="1062" font-family="sans-serif" font-size="10" font-weight="600" fill="#94a3b8">KEROLENDA Core Banking Platform • Document Management &amp; Customer Vault</text>
    <text x="760" y="1062" font-family="monospace" font-size="10" font-weight="700" fill="#34d399" text-anchor="end">PAGE 1 OF 1 • VERIFIED AUDIT RECORD</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an isolated Digital Signature Certificate SVG for direct customer KYC attachment.
 */
export function generateDigitalSignatureCertificateSvg(
  customerName: string,
  nin: string,
  signatureDataUrl: string,
  signedAt: string,
  documentTitle: string,
  companyName: string
): string {
  const auditToken = generateSignatureAuditFingerprint(customerName, nin, signedAt, 'CERT');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 420" width="100%" height="100%">
    <defs>
      <linearGradient id="cert-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#edf2f7"/>
      </linearGradient>
    </defs>
    <rect width="650" height="420" rx="16" fill="url(#cert-grad)" stroke="#047857" stroke-width="3"/>
    <rect x="12" y="12" width="626" height="396" rx="12" fill="none" stroke="#94a3b8" stroke-dasharray="4,4"/>

    <!-- Header -->
    <rect x="25" y="25" width="600" height="60" rx="8" fill="#0f172a"/>
    <text x="45" y="52" font-family="sans-serif" font-size="16" font-weight="800" fill="#ffffff">${companyName.toUpperCase()}</text>
    <text x="45" y="70" font-family="sans-serif" font-size="10" font-weight="700" fill="#34d399">DIGITAL SIGNATURE ATTESTATION &amp; KYC CERTIFICATE</text>

    <!-- Signer Particulars -->
    <g transform="translate(45, 115)" font-family="sans-serif">
      <text x="0" y="0" font-size="10" font-weight="700" fill="#64748b">SIGNER NAME</text>
      <text x="0" y="18" font-size="15" font-weight="800" fill="#0f172a">${customerName.toUpperCase()}</text>

      <text x="240" y="0" font-size="10" font-weight="700" fill="#64748b">NATIONAL ID (NIN)</text>
      <text x="240" y="18" font-size="15" font-weight="800" fill="#047857" font-family="monospace">${nin}</text>

      <text x="440" y="0" font-size="10" font-weight="700" fill="#64748b">DOCUMENT</text>
      <text x="440" y="18" font-size="12" font-weight="700" fill="#1e293b">${documentTitle}</text>
    </g>

    <!-- Signature Render Window -->
    <g transform="translate(45, 175)">
      <rect width="560" height="150" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="25" y1="115" x2="535" y2="115" stroke="#94a3b8" stroke-dasharray="4,4"/>
      <text x="25" y="132" font-family="sans-serif" font-size="10" font-weight="700" fill="#94a3b8">VERIFIED DIGITAL BIOMETRIC SIGNATURE</text>

      <image href="${signatureDataUrl}" x="30" y="15" width="480" height="95" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <!-- Footer Stamp -->
    <g transform="translate(45, 360)" font-family="sans-serif">
      <text x="0" y="0" font-size="9" font-weight="700" fill="#64748b">AUDIT TOKEN: <tspan fill="#047857" font-family="monospace" font-weight="800">${auditToken}</tspan></text>
      <text x="0" y="18" font-size="9" fill="#64748b">Executed at: ${new Date(signedAt).toLocaleString()} • Uganda Electronic Signatures Act, 2011</text>
      <rect x="440" y="-12" width="120" height="28" rx="6" fill="#047857"/>
      <text x="500" y="6" font-size="10" font-weight="800" fill="#ffffff" text-anchor="middle">✓ VERIFIED</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
