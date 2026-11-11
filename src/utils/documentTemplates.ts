/**
 * Document Template Generators for Ugandan Microfinance KYC & Collateral Records
 * Produces crisp, realistic SVG data URIs for IDs, land titles, logbooks, and security agreements.
 */

export function generateNationalIdFrontSvg(name: string, nin: string, dob: string, gender: string, expiry: string = '2034-08-20'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" width="100%" height="100%">
    <defs>
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fff8eb"/>
        <stop offset="50%" stop-color="#fdf3dc"/>
        <stop offset="100%" stop-color="#faecc8"/>
      </linearGradient>
      <pattern id="guilloche" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 0 15 Q 7.5 0, 15 15 T 30 15" fill="none" stroke="#d5b882" stroke-width="0.5" opacity="0.35"/>
        <path d="M 0 15 Q 7.5 30, 15 15 T 30 15" fill="none" stroke="#bfa063" stroke-width="0.5" opacity="0.35"/>
      </pattern>
    </defs>
    <!-- Background Card -->
    <rect width="600" height="380" rx="20" fill="url(#bg-grad)" stroke="#c29c51" stroke-width="3"/>
    <rect width="600" height="380" rx="20" fill="url(#guilloche)"/>

    <!-- National Header Stripe -->
    <rect x="0" y="0" width="600" height="72" rx="20" fill="#0f172a"/>
    <rect x="0" y="52" width="600" height="20" fill="#dc2626"/>
    <rect x="0" y="60" width="600" height="12" fill="#eab308"/>

    <!-- Uganda Coat of Arms Sim / Crest -->
    <circle cx="54" cy="36" r="22" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
    <text x="54" y="42" font-family="sans-serif" font-size="18" font-weight="900" fill="#854d0e" text-anchor="middle">UG</text>

    <!-- Header Titles -->
    <text x="90" y="28" font-family="sans-serif" font-size="18" font-weight="900" fill="#ffffff" letter-spacing="1">THE REPUBLIC OF UGANDA</text>
    <text x="90" y="46" font-family="sans-serif" font-size="11" font-weight="700" fill="#cbd5e1" letter-spacing="2">NATIONAL IDENTIFICATION CARD • NIRA</text>

    <!-- Photo Frame -->
    <g transform="translate(36, 96)">
      <rect width="130" height="165" rx="10" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
      <!-- Portrait silhouette -->
      <circle cx="65" cy="62" r="34" fill="#64748b"/>
      <path d="M 25 150 C 25 105, 105 105, 105 150 Z" fill="#64748b"/>
      <rect x="10" y="140" width="110" height="16" rx="4" fill="#0f172a" opacity="0.75"/>
      <text x="65" y="152" font-family="sans-serif" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">SECURE BIOMETRIC</text>
    </g>

    <!-- Data Fields -->
    <g transform="translate(186, 92)" font-family="sans-serif">
      <text x="0" y="16" font-size="10" font-weight="700" fill="#64748b" letter-spacing="1">SURNAME / FIRST NAME</text>
      <text x="0" y="38" font-size="17" font-weight="800" fill="#0f172a">${name.toUpperCase()}</text>

      <text x="0" y="68" font-size="10" font-weight="700" fill="#64748b" letter-spacing="1">NATIONAL ID NUMBER (NIN)</text>
      <text x="0" y="90" font-size="16" font-weight="800" fill="#047857" font-family="monospace">${nin}</text>

      <g transform="translate(0, 114)">
        <text x="0" y="0" font-size="9" font-weight="700" fill="#64748b">DATE OF BIRTH</text>
        <text x="0" y="18" font-size="13" font-weight="700" fill="#1e293b">${dob}</text>

        <text x="140" y="0" font-size="9" font-weight="700" fill="#64748b">SEX</text>
        <text x="140" y="18" font-size="13" font-weight="700" fill="#1e293b">${gender.toUpperCase()}</text>

        <text x="240" y="0" font-size="9" font-weight="700" fill="#64748b">CARD NO.</text>
        <text x="240" y="18" font-size="12" font-weight="700" fill="#1e293b" font-family="monospace">009841284</text>
      </g>

      <g transform="translate(0, 154)">
        <text x="0" y="0" font-size="9" font-weight="700" fill="#64748b">NATIONALITY</text>
        <text x="0" y="16" font-size="12" font-weight="700" fill="#1e293b">UGANDAN</text>

        <text x="140" y="0" font-size="9" font-weight="700" fill="#64748b">DATE OF EXPIRY</text>
        <text x="140" y="16" font-size="12" font-weight="700" fill="#b91c1c">${expiry}</text>
      </g>
    </g>

    <!-- Ghost Chip / Hologram sim -->
    <g transform="translate(515, 95)">
      <circle cx="25" cy="25" r="24" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5" opacity="0.85"/>
      <path d="M 12 25 L 38 25 M 25 12 L 25 38" stroke="#ca8a04" stroke-width="1.5"/>
      <text x="25" y="28" font-family="sans-serif" font-size="7" font-weight="800" fill="#854d0e" text-anchor="middle">HOLOGRAM</text>
    </g>

    <!-- MRZ / Machine Readable Zone Bar -->
    <g transform="translate(36, 290)">
      <rect width="528" height="68" rx="6" fill="#0f172a"/>
      <text x="14" y="28" font-family="monospace" font-size="13" font-weight="700" fill="#38bdf8" letter-spacing="3">IDUGA${nin.replace(/[^A-Z0-9]/gi, '')}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</text>
      <text x="14" y="52" font-family="monospace" font-size="13" font-weight="700" fill="#38bdf8" letter-spacing="3">${name.replace(/\s+/g, '&lt;').toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateNationalIdBackSvg(nin: string, cardNo: string = '009841284'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" width="100%" height="100%">
    <rect width="600" height="380" rx="20" fill="#fdfbf7" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="0" y="30" width="600" height="50" fill="#1e293b"/>
    <g transform="translate(40, 105)" font-family="sans-serif">
      <text x="0" y="16" font-size="11" font-weight="700" fill="#64748b">PLACE OF ISSUE</text>
      <text x="0" y="34" font-size="13" font-weight="700" fill="#0f172a">KAMPALA DISTRICT - NIRA HEADQUARTERS</text>

      <text x="0" y="68" font-size="11" font-weight="700" fill="#64748b">SIGNATURE OF BEARER</text>
      <path d="M 0 95 Q 40 75, 80 90 T 160 85 T 220 95" fill="none" stroke="#1e3a8a" stroke-width="2.5"/>

      <text x="320" y="16" font-size="11" font-weight="700" fill="#64748b">CARD SERIAL NUMBER</text>
      <text x="320" y="34" font-size="14" font-weight="800" fill="#0f172a" font-family="monospace">${cardNo}</text>

      <text x="320" y="68" font-size="11" font-weight="700" fill="#64748b">NIN VERIFICATION HASH</text>
      <text x="320" y="86" font-size="12" font-weight="700" fill="#047857" font-family="monospace">SHA256: 4F9B..${nin.slice(-4)}</text>
    </g>
    <!-- Thumbprint sim -->
    <g transform="translate(470, 150)">
      <rect width="90" height="110" rx="8" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
      <ellipse cx="45" cy="55" rx="30" ry="42" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <ellipse cx="45" cy="55" rx="20" ry="28" fill="none" stroke="#475569" stroke-width="1.5"/>
      <ellipse cx="45" cy="55" rx="10" ry="14" fill="none" stroke="#475569" stroke-width="1.5"/>
      <text x="45" y="102" font-family="sans-serif" font-size="7" font-weight="700" fill="#64748b" text-anchor="middle">DIGITAL THUMBPRINT</text>
    </g>
    <!-- Barcode sim -->
    <g transform="translate(40, 275)">
      <rect width="520" height="75" rx="6" fill="#ffffff" stroke="#e2e8f0"/>
      <g transform="translate(20, 10)">
        ${Array.from({ length: 42 })
          .map((_, i) => `<rect x="${i * 11}" y="0" width="${i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1}" height="40" fill="#0f172a"/>`)
          .join('')}
      </g>
      <text x="240" y="64" font-family="monospace" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">*NIRA-UG-${nin.replace(/[^A-Z0-9]/gi, '')}*</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generatePassportPhotoSvg(name: string, bgGradient: string = '#38bdf8'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="100%" height="100%">
    <defs>
      <linearGradient id="photo-bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e0f2fe"/>
        <stop offset="100%" stop-color="#bae6fd"/>
      </linearGradient>
    </defs>
    <rect width="400" height="480" fill="url(#photo-bg)"/>
    <!-- Head & Shoulders Silhouette -->
    <ellipse cx="200" cy="180" rx="80" ry="105" fill="#475569"/>
    <!-- Neck -->
    <rect x="175" y="270" width="50" height="50" fill="#475569"/>
    <!-- Shirt / Suit -->
    <path d="M 60 480 C 70 330, 140 310, 200 310 C 260 310, 330 330, 340 480 Z" fill="#0f172a"/>
    <!-- Collar & Tie -->
    <path d="M 180 310 L 200 360 L 220 310 Z" fill="#ffffff"/>
    <path d="M 195 350 L 205 350 L 208 440 L 192 440 Z" fill="#dc2626"/>
    <!-- Watermark timestamp -->
    <rect x="20" y="430" width="360" height="32" rx="6" fill="#0f172a" opacity="0.8"/>
    <text x="200" y="451" font-family="sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">
      KYC VERIFIED BIOMETRIC • ${name.toUpperCase()}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateLandTitleSvg(plot: string, district: string, owner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
    <defs>
      <linearGradient id="parchment" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fefcf5"/>
        <stop offset="100%" stop-color="#f8f4e6"/>
      </linearGradient>
    </defs>
    <rect width="600" height="800" fill="url(#parchment)" stroke="#78350f" stroke-width="6"/>
    <rect x="15" y="15" width="570" height="770" fill="none" stroke="#b45309" stroke-width="1.5"/>

    <!-- Seal -->
    <circle cx="300" cy="90" r="42" fill="#fef3c7" stroke="#92400e" stroke-width="2.5"/>
    <text x="300" y="96" font-family="serif" font-size="14" font-weight="900" fill="#78350f" text-anchor="middle">UGANDA</text>

    <text x="300" y="160" font-family="serif" font-size="20" font-weight="900" fill="#78350f" text-anchor="middle" letter-spacing="2">
      CERTIFICATE OF TITLE
    </text>
    <text x="300" y="185" font-family="sans-serif" font-size="11" font-weight="700" fill="#92400e" text-anchor="middle" letter-spacing="1">
      MINISTRY OF LANDS, HOUSING &amp; URBAN DEVELOPMENT
    </text>
    <line x1="120" y1="200" x2="480" y2="200" stroke="#78350f" stroke-width="1.5"/>

    <!-- Document Particulars -->
    <g transform="translate(60, 230)" font-family="sans-serif">
      <text x="0" y="20" font-size="12" font-weight="700" fill="#64748b">FREEHOLD REGISTER</text>
      <text x="0" y="42" font-size="16" font-weight="800" fill="#0f172a">VOLUME 4821 • FOLIO 14</text>

      <text x="0" y="80" font-size="12" font-weight="700" fill="#64748b">PARCEL IDENTIFICATION / PLOT</text>
      <text x="0" y="102" font-size="16" font-weight="800" fill="#047857">${plot}</text>

      <text x="0" y="140" font-size="12" font-weight="700" fill="#64748b">DISTRICT / COUNTY / SUB-COUNTY</text>
      <text x="0" y="162" font-size="15" font-weight="700" fill="#0f172a">${district.toUpperCase()}, UGANDA</text>

      <text x="0" y="200" font-size="12" font-weight="700" fill="#64748b">REGISTERED PROPRIETOR</text>
      <text x="0" y="222" font-size="17" font-weight="800" fill="#0f172a">${owner.toUpperCase()}</text>

      <text x="0" y="260" font-size="12" font-weight="700" fill="#64748b">ENCUMBRANCE / MORTGAGE MEMORIAL</text>
      <rect x="0" y="275" width="480" height="90" rx="8" fill="#fef2f2" stroke="#f87171" stroke-width="1"/>
      <text x="16" y="305" font-size="12" font-weight="800" fill="#991b1b">REGISTERED EQUITABLE MORTGAGE LIEN</text>
      <text x="16" y="325" font-size="11" font-weight="600" fill="#7f1d1d">Mortgage registered in favour of Victoria Microfinance Ltd.</text>
      <text x="16" y="345" font-size="11" font-family="monospace" fill="#991b1b">Security for Loan Facility • Caveat Lodged No. KLA/CV/2026/894</text>
    </g>

    <!-- Cadastral Cadastre Sketch Sim -->
    <g transform="translate(180, 630)">
      <rect width="240" height="100" fill="#ffffff" stroke="#94a3b8" stroke-dasharray="4,4"/>
      <polygon points="20,80 80,20 200,30 220,85" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
      <text x="120" y="55" font-family="sans-serif" font-size="10" font-weight="800" fill="#0369a1" text-anchor="middle">PLOT DEED BOUNDARY</text>
    </g>

    <text x="300" y="765" font-family="sans-serif" font-size="9" font-weight="700" fill="#94a3b8" text-anchor="middle">
      COMMISSIONER OF LAND REGISTRATION • OFFICIAL SEALED AT KAMPALA
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateVehicleLogbookSvg(regNo: string, makeModel: string, owner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="100%" height="100%">
    <rect width="600" height="420" rx="16" fill="#f8fafc" stroke="#3b82f6" stroke-width="4"/>
    <rect x="0" y="0" width="600" height="70" rx="16" fill="#1e3a8a"/>
    <text x="30" y="34" font-family="sans-serif" font-size="16" font-weight="900" fill="#ffffff">UGANDA REVENUE AUTHORITY (URA)</text>
    <text x="30" y="52" font-family="sans-serif" font-size="11" font-weight="700" fill="#93c5fd">MOTOR VEHICLE REGISTRATION BOOK (LOGBOOK)</text>

    <!-- Reg Plate visual -->
    <g transform="translate(390, 16)">
      <rect width="180" height="42" rx="6" fill="#facc15" stroke="#000000" stroke-width="2"/>
      <text x="90" y="28" font-family="monospace" font-size="20" font-weight="900" fill="#000000" text-anchor="middle">${regNo}</text>
    </g>

    <g transform="translate(40, 100)" font-family="sans-serif">
      <text x="0" y="16" font-size="11" font-weight="700" fill="#64748b">REGISTERED OWNER</text>
      <text x="0" y="38" font-size="16" font-weight="800" fill="#0f172a">${owner.toUpperCase()}</text>

      <text x="0" y="74" font-size="11" font-weight="700" fill="#64748b">MAKE &amp; MODEL</text>
      <text x="0" y="96" font-size="15" font-weight="800" fill="#1e293b">${makeModel}</text>

      <text x="0" y="132" font-size="11" font-weight="700" fill="#64748b">CHASSIS / VIN NUMBER</text>
      <text x="0" y="152" font-size="14" font-weight="800" fill="#047857" font-family="monospace">MD2A23BY8N5${regNo.replace(/[^0-9]/g, '492')}</text>

      <text x="0" y="188" font-size="11" font-weight="700" fill="#64748b">SECURITY LIEN &amp; JOINT REGISTRATION</text>
      <rect x="0" y="200" width="520" height="60" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="16" y="224" font-size="12" font-weight="800" fill="#92400e">LOGBOOK HELD AS TIER 4 LOAN COLLATERAL</text>
      <text x="16" y="244" font-size="11" font-weight="600" fill="#78350f">Endorsed to Victoria Microfinance Ltd • Duplicate Key Deposited in Branch Safe</text>
    </g>

    <g transform="translate(40, 360)">
      <line x1="0" y1="0" x2="520" y2="0" stroke="#cbd5e1"/>
      <text x="0" y="20" font-family="sans-serif" font-size="9" font-weight="600" fill="#64748b">
        URA Licensing Department • Serial No: UG-LB-889410 • Verification Status: Clean Collateral
      </text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateTradingLicenseSvg(business: string, owner: string, authority: string = 'KCCA'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 460" width="100%" height="100%">
    <rect width="600" height="460" rx="14" fill="#ffffff" stroke="#059669" stroke-width="4"/>
    <rect x="0" y="0" width="600" height="75" fill="#065f46"/>
    <text x="300" y="32" font-family="sans-serif" font-size="17" font-weight="900" fill="#ffffff" text-anchor="middle">${authority} TRADING LICENSE</text>
    <text x="300" y="54" font-family="sans-serif" font-size="11" font-weight="700" fill="#a7f3d0" text-anchor="middle">THE TRADE (LICENSING) ACT • REVENUE COLLECTION DIVISION</text>

    <g transform="translate(50, 110)" font-family="sans-serif">
      <text x="0" y="16" font-size="11" font-weight="700" fill="#64748b">BUSINESS TRADING NAME</text>
      <text x="0" y="40" font-size="18" font-weight="800" fill="#0f172a">${business.toUpperCase()}</text>

      <text x="0" y="76" font-size="11" font-weight="700" fill="#64748b">PROPRIETOR / LICENSE HOLDER</text>
      <text x="0" y="98" font-size="15" font-weight="700" fill="#1e293b">${owner}</text>

      <text x="0" y="136" font-size="11" font-weight="700" fill="#64748b">LICENSE ASSESSMENT &amp; GRADE</text>
      <text x="0" y="156" font-size="14" font-weight="800" fill="#047857">Grade II Commercial Retail • Valid Through 31-DEC-2026</text>

      <rect x="0" y="180" width="500" height="60" rx="6" fill="#f0fdf4" stroke="#86efac"/>
      <text x="16" y="206" font-size="12" font-weight="800" fill="#166534">OFFICIAL TAX &amp; DUES RECEIPT ATTACHED</text>
      <text x="16" y="226" font-size="11" font-weight="600" fill="#15803d">Receipt No: KCCA-TL-2026-94812 • Verified in Good Standing</text>
    </g>

    <!-- Stamp -->
    <g transform="translate(430, 270)">
      <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6,3"/>
      <text x="50" y="46" font-family="sans-serif" font-size="10" font-weight="900" fill="#dc2626" text-anchor="middle">KCCA INSPECTED</text>
      <text x="50" y="62" font-family="sans-serif" font-size="9" font-weight="800" fill="#dc2626" text-anchor="middle">2026 PAID</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateGenericDocumentSvg(title: string, category: string, customerName: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500" width="100%" height="100%">
    <rect width="600" height="500" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="0" y="0" width="600" height="50" rx="12" fill="#334155"/>
    <text x="24" y="32" font-family="sans-serif" font-size="14" font-weight="800" fill="#ffffff">${category.toUpperCase().replace(/_/g, ' ')}</text>
    
    <g transform="translate(40, 90)" font-family="sans-serif">
      <text x="0" y="20" font-size="12" font-weight="700" fill="#64748b">DOCUMENT TITLE</text>
      <text x="0" y="44" font-size="18" font-weight="800" fill="#0f172a">${title}</text>

      <text x="0" y="84" font-size="12" font-weight="700" fill="#64748b">CUSTOMER PROFILE</text>
      <text x="0" y="106" font-size="15" font-weight="700" fill="#1e293b">${customerName}</text>

      <rect x="0" y="140" width="520" height="150" rx="8" fill="#ffffff" stroke="#e2e8f0"/>
      <text x="20" y="175" font-size="13" font-weight="700" fill="#334155">Legal Instrument &amp; Verification Details</text>
      <line x1="20" y1="190" x2="500" y2="190" stroke="#f1f5f9" stroke-width="2"/>
      <text x="20" y="215" font-size="11" fill="#64748b">• Scanned copy verified against physical copy presented at branch office.</text>
      <text x="20" y="235" font-size="11" fill="#64748b">• Archived in accordance with UMRA Tier 4 microfinance record retention rules.</text>
      <text x="20" y="255" font-size="11" fill="#64748b">• Certified by Credit &amp; Recovery Operations Division.</text>
    </g>

    <text x="300" y="470" font-family="monospace" font-size="10" font-weight="700" fill="#94a3b8" text-anchor="middle">
      SECURE DIGITAL ATTACHMENT • KEROLENDA SECURE KYC VAULT
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateProofOfIncomeSvg(
  customerName: string,
  monthlyIncome: number = 2500000,
  employerOrBusiness: string = 'Commercial Enterprise',
  period: string = 'Past 6 Months Bank & MoMo Statement'
): string {
  const formattedIncome = `UGX ${monthlyIncome.toLocaleString()}`;
  const netTakeHome = `UGX ${Math.round(monthlyIncome * 0.82).toLocaleString()}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="100%" height="100%">
    <rect width="600" height="520" rx="14" fill="#ffffff" stroke="#0284c7" stroke-width="3"/>
    
    <!-- Header Banner -->
    <rect x="0" y="0" width="600" height="72" rx="14" fill="#0369a1"/>
    <circle cx="48" cy="36" r="22" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
    <text x="48" y="42" font-family="sans-serif" font-size="14" font-weight="900" fill="#0369a1" text-anchor="middle">KYC</text>
    <text x="82" y="30" font-family="sans-serif" font-size="16" font-weight="900" fill="#ffffff">CERTIFIED PROOF OF INCOME &amp; CASH FLOW</text>
    <text x="82" y="48" font-family="sans-serif" font-size="11" font-weight="700" fill="#bae6fd">OFFICIAL SALARY &amp; TELECOM / BANK STATEMENT VOUCHER</text>

    <!-- Details Grid -->
    <g transform="translate(36, 92)" font-family="sans-serif">
      <rect width="528" height="74" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="16" y="22" font-size="10" font-weight="700" fill="#64748b">BENEFICIARY / BORROWER</text>
      <text x="16" y="44" font-size="16" font-weight="800" fill="#0f172a">${customerName.toUpperCase()}</text>
      <text x="16" y="62" font-size="11" font-weight="600" fill="#475569">Employer / Business: ${employerOrBusiness}</text>

      <text x="320" y="22" font-size="10" font-weight="700" fill="#64748b">VERIFICATION PERIOD</text>
      <text x="320" y="42" font-size="13" font-weight="700" fill="#0369a1">${period}</text>
      <text x="320" y="60" font-size="10" font-weight="600" fill="#16a34a">✓ Validated via Electronic Stamp</text>
    </g>

    <!-- Financial Breakdown Cards -->
    <g transform="translate(36, 180)" font-family="sans-serif">
      <rect x="0" y="0" width="254" height="68" rx="8" fill="#ecfdf5" stroke="#a7f3d0"/>
      <text x="16" y="24" font-size="11" font-weight="700" fill="#065f46">Gross Monthly Turnover / Salary</text>
      <text x="16" y="52" font-size="20" font-weight="900" fill="#047857">${formattedIncome}</text>

      <rect x="274" y="0" width="254" height="68" rx="8" fill="#f0f9ff" stroke="#bae6fd"/>
      <text x="16" y="24" font-size="11" font-weight="700" fill="#075985" transform="translate(274, 0)">Estimated Net Disposable Cash Flow</text>
      <text x="16" y="52" font-size="20" font-weight="900" fill="#0284c7" transform="translate(274, 0)">${netTakeHome}</text>
    </g>

    <!-- Cashflow Ledger Entries Simulation -->
    <g transform="translate(36, 264)" font-family="monospace">
      <rect width="528" height="150" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/>
      <text x="16" y="24" font-size="11" font-weight="800" fill="#1e293b">STAMPED TRANSACTION AUDIT STREAM (LAST 3 CYCLES)</text>
      <line x1="16" y1="34" x2="512" y2="34" stroke="#cbd5e1"/>
      
      <text x="16" y="56" font-size="10" fill="#334155">• 28-SEP-2026: DIRECT CR PAYMENT SALARY/SETTLEMENT: +${formattedIncome} [REF: CR-90142]</text>
      <text x="16" y="78" font-size="10" fill="#334155">• 28-AUG-2026: DIRECT CR PAYMENT SALARY/SETTLEMENT: +${formattedIncome} [REF: CR-81944]</text>
      <text x="16" y="100" font-size="10" fill="#334155">• 28-JUL-2026: DIRECT CR PAYMENT SALARY/SETTLEMENT: +${formattedIncome} [REF: CR-72019]</text>
      <text x="16" y="124" font-size="10" font-weight="700" fill="#0369a1">• AVG MONTHLY CASH VELOCITY: Consistent inflow meets UMRA affordability benchmarks</text>
    </g>

    <!-- Verification Seal -->
    <g transform="translate(380, 428)">
      <circle cx="50" cy="38" r="32" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="5,2"/>
      <text x="50" y="34" font-family="sans-serif" font-size="9" font-weight="900" fill="#0284c7" text-anchor="middle">VERIFIED</text>
      <text x="50" y="47" font-family="sans-serif" font-size="8" font-weight="800" fill="#0284c7" text-anchor="middle">KYC VAULT</text>
    </g>

    <text x="210" y="468" font-family="sans-serif" font-size="10" font-weight="700" fill="#64748b">
      CERTIFIED UNDER UMRA PRUDENTIAL CRITERIA
    </text>
    <text x="210" y="484" font-family="sans-serif" font-size="9" fill="#94a3b8">
      Electronic proof of income record stored securely in customer vault.
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
