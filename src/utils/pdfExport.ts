import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tenant, Branch, AppUser, Loan, Customer, SavingsAccount, ShareAccount, ChartAccount, JournalEntry } from '../types';
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

