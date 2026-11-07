import React, { useState } from 'react';
import {
  Customer,
  LoanProduct,
  AppUser,
  Tenant,
  Branch,
} from '../types';
import {
  formatUGX,
  formatCompactUGX,
  assessAffordability,
  calculateSchedule,
} from '../utils/finance';
import {
  PlusCircle,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';

interface LoanOriginationModalProps {
  tenant: Tenant;
  branch: Branch;
  currentUser: AppUser;
  customers: Customer[];
  products: LoanProduct[];
  onClose: () => void;
  onSubmitApplication: (applicationData: {
    customerId: string;
    productId: string;
    requestedAmount: number;
    requestedTermMonths: number;
    purpose: string;
    collateralDescription: string;
    collateralEstimatedValue: number;
  }) => void;
}

export const LoanOriginationModal: React.FC<LoanOriginationModalProps> = ({
  tenant,
  branch,
  currentUser,
  customers,
  products,
  onClose,
  onSubmitApplication,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [amount, setAmount] = useState<number>(5_000_000);
  const [termMonths, setTermMonths] = useState<number>(6);
  const [purpose, setPurpose] = useState('');
  const [collateralDescription, setCollateralDescription] = useState('Land Title Block 12, Katwe / Household Goods');
  const [collateralValue, setCollateralValue] = useState<number>(12_000_000);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Schedule preview
  const previewSchedule = calculateSchedule(
    amount,
    selectedProduct.annualRatePercent,
    termMonths,
    'monthly',
    selectedProduct.interestMethod,
    new Date().toISOString().split('T')[0],
    selectedProduct.processingFeePercent
  );

  // Affordability calculation
  const monthlyIncome = selectedCustomer?.monthlyIncome || 3_000_000;
  const monthlyExpenses = selectedCustomer?.monthlyExpenses || 1_200_000;
  const existingDebt = 0;
  const proposedInstalment = previewSchedule.periodicInstalment || Math.round(amount / termMonths);

  const affordability = assessAffordability(
    monthlyIncome,
    monthlyExpenses,
    existingDebt,
    proposedInstalment
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedProductId || amount <= 0) return;

    onSubmitApplication({
      customerId: selectedCustomerId,
      productId: selectedProductId,
      requestedAmount: amount,
      requestedTermMonths: termMonths,
      purpose: purpose || 'Working capital stock purchase for commercial retail operations.',
      collateralDescription,
      collateralEstimatedValue: collateralValue,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              New Loan Origination & Credit Assessment
            </h3>
            <p className="text-xs text-slate-400">
              Originating Officer: {currentUser.name} • Branch: {branch.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* 1. Borrower Selection */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-700">
              Select Borrower (KYC Verified Profiles)
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerNo} — {c.fullName} ({c.occupation}, Score: {c.creditScoreRating})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Product and Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Loan Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.annualRatePercent}% {p.interestMethod === 'flat' ? 'Flat' : 'Reducing'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Loan Term (Months)
              </label>
              <input
                type="number"
                min={selectedProduct.minTermMonths}
                max={selectedProduct.maxTermMonths}
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 3. Principal Amount */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">
                Principal Requested (UGX)
              </label>
              <span className="text-[11px] text-slate-400 font-mono-num">
                Limit: {formatCompactUGX(selectedProduct.minPrincipal)} - {formatCompactUGX(selectedProduct.maxPrincipal)}
              </span>
            </div>
            <input
              type="number"
              min={selectedProduct.minPrincipal}
              max={selectedProduct.maxPrincipal}
              step={100000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono-num font-bold border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 4. Real-Time Affordability & DSR Assessment Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Affordability & Debt Service Ratio (DSR) Check
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  affordability.isAffordable
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {affordability.riskRating} Risk • DSR {affordability.dsrPercent}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono-num">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Monthly Income</span>
                <strong className="text-slate-800">{formatCompactUGX(monthlyIncome)}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Living Expenses</span>
                <strong className="text-slate-800">{formatCompactUGX(monthlyExpenses)}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Proposed Instalment</span>
                <strong className="text-emerald-700">{formatCompactUGX(proposedInstalment)}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Net Disposable</span>
                <strong className="text-slate-800">{formatCompactUGX(affordability.netDisposableIncome)}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              {affordability.isAffordable
                ? 'Borrower meets Tier 4 Uganda affordability guidelines (DSR ≤ 50%).'
                : 'Warning: Debt Service Ratio breaches 50% prudent guideline. Committee sign-off required.'}
            </p>
          </div>

          {/* 5. Collateral & Security Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Collateral / Security Description
              </label>
              <input
                type="text"
                value={collateralDescription}
                onChange={(e) => setCollateralDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estimated Collateral Valuation (UGX)
              </label>
              <input
                type="number"
                value={collateralValue}
                onChange={(e) => setCollateralValue(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 6. Purpose of the loan */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Loan Purpose & Narration
            </label>
            <textarea
              rows={2}
              placeholder="Explain intended use of funds..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Submit Application & Underwrite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
