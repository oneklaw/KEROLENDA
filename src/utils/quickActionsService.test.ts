import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUICK_ACTIONS,
  getQuickActionById,
  executeQuickAction,
} from './quickActionsService';

test('QUICK_ACTIONS contains required new_loan, record_payment, and add_expense triggers', () => {
  assert.equal(QUICK_ACTIONS.length, 3);
  const ids = QUICK_ACTIONS.map((a) => a.id);
  assert.ok(ids.includes('new_loan'));
  assert.ok(ids.includes('record_payment'));
  assert.ok(ids.includes('add_expense'));
});

test('getQuickActionById returns correct action item', () => {
  const newLoan = getQuickActionById('new_loan');
  assert.ok(newLoan);
  assert.equal(newLoan?.shortLabel, 'New Loan');

  const payment = getQuickActionById('record_payment');
  assert.ok(payment);
  assert.equal(payment?.shortLabel, 'Receive Payment');

  const expense = getQuickActionById('add_expense');
  assert.ok(expense);
  assert.equal(expense?.shortLabel, 'Add Expense');
});

test('executeQuickAction dispatches direct callbacks when provided', () => {
  let newLoanCalled = false;
  let paymentCalled = false;
  let expenseCalled = false;
  let tabNavigated: string | null = null;

  const callbacks = {
    onOpenNewLoan: () => {
      newLoanCalled = true;
    },
    onOpenQuickPayment: () => {
      paymentCalled = true;
    },
    onOpenNewExpense: () => {
      expenseCalled = true;
    },
    onNavigateTab: (tab: string) => {
      tabNavigated = tab;
    },
  };

  assert.equal(executeQuickAction('new_loan', callbacks), true);
  assert.equal(newLoanCalled, true);

  assert.equal(executeQuickAction('record_payment', callbacks), true);
  assert.equal(paymentCalled, true);

  assert.equal(executeQuickAction('add_expense', callbacks), true);
  assert.equal(expenseCalled, true);
});

test('executeQuickAction falls back to onNavigateTab when specific callbacks are missing', () => {
  let navigatedTab: string | null = null;
  const callbacks = {
    onNavigateTab: (tab: string) => {
      navigatedTab = tab;
    },
  };

  executeQuickAction('new_loan', callbacks);
  assert.equal(navigatedTab, 'loans');

  executeQuickAction('record_payment', callbacks);
  assert.equal(navigatedTab, 'teller');

  executeQuickAction('add_expense', callbacks);
  assert.equal(navigatedTab, 'expenses');
});
