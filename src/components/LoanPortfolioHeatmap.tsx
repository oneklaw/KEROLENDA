import React, { useState, useMemo } from 'react';
import { Loan, Customer } from '../types';
import {
  generatePortfolioHeatmap,
  getHeatmapCellBg,
  RISK_LEVELS_CONFIG,
  SECTORS_CONFIG,
  RiskLevel,
  IndustrySectorKey,
  HeatmapCell,
  SectorHeatmapRow,
} from '../utils/portfolioHeatmapService';
import { formatUGX, formatCompactUGX } from '../utils/finance';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  Layers,
  BarChart3,
  Grid3X3,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Info,
  Store,
  Wheat,
  Bike,
  Hammer,
  Briefcase,
  UserCheck,
  Boxes,
  ArrowRight,
  Filter,
  X,
} from 'lucide-react';

interface LoanPortfolioHeatmapProps {
  loans: Loan[];
  customers: Customer[];
  onSelectLoan?: (loan: Loan) => void;
  onQuickCollect?: (loan: Loan) => void;
  branchName?: string;
}

export const LoanPortfolioHeatmap: React.FC<LoanPortfolioHeatmapProps> = ({
  loans,
  customers,
  onSelectLoan,
  onQuickCollect,
  branchName,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'chart' | 'matrix'>('both');
  const [metricMode, setMetricMode] = useState<'amount' | 'count'>('amount');
  const [selectedSectorKey, setSelectedSectorKey] = useState<IndustrySectorKey | 'all'>('all');
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  // Calculate heatmap data
  const heatmapSummary = useMemo(() => {
    return generatePortfolioHeatmap(loans, customers);
  }, [loans, customers]);

  // Customer lookup map for drilldown
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Filtered rows based on selected sector filter
  const displayedRows = useMemo(() => {
    if (selectedSectorKey === 'all') {
      return heatmapSummary.rows;
    }
    return heatmapSummary.rows.filter((r) => r.sectorKey === selectedSectorKey);
  }, [heatmapSummary.rows, selectedSectorKey]);

  // Transform data for Recharts Stacked Horizontal Bar Chart
  const rechartsData = useMemo(() => {
    return displayedRows.map((row) => ({
      name: row.shortName,
      fullName: row.sectorName,
      sectorKey: row.sectorKey,
      totalOutstanding: row.totalOutstanding,
      totalLoans: row.totalLoans,
      portfolioShare: row.portfolioSharePercent,
      // Amount values for stacked bars
      low: row.lowRiskAmount,
      moderate: row.moderateRiskAmount,
      high: row.highRiskAmount,
      critical: row.criticalRiskAmount,
      // Count values for stacked bars
      lowCount: row.lowRiskCount,
      moderateCount: row.moderateRiskCount,
      highCount: row.highRiskCount,
      criticalCount: row.criticalRiskCount,
      // Formatting
      lowFormatted: formatCompactUGX(row.lowRiskAmount),
      moderateFormatted: formatCompactUGX(row.moderateRiskAmount),
      highFormatted: formatCompactUGX(row.highRiskAmount),
      criticalFormatted: formatCompactUGX(row.criticalRiskAmount),
    }));
  }, [displayedRows]);

  // Icon selector helper
  const getSectorIcon = (iconName: string) => {
    switch (iconName) {
      case 'Store':
        return <Store className="w-4 h-4" />;
      case 'Wheat':
        return <Wheat className="w-4 h-4" />;
      case 'Bike':
        return <Bike className="w-4 h-4" />;
      case 'Hammer':
        return <Hammer className="w-4 h-4" />;
      case 'Briefcase':
        return <Briefcase className="w-4 h-4" />;
      case 'UserCheck':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Boxes className="w-4 h-4" />;
    }
  };

  // Loans attached to currently active cell drill-down
  const drillDownLoans = useMemo(() => {
    if (!selectedCell) return [];
    return loans.filter((l) => selectedCell.loanIds.includes(l.id));
  }, [selectedCell, loans]);

  // Custom Recharts Tooltip
  const CustomHeatmapTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[240px] z-50">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-sm text-slate-100">{data.fullName}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {data.portfolioShare}% Portfolio
            </span>
          </div>
          <div className="space-y-1.5 font-mono-num">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Low Risk (0 DPD):
              </span>
              <span className="font-bold">
                {metricMode === 'amount' ? formatUGX(data.low) : `${data.lowCount} loans`}
              </span>
            </div>
            <div className="flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Watchlist (1-30 DPD):
              </span>
              <span className="font-bold">
                {metricMode === 'amount' ? formatUGX(data.moderate) : `${data.moderateCount} loans`}
              </span>
            </div>
            <div className="flex items-center justify-between text-orange-400">
              <span className="flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                Substandard (31-60 DPD):
              </span>
              <span className="font-bold">
                {metricMode === 'amount' ? formatUGX(data.high) : `${data.highCount} loans`}
              </span>
            </div>
            <div className="flex items-center justify-between text-rose-400">
              <span className="flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Critical (61+ DPD):
              </span>
              <span className="font-bold">
                {metricMode === 'amount' ? formatUGX(data.critical) : `${data.criticalCount} loans`}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total Sector Exposure:</span>
            <span className="font-bold text-slate-200">
              {formatUGX(data.totalOutstanding)} ({data.totalLoans} facilities)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">Loan Portfolio Heatmap</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                  Sector &amp; Risk Concentration Matrix
                </span>
                {branchName && (
                  <span className="text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                    {branchName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Multi-dimensional visualization of outstanding credit volume by economic industry and regulatory risk
                grades (Actual/365 &amp; UMRA Tier 4).
              </p>
            </div>
          </div>
        </div>

        {/* View & Metric Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Metric Toggle */}
          <div className="bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('amount')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                metricMode === 'amount'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Loan Value (UGX)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('count')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                metricMode === 'count'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Loan Count (#)
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'both'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'chart'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Recharts Stack</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Heatmap Grid</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Monitored Portfolio */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Tracked Active Portfolio
            </span>
            <p className="text-lg font-black text-slate-900 font-mono-num mt-0.5">
              {formatUGX(heatmapSummary.totalPortfolioValue)}
            </p>
            <span className="text-[10px] text-slate-600">
              {heatmapSummary.totalActiveLoans} active loans across {heatmapSummary.rows.length} sectors
            </span>
          </div>

          {/* Top Concentration Sector */}
          <div
            className={`p-3.5 rounded-xl border ${
              (heatmapSummary.topSector?.percent || 0) > 35
                ? 'bg-amber-50/80 border-amber-200'
                : 'bg-indigo-50/70 border-indigo-200'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider block ${
                (heatmapSummary.topSector?.percent || 0) > 35 ? 'text-amber-800' : 'text-indigo-800'
              }`}
            >
              Top Sector Concentration
            </span>
            <p
              className={`text-lg font-black font-mono-num mt-0.5 truncate ${
                (heatmapSummary.topSector?.percent || 0) > 35 ? 'text-amber-950' : 'text-indigo-950'
              }`}
            >
              {heatmapSummary.topSector?.percent || 0}%
            </p>
            <span
              className={`text-[10px] truncate block ${
                (heatmapSummary.topSector?.percent || 0) > 35 ? 'text-amber-700' : 'text-indigo-700'
              }`}
            >
              {heatmapSummary.topSector?.name || 'Diversified'} ({formatCompactUGX(heatmapSummary.topSector?.amount || 0)})
            </span>
          </div>

          {/* High & Critical Risk Exposure */}
          <div
            className={`p-3.5 rounded-xl border ${
              heatmapSummary.highRiskPercent > 10
                ? 'bg-rose-50/70 border-rose-200'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider block ${
                heatmapSummary.highRiskPercent > 10 ? 'text-rose-800' : 'text-emerald-800'
              }`}
            >
              At-Risk Exposure (31+ DPD)
            </span>
            <p
              className={`text-lg font-black font-mono-num mt-0.5 ${
                heatmapSummary.highRiskPercent > 10 ? 'text-rose-950' : 'text-emerald-950'
              }`}
            >
              {formatUGX(heatmapSummary.highRiskExposure)}
            </p>
            <span
              className={`text-[10px] ${
                heatmapSummary.highRiskPercent > 10 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {heatmapSummary.highRiskPercent}% in Substandard &amp; Loss
            </span>
          </div>

          {/* Diversification Status */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Portfolio Diversification
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {heatmapSummary.diversificationStatus === 'High Concentration Warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span className="text-xs font-bold text-slate-800">{heatmapSummary.diversificationStatus}</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Max single sector: {heatmapSummary.maxSectorSharePercent}% (UMRA cap: 35%)
            </span>
          </div>
        </div>

        {/* Sector Filter Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Filter Sector:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSectorKey('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedSectorKey === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Sectors ({heatmapSummary.rows.length})
            </button>
            {heatmapSummary.rows.map((row) => (
              <button
                key={row.sectorKey}
                type="button"
                onClick={() => setSelectedSectorKey(row.sectorKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedSectorKey === row.sectorKey
                    ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {getSectorIcon(row.iconName)}
                <span>{row.shortName}</span>
                <span className="text-[10px] opacity-75 font-mono-num">({row.portfolioSharePercent}%)</span>
              </button>
            ))}
          </div>
        </div>

        {/* RECHARTS STACKED VISUALIZATION */}
        {(viewMode === 'both' || viewMode === 'chart') && (
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                  Recharts Sector Concentration by Risk Level (
                  {metricMode === 'amount' ? 'Outstanding UGX' : 'Active Loan Count'})
                </h4>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-slate-600">Low (0 DPD)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  <span className="text-slate-600">Watchlist (1-30d)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
                  <span className="text-slate-600">Substandard (31-60d)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                  <span className="text-slate-600">Critical (61+d)</span>
                </div>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rechartsData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => (metricMode === 'amount' ? formatCompactUGX(val) : val)}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                    width={110}
                  />
                  <Tooltip content={<CustomHeatmapTooltip />} />
                  <Bar
                    dataKey={metricMode === 'amount' ? 'low' : 'lowCount'}
                    name="Low Risk"
                    stackId="a"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey={metricMode === 'amount' ? 'moderate' : 'moderateCount'}
                    name="Watchlist"
                    stackId="a"
                    fill="#f59e0b"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey={metricMode === 'amount' ? 'high' : 'highCount'}
                    name="Substandard"
                    stackId="a"
                    fill="#f97316"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey={metricMode === 'amount' ? 'critical' : 'criticalCount'}
                    name="Critical / Loss"
                    stackId="a"
                    fill="#ef4444"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHROMATIC HEATMAP MATRIX GRID */}
        {(viewMode === 'both' || viewMode === 'matrix') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                  Portfolio Concentration Heatmap Matrix (Click any cell to drill down into loan accounts)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Cell color reflects concentration density &amp; risk severity
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 min-w-[180px]">Industry / Economic Sector</th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Low Risk (0d)</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500 block">Performing</span>
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5 text-amber-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Watchlist (1-30d)</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500 block">5% Prov.</span>
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5 text-orange-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span>Substandard (31-60d)</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500 block">20% Prov.</span>
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5 text-rose-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>Critical (61+d)</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-500 block">50-100% Prov.</span>
                    </th>
                    <th className="py-2.5 px-3 text-right min-w-[130px]">Total Sector Exposure</th>
                    <th className="py-2.5 px-3 text-center min-w-[90px]">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRows.map((row) => {
                    const isSelected = selectedSectorKey === row.sectorKey;
                    return (
                      <tr
                        key={row.sectorKey}
                        className={`transition-colors ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}
                      >
                        {/* Sector Name & Icon */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                              {getSectorIcon(row.iconName)}
                            </span>
                            <div>
                              <strong className="block text-slate-900 font-semibold">{row.sectorName}</strong>
                              <span className="text-[10px] text-slate-500">
                                {row.totalLoans} {row.totalLoans === 1 ? 'loan' : 'loans'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Low Risk Cell */}
                        {(['low', 'moderate', 'high', 'critical'] as RiskLevel[]).map((rKey) => {
                          const cell = row.cells[rKey];
                          const cellStyles = getHeatmapCellBg(
                            rKey,
                            cell.intensityScore,
                            cell.concentrationPercent
                          );
                          const isCellActive =
                            selectedCell?.sectorKey === row.sectorKey && selectedCell?.riskLevel === rKey;

                          return (
                            <td
                              key={rKey}
                              onClick={() => {
                                if (cell.loanCount > 0) {
                                  setSelectedCell(isCellActive ? null : cell);
                                }
                              }}
                              className={`py-2 px-2 text-center transition-all ${
                                cell.loanCount > 0 ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
                              }`}
                            >
                              <div
                                className={`p-2 rounded-xl border text-center transition-all ${
                                  cellStyles.bgClass
                                } ${cellStyles.borderClass} ${
                                  isCellActive
                                    ? 'ring-2 ring-indigo-600 ring-offset-1 shadow-md font-bold'
                                    : 'shadow-2xs'
                                }`}
                              >
                                {cell.loanCount > 0 ? (
                                  <>
                                    <span className="font-mono-num font-bold text-xs block leading-tight">
                                      {metricMode === 'amount'
                                        ? formatCompactUGX(cell.totalPrincipal)
                                        : `${cell.loanCount} loans`}
                                    </span>
                                    <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] opacity-90 font-mono-num">
                                      <span>{cell.concentrationPercent}%</span>
                                      <span>•</span>
                                      <span>
                                        {cell.loanCount} {cell.loanCount === 1 ? 'ln' : 'lns'}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-300 font-mono-num">—</span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Row Total */}
                        <td className="py-2.5 px-3 text-right font-mono-num font-bold text-slate-900">
                          {formatUGX(row.totalOutstanding)}
                        </td>

                        {/* Portfolio Share */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono-num ${
                              row.regulatoryLimitExceeded
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.portfolioSharePercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Total Footer Row */}
                <tfoot>
                  <tr className="bg-slate-100/90 text-slate-900 font-bold border-t-2 border-slate-300 text-xs">
                    <td className="py-3 px-3">
                      Total Concentration ({heatmapSummary.totalActiveLoans} Facilities):
                    </td>
                    {(['low', 'moderate', 'high', 'critical'] as RiskLevel[]).map((rKey) => {
                      const tot = heatmapSummary.riskTotals[rKey];
                      return (
                        <td key={rKey} className="py-3 px-2 text-center font-mono-num">
                          <span className="block font-bold text-slate-900 text-xs">
                            {metricMode === 'amount' ? formatCompactUGX(tot.amount) : `${tot.count} loans`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {tot.percent}% of portfolio
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right font-mono-num font-bold text-slate-950">
                      {formatUGX(heatmapSummary.totalPortfolioValue)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono-num font-bold text-slate-800">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* INTERACTIVE CELL DRILL-DOWN PANEL */}
        {selectedCell && (
          <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200/80 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-200/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    Facility Drill-Down: {selectedCell.sectorName} • {selectedCell.riskLabel}
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {drillDownLoans.length} active facilities representing {selectedCell.concentrationPercent}% of
                    total portfolio ({formatUGX(selectedCell.totalPrincipal)}).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Close drill-down"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-indigo-100 bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Loan Ref</th>
                    <th className="py-2 px-3">Borrower / Business</th>
                    <th className="py-2 px-3 text-right">Principal Outstanding</th>
                    <th className="py-2 px-3 text-right">Days Past Due</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-num">
                  {drillDownLoans.map((loan) => {
                    const cust = customerMap.get(loan.customerId);
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">{loan.loanNo}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <strong className="block text-slate-900">{cust?.fullName || 'Borrower'}</strong>
                          <span className="text-[10px] text-slate-500">
                            {cust?.businessName || cust?.occupation || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatUGX(loan.principalOutstanding)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              loan.daysPastDue === 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : loan.daysPastDue <= 30
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {loan.daysPastDue === 0 ? 'Current (0d)' : `${loan.daysPastDue}d Overdue`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              loan.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            {onSelectLoan && (
                              <button
                                type="button"
                                onClick={() => onSelectLoan(loan)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                View File
                              </button>
                            )}
                            {onQuickCollect && (
                              <button
                                type="button"
                                onClick={() => onQuickCollect(loan)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                              >
                                Collect
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Regulatory Guidance Footer */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800 font-semibold">Regulatory Concentration Policy:</strong> Under UMRA Tier 4
            prudential norms and Bank of Uganda microfinance best practices, credit exposure to any single economic sector
            should not exceed <strong>35%</strong> of total loan book. Facilities with 31+ DPD are subjected to mandatory
            statutory provisioning (20% for Substandard, 50% for Doubtful, and 100% for Loss).
          </div>
        </div>
      </div>
    </div>
  );
};
