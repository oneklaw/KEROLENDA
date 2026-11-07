import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Tenant,
  Branch,
  AppUser,
  JournalEntry,
  ChartAccount,
  RecoveryCase,
  Loan,
  Customer,
  AuditEvent,
} from '../types';
import { formatUGX, formatCompactUGX } from './finance';

/**
 * Escapes a single CSV value according to RFC 4180
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an RFC 4180 compliant CSV string from columns and row data
 */
export function generateCSVString(
  columns: Array<{ header: string; dataKey: string }>,
  rows: Array<Record<string, unknown>>
): string {
  const headerLine = columns.map((col) => escapeCSVValue(col.header)).join(',');
  const rowLines = rows.map((row) =>
    columns.map((col) => escapeCSVValue(row[col.dataKey])).join(',')
  );
  // UTF-8 BOM helps Excel render special characters correctly
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Client-side browser file download trigger for CSV
 */
export function triggerFileDownload(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// ACCOUNTING TRANSACTION LOGS EXPORT HELPERS
// ---------------------------------------------------------------------------

export interface AccountingTransactionFilterOptions {
  searchQuery?: string;
  sourceType?: string; // 'all' or specific sourceType
  accountCode?: string; // 'all' or specific accountCode
  dateRange?: 'all' | 'today' | '7days' | '30days' | 'this_month';
  referenceDate?: string; // ISO date for testing, defaults to now
}

export interface FlattenedTransactionRow {
  journalNo: string;
  effectiveDate: string;
  sourceType: string;
  sourceReference: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  debitFormatted: string;
  creditFormatted: string;
  lineDescription: string;
  journalDescription: string;
  postedBy: string;
  isBalanced: string;
}

/**
 * Filters journal entries based on criteria
 */
export function filterJournalEntries(
  journals: JournalEntry[],
  filters: AccountingTransactionFilterOptions
): JournalEntry[] {
  const { searchQuery = '', sourceType = 'all', accountCode = 'all', dateRange = 'all', referenceDate } = filters;
  const now = referenceDate ? new Date(referenceDate) : new Date();

  return journals.filter((journal) => {
    // 1. Source type filter
    if (sourceType !== 'all' && journal.sourceType !== sourceType) {
      return false;
    }

    // 2. Account code filter (at least one line must touch this account)
    if (accountCode !== 'all') {
      const hasAccount = journal.lines.some((l) => l.accountCode === accountCode);
      if (!hasAccount) return false;
    }

    // 3. Date range filter
    if (dateRange !== 'all') {
      const jDate = new Date(journal.effectiveDate);
      if (dateRange === 'today') {
        if (jDate.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10)) {
          return false;
        }
      } else if (dateRange === '7days') {
        const diffMs = now.getTime() - jDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (dateRange === '30days') {
        const diffMs = now.getTime() - jDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 30) return false;
      } else if (dateRange === 'this_month') {
        if (
          jDate.getFullYear() !== now.getFullYear() ||
          jDate.getMonth() !== now.getMonth()
        ) {
          return false;
        }
      }
    }

    // 4. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchHeader =
        journal.journalNo.toLowerCase().includes(q) ||
        journal.description.toLowerCase().includes(q) ||
        journal.sourceReference.toLowerCase().includes(q) ||
        journal.sourceType.toLowerCase().includes(q);

      const matchLine = journal.lines.some(
        (l) =>
          l.accountCode.toLowerCase().includes(q) ||
          l.accountName.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );

      if (!matchHeader && !matchLine) return false;
    }

    return true;
  });
}

/**
 * Flattens filtered journal entries into tabular row structures for audit logs
 */
export function flattenJournalLinesForExport(
  journals: JournalEntry[],
  selectedAccountCode = 'all'
): FlattenedTransactionRow[] {
  const result: FlattenedTransactionRow[] = [];

  for (const journal of journals) {
    const linesToInclude =
      selectedAccountCode === 'all'
        ? journal.lines
        : journal.lines.filter((l) => l.accountCode === selectedAccountCode);

    for (const line of linesToInclude) {
      result.push({
        journalNo: journal.journalNo,
        effectiveDate: journal.effectiveDate,
        sourceType: journal.sourceType.toUpperCase(),
        sourceReference: journal.sourceReference || 'N/A',
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: line.debit,
        credit: line.credit,
        debitFormatted: line.debit > 0 ? formatUGX(line.debit) : '0',
        creditFormatted: line.credit > 0 ? formatUGX(line.credit) : '0',
        lineDescription: line.description || journal.description,
        journalDescription: journal.description,
        postedBy: journal.postedByUserId || 'System Automation',
        isBalanced: journal.isBalanced ? 'BALANCED' : 'IMBALANCED',
      });
    }
  }

  return result;
}

export const ACCOUNTING_EXPORT_COLUMNS = [
  { header: 'Journal No', dataKey: 'journalNo' },
  { header: 'Effective Date', dataKey: 'effectiveDate' },
  { header: 'Source Type', dataKey: 'sourceType' },
  { header: 'Reference', dataKey: 'sourceReference' },
  { header: 'Account Code', dataKey: 'accountCode' },
  { header: 'Account Name', dataKey: 'accountName' },
  { header: 'Debit (UGX)', dataKey: 'debitFormatted' },
  { header: 'Credit (UGX)', dataKey: 'creditFormatted' },
  { header: 'Line Description', dataKey: 'lineDescription' },
  { header: 'Status', dataKey: 'isBalanced' },
];

/**
 * Generates and downloads accounting transactions CSV
 */
export function exportAccountingTransactionsCSV(
  journals: JournalEntry[],
  filters: AccountingTransactionFilterOptions,
  tenant: Tenant
): string {
  const filtered = filterJournalEntries(journals, filters);
  const rows = flattenJournalLinesForExport(filtered, filters.accountCode);
  const csvContent = generateCSVString(ACCOUNTING_EXPORT_COLUMNS, rows as unknown as Array<Record<string, unknown>>);
  const filename = `${tenant.slug || 'kerolenda'}_transaction_log_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent);
  return csvContent;
}

/**
 * Exports Trial Balance / Chart of Accounts to CSV
 */
export function exportTrialBalanceCSV(
  accounts: ChartAccount[],
  tenant: Tenant
): string {
  const tenantAccounts = accounts.filter((a) => a.tenantId === tenant.id);
  const columns = [
    { header: 'Account Code', dataKey: 'code' },
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
      debit: isDebit ? formatUGX(a.currentBalance) : '0',
      credit: !isDebit ? formatUGX(a.currentBalance) : '0',
      desc: a.description,
    };
  });

  const csvContent = generateCSVString(columns, rows);
  const filename = `${tenant.slug || 'kerolenda'}_trial_balance_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent);
  return csvContent;
}

/**
 * Generates audited PDF report for Accounting Transaction Logs
 */
export function exportAccountingTransactionsPDF(
  journals: JournalEntry[],
  filters: AccountingTransactionFilterOptions,
  tenant: Tenant,
  branch?: Branch,
  user?: AppUser
): jsPDF {
  const filtered = filterJournalEntries(journals, filters);
  const rows = flattenJournalLinesForExport(filtered, filters.accountCode);

  const totalDebits = rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredits = rows.reduce((sum, r) => sum + r.credit, 0);

  const filterSummary = [
    filters.sourceType && filters.sourceType !== 'all' ? `Source: ${filters.sourceType.toUpperCase()}` : null,
    filters.accountCode && filters.accountCode !== 'all' ? `Account: ${filters.accountCode}` : null,
    filters.dateRange && filters.dateRange !== 'all' ? `Range: ${filters.dateRange}` : null,
    filters.searchQuery ? `Search: "${filters.searchQuery}"` : null,
  ].filter(Boolean).join(' | ') || 'All Verified Transactions';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 55, 'F');
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 55, pageWidth, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`${tenant.displayName.toUpperCase()} — TRANSACTION AUDIT LOG`, margin, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `UMRA Tier 4 Reg: ${tenant.branding?.umraLicenseNo || 'UMRA/MFI/2026/0491'} | TIN: ${tenant.branding?.taxRegistrationNo || '1004928192'} | Currency: UGX`,
    margin,
    42
  );

  const timestampStr = new Date().toLocaleString('en-GB');
  doc.text(`Exported: ${timestampStr}`, pageWidth - margin, 42, { align: 'right' });

  // Document Title & Filter Context
  let currentY = 82;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('General Ledger Transaction Audit Log & Journal Register', margin, currentY);

  currentY += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Filter Applied: ${filterSummary} • Auditor Certification Trail`, margin, currentY);

  // Summary Metrics Badges
  currentY += 16;
  const cards = [
    { label: 'MATCHING JOURNALS', value: String(filtered.length) },
    { label: 'TRANSACTION LINES', value: String(rows.length) },
    { label: 'DEBIT TURNOVER', value: `UGX ${formatUGX(totalDebits)}` },
    { label: 'CREDIT TURNOVER', value: `UGX ${formatUGX(totalCredits)}` },
    { label: 'DOUBLE-ENTRY STATUS', value: totalDebits === totalCredits ? 'BALANCED (100%)' : 'PARITY DISCREPANCY' },
  ];

  const cardWidth = (pageWidth - margin * 2 - (cards.length - 1) * 8) / cards.length;
  cards.forEach((card, idx) => {
    const cardX = margin + idx * (cardWidth + 8);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, 34, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cardX + 7, currentY + 11);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(card.value, cardX + 7, currentY + 25);
  });

  currentY += 46;

  // AutoTable
  const pdfColumns = [
    { header: 'Journal No', dataKey: 'journalNo' },
    { header: 'Date', dataKey: 'effectiveDate' },
    { header: 'Source', dataKey: 'sourceType' },
    { header: 'Ref', dataKey: 'sourceReference' },
    { header: 'Code', dataKey: 'accountCode' },
    { header: 'Account Name', dataKey: 'accountName' },
    { header: 'Debit (UGX)', dataKey: 'debitFormatted' },
    { header: 'Credit (UGX)', dataKey: 'creditFormatted' },
    { header: 'Description', dataKey: 'lineDescription' },
    { header: 'Status', dataKey: 'isBalanced' },
  ];

  const tableBody = rows.map((r) => [
    r.journalNo,
    r.effectiveDate,
    r.sourceType,
    r.sourceReference,
    r.accountCode,
    r.accountName,
    r.debitFormatted,
    r.creditFormatted,
    r.lineDescription,
    r.isBalanced,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [pdfColumns.map((c) => c.header)],
    body: tableBody,
    margin: { left: margin, right: margin, bottom: 45 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 4.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

      doc.text(
        `External Audit Copy • Prepared by: ${user ? `${user.name} (${user.role})` : 'System Administrator'} • Branch: ${branch?.name || 'Main Office'}`,
        margin,
        pageHeight - 14
      );
      doc.text(pageStr, pageWidth - margin, pageHeight - 14, { align: 'right' });
    },
  });

  const filename = `${tenant.slug || 'kerolenda'}_transaction_log_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return doc;
}

// ---------------------------------------------------------------------------
// COLLECTIONS & RECOVERY REPORTS EXPORT HELPERS
// ---------------------------------------------------------------------------

export interface RecoveryReportFilterOptions {
  agingBucket?: string | null; // null | 'current' | '1-30' | '31-60' | '61-90' | '90+'
  status?: string; // 'all' | 'active_followup' | 'promise_to_pay' | 'legal_escalation' | 'resolved'
  assignedOfficerId?: string; // 'all' or officer id
  searchQuery?: string;
}

export interface FlattenedRecoveryRow {
  caseId: string;
  loanNo: string;
  customerName: string;
  phone: string;
  nin: string;
  occupation: string;
  daysPastDue: number;
  agingBucketLabel: string;
  totalArrearsUGX: number;
  totalArrearsFormatted: string;
  principalOutstandingUGX: number;
  principalOutstandingFormatted: string;
  caseStatus: string;
  assignedOfficerName: string;
  activePtpDate: string;
  activePtpAmountUGX: number;
  activePtpAmountFormatted: string;
  lastContactOutcome: string;
  statutoryProvisionPercent: string;
  statutoryProvisionUGX: number;
  statutoryProvisionFormatted: string;
}

/**
 * Maps days past due to UMRA statutory aging bucket and provisioning requirement
 */
export function getAgingBucketInfo(dpd: number): { label: string; provisionPercent: number } {
  if (dpd === 0) return { label: 'Current (0d)', provisionPercent: 0 };
  if (dpd <= 30) return { label: '1 - 30 Days (Watch)', provisionPercent: 5 };
  if (dpd <= 60) return { label: '31 - 60 Days (PAR Substandard)', provisionPercent: 25 };
  if (dpd <= 90) return { label: '61 - 90 Days (Doubtful)', provisionPercent: 50 };
  return { label: '90+ Days (Loss / NPL)', provisionPercent: 100 };
}

/**
 * Filters recovery cases according to aging bucket, status, officer and search query
 */
export function filterRecoveryCases(
  cases: RecoveryCase[],
  loans: Loan[],
  customers: Customer[],
  filters: RecoveryReportFilterOptions
): RecoveryCase[] {
  const { agingBucket, status = 'all', assignedOfficerId = 'all', searchQuery = '' } = filters;

  return cases.filter((c) => {
    const loan = loans.find((l) => l.id === c.loanId);
    const cust = customers.find((cu) => cu.id === c.customerId);
    const dpd = c.daysPastDue;

    // 1. Aging Bucket filter
    if (agingBucket) {
      if (agingBucket === 'current' && dpd !== 0) return false;
      if (agingBucket === '1-30' && (dpd < 1 || dpd > 30)) return false;
      if (agingBucket === '31-60' && (dpd < 31 || dpd > 60)) return false;
      if (agingBucket === '61-90' && (dpd < 61 || dpd > 90)) return false;
      if (agingBucket === '90+' && dpd <= 90) return false;
    }

    // 2. Case Status filter
    if (status !== 'all' && c.status !== status) {
      return false;
    }

    // 3. Officer filter
    if (assignedOfficerId !== 'all' && c.assignedOfficerId !== assignedOfficerId) {
      return false;
    }

    // 4. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchLoan = loan?.loanNo.toLowerCase().includes(q);
      const matchCustomer =
        cust?.fullName.toLowerCase().includes(q) ||
        cust?.phone.toLowerCase().includes(q) ||
        cust?.occupation.toLowerCase().includes(q) ||
        cust?.kyc.idNumberMasked.toLowerCase().includes(q);
      const matchOutcome = c.lastContactOutcome.toLowerCase().includes(q);

      if (!matchLoan && !matchCustomer && !matchOutcome) return false;
    }

    return true;
  });
}

/**
 * Transforms recovery cases into structured rows for audit reporting
 */
export function flattenRecoveryCasesForExport(
  cases: RecoveryCase[],
  loans: Loan[],
  customers: Customer[],
  officers: AppUser[]
): FlattenedRecoveryRow[] {
  return cases.map((c) => {
    const loan = loans.find((l) => l.id === c.loanId);
    const cust = customers.find((cu) => cu.id === c.customerId);
    const officer = officers.find((o) => o.id === c.assignedOfficerId);
    const bucketInfo = getAgingBucketInfo(c.daysPastDue);

    // Active pending promise to pay
    const pendingPtp = c.promisesToPay?.find((p) => p.status === 'pending');
    const ptpAmount = pendingPtp ? pendingPtp.promisedAmount : 0;
    const ptpDate = pendingPtp ? pendingPtp.promisedDate : 'None Scheduled';

    const outstanding = loan?.principalOutstanding || c.totalArrearsUGX;
    const provisionUGX = Math.round((outstanding * bucketInfo.provisionPercent) / 100);

    return {
      caseId: c.id,
      loanNo: loan?.loanNo || 'N/A',
      customerName: cust?.fullName || 'Unknown Customer',
      phone: cust?.phone || 'N/A',
      nin: cust?.kyc.idNumberMasked || 'N/A',
      occupation: cust?.occupation || 'N/A',
      daysPastDue: c.daysPastDue,
      agingBucketLabel: bucketInfo.label,
      totalArrearsUGX: c.totalArrearsUGX,
      totalArrearsFormatted: formatUGX(c.totalArrearsUGX),
      principalOutstandingUGX: outstanding,
      principalOutstandingFormatted: formatUGX(outstanding),
      caseStatus: c.status.replace(/_/g, ' ').toUpperCase(),
      assignedOfficerName: officer?.name || 'Unassigned',
      activePtpDate: ptpDate,
      activePtpAmountUGX: ptpAmount,
      activePtpAmountFormatted: ptpAmount > 0 ? formatUGX(ptpAmount) : '—',
      lastContactOutcome: c.lastContactOutcome || 'No notes logged',
      statutoryProvisionPercent: `${bucketInfo.provisionPercent}%`,
      statutoryProvisionUGX: provisionUGX,
      statutoryProvisionFormatted: formatUGX(provisionUGX),
    };
  });
}

export const RECOVERY_EXPORT_COLUMNS = [
  { header: 'Loan No', dataKey: 'loanNo' },
  { header: 'Customer Name', dataKey: 'customerName' },
  { header: 'Phone', dataKey: 'phone' },
  { header: 'NIN', dataKey: 'nin' },
  { header: 'Days Past Due', dataKey: 'daysPastDue' },
  { header: 'Aging Bucket', dataKey: 'agingBucketLabel' },
  { header: 'Arrears (UGX)', dataKey: 'totalArrearsFormatted' },
  { header: 'Principal Bal (UGX)', dataKey: 'principalOutstandingFormatted' },
  { header: 'Case Status', dataKey: 'caseStatus' },
  { header: 'Assigned Officer', dataKey: 'assignedOfficerName' },
  { header: 'PTP Date', dataKey: 'activePtpDate' },
  { header: 'PTP Amount (UGX)', dataKey: 'activePtpAmountFormatted' },
  { header: 'UMRA Provision %', dataKey: 'statutoryProvisionPercent' },
  { header: 'Statutory Impairment (UGX)', dataKey: 'statutoryProvisionFormatted' },
  { header: 'Latest Recovery Action', dataKey: 'lastContactOutcome' },
];

/**
 * Generates and downloads recovery cases audit CSV
 */
export function exportRecoveryReportCSV(
  cases: RecoveryCase[],
  loans: Loan[],
  customers: Customer[],
  officers: AppUser[],
  filters: RecoveryReportFilterOptions,
  tenant: Tenant
): string {
  const filtered = filterRecoveryCases(cases, loans, customers, filters);
  const rows = flattenRecoveryCasesForExport(filtered, loans, customers, officers);
  const csvContent = generateCSVString(RECOVERY_EXPORT_COLUMNS, rows as unknown as Array<Record<string, unknown>>);
  const filename = `${tenant.slug || 'kerolenda'}_recovery_report_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent);
  return csvContent;
}

/**
 * Generates audited PDF report for Delinquent Loans, Collections & Recovery
 */
export function exportRecoveryReportPDF(
  cases: RecoveryCase[],
  loans: Loan[],
  customers: Customer[],
  officers: AppUser[],
  filters: RecoveryReportFilterOptions,
  tenant: Tenant,
  branch?: Branch,
  user?: AppUser
): jsPDF {
  const filtered = filterRecoveryCases(cases, loans, customers, filters);
  const rows = flattenRecoveryCasesForExport(filtered, loans, customers, officers);

  const totalArrears = rows.reduce((sum, r) => sum + r.totalArrearsUGX, 0);
  const totalOutstanding = rows.reduce((sum, r) => sum + r.principalOutstandingUGX, 0);
  const totalProvision = rows.reduce((sum, r) => sum + r.statutoryProvisionUGX, 0);
  const parCases = rows.filter((r) => r.daysPastDue > 30).length;
  const ptpTotal = rows.reduce((sum, r) => sum + r.activePtpAmountUGX, 0);

  const filterSummary = [
    filters.agingBucket ? `Aging: ${filters.agingBucket.toUpperCase()}` : 'All Aging Buckets',
    filters.status && filters.status !== 'all' ? `Status: ${filters.status.toUpperCase()}` : null,
    filters.searchQuery ? `Search: "${filters.searchQuery}"` : null,
  ].filter(Boolean).join(' | ');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 55, 'F');
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 55, pageWidth, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`${tenant.displayName.toUpperCase()} — COLLECTIONS & RECOVERY AUDIT REPORT`, margin, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Statutory Delinquency Register | UMRA Tier 4 Reg: ${tenant.branding?.umraLicenseNo || 'UMRA/MFI/2026/0491'} | Currency: UGX`,
    margin,
    42
  );

  const timestampStr = new Date().toLocaleString('en-GB');
  doc.text(`Generated: ${timestampStr}`, pageWidth - margin, 42, { align: 'right' });

  // Document Title & Filter Context
  let currentY = 82;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Delinquency Aging, Recovery Workflow & Impairment Provisioning Audit', margin, currentY);

  currentY += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Scope: ${filterSummary} • Formatted for External & Statutory Examination`, margin, currentY);

  // Summary Metrics Badges
  currentY += 16;
  const cards = [
    { label: 'TOTAL ARREARS CASES', value: String(filtered.length) },
    { label: 'PAR > 30 DAYS ACCOUNTS', value: `${parCases} (${filtered.length > 0 ? Math.round((parCases / filtered.length) * 100) : 0}%)` },
    { label: 'GROSS ARREARS DUE', value: `UGX ${formatUGX(totalArrears)}` },
    { label: 'DELINQUENT PORTFOLIO', value: `UGX ${formatUGX(totalOutstanding)}` },
    { label: 'PROMISED (ACTIVE PTP)', value: `UGX ${formatUGX(ptpTotal)}` },
    { label: 'STATUTORY IMPAIRMENT', value: `UGX ${formatUGX(totalProvision)}` },
  ];

  const cardWidth = (pageWidth - margin * 2 - (cards.length - 1) * 8) / cards.length;
  cards.forEach((card, idx) => {
    const cardX = margin + idx * (cardWidth + 8);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, cardWidth, 34, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cardX + 6, currentY + 11);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(card.value, cardX + 6, currentY + 25);
  });

  currentY += 46;

  // AutoTable columns
  const pdfColumns = [
    { header: 'Loan No', dataKey: 'loanNo' },
    { header: 'Customer', dataKey: 'customerName' },
    { header: 'Phone', dataKey: 'phone' },
    { header: 'DPD', dataKey: 'daysPastDue' },
    { header: 'Aging Bucket', dataKey: 'agingBucketLabel' },
    { header: 'Arrears (UGX)', dataKey: 'totalArrearsFormatted' },
    { header: 'Status', dataKey: 'caseStatus' },
    { header: 'Officer', dataKey: 'assignedOfficerName' },
    { header: 'PTP Date', dataKey: 'activePtpDate' },
    { header: 'PTP (UGX)', dataKey: 'activePtpAmountFormatted' },
    { header: 'Prov %', dataKey: 'statutoryProvisionPercent' },
    { header: 'Provision (UGX)', dataKey: 'statutoryProvisionFormatted' },
  ];

  const tableBody = rows.map((r) => [
    r.loanNo,
    r.customerName,
    r.phone,
    `${r.daysPastDue}d`,
    r.agingBucketLabel,
    r.totalArrearsFormatted,
    r.caseStatus,
    r.assignedOfficerName,
    r.activePtpDate,
    r.activePtpAmountFormatted,
    r.statutoryProvisionPercent,
    r.statutoryProvisionFormatted,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [pdfColumns.map((c) => c.header)],
    body: tableBody,
    margin: { left: margin, right: margin, bottom: 45 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 4.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

      doc.text(
        `External Audit Copy • Prepared by: ${user ? `${user.name} (${user.role})` : 'System Administrator'} • Branch: ${branch?.name || 'Main Office'} • UMRA Tier 4 Compliant`,
        margin,
        pageHeight - 14
      );
      doc.text(pageStr, pageWidth - margin, pageHeight - 14, { align: 'right' });
    },
  });

  const filename = `${tenant.slug || 'kerolenda'}_recovery_report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return doc;
}

// ---------------------------------------------------------------------------
// AUDIT & REGULATORY COMPLIANCE LOGS EXPORT HELPERS
// ---------------------------------------------------------------------------

export interface AuditLogFilterOptions {
  searchQuery?: string;
  entityType?: string; // 'ALL' or specific entityType
  dateRange?: 'all' | 'today' | '7days' | '30days';
  referenceDate?: string;
}

export interface FlattenedAuditLogRow {
  timestamp: string;
  timestampEAT: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  ipAddress: string;
}

export const AUDIT_LOG_EXPORT_COLUMNS = [
  { header: 'Timestamp (UTC/ISO)', dataKey: 'timestamp' },
  { header: 'Timestamp (EAT)', dataKey: 'timestampEAT' },
  { header: 'Actor Name', dataKey: 'actorName' },
  { header: 'Actor Role', dataKey: 'actorRole' },
  { header: 'Action Type', dataKey: 'action' },
  { header: 'Entity Category', dataKey: 'entityType' },
  { header: 'Entity Reference ID', dataKey: 'entityId' },
  { header: 'Audit Summary & Narrative', dataKey: 'summary' },
  { header: 'IP Hash / Source', dataKey: 'ipAddress' },
];

/**
 * Filters audit event logs by search query, entity type and date range
 */
export function filterAuditLogs(
  logs: AuditEvent[],
  filters: AuditLogFilterOptions
): AuditEvent[] {
  const { searchQuery = '', entityType = 'ALL', dateRange = 'all', referenceDate } = filters;
  const now = referenceDate ? new Date(referenceDate) : new Date();

  return logs.filter((log) => {
    // 1. Entity type filter
    if (entityType !== 'ALL' && log.entityType !== entityType) {
      return false;
    }

    // 2. Date range filter
    if (dateRange !== 'all') {
      const logDate = new Date(log.timestamp);
      if (dateRange === 'today') {
        if (logDate.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10)) {
          return false;
        }
      } else if (dateRange === '7days') {
        const diffMs = now.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (dateRange === '30days') {
        const diffMs = now.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 30) return false;
      }
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        log.actorName.toLowerCase().includes(q) ||
        log.actorRole.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.summary.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q);

      if (!matchesSearch) return false;
    }

    return true;
  });
}

/**
 * Flattens audit event logs into structured tabular rows for CSV export
 */
export function flattenAuditLogsForExport(
  logs: AuditEvent[]
): FlattenedAuditLogRow[] {
  return logs.map((log) => {
    let timestampEAT = log.timestamp;
    try {
      timestampEAT = new Date(log.timestamp).toLocaleString('en-UG', {
        timeZone: 'Africa/Kampala',
        dateStyle: 'short',
        timeStyle: 'medium',
      });
    } catch {
      timestampEAT = log.timestamp;
    }

    return {
      timestamp: log.timestamp,
      timestampEAT,
      actorName: log.actorName,
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      summary: log.summary,
      ipAddress: log.ipAddress,
    };
  });
}

/**
 * Generates and downloads audit logs CSV with UTF-8 BOM and RFC 4180 escaping
 */
export function exportAuditLogsCSV(
  logs: AuditEvent[],
  filters: AuditLogFilterOptions,
  tenant: Tenant
): string {
  const filtered = filterAuditLogs(logs, filters);
  const rows = flattenAuditLogsForExport(filtered);
  const csvContent = generateCSVString(
    AUDIT_LOG_EXPORT_COLUMNS,
    rows as unknown as Array<Record<string, unknown>>
  );
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `${tenant.slug || 'kerolenda'}_audit_log_${dateStamp}.csv`;
  triggerFileDownload(filename, csvContent);
  return csvContent;
}

