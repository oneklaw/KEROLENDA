import React, { useState, useMemo } from 'react';
import { Loan, LoanProduct } from '../types';
import { SEED_LOAN_PRODUCTS } from '../data/seedData';
import {
  calculatePortfolioYieldComparison,
  ProductYieldMetric,
} from '../utils/portfolioYieldService';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  TrendingUp,
  Percent,
  ArrowUpRight,
  Info,
  Scale,
  DollarSign,
  BarChart3,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

interface LoanPortfolioYieldChartProps {
  loans: Loan[];
  products?: LoanProduct[];
  branchName?: string;
  onNavigateTab?: (tab: string) => void;
  onOpenNewLoan?: () => void;
}

export const LoanPortfolioYieldChart: React.FC<LoanPortfolioYieldChartProps> = ({
  loans,
  products = SEED_LOAN_PRODUCTS,
  branchName,
  onNavigateTab,
  onOpenNewLoan,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'rates' | 'spread' | 'combined'>('combined');

  // Compute portfolio metrics
  const yieldAnalytics = useMemo(() => {
    return calculatePortfolioYieldComparison(products, loans);
  }, [products, loans]);

  const {
    products: productMetrics,
    weightedNominalRate,
    weightedEIR,
    portfolioYieldSpread,
    totalActivePortfolioUGX,
    totalAnnualizedYieldUGX,
    highestYieldProduct,
    lowestYieldProduct,
    mostProfitableProductByVolume,
  } = yieldAnalytics;

  // Chart dataset
  const chartData = useMemo(() => {
    return productMetrics.map((p) => ({
      id: p.productId,
      code: p.productCode,
      name: p.productName,
      shortName: p.productCode,
      nominalRate: p.nominalRateAnnual,
      effectiveRate: p.effectiveInterestRate,
      yieldSpread: p.yieldSpread,
      upfrontFees: p.upfrontFeesPercent,
      method: p.interestMethod === 'flat' ? 'Flat' : 'Reducing',
      activeCount: p.activeLoansCount,
      activeVolumeUGX: p.activeOutstandingPrincipalUGX,
      annualYieldUGX: p.annualizedGrossYieldUGX,
      tier: p.profitabilityTier,
    }));
  }, [productMetrics]);

  // Selected product detail
  const activeProductDetail = useMemo(() => {
    if (!selectedProductId) return null;
    return productMetrics.find((p) => p.productId === selectedProductId) || null;
  }, [selectedProductId, productMetrics]);

  return (
    <div
      data-testid="loan-portfolio-yield-container"
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden my-6"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-emerald-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                <Percent className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Loan Portfolio Yield: Effective (EIR) vs Nominal Interest Rate
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                UMRA Disclosure Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl">
              Visualizes real annualized profitability across lending products by contrasting stated contract rates
              (Nominal) against actuarial Effective Interest Rates (EIR) incorporating upfront fee amortization and
              repayment compounding.
            </p>
          </div>

          {/* Quick Metrics Badges & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block">
                Portfolio Weighted EIR
              </span>
              <span className="text-sm font-bold text-emerald-900 font-mono-num">
                {weightedEIR.toFixed(2)}% <span className="text-[10px] font-normal text-emerald-700">p.a.</span>
              </span>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 block">
                Average Yield Spread
              </span>
              <span className="text-sm font-bold text-indigo-900 font-mono-num">
                +{portfolioYieldSpread.toFixed(2)}% <span className="text-[10px] font-normal text-indigo-700">lift</span>
              </span>
            </div>

            {/* View Mode Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium text-slate-600 shadow-2xs">
              <button
                type="button"
                onClick={() => setChartMode('combined')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartMode === 'combined'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Combined
              </button>
              <button
                type="button"
                onClick={() => setChartMode('rates')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartMode === 'rates'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EIR vs Nominal
              </button>
              <button
                type="button"
                onClick={() => setChartMode('spread')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartMode === 'spread'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Margin Lift
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Weighted Nominal Rate</span>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-800 font-mono-num">
            {weightedNominalRate.toFixed(2)}% <span className="text-xs font-normal text-slate-500">p.a.</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Stated contract baseline</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/10">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold">Effective Yield (EIR)</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono-num">
            {weightedEIR.toFixed(2)}% <span className="text-xs font-normal text-emerald-600">p.a.</span>
          </div>
          <div className="text-[11px] text-emerald-800 mt-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>+{portfolioYieldSpread.toFixed(2)}% real yield expansion</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Top Margin Product</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {highestYieldProduct ? highestYieldProduct.productCode : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            EIR: <strong className="text-emerald-700 font-mono-num">{highestYieldProduct?.effectiveInterestRate}%</strong>{' '}
            ({highestYieldProduct?.interestMethod})
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Projected Annual Yield</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono-num truncate">
            {formatCompactUGX(totalAnnualizedYieldUGX)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            On {formatCompactUGX(totalActivePortfolioUGX)} active book
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-800">
              {chartMode === 'rates'
                ? 'Product Rate Comparison: Stated Nominal vs Effective Annual Rate (EIR)'
                : chartMode === 'spread'
                ? 'Yield Spread Lift: Revenue Uplift Generated from Fee Absorption & Flat Compounding'
                : 'Comprehensive Portfolio Yield: Nominal, Effective Rate & Spread Analysis'}
            </h4>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
              <span>Nominal Rate (%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
              <span>Effective Rate EIR (%)</span>
            </span>
            {(chartMode === 'combined' || chartMode === 'spread') && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Yield Spread Lift (%)</span>
              </span>
            )}
          </div>
        </div>

        <div className="h-80 w-full" data-testid="yield-chart-render">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const clickedId = state.activePayload[0].payload.id;
                  setSelectedProductId(clickedId === selectedProductId ? null : clickedId);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="code"
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis
                unit="%"
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-xs text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs max-w-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                          <div>
                            <div className="font-bold text-sm text-white">{data.name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{data.code}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              data.method === 'Flat'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {data.method} Method
                          </span>
                        </div>

                        <div className="space-y-1.5 font-mono-num">
                          <div className="flex justify-between items-center text-slate-300">
                            <span>Nominal Contract Rate:</span>
                            <span className="font-semibold text-slate-100">{data.nominalRate}% p.a.</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300">
                            <span>Upfront Fees (Proc + Ins):</span>
                            <span className="text-slate-300">+{data.upfrontFees}%</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400 pt-1 border-t border-slate-800">
                            <span className="font-bold">Effective Yield (EIR):</span>
                            <span className="font-bold text-sm">{data.effectiveRate}% p.a.</span>
                          </div>
                          <div className="flex justify-between items-center text-amber-300">
                            <span>Yield Spread (Real Lift):</span>
                            <span className="font-semibold">+{data.yieldSpread}%</span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                          <div>Active Portfolio: {formatUGX(data.activeVolumeUGX)} ({data.activeCount} loans)</div>
                          <div>Projected Revenue: {formatUGX(data.annualYieldUGX)}/yr</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Lines for Industry Guidelines */}
              <ReferenceLine
                y={12}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                label={{
                  value: '12% Cost of Funds Hurdle',
                  position: 'insideTopLeft',
                  fill: '#64748B',
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={24}
                stroke="#10B981"
                strokeDasharray="3 3"
                label={{
                  value: '24% UMRA Target Corridor',
                  position: 'insideBottomRight',
                  fill: '#059669',
                  fontSize: 10,
                }}
              />

              {/* Stated Nominal Rate Bar */}
              {(chartMode === 'combined' || chartMode === 'rates') && (
                <Bar
                  dataKey="nominalRate"
                  name="Nominal Rate (% p.a.)"
                  fill="#94A3B8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`nominal-${entry.id}`}
                      fill={selectedProductId === entry.id ? '#64748B' : '#94A3B8'}
                      opacity={selectedProductId && selectedProductId !== entry.id ? 0.4 : 0.85}
                    />
                  ))}
                </Bar>
              )}

              {/* Effective Rate (EIR) Bar */}
              {(chartMode === 'combined' || chartMode === 'rates') && (
                <Bar
                  dataKey="effectiveRate"
                  name="Effective Rate EIR (% p.a.)"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`eir-${entry.id}`}
                      fill={selectedProductId === entry.id ? '#047857' : '#059669'}
                      opacity={selectedProductId && selectedProductId !== entry.id ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              )}

              {/* Yield Spread Bar or Line */}
              {chartMode === 'spread' && (
                <Bar
                  dataKey="yieldSpread"
                  name="Yield Spread (+% Lift)"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={56}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`spread-${entry.id}`}
                      fill="#D97706"
                      opacity={selectedProductId && selectedProductId !== entry.id ? 0.4 : 0.9}
                    />
                  ))}
                </Bar>
              )}

              {/* Line in combined mode to highlight the spread gap */}
              {chartMode === 'combined' && (
                <Line
                  type="monotone"
                  dataKey="yieldSpread"
                  name="Yield Spread Lift (% pts)"
                  stroke="#D97706"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#D97706', stroke: '#FFF', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#B45309' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 text-center text-xs text-slate-400">
          <span>Click any bar to inspect product parameters and amortisation breakdown</span>
        </div>
      </div>

      {/* Selected Product Deep Dive Panel (when clicked) */}
      {activeProductDetail && (
        <div className="p-4 mx-5 mb-5 rounded-xl bg-slate-900 text-white border border-slate-800 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-400 text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                  {activeProductDetail.productCode}
                </span>
                <h4 className="text-sm font-bold text-white">{activeProductDetail.productName}</h4>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    activeProductDetail.interestMethod === 'flat'
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                      : 'bg-blue-900/60 text-blue-300 border border-blue-700'
                  }`}
                >
                  {activeProductDetail.interestMethod === 'flat' ? 'Flat Interest Method' : 'Reducing Balance Method'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Product Code: {activeProductDetail.productCode} • Benchmark Tenor: {activeProductDetail.averageTenorMonths} months
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedProductId(null)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800"
            >
              Close Deep Dive ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Stated Nominal Rate</span>
              <span className="text-base font-bold text-white font-mono-num">
                {activeProductDetail.nominalRateAnnual}% p.a.
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Contract flat/reducing base</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Upfront Origination Fees</span>
              <span className="text-base font-bold text-indigo-300 font-mono-num">
                {activeProductDetail.upfrontFeesPercent}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {activeProductDetail.processingFeePercent}% proc + {activeProductDetail.insuranceFeePercent}% ins
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800">
              <span className="text-emerald-400 block text-[10px] uppercase tracking-wider font-semibold">
                Effective Interest Rate (EIR)
              </span>
              <span className="text-base font-bold text-emerald-300 font-mono-num">
                {activeProductDetail.effectiveInterestRate}% p.a.
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                +{activeProductDetail.yieldSpread}% margin expansion
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Active Book Volume</span>
              <span className="text-base font-bold text-white font-mono-num truncate block">
                {formatUGX(activeProductDetail.activeOutstandingPrincipalUGX)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {activeProductDetail.activeLoansCount} active loan(s)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Product Yield Comparison Table */}
      <div className="border-t border-slate-200">
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Product-Level Yield & Profitability Matrix
            </h4>
          </div>
          <span className="text-xs text-slate-500">
            {productMetrics.length} registered credit facilities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-right">Nominal Rate</th>
                <th className="py-2.5 px-3 text-right">Upfront Fees</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">Effective Rate (EIR)</th>
                <th className="py-2.5 px-3 text-right font-bold text-amber-800">Yield Spread</th>
                <th className="py-2.5 px-3 text-right">Active Book</th>
                <th className="py-2.5 px-3 text-right">Annual Yield</th>
                <th className="py-2.5 px-4 text-center">Profitability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono-num">
              {productMetrics.map((p) => {
                const isSelected = selectedProductId === p.productId;
                return (
                  <tr
                    key={p.productId}
                    onClick={() => setSelectedProductId(isSelected ? null : p.productId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/60 font-medium'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                          {p.productCode}
                        </span>
                        <span className="truncate max-w-[180px] sm:max-w-none">{p.productName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                          p.interestMethod === 'flat'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {p.interestMethod === 'flat' ? 'Flat' : 'Reducing'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                      {p.nominalRateAnnual.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      +{p.upfrontFeesPercent.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700 text-sm">
                      {p.effectiveInterestRate.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                      +{p.yieldSpread.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {p.activeOutstandingPrincipalUGX > 0
                        ? formatCompactUGX(p.activeOutstandingPrincipalUGX)
                        : '—'}
                      {p.activeLoansCount > 0 && (
                        <span className="text-[10px] text-slate-400 block">({p.activeLoansCount} loans)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">
                      {formatCompactUGX(p.annualizedGrossYieldUGX)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-md font-semibold inline-block ${
                          p.profitabilityTier === 'High Margin'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : p.profitabilityTier === 'Moderate Margin'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {p.profitabilityTier}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institutional Explainer Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-2 max-w-3xl">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-800">Understanding Effective Interest Rate (EIR):</strong> Flat rate products
            yield approximately 1.6x–1.8x their stated nominal percentage because borrowers pay interest on the full initial
            principal throughout the loan term despite continuous amortisation. Upfront loan processing and credit life insurance
            fees are fully amortized over the loan life cycle to reflect true institutional margin under Tier 4 UMRA regulations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenNewLoan && (
            <button
              type="button"
              onClick={onOpenNewLoan}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>Originate Loan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('loans')}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors"
            >
              Configure Products
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
