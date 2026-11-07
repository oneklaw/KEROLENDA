import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSignatureStrokes,
  generateSignatureAuditFingerprint,
  strokesToSvgPathData,
  generateDigitalSignatureSvg,
  generateSignedLoanAgreementSvg,
  generateDigitalSignatureCertificateSvg,
} from './signatureService';

test('validateSignatureStrokes rejects empty or trivial strokes', () => {
  const emptyRes = validateSignatureStrokes([]);
  assert.equal(emptyRes.isValid, false);
  assert.equal(emptyRes.pointCount, 0);

  const speckRes = validateSignatureStrokes([[{ x: 10, y: 10 }]]);
  assert.equal(speckRes.isValid, false);
  assert.equal(speckRes.pointCount, 1);
});

test('validateSignatureStrokes accepts substantive multi-point signatures', () => {
  const validStrokes = [
    [
      { x: 10, y: 20 },
      { x: 15, y: 25 },
      { x: 25, y: 40 },
      { x: 35, y: 50 },
      { x: 50, y: 60 },
      { x: 70, y: 65 },
    ],
  ];
  const res = validateSignatureStrokes(validStrokes);
  assert.equal(res.isValid, true);
  assert.equal(res.strokeCount, 1);
  assert.equal(res.pointCount, 6);
});

test('strokesToSvgPathData generates quadratic bezier curves for smooth rendering', () => {
  const strokes = [
    [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 15 },
    ],
  ];
  const path = strokesToSvgPathData(strokes);
  assert.ok(path.startsWith('M 10.0 10.0'));
  assert.ok(path.includes('Q'));
  assert.ok(path.includes('L 30.0 15.0'));
});

test('generateSignatureAuditFingerprint generates deterministic tokens containing NIN and date', () => {
  const fp1 = generateSignatureAuditFingerprint(
    'Musa Byaruhanga',
    'CM84029482718K',
    '2026-11-03T12:00:00Z',
    'AGR-2026-0041'
  );
  const fp2 = generateSignatureAuditFingerprint(
    'Musa Byaruhanga',
    'CM84029482718K',
    '2026-11-03T12:00:00Z',
    'AGR-2026-0041'
  );
  assert.equal(fp1, fp2);
  assert.ok(fp1.startsWith('UG-ESIGN-2026-'));
  assert.ok(fp1.includes('20261103'));
});

test('generateDigitalSignatureSvg outputs a valid data URI containing signature path', () => {
  const strokes = [
    [
      { x: 50, y: 50 },
      { x: 60, y: 70 },
      { x: 80, y: 90 },
      { x: 100, y: 80 },
      { x: 120, y: 100 },
      { x: 140, y: 110 },
    ],
  ];
  const uri = generateDigitalSignatureSvg(strokes, 400, 200, '#0f172a', 3);
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri);
  assert.ok(decoded.includes('<svg'));
  assert.ok(decoded.includes('KEROLENDA DIGITAL SIGNATURE'));
});

test('generateSignedLoanAgreementSvg embeds customer details, NIN, legal clauses and audit fingerprint', () => {
  const payload = {
    customerName: 'Betty Nabakooza',
    nin: 'CF91079482829M',
    customerNo: 'CUST-2026-0089',
    documentTitle: 'Boda Boda Chattels Mortgage Deed',
    documentNumber: 'DEED-2026-0089',
    loanReference: 'LN-2026-0144',
    facilityAmountUGX: 3000000,
    role: 'Primary Borrower' as const,
    signatureDataUrl: 'data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E',
    signedAt: '2026-11-03T14:30:00Z',
    companyName: 'Victoria Microfinance',
    branchName: 'Kampala Main Branch',
    witnessName: 'Sarah Namubiru',
  };

  const uri = generateSignedLoanAgreementSvg(payload);
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri);
  assert.ok(decoded.includes('BETTY NABAKOOZA'));
  assert.ok(decoded.includes('CF91079482829M'));
  assert.ok(decoded.includes('DEED-2026-0089'));
  assert.ok(decoded.includes('UGX 3,000,000'));
  assert.ok(decoded.includes('Electronic Signatures Act, 2011'));
});

test('generateDigitalSignatureCertificateSvg generates certificate with verified badge', () => {
  const uri = generateDigitalSignatureCertificateSvg(
    'Haruna Mugerwa',
    'CM79039481105P',
    'data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E',
    '2026-11-03T16:00:00Z',
    'Guarantor Undertaking Deed',
    'Rwenzori SACCO'
  );
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  const decoded = decodeURIComponent(uri);
  assert.ok(decoded.includes('HARUNA MUGERWA'));
  assert.ok(decoded.includes('CM79039481105P'));
  assert.ok(decoded.includes('RWENZORI SACCO'));
  assert.ok(decoded.includes('DIGITAL SIGNATURE ATTESTATION'));
});
