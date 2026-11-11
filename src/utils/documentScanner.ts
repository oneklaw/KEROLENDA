import { DocumentCategory } from '../types';

/**
 * Intelligent categorization based on document filename or title keywords.
 */
export function autoCategorizeDocument(input: string): DocumentCategory {
  const text = (input || '').toLowerCase();
  const normalized = text.replace(/[_\-.]/g, ' ');

  if (
    normalized.includes('nin') ||
    normalized.includes('national id') ||
    text.includes('cm8') ||
    text.includes('cf9')
  ) {
    return normalized.includes('back') || normalized.includes('reverse') ? 'national_id_back' : 'national_id_front';
  }

  if (
    text.includes('photo') ||
    text.includes('portrait') ||
    text.includes('face') ||
    text.includes('selfie') ||
    text.includes('passport')
  ) {
    return 'passport_photo';
  }

  if (
    text.includes('signature') ||
    text.includes('signed') ||
    text.includes('e-sign') ||
    text.includes('digital sign') ||
    text.includes('attestation')
  ) {
    return 'digital_signature';
  }

  if (
    text.includes('title') ||
    text.includes('land') ||
    text.includes('deed') ||
    text.includes('kibanja') ||
    text.includes('logbook') ||
    text.includes('boda') ||
    text.includes('vehicle') ||
    text.includes('collateral')
  ) {
    return 'collateral_proof';
  }

  if (
    text.includes('security') ||
    text.includes('chattel') ||
    text.includes('mortgage') ||
    text.includes('lien') ||
    text.includes('pledge') ||
    text.includes('hypothecation')
  ) {
    return 'loan_security';
  }

  if (text.includes('guarantor') || text.includes('surety') || text.includes('undertaking')) {
    return 'guarantor_form';
  }

  if (
    text.includes('water') ||
    text.includes('nwsc') ||
    text.includes('umeme') ||
    text.includes('electricity') ||
    text.includes('yaka') ||
    text.includes('utility') ||
    text.includes('residence') ||
    text.includes('tenancy')
  ) {
    return 'utility_bill';
  }

  if (
    text.includes('income') ||
    text.includes('salary') ||
    text.includes('payslip') ||
    text.includes('pay slip') ||
    text.includes('bank statement') ||
    text.includes('momo statement') ||
    text.includes('statement') ||
    text.includes('payroll') ||
    text.includes('earnings') ||
    text.includes('remittance')
  ) {
    return 'proof_of_income';
  }

  if (
    text.includes('license') ||
    text.includes('trade') ||
    text.includes('kcca') ||
    text.includes('ursb') ||
    text.includes('tin') ||
    text.includes('tax')
  ) {
    return 'business_license';
  }

  return 'other';
}

/**
 * Estimates the binary payload size in bytes from a base64 Data URL.
 */
export function estimateBase64SizeBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = (base64Data.match(/=+$/) || [''])[0].length;
  return Math.max(0, Math.floor((base64Data.length * 3) / 4) - padding);
}

/**
 * Formats a byte number into a clean human-readable representation.
 */
export function formatDocumentFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Checks whether a given string is a valid image or document data URL.
 */
export function isValidDataUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /^data:([a-zA-Z0-9_\-\.\/]+);(base64|utf8),.+/.test(url);
}

/**
 * Extracts the MIME type from a Data URL string.
 */
export function extractMimeTypeFromDataUrl(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:')) return 'application/octet-stream';
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match ? match[1] : 'application/octet-stream';
}
