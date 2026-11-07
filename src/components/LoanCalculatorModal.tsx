import React, { useState } from 'react';
import { Tenant, Branch, LoanProduct, AppUser } from '../types';
import { calculateSchedule, formatUGX } from '../utils/finance';
import { exportLoanScheduleQuotePDF } from '../utils/pdfExport';
import {
  Calculator,
  X,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Printer,
  Download,
  RotateCcw,
  Sparkles,
  Info,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react';

interface LoanCalculatorModalProps {
  tenant: Tenant;
  branch?: Branch;
  products?: LoanProduct[];
  isOpen: boolean;
  onClose: () => void;
  onApplyWithParams?: (params: { amount: number; termMonths: number; productId: string }) => void;
  currentUser?: AppUser;
}

export const LoanCalculatorModal: React.FC<LoanCalculatorModalProps> = ({
  tenant,
  branch,
  products = [],
  isOpen,
  onClose,
  onApplyWithParams,
  currentUser,
}) => {
  const defaultProduct = products[0];

  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProduct?.id || '');
  const [principal, setPrincipal] = useState<number>(5_000_000);
  const [annualRate, setAnnualRate] = useState<number>(defaultProduct?.annualRatePercent || 24);
  const [termMonths, setTermMonths] = useState<number>(defaultProduct?.minTermMonths || 6);
  const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [interestMethod, setInterestMethod] = useState<'reducing_balance' | 'flat'>('reducing_balance');
  const [processingFeePercent, setProcessingFeePercent] = useState<number>(2.5);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setAnnualRate(prod.annualRatePercent);
      setInterestMethod(prod.interestMethod);
      setProcessingFeePercent(prod.processingFeePercent);
      if (principal < prod.minPrincipal) setPrincipal(prod.minPrincipal);
      if (principal > prod.maxPrincipal) setPrincipal(prod.maxPrincipal);
    }
  };

  const handleResetDefaults = () => {
    if (defaultProduct) {
      setSelectedProductId(defaultProduct.id);
      setPrincipal(5_000_000);
      setAnnualRate(defaultProduct.annualRatePercent);
      setTermMonths(defaultProduct.minTermMonths || 6);
      setInterestMethod(defaultProduct.interestMethod);
      setProcessingFeePercent(defaultProduct.processingFeePercent);
    } else {
      setSelectedProductId('');
      setPrincipal(5_000_000);
      setAnnualRate(24);
      setTermMonths(6);
      setInterestMethod('reducing_balance');
      setProcessingFeePercent(2.5);
    }
    setFrequency('monthly');
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  const scheduleResult = calculateSchedule(
    principal,
    annualRate,
    termMonths,
    frequency,
    interestMethod,
    startDate,
    processingFeePercent
  );

  const periodicAmount = scheduleResult.installments[0]?.totalDue || 0;
  const totalRepayable = principal + scheduleResult.totalInterest + scheduleResult.totalFees;

  const principalRatio = totalRepayable > 0 ? (principal / totalRepayable) * 100 : 0;
  const interestRatio = totalRepayable > 0 ? (scheduleResult.totalInterest / totalRepayable) * 100 : 0;
  const feeRatio = totalRepayable > 0 ? (scheduleResult.totalFees / totalRepayable) * 100 : 0;

  const handleExportPDF = () => {
    exportLoanScheduleQuotePDF(
      tenant,
      branch,
      {
        principal,
        annualRate,
        termMonths,
        frequency,
        interestMethod,
        processingFeePercent,
        totalInterest: scheduleResult.totalInterest,
        totalFees: scheduleResult.totalFees,
        totalRepayable,
        periodicAmount,
        installments: scheduleResult.installments,
      },
      currentUser
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calculator-title"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ring-1 ring-white/20"
              style={{ backgroundColor: tenant.branding?.primaryColor || '#0f766e' }}
            >
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="calculator-title" className="text-base font-bold tracking-tight text-white">
                  Quick Loan Calculator
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  Instant Simulation
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  No Application Required
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Input principal, interest rate, and term to generate projected amortization schedules and installment quotes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              title="Reset parameters to defaults"
              aria-label="Reset parameters to defaults"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={onClose}
              aria-label="Close Quick Loan Calculator"
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational banner: No official loan application required */}
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Pre-application Modeling:</strong> Use this standalone tool to quote borrowers or simulate repayment scenarios. No official loan file or borrower record is saved.
            </span>
          </div>
          <span className="hidden md:inline font-mono text-[11px] font-semibold text-emerald-700">
            UMRA Tier 4 Compliant Amortization
          </span>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Controls Panel (5 cols) */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-50 border-r border-slate-200 space-y-4.5">
            {/* Preset Loan Product (Optional) */}
            {products.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Product Template (Optional)</span>
                  <span className="text-[10px] font-normal text-slate-500">Auto-fill standard terms</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                >
                  <option value="">-- Custom Terms / Ad-hoc Simulation --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.annualRatePercent}% p.a. • {p.interestMethod === 'reducing_balance' ? 'Reducing' : 'Flat'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Principal Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Principal Loan Amount (UGX)
                </label>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {formatUGX(principal)}
                </span>
              </div>
              <input
                type="number"
                step="100000"
                min="100000"
                max="100000000"
                value={principal}
                onChange={(e) => setPrincipal(Math.max(100000, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              {/* Range Slider for Principal */}
              <div className="mt-2">
                <input
                  type="range"
                  min="500000"
                  max="30000000"
                  step="250000"
                  value={Math.min(30000000, principal)}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
              {/* Quick Amount Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {[500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPrincipal(amt)}
                    className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                      principal === amt
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {amt >= 1_000_000 ? `${amt / 1_000_000}M` : `${amt / 1_000}K`}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate & Term Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-amber-600" />
                    Interest Rate (% p.a.)
                  </label>
                  <span className="text-[11px] font-mono font-semibold text-slate-600">{annualRate}%</span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="120"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Math.max(0.1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
                <input
                  type="range"
                  min="5"
                  max="48"
                  step="0.5"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  {[12, 18, 24, 30, 36].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setAnnualRate(rate)}
                      className={`flex-1 py-0.5 text-[10px] font-semibold rounded text-center transition-colors cursor-pointer ${
                        annualRate === rate
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-200/70 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Term ({frequency === 'monthly' ? 'Months' : 'Weeks'})
                  </label>
                  <span className="text-[11px] font-mono font-semibold text-slate-600">{termMonths} {frequency === 'monthly' ? 'mo' : 'wks'}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={termMonths}
                  onChange={(e) => setTermMonths(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
                <input
                  type="range"
                  min="1"
                  max="36"
                  step="1"
                  value={Math.min(36, termMonths)}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
                />
                <div className="flex items-center gap-1 mt-1.5">
                  {[3, 6, 12, 18, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTermMonths(m)}
                      className={`flex-1 py-0.5 text-[10px] font-semibold rounded text-center transition-colors cursor-pointer ${
                        termMonths === m
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200/70 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interest Method & Payment Frequency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Repayment Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'monthly' | 'weekly')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Interest Method</label>
                <select
                  value={interestMethod}
                  onChange={(e) => setInterestMethod(e.target.value as 'reducing_balance' | 'flat')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="reducing_balance">Reducing Balance (Amortized)</option>
                  <option value="flat">Flat Rate (Fixed Total)</option>
                </select>
              </div>
            </div>

            {/* Processing Fee & Start Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Origination Fee (%)</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatUGX((principal * processingFeePercent) / 100)}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={processingFeePercent}
                  onChange={(e) => setProcessingFeePercent(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Due Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Optional Application Prefill button */}
            {onApplyWithParams && (
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    onApplyWithParams({
                      amount: principal,
                      termMonths,
                      productId: selectedProductId || (products[0]?.id || ''),
                    });
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Pre-fill Loan Application With These Terms</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
                <p className="text-[10px] text-center text-slate-500 mt-1">
                  Transfers parameters to official onboarding form (requires credit check & KYC).
                </p>
              </div>
            )}
          </div>

          {/* Results & Schedule Breakdown (7 cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 space-y-5">
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {frequency === 'monthly' ? 'Monthly' : 'Weekly'} Installment
                </span>
                <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                  {formatUGX(periodicAmount)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {scheduleResult.installments.length} installments
                </span>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Total Interest
                </span>
                <span className="text-sm font-extrabold text-amber-800 font-mono mt-0.5 block">
                  {formatUGX(scheduleResult.totalInterest)}
                </span>
                <span className="text-[10px] text-amber-700">
                  {interestMethod === 'reducing_balance' ? 'Amortized Reducing' : 'Flat Calculated'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Origination Fees
                </span>
                <span className="text-sm font-extrabold text-slate-700 font-mono mt-0.5 block">
                  {formatUGX(scheduleResult.totalFees)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {processingFeePercent}% Upfront
                </span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Repayable
                </span>
                <span className="text-sm font-extrabold text-emerald-900 font-mono mt-0.5 block">
                  {formatUGX(totalRepayable)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  Principal + Int + Fees
                </span>
              </div>
            </div>

            {/* Cost Breakdown Progress Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Repayment Composition Breakdown
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Effective APR ~{annualRate.toFixed(1)}% p.a.
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${principalRatio}%` }}
                  className="bg-emerald-600 h-full transition-all duration-300"
                  title={`Principal: ${principalRatio.toFixed(1)}%`}
                />
                <div
                  style={{ width: `${interestRatio}%` }}
                  className="bg-amber-500 h-full transition-all duration-300"
                  title={`Interest: ${interestRatio.toFixed(1)}%`}
                />
                <div
                  style={{ width: `${feeRatio}%` }}
                  className="bg-blue-500 h-full transition-all duration-300"
                  title={`Fees: ${feeRatio.toFixed(1)}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2 font-medium">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                  <span>Principal: {formatUGX(principal)} ({principalRatio.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  <span>Interest: {formatUGX(scheduleResult.totalInterest)} ({interestRatio.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                  <span>Fees: {formatUGX(scheduleResult.totalFees)} ({feeRatio.toFixed(0)}%)</span>
                </div>
              </div>
            </div>

            {/* Installment Breakdown Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Projected Repayment Schedule ({scheduleResult.installments.length} Installments)
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                    title="Export branded schedule quote as PDF"
                  >
                    <Download className="w-3 h-3" />
                    Download PDF Quote
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                    title="Print projected schedule"
                  >
                    <Printer className="w-3 h-3 text-slate-600" />
                    Print
                  </button>
                </div>
              </div>

              <div className="max-h-64 sm:max-h-72 overflow-y-auto border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3 text-right">Principal</th>
                      <th className="py-2 px-3 text-right">Interest</th>
                      <th className="py-2 px-3 text-right">Total Due</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {scheduleResult.installments.map((inst) => (
                      <tr key={inst.installmentNo} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 px-3 font-sans font-bold text-slate-600">
                          {inst.installmentNo}
                        </td>
                        <td className="py-1.5 px-3 text-slate-700 font-sans">{inst.dueDate}</td>
                        <td className="py-1.5 px-3 text-right text-slate-800 font-medium">
                          {formatUGX(inst.principalDue)}
                        </td>
                        <td className="py-1.5 px-3 text-right text-amber-700 font-medium">
                          {formatUGX(inst.interestDue)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900 bg-slate-50/50">
                          {formatUGX(inst.totalDue)}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-500">
                          {formatUGX(inst.remainingPrincipal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statutory Compliance Note & Bottom Actions */}
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Statutory Notice:</strong> Projections comply with UMRA Tier 4 microfinance guidelines. Quote does not constitute a legally binding credit commitment.
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 text-xs cursor-pointer shadow-xs"
              >
                Close Calculator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
