import React, { useState } from 'react';
import {
  ExpenseItem,
  ExpenseBudget,
  FixedAsset,
  PersonalBudgetItem,
  Tenant,
  Branch,
  AppUser,
} from '../types';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  Wallet,
  ArrowRightLeft,
  PlusCircle,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Search,
  Filter,
  FileText,
  Sliders,
  DollarSign,
  Building,
  Navigation,
  Users,
  PhoneCall,
  Printer,
  Server,
  Scale,
  Receipt,
  Download,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Truck,
  Sun,
  Shield,
  Activity,
  UserCheck,
} from 'lucide-react';

interface ExpensesBudgetViewProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  expenses: ExpenseItem[];
  budgets: ExpenseBudget[];
  fixedAssets: FixedAsset[];
  personalBudget: PersonalBudgetItem[];
  onAddExpense: (newExpense: Omit<ExpenseItem, 'id' | 'expenseNo'>) => void;
  onUpdateBudget: (categoryKey: string, newLimitUGX: number) => void;
  onRunMonthlyDepreciation: () => void;
  onUpdatePersonalBudgetItem: (id: string, planned: number, actual: number) => void;
}

export const ExpensesBudgetView: React.FC<ExpensesBudgetViewProps> = ({
  tenant,
  branch,
  currentUser,
  expenses,
  budgets,
  fixedAssets,
  personalBudget,
  onAddExpense,
  onUpdateBudget,
  onRunMonthlyDepreciation,
  onUpdatePersonalBudgetItem,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'budgets' | 'personal' | 'assets' | 'ledger'>('budgets');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState<number>(0);
  const [depreciationSuccessMsg, setDepreciationSuccessMsg] = useState(false);

  // Form State for new expense
  const [formData, setFormData] = useState({
    category: 'Field Operations & Fuel' as ExpenseItem['category'],
    vendor: '',
    amount: 150_000,
    channel: 'Petty Cash' as ExpenseItem['channel'],
    referenceNo: '',
    expenseDate: new Date().toISOString().split('T')[0],
    notes: '',
    hasReceiptAttachment: true,
  });

  // Category Icon Map
  const getCategoryIcon = (key: string) => {
    switch (key) {
      case 'Rent & Premises':
        return <Building className="w-4 h-4 text-blue-600" />;
      case 'Field Operations & Fuel':
        return <Navigation className="w-4 h-4 text-amber-600" />;
      case 'Staff Welfare & Meals':
        return <Users className="w-4 h-4 text-emerald-600" />;
      case 'Telecoms & SMS':
        return <PhoneCall className="w-4 h-4 text-purple-600" />;
      case 'Office Supplies & Print':
        return <Printer className="w-4 h-4 text-pink-600" />;
      case 'Software & IT':
        return <Server className="w-4 h-4 text-cyan-600" />;
      case 'Legal & UMRA Fees':
        return <Scale className="w-4 h-4 text-slate-600" />;
      default:
        return <Wallet className="w-4 h-4 text-slate-600" />;
    }
  };

  const getAssetCategoryIcon = (cat: FixedAsset['category']) => {
    switch (cat) {
      case 'Motor Vehicles':
        return <Truck className="w-4 h-4 text-amber-600" />;
      case 'Office Equipment':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'Solar Power Systems':
        return <Sun className="w-4 h-4 text-yellow-600" />;
      case 'Computer Hardware':
        return <Cpu className="w-4 h-4 text-purple-600" />;
      default:
        return <Building className="w-4 h-4 text-slate-600" />;
    }
  };

  // Recalculate spent per category dynamically from expenses list
  const categorySpentMap: Record<string, number> = {};
  budgets.forEach((b) => {
    categorySpentMap[b.categoryKey] = 0;
  });

  expenses.forEach((exp) => {
    if (categorySpentMap[exp.category] !== undefined) {
      categorySpentMap[exp.category] += exp.amount;
    }
  });

  const totalMonthlyBudget = budgets.reduce((sum, b) => sum + b.monthlyBudgetUGX, 0);
  const totalMonthlySpent = Object.values(categorySpentMap).reduce((sum, val) => sum + val, 0);
  const totalRemainingBudget = totalMonthlyBudget - totalMonthlySpent;
  const overallBurnRate = totalMonthlyBudget > 0 ? Math.round((totalMonthlySpent / totalMonthlyBudget) * 100) : 0;

  // Filter expenses
  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory = selectedCategoryFilter === 'all' || exp.category === selectedCategoryFilter;
    const matchesSearch =
      exp.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.expenseNo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Personal Budgeting Calculations
  const personalIncome = personalBudget.filter((p) => p.type === 'income').reduce((sum, p) => sum + p.monthlyActualUGX, 0);
  const personalExpenses = personalBudget.filter((p) => p.type === 'expense').reduce((sum, p) => sum + p.monthlyActualUGX, 0);
  const personalSavings = personalBudget.filter((p) => p.type === 'savings_goal').reduce((sum, p) => sum + p.monthlyActualUGX, 0);
  const personalNetSurplus = personalIncome - personalExpenses;

  // Fixed Asset Calculations
  const totalAssetCost = fixedAssets.reduce((sum, a) => sum + a.purchaseCostUGX, 0);
  const totalAssetBookValue = fixedAssets.reduce((sum, a) => sum + a.currentBookValueUGX, 0);
  const totalMonthlyDepreciation = fixedAssets.reduce((sum, a) => sum + a.monthlyDepreciationUGX, 0);

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor || formData.amount <= 0) return;

    onAddExpense({
      tenantId: tenant.id,
      branchId: branch.id,
      category: formData.category,
      vendor: formData.vendor,
      amount: Number(formData.amount),
      currency: 'UGX',
      channel: formData.channel,
      referenceNo: formData.referenceNo || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      expenseDate: formData.expenseDate,
      approvedByUserId: currentUser.id,
      notes: formData.notes,
      hasReceiptAttachment: formData.hasReceiptAttachment,
      budgetCategoryKey: formData.category,
    });

    setShowAddModal(false);
    setFormData({
      category: 'Field Operations & Fuel',
      vendor: '',
      amount: 150_000,
      channel: 'Petty Cash',
      referenceNo: '',
      expenseDate: new Date().toISOString().split('T')[0],
      notes: '',
      hasReceiptAttachment: true,
    });
  };

  const handleRunDepreciationClick = () => {
    onRunMonthlyDepreciation();
    setDepreciationSuccessMsg(true);
    setTimeout(() => setDepreciationSuccessMsg(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Budget Overview */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Real-Time Expense Tracking & Personal / Institutional Budgeting
            </h2>
            <p className="text-xs text-slate-500">
              PRD Section M11: Set monthly budget ceilings, personal household budgets, physical asset register, and double-entry depreciation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveSubTab('budgets')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'budgets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Branch Budgets
              </button>
              <button
                onClick={() => setActiveSubTab('personal')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'personal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Personal Budgeting
              </button>
              <button
                onClick={() => setActiveSubTab('assets')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'assets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Asset Register
              </button>
              <button
                onClick={() => setActiveSubTab('ledger')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeSubTab === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense Ledger
              </button>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Record Expense
            </button>
          </div>
        </div>

        {/* 4 Summary Micro-Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Total Monthly Budget</span>
            <p className="text-lg font-bold text-slate-900 font-mono-num mt-0.5">
              {formatUGX(totalMonthlyBudget)}
            </p>
            <span className="text-[11px] text-slate-500">7 Active Categories</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Actual Spend (MTD)</span>
            <p className="text-lg font-bold text-slate-900 font-mono-num mt-0.5">
              {formatUGX(totalMonthlySpent)}
            </p>
            <span className="text-[11px] text-slate-500">{expenses.length} posted transactions</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Remaining Liquidity</span>
            <p className={`text-lg font-bold font-mono-num mt-0.5 ${totalRemainingBudget < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {formatUGX(totalRemainingBudget)}
            </p>
            <span className="text-[11px] text-slate-500">Safe runway: 3 days remaining</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Monthly Burn Rate</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-lg font-bold font-mono-num ${overallBurnRate > 90 ? 'text-rose-600' : 'text-slate-900'}`}>
                {overallBurnRate}%
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${overallBurnRate > 90 ? 'bg-rose-100 text-rose-800' : overallBurnRate > 75 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {overallBurnRate > 90 ? 'CRITICAL' : overallBurnRate > 75 ? 'CAUTION' : 'ON TRACK'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Target &lt;85% through day 29</span>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: Branch Category Budgets */}
      {activeSubTab === 'budgets' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Category Budget Allocations & Real-Time Variance
              </h3>
              <p className="text-xs text-slate-500">
                Thresholds alert when category expenditures reach 80% (amber) or breach 100% (red).
              </p>
            </div>
            <span className="text-xs text-slate-400">Click limit to modify budget</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => {
              const spent = categorySpentMap[budget.categoryKey] || 0;
              const percent = budget.monthlyBudgetUGX > 0 ? Math.round((spent / budget.monthlyBudgetUGX) * 100) : 0;
              const isOver = percent > 100;
              const isWarning = percent >= 80 && percent <= 100;
              const isEditing = editingBudgetCategory === budget.categoryKey;

              return (
                <div
                  key={budget.categoryKey}
                  className={`p-4 rounded-xl border transition-all ${
                    isOver
                      ? 'border-rose-300 bg-rose-50/30'
                      : isWarning
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-100">
                        {getCategoryIcon(budget.categoryKey)}
                      </div>
                      <span className="font-semibold text-xs text-slate-800">
                        {budget.categoryName}
                      </span>
                    </div>

                    {isOver ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3 h-3" />
                        +{percent - 100}% Over
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3 h-3" />
                        Near Limit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        {percent}%
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Spent</span>
                      <span className="font-mono-num font-bold text-slate-800">
                        {formatUGX(spent)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Monthly Limit</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={100}
                            step={1}
                            value={editLimitValue}
                            onChange={(e) => setEditLimitValue(Number(e.target.value))}
                            className="w-24 text-xs font-mono-num px-1 py-0.5 border rounded border-emerald-500 focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              onUpdateBudget(budget.categoryKey, editLimitValue);
                              setEditingBudgetCategory(null);
                            }}
                            className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingBudgetCategory(budget.categoryKey);
                            setEditLimitValue(budget.monthlyBudgetUGX);
                          }}
                          className="font-mono-num font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer underline decoration-dotted"
                          title="Click to edit budget limit"
                        >
                          {formatUGX(budget.monthlyBudgetUGX)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Personal & Borrower Household Budgeting Dashboard */}
      {activeSubTab === 'personal' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  Borrower & Member Personal Budgeting Assessment
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time income vs expense modeling used during credit underwriting and financial wellness advisory.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Prudent DSR: 21%
              </span>
            </div>

            {/* Micro-Metrics for Personal Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4 font-mono-num">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-sans">Monthly Take-Home</span>
                <strong className="text-slate-900 text-base font-bold">{formatUGX(personalIncome)}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-sans">Living & Loan Expenses</span>
                <strong className="text-slate-800 text-base font-bold">{formatUGX(personalExpenses)}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-sans">Voluntary Savings Target</span>
                <strong className="text-indigo-700 text-base font-bold">{formatUGX(personalSavings)}</strong>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[11px] text-emerald-900 block font-sans font-semibold">Net Retained Surplus</span>
                <strong className="text-emerald-950 text-base font-bold">{formatUGX(personalNetSurplus)}</strong>
              </div>
            </div>

            {/* Personal Budget Line Items */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-num">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                    <th className="py-2.5 px-3 font-sans">Budget Category</th>
                    <th className="py-2.5 px-3 font-sans">Type</th>
                    <th className="py-2.5 px-3 text-right">Planned (UGX)</th>
                    <th className="py-2.5 px-3 text-right">Actual (UGX)</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                    <th className="py-2.5 px-3 font-sans">Budget Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personalBudget.map((item) => {
                    const variance = item.monthlyActualUGX - item.monthlyPlannedUGX;
                    const isFavorable = item.type === 'income' ? variance >= 0 : variance <= 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-sans font-bold text-slate-900">
                          {item.category}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.type === 'income'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.type === 'savings_goal'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {formatUGX(item.monthlyPlannedUGX)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatUGX(item.monthlyActualUGX)}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${isFavorable ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {variance > 0 ? `+${formatUGX(variance)}` : variance < 0 ? `-${formatUGX(Math.abs(variance))}` : 'UGX 0'}
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-500 text-[11px]">
                          {item.notes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Fixed Asset Register & Depreciation (PRD M11) */}
      {activeSubTab === 'assets' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  Institutional Fixed Asset Register & Straight-Line Depreciation
                </h3>
                <p className="text-xs text-slate-500">
                  Track physical branch capital assets, monthly amortized wear and tear, and post journal entries to GL.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunDepreciationClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Post Monthly Depreciation to GL
                </button>
              </div>
            </div>

            {depreciationSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Monthly depreciation run executed: Total UGX {formatCompactUGX(totalMonthlyDepreciation)} posted to General Ledger Account 5400 and credited to Allowance Account 1210.
                </span>
              </div>
            )}

            {/* Asset Totals Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono-num text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-sans block mb-0.5">Historical Purchase Cost</span>
                <strong className="text-lg font-bold text-slate-900">{formatUGX(totalAssetCost)}</strong>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-sans block mb-0.5">Current Net Book Value</span>
                <strong className="text-lg font-bold text-emerald-700">{formatUGX(totalAssetBookValue)}</strong>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-sans block mb-0.5">Monthly Straight-Line Expense</span>
                <strong className="text-lg font-bold text-amber-700">{formatUGX(totalMonthlyDepreciation)}</strong>
              </div>
            </div>

            {/* Asset Register Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-num">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                    <th className="py-2.5 px-3">Asset No.</th>
                    <th className="py-2.5 px-3 font-sans">Asset Name & Category</th>
                    <th className="py-2.5 px-3">Purchase Date</th>
                    <th className="py-2.5 px-3 text-right">Cost (UGX)</th>
                    <th className="py-2.5 px-3 text-right">Accum. Depr.</th>
                    <th className="py-2.5 px-3 text-right">Book Value</th>
                    <th className="py-2.5 px-3 text-right">Monthly Depr.</th>
                    <th className="py-2.5 px-3 font-sans">Location / Custodian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fixedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{asset.assetNo}</td>
                      <td className="py-3 px-3 font-sans">
                        <div className="flex items-center gap-2">
                          {getAssetCategoryIcon(asset.category)}
                          <div>
                            <p className="font-bold text-slate-800">{asset.name}</p>
                            <span className="text-[11px] text-slate-500">{asset.category} ({asset.usefulLifeMonths} mos life)</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{asset.purchaseDate}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">{formatUGX(asset.purchaseCostUGX)}</td>
                      <td className="py-3 px-3 text-right text-rose-700">{formatUGX(asset.accumulatedDepreciationUGX)}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatUGX(asset.currentBookValueUGX)}</td>
                      <td className="py-3 px-3 text-right text-amber-700">{formatUGX(asset.monthlyDepreciationUGX)}</td>
                      <td className="py-3 px-3 font-sans text-slate-600 text-[11px]">
                        <p className="font-semibold text-slate-800">{asset.location}</p>
                        <p className="text-slate-400">{asset.custodian}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Real-time Expense Ledger & Search */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Posted Expense Records & Receipt Registry
              </h3>
              <p className="text-xs text-slate-500">
                Every expense automatically posts a balanced double-entry journal entry to the general ledger.
              </p>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search vendor, note, ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {budgets.map((b) => (
                  <option key={b.categoryKey} value={b.categoryKey}>
                    {b.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3">Expense No.</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Vendor / Payee</th>
                  <th className="py-2.5 px-3">Channel & Ref</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Receipt Doc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No expense items match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono-num font-bold text-slate-900">
                        {exp.expenseNo}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono-num">
                        {exp.expenseDate}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {getCategoryIcon(exp.category)}
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{exp.vendor}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{exp.notes}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-700">{exp.channel}</p>
                        <p className="text-[11px] text-slate-400 font-mono-num">{exp.referenceNo}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold text-slate-900 text-sm">
                        {formatUGX(exp.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {exp.hasReceiptAttachment ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Receipt className="w-3 h-3" />
                            Attached
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record New Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Record Operational Expense
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Budget Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as ExpenseItem['category'] })
                  }
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {budgets.map((b) => (
                    <option key={b.categoryKey} value={b.categoryKey}>
                      {b.categoryName} (Budget: {formatCompactUGX(b.monthlyBudgetUGX)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vendor / Payee
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TotalEnergies Fuel"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount (UGX)
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={1}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono-num font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Disbursement Channel
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) =>
                      setFormData({ ...formData, channel: e.target.value as ExpenseItem['channel'] })
                    }
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Petty Cash">Petty Cash Till</option>
                    <option value="MTN MoMo Business">MTN MoMo Corporate Float</option>
                    <option value="Bank Transfer">Stanbic Bank Operational</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  External Receipt Reference / Invoice No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. REC-88912 or MTN-TX-4412"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono-num"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Narration / Business Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="Details for auditor and tax review..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="receipt-attach"
                  checked={formData.hasReceiptAttachment}
                  onChange={(e) => setFormData({ ...formData, hasReceiptAttachment: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="receipt-attach" className="text-slate-700 font-medium cursor-pointer">
                  Physical / E-Receipt scanned and attached to audit voucher
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Post Expense & Ledger Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
