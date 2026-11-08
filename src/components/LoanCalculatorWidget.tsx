import React, { useState } from 'react';
import { Tenant, Branch, LoanProduct, AppUser } from '../types';
import { calculateSchedule, formatUGX, formatCompactUGX } from '../utils/finance';
import { exportLoanScheduleQuotePDF } from '../utils/pdfExport';
import {
  Calculator,
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
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

interface LoanCalculatorWidgetProps {
  tenant: Tenant;
  branch?: Branch;
  products: LoanProduct[];
  currentUser?: AppUser;
  onOriginateWithParams?: (params: { amount: number; termMonths: number; productId: string }) => void;
}

export const LoanCalculatorWidget: React.FC<LoanCalculatorWidgetProps> = ({
  tenant,
  branch,
  products = [],
  currentUser,
  onOriginateWithParams,
}) => {
  const defaultProduct = products[0];

  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProduct?.id || '');
  const [principal, setPrincipal] = useState<number>(5_000_000);
  const [annualRate, setAnnualRate] = useState<number>(defaultProduct?.annualRatePercent || 18);
  const [termMonths, setTermMonths] = useState<number>(defaultProduct?.minTermMonths || 6);
  const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [interestMethod, setInterestMethod] = useState<'reducing_balance' | 'flat'>('reducing_balance');
  const [processingFeePercent, setProcessingFeePercent] = useState<number>(2.0);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scheduleViewLimit, setScheduleViewLimit] = useState<number>(12);

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setAnnualRate(prod.annualRatePercent);
      setInterestMethod(prod.interestMethod);
      setProcessingFeePercent(prod.processingFeePercent || 2.0);
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
      setProcessingFeePercent(defaultProduct.processingFeePercent || 2.0);
    } else {
      setSelectedProductId('');
      setPrincipal(5_000_000);
      setAnnualRate(18);
      setTermMonths(6);
      setInterestMethod('reducing_balance');
      setProcessingFeePercent(2.0);
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
      branch || { id: 'main', tenantId: tenant.id, name: 'Main Branch', code: 'MAIN', address: 'Plot 10 Kampala Road', city: 'Kampala', phone: '+256 700 000 000', managerName: 'Branch Manager', status: 'active' },
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
      {/* Widget Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white tracking-tight">
                Standalone Loan Repayment Calculator
              </h3>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Pre-Origination Simulator
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Simulate weekly &amp; monthly amortization schedules, calculate borrowing capacity, and verify repayment totals before originating.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Schedule PDF
          </button>
        </div>
      </div>

      <div className="p-6 pt-0 space-y-6">
        {/* Main Grid: Parameters Form (Left) vs Summary Output (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Simulation Parameters */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Loan Facility Parameters
              </h4>
              <span className="text-[11px] text-slate-500">Live Simulation (No database record created)</span>
            </div>

            {/* Product Preset Selection */}
            {products.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loan Product Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {products.map((p) => {
                    const isSelected = selectedProductId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProductSelect(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 truncate">{p.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {p.annualRatePercent}% p.a. • {p.interestMethod === 'flat' ? 'Flat' : 'Reducing'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Principal Amount with Quick Presets */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Principal Amount (UGX)
                </label>
                <span className="font-bold text-sm text-emerald-700 font-mono-num">
                  {formatUGX(principal)}
                </span>
              </div>
              <input
                type="number"
                min={500_000}
                max={100_000_000}
                step={500_000}
                value={principal}
                onChange={(e) => setPrincipal(Math.max(100_000, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono-num focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[1_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPrincipal(amt)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      principal === amt
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {formatCompactUGX(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Term and Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Term Length ({termMonths} Months)
                </label>
                <input
                  type="range"
                  min={1}
                  max={36}
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>1 Mo</span>
                  <span>12 Mo</span>
                  <span>24 Mo</span>
                  <span>36 Mo</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFrequency('monthly')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      frequency === 'monthly'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Monthly ({termMonths} Inst.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('weekly')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      frequency === 'weekly'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Weekly ({termMonths * 4} Inst.)
                  </button>
                </div>
              </div>
            </div>

            {/* Interest Rate & Method */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Annual Interest Rate (% p.a.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={0.5}
                    min={1}
                    max={60}
                    value={annualRate}
                    onChange={(e) => setAnnualRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono-num focus:ring-2 focus:ring-emerald-500 focus:outline-none pr-7"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amortization Method
                </label>
                <select
                  value={interestMethod}
                  onChange={(e) => setInterestMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="reducing_balance">Reducing Balance (Standard)</option>
                  <option value="flat">Flat Rate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Processing Fee (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    max={10}
                    value={processingFeePercent}
                    onChange={(e) => setProcessingFeePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono-num focus:ring-2 focus:ring-emerald-500 focus:outline-none pr-7"
                  />
                  <span className="text-xs text-slate-400 absolute right-2.5 top-2">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Financial Simulation Output */}
          <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Simulation Breakdown
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {frequency === 'monthly' ? `${termMonths} Monthly Installments` : `${termMonths * 4} Weekly Installments`}
                </span>
              </div>

              {/* Hero Periodic Payment Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mt-3">
                <span className="text-[11px] text-slate-500 font-medium">
                  {frequency === 'monthly' ? 'Estimated Monthly Payment' : 'Estimated Weekly Payment'}
                </span>
                <p className="text-2xl font-black text-emerald-800 font-mono-num mt-1">
                  {formatUGX(periodicAmount)}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Includes principal, interest &amp; statutory allocations
                </span>
              </div>

              {/* Totals Summary Grid */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Total Interest</span>
                  <span className="text-xs font-bold text-slate-900 font-mono-num">
                    {formatUGX(scheduleResult.totalInterest)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Processing Fees</span>
                  <span className="text-xs font-bold text-slate-900 font-mono-num">
                    {formatUGX(scheduleResult.totalFees)}
                  </span>
                </div>
                <div className="col-span-2 bg-emerald-950 text-white p-3 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-bold">Total Cost of Credit (Repayable)</span>
                  <span className="text-sm font-bold text-emerald-300 font-mono-num">
                    {formatUGX(totalRepayable)}
                  </span>
                </div>
              </div>

              {/* Visual Breakdown Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-700">Payment Allocation Ratio</span>
                  <span className="text-emerald-700">{principalRatio.toFixed(0)}% Principal</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200 flex overflow-hidden">
                  <div style={{ width: `${principalRatio}%` }} className="bg-emerald-600" title="Principal" />
                  <div style={{ width: `${interestRatio}%` }} className="bg-amber-500" title="Interest" />
                  <div style={{ width: `${feeRatio}%` }} className="bg-sky-500" title="Fees" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span> Principal ({principalRatio.toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Interest ({interestRatio.toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span> Fees ({feeRatio.toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Action to Originate Loan */}
            {onOriginateWithParams && (
              <button
                type="button"
                onClick={() =>
                  onOriginateWithParams({
                    amount: principal,
                    termMonths,
                    productId: selectedProductId,
                  })
                }
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Originate Loan with this Simulation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Amortization Schedule Preview Table */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Detailed Amortization Repayment Schedule ({scheduleResult.installments.length} Installments)
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 text-[11px]">Display rows:</span>
              <button
                type="button"
                onClick={() => setScheduleViewLimit(scheduleViewLimit === 12 ? 100 : 12)}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {scheduleViewLimit === 12 ? 'Show All Rows' : 'Collapse to 12'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Principal (UGX)</th>
                  <th className="py-2.5 px-3 text-right">Interest (UGX)</th>
                  <th className="py-2.5 px-3 text-right">Fees (UGX)</th>
                  <th className="py-2.5 px-3 text-right">Total Installment</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-num text-slate-700">
                {scheduleResult.installments.slice(0, scheduleViewLimit).map((inst) => (
                  <tr key={inst.installmentNo} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-900">{inst.installmentNo}</td>
                    <td className="py-2 px-3 font-sans text-slate-600">{inst.dueDate}</td>
                    <td className="py-2 px-3 text-right">{formatUGX(inst.principalDue)}</td>
                    <td className="py-2 px-3 text-right text-amber-700">{formatUGX(inst.interestDue)}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{inst.feesDue > 0 ? formatUGX(inst.feesDue) : '-'}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-800">{formatUGX(inst.totalDue)}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{formatUGX(inst.remainingPrincipal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
