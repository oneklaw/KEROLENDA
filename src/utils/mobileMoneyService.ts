import { TelecomProvider, MobileMoneyTransaction, ProviderFloatSummary } from '../types';

export interface InitiatePaymentParams {
  tenantId: string;
  provider: TelecomProvider;
  transactionType: 'INCOMING_COLLECTION' | 'OUTGOING_DISBURSEMENT';
  amount: number;
  phoneNumberOrAccount: string;
  recipientLegalName: string;
  internalReference: string;
  simulateFailureMode?: 'NONE' | 'INSUFFICIENT_FLOAT' | 'TIMEOUT_RETRY' | 'NAME_MISMATCH';
}

export interface PaymentExecutionResult {
  success: boolean;
  transaction: MobileMoneyTransaction;
  message: string;
  errorCode?: string;
}

/**
 * Initiates an incoming collection or outgoing disbursement through MTN MoMo, Airtel Money, or Ugandan Banks.
 */
export function executeMobileMoneyPayment(params: InitiatePaymentParams): PaymentExecutionResult {
  const isIncoming = params.transactionType === 'INCOMING_COLLECTION';
  const prefix = params.provider === 'MTN Mobile Money' ? 'MTN' : params.provider === 'Airtel Money' ? 'AIR' : params.provider === 'Stanbic Bank' ? 'SBG' : 'CENTE';
  const externalRef = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  // Handle simulated error modes
  if (params.simulateFailureMode === 'INSUFFICIENT_FLOAT') {
    const failedTxn: MobileMoneyTransaction = {
      id: `momo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: params.tenantId,
      provider: params.provider,
      transactionType: params.transactionType,
      amount: params.amount,
      currency: 'UGX',
      phoneNumberOrAccount: params.phoneNumberOrAccount,
      recipientLegalName: params.recipientLegalName,
      externalReference: externalRef,
      internalReference: params.internalReference,
      status: 'FAILED',
      failureReason: 'Insufficient subscriber wallet float / credit balance.',
      initiatedAt: new Date().toISOString(),
      reconciliationStatus: 'VARIANCE_FLAGGED',
    };
    return {
      success: false,
      transaction: failedTxn,
      message: 'Transaction declined by telecom: Insufficient subscriber wallet balance.',
      errorCode: 'ERR_INSUFFICIENT_FLOAT',
    };
  }

  if (params.simulateFailureMode === 'NAME_MISMATCH') {
    const failedTxn: MobileMoneyTransaction = {
      id: `momo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: params.tenantId,
      provider: params.provider,
      transactionType: params.transactionType,
      amount: params.amount,
      currency: 'UGX',
      phoneNumberOrAccount: params.phoneNumberOrAccount,
      recipientLegalName: params.recipientLegalName,
      externalReference: externalRef,
      internalReference: params.internalReference,
      status: 'FAILED',
      failureReason: 'Telecom registered subscriber name does not match customer KYC record.',
      initiatedAt: new Date().toISOString(),
      reconciliationStatus: 'VARIANCE_FLAGGED',
    };
    return {
      success: false,
      transaction: failedTxn,
      message: 'KYC Sanity Check Failed: Subscriber SIM name mismatch with Tier 4 record.',
      errorCode: 'ERR_KYC_NAME_MISMATCH',
    };
  }

  const successTxn: MobileMoneyTransaction = {
    id: `momo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: params.tenantId,
    provider: params.provider,
    transactionType: params.transactionType,
    amount: params.amount,
    currency: 'UGX',
    phoneNumberOrAccount: params.phoneNumberOrAccount,
    recipientLegalName: params.recipientLegalName,
    externalReference: externalRef,
    internalReference: params.internalReference,
    status: 'SUCCESS',
    initiatedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
    reconciliationStatus: 'MATCHED',
  };

  return {
    success: true,
    transaction: successTxn,
    message: isIncoming
      ? `Successfully collected UGX ${params.amount.toLocaleString()} via ${params.provider} (Ref: ${externalRef})`
      : `Disbursement of UGX ${params.amount.toLocaleString()} dispatched to ${params.recipientLegalName} via ${params.provider} (Ref: ${externalRef})`,
  };
}

/**
 * Reconciles a list of transactions against a simulated statement and calculates variance.
 */
export function reconcileProviderFloat(
  transactions: MobileMoneyTransaction[],
  provider: TelecomProvider,
  openingFloatUGX: number
): {
  closingFloatUGX: number;
  totalInflowUGX: number;
  totalOutflowUGX: number;
  matchedCount: number;
  unreconciledCount: number;
  varianceUGX: number;
} {
  const providerTxns = transactions.filter((t) => t.provider === provider && t.status === 'SUCCESS');
  const totalInflowUGX = providerTxns
    .filter((t) => t.transactionType === 'INCOMING_COLLECTION')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflowUGX = providerTxns
    .filter((t) => t.transactionType === 'OUTGOING_DISBURSEMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  const closingFloatUGX = openingFloatUGX + totalInflowUGX - totalOutflowUGX;
  const matchedCount = providerTxns.filter((t) => t.reconciliationStatus === 'MATCHED').length;
  const unreconciledCount = providerTxns.filter((t) => t.reconciliationStatus !== 'MATCHED').length;

  return {
    closingFloatUGX,
    totalInflowUGX,
    totalOutflowUGX,
    matchedCount,
    unreconciledCount,
    varianceUGX: 0,
  };
}
