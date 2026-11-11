import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveUserAndCompany,
  validateUserCredentials,
  parseUnifiedCredentials,
  formatMaskedCredentials,
} from './authResolver';
import { AppUser, Tenant, BorrowerAccount } from '../types';

const testTenants: Tenant[] = [
  {
    id: 'tenant-victoria',
    legalName: 'Victoria Microfinance Limited',
    displayName: 'Victoria Microfinance',
    slug: 'victoria-mfi',
    status: 'active',
    timezone: 'Africa/Kampala',
    defaultCurrency: 'UGX',
    planName: 'Growth Pro',
    maxBranches: 5,
    maxUsers: 25,
    branding: {
      primaryColor: '#0f766e',
      accentColor: '#0284c7',
      receiptFooter: 'Receipt footer',
      taxRegistrationNo: 'TIN-1002948201',
      umraLicenseNo: 'UMRA/MFI/2026/0491',
    },
    registeredAddress: 'Plot 48 Kampala Road',
    supportPhone: '+256 414 382 900',
    mfaEnforced: false,
    allowedMfaMethods: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'tenant-rwenzori',
    legalName: 'Rwenzori Community SACCO Society Ltd',
    displayName: 'Rwenzori SACCO',
    slug: 'rwenzori-sacco',
    status: 'active',
    timezone: 'Africa/Kampala',
    defaultCurrency: 'UGX',
    planName: 'Enterprise SACCO',
    maxBranches: 8,
    maxUsers: 50,
    branding: {
      primaryColor: '#1e3a8a',
      accentColor: '#d97706',
      receiptFooter: 'Cooperative Society',
      taxRegistrationNo: 'TIN-1008832941',
      umraLicenseNo: 'UMRA/SACCO/2026/0112',
    },
    registeredAddress: 'Rwenzori Plaza, Fort Portal',
    supportPhone: '+256 483 422 100',
    mfaEnforced: false,
    allowedMfaMethods: ['email', 'sms'],
  },
  {
    id: 'tenant-kampala-credit',
    legalName: 'Kampala Digital Credit Limited',
    displayName: 'Kampala Digital Credit',
    slug: 'kampala-digital-credit',
    status: 'active',
    timezone: 'Africa/Kampala',
    defaultCurrency: 'UGX',
    planName: 'Starter',
    maxBranches: 2,
    maxUsers: 10,
    branding: {
      primaryColor: '#7c3aed',
      accentColor: '#ec4899',
      receiptFooter: 'Digital Lending Services',
      taxRegistrationNo: 'TIN-1019284019',
      umraLicenseNo: 'UMRA/ML/2026/0882',
    },
    registeredAddress: 'Lugogo Bypass Mall, Kampala',
    supportPhone: '+256 312 900 111',
    mfaEnforced: true,
    allowedMfaMethods: ['email', 'sms', 'whatsapp'],
  },
];

const testUsers: AppUser[] = [
  {
    id: 'user-sarah',
    tenantId: 'tenant-victoria',
    name: 'Sarah Namubiru',
    email: 'sarah.namubiru@victoriamfi.ug',
    role: 'TENANT_OWNER',
    approvalLimitUGX: 100_000_000,
    mfaEnabled: true,
    status: 'active',
  },
  {
    id: 'user-julius',
    tenantId: 'tenant-rwenzori',
    name: 'Julius Mugisa',
    email: 'julius.mugisa@rwenzori.ug',
    role: 'BRANCH_MANAGER',
    approvalLimitUGX: 30_000_000,
    mfaEnabled: true,
    status: 'active',
  },
  {
    id: 'user-superadmin',
    name: 'Alex Kintu',
    email: 'superadmin@kerolend.com',
    role: 'PLATFORM_SUPER_ADMIN',
    approvalLimitUGX: 500_000_000,
    mfaEnabled: true,
    status: 'active',
  },
  {
    id: 'user-konekalit',
    username: 'konekalit',
    password: '123Bell123',
    name: 'Kenneth Onekalit',
    email: 'konekalit@kerolend.com',
    phone: '+256 772 889 900',
    role: 'PLATFORM_SUPER_ADMIN',
    approvalLimitUGX: 1_000_000_000,
    mfaEnabled: true,
    preferredMfaMethod: 'email',
    status: 'active',
  },
];

const testBorrowers: BorrowerAccount[] = [
  {
    id: 'bor-musa',
    userId: 'user-borrower-musa',
    borrowerNo: 'BOR-2026-0041',
    fullName: 'Musa Byaruhanga',
    nin: 'CM84029482718K',
    ninMasked: 'CM8402****718K',
    email: 'musa.hardware@gmail.com',
    phone: '+256 772 458 920',
    dob: '1984-05-18',
    gender: 'Male',
    residenceTown: 'Katwe Business Center',
    residenceDistrict: 'Kampala',
    occupation: 'Hardware Merchant & Importer',
    monthlyIncomeUGX: 6_500_000,
    monthlyExpensesUGX: 2_800_000,
    creditScore: 785,
    creditRating: 'Excellent',
    status: 'active',
    registeredAt: '2026-01-10T08:00:00Z',
    mfaEnabled: true,
    preferredMfaMethod: 'whatsapp',
  },
];

test('resolveUserAndCompany automatically routes Sarah Namubiru to Victoria Microfinance workspace', () => {
  const result = resolveUserAndCompany('sarah.namubiru@victoriamfi.ug', testUsers, testTenants, testBorrowers);
  assert.equal(result.environment, 'lending_workspace');
  assert.equal(result.tenant?.id, 'tenant-victoria');
  assert.equal(result.companyName, 'Victoria Microfinance');
  assert.equal(result.user.name, 'Sarah Namubiru');
});

test('resolveUserAndCompany automatically routes Julius Mugisa to Rwenzori SACCO workspace', () => {
  const result = resolveUserAndCompany('julius.mugisa@rwenzori.ug', testUsers, testTenants, testBorrowers);
  assert.equal(result.environment, 'lending_workspace');
  assert.equal(result.tenant?.id, 'tenant-rwenzori');
  assert.equal(result.companyName, 'Rwenzori SACCO');
});

test('resolveUserAndCompany automatically routes Super Admin to platform_admin environment', () => {
  const result = resolveUserAndCompany('superadmin@kerolend.com', testUsers, testTenants, testBorrowers);
  assert.equal(result.environment, 'platform_admin');
  assert.equal(result.user.role, 'PLATFORM_SUPER_ADMIN');
});

test('resolveUserAndCompany resolves platform admin account with username konekalit', () => {
  const result = resolveUserAndCompany('konekalit', testUsers, testTenants, testBorrowers);
  assert.equal(result.environment, 'platform_admin');
  assert.equal(result.user.role, 'PLATFORM_SUPER_ADMIN');
  assert.equal(result.user.username, 'konekalit');
  assert.equal(result.user.name, 'Kenneth Onekalit');
  assert.equal(result.user.password, '123Bell123');
});

test('validateUserCredentials enforces password for konekalit account', () => {
  const adminUser = testUsers.find((u) => u.username === 'konekalit')!;
  
  // Correct password succeeds
  const validResult = validateUserCredentials(adminUser, '123Bell123');
  assert.equal(validResult.valid, true);

  // Demo placeholder succeeds
  const demoResult = validateUserCredentials(adminUser, '••••••••••••');
  assert.equal(demoResult.valid, true);

  // Incorrect password fails
  const invalidResult = validateUserCredentials(adminUser, 'WrongPass123');
  assert.equal(invalidResult.valid, false);
  assert.match(invalidResult.error || '', /Incorrect password/);

  // Empty password fails
  const emptyResult = validateUserCredentials(adminUser, '');
  assert.equal(emptyResult.valid, false);
});

test('resolveUserAndCompany automatically routes registered borrower to borrower_portal', () => {
  const result = resolveUserAndCompany('musa.hardware@gmail.com', testUsers, testTenants, testBorrowers);
  assert.equal(result.environment, 'borrower_portal');
  assert.equal(result.borrower?.fullName, 'Musa Byaruhanga');
  assert.equal(result.user.role, 'BORROWER');
});

test('resolveUserAndCompany auto-detects unknown email with company domain', () => {
  const result = resolveUserAndCompany('new.officer@rwenzori.ug', testUsers, testTenants, testBorrowers);
  assert.equal(result.environment, 'lending_workspace');
  assert.equal(result.tenant?.id, 'tenant-rwenzori');
  assert.equal(result.companyName, 'Rwenzori SACCO');
});

test('parseUnifiedCredentials accurately parses multi-line username and password in same text area', () => {
  const parsed = parseUnifiedCredentials('konekalit\n123Bell123');
  assert.equal(parsed.username, 'konekalit');
  assert.equal(parsed.password, '123Bell123');
});

test('parseUnifiedCredentials accurately parses colon-separated credentials in single text area', () => {
  const parsed = parseUnifiedCredentials('sarah.namubiru@victoriamfi.ug:Victoria@2026');
  assert.equal(parsed.username, 'sarah.namubiru@victoriamfi.ug');
  assert.equal(parsed.password, 'Victoria@2026');
});

test('parseUnifiedCredentials accurately parses whitespace-separated credentials', () => {
  const parsed = parseUnifiedCredentials('konekalit 123Bell123');
  assert.equal(parsed.username, 'konekalit');
  assert.equal(parsed.password, '123Bell123');
});

test('parseUnifiedCredentials handles username-only input without error', () => {
  const parsed = parseUnifiedCredentials('konekalit');
  assert.equal(parsed.username, 'konekalit');
  assert.equal(parsed.password, '');
});

test('formatMaskedCredentials masks password while keeping username visible in plain text', () => {
  // Multi-line
  const maskedMulti = formatMaskedCredentials('konekalit\n123Bell123', true);
  assert.equal(maskedMulti, 'konekalit\n••••••••••');

  // Colon separated
  const maskedColon = formatMaskedCredentials('konekalit:123Bell123', true);
  assert.equal(maskedColon, 'konekalit:••••••••••');

  // Unmasked preserves plain text
  const unmasked = formatMaskedCredentials('konekalit\n123Bell123', false);
  assert.equal(unmasked, 'konekalit\n123Bell123');
});

