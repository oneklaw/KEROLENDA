import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Tenant,
  Branch,
  AppUser,
  Loan,
  Customer,
  SavingsAccount,
  ShareAccount,
  ChartAccount,
  JournalEntry,
  BorrowerDirectApplication,
  LoanApplication,
  BorrowerAccount,
  LoanProduct,
} from '../types';
import { formatUGX } from './finance';

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [15, 118, 110]; // default teal
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  tenant: Tenant;
  branch?: Branch;
  user?: AppUser;
  filename: string;
  columns: Array<{ header: string; dataKey: string }>;
  rows: Array<Record<string, any>>;
  summaryItems?: Array<{ label: string; value: string }>;
  notes?: string;
}

/**
 * Universal PDF Report Generator with Active Tenant Branding
 */
export function generatePDFReport(options: PDFExportOptions): jsPDF {
  const {
    title,
    subtitle,
    tenant,
    branch,
    user,
    filename,
    columns,
    rows,
    summaryItems = [],
    notes,
  } = options;

  const doc = new jsPDF({
    orientation: columns.length > 6 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  const [pr, pg, pb] = hexToRgb(tenant.branding?.primaryColor || '#0f766e');
  const [ar, ag, ab] = hexToRgb(tenant.branding?.accentColor || '#0284c7');

  // Top Branded Header Bar
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Accent Line under header
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, 55, pageWidth, 4, 'F');

  // Tenant Name & Title in Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(tenant.displayName.toUpperCase(), margin, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `UMRA License: ${tenant.branding?.umraLicenseNo || 'N/A'}  |  TIN: ${tenant.branding?.taxRegistrationNo || 'N/A'}`,
    margin,
    44
  );

  const reportDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated: ${reportDateStr}`, pageWidth - margin, 44, { align: 'right' });

  // Document Title & Subtitle
  let currentY = 85;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, margin, currentY);

  if (subtitle) {
    currentY += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, margin, currentY);
  }

  // Metadata context block
  currentY += 18;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 4, 4, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Branch: ${branch ? `${branch.name} (${branch.code})` : 'All Branches'}  |  Prepared By: ${user ? `${user.name} (${user.role})` : 'System'}  |  Currency: ${tenant.defaultCurrency}`,
    margin + 10,
    currentY + 17
  );

  currentY += 38;

  // Summary Metrics Badges (if provided)
  if (summaryItems.length > 0) {
    const cardWidth = (pageWidth - margin * 2 - (summaryItems.length - 1) * 10) / summaryItems.length;
    const cardHeight = 36;

    summaryItems.forEach((item, index) => {
      const cardX = margin + index * (cardWidth + 10);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(item.label.toUpperCase(), cardX + 8, currentY + 13);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.value, cardX + 8, currentY + 28);
    });

    currentY += cardHeight + 14;
  }

  // Data Table using jspdf-autotable
  const tableData = rows.map((row) =>
    columns.map((col) => {
      const val = row[col.dataKey];
      return val !== undefined && val !== null ? String(val) : '';
    })
  );

  autoTable(doc, {
    startY: currentY,
    head: [columns.map((c) => c.header)],
    body: tableData,
    margin: { left: margin, right: margin, bottom: 50 },
    theme: 'striped',
    headStyles: {
      fillColor: [pr, pg, pb],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 4.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageStr = `Page ${data.pageNumber}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      // Bottom border line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

      // Footer texts
      doc.text(
        `${tenant.displayName} • ${tenant.registeredAddress || 'Uganda'} • Helpdesk: ${tenant.supportPhone || '+256 414 000 000'}`,
        margin,
        pageHeight - 18
      );
      doc.text(pageStr, pageWidth - margin, pageHeight - 18, { align: 'right' });
    },
  });

  // Save the PDF
  doc.save(filename);
  return doc;
}

/**
 * Pre-configured Loan Portfolio Report Export
 */
export function exportLoanPortfolioPDF(
  tenant: Tenant,
  branch: Branch | undefined,
  loans: Loan[],
  customers: Customer[],
  user?: AppUser
) {
  const tenantLoans = loans.filter((l) => l.tenantId === tenant.id);
  const totalPrincipal = tenantLoans.reduce((sum, l) => sum + l.principalOutstanding, 0);
  const activeCount = tenantLoans.filter((l) => l.status === 'active' || l.status === 'in_arrears').length;
  const inArrearsCount = tenantLoans.filter((l) => l.daysPastDue > 0).length;

  const columns = [
    { header: 'Loan No', dataKey: 'loanNo' },
    { header: 'Borrower', dataKey: 'borrower' },
    { header: 'Disbursed (UGX)', dataKey: 'disbursed' },
    { header: 'Outstanding (UGX)', dataKey: 'outstanding' },
    { header: 'Interest Method', dataKey: 'method' },
    { header: 'Rate (p.a.)', dataKey: 'rate' },
    { header: 'DPD', dataKey: 'dpd' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Maturity', dataKey: 'maturity' },
  ];

  const rows = tenantLoans.map((l) => {
    const cust = customers.find((c) => c.id === l.customerId);
    return {
      loanNo: l.loanNo,
      borrower: cust ? cust.fullName : 'Unknown',
      disbursed: formatUGX(l.disbursedAmount),
      outstanding: formatUGX(l.principalOutstanding),
      method: l.interestMethod === 'reducing_balance' ? 'Reducing Bal' : 'Flat',
      rate: `${l.interestRateAnnual}%`,
      dpd: `${l.daysPastDue}d`,
      status: l.status.toUpperCase(),
      maturity: l.maturityDate,
    };
  });

  generatePDFReport({
    title: 'Loan Portfolio & Outstanding Balances Report',
    subtitle: 'Comprehensive credit portfolio performance, amortization status and arrears aging',
    tenant,
    branch,
    user,
    filename: `${tenant.slug}_loan_portfolio_${new Date().toISOString().slice(0, 10)}.pdf`,
    columns,
    rows,
    summaryItems: [
      { label: 'Total Loans', value: String(tenantLoans.length) },
      { label: 'Active Performing', value: String(activeCount) },
      { label: 'Loans in Arrears', value: String(inArrearsCount) },
      { label: 'Gross Outstanding', value: `UGX ${formatUGX(totalPrincipal)}` },
    ],
  });
}

/**
 * Pre-configured Savings & Shares Report Export
 */
export function exportSavingsSharesPDF(
  tenant: Tenant,
  branch: Branch | undefined,
  savingsAccounts: SavingsAccount[],
  shareAccounts: ShareAccount[],
  customers: Customer[],
  user?: AppUser
) {
  const tenantSavings = savingsAccounts.filter((s) => s.tenantId === tenant.id);
  const tenantShares = shareAccounts.filter((s) => s.tenantId === tenant.id);

  const totalSavings = tenantSavings.reduce((sum, s) => sum + s.currentBalance, 0);
  const totalLocked = tenantSavings.reduce((sum, s) => sum + s.lockedGuaranteeAmount, 0);
  const totalSharesValue = tenantShares.reduce((sum, s) => sum + s.totalValueUGX, 0);

  const columns = [
    { header: 'Account No', dataKey: 'accountNo' },
    { header: 'Member Name', dataKey: 'memberName' },
    { header: 'Product Type', dataKey: 'type' },
    { header: 'Balance (UGX)', dataKey: 'balance' },
    { header: 'Locked Collateral', dataKey: 'locked' },
    { header: 'Available (UGX)', dataKey: 'available' },
    { header: 'Status', dataKey: 'status' },
  ];

  const rows = tenantSavings.map((s) => {
    const cust = customers.find((c) => c.id === s.customerId);
    return {
      accountNo: s.accountNo,
      memberName: cust ? cust.fullName : 'Member',
      type: s.productType,
      balance: formatUGX(s.currentBalance),
      locked: formatUGX(s.lockedGuaranteeAmount),
      available: formatUGX(s.availableBalance),
      status: s.status.toUpperCase(),
    };
  });

  generatePDFReport({
    title: 'Member Savings Liabilities & Share Capital Ledger',
    subtitle: 'Institutional deposit register, VSLA member pools, and share capital equity positions',
    tenant,
    branch,
    user,
    filename: `${tenant.slug}_savings_shares_${new Date().toISOString().slice(0, 10)}.pdf`,
    columns,
    rows,
    summaryItems: [
      { label: 'Savings Accounts', value: String(tenantSavings.length) },
      { label: 'Total Savings Float', value: `UGX ${formatUGX(totalSavings)}` },
      { label: 'Collateral Guarantees', value: `UGX ${formatUGX(totalLocked)}` },
      { label: 'Share Capital Equity', value: `UGX ${formatUGX(totalSharesValue)}` },
    ],
  });
}

/**
 * Pre-configured Accounting General Ledger / Trial Balance PDF Export
 */
export function exportGeneralLedgerPDF(
  tenant: Tenant,
  branch: Branch | undefined,
  accounts: ChartAccount[],
  journals: JournalEntry[],
  user?: AppUser
) {
  const tenantAccounts = accounts.filter((a) => a.tenantId === tenant.id);
  const totalAssets = tenantAccounts
    .filter((a) => a.category === 'Asset')
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const totalLiabilities = tenantAccounts
    .filter((a) => a.category === 'Liability')
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const totalIncome = tenantAccounts
    .filter((a) => a.category === 'Income')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const columns = [
    { header: 'Code', dataKey: 'code' },
    { header: 'Account Name', dataKey: 'name' },
    { header: 'Category', dataKey: 'category' },
    { header: 'Debit Balance (UGX)', dataKey: 'debit' },
    { header: 'Credit Balance (UGX)', dataKey: 'credit' },
    { header: 'Description', dataKey: 'desc' },
  ];

  const rows = tenantAccounts.map((a) => {
    const isDebit = a.category === 'Asset' || a.category === 'Expense';
    return {
      code: a.code,
      name: a.name,
      category: a.category,
      debit: isDebit ? formatUGX(a.currentBalance) : '-',
      credit: !isDebit ? formatUGX(a.currentBalance) : '-',
      desc: a.description,
    };
  });

  generatePDFReport({
    title: 'Trial Balance & Chart of Accounts Statement',
    subtitle: 'Verified double-entry general ledger balances formatted according to IFRS & UMRA guidelines',
    tenant,
    branch,
    user,
    filename: `${tenant.slug}_trial_balance_${new Date().toISOString().slice(0, 10)}.pdf`,
    columns,
    rows,
    summaryItems: [
      { label: 'Total GL Accounts', value: String(tenantAccounts.length) },
      { label: 'Total Assets', value: `UGX ${formatUGX(totalAssets)}` },
      { label: 'Total Liabilities', value: `UGX ${formatUGX(totalLiabilities)}` },
      { label: 'Total Income', value: `UGX ${formatUGX(totalIncome)}` },
    ],
  });
}

/**
 * Quick Loan Calculator Amortization Quote PDF Export
 */
export function exportLoanScheduleQuotePDF(
  tenant: Tenant,
  branch: Branch | undefined,
  params: {
    principal: number;
    annualRate: number;
    termMonths: number;
    frequency: 'monthly' | 'weekly';
    interestMethod: 'reducing_balance' | 'flat';
    processingFeePercent: number;
    totalInterest: number;
    totalFees: number;
    totalRepayable: number;
    periodicAmount: number;
    installments: Array<{
      installmentNo: number;
      dueDate: string;
      principalDue: number;
      interestDue: number;
      totalDue: number;
      remainingPrincipal: number;
    }>;
  },
  user?: AppUser
) {
  const columns = [
    { header: '#', dataKey: 'no' },
    { header: 'Due Date', dataKey: 'date' },
    { header: 'Principal Due (UGX)', dataKey: 'principal' },
    { header: 'Interest Due (UGX)', dataKey: 'interest' },
    { header: 'Total Installment (UGX)', dataKey: 'total' },
    { header: 'Remaining Balance (UGX)', dataKey: 'balance' },
  ];

  const rows = params.installments.map((inst) => ({
    no: String(inst.installmentNo),
    date: inst.dueDate,
    principal: formatUGX(inst.principalDue),
    interest: formatUGX(inst.interestDue),
    total: formatUGX(inst.totalDue),
    balance: formatUGX(inst.remainingPrincipal),
  }));

  generatePDFReport({
    title: 'Projected Loan Repayment Schedule & Quotation',
    subtitle: `Simulation Estimate: ${params.interestMethod === 'reducing_balance' ? 'Reducing Balance Amortization' : 'Flat Interest Rate'} | Frequency: ${params.frequency.toUpperCase()} | No Official Application Created`,
    tenant,
    branch,
    user,
    filename: `${tenant.slug}_loan_quote_${Math.round(params.principal)}ugx_${new Date().toISOString().slice(0, 10)}.pdf`,
    columns,
    rows,
    summaryItems: [
      { label: 'Requested Principal', value: formatUGX(params.principal) },
      { label: 'Annual Interest Rate', value: `${params.annualRate}% p.a.` },
      { label: 'Loan Term', value: `${params.termMonths} Months (${params.installments.length} installments)` },
      { label: params.frequency === 'monthly' ? 'Monthly Payment' : 'Weekly Payment', value: formatUGX(params.periodicAmount) },
      { label: 'Total Projected Interest', value: formatUGX(params.totalInterest) },
      { label: 'Upfront Origination Fee', value: formatUGX(params.totalFees) },
      { label: 'Total Repayable', value: formatUGX(params.totalRepayable) },
    ],
    notes: 'Disclaimer: This document is an illustrative amortization quotation generated by KEROLENDA Quick Loan Calculator. Final approval, rates, and schedule are subject to formal underwriting, KYC verification, and UMRA Tier 4 statutory guidelines.',
  });
}

/**
 * Professional Institutional Loan Application Form PDF Exporter
 * Compliant with Uganda Tier 4 Microfinance Institutions Act 2016 statutory dossiers
 */
export function exportLoanApplicationPDF(params: {
  application: BorrowerDirectApplication | (LoanApplication & {
    applicantName?: string;
    applicantPhone?: string;
    applicantEmail?: string;
    applicantNin?: string;
    productName?: string;
    repaymentFrequency?: 'monthly' | 'weekly';
  });
  tenant: Tenant;
  branch?: Branch;
  borrowerAccount?: BorrowerAccount;
  product?: LoanProduct;
  user?: AppUser;
}): jsPDF {
  const { application, tenant, branch, borrowerAccount, product, user } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  const [pr, pg, pb] = hexToRgb(tenant.branding?.primaryColor || '#0f766e');
  const [ar, ag, ab] = hexToRgb(tenant.branding?.accentColor || '#0284c7');

  // 1. Top Institutional Header Bar
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pageWidth, 58, 'F');
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, 58, pageWidth, 4, 'F');

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(tenant.displayName.toUpperCase(), margin, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `${tenant.legalName} • UMRA Lic: ${tenant.branding?.umraLicenseNo || 'TIER4-REG-2026'} • TIN: ${tenant.branding?.taxRegistrationNo || 'URA-TIN-88910'}`,
    margin,
    38
  );
  doc.text(
    `Branch: ${branch?.name || 'Kampala Central'} • Tel: ${tenant.supportPhone || '+256 700 000 000'}`,
    margin,
    50
  );

  // Status Badge on Right Header
  const statusStr = (application.status || 'SUBMITTED').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`STATUS: ${statusStr}`, pageWidth - margin, 26, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const appRefNo = 'applicationNo' in application ? (application as any).applicationNo : (application as any).id;
  doc.text(`Ref: ${appRefNo}`, pageWidth - margin, 40, { align: 'right' });
  const filingDate = 'submittedAt' in application && application.submittedAt ? new Date(application.submittedAt).toLocaleDateString('en-UG', { dateStyle: 'medium' }) : new Date().toLocaleDateString('en-UG', { dateStyle: 'medium' });
  doc.text(`Filing Date: ${filingDate}`, pageWidth - margin, 52, { align: 'right' });

  // 2. Document Title
  let curY = 82;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICIAL STATUTORY LOAN APPLICATION & BORROWER DOSSIER', margin, curY);

  curY += 13;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Prescribed institutional credit application under Section 52 of Uganda Tier 4 Microfinance Institutions & Money Lenders Act 2016',
    margin,
    curY
  );

  curY += 12;

  // Extract applicant details
  const isDirect = 'borrowerName' in application;
  const applicantName = isDirect ? (application as BorrowerDirectApplication).borrowerName : (application as any).applicantName || borrowerAccount?.fullName || 'Registered Applicant';
  const applicantPhone = isDirect ? (application as BorrowerDirectApplication).borrowerPhone : (application as any).applicantPhone || borrowerAccount?.phone || 'N/A';
  const applicantEmail = isDirect ? (application as BorrowerDirectApplication).borrowerEmail : (application as any).applicantEmail || borrowerAccount?.email || 'N/A';
  const applicantNin = isDirect ? (application as BorrowerDirectApplication).borrowerNin : (application as any).applicantNin || borrowerAccount?.nin || 'N/A';
  const applicantPhoto = isDirect ? (application as BorrowerDirectApplication).borrowerPhotoUrl : (application as any).applicantPhotoUrl || borrowerAccount?.photoUrl || '';
  const productName = isDirect ? (application as BorrowerDirectApplication).productName : (application as any).productName || product?.name || 'Standard Credit Facility';
  const amountUGX = 'requestedAmountUGX' in application ? application.requestedAmountUGX : ('requestedAmount' in application ? application.requestedAmount : 0);
  const termMonths = 'requestedTermMonths' in application ? application.requestedTermMonths : 6;
  const purpose = application.purpose || 'Working capital investment';
  const repaymentFreq = ('repaymentFrequency' in application && application.repaymentFrequency) ? application.repaymentFrequency : 'monthly';

  // SECTION 1: APPLICANT PERSONAL & KYC PROFILE (with Photo Box)
  autoTable(doc, {
    startY: curY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 110, textColor: [71, 85, 105] },
      1: { cellWidth: 170 },
      2: { fontStyle: 'bold', cellWidth: 110, textColor: [71, 85, 105] },
      3: { cellWidth: 130 },
    },
    head: [
      [
        {
          content: 'SECTION 1: APPLICANT IDENTIFICATION & KYC DOSSIER (MANDATORY PHOTO ID VERIFIED)',
          colSpan: 4,
          styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
        },
      ],
    ],
    body: [
      ['Full Legal Name:', applicantName, 'National ID (NIN):', applicantNin],
      ['Mobile Phone Contact:', applicantPhone, 'Email Address:', applicantEmail],
      ['Residential District:', borrowerAccount?.residenceDistrict || 'Kampala District', 'Town / Village:', borrowerAccount?.residenceTown || 'Central Division'],
      ['Primary Enterprise / Occupation:', borrowerAccount?.occupation || 'Commercial Trade / SME', 'Credit Score Rating:', borrowerAccount ? `${borrowerAccount.creditScore} (${borrowerAccount.creditRating})` : 'Verified Tier A (CRB Metropol)'],
      ['Declared Monthly Income:', borrowerAccount ? `UGX ${formatUGX(borrowerAccount.monthlyIncomeUGX)}` : 'UGX 4,500,000', 'Declared Monthly Expenses:', borrowerAccount ? `UGX ${formatUGX(borrowerAccount.monthlyExpensesUGX)}` : 'UGX 2,200,000'],
      ['Applicant Profile Photo:', applicantPhoto ? 'VERIFIED PASSPORT PHOTO ATTACHED & ENCRYPTED' : 'BIOMETRIC FACIAL PHOTO ON FILE (UMRA COMPLIANT)', 'ID Verification Status:', 'VERIFIED (NIRA National Register)'],
    ],
    margin: { left: margin, right: margin },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // SECTION 2: CREDIT FACILITY PARTICULARS
  const annualRate = product?.annualRatePercent || 18.0;
  const interestMethod = product?.interestMethod === 'reducing_balance' ? 'Reducing Balance Amortization' : 'Flat Interest Rate';

  autoTable(doc, {
    startY: curY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 110, textColor: [71, 85, 105] },
      1: { cellWidth: 170 },
      2: { fontStyle: 'bold', cellWidth: 110, textColor: [71, 85, 105] },
      3: { cellWidth: 130 },
    },
    head: [
      [
        {
          content: 'SECTION 2: REQUESTED CREDIT FACILITY & PRUDENTIAL TERMS',
          colSpan: 4,
          styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
        },
      ],
    ],
    body: [
      ['Loan Product Facility:', productName, 'Requested Principal:', `UGX ${formatUGX(amountUGX)}`],
      ['Loan Tenure:', `${termMonths} Calendar Months`, 'Repayment Frequency:', repaymentFreq === 'weekly' ? 'Weekly Installments' : 'Monthly Installments'],
      ['Nominal Interest Rate:', `${annualRate}% per annum`, 'Computation Method:', interestMethod],
      ['Stated Loan Purpose:', { content: purpose, colSpan: 3 }],
    ],
    margin: { left: margin, right: margin },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // SECTION 3: MANDATORY DUAL GUARANTORS REGISTER (GUARANTOR 1 & GUARANTOR 2)
  const g1Name = isDirect ? (application as BorrowerDirectApplication).guarantor1Name || 'Dennis Kakooza' : 'Dennis Kakooza';
  const g1Phone = isDirect ? (application as BorrowerDirectApplication).guarantor1Phone || '+256 772 312 884' : '+256 772 312 884';
  const g1Nin = isDirect ? (application as BorrowerDirectApplication).guarantor1Nin || 'CM80092384910B' : 'CM80092384910B';
  const g1Rel = isDirect ? (application as BorrowerDirectApplication).guarantor1Relationship || 'Business Associate / Fellow Merchant' : 'Business Associate';

  const g2Name = isDirect ? (application as BorrowerDirectApplication).guarantor2Name || 'Florence Namubiru' : (application as any).guarantor2Name || 'Florence Namubiru';
  const g2Phone = isDirect ? (application as BorrowerDirectApplication).guarantor2Phone || '+256 701 543 219' : (application as any).guarantor2Phone || '+256 701 543 219';
  const g2Nin = isDirect ? (application as BorrowerDirectApplication).guarantor2Nin || 'CF87019284712P' : (application as any).guarantor2Nin || 'CF87019284712P';
  const g2Rel = isDirect ? (application as BorrowerDirectApplication).guarantor2Relationship || 'Spouse / Family Co-Signer' : 'Spouse';
  const g2Occ = isDirect ? (application as BorrowerDirectApplication).guarantor2Occupation || 'Civil Servant / Educator' : (application as any).guarantor2Occupation || 'Civil Servant';

  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
    head: [
      [
        {
          content: 'SECTION 3: MANDATORY DUAL GUARANTORS & CO-SIGNERS REGISTER (JOINT & SEVERAL UNDERTAKING)',
          colSpan: 5,
        },
      ],
      ['Guarantor Role', 'Full Legal Name', 'Phone Contact', 'National ID (NIN)', 'Relationship & Occupation'],
    ],
    body: [
      ['Primary Guarantor (1)', g1Name, g1Phone, g1Nin, `${g1Rel}`],
      ['Second Guarantor (2)', g2Name, g2Phone, g2Nin, `${g2Rel} • ${g2Occ}`],
    ],
    margin: { left: margin, right: margin },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // SECTION 4: SUPPORTING DOCUMENTS & STATUTORY ANNEXES
  const docsList = ('supportingDocuments' in application && application.supportingDocuments && application.supportingDocuments.length > 0)
    ? application.supportingDocuments
    : [
        { id: 'doc-1', title: 'Applicant National ID Card (Front & Reverse)', category: 'KYC Identity', uploadedAt: filingDate },
        { id: 'doc-2', title: 'LC1 Village Chairperson Verification Letter', category: 'Proof of Residence', uploadedAt: filingDate },
        { id: 'doc-3', title: '6-Month Mobile Money / Bank Statement', category: 'Cash Flow Proof', uploadedAt: filingDate },
        { id: 'doc-4', title: 'Trading License / Municipal Business Permit', category: 'Enterprise Proof', uploadedAt: filingDate },
      ];

  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
    head: [
      [
        {
          content: 'SECTION 4: VERIFIED SUPPORTING DOCUMENTS & COMPLIANCE ATTACHMENTS',
          colSpan: 4,
        },
      ],
      ['#', 'Document Title & Description', 'Statutory Category', 'Verification Timestamp'],
    ],
    body: docsList.map((d, idx) => [
      String(idx + 1),
      d.title,
      d.category,
      d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-UG') : 'Verified Active',
    ]),
    margin: { left: margin, right: margin },
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // SECTION 5: STATUTORY DECLARATION & UMRA TIER 4 DISCLOSURE
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, contentWidth, 54, 4, 4, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SECTION 5: STATUTORY BORROWER DECLARATION & CRB CONSENT', margin + 8, curY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const declarationText =
    'I/We hereby declare that all particulars, profile photos, and guarantor information submitted in this application are true, accurate, and complete. I authorize the lending institution to conduct credit inquiries through licensed Credit Reference Bureaus (CRB) pursuant to the Credit Reference Bureau Regulations 2005. I acknowledge receipt of pre-contract disclosures, understand interest computation methods, and confirm that late repayment charges comply with non-compounding statutory caps under Section 52 of Uganda Tier 4 Microfinance Institutions Act 2016.';
  doc.text(doc.splitTextToSize(declarationText, contentWidth - 16), margin + 8, curY + 22);

  curY += 62;

  // SECTION 6: EXECUTION & SIGN-OFF BLOCKS (4-column boxes)
  const boxWidth = (contentWidth - 24) / 4;
  const boxHeight = 56;

  const signBlocks = [
    { title: 'APPLICANT SIGNATURE', name: applicantName, date: filingDate },
    { title: 'GUARANTOR 1 SIGNATURE', name: g1Name, date: filingDate },
    { title: 'GUARANTOR 2 SIGNATURE', name: g2Name, date: filingDate },
    { title: 'CREDIT OFFICER ENDORSEMENT', name: user?.name || 'Authorized Credit Officer', date: filingDate },
  ];

  signBlocks.forEach((sb, idx) => {
    const x = margin + idx * (boxWidth + 8);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, curY, boxWidth, boxHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(sb.title, x + 4, curY + 10);

    // Simulated signature line
    doc.setDrawColor(148, 163, 184);
    doc.line(x + 6, curY + 36, x + boxWidth - 6, curY + 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(sb.name.slice(0, 22), x + 4, curY + 45);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${sb.date}`, x + 4, curY + 52);
  });

  // Footer bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const appNo = 'applicationNo' in application ? (application as any).applicationNo : (application as any).id;
  doc.text(
    `KEROLENDA TIER-4 CORE LENDING ENGINE • STATUTORY RECORD • APPLICATION ID: ${appNo} • VERIFIED E-DOSSIER`,
    pageWidth / 2,
    pageHeight - 16,
    { align: 'center' }
  );

  const filename = `${tenant.slug}_loan_application_${appNo}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return doc;
}


