/**
 * KEROLENDA Core Data Types & Interfaces
 */

export type UserRole =
  | 'PLATFORM_SUPER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'COMPANY_OWNER'
  | 'TENANT_OWNER'
  | 'COMPANY_ADMIN'
  | 'BRANCH_MANAGER'
  | 'LOAN_OFFICER'
  | 'CREDIT_OFFICER'
  | 'CASHIER_ACCOUNTANT'
  | 'CASHIER_TELLER'
  | 'ACCOUNTANT'
  | 'SAVINGS_OFFICER'
  | 'RECOVERY_OFFICER'
  | 'AUDITOR'
  | 'BORROWER';

export type OperatingEnvironment = 'platform_admin' | 'lending_workspace' | 'borrower_portal';

export type MFAMethod = 'email' | 'sms' | 'whatsapp';

export interface MFAChallenge {
  id: string;
  userId: string;
  method: MFAMethod;
  destinationMasked: string;
  code: string; // 6-digit verification code
  expiresAt: number; // Unix timestamp ms
  attemptsLeft: number;
  resendAvailableAt: number;
  isVerified: boolean;
  createdAt: number;
}

export interface TenantFiscalYear {
  startMonth: number; // 1 = January, 7 = July
  endMonth: number;   // 12 = December, 6 = June
  title: string;
}

export interface TenantPenaltyRules {
  gracePeriodDays: number;
  dailyPenaltyPercent: number;
  maxPenaltyCapPercent: number;
  autoLockDaysPastDue: number;
}

export interface TenantBranding {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  receiptFooter: string;
  taxRegistrationNo: string;
  umraLicenseNo: string; // Uganda Microfinance Regulatory Authority license
}

export interface Tenant {
  id: string;
  legalName: string;
  displayName: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial';
  timezone: string;
  defaultCurrency: 'UGX' | 'USD';
  planName: 'Starter' | 'Growth Pro' | 'Enterprise SACCO';
  maxBranches: number;
  maxUsers: number;
  branding: TenantBranding;
  registeredAddress: string;
  supportPhone: string;
  fiscalYear?: TenantFiscalYear;
  penaltyRules?: TenantPenaltyRules;
  mfaEnforced?: boolean;
  allowedMfaMethods?: MFAMethod[];
  tinNumber?: string;
  incorporationNo?: string;
  officialEmail?: string;
}

export interface UMRAComplianceItem {
  id: string;
  category: 'monthly' | 'quarterly' | 'annual';
  formCode: string;
  title: string;
  description: string;
  legalBasis: string;
  dueDateDescription: string;
  frequency: 'Monthly' | 'Quarterly' | 'Annual';
  status: 'completed' | 'in_progress' | 'pending' | 'overdue';
  lastFiledDate?: string;
  assignedOfficer: string;
  referenceUrl?: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  managerName: string;
  status: 'active' | 'inactive';
}

export interface AppUser {
  id: string;
  tenantId?: string;
  branchId?: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  phone?: string;
  role: UserRole;
  approvalLimitUGX: number;
  mfaEnabled: boolean;
  status: 'active' | 'disabled' | 'pending_activation';
  preferredMfaMethod?: MFAMethod;
  mfaEnforcedByCompany?: boolean;
  assignedCompanyIds?: string[];
  borrowerProfileId?: string;
  lastLoginAt?: string;
  failedMfaAttempts?: number;
  lockedUntil?: string | null;
  avatarUrl?: string;
}

export interface CustomerKYC {
  idType: 'NIN' | 'Passport' | 'DriverLicense' | 'VoterCard';
  idNumberMasked: string;
  idNumberEncrypted?: string;
  verifiedAt: string;
  verificationStatus: 'verified' | 'pending' | 'flagged';
  dateOfBirth: string;
  gender: 'Female' | 'Male' | 'Other';
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  residenceTown: string;
  residenceDistrict: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  branchId: string;
  customerNo: string;
  type: 'individual' | 'business' | 'group';
  fullName: string;
  phone: string;
  email?: string;
  businessName?: string;
  occupation: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  creditScoreRating: 'A' | 'B' | 'C' | 'D';
  kyc: CustomerKYC;
  status: 'active' | 'blocked' | 'dormant';
  createdAt: string;
  documents?: CustomerDocument[];
}

export type DocumentCategory =
  | 'national_id_front'
  | 'national_id_back'
  | 'passport_photo'
  | 'collateral_proof'
  | 'loan_security'
  | 'guarantor_form'
  | 'utility_bill'
  | 'business_license'
  | 'digital_signature'
  | 'other';

export type DocumentVerificationStatus = 'verified' | 'pending' | 'rejected';

export interface CustomerDocument {
  id: string;
  customerId: string;
  tenantId: string;
  category: DocumentCategory;
  title: string;
  documentNumber?: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  verificationStatus: DocumentVerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  expiryDate?: string;
  notes?: string;
  tags?: string[];
}

export interface LoanProduct {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  currency: 'UGX';
  interestMethod: 'flat' | 'reducing_balance';
  annualRatePercent: number;
  minPrincipal: number;
  maxPrincipal: number;
  minTermMonths: number;
  maxTermMonths: number;
  processingFeePercent: number;
  insuranceFeePercent: number;
  penaltyLateDailyPercent: number;
  description: string;
  status: 'active' | 'archived';
}

export interface LoanApplication {
  id: string;
  tenantId: string;
  branchId: string;
  applicationNo: string;
  customerId: string;
  productId: string;
  requestedAmount: number;
  requestedTermMonths: number;
  purpose: string;
  guarantorCustomerId?: string;
  collateralDescription: string;
  collateralEstimatedValue: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  submittedByUserId: string;
  reviewedByUserId?: string;
  approvalNotes?: string;
  submittedAt: string;
  decisionAt?: string;
}

export interface LoanInstallment {
  installmentNo: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  feesDue: number;
  totalDue: number;
  remainingPrincipal: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  paidPrincipal: number;
  paidInterest: number;
  paidFees: number;
  paidAt?: string;
}

export interface Loan {
  id: string;
  tenantId: string;
  branchId: string;
  loanNo: string;
  applicationId: string;
  customerId: string;
  productId: string;
  currency: 'UGX';
  principalApproved: number;
  interestRateAnnual: number;
  interestMethod: 'flat' | 'reducing_balance';
  termMonths: number;
  disbursedAmount: number;
  disbursedAt: string;
  disbursementChannel: 'MTN Mobile Money' | 'Airtel Money' | 'Stanbic Bank' | 'Cash Till';
  disbursementRef: string;
  maturityDate: string;
  totalInterestExpected: number;
  totalFeesCharged: number;
  totalPaidPrincipal: number;
  totalPaidInterest: number;
  totalPaidFees: number;
  totalPaidPenalties: number;
  principalOutstanding: number;
  interestAccruedOutstanding: number;
  feesOutstanding: number;
  penaltiesOutstanding: number;
  daysPastDue: number;
  status: 'active' | 'in_arrears' | 'settled' | 'written_off' | 'rescheduled';
  schedule: LoanInstallment[];
}

export interface PaymentReceipt {
  id: string;
  tenantId: string;
  branchId: string;
  receiptNo: string;
  customerId: string;
  loanId?: string;
  savingsAccountId?: string;
  amount: number;
  currency: 'UGX';
  channel: 'MTN Mobile Money' | 'Airtel Money' | 'Bank Transfer' | 'Cash Till';
  externalReference: string;
  idempotencyKey: string;
  principalAllocated: number;
  interestAllocated: number;
  feeAllocated: number;
  penaltyAllocated: number;
  unallocatedSuspense: number;
  receivedByUserId: string;
  postedAt: string;
  status: 'posted' | 'reversed';
  reversalReason?: string;
  reversedByUserId?: string;
  reversedAt?: string;
}

export interface RecoveryCase {
  id: string;
  tenantId: string;
  branchId: string;
  loanId: string;
  customerId: string;
  assignedOfficerId: string;
  daysPastDue: number;
  totalArrearsUGX: number;
  status: 'active_followup' | 'promise_to_pay' | 'legal_escalation' | 'resolved';
  nextActionDate: string;
  lastContactOutcome: string;
  notesCount: number;
  promisesToPay: Array<{
    id: string;
    promisedDate: string;
    promisedAmount: number;
    status: 'fulfilled' | 'broken' | 'pending';
    recordedAt: string;
  }>;
}

export interface SavingsAccount {
  id: string;
  tenantId: string;
  branchId: string;
  accountNo: string;
  customerId: string;
  productType: 'Voluntary Savings' | 'Fixed Deposit' | 'Group VSLA Pool';
  currentBalance: number;
  lockedGuaranteeAmount: number;
  availableBalance: number;
  interestRateAnnual: number;
  status: 'active' | 'dormant' | 'frozen';
  openedAt: string;
}

export interface SavingsTransaction {
  id: string;
  tenantId: string;
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'interest_credit' | 'fee_charge';
  amount: number;
  channel: string;
  reference: string;
  balanceAfter: number;
  postedByUserId: string;
  postedAt: string;
}

export interface ShareAccount {
  id: string;
  tenantId: string;
  customerId: string;
  accountNo: string;
  unitsHeld: number;
  unitPriceUGX: number;
  totalValueUGX: number;
  dividendEarnedUGX: number;
  status: 'active';
  joinedAt: string;
}

export interface ChartAccount {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  currentBalance: number;
  currency: 'UGX';
  description: string;
}

export interface JournalLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  journalNo: string;
  effectiveDate: string;
  sourceType: 'disbursement' | 'repayment' | 'reversal' | 'expense' | 'savings_deposit' | 'share_capital' | 'manual' | 'adjustment';
  sourceReference: string;
  description: string;
  lines: JournalLine[];
  postedByUserId: string;
  postedAt: string;
  isBalanced: boolean;
}

export interface ExpenseItem {
  id: string;
  tenantId: string;
  branchId: string;
  expenseNo: string;
  category: 'Rent & Premises' | 'Field Operations & Fuel' | 'Staff Welfare & Meals' | 'Telecoms & SMS' | 'Office Supplies & Print' | 'Software & IT' | 'Legal & UMRA Fees';
  vendor: string;
  amount: number;
  currency: 'UGX';
  channel: 'Petty Cash' | 'Bank Transfer' | 'MTN MoMo Business';
  referenceNo: string;
  expenseDate: string;
  approvedByUserId: string;
  notes: string;
  hasReceiptAttachment: boolean;
  budgetCategoryKey: string;
}

export interface ExpenseBudget {
  categoryKey: string;
  categoryName: string;
  monthlyBudgetUGX: number;
  spentUGX: number;
  color: string;
  iconName: string;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'LOAN' | 'PAYMENT' | 'CUSTOMER' | 'SAVINGS' | 'EXPENSE' | 'JOURNAL' | 'REVERSAL' | 'APPROVAL' | 'ASSET';
  entityId: string;
  summary: string;
  ipAddress: string;
  timestamp: string;
}

export interface FixedAsset {
  id: string;
  tenantId: string;
  branchId: string;
  assetNo: string;
  name: string;
  category: 'Motor Vehicles' | 'Office Equipment' | 'Computer Hardware' | 'Furniture & Fittings' | 'Solar Power Systems';
  purchaseCostUGX: number;
  purchaseDate: string;
  usefulLifeMonths: number;
  depreciationMethod: 'Straight Line';
  accumulatedDepreciationUGX: number;
  currentBookValueUGX: number;
  monthlyDepreciationUGX: number;
  location: string;
  custodian: string;
  status: 'active' | 'disposed' | 'maintenance';
}

export interface PersonalBudgetItem {
  id: string;
  category: string;
  monthlyPlannedUGX: number;
  monthlyActualUGX: number;
  type: 'income' | 'expense' | 'savings_goal';
  notes: string;
}

// -------------------------------------------------------------
// Multi-Tenant User Management & Invitations
// -------------------------------------------------------------
export interface CompanyInvitation {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  phone?: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  invitationCode: string;
  invitedByUserName: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface CompanyRegistrationPayload {
  companyName: string;
  legalName: string;
  regNo: string;
  tin: string;
  umraLicenseNo: string;
  businessAddress: string;
  city: string;
  phone: string;
  email: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  defaultCurrency: 'UGX' | 'USD';
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  planName: 'Starter' | 'Growth Pro' | 'Enterprise SACCO';
  enforceMFA: boolean;
}

// -------------------------------------------------------------
// Central Borrower Self-Service Identity & Portal
// -------------------------------------------------------------
export interface BorrowerAccount {
  id: string;
  userId: string;
  borrowerNo: string;
  fullName: string;
  nin: string;
  ninMasked: string;
  email: string;
  phone: string;
  dob: string;
  gender: 'Female' | 'Male' | 'Other';
  residenceTown: string;
  residenceDistrict: string;
  occupation: string;
  monthlyIncomeUGX: number;
  monthlyExpensesUGX: number;
  creditScore: number; // 300 - 850
  creditRating: 'Excellent' | 'Good' | 'Moderate' | 'High Risk' | 'Insufficient';
  status: 'active' | 'under_review' | 'restricted';
  registeredAt: string;
  mfaEnabled: boolean;
  preferredMfaMethod: MFAMethod;
}

export interface BorrowerDirectApplication {
  id: string;
  applicationNo: string;
  tenantId: string; // Target lending company
  tenantName: string;
  borrowerId: string; // Central borrower id
  borrowerName: string;
  borrowerPhone: string;
  borrowerEmail: string;
  borrowerNin: string;
  productId: string;
  productName: string;
  requestedAmountUGX: number;
  requestedTermMonths: number;
  purpose: string;
  repaymentFrequency: 'monthly' | 'weekly';
  supportingDocuments: Array<{
    id: string;
    title: string;
    category: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  submittedAt: string;
  decisionAt?: string;
  decisionNotes?: string;
  disbursedLoanId?: string;
}

// -------------------------------------------------------------
// Cross-Company Shared Credit Intelligence Bureau Layer
// -------------------------------------------------------------
export interface CreditReview {
  id: string;
  borrowerNin: string;
  borrowerName: string;
  reviewingTenantId: string;
  reviewingTenantName: string;
  loanRef: string;
  loanAmountUGX: number;
  repaymentStatus: 'fully_settled' | 'performing_on_time' | 'slow_payer_resolved' | 'contractual_default';
  outstandingBalanceUGX: number;
  delayedPaymentsCount: number;
  defaultHistoryVerified: boolean;
  paymentConsistencyScore: number; // 1 - 100
  reviewDate: string;
  reviewerName: string;
  reviewerRole: string;
  supportingEvidenceSummary: string;
  status: 'verified' | 'disputed' | 'resolved';
  disputeId?: string;
}

export interface CreditDispute {
  id: string;
  creditReviewId: string;
  borrowerId: string;
  borrowerName: string;
  borrowerNin: string;
  reviewingTenantName: string;
  disputeReason: string;
  borrowerExplanation: string;
  supportingEvidenceNotes: string;
  status: 'pending' | 'under_investigation' | 'upheld_corrected' | 'dismissed';
  filedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface CreditRiskAssessment {
  score: number; // 300 to 850
  category: 'Excellent' | 'Good' | 'Moderate' | 'High Risk' | 'Insufficient';
  badgeColor: string;
  repaymentConsistencyPercent: number;
  totalKnownActiveObligationsUGX: number;
  totalSettledLoansCount: number;
  activeDefaultCount: number;
  estimatedDefaultProbabilityPercent: number;
  recommendation: string;
}

// -------------------------------------------------------------
// Multi-Channel Notifications & Communications
// -------------------------------------------------------------
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';

export interface SystemNotification {
  id: string;
  tenantId?: string; // Optional if platform-level or borrower-level
  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  type:
    | 'mfa_otp'
    | 'user_invitation'
    | 'company_registration'
    | 'loan_application'
    | 'loan_decision'
    | 'repayment_reminder'
    | 'arrears_alert'
    | 'credit_review'
    | 'credit_dispute'
    | 'security_alert';
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// -------------------------------------------------------------
// Granular Role-Based Access Control (RBAC) Permissions
// -------------------------------------------------------------
export type SystemPermission =
  | 'MANAGE_PLATFORM'
  | 'MANAGE_ALL_TENANTS'
  | 'MANAGE_COMPANY_SETTINGS'
  | 'MANAGE_USERS'
  | 'INVITE_USERS'
  | 'VIEW_BORROWERS'
  | 'CREATE_BORROWER'
  | 'ORIGINATE_LOAN'
  | 'APPROVE_LOAN'
  | 'DISBURSE_LOAN'
  | 'RECEIVE_PAYMENTS'
  | 'REVERSE_PAYMENTS'
  | 'MANAGE_COLLECTIONS'
  | 'MANAGE_EXPENSES'
  | 'VIEW_FINANCIAL_REPORTS'
  | 'POST_JOURNAL_ENTRIES'
  | 'SUBMIT_CREDIT_REVIEW'
  | 'QUERY_CREDIT_BUREAU'
  | 'VIEW_AUDIT_LOGS'
  | 'APPLY_FOR_LOAN'
  | 'VIEW_OWN_CREDIT_REPORT'
  | 'DISPUTE_CREDIT_REVIEW';

export const ROLE_PERMISSIONS: Record<UserRole, SystemPermission[]> = {
  PLATFORM_SUPER_ADMIN: [
    'MANAGE_PLATFORM',
    'MANAGE_ALL_TENANTS',
    'VIEW_AUDIT_LOGS',
    'QUERY_CREDIT_BUREAU',
    'VIEW_BORROWERS',
  ],
  PLATFORM_ADMIN: [
    'MANAGE_PLATFORM',
    'MANAGE_ALL_TENANTS',
    'VIEW_AUDIT_LOGS',
    'QUERY_CREDIT_BUREAU',
  ],
  COMPANY_OWNER: [
    'MANAGE_COMPANY_SETTINGS',
    'MANAGE_USERS',
    'INVITE_USERS',
    'VIEW_BORROWERS',
    'CREATE_BORROWER',
    'ORIGINATE_LOAN',
    'APPROVE_LOAN',
    'DISBURSE_LOAN',
    'RECEIVE_PAYMENTS',
    'REVERSE_PAYMENTS',
    'MANAGE_COLLECTIONS',
    'MANAGE_EXPENSES',
    'VIEW_FINANCIAL_REPORTS',
    'POST_JOURNAL_ENTRIES',
    'SUBMIT_CREDIT_REVIEW',
    'QUERY_CREDIT_BUREAU',
    'VIEW_AUDIT_LOGS',
  ],
  TENANT_OWNER: [
    'MANAGE_COMPANY_SETTINGS',
    'MANAGE_USERS',
    'INVITE_USERS',
    'VIEW_BORROWERS',
    'CREATE_BORROWER',
    'ORIGINATE_LOAN',
    'APPROVE_LOAN',
    'DISBURSE_LOAN',
    'RECEIVE_PAYMENTS',
    'REVERSE_PAYMENTS',
    'MANAGE_COLLECTIONS',
    'MANAGE_EXPENSES',
    'VIEW_FINANCIAL_REPORTS',
    'POST_JOURNAL_ENTRIES',
    'SUBMIT_CREDIT_REVIEW',
    'QUERY_CREDIT_BUREAU',
    'VIEW_AUDIT_LOGS',
  ],
  COMPANY_ADMIN: [
    'MANAGE_COMPANY_SETTINGS',
    'MANAGE_USERS',
    'INVITE_USERS',
    'VIEW_BORROWERS',
    'CREATE_BORROWER',
    'ORIGINATE_LOAN',
    'APPROVE_LOAN',
    'RECEIVE_PAYMENTS',
    'MANAGE_COLLECTIONS',
    'VIEW_FINANCIAL_REPORTS',
    'SUBMIT_CREDIT_REVIEW',
    'QUERY_CREDIT_BUREAU',
    'VIEW_AUDIT_LOGS',
  ],
  BRANCH_MANAGER: [
    'VIEW_BORROWERS',
    'CREATE_BORROWER',
    'ORIGINATE_LOAN',
    'APPROVE_LOAN',
    'RECEIVE_PAYMENTS',
    'MANAGE_COLLECTIONS',
    'VIEW_FINANCIAL_REPORTS',
    'SUBMIT_CREDIT_REVIEW',
    'QUERY_CREDIT_BUREAU',
  ],
  LOAN_OFFICER: [
    'VIEW_BORROWERS',
    'CREATE_BORROWER',
    'ORIGINATE_LOAN',
    'QUERY_CREDIT_BUREAU',
  ],
  CREDIT_OFFICER: [
    'VIEW_BORROWERS',
    'ORIGINATE_LOAN',
    'APPROVE_LOAN',
    'SUBMIT_CREDIT_REVIEW',
    'QUERY_CREDIT_BUREAU',
  ],
  CASHIER_ACCOUNTANT: [
    'RECEIVE_PAYMENTS',
    'REVERSE_PAYMENTS',
    'MANAGE_EXPENSES',
    'POST_JOURNAL_ENTRIES',
    'VIEW_FINANCIAL_REPORTS',
  ],
  CASHIER_TELLER: [
    'RECEIVE_PAYMENTS',
    'REVERSE_PAYMENTS',
  ],
  ACCOUNTANT: [
    'RECEIVE_PAYMENTS',
    'REVERSE_PAYMENTS',
    'MANAGE_EXPENSES',
    'POST_JOURNAL_ENTRIES',
    'VIEW_FINANCIAL_REPORTS',
  ],
  SAVINGS_OFFICER: [
    'RECEIVE_PAYMENTS',
    'VIEW_BORROWERS',
  ],
  RECOVERY_OFFICER: [
    'MANAGE_COLLECTIONS',
    'VIEW_BORROWERS',
    'SUBMIT_CREDIT_REVIEW',
  ],
  AUDITOR: [
    'VIEW_AUDIT_LOGS',
    'VIEW_FINANCIAL_REPORTS',
    'VIEW_BORROWERS',
  ],
  BORROWER: [
    'APPLY_FOR_LOAN',
    'VIEW_OWN_CREDIT_REPORT',
    'DISPUTE_CREDIT_REVIEW',
  ],
};

export function hasPermission(role: UserRole, permission: SystemPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}


