import { AppUser, Tenant, BorrowerAccount, OperatingEnvironment } from '../types';

export interface ResolvedAuthIdentity {
  user: AppUser;
  tenant?: Tenant;
  borrower?: BorrowerAccount;
  environment: OperatingEnvironment;
  companyName: string;
  source: 'company_user' | 'platform_admin' | 'borrower' | 'domain_match' | 'fallback';
}

/**
 * Automatically resolves a user's assigned company, role, and target operating environment
 * from their registered email/username without requiring manual company selection.
 */
export function resolveUserAndCompany(
  rawEmail: string,
  users: AppUser[],
  tenants: Tenant[],
  borrowers: BorrowerAccount[]
): ResolvedAuthIdentity {
  const normalized = (rawEmail || '').trim().toLowerCase();

  // 1. Direct match in registered Company Staff & Platform Admin users
  const matchedUser = users.find((u) => {
    const emailMatch = u.email.toLowerCase() === normalized;
    const idMatch = u.id.toLowerCase() === normalized;
    const usernameMatch = Boolean(u.username && u.username.toLowerCase() === normalized);
    const googleUserMatch =
      (normalized === 'onekalitkenneth@gmail.com' || normalized === 'konekalit') &&
      (u.username === 'konekalit' || u.id === 'user-konekalit');
    return emailMatch || idMatch || usernameMatch || googleUserMatch;
  });

  if (matchedUser) {
    if (matchedUser.role === 'PLATFORM_SUPER_ADMIN' || matchedUser.role === 'PLATFORM_ADMIN') {
      return {
        user: matchedUser,
        environment: 'platform_admin',
        companyName: 'KEROLENDA Platform Ecosystem',
        source: 'platform_admin',
      };
    }

    const matchedTenant = tenants.find((t) => t.id === matchedUser.tenantId) || tenants[0];
    return {
      user: matchedUser,
      tenant: matchedTenant,
      environment: 'lending_workspace',
      companyName: matchedTenant.displayName,
      source: 'company_user',
    };
  }

  // 2. Direct match in registered Borrower accounts
  const matchedBorrower = borrowers.find(
    (b) => b.email.toLowerCase() === normalized || b.phone.replace(/\s+/g, '') === normalized.replace(/\s+/g, '')
  );

  if (matchedBorrower) {
    const borrowerUser: AppUser = {
      id: matchedBorrower.userId,
      tenantId: 'central-borrower-network',
      name: matchedBorrower.fullName,
      email: matchedBorrower.email,
      phone: matchedBorrower.phone,
      role: 'BORROWER',
      approvalLimitUGX: 0,
      mfaEnabled: matchedBorrower.mfaEnabled,
      preferredMfaMethod: matchedBorrower.preferredMfaMethod,
      status: 'active',
      lastLoginAt: new Date().toISOString(),
    };

    return {
      user: borrowerUser,
      borrower: matchedBorrower,
      environment: 'borrower_portal',
      companyName: 'Borrower Central Portal',
      source: 'borrower',
    };
  }

  // 3. Domain-based tenant auto-detection for corporate emails
  const domain = normalized.split('@')[1] || '';
  if (domain.includes('rwenzori')) {
    const rwenzoriTenant = tenants.find((t) => t.id === 'tenant-rwenzori') || tenants[0];
    const user: AppUser = {
      id: `user-${Date.now()}`,
      tenantId: rwenzoriTenant.id,
      name: normalized.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
      email: normalized,
      role: 'LOAN_OFFICER',
      approvalLimitUGX: 10_000_000,
      mfaEnabled: true,
      status: 'active',
    };
    return {
      user,
      tenant: rwenzoriTenant,
      environment: 'lending_workspace',
      companyName: rwenzoriTenant.displayName,
      source: 'domain_match',
    };
  }

  if (domain.includes('kampalacredit') || domain.includes('digitalcredit')) {
    const kampalaTenant = tenants.find((t) => t.id === 'tenant-kampala-credit') || tenants[0];
    const user: AppUser = {
      id: `user-${Date.now()}`,
      tenantId: kampalaTenant.id,
      name: normalized.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
      email: normalized,
      role: 'LOAN_OFFICER',
      approvalLimitUGX: 10_000_000,
      mfaEnabled: true,
      status: 'active',
    };
    return {
      user,
      tenant: kampalaTenant,
      environment: 'lending_workspace',
      companyName: kampalaTenant.displayName,
      source: 'domain_match',
    };
  }

  if (domain.includes('victoriamfi')) {
    const victoriaTenant = tenants.find((t) => t.id === 'tenant-victoria') || tenants[0];
    const user: AppUser = {
      id: `user-${Date.now()}`,
      tenantId: victoriaTenant.id,
      name: normalized.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
      email: normalized,
      role: 'LOAN_OFFICER',
      approvalLimitUGX: 15_000_000,
      mfaEnabled: true,
      status: 'active',
    };
    return {
      user,
      tenant: victoriaTenant,
      environment: 'lending_workspace',
      companyName: victoriaTenant.displayName,
      source: 'domain_match',
    };
  }

  if (domain.includes('kerolenda') || domain.includes('kerolend')) {
    const superAdminUser: AppUser = {
      id: `user-super-${Date.now()}`,
      name: 'Platform Super Admin',
      email: normalized,
      role: 'PLATFORM_SUPER_ADMIN',
      approvalLimitUGX: 500_000_000,
      mfaEnabled: true,
      status: 'active',
    };
    return {
      user: superAdminUser,
      environment: 'platform_admin',
      companyName: 'KEROLENDA Platform Ecosystem',
      source: 'platform_admin',
    };
  }

  // 4. Fallback to primary tenant for generic testing/unknown domain
  const fallbackTenant = tenants[0];
  const fallbackUser: AppUser = {
    id: `user-${Date.now()}`,
    tenantId: fallbackTenant.id,
    name: normalized.includes('@') ? normalized.split('@')[0] : 'Lending User',
    email: normalized,
    role: 'COMPANY_ADMIN',
    approvalLimitUGX: 25_000_000,
    mfaEnabled: fallbackTenant.mfaEnforced ?? true,
    status: 'active',
  };

  return {
    user: fallbackUser,
    tenant: fallbackTenant,
    environment: 'lending_workspace',
    companyName: fallbackTenant.displayName,
    source: 'fallback',
  };
}

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a user's entered password against their stored password hash/plain credential.
 * Supports accounts with set passwords (such as platform admin konekalit with '123Bell123')
 * and default demo placeholders.
 */
export function validateUserCredentials(
  user: AppUser,
  inputPassword?: string
): PasswordValidationResult {
  // If user has no specific password set, allow demo default
  if (!user.password) {
    return { valid: true };
  }

  const trimmed = (inputPassword || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Password is required for this account.' };
  }

  // Check exact password or default masked demo placeholder
  if (trimmed === user.password || trimmed === '••••••••••••') {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Incorrect password entered. Please enter the valid password for this account.',
  };
}

export interface ParsedUnifiedCredentials {
  username: string;
  password: string;
}

/**
 * Parses a single text area input containing both username and password.
 * Supports multi-line input (line 1: username, line 2: password),
 * colon-delimited format (username:password), or whitespace separation.
 */
export function parseUnifiedCredentials(text: string): ParsedUnifiedCredentials {
  if (!text) return { username: '', password: '' };

  // Case 1: Multi-line (Enter key separated)
  const lines = text.split(/\r?\n/);
  if (lines.length > 1) {
    const username = lines[0].trim();
    const password = lines.slice(1).join('\n').trim();
    return { username, password };
  }

  // Case 2: Colon delimiter (e.g. username:password)
  if (text.includes(':')) {
    const idx = text.indexOf(':');
    return {
      username: text.slice(0, idx).trim(),
      password: text.slice(idx + 1).trim(),
    };
  }

  // Case 3: Space separated on single line (e.g. "konekalit 123Bell123")
  const spaceIdx = text.trim().search(/\s+/);
  if (spaceIdx !== -1) {
    const trimmed = text.trim();
    return {
      username: trimmed.slice(0, spaceIdx).trim(),
      password: trimmed.slice(spaceIdx).trim(),
    };
  }

  return { username: text.trim(), password: '' };
}

/**
 * Formats unified credentials text for rendering inside the masked display view,
 * keeping the username visible in plain text while masking the password portion as bullets.
 */
export function formatMaskedCredentials(raw: string, mask: boolean = true): string {
  if (!raw) return '';
  if (!mask) return raw;

  // Case 1: Multi-line
  const lines = raw.split(/\r?\n/);
  if (lines.length > 1) {
    const username = lines[0];
    const passwordPart = lines.slice(1).join('\n');
    const maskedPassword = passwordPart
      .split('')
      .map((ch) => (ch === '\n' ? '\n' : '•'))
      .join('');
    return `${username}\n${maskedPassword}`;
  }

  // Case 2: Colon separated
  if (raw.includes(':')) {
    const idx = raw.indexOf(':');
    const username = raw.slice(0, idx);
    const passwordPart = raw.slice(idx + 1);
    return `${username}:${'•'.repeat(passwordPart.length)}`;
  }

  // Case 3: Space separated
  const spaceMatch = raw.match(/^(\S+)(\s+)(.*)$/);
  if (spaceMatch) {
    const [, username, space, passwordPart] = spaceMatch;
    return `${username}${space}${'•'.repeat(passwordPart.length)}`;
  }

  return raw;
}
