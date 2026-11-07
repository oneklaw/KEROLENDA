import React, { useState, useEffect } from 'react';
import {
  Tenant,
  Branch,
  AppUser,
  Customer,
  LoanProduct,
  Loan,
  PaymentReceipt,
  RecoveryCase,
  SavingsAccount,
  SavingsTransaction,
  ShareAccount,
  ChartAccount,
  JournalEntry,
  ExpenseItem,
  ExpenseBudget,
  FixedAsset,
  PersonalBudgetItem,
  AuditEvent,
  CustomerDocument,
  DocumentVerificationStatus,
  OperatingEnvironment,
  CompanyInvitation,
  CompanyRegistrationPayload,
  BorrowerAccount,
  BorrowerDirectApplication,
  CreditReview,
  CreditDispute,
  SystemNotification,
  UserRole,
} from './types';
import {
  SEED_TENANTS,
  SEED_BRANCHES,
  SEED_USERS,
  SEED_CUSTOMERS,
  SEED_LOAN_PRODUCTS,
  SEED_LOANS,
  SEED_PAYMENTS,
  SEED_RECOVERY_CASES,
  SEED_SAVINGS_ACCOUNTS,
  SEED_SAVINGS_TXS,
  SEED_SHARE_ACCOUNTS,
  SEED_CHART_OF_ACCOUNTS,
  SEED_JOURNAL_ENTRIES,
  SEED_EXPENSES,
  SEED_EXPENSE_BUDGETS,
  SEED_FIXED_ASSETS,
  SEED_PERSONAL_BUDGET,
  SEED_AUDIT_LOGS,
} from './data/seedData';
import {
  ADDITIONAL_TENANTS,
  ADDITIONAL_USERS,
  SEED_BORROWERS,
  SEED_BORROWER_APPLICATIONS,
  SEED_CREDIT_REVIEWS,
  SEED_CREDIT_DISPUTES,
  SEED_INVITATIONS,
  SEED_NOTIFICATIONS,
} from './data/saasSeedData';
import { SEED_CUSTOMER_DOCUMENTS } from './data/seedDocuments';
import { calculateSchedule, allocatePayment } from './utils/finance';
import {
  findUpcomingInstallments,
  generateInstallmentReminderNotifications,
} from './utils/installmentReminderService';

import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LoansView } from './components/LoansView';
import { CashierTerminalView } from './components/CashierTerminalView';
import { CollectionsView } from './components/CollectionsView';
import { ExpensesBudgetView } from './components/ExpensesBudgetView';
import { SavingsSharesView } from './components/SavingsSharesView';
import { AccountingView } from './components/AccountingView';
import { CustomersView } from './components/CustomersView';
import { AuditView } from './components/AuditView';
import { LoanOriginationModal } from './components/LoanOriginationModal';
import { ReceiptModal } from './components/ReceiptModal';
import { TenantSettingsModal } from './components/TenantSettingsModal';
import { AuthModal } from './components/AuthModal';
import { BorrowerPortalView } from './components/BorrowerPortalView';
import { PlatformAdminView } from './components/PlatformAdminView';
import { CompanyUsersView } from './components/CompanyUsersView';
import { CreditBureauModal } from './components/CreditBureauModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';

import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  AlertTriangle,
  Wallet,
  PiggyBank,
  BookOpen,
  Users,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export default function App() {
  // Operating Environment: Platform Admin | Company Lending Workspace | Borrower Self-Service Portal
  const [operatingEnvironment, setOperatingEnvironment] =
    useState<OperatingEnvironment>('lending_workspace');

  // SaaS Multi-Tenant & RBAC State
  const [tenants, setTenants] = useState<Tenant[]>([...SEED_TENANTS, ...ADDITIONAL_TENANTS]);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(SEED_TENANTS[0]);

  const [branches, setBranches] = useState<Branch[]>(SEED_BRANCHES);
  const [currentBranch, setCurrentBranch] = useState<Branch>(SEED_BRANCHES[0]);

  const [users, setUsers] = useState<AppUser[]>([...SEED_USERS, ...ADDITIONAL_USERS]);
  const [currentUser, setCurrentUser] = useState<AppUser>(SEED_USERS[0]);

  // Mandatory Authentication Gate: User must first login before accessing the system!
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Central Borrower Portal Identities & Multi-Company Applications
  const [borrowers, setBorrowers] = useState<BorrowerAccount[]>(SEED_BORROWERS);
  const [currentBorrower, setCurrentBorrower] = useState<BorrowerAccount>(SEED_BORROWERS[0]);
  const [borrowerApplications, setBorrowerApplications] = useState<BorrowerDirectApplication[]>(
    SEED_BORROWER_APPLICATIONS
  );

  // Cross-Company Shared Credit Intelligence Bureau Layer
  const [creditReviews, setCreditReviews] = useState<CreditReview[]>(SEED_CREDIT_REVIEWS);
  const [creditDisputes, setCreditDisputes] = useState<CreditDispute[]>(SEED_CREDIT_DISPUTES);

  // User Management Invitations & Multi-Channel Notifications
  const [invitations, setInvitations] = useState<CompanyInvitation[]>(SEED_INVITATIONS);
  const [notifications, setNotifications] = useState<SystemNotification[]>(SEED_NOTIFICATIONS);

  // Active Navigation Tab for Company Lending Workspace
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'loans'
    | 'teller'
    | 'collections'
    | 'expenses'
    | 'savings'
    | 'accounting'
    | 'customers'
    | 'users'
    | 'audit'
  >('dashboard');

  // Core Data Collections
  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>(SEED_LOAN_PRODUCTS);
  const [loans, setLoans] = useState<Loan[]>(SEED_LOANS);
  const [payments, setPayments] = useState<PaymentReceipt[]>(SEED_PAYMENTS);
  const [recoveryCases, setRecoveryCases] = useState<RecoveryCase[]>(SEED_RECOVERY_CASES);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>(SEED_SAVINGS_ACCOUNTS);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>(SEED_SAVINGS_TXS);
  const [shareAccounts, setShareAccounts] = useState<ShareAccount[]>(SEED_SHARE_ACCOUNTS);
  const [accounts, setAccounts] = useState<ChartAccount[]>(SEED_CHART_OF_ACCOUNTS);
  const [journals, setJournals] = useState<JournalEntry[]>(SEED_JOURNAL_ENTRIES);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(SEED_EXPENSES);
  const [budgets, setBudgets] = useState<ExpenseBudget[]>(SEED_EXPENSE_BUDGETS);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(SEED_FIXED_ASSETS);
  const [personalBudget, setPersonalBudget] = useState<PersonalBudgetItem[]>(SEED_PERSONAL_BUDGET);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(SEED_AUDIT_LOGS);
  const [customerDocuments, setCustomerDocuments] = useState<CustomerDocument[]>(SEED_CUSTOMER_DOCUMENTS);

  // Automated 3-Day Repayment Reminder Scheduler State (SMS & Email)
  const [schedulerSimulatedDate, setSchedulerSimulatedDate] = useState<string>('2026-11-03');
  const [lastReminderScanResult, setLastReminderScanResult] = useState<{
    dispatchedCount: number;
    skippedCount: number;
    scannedDate: string;
  } | null>(null);

  const runInstallmentReminderScan = (refDate: string = schedulerSimulatedDate) => {
    const matches = findUpcomingInstallments(loans, customers, refDate, 3);
    const { newNotifications, skippedCount } = generateInstallmentReminderNotifications(
      matches,
      notifications,
      currentTenant.displayName || 'KEROLENDA Microfinance',
      new Date().toISOString()
    );

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
    }

    setLastReminderScanResult({
      dispatchedCount: newNotifications.length,
      skippedCount,
      scannedDate: refDate,
    });
  };

  useEffect(() => {
    runInstallmentReminderScan(schedulerSimulatedDate);
  }, [loans, customers, schedulerSimulatedDate]);

  // Modals & Interactive Overlays
  const [showLoanOrigination, setShowLoanOrigination] = useState(false);
  const [showTenantSettingsModal, setShowTenantSettingsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreditBureauModal, setShowCreditBureauModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [activeReceiptModal, setActiveReceiptModal] = useState<PaymentReceipt | null>(null);
  const [selectedQuickLoan, setSelectedQuickLoan] = useState<Loan | null>(null);

  // Save updated tenant branding and configurations
  const handleSaveTenant = (updatedTenant: Tenant) => {
    setCurrentTenant(updatedTenant);
    setTenants((prev) => prev.map((t) => (t.id === updatedTenant.id ? updatedTenant : t)));
    logAudit(
      'UPDATE_TENANT_SETTINGS',
      'CUSTOMER',
      updatedTenant.id,
      `Updated settings for ${updatedTenant.displayName}: primary color ${updatedTenant.branding?.primaryColor}, fiscal year ${updatedTenant.fiscalYear?.title}, grace period ${updatedTenant.penaltyRules?.gracePeriodDays} days.`
    );
  };

  // Switch Tenant Handler
  const handleSelectTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    const tenantBranch = branches.find((b) => b.tenantId === tenant.id) || branches[0];
    setCurrentBranch(tenantBranch);
    const tenantUser = users.find((u) => u.tenantId === tenant.id) || users[0];
    setCurrentUser(tenantUser);
  };

  // Switch Branch Handler
  const handleSelectBranch = (branch: Branch) => {
    setCurrentBranch(branch);
  };

  // Switch User Persona Handler
  const handleSelectUser = (user: AppUser) => {
    setCurrentUser(user);
  };

  // Helper: Append to Audit Log
  const logAudit = (
    action: string,
    entityType: AuditEvent['entityType'],
    entityId: string,
    summary: string
  ) => {
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      tenantId: currentTenant.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action,
      entityType,
      entityId,
      summary,
      ipAddress: '197.239.4.12',
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newEvent, ...prev]);
  };

  // 1. Post Repayment (Cashier / Teller)
  const handlePostPayment = (paymentData: {
    loanId: string;
    customerId: string;
    amount: number;
    channel: PaymentReceipt['channel'];
    externalReference: string;
    tenantId?: string;
    branchId?: string;
    currency?: string;
  }): PaymentReceipt => {
    const loan = loans.find((l) => l.id === paymentData.loanId);
    if (!loan) throw new Error('Loan not found');

    const allocation = allocatePayment(
      paymentData.amount,
      loan.penaltiesOutstanding,
      loan.feesOutstanding,
      loan.interestAccruedOutstanding,
      loan.principalOutstanding
    );

    const receiptNo = `RCPT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const newReceipt: PaymentReceipt = {
      id: `rcpt-${Date.now()}`,
      tenantId: paymentData.tenantId || loan.tenantId || currentTenant.id,
      branchId: paymentData.branchId || loan.branchId || currentBranch.id,
      receiptNo,
      customerId: paymentData.customerId,
      loanId: paymentData.loanId,
      amount: paymentData.amount,
      currency: 'UGX',
      channel: paymentData.channel,
      externalReference: paymentData.externalReference,
      idempotencyKey: `IDEMP-${Date.now()}`,
      principalAllocated: allocation.principalPaid,
      interestAllocated: allocation.interestPaid,
      feeAllocated: allocation.feePaid,
      penaltyAllocated: allocation.penaltyPaid,
      unallocatedSuspense: allocation.unallocated,
      receivedByUserId: currentUser.id,
      postedAt: new Date().toISOString(),
      status: 'posted',
    };

    // Update Loan Balances & Amortization Schedule
    const updatedLoan: Loan = {
      ...loan,
      principalOutstanding: allocation.remainingPrincipal,
      interestAccruedOutstanding: allocation.remainingInterest,
      feesOutstanding: allocation.remainingFee,
      penaltiesOutstanding: allocation.remainingPenalty,
      totalPaidPrincipal: loan.totalPaidPrincipal + allocation.principalPaid,
      totalPaidInterest: loan.totalPaidInterest + allocation.interestPaid,
      totalPaidFees: loan.totalPaidFees + allocation.feePaid,
      totalPaidPenalties: loan.totalPaidPenalties + allocation.penaltyPaid,
      status: allocation.remainingPrincipal <= 0 ? 'settled' : loan.status,
      schedule: loan.schedule.map((inst, idx) => {
        if (inst.status !== 'paid' && idx < 4) {
          return {
            ...inst,
            status: 'paid',
            paidPrincipal: inst.principalDue,
            paidInterest: inst.interestDue,
            paidFees: inst.feesDue,
            paidAt: new Date().toISOString(),
          };
        }
        return inst;
      }),
    };

    setLoans((prev) => prev.map((l) => (l.id === loan.id ? updatedLoan : l)));
    setPayments((prev) => [newReceipt, ...prev]);

    // Automatically post balanced Double-Entry Journal Entry
    const newJournal: JournalEntry = {
      id: `je-${Date.now()}`,
      tenantId: currentTenant.id,
      journalNo: `JRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      effectiveDate: new Date().toISOString().split('T')[0],
      sourceType: 'repayment',
      sourceReference: receiptNo,
      description: `Collection receipt ${receiptNo} for loan ${loan.loanNo}`,
      lines: [
        {
          accountId: paymentData.channel.includes('MoMo') ? 'acc-1010' : paymentData.channel.includes('Bank') ? 'acc-1020' : 'acc-1000',
          accountCode: paymentData.channel.includes('MoMo') ? '1010' : paymentData.channel.includes('Bank') ? '1020' : '1000',
          accountName: paymentData.channel,
          debit: paymentData.amount,
          credit: 0,
          description: `Funds received via ${paymentData.channel}`,
        },
        {
          accountId: 'acc-1200',
          accountCode: '1200',
          accountName: 'Loans Receivable - Principal',
          debit: 0,
          credit: allocation.principalPaid,
          description: 'Principal reduction',
        },
        {
          accountId: 'acc-4000',
          accountCode: '4000',
          accountName: 'Interest Income on Loans',
          debit: 0,
          credit: allocation.interestPaid,
          description: 'Interest earned',
        },
      ],
      postedByUserId: currentUser.id,
      postedAt: new Date().toISOString(),
      isBalanced: true,
    };
    setJournals((prev) => [newJournal, ...prev]);

    // Update Cash / Asset Account Balances
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.code === '1000' && paymentData.channel === 'Cash Till') {
          return { ...acc, currentBalance: acc.currentBalance + paymentData.amount };
        }
        if (acc.code === '1010' && paymentData.channel.includes('Money')) {
          return { ...acc, currentBalance: acc.currentBalance + paymentData.amount };
        }
        if (acc.code === '1020' && paymentData.channel === 'Bank Transfer') {
          return { ...acc, currentBalance: acc.currentBalance + paymentData.amount };
        }
        if (acc.code === '1200') {
          return { ...acc, currentBalance: Math.max(0, acc.currentBalance - allocation.principalPaid) };
        }
        if (acc.code === '4000') {
          return { ...acc, currentBalance: acc.currentBalance + allocation.interestPaid };
        }
        return acc;
      })
    );

    // Audit Log
    logAudit(
      'POST_REPAYMENT',
      'PAYMENT',
      receiptNo,
      `Posted repayment UGX ${paymentData.amount.toLocaleString()} for loan ${loan.loanNo}. Principal: UGX ${allocation.principalPaid.toLocaleString()}, Interest: UGX ${allocation.interestPaid.toLocaleString()}.`
    );

    return newReceipt;
  };

  // 2. Reverse Payment (Compensating Entry)
  const handleReversePayment = (receiptId: string, reason: string) => {
    const receipt = payments.find((p) => p.id === receiptId);
    if (!receipt || receipt.status === 'reversed') return;

    // Mark receipt reversed
    setPayments((prev) =>
      prev.map((p) =>
        p.id === receiptId
          ? {
              ...p,
              status: 'reversed',
              reversalReason: reason,
              reversedByUserId: currentUser.id,
              reversedAt: new Date().toISOString(),
            }
          : p
      )
    );

    // Restore Loan Balance
    if (receipt.loanId) {
      setLoans((prev) =>
        prev.map((l) =>
          l.id === receipt.loanId
            ? {
                ...l,
                principalOutstanding: l.principalOutstanding + receipt.principalAllocated,
                status: 'in_arrears',
              }
            : l
        )
      );
    }

    // Post Compensating Reversal Journal
    const reversalJournal: JournalEntry = {
      id: `je-rev-${Date.now()}`,
      tenantId: currentTenant.id,
      journalNo: `JRN-REV-${Math.floor(1000 + Math.random() * 9000)}`,
      effectiveDate: new Date().toISOString().split('T')[0],
      sourceType: 'reversal',
      sourceReference: receipt.receiptNo,
      description: `Reversal of receipt ${receipt.receiptNo}: ${reason}`,
      lines: [
        {
          accountId: 'acc-1200',
          accountCode: '1200',
          accountName: 'Loans Receivable - Principal',
          debit: receipt.principalAllocated,
          credit: 0,
          description: 'Restoration of principal',
        },
        {
          accountId: 'acc-4000',
          accountCode: '4000',
          accountName: 'Interest Income on Loans',
          debit: receipt.interestAllocated,
          credit: 0,
          description: 'Reversal of interest income',
        },
        {
          accountId: 'acc-1000',
          accountCode: '1000',
          accountName: 'Cash Till',
          debit: 0,
          credit: receipt.amount,
          description: 'Compensating outflow',
        },
      ],
      postedByUserId: currentUser.id,
      postedAt: new Date().toISOString(),
      isBalanced: true,
    };
    setJournals((prev) => [reversalJournal, ...prev]);

    logAudit(
      'REVERSE_PAYMENT',
      'REVERSAL',
      receipt.receiptNo,
      `Compensating reversal of receipt ${receipt.receiptNo} authorized. Reason: ${reason}`
    );
  };

  // 3. Add Expense (Real-Time Budget Tracking)
  const handleAddExpense = (newExpenseData: Omit<ExpenseItem, 'id' | 'expenseNo'>) => {
    const expenseNo = `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newExpense: ExpenseItem = {
      ...newExpenseData,
      id: `exp-${Date.now()}`,
      expenseNo,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Update Category Budget in real time
    setBudgets((prev) =>
      prev.map((b) =>
        b.categoryKey === newExpense.category
          ? { ...b, spentUGX: b.spentUGX + newExpense.amount }
          : b
      )
    );

    // Post double entry journal
    const newJournal: JournalEntry = {
      id: `je-exp-${Date.now()}`,
      tenantId: currentTenant.id,
      journalNo: `JRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      effectiveDate: newExpense.expenseDate,
      sourceType: 'expense',
      sourceReference: expenseNo,
      description: `${newExpense.category}: ${newExpense.vendor} (${newExpense.notes})`,
      lines: [
        {
          accountId: 'acc-5000',
          accountCode: '5000',
          accountName: `Operating Expense - ${newExpense.category}`,
          debit: newExpense.amount,
          credit: 0,
          description: newExpense.notes || 'Operating spend',
        },
        {
          accountId: newExpense.channel === 'Petty Cash' ? 'acc-1000' : newExpense.channel.includes('MoMo') ? 'acc-1010' : 'acc-1020',
          accountCode: newExpense.channel === 'Petty Cash' ? '1000' : newExpense.channel.includes('MoMo') ? '1010' : '1020',
          accountName: newExpense.channel,
          debit: 0,
          credit: newExpense.amount,
          description: `Disbursed from ${newExpense.channel}`,
        },
      ],
      postedByUserId: currentUser.id,
      postedAt: new Date().toISOString(),
      isBalanced: true,
    };
    setJournals((prev) => [newJournal, ...prev]);

    // Update Cash Balance
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.code === '1000' && newExpense.channel === 'Petty Cash') {
          return { ...acc, currentBalance: Math.max(0, acc.currentBalance - newExpense.amount) };
        }
        if (acc.code === '1010' && newExpense.channel.includes('MoMo')) {
          return { ...acc, currentBalance: Math.max(0, acc.currentBalance - newExpense.amount) };
        }
        if (acc.code === '1020' && newExpense.channel === 'Bank Transfer') {
          return { ...acc, currentBalance: Math.max(0, acc.currentBalance - newExpense.amount) };
        }
        return acc;
      })
    );

    logAudit(
      'RECORD_EXPENSE',
      'EXPENSE',
      expenseNo,
      `Posted expense UGX ${newExpense.amount.toLocaleString()} for ${newExpense.vendor} [${newExpense.category}] with balanced journal.`
    );
  };

  // 4. Update Budget Category Limit
  const handleUpdateBudget = (categoryKey: string, newLimitUGX: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.categoryKey === categoryKey ? { ...b, monthlyBudgetUGX: newLimitUGX } : b))
    );
    logAudit(
      'UPDATE_BUDGET',
      'EXPENSE',
      categoryKey,
      `Updated monthly budget ceiling for ${categoryKey} to UGX ${newLimitUGX.toLocaleString()}.`
    );
  };

  // 4b. Run Monthly Depreciation for Fixed Assets
  const handleRunMonthlyDepreciation = () => {
    const tenantAssets = fixedAssets.filter((a) => a.tenantId === currentTenant.id && a.status === 'active');
    const totalDepreciation = tenantAssets.reduce((sum, a) => sum + Math.round(a.monthlyDepreciationUGX), 0);
    if (totalDepreciation <= 0) return;

    setFixedAssets((prev) =>
      prev.map((a) => {
        if (a.tenantId !== currentTenant.id || a.status !== 'active') return a;
        const newAccum = a.accumulatedDepreciationUGX + Math.round(a.monthlyDepreciationUGX);
        const newNbv = Math.max(0, a.purchaseCostUGX - newAccum);
        return {
          ...a,
          accumulatedDepreciationUGX: newAccum,
          currentBookValueUGX: newNbv,
        };
      })
    );

    const jrnNo = `JRN-DEP-${Math.floor(1000 + Math.random() * 9000)}`;
    const depJournal: JournalEntry = {
      id: `je-dep-${Date.now()}`,
      tenantId: currentTenant.id,
      journalNo: jrnNo,
      effectiveDate: new Date().toISOString().split('T')[0],
      sourceType: 'adjustment',
      sourceReference: `DEP-${new Date().toISOString().slice(0, 7)}`,
      description: `Monthly Straight-Line Depreciation for ${tenantAssets.length} fixed assets`,
      lines: [
        {
          accountId: 'acc-5400',
          accountCode: '5400',
          accountName: 'Depreciation & Amortization Expense',
          debit: totalDepreciation,
          credit: 0,
          description: 'Fixed asset wear & tear allocation',
        },
        {
          accountId: 'acc-1210',
          accountCode: '1210',
          accountName: 'Accumulated Depreciation - Plant, Equipment & IT',
          debit: 0,
          credit: totalDepreciation,
          description: 'Contra-asset reserve update',
        },
      ],
      postedByUserId: currentUser.id,
      postedAt: new Date().toISOString(),
      isBalanced: true,
    };
    setJournals((prev) => [depJournal, ...prev]);

    logAudit(
      'RUN_DEPRECIATION',
      'ASSET',
      'FIXED_ASSETS',
      `Posted straight-line depreciation of UGX ${totalDepreciation.toLocaleString()} across ${tenantAssets.length} assets.`
    );
  };

  // 4c. Update Personal Budget Item
  const handleUpdatePersonalBudgetItem = (id: string, planned: number, actual: number) => {
    setPersonalBudget((prev) =>
      prev.map((item) => (item.id === id ? { ...item, monthlyPlannedUGX: planned, monthlyActualUGX: actual } : item))
    );
  };

  // 5. Originate New Loan Application & Approval
  const handleOriginateLoan = (applicationData: {
    customerId: string;
    productId: string;
    requestedAmount: number;
    requestedTermMonths: number;
    purpose: string;
    collateralDescription: string;
    collateralEstimatedValue: number;
  }) => {
    const product = loanProducts.find((p) => p.id === applicationData.productId) || loanProducts[0];
    const customer = customers.find((c) => c.id === applicationData.customerId);
    const loanNo = `LN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const scheduleResult = calculateSchedule(
      applicationData.requestedAmount,
      product.annualRatePercent,
      applicationData.requestedTermMonths,
      'monthly',
      product.interestMethod,
      new Date().toISOString().split('T')[0],
      product.processingFeePercent
    );

    const maturity = new Date();
    maturity.setMonth(maturity.getMonth() + applicationData.requestedTermMonths);

    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      tenantId: currentTenant.id,
      branchId: currentBranch.id,
      loanNo,
      applicationId: `app-${Date.now()}`,
      customerId: applicationData.customerId,
      productId: applicationData.productId,
      currency: 'UGX',
      principalApproved: applicationData.requestedAmount,
      interestRateAnnual: product.annualRatePercent,
      interestMethod: product.interestMethod,
      termMonths: applicationData.requestedTermMonths,
      disbursedAmount: applicationData.requestedAmount,
      disbursedAt: new Date().toISOString(),
      disbursementChannel: 'Stanbic Bank',
      disbursementRef: `STB-DISB-${Math.floor(100000 + Math.random() * 900000)}`,
      maturityDate: maturity.toISOString().split('T')[0],
      totalInterestExpected: scheduleResult.totalInterest,
      totalFeesCharged: scheduleResult.totalFees,
      totalPaidPrincipal: 0,
      totalPaidInterest: 0,
      totalPaidFees: 0,
      totalPaidPenalties: 0,
      principalOutstanding: applicationData.requestedAmount,
      interestAccruedOutstanding: 0,
      feesOutstanding: 0,
      penaltiesOutstanding: 0,
      daysPastDue: 0,
      status: 'active',
      schedule: scheduleResult.installments.map((inst) => ({
        ...inst,
        status: 'pending',
        paidPrincipal: 0,
        paidInterest: 0,
        paidFees: 0,
      })),
    };

    setLoans((prev) => [newLoan, ...prev]);

    // Post double entry journal for disbursement
    const disbJournal: JournalEntry = {
      id: `je-disb-${Date.now()}`,
      tenantId: currentTenant.id,
      journalNo: `JRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      effectiveDate: new Date().toISOString().split('T')[0],
      sourceType: 'disbursement',
      sourceReference: loanNo,
      description: `Loan disbursement to ${customer?.fullName} (${loanNo})`,
      lines: [
        {
          accountId: 'acc-1200',
          accountCode: '1200',
          accountName: 'Loans Receivable - Principal',
          debit: applicationData.requestedAmount,
          credit: 0,
          description: 'Loan asset booked',
        },
        {
          accountId: 'acc-1020',
          accountCode: '1020',
          accountName: 'Stanbic Bank Operational Account',
          debit: 0,
          credit: applicationData.requestedAmount,
          description: 'Funds disbursed via bank transfer',
        },
      ],
      postedByUserId: currentUser.id,
      postedAt: new Date().toISOString(),
      isBalanced: true,
    };
    setJournals((prev) => [disbJournal, ...prev]);

    // Update GL account balances
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.code === '1200') {
          return { ...acc, currentBalance: acc.currentBalance + applicationData.requestedAmount };
        }
        if (acc.code === '1020') {
          return { ...acc, currentBalance: Math.max(0, acc.currentBalance - applicationData.requestedAmount) };
        }
        return acc;
      })
    );

    logAudit(
      'APPROVE_AND_DISBURSE',
      'LOAN',
      loanNo,
      `Approved and disbursed ${loanNo} for ${customer?.fullName}: UGX ${applicationData.requestedAmount.toLocaleString()} (${applicationData.requestedTermMonths} months, ${product.name}).`
    );
  };

  // 6. Restructure Loan
  const handleRestructureLoan = (loanId: string, newTermMonths: number, reason: string) => {
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id !== loanId) return l;
        const newSchedule = calculateSchedule(
          l.principalOutstanding,
          l.interestRateAnnual,
          newTermMonths,
          'monthly',
          l.interestMethod,
          new Date().toISOString().split('T')[0],
          0
        );

        const newMaturity = new Date();
        newMaturity.setMonth(newMaturity.getMonth() + newTermMonths);

        return {
          ...l,
          termMonths: newTermMonths,
          maturityDate: newMaturity.toISOString().split('T')[0],
          status: 'rescheduled',
          daysPastDue: 0,
          schedule: newSchedule.installments.map((inst) => ({
            ...inst,
            status: 'pending',
            paidPrincipal: 0,
            paidInterest: 0,
            paidFees: 0,
          })),
        };
      })
    );

    logAudit(
      'RESTRUCTURE_LOAN',
      'LOAN',
      loanId,
      `Approved restructuring of loan. Term adjusted to ${newTermMonths} months. Rationale: ${reason}`
    );
  };

  // 7. Add Customer
  const handleAddCustomer = (customerData: Omit<Customer, 'id' | 'customerNo' | 'createdAt'>) => {
    const customerNo = `CUST-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      customerNo,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);

    logAudit(
      'REGISTER_CUSTOMER',
      'CUSTOMER',
      customerNo,
      `Registered new customer ${newCustomer.fullName}. National ID NIN tokenized and verified.`
    );
  };

  // 7b. Customer Document Management (Scanning, Local Files & Collateral Vault)
  const handleAddCustomerDocument = (docData: Omit<CustomerDocument, 'id' | 'uploadedAt'>) => {
    const newDoc: CustomerDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setCustomerDocuments((prev) => [newDoc, ...prev]);

    logAudit(
      'REGISTER_CUSTOMER',
      'CUSTOMER',
      docData.customerId,
      `Attached ${docData.category} document "${docData.title}" to customer vault.`
    );
  };

  const handleUpdateCustomerDocumentStatus = (
    docId: string,
    status: DocumentVerificationStatus,
    notes?: string
  ) => {
    setCustomerDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              verificationStatus: status,
              verifiedBy: currentUser.name,
              verifiedAt: new Date().toISOString().split('T')[0],
              verificationNotes: notes || d.verificationNotes,
            }
          : d
      )
    );

    logAudit(
      'REGISTER_CUSTOMER',
      'CUSTOMER',
      docId,
      `Document verification status updated to ${status}. Notes: ${notes || 'Verified'}`
    );
  };

  const handleDeleteCustomerDocument = (docId: string) => {
    setCustomerDocuments((prev) => prev.filter((d) => d.id !== docId));
    logAudit(
      'REGISTER_CUSTOMER',
      'CUSTOMER',
      docId,
      `Deleted document attachment ${docId} from customer vault.`
    );
  };

  // -------------------------------------------------------------
  // SaaS Multi-Company Registration, Tenant Isolation, RBAC & MFA
  // -------------------------------------------------------------
  const handleRegisterCompany = (payload: CompanyRegistrationPayload) => {
    const tenantId = `tenant-${Date.now()}`;
    const slug = payload.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newTenant: Tenant = {
      id: tenantId,
      legalName: payload.legalName || `${payload.companyName} Ltd`,
      displayName: payload.companyName,
      slug,
      status: 'active',
      timezone: 'Africa/Kampala',
      defaultCurrency: payload.defaultCurrency,
      planName: payload.planName,
      maxBranches: payload.planName === 'Enterprise SACCO' ? 8 : payload.planName === 'Growth Pro' ? 5 : 2,
      maxUsers: payload.planName === 'Enterprise SACCO' ? 50 : payload.planName === 'Growth Pro' ? 25 : 10,
      branding: {
        primaryColor: payload.primaryColor,
        accentColor: payload.accentColor,
        logoUrl: payload.logoUrl,
        receiptFooter: `Regulated by UMRA • Licensed under Tier 4 Microfinance & Money Lenders Act.`,
        taxRegistrationNo: payload.tin,
        umraLicenseNo: payload.umraLicenseNo,
      },
      registeredAddress: `${payload.businessAddress}, ${payload.city}, Uganda`,
      supportPhone: payload.phone,
      mfaEnforced: payload.enforceMFA,
      allowedMfaMethods: ['email', 'sms', 'whatsapp'],
      tinNumber: payload.tin,
      officialEmail: payload.email,
    };

    const newBranch: Branch = {
      id: `branch-${tenantId}-main`,
      tenantId,
      code: `${slug.slice(0, 3).toUpperCase()}-01`,
      name: `${payload.companyName} Head Office`,
      address: payload.businessAddress,
      city: payload.city,
      phone: payload.phone,
      managerName: payload.adminName,
      status: 'active',
    };

    const newAdminUser: AppUser = {
      id: `user-${Date.now()}-admin`,
      tenantId,
      branchId: newBranch.id,
      name: payload.adminName,
      email: payload.adminEmail,
      phone: payload.adminPhone,
      role: 'COMPANY_OWNER',
      approvalLimitUGX: 100_000_000,
      mfaEnabled: payload.enforceMFA,
      preferredMfaMethod: 'email',
      status: 'active',
    };

    setTenants((prev) => [...prev, newTenant]);
    setBranches((prev) => [...prev, newBranch]);
    setUsers((prev) => [...prev, newAdminUser]);
    setCurrentTenant(newTenant);
    setCurrentBranch(newBranch);
    setCurrentUser(newAdminUser);
    setOperatingEnvironment('lending_workspace');

    logAudit(
      'REGISTER_TENANT',
      'CUSTOMER',
      tenantId,
      `Provisioned new isolated lending company: ${payload.companyName}. Admin: ${payload.adminName} (${payload.adminEmail}).`
    );

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      tenantId,
      channel: 'email',
      title: 'Company Workspace Provisioned',
      message: `Welcome to KEROLENDA! Your company workspace for ${payload.companyName} is active with UMRA compliance tools.`,
      type: 'company_registration',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleRegisterBorrower = (
    data: Omit<BorrowerAccount, 'id' | 'borrowerNo' | 'creditScore' | 'creditRating' | 'registeredAt'>
  ) => {
    const borrowerNo = `BOR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBorrower: BorrowerAccount = {
      ...data,
      id: `bor-${Date.now()}`,
      borrowerNo,
      creditScore: 650,
      creditRating: 'Good',
      registeredAt: new Date().toISOString(),
    };

    const newBorrowerUser: AppUser = {
      id: data.userId,
      tenantId: 'platform',
      branchId: 'global',
      name: data.fullName,
      email: data.email,
      phone: data.phone,
      role: 'BORROWER',
      approvalLimitUGX: 0,
      mfaEnabled: data.mfaEnabled,
      preferredMfaMethod: data.preferredMfaMethod,
      status: 'active',
      borrowerProfileId: newBorrower.id,
    };

    setBorrowers((prev) => [...prev, newBorrower]);
    setCurrentBorrower(newBorrower);
    setUsers((prev) => [...prev, newBorrowerUser]);
    setCurrentUser(newBorrowerUser);
    setOperatingEnvironment('borrower_portal');

    logAudit(
      'REGISTER_BORROWER',
      'CUSTOMER',
      newBorrower.id,
      `Central borrower registered: ${newBorrower.fullName} (NIN: ${newBorrower.ninMasked}).`
    );

    const welcomeNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      recipientUserId: newBorrowerUser.id,
      channel:
        data.preferredMfaMethod === 'whatsapp'
          ? 'whatsapp'
          : data.preferredMfaMethod === 'sms'
          ? 'sms'
          : 'email',
      title: 'Borrower Account Activated',
      message: `Welcome ${data.fullName}! Your central borrower account ${borrowerNo} is active. Discover licensed lenders now.`,
      type: 'company_registration',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [welcomeNotif, ...prev]);
  };

  const handleInviteUser = (
    invitationData: Omit<CompanyInvitation, 'id' | 'invitedAt' | 'expiresAt' | 'status'>
  ) => {
    const newInv: CompanyInvitation = {
      ...invitationData,
      id: `inv-${Date.now()}`,
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: 'pending',
    };
    setInvitations((prev) => [newInv, ...prev]);

    const pendingUser: AppUser = {
      id: `user-${Date.now()}-invited`,
      tenantId: invitationData.tenantId,
      branchId: invitationData.branchId,
      name: invitationData.email.split('@')[0].replace(/[._]/g, ' '),
      email: invitationData.email,
      phone: invitationData.phone || '+256 700 000 000',
      role: invitationData.role,
      approvalLimitUGX: invitationData.role === 'CREDIT_OFFICER' ? 25_000_000 : 5_000_000,
      mfaEnabled: true,
      preferredMfaMethod: 'email',
      status: 'pending_activation',
    };
    setUsers((prev) => [...prev, pendingUser]);

    logAudit(
      'INVITE_USER',
      'CUSTOMER',
      newInv.id,
      `Sent company invitation to ${invitationData.email} as ${invitationData.role}. Invite code: ${newInv.invitationCode}.`
    );

    const invNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      tenantId: invitationData.tenantId,
      channel: 'email',
      title: 'Company Staff Invitation',
      message: `Invitation code ${newInv.invitationCode} generated for ${invitationData.email} to join ${invitationData.tenantName}.`,
      type: 'user_invitation',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [invNotif, ...prev]);
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    logAudit('UPDATE_USER_ROLE', 'CUSTOMER', userId, `Updated user ${userId} role to ${newRole}.`);
  };

  const handleToggleUserStatus = (
    userId: string,
    currentStatus: 'active' | 'disabled' | 'pending_activation'
  ) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)));
    logAudit('TOGGLE_USER_STATUS', 'CUSTOMER', userId, `User ${userId} status changed to ${nextStatus}.`);
  };

  const handleToggleCompanyMfaEnforcement = (tenantId: string, enforce: boolean) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, mfaEnforced: enforce } : t))
    );
    logAudit(
      'ENFORCE_MFA_POLICY',
      'CUSTOMER',
      tenantId,
      `MFA enforcement policy set to ${enforce} for tenant ${tenantId}.`
    );
  };

  const handleSubmitDirectApplication = (
    appData: Omit<BorrowerDirectApplication, 'id' | 'applicationNo' | 'submittedAt' | 'status'>
  ) => {
    const applicationNo = `APP-DIR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newApp: BorrowerDirectApplication = {
      ...appData,
      id: `app-dir-${Date.now()}`,
      applicationNo,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };
    setBorrowerApplications((prev) => [newApp, ...prev]);

    logAudit(
      'SUBMIT_LOAN_APPLICATION',
      'LOAN',
      newApp.id,
      `Borrower ${appData.borrowerName} submitted application ${applicationNo} for UGX ${appData.requestedAmountUGX.toLocaleString()} to ${appData.tenantName}.`
    );

    const appNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      tenantId: appData.tenantId,
      channel: 'in_app',
      title: 'New Loan Application Received',
      message: `${appData.borrowerName} applied for ${appData.productName} (UGX ${appData.requestedAmountUGX.toLocaleString()}).`,
      type: 'loan_application',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [appNotif, ...prev]);
  };

  const handleSubmitCreditReview = (
    reviewData: Omit<CreditReview, 'id' | 'reviewDate' | 'status'>
  ) => {
    const newRev: CreditReview = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      reviewDate: new Date().toISOString().split('T')[0],
      status: 'verified',
    };
    setCreditReviews((prev) => [newRev, ...prev]);

    logAudit(
      'SUBMIT_CREDIT_REVIEW',
      'CUSTOMER',
      newRev.id,
      `Published credit review for ${reviewData.borrowerName} (NIN: ${reviewData.borrowerNin}) with repayment status: ${reviewData.repaymentStatus}.`
    );
  };

  const handleSubmitCreditDispute = (
    disputeData: Omit<CreditDispute, 'id' | 'filedAt' | 'status'>
  ) => {
    const newDisp: CreditDispute = {
      ...disputeData,
      id: `disp-${Date.now()}`,
      filedAt: new Date().toISOString(),
      status: 'under_investigation',
    };
    setCreditDisputes((prev) => [newDisp, ...prev]);

    logAudit(
      'LODGE_CREDIT_DISPUTE',
      'CUSTOMER',
      newDisp.id,
      `Borrower ${disputeData.borrowerName} lodged dispute against review by ${disputeData.reviewingTenantName}. Reason: ${disputeData.disputeReason}`
    );

    const dispNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      channel: 'whatsapp',
      title: 'Credit Intelligence Dispute Notice',
      message: `A dispute has been lodged by ${disputeData.borrowerName} regarding your review. UMRA compliance requires review within 14 business days.`,
      type: 'credit_dispute',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [dispNotif, ...prev]);
  };

  const handleResolveDispute = (
    disputeId: string,
    resolution: 'upheld_corrected' | 'dismissed',
    notes: string
  ) => {
    setCreditDisputes((prev) =>
      prev.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: resolution,
              resolvedAt: new Date().toISOString(),
              resolvedBy: currentUser.name,
              resolutionNotes: notes,
            }
          : d
      )
    );

    logAudit(
      'RESOLVE_CREDIT_DISPUTE',
      'CUSTOMER',
      disputeId,
      `Dispute ${disputeId} resolved: ${resolution}. Notes: ${notes}`
    );
  };

  // 8. Savings Deposit
  const handleDepositSavings = (accountId: string, amount: number, channel: string) => {
    setSavingsAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              currentBalance: acc.currentBalance + amount,
              availableBalance: acc.availableBalance + amount,
            }
          : acc
      )
    );

    logAudit('SAVINGS_DEPOSIT', 'SAVINGS', accountId, `Deposited UGX ${amount.toLocaleString()} via ${channel}.`);
  };

  // 9. Savings Withdrawal with Balance Check
  const handleWithdrawSavings = (accountId: string, amount: number): { success: boolean; error?: string } => {
    const target = savingsAccounts.find((a) => a.id === accountId);
    if (!target) return { success: false, error: 'Account not found' };

    if (amount > target.availableBalance) {
      return {
        success: false,
        error: `Insufficient available balance. Requested UGX ${amount.toLocaleString()}, but available is UGX ${target.availableBalance.toLocaleString()} (Locked Collateral: UGX ${target.lockedGuaranteeAmount.toLocaleString()}).`,
      };
    }

    setSavingsAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              currentBalance: acc.currentBalance - amount,
              availableBalance: acc.availableBalance - amount,
            }
          : acc
      )
    );

    logAudit('SAVINGS_WITHDRAWAL', 'SAVINGS', accountId, `Withdrew UGX ${amount.toLocaleString()}.`);
    return { success: true };
  };

  // 10. Purchase Shares
  const handlePurchaseShares = (customerId: string, units: number) => {
    const cust = customers.find((c) => c.id === customerId);
    const unitPrice = 20_000;
    const totalVal = units * unitPrice;

    setShareAccounts((prev) => [
      ...prev,
      {
        id: `shr-${Date.now()}`,
        tenantId: currentTenant.id,
        customerId,
        accountNo: `SHR-${Math.floor(1000 + Math.random() * 9000)}`,
        unitsHeld: units,
        unitPriceUGX: unitPrice,
        totalValueUGX: totalVal,
        dividendEarnedUGX: Math.round(totalVal * 0.12),
        status: 'active',
        joinedAt: new Date().toISOString(),
      },
    ]);

    logAudit(
      'ISSUE_SHARES',
      'SAVINGS',
      customerId,
      `Issued ${units} share capital units (UGX ${totalVal.toLocaleString()}) to ${cust?.fullName}.`
    );
  };

  // 11. Add Recovery Promise To Pay
  const handleAddPromiseToPay = (caseId: string, amount: number, date: string) => {
    setRecoveryCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              promisesToPay: [
                ...c.promisesToPay,
                {
                  id: `ptp-${Date.now()}`,
                  promisedDate: date,
                  promisedAmount: amount,
                  status: 'pending',
                  recordedAt: new Date().toISOString(),
                },
              ],
            }
          : c
      )
    );

    logAudit('RECORD_PTP', 'LOAN', caseId, `Recorded promise to pay UGX ${amount.toLocaleString()} on ${date}.`);
  };

  // 12. Record Recovery Note
  const handleRecordContactNote = (caseId: string, note: string) => {
    setRecoveryCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              lastContactOutcome: note,
              notesCount: c.notesCount + 1,
            }
          : c
      )
    );

    logAudit('RECOVERY_CONTACT', 'LOAN', caseId, `Logged contact note: ${note}`);
  };

  // Quick action from dashboard to teller
  const handleQuickCollect = (loan: Loan) => {
    setSelectedQuickLoan(loan);
    setActiveTab('teller');
  };

  // Navigation Items for Company Lending Workspace
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'loans', label: 'Loans & Servicing', icon: CreditCard },
    { id: 'teller', label: 'Cashier Terminal', icon: Receipt },
    { id: 'collections', label: 'Recovery & PAR 30', icon: AlertTriangle },
    { id: 'expenses', label: 'Expenses & Budget', icon: Wallet },
    { id: 'savings', label: 'Savings & Shares', icon: PiggyBank },
    { id: 'accounting', label: 'General Ledger', icon: BookOpen },
    { id: 'customers', label: 'Customers & KYC', icon: Users },
    { id: 'users', label: 'Staff & RBAC', icon: UserCheck },
    { id: 'audit', label: 'Audit & UMRA', icon: ShieldCheck },
  ] as const;

  // Mandatory Authentication Gate: User must first login before accessing the system!
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-between p-4 sm:p-6 text-white selection:bg-emerald-500 selection:text-white">
        {/* Top Minimal Branding Bar */}
        <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-black text-lg shadow-inner">
              K
            </div>
            <div>
              <span className="font-black tracking-wider text-white text-base">KEROLENDA</span>
              <span className="block text-[10px] text-slate-400 tracking-wide">
                Microfinance &amp; Lending Management SaaS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Tier 4 UMRA &amp; Data Protection Compliant</span>
          </div>
        </header>

        {/* Central Full-Screen Login Gate */}
        <AuthModal
          isOpen={true}
          isMandatory={true}
          users={users}
          currentUser={currentUser}
          tenants={tenants}
          currentTenant={currentTenant}
          borrowers={borrowers}
          onLoginSuccess={(user, tenant, env, borrower) => {
            setCurrentUser(user);
            if (tenant) {
              handleSelectTenant(tenant);
            }
            if (borrower) {
              setCurrentBorrower(borrower);
            }
            if (env) {
              setOperatingEnvironment(env);
            } else if (user.role === 'PLATFORM_SUPER_ADMIN' || user.role === 'PLATFORM_ADMIN') {
              setOperatingEnvironment('platform_admin');
            } else if (user.role === 'BORROWER') {
              setOperatingEnvironment('borrower_portal');
            } else {
              setOperatingEnvironment('lending_workspace');
            }
            setIsAuthenticated(true);
            setShowAuthModal(false);
            logAudit(
              'USER_LOGIN',
              'CUSTOMER',
              user.id,
              `User ${user.name} logged in successfully via MFA and was auto-directed to ${
                tenant?.displayName || env || 'workspace'
              }.`
            );
          }}
          onRegisterCompany={handleRegisterCompany}
          onRegisterBorrower={handleRegisterBorrower}
        />

        {/* Bottom Footer */}
        <footer className="max-w-7xl mx-auto w-full py-4 text-center text-xs text-slate-500 border-t border-slate-800/60">
          KEROLENDA Multi-Tenant SaaS • Strict Tenant Isolation • Bank-Grade MFA Security
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Universal Header with Environment Selector, Notifications, and MFA Hub */}
      <Header
        tenants={tenants}
        currentTenant={currentTenant}
        onSelectTenant={handleSelectTenant}
        branches={branches}
        currentBranch={currentBranch}
        onSelectBranch={handleSelectBranch}
        users={users}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        currentEnvironment={operatingEnvironment}
        onSelectEnvironment={setOperatingEnvironment}
        unreadNotificationsCount={notifications.filter((n) => !n.isRead).length}
        onOpenQuickPayment={() => {
          setOperatingEnvironment('lending_workspace');
          setActiveTab('teller');
        }}
        onOpenNewLoan={() => {
          setOperatingEnvironment('lending_workspace');
          setShowLoanOrigination(true);
        }}
        onOpenNewExpense={() => {
          setOperatingEnvironment('lending_workspace');
          setActiveTab('expenses');
        }}
        onOpenTenantSettings={() => setShowTenantSettingsModal(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenCreditBureauModal={() => setShowCreditBureauModal(true)}
        onOpenNotificationsModal={() => setShowNotificationsModal(true)}
        onLogout={() => {
          setIsAuthenticated(false);
          logAudit('USER_LOGOUT', 'CUSTOMER', currentUser.id, 'User signed out and locked workspace session.');
        }}
      />

      {/* Main Navigation Bar (Active for Company Lending Workspace) */}
      {operatingEnvironment === 'lending_workspace' && (
        <nav className="bg-white border-b border-slate-200 px-4 py-1 sticky top-[95px] sm:top-[98px] z-20 shadow-2xs no-print overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Content View Container based on Operating Environment */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* ENVIRONMENT 1: PLATFORM ADMINISTRATION */}
        {operatingEnvironment === 'platform_admin' && (
          <PlatformAdminView
            tenants={tenants}
            currentUser={currentUser}
            loans={loans}
            borrowers={borrowers}
            creditReviews={creditReviews}
            disputes={creditDisputes}
            auditLogs={auditLogs}
            onUpdateTenantStatus={(tenantId, status) => {
              setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, status } : t)));
              logAudit('UPDATE_TENANT_STATUS', 'CUSTOMER', tenantId, `Tenant status changed to ${status}.`);
            }}
            onUpdateTenantPlan={(tenantId, plan) => {
              setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, planName: plan } : t)));
              logAudit('UPDATE_TENANT_PLAN', 'CUSTOMER', tenantId, `Tenant plan updated to ${plan}.`);
            }}
            onResolveDispute={handleResolveDispute}
          />
        )}

        {/* ENVIRONMENT 2: BORROWER SELF-SERVICE PORTAL */}
        {operatingEnvironment === 'borrower_portal' && (
          <BorrowerPortalView
            currentBorrower={currentBorrower}
            tenants={tenants}
            loanProducts={loanProducts}
            loans={loans}
            applications={borrowerApplications}
            creditReviews={creditReviews}
            disputes={creditDisputes}
            onSubmitApplication={handleSubmitDirectApplication}
            onSubmitDispute={handleSubmitCreditDispute}
            onMakeRepayment={(loanId, amount) => {
              const targetLoan = loans.find((l) => l.id === loanId);
              if (targetLoan) {
                handlePostPayment({
                  tenantId: targetLoan.tenantId,
                  branchId: targetLoan.branchId,
                  customerId: targetLoan.customerId,
                  loanId: targetLoan.id,
                  amount,
                  currency: 'UGX',
                  channel: 'MTN Mobile Money',
                  externalReference: `BOR-PAY-${Date.now().toString().slice(-6)}`,
                });
              }
            }}
          />
        )}

        {/* ENVIRONMENT 3: COMPANY LENDING WORKSPACE (STRICT TENANT ISOLATION) */}
        {operatingEnvironment === 'lending_workspace' && (() => {
          const tenantLoans = loans.filter((l) => l.tenantId === currentTenant.id);
          const tenantCustomers = customers.filter((c) => c.tenantId === currentTenant.id);
          const tenantPayments = payments.filter((p) => p.tenantId === currentTenant.id);
          const tenantExpenses = expenses.filter((e) => e.tenantId === currentTenant.id);
          const tenantBudgets = budgets;
          const tenantFixedAssets = fixedAssets.filter((f) => f.tenantId === currentTenant.id);
          const tenantAccounts = accounts.filter((a) => a.tenantId === currentTenant.id);
          const tenantRecoveryCases = recoveryCases.filter((c) => c.tenantId === currentTenant.id);
          const tenantJournals = journals.filter((j) => j.tenantId === currentTenant.id);
          const tenantSavingsAccounts = savingsAccounts.filter((s) => s.tenantId === currentTenant.id);
          const tenantSavingsTransactions = savingsTransactions.filter((st) => st.tenantId === currentTenant.id);
          const tenantShareAccounts = shareAccounts.filter((s) => s.tenantId === currentTenant.id);
          const tenantProducts = loanProducts.filter((p) => p.tenantId === currentTenant.id);
          const tenantUsers = users.filter((u) => u.tenantId === currentTenant.id);
          const tenantBranches = branches.filter((b) => b.tenantId === currentTenant.id);
          const tenantInvitations = invitations.filter((i) => i.tenantId === currentTenant.id);
          const tenantCustomerDocuments = customerDocuments.filter((d) => d.tenantId === currentTenant.id);
          const tenantAuditLogs = auditLogs.filter((l) => l.tenantId === currentTenant.id);

          return (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  tenant={currentTenant}
                  branch={currentBranch}
                  loans={tenantLoans}
                  customers={tenantCustomers}
                  payments={tenantPayments}
                  expenses={tenantExpenses}
                  budgets={tenantBudgets}
                  accounts={tenantAccounts}
                  recoveryCases={tenantRecoveryCases}
                  journals={tenantJournals}
                  savingsAccounts={tenantSavingsAccounts}
                  shareAccounts={tenantShareAccounts}
                  onSelectLoan={(l) => {
                    setSelectedQuickLoan(l);
                    setActiveTab('loans');
                  }}
                  onQuickCollect={handleQuickCollect}
                  onNavigateTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {activeTab === 'loans' && (
                <LoansView
                  tenant={currentTenant}
                  branch={currentBranch}
                  currentUser={currentUser}
                  loans={tenantLoans}
                  customers={tenantCustomers}
                  products={tenantProducts}
                  notifications={notifications}
                  onOpenOrigination={() => setShowLoanOrigination(true)}
                  onQuickCollect={handleQuickCollect}
                  onRestructureLoan={handleRestructureLoan}
                  onTriggerReminderScan={runInstallmentReminderScan}
                  onOpenNotificationsModal={() => setShowNotificationsModal(true)}
                />
              )}

              {activeTab === 'teller' && (
                <CashierTerminalView
                  tenant={currentTenant}
                  branch={currentBranch}
                  currentUser={currentUser}
                  loans={tenantLoans}
                  customers={tenantCustomers}
                  payments={tenantPayments}
                  onPostPayment={handlePostPayment}
                  onReversePayment={handleReversePayment}
                  onViewReceipt={(r) => setActiveReceiptModal(r)}
                  initialSelectedLoan={selectedQuickLoan}
                />
              )}

              {activeTab === 'collections' && (
                <CollectionsView
                  tenant={currentTenant}
                  branch={currentBranch}
                  currentUser={currentUser}
                  cases={tenantRecoveryCases}
                  loans={tenantLoans}
                  customers={tenantCustomers}
                  officers={tenantUsers}
                  onAddPromiseToPay={handleAddPromiseToPay}
                  onRecordContactNote={handleRecordContactNote}
                  onQuickCollect={handleQuickCollect}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpensesBudgetView
                  tenant={currentTenant}
                  branch={currentBranch}
                  currentUser={currentUser}
                  expenses={tenantExpenses}
                  budgets={tenantBudgets}
                  fixedAssets={tenantFixedAssets}
                  personalBudget={personalBudget}
                  onAddExpense={handleAddExpense}
                  onUpdateBudget={handleUpdateBudget}
                  onRunMonthlyDepreciation={handleRunMonthlyDepreciation}
                  onUpdatePersonalBudgetItem={handleUpdatePersonalBudgetItem}
                />
              )}

              {activeTab === 'savings' && (
                <SavingsSharesView
                  tenant={currentTenant}
                  branch={currentBranch}
                  currentUser={currentUser}
                  savingsAccounts={tenantSavingsAccounts}
                  savingsTransactions={tenantSavingsTransactions}
                  shareAccounts={tenantShareAccounts}
                  customers={tenantCustomers}
                  onDepositSavings={handleDepositSavings}
                  onWithdrawSavings={handleWithdrawSavings}
                  onPurchaseShares={handlePurchaseShares}
                />
              )}

              {activeTab === 'accounting' && (
                <AccountingView
                  tenant={currentTenant}
                  branch={currentBranch}
                  currentUser={currentUser}
                  accounts={tenantAccounts}
                  journals={tenantJournals}
                  onAddManualJournal={(entry) => {
                    const newJrn: JournalEntry = {
                      id: `je-man-${Date.now()}`,
                      tenantId: currentTenant.id,
                      journalNo: `JRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                      effectiveDate: new Date().toISOString().split('T')[0],
                      sourceType: 'manual',
                      sourceReference: 'MANUAL-ENTRY',
                      description: entry.description,
                      lines: entry.lines.map((l) => ({
                        accountId: 'acc-1000',
                        accountCode: l.accountCode,
                        accountName: accounts.find((a) => a.code === l.accountCode)?.name || 'Account',
                        debit: l.debit,
                        credit: l.credit,
                        description: l.description,
                      })),
                      postedByUserId: currentUser.id,
                      postedAt: new Date().toISOString(),
                      isBalanced: true,
                    };
                    setJournals((prev) => [newJrn, ...prev]);
                    logAudit('MANUAL_JOURNAL', 'JOURNAL', newJrn.journalNo, `Posted manual journal: ${entry.description}`);
                  }}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersView
                  tenant={currentTenant}
                  branch={currentBranch}
                  currentUser={currentUser}
                  customers={tenantCustomers}
                  documents={tenantCustomerDocuments}
                  onAddCustomer={handleAddCustomer}
                  onSelectCustomer={() => {}}
                  onAddDocument={handleAddCustomerDocument}
                  onUpdateDocumentStatus={handleUpdateCustomerDocumentStatus}
                  onDeleteDocument={handleDeleteCustomerDocument}
                />
              )}

              {activeTab === 'users' && (
                <CompanyUsersView
                  tenant={currentTenant}
                  branches={tenantBranches}
                  currentUser={currentUser}
                  users={tenantUsers}
                  invitations={tenantInvitations}
                  onInviteUser={handleInviteUser}
                  onUpdateUserRole={handleUpdateUserRole}
                  onToggleUserStatus={handleToggleUserStatus}
                  onRevokeInvitation={(invId) =>
                    setInvitations((prev) => prev.filter((i) => i.id !== invId))
                  }
                  onToggleCompanyMfaEnforcement={handleToggleCompanyMfaEnforcement}
                />
              )}

              {activeTab === 'audit' && (
                <AuditView
                  tenant={currentTenant}
                  branch={currentBranch}
                  currentUser={currentUser}
                  auditLogs={tenantAuditLogs}
                />
              )}
            </>
          );
        })()}
      </main>

      {/* Global Modals */}
      {showLoanOrigination && (
        <LoanOriginationModal
          tenant={currentTenant}
          branch={currentBranch}
          currentUser={currentUser}
          customers={customers.filter((c) => c.tenantId === currentTenant.id)}
          products={loanProducts.filter((p) => p.tenantId === currentTenant.id)}
          onClose={() => setShowLoanOrigination(false)}
          onSubmitApplication={handleOriginateLoan}
        />
      )}

      {activeReceiptModal && (
        <ReceiptModal
          receipt={activeReceiptModal}
          tenant={currentTenant}
          customer={customers.find((c) => c.id === activeReceiptModal.customerId)}
          loan={loans.find((l) => l.id === activeReceiptModal.loanId)}
          onClose={() => setActiveReceiptModal(null)}
        />
      )}

      {/* Tenant Settings Modal (Admin Only) */}
      <TenantSettingsModal
        tenant={currentTenant}
        currentUser={currentUser}
        isOpen={showTenantSettingsModal}
        onClose={() => setShowTenantSettingsModal(false)}
        onSaveTenant={handleSaveTenant}
      />

      {/* Authentication & MFA Switcher Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isMandatory={false}
        users={users}
        currentUser={currentUser}
        tenants={tenants}
        currentTenant={currentTenant}
        borrowers={borrowers}
        onLoginSuccess={(user, tenant, env, borrower) => {
          setCurrentUser(user);
          if (tenant) {
            handleSelectTenant(tenant);
          }
          if (borrower) {
            setCurrentBorrower(borrower);
          }
          if (env) {
            setOperatingEnvironment(env);
          }
          setShowAuthModal(false);
          logAudit(
            'USER_LOGIN',
            'CUSTOMER',
            user.id,
            `User ${user.name} switched session via MFA and auto-directed to ${
              tenant?.displayName || env || 'workspace'
            }.`
          );
        }}
        onRegisterCompany={handleRegisterCompany}
        onRegisterBorrower={handleRegisterBorrower}
      />

      {/* Cross-Company Shared Credit Intelligence Bureau Modal */}
      <CreditBureauModal
        isOpen={showCreditBureauModal}
        onClose={() => setShowCreditBureauModal(false)}
        currentTenant={currentTenant}
        currentUser={currentUser}
        customers={customers.filter((c) => c.tenantId === currentTenant.id)}
        reviews={creditReviews}
        onSubmitReview={handleSubmitCreditReview}
      />

      {/* Multi-Channel Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onMarkAllAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        }
        onTriggerScan={runInstallmentReminderScan}
        lastScanResult={lastReminderScanResult}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            KEROLENDA SaaS Platform • Multi-tenant Microfinance &amp; Lending Management System
          </p>
          <p className="text-[11px] text-slate-400">
            Compliant with UMRA Regulations (Uganda Tier 4 MFIs and Money Lenders Act, 2016)
          </p>
        </div>
      </footer>
    </div>
  );
}
