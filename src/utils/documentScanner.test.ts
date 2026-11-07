import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoCategorizeDocument,
  estimateBase64SizeBytes,
  formatDocumentFileSize,
  isValidDataUrl,
  extractMimeTypeFromDataUrl,
} from './documentScanner';

test('autoCategorizeDocument classifies National ID Front and Back', () => {
  assert.equal(autoCategorizeDocument('Musa_NIN_Front.jpg'), 'national_id_front');
  assert.equal(autoCategorizeDocument('National ID reverse scan.png'), 'national_id_back');
  assert.equal(autoCategorizeDocument('CM84029482718K_id.jpg'), 'national_id_front');
});

test('autoCategorizeDocument classifies Borrower Portrait / Passport photo', () => {
  assert.equal(autoCategorizeDocument('borrower_face_photo.jpg'), 'passport_photo');
  assert.equal(autoCategorizeDocument('passport_portrait_biometric.png'), 'passport_photo');
});

test('autoCategorizeDocument classifies Collateral Proofs', () => {
  assert.equal(autoCategorizeDocument('Plot_244_Kisaasi_Land_Title.pdf'), 'collateral_proof');
  assert.equal(autoCategorizeDocument('Boda_Bajaj_Logbook_Scan.jpg'), 'collateral_proof');
  assert.equal(autoCategorizeDocument('Kibanja_purchase_deed.jpg'), 'collateral_proof');
});

test('autoCategorizeDocument classifies Loan Security, Guarantor, Residence and Business License', () => {
  assert.equal(autoCategorizeDocument('Chattels_mortgage_security_agreement.pdf'), 'loan_security');
  assert.equal(autoCategorizeDocument('Guarantor_undertaking_form.pdf'), 'guarantor_form');
  assert.equal(autoCategorizeDocument('NWSC_water_bill_residence.png'), 'utility_bill');
  assert.equal(autoCategorizeDocument('KCCA_trading_license_2026.pdf'), 'business_license');
  assert.equal(autoCategorizeDocument('customer_loan_signature_card.svg'), 'digital_signature');
  assert.equal(autoCategorizeDocument('signed_contract_undertaking.png'), 'digital_signature');
  assert.equal(autoCategorizeDocument('general_random_memo.docx'), 'other');
});

test('estimateBase64SizeBytes and formatDocumentFileSize calculate payload sizes accurately', () => {
  // 12 bytes base64 payload (16 base64 chars without padding)
  const dummyBase64 = 'data:image/jpeg;base64,MDEyMzQ1Njc4OWFi';
  const size = estimateBase64SizeBytes(dummyBase64);
  assert.equal(size, 12);
  assert.equal(formatDocumentFileSize(500), '500 B');
  assert.equal(formatDocumentFileSize(1024 * 250), '250.0 KB');
  assert.equal(formatDocumentFileSize(1024 * 1024 * 3.5), '3.50 MB');
});

test('isValidDataUrl and extractMimeTypeFromDataUrl parse MIME types correctly', () => {
  const jpegUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
  assert.equal(isValidDataUrl(jpegUrl), true);
  assert.equal(extractMimeTypeFromDataUrl(jpegUrl), 'image/jpeg');

  const pngUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE';
  assert.equal(isValidDataUrl(pngUrl), true);
  assert.equal(extractMimeTypeFromDataUrl(pngUrl), 'image/png');

  assert.equal(isValidDataUrl('https://example.com/photo.jpg'), false);
  assert.equal(extractMimeTypeFromDataUrl('invalid'), 'application/octet-stream');
});
