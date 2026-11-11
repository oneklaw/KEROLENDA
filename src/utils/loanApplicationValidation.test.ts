import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_LOAN_PRODUCTS } from '../data/seedData';
import { BorrowerDirectApplication } from '../types';

function validateLoanApplicationForm(app: {
  borrowerPhotoUrl?: string;
  guarantor1Name?: string;
  guarantor1Phone?: string;
  guarantor1Nin?: string;
  guarantor2Name?: string;
  guarantor2Phone?: string;
  guarantor2Nin?: string;
  guarantor2Relationship?: string;
  guarantor2Occupation?: string;
  supportingDocuments?: Array<{ title: string; category: string }>;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!app.borrowerPhotoUrl || !app.borrowerPhotoUrl.trim()) {
    errors.push('Mandatory Requirement: All loan applicants must have a verified profile photo.');
  }

  if (!app.guarantor1Name || !app.guarantor1Name.trim()) {
    errors.push('Guarantor 1 name is required.');
  }

  if (!app.guarantor2Name || !app.guarantor2Name.trim()) {
    errors.push('Mandatory Requirement: Guarantor 2 (Second Guarantor) name is required.');
  }

  if (!app.guarantor2Phone || !app.guarantor2Phone.trim()) {
    errors.push('Guarantor 2 phone number is required.');
  }

  if (!app.guarantor2Nin || !app.guarantor2Nin.trim()) {
    errors.push('Guarantor 2 National ID (NIN) is required.');
  }

  if (!app.supportingDocuments || app.supportingDocuments.length === 0) {
    errors.push('Supporting documents must be attached.');
  }

  return { valid: errors.length === 0, errors };
}

test('Loan application rejects submissions missing mandatory profile photo', () => {
  const result = validateLoanApplicationForm({
    borrowerPhotoUrl: '',
    guarantor1Name: 'Dennis Kakooza',
    guarantor1Phone: '+256 772 312 884',
    guarantor1Nin: 'CM80092384910B',
    guarantor2Name: 'Florence Namubiru',
    guarantor2Phone: '+256 701 543 219',
    guarantor2Nin: 'CF87019284712P',
    supportingDocuments: [{ title: 'National ID', category: 'KYC' }],
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('profile photo')));
});

test('Loan application rejects submissions missing second guarantor (guarantor 2)', () => {
  const result = validateLoanApplicationForm({
    borrowerPhotoUrl: 'https://example.com/photo.jpg',
    guarantor1Name: 'Dennis Kakooza',
    guarantor1Phone: '+256 772 312 884',
    guarantor1Nin: 'CM80092384910B',
    guarantor2Name: '',
    guarantor2Phone: '',
    guarantor2Nin: '',
    supportingDocuments: [{ title: 'National ID', category: 'KYC' }],
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Guarantor 2')));
});

test('Loan application accepts compliant dossier with photo, 2 guarantors and documents', () => {
  const result = validateLoanApplicationForm({
    borrowerPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    guarantor1Name: 'Dennis Kakooza',
    guarantor1Phone: '+256 772 312 884',
    guarantor1Nin: 'CM80092384910B',
    guarantor2Name: 'Florence Namubiru',
    guarantor2Phone: '+256 701 543 219',
    guarantor2Nin: 'CF87019284712P',
    guarantor2Relationship: 'Spouse',
    guarantor2Occupation: 'Registered Nurse',
    supportingDocuments: [
      { title: 'National ID', category: 'KYC' },
      { title: 'LC1 Letter', category: 'Proof of Residence' },
      { title: 'Bank Statement', category: 'Financial Statement' },
    ],
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('Ugandan loan products catalog includes School Fees, Solar PAYG, Market Vendors, Trike, and Land Secured products', () => {
  const productCodes = SEED_LOAN_PRODUCTS.map((p) => p.code);

  assert.ok(productCodes.includes('SCH-FEES'), 'Contains School Fees loan product');
  assert.ok(productCodes.includes('SOLAR-PAYG'), 'Contains Solar PAYG clean energy loan product');
  assert.ok(productCodes.includes('WIB-MKT'), 'Contains Women in Business & Market Vendors loan product');
  assert.ok(productCodes.includes('TRIKE-CARGO'), 'Contains Cargo Tricycle asset finance loan product');
  assert.ok(productCodes.includes('LAND-SEC'), 'Contains Land Title Secured Micro-Mortgage loan product');
  assert.ok(productCodes.includes('AGRI-COMM'), 'Contains Commercial Agribusiness seasonal loan product');

  const schoolFees = SEED_LOAN_PRODUCTS.find((p) => p.code === 'SCH-FEES')!;
  assert.equal(schoolFees.currency, 'UGX');
  assert.ok(schoolFees.minPrincipal > 0);
  assert.ok(schoolFees.maxPrincipal >= 4_000_000);
  assert.ok(schoolFees.minTermMonths >= 1 && schoolFees.maxTermMonths <= 6);

  const solarPayg = SEED_LOAN_PRODUCTS.find((p) => p.code === 'SOLAR-PAYG')!;
  assert.equal(solarPayg.currency, 'UGX');
  assert.equal(solarPayg.interestMethod, 'reducing_balance');

  const marketVendors = SEED_LOAN_PRODUCTS.find((p) => p.code === 'WIB-MKT')!;
  assert.equal(marketVendors.currency, 'UGX');
  assert.ok(marketVendors.minPrincipal <= 500_000);
});
