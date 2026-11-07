import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateNationalIdFrontSvg,
  generateNationalIdBackSvg,
  generatePassportPhotoSvg,
  generateLandTitleSvg,
  generateVehicleLogbookSvg,
  generateTradingLicenseSvg,
  generateGenericDocumentSvg,
} from './documentTemplates';

test('generateNationalIdFrontSvg produces a valid SVG data URI containing customer details', () => {
  const uri = generateNationalIdFrontSvg('Musa Byaruhanga', 'CM84029482718K', '1984-05-18', 'Male');
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
  assert.ok(decoded.includes('MUSA BYARUHANGA'));
  assert.ok(decoded.includes('CM84029482718K'));
  assert.ok(decoded.includes('THE REPUBLIC OF UGANDA'));
  assert.ok(decoded.includes('NATIONAL IDENTIFICATION CARD'));
});

test('generateNationalIdBackSvg produces valid reverse side barcode and MRZ', () => {
  const uri = generateNationalIdBackSvg('CM84029482718K', '009841284');
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
  assert.ok(decoded.includes('PLACE OF ISSUE'));
  assert.ok(decoded.includes('DIGITAL THUMBPRINT'));
  assert.ok(decoded.includes('NIRA-UG'));
});

test('generatePassportPhotoSvg produces a valid photo URI with verified watermark', () => {
  const uri = generatePassportPhotoSvg('Betty Nabakooza');
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
  assert.ok(decoded.includes('KYC VERIFIED BIOMETRIC'));
  assert.ok(decoded.includes('BETTY NABAKOOZA'));
});

test('generateLandTitleSvg embeds plot deed particulars and caveat lien', () => {
  const uri = generateLandTitleSvg('Plot 244 Block 108 Kisaasi', 'Kampala', 'Musa Byaruhanga');
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
  assert.ok(decoded.includes('CERTIFICATE OF TITLE'));
  assert.ok(decoded.includes('Plot 244 Block 108 Kisaasi'));
  assert.ok(decoded.includes('MUSA BYARUHANGA'));
  assert.ok(decoded.includes('EQUITABLE MORTGAGE LIEN'));
});

test('generateVehicleLogbookSvg embeds registration plate and security lien', () => {
  const uri = generateVehicleLogbookSvg('UFG 812K', 'Bajaj Boxer BM150', 'Betty Nabakooza');
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
  assert.ok(decoded.includes('MOTOR VEHICLE REGISTRATION BOOK'));
  assert.ok(decoded.includes('UFG 812K'));
  assert.ok(decoded.includes('TIER 4 LOAN COLLATERAL'));
});

test('generateTradingLicenseSvg embeds municipal licensing details', () => {
  const uri = generateTradingLicenseSvg('Musa Hardware Ltd', 'Musa Byaruhanga', 'KCCA');
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
  assert.ok(decoded.includes('KCCA TRADING LICENSE'));
  assert.ok(decoded.includes('MUSA HARDWARE LTD'));
});
