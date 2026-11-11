export interface QuickActionItem {
  id: 'new_loan' | 'record_payment' | 'add_expense';
  label: string;
  description: string;
  shortLabel: string;
  iconName: 'PlusCircle' | 'Receipt' | 'ArrowRightLeft';
  colorClass: string;
  bgClass: string;
  hoverClass: string;
  keyboardShortcut: string;
  targetTab?: string;
}

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'new_loan',
    label: 'New Loan Application',
    shortLabel: 'New Loan',
    description: 'Originate credit application & verify KYC',
    iconName: 'PlusCircle',
    colorClass: 'text-white',
    bgClass: 'bg-slate-900',
    hoverClass: 'hover:bg-slate-800',
    keyboardShortcut: 'N',
    targetTab: 'loans',
  },
  {
    id: 'record_payment',
    label: 'Record Payment',
    shortLabel: 'Receive Payment',
    description: 'Cash till, MoMo float & bank repayments',
    iconName: 'Receipt',
    colorClass: 'text-white',
    bgClass: 'bg-emerald-600',
    hoverClass: 'hover:bg-emerald-700',
    keyboardShortcut: 'P',
    targetTab: 'teller',
  },
  {
    id: 'add_expense',
    label: 'Add Expense Voucher',
    shortLabel: 'Add Expense',
    description: 'Post branch operational spend & budget line',
    iconName: 'ArrowRightLeft',
    colorClass: 'text-white',
    bgClass: 'bg-amber-500',
    hoverClass: 'hover:bg-amber-600',
    keyboardShortcut: 'E',
    targetTab: 'expenses',
  },
];

export function getQuickActionById(id: string): QuickActionItem | undefined {
  return QUICK_ACTIONS.find((action) => action.id === id);
}

export function executeQuickAction(
  actionId: 'new_loan' | 'record_payment' | 'add_expense',
  callbacks: {
    onOpenNewLoan?: () => void;
    onOpenQuickPayment?: () => void;
    onOpenNewExpense?: () => void;
    onNavigateTab?: (tab: string) => void;
  }
): boolean {
  switch (actionId) {
    case 'new_loan':
      if (callbacks.onOpenNewLoan) {
        callbacks.onOpenNewLoan();
        return true;
      }
      if (callbacks.onNavigateTab) {
        callbacks.onNavigateTab('loans');
        return true;
      }
      return false;

    case 'record_payment':
      if (callbacks.onOpenQuickPayment) {
        callbacks.onOpenQuickPayment();
        return true;
      }
      if (callbacks.onNavigateTab) {
        callbacks.onNavigateTab('teller');
        return true;
      }
      return false;

    case 'add_expense':
      if (callbacks.onOpenNewExpense) {
        callbacks.onOpenNewExpense();
        return true;
      }
      if (callbacks.onNavigateTab) {
        callbacks.onNavigateTab('expenses');
        return true;
      }
      return false;

    default:
      return false;
  }
}
