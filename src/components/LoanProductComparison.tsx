import React, { useState, useMemo } from 'react';
import { LoanProduct, Tenant, Branch } from '../types';
import { formatUGX, formatCompactUGX, PaymentFrequency } from '../utils/finance';
import {
  computeProductComparison,
  generateProductComparisonCSV,
  ProductComparisonMetric,
} from '../utils/loanComparisonUtils';
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  Sparkles,
  Sliders,
  DollarSign,
  Calendar,
  Percent,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  Info,
  Scale,
  Award,
  Zap,
  Filter,
  Search,
  X,
  CreditCard,
  Calculator,
} from 'lucide-react';

interface LoanProductComparisonProps {
  tenant: Tenant;
  branch: Branch;
  products: LoanProduct[];
  onOriginateWithProduct?: (product: LoanProduct) => void;
  onSwitchToCalculator?: (productId: string) => void;
}

export const LoanProductComparison: React.FC<LoanProductComparisonProps> = ({
  tenant,
  branch,
  products = [],
  onOriginateWithProduct,
  onSwitchToCalculator,
}) => {
  // Filter products belonging to current tenant and active
  const tenantProducts = useMemo(() => {
    return products.filter((p) => p.tenantId === tenant.id);
  }, [products, tenant.id]);

  // Initial selection: select first 3 active products, or all if fewer
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    const active = tenantProducts.filter((p) => p.status === 'active');
    return active.slice(0, 3).map((p) => p.id);
  });

  const [benchmarkPrincipal, setBenchmarkPrincipal] = useState<number>(5_000_000);
  const [benchmarkTermMonths, setBenchmarkTermMonths] = useState<number>(6);
  const [frequency, setFrequency] = useState<PaymentFrequency>('monthly');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightBestTerms, setHighlightBestTerms] = useState<boolean>(true);
  const [highlightDifferences, setHighlightDifferences] = useState<boolean>(false);

  // Toggle selection
  const handleToggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Quick Preset Handlers
  const handleSelectAll = () => {
    setSelectedProductIds(tenantProducts.map((p) => p.id));
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  const handleSelectPreset = (category: 'retail' | 'agri' | 'specialized') => {
    if (category === 'retail') {
      const ids = tenantProducts
        .filter((p) =>
          ['prod-sme', 'prod-boda', 'prod-salary', 'SME-WC', 'ASSET-BODA', 'SAL-ADV'].some(
            (tag) => p.id === tag || p.code === tag
          )
        )
        .map((p) => p.id);
      setSelectedProductIds(ids.length > 0 ? ids : tenantProducts.slice(0, 3).map((p) => p.id));
    } else if (category === 'agri') {
      const ids = tenantProducts
        .filter((p) =>
          [
            'prod-agri',
            'prod-solar',
            'prod-agri-comm',
            'AGRI-GRP',
            'SOLAR-PAYG',
            'AGRI-COMM',
          ].some((tag) => p.id === tag || p.code === tag)
        )
        .map((p) => p.id);
      setSelectedProductIds(ids.length > 0 ? ids : tenantProducts.slice(0, 3).map((p) => p.id));
    } else if (category === 'specialized') {
      const ids = tenantProducts
        .filter((p) =>
          [
            'prod-sch-fees',
            'prod-wib-mkt',
            'prod-trike',
            'prod-land-sec',
            'SCH-FEES',
            'WIB-MKT',
            'TRIKE-CARGO',
            'LAND-SEC',
          ].some((tag) => p.id === tag || p.code === tag)
        )
        .map((p) => p.id);
      setSelectedProductIds(ids.length > 0 ? ids : tenantProducts.slice(0, 3).map((p) => p.id));
    }
  };

  // Products currently selected
  const selectedProducts = useMemo(() => {
    return tenantProducts.filter((p) => selectedProductIds.includes(p.id));
  }, [tenantProducts, selectedProductIds]);

  // Compute metrics and highlights
  const { metrics, highlights } = useMemo(() => {
    return computeProductComparison(
      selectedProducts,
      benchmarkPrincipal,
      benchmarkTermMonths,
      frequency
    );
  }, [selectedProducts, benchmarkPrincipal, benchmarkTermMonths, frequency]);

  // Filtered product chips for search
  const visibleProductsForSelection = useMemo(() => {
    if (!searchQuery.trim()) return tenantProducts;
    const q = searchQuery.toLowerCase();
    return tenantProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [tenantProducts, searchQuery]);

  // Check if a row has differences across selected products
  const hasRateDifference = useMemo(() => {
    if (metrics.length <= 1) return false;
    const first = metrics[0].annualRatePercent;
    return metrics.some((m) => m.annualRatePercent !== first);
  }, [metrics]);

  const hasMethodDifference = useMemo(() => {
    if (metrics.length <= 1) return false;
    const first = metrics[0].interestMethod;
    return metrics.some((m) => m.interestMethod !== first);
  }, [metrics]);

  const hasFeeDifference = useMemo(() => {
    if (metrics.length <= 1) return false;
    const first = metrics[0].processingFeePercent;
    return metrics.some((m) => m.processingFeePercent !== first);
  }, [metrics]);

  const hasTenureDifference = useMemo(() => {
    if (metrics.length <= 1) return false;
    const first = `${metrics[0].minTermMonths}-${metrics[0].maxTermMonths}`;
    return metrics.some((m) => `${m.minTermMonths}-${m.maxTermMonths}` !== first);
  }, [metrics]);

  // Download CSV
  const handleDownloadCSV = () => {
    const csvData = generateProductComparisonCSV(metrics, tenant.legalName);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KEROLENDA_Loan_Products_Comparison_${tenant.slug || 'mfi'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-2xl border border-emerald-500/20 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>Prudential Terms &amp; Multi-Facility Analysis</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Side-by-Side Loan Product Comparison
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Compare statutory interest rates, upfront processing fees, loan protection deductions,
              repayment tenures, and projected borrower installments under Uganda Tier 4 Microfinance
              guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHighlightBestTerms(!highlightBestTerms)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                highlightBestTerms
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Highlight Best Terms</span>
            </button>

            <button
              type="button"
              onClick={() => setHighlightDifferences(!highlightDifferences)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                highlightDifferences
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Highlight Differences</span>
            </button>

            {metrics.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV Matrix</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Selector Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Select Loan Products to Compare
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {selectedProductIds.length} Selected of {tenantProducts.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select 2 to 4 facilities for the clearest side-by-side view. Click any chip to toggle.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-400 text-[11px] mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => handleSelectPreset('retail')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer border border-slate-200"
            >
              Retail &amp; Microloans
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('agri')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer border border-slate-200"
            >
              Clean Energy &amp; Agri
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('specialized')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer border border-slate-200"
            >
              Specialized
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
            >
              Select All
            </button>
            {selectedProductIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer border border-red-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Product Selection Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {visibleProductsForSelection.map((prod) => {
            const isSelected = selectedProductIds.includes(prod.id);
            return (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleToggleProduct(prod.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-bold text-xs text-slate-900 leading-snug line-clamp-1">
                    {prod.name}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded font-bold">
                    {prod.code}
                  </span>
                  <span className="font-bold text-slate-900">
                    {prod.annualRatePercent}% p.a.
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Benchmark Simulation Parameters Bar */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Simulated Loan Scenario (What-If Parameters)
              </h3>
              <p className="text-xs text-slate-500">
                Adjust benchmark principal and term to simulate real side-by-side repayment figures.
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 border border-slate-300 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFrequency('monthly')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                frequency === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Installments
            </button>
            <button
              type="button"
              onClick={() => setFrequency('weekly')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                frequency === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Installments
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Principal Slider & Presets */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Benchmark Loan Amount (UGX)
              </label>
              <span className="text-sm font-black text-emerald-700 font-mono">
                {formatUGX(benchmarkPrincipal)}
              </span>
            </div>

            <input
              type="range"
              min="500000"
              max="50000000"
              step="500000"
              value={benchmarkPrincipal}
              onChange={(e) => setBenchmarkPrincipal(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[1_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBenchmarkPrincipal(amt)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer border ${
                    benchmarkPrincipal === amt
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {formatCompactUGX(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Term Slider & Presets */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Benchmark Repayment Term (Months)
              </label>
              <span className="text-sm font-black text-slate-900 font-mono">
                {benchmarkTermMonths} Months
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="36"
              step="1"
              value={benchmarkTermMonths}
              onChange={(e) => setBenchmarkTermMonths(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[1, 3, 6, 12, 18, 24, 36].map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => setBenchmarkTermMonths(months)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer border ${
                    benchmarkTermMonths === months
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {months}m
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Comparison Matrix or Empty State */}
      {metrics.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <ArrowLeftRight className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              No Loan Products Selected for Comparison
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Please select at least two loan facilities using the selector chips above, or choose
              one of the quick presets to view the side-by-side comparison table.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleSelectPreset('retail')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Compare Retail Facilities
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Compare All Products
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              {/* Product Header Row */}
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="p-4 w-60 min-w-56 sticky left-0 z-10 bg-slate-900 font-bold text-slate-200 uppercase tracking-wider text-[11px] border-r border-slate-800">
                    Product Specification
                  </th>
                  {metrics.map((m) => {
                    const isLowestRate = highlights.lowestRateProductId === m.product.id;
                    const isLowestFee = highlights.lowestFeeProductId === m.product.id;
                    return (
                      <th
                        key={m.product.id}
                        className="p-4 min-w-64 max-w-xs align-top border-r border-slate-800 last:border-r-0 relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1.5">
                              {m.product.code}
                            </div>
                            <h4 className="font-bold text-sm text-white leading-tight">
                              {m.product.name}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleProduct(m.product.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            title="Remove from comparison"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {m.product.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.interestMethod === 'reducing_balance'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {m.interestMethod === 'reducing_balance'
                              ? 'Reducing Balance'
                              : 'Flat Rate'}
                          </span>
                          {highlightBestTerms && isLowestRate && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Award className="w-2.5 h-2.5" /> Lowest Rate
                            </span>
                          )}
                          {highlightBestTerms && isLowestFee && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Lowest Fees
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* SECTION 1: INTEREST RATES */}
                <tr className="bg-slate-100/80 font-bold text-slate-700">
                  <td
                    colSpan={metrics.length + 1}
                    className="px-4 py-2 uppercase tracking-wider text-[10px] text-slate-600 bg-slate-100"
                  >
                    1. Interest Rates &amp; Calculation Method
                  </td>
                </tr>

                {/* Annual Nominal Rate */}
                <tr className={highlightDifferences && hasRateDifference ? 'bg-amber-50/50' : 'hover:bg-slate-50/70'}>
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Nominal Annual Rate (% p.a.)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Contractual base interest rate
                    </span>
                  </td>
                  {metrics.map((m) => {
                    const isLowest = highlights.lowestRateProductId === m.product.id;
                    return (
                      <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-base font-black font-mono ${
                              highlightBestTerms && isLowest ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {m.annualRatePercent.toFixed(1)}%
                          </span>
                          <span className="text-[11px] text-slate-500">per annum</span>
                        </div>
                        {highlightBestTerms && isLowest && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                            Lowest Nominal Rate
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Monthly Equivalent Rate */}
                <tr className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <span>Monthly Equivalent Rate</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Annual rate divided by 12
                    </span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0 font-mono font-bold text-slate-800">
                      {m.monthlyRatePercent}% / month
                    </td>
                  ))}
                </tr>

                {/* Interest Calculation Method */}
                <tr className={highlightDifferences && hasMethodDifference ? 'bg-amber-50/50' : 'hover:bg-slate-50/70'}>
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <span>Interest Amortization Method</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      UMRA disclosure method
                    </span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          m.interestMethod === 'reducing_balance'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {m.interestMethod === 'reducing_balance' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-sky-600" />
                            Reducing Balance (Statutory Preferred)
                          </>
                        ) : (
                          <>
                            <Info className="w-3 h-3 text-purple-600" />
                            Flat Rate Interest
                          </>
                        )}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                        {m.interestMethod === 'reducing_balance'
                          ? 'Interest is charged only on the declining outstanding principal each cycle.'
                          : 'Interest is charged on the initial borrowed principal across the full term.'}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* SECTION 2: PROCESSING FEES & DEDUCTIONS */}
                <tr className="bg-slate-100/80 font-bold text-slate-700">
                  <td
                    colSpan={metrics.length + 1}
                    className="px-4 py-2 uppercase tracking-wider text-[10px] text-slate-600 bg-slate-100"
                  >
                    2. Upfront Processing Fees &amp; Statutory Deductions
                  </td>
                </tr>

                {/* Loan Processing Fee */}
                <tr className={highlightDifferences && hasFeeDifference ? 'bg-amber-50/50' : 'hover:bg-slate-50/70'}>
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <span>Upfront Processing Fee (%)</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Administrative &amp; KYC underwriting
                    </span>
                  </td>
                  {metrics.map((m) => {
                    const isLowest = highlights.lowestFeeProductId === m.product.id;
                    return (
                      <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-sm font-bold font-mono ${
                              highlightBestTerms && isLowest ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {m.processingFeePercent.toFixed(1)}%
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({formatUGX(m.processingFeeUGX)})
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Insurance / Protection Fund */}
                <tr className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <span>Credit Life / Loan Insurance</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Coverage for disability / demise
                    </span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0">
                      {m.insuranceFeePercent > 0 ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            {m.insuranceFeePercent.toFixed(1)}%
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({formatUGX(m.insuranceFeeUGX)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Nil (0.0%)</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Total Upfront Deductions */}
                <tr className="bg-slate-50/60 font-medium">
                  <td className="p-3.5 font-bold text-slate-800 sticky left-0 bg-slate-50/90 border-r border-slate-200">
                    <span>Total Upfront Deductions</span>
                    <span className="text-[10px] text-slate-500 block font-normal">
                      Processing fee + Insurance
                    </span>
                  </td>
                  {metrics.map((m) => {
                    const totalPct = m.processingFeePercent + m.insuranceFeePercent;
                    return (
                      <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0">
                        <span className="text-sm font-black text-rose-700 font-mono">
                          {formatUGX(m.totalUpfrontFeesUGX)}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                          {totalPct.toFixed(1)}% of principal
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Net Disbursed Principal */}
                <tr className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200">
                    <span>Net Disbursed Cash</span>
                    <span className="text-[10px] text-slate-500 block font-normal">
                      Liquid cash received by borrower
                    </span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0 font-mono font-black text-emerald-800">
                      {formatUGX(m.netDisbursedUGX)}
                    </td>
                  ))}
                </tr>

                {/* Daily Late Penalty */}
                <tr className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <span>Default / Late Payment Penalty</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Accrued daily on overdue balance
                    </span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0 font-mono text-slate-700">
                      {m.latePenaltyDailyPercent}% daily (~{(m.latePenaltyDailyPercent * 30).toFixed(1)}% / mo)
                    </td>
                  ))}
                </tr>

                {/* SECTION 3: REPAYMENT TERMS & TENURE */}
                <tr className="bg-slate-100/80 font-bold text-slate-700">
                  <td
                    colSpan={metrics.length + 1}
                    className="px-4 py-2 uppercase tracking-wider text-[10px] text-slate-600 bg-slate-100"
                  >
                    3. Repayment Terms &amp; Tenure Rules
                  </td>
                </tr>

                {/* Allowed Term Range */}
                <tr className={highlightDifferences && hasTenureDifference ? 'bg-amber-50/50' : 'hover:bg-slate-50/70'}>
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Allowed Repayment Tenure</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Minimum to maximum term
                    </span>
                  </td>
                  {metrics.map((m) => {
                    const isLongest = highlights.longestTenureProductId === m.product.id;
                    return (
                      <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0">
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          {m.minTermMonths} - {m.maxTermMonths} Months
                        </span>
                        {highlightBestTerms && isLongest && (
                          <span className="inline-block ml-2 text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded">
                            Longest Tenure
                          </span>
                        )}
                        <div className="mt-1">
                          {m.isTermInBounds ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Benchmark ({benchmarkTermMonths}m) is within range
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Benchmark ({benchmarkTermMonths}m) outside {m.minTermMonths}-{m.maxTermMonths}m
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Principal Borrowing Limits */}
                <tr className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <span>Borrowing Limits (UGX)</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Minimum and maximum facility size
                    </span>
                  </td>
                  {metrics.map((m) => {
                    const isLargest = highlights.highestMaxPrincipalProductId === m.product.id;
                    return (
                      <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0">
                        <div className="font-mono text-xs font-bold text-slate-900">
                          {formatUGX(m.minPrincipal)} – {formatUGX(m.maxPrincipal)}
                        </div>
                        {highlightBestTerms && isLargest && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                            Highest Credit Capacity
                          </span>
                        )}
                        <div className="mt-1">
                          {m.isPrincipalInBounds ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Benchmark ({formatCompactUGX(benchmarkPrincipal)}) allowed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Exceeds / below limits
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* SECTION 4: SIMULATED PROJECTIONS */}
                <tr className="bg-emerald-50/80 font-bold text-emerald-950">
                  <td
                    colSpan={metrics.length + 1}
                    className="px-4 py-2 uppercase tracking-wider text-[10px] text-emerald-900 bg-emerald-100/60"
                  >
                    4. Simulated Financial Projections (On {formatUGX(benchmarkPrincipal)} over {benchmarkTermMonths} Months)
                  </td>
                </tr>

                {/* Periodic Installment */}
                <tr className="bg-emerald-50/30 font-semibold hover:bg-emerald-50/50">
                  <td className="p-3.5 font-bold text-slate-900 sticky left-0 bg-emerald-50/60 border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{frequency === 'monthly' ? 'Monthly' : 'Weekly'} Installment</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block font-normal">
                      Regular installment payment
                    </span>
                  </td>
                  {metrics.map((m) => {
                    const isLowestInstallment = highlights.lowestInstallmentProductId === m.product.id;
                    return (
                      <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0">
                        <span
                          className={`text-base font-black font-mono ${
                            highlightBestTerms && isLowestInstallment
                              ? 'text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded'
                              : 'text-slate-900'
                          }`}
                        >
                          {formatUGX(m.periodicInstallmentUGX)}
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          / {frequency === 'monthly' ? 'month' : 'week'}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Total Interest Over Term */}
                <tr className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <span>Total Interest Over Term</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Cumulative interest expense
                    </span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0 font-mono font-bold text-slate-800">
                      {formatUGX(m.totalInterestUGX)}
                    </td>
                  ))}
                </tr>

                {/* Total Cost of Credit */}
                <tr className="hover:bg-slate-50/70">
                  <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-200">
                    <span>Total Cost of Credit (Fees + Interest)</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      All finance charges borne by borrower
                    </span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0 font-mono font-bold text-rose-700">
                      {formatUGX(m.totalCostOfCreditUGX)}
                    </td>
                  ))}
                </tr>

                {/* Total Cash Outflow */}
                <tr className="bg-slate-50/60 font-semibold">
                  <td className="p-3.5 font-bold text-slate-900 sticky left-0 bg-slate-50/90 border-r border-slate-200">
                    <span>Total Cash Outflow (Principal + Interest)</span>
                    <span className="text-[10px] text-slate-500 block font-normal">
                      Full gross repayment obligation
                    </span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-3.5 border-r border-slate-100 last:border-r-0 font-mono font-black text-slate-900 text-sm">
                      {formatUGX(m.totalRepaymentUGX)}
                    </td>
                  ))}
                </tr>

                {/* ACTION BUTTONS ROW */}
                <tr className="bg-slate-50/80">
                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-slate-50 border-r border-slate-200">
                    <span>Operational Triggers</span>
                  </td>
                  {metrics.map((m) => (
                    <td key={m.product.id} className="p-4 border-r border-slate-200 last:border-r-0 space-y-2">
                      {onOriginateWithProduct && (
                        <button
                          type="button"
                          onClick={() => onOriginateWithProduct(m.product)}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Originate Facility</span>
                        </button>
                      )}
                      {onSwitchToCalculator && (
                        <button
                          type="button"
                          onClick={() => onSwitchToCalculator(m.product.id)}
                          className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Calculator className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detailed Amortization</span>
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regulatory & Institutional Compliance Note */}
      <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-800">Statutory Notice (Uganda Tier 4 MFIs Act 2016, Sec. 51):</strong>{' '}
          All microfinance and credit facilities displayed in this comparison must provide clear,
          written disclosure of the total cost of credit, effective interest rate, and all upfront
          deductions prior to loan agreement signing. Flat rate products compute interest against
          the initial principal; reducing balance facilities compute interest strictly on the
          declining balance.
        </p>
      </div>
    </div>
  );
};
