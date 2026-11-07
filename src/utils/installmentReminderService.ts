import { Loan, LoanInstallment, Customer, SystemNotification } from '../types';
import { formatUGX } from './finance';

export interface UpcomingInstallmentMatch {
  loan: Loan;
  installment: LoanInstallment;
  daysRemaining: number;
  customer?: Customer;
  dueDateFormatted: string;
  amountDue: number;
}

export interface ScheduledReminderSummary {
  loanId: string;
  loanNo: string;
  installmentNo: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  dueDate: string;
  amountDue: number;
  daysRemaining: number;
  smsNotificationId?: string;
  emailNotificationId?: string;
  status: 'scheduled' | 'dispatched';
  dispatchedAt: string;
}

/**
 * Calculates calendar day difference between a target due date and a base reference date.
 * Returns positive integer when dueDate is in the future.
 * Returns 0 if due today, negative if overdue.
 */
export function calculateDaysUntilDue(
  dueDateStr: string,
  referenceDate: Date | string = new Date()
): number {
  if (!dueDateStr) return -999;

  // Extract YYYY-MM-DD components to avoid timezone offsets
  const dueParts = dueDateStr.split('T')[0].split('-').map(Number);
  if (dueParts.length !== 3 || dueParts.some(isNaN)) return -999;

  const dueUtc = Date.UTC(dueParts[0], dueParts[1] - 1, dueParts[2]);

  let refUtc: number;
  if (typeof referenceDate === 'string') {
    const refParts = referenceDate.split('T')[0].split('-').map(Number);
    if (refParts.length === 3 && !refParts.some(isNaN)) {
      refUtc = Date.UTC(refParts[0], refParts[1] - 1, refParts[2]);
    } else {
      const d = new Date(referenceDate);
      refUtc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    }
  } else {
    refUtc = Date.UTC(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate()
    );
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((dueUtc - refUtc) / msPerDay);
}

/**
 * Scans active and performing loans to identify installments that are exactly N days away (default 3 days).
 */
export function findUpcomingInstallments(
  loans: Loan[],
  customers: Customer[],
  referenceDate: Date | string = new Date(),
  targetDaysAway = 3
): UpcomingInstallmentMatch[] {
  const matches: UpcomingInstallmentMatch[] = [];

  for (const loan of loans) {
    // Only process active or in_arrears loans
    if (loan.status === 'settled' || loan.status === 'written_off') {
      continue;
    }

    if (!loan.schedule || loan.schedule.length === 0) {
      continue;
    }

    const customer = customers.find((c) => c.id === loan.customerId);

    for (const inst of loan.schedule) {
      // Only remind for unpaid or pending installments
      if (inst.status === 'paid') {
        continue;
      }

      const daysRemaining = calculateDaysUntilDue(inst.dueDate, referenceDate);

      if (daysRemaining === targetDaysAway) {
        matches.push({
          loan,
          installment: inst,
          daysRemaining,
          customer,
          dueDateFormatted: inst.dueDate,
          amountDue: inst.totalDue,
        });
      }
    }
  }

  return matches;
}

/**
 * Checks if a reminder notification of a given channel has already been created for a specific loan installment.
 */
export function isReminderAlreadyScheduled(
  existingNotifications: SystemNotification[],
  loanId: string,
  installmentNo: number,
  channel: 'sms' | 'email',
  daysRemaining = 3
): boolean {
  return existingNotifications.some((n) => {
    if (n.type !== 'repayment_reminder' || n.channel !== channel) {
      return false;
    }
    const meta = n.metadata as Record<string, unknown> | undefined;
    if (!meta) return false;

    const matchesLoan = meta.loanId === loanId;
    const matchesInstallment = Number(meta.installmentNo) === installmentNo;
    const matchesDays = meta.daysRemaining === undefined || Number(meta.daysRemaining) === daysRemaining;

    return matchesLoan && matchesInstallment && matchesDays;
  });
}

/**
 * Generates both SMS and Email reminder notifications for all matched 3-day upcoming installments,
 * automatically enforcing deduplication idempotency so duplicate messages are never dispatched.
 */
export function generateInstallmentReminderNotifications(
  matches: UpcomingInstallmentMatch[],
  existingNotifications: SystemNotification[],
  companyName = 'KEROLENDA Microfinance',
  generatedAt: string = new Date().toISOString()
): {
  newNotifications: SystemNotification[];
  skippedCount: number;
  summaries: ScheduledReminderSummary[];
} {
  const newNotifications: SystemNotification[] = [];
  const summaries: ScheduledReminderSummary[] = [];
  let skippedCount = 0;

  for (const match of matches) {
    const { loan, installment, customer, daysRemaining, amountDue } = match;

    const customerName = customer?.fullName || 'Valued Borrower';
    const customerPhone = customer?.phone || '+256 700 000 000';
    const customerEmail =
      customer?.email ||
      `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@gmail.com`;

    const smsAlreadyExists = isReminderAlreadyScheduled(
      existingNotifications,
      loan.id,
      installment.installmentNo,
      'sms',
      daysRemaining
    );

    const emailAlreadyExists = isReminderAlreadyScheduled(
      existingNotifications,
      loan.id,
      installment.installmentNo,
      'email',
      daysRemaining
    );

    let smsId: string | undefined;
    let emailId: string | undefined;

    // 1. Create SMS Notification if not already generated
    if (!smsAlreadyExists) {
      smsId = `remind-sms-${loan.id}-inst${installment.installmentNo}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const smsNotification: SystemNotification = {
        id: smsId,
        tenantId: loan.tenantId,
        recipientUserId: customer?.id,
        recipientPhone: customerPhone,
        recipientEmail: customerEmail,
        channel: 'sms',
        title: `Loan Installment Due in 3 Days (${loan.loanNo})`,
        message: `Dear ${customerName}, installment #${installment.installmentNo} of ${formatUGX(amountDue)} for facility ${loan.loanNo} is due in 3 days on ${installment.dueDate}. Pay via MTN/Airtel MoMo with ref ${loan.loanNo}. Thank you, ${companyName}.`,
        type: 'repayment_reminder',
        isRead: false,
        createdAt: generatedAt,
        metadata: {
          loanId: loan.id,
          loanNo: loan.loanNo,
          installmentNo: installment.installmentNo,
          dueDate: installment.dueDate,
          amountDue,
          customerName,
          channel: 'sms',
          daysRemaining,
          reminderType: '3_days_prior',
          gateway: 'Uganda MTN & Airtel Telecom SMS Gateway',
          deliveryStatus: 'scheduled_dispatched',
        },
      };
      newNotifications.push(smsNotification);
    } else {
      skippedCount++;
    }

    // 2. Create Email Notification if not already generated
    if (!emailAlreadyExists) {
      emailId = `remind-email-${loan.id}-inst${installment.installmentNo}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const emailNotification: SystemNotification = {
        id: emailId,
        tenantId: loan.tenantId,
        recipientUserId: customer?.id,
        recipientEmail: customerEmail,
        recipientPhone: customerPhone,
        channel: 'email',
        title: `Payment Reminder: Installment #${installment.installmentNo} Due in 3 Days - Loan ${loan.loanNo}`,
        message: `Dear ${customerName},\n\nThis is an automated repayment reminder regarding your credit facility ${loan.loanNo} with ${companyName}.\n\nYour upcoming installment #${installment.installmentNo} is scheduled for repayment in 3 calendar days on ${installment.dueDate}.\n\n• Installment Number: #${installment.installmentNo}\n• Principal Due: ${formatUGX(installment.principalDue)}\n• Interest Due: ${formatUGX(installment.interestDue)}\n• Total Amount Due: ${formatUGX(amountDue)}\n• Due Date: ${installment.dueDate}\n• Outstanding Balance After Payment: ${formatUGX(installment.remainingPrincipal)}\n\nRepayment Options:\n1. MTN Mobile Money: Paybill 882100 (Ref: ${loan.loanNo})\n2. Airtel Money: Paybill 449012 (Ref: ${loan.loanNo})\n3. Over-the-counter deposit at any branch cash till.\n\nPlease ensure your wallet or account is funded. Contact your loan officer for any inquiries.\n\nThank you for choosing ${companyName}.\nLending Operations & Credit Bureau Registry`,
        type: 'repayment_reminder',
        isRead: false,
        createdAt: generatedAt,
        metadata: {
          loanId: loan.id,
          loanNo: loan.loanNo,
          installmentNo: installment.installmentNo,
          dueDate: installment.dueDate,
          amountDue,
          customerName,
          channel: 'email',
          daysRemaining,
          reminderType: '3_days_prior',
          gateway: 'Enterprise Mailer Service (SMTP/TLS)',
          deliveryStatus: 'scheduled_dispatched',
        },
      };
      newNotifications.push(emailNotification);
    } else {
      skippedCount++;
    }

    summaries.push({
      loanId: loan.id,
      loanNo: loan.loanNo,
      installmentNo: installment.installmentNo,
      customerName,
      customerPhone,
      customerEmail,
      dueDate: installment.dueDate,
      amountDue,
      daysRemaining,
      smsNotificationId: smsId,
      emailNotificationId: emailId,
      status: 'scheduled',
      dispatchedAt: generatedAt,
    });
  }

  return {
    newNotifications,
    skippedCount,
    summaries,
  };
}
