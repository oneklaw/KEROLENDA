import React, { useState } from 'react';
import { Tenant, AppUser, TenantBranding, TenantFiscalYear, TenantPenaltyRules } from '../types';
import {
  X,
  Building2,
  Palette,
  Calendar,
  Percent,
  ShieldCheck,
  Check,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';

interface TenantSettingsModalProps {
  tenant: Tenant;
  currentUser: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onSaveTenant: (updatedTenant: Tenant) => void;
}

const COLOR_PRESETS = [
  { name: 'Teal (Victoria)', hex: '#0f766e' },
  { name: 'Navy Blue (Rwenzori)', hex: '#1e3a8a' },
  { name: 'Forest Emerald', hex: '#065f46' },
  { name: 'Indigo Corporate', hex: '#3730a3' },
  { name: 'Deep Slate', hex: '#334155' },
  { name: 'Warm Amber', hex: '#b45309' },
  { name: 'Crimson Rose', hex: '#9f1239' },
];

const MONTHS = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' },
];

export const TenantSettingsModal: React.FC<TenantSettingsModalProps> = ({
  tenant,
  currentUser,
  isOpen,
  onClose,
  onSaveTenant,
}) => {
  // Check admin authorization
  const isAdmin =
    currentUser.role === 'PLATFORM_ADMIN' ||
    currentUser.role === 'TENANT_OWNER' ||
    currentUser.role === 'BRANCH_MANAGER';

  // Form states
  const [displayName, setDisplayName] = useState(tenant.displayName);
  const [legalName, setLegalName] = useState(tenant.legalName);
  const [primaryColor, setPrimaryColor] = useState(tenant.branding?.primaryColor || '#0f766e');
  const [accentColor, setAccentColor] = useState(tenant.branding?.accentColor || '#0284c7');
  const [logoUrl, setLogoUrl] = useState(tenant.branding?.logoUrl || '');
  const [receiptFooter, setReceiptFooter] = useState(tenant.branding?.receiptFooter || '');
  const [taxRegistrationNo, setTaxRegistrationNo] = useState(tenant.branding?.taxRegistrationNo || '');
  const [umraLicenseNo, setUmraLicenseNo] = useState(tenant.branding?.umraLicenseNo || '');

  // Fiscal Year
  const [startMonth, setStartMonth] = useState<number>(tenant.fiscalYear?.startMonth || 7);
  const [endMonth, setEndMonth] = useState<number>(tenant.fiscalYear?.endMonth || 6);

  // Late payment penalty rules
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(
    tenant.penaltyRules?.gracePeriodDays ?? 3
  );
  const [dailyPenaltyPercent, setDailyPenaltyPercent] = useState<number>(
    tenant.penaltyRules?.dailyPenaltyPercent ?? 0.1
  );
  const [maxPenaltyCapPercent, setMaxPenaltyCapPercent] = useState<number>(
    tenant.penaltyRules?.maxPenaltyCapPercent ?? 15.0
  );
  const [autoLockDaysPastDue, setAutoLockDaysPastDue] = useState<number>(
    tenant.penaltyRules?.autoLockDaysPastDue ?? 60
  );

  const [activeTab, setActiveTab] = useState<'branding' | 'fiscal' | 'penalties'>('branding');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  // Non-admin block screen
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl border border-slate-200">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Administrator Access Restricted</h3>
          <p className="text-xs text-slate-500">
            Tenant configuration and regulatory governance parameters can only be altered by users with <strong>Platform Admin</strong>, <strong>Tenant Owner</strong>, or <strong>Branch Manager</strong> credentials.
          </p>
          <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600">
            Current Persona: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role})
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const startMonthName = MONTHS.find((m) => m.value === startMonth)?.name || 'July';
    const endMonthName = MONTHS.find((m) => m.value === endMonth)?.name || 'June';

    const updatedTenant: Tenant = {
      ...tenant,
      displayName,
      legalName,
      branding: {
        ...tenant.branding,
        primaryColor,
        accentColor,
        logoUrl: logoUrl.trim() || undefined,
        receiptFooter,
        taxRegistrationNo,
        umraLicenseNo,
      },
      fiscalYear: {
        startMonth,
        endMonth,
        title: `${startMonthName} 1 – ${endMonthName} ${endMonth === 2 ? 28 : 30}`,
      },
      penaltyRules: {
        gracePeriodDays,
        dailyPenaltyPercent,
        maxPenaltyCapPercent,
        autoLockDaysPastDue,
      },
    };

    onSaveTenant(updatedTenant);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Tenant Governance & Brand Settings</h3>
              <p className="text-[11px] text-slate-300">
                Configure brand styling, statutory fiscal definitions, and automated penalty rules for {tenant.displayName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'branding'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Branding & Styling
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fiscal')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'fiscal'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Fiscal Year & Licensing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('penalties')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'penalties'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Late Penalty Thresholds
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {activeTab === 'branding' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Legal Registered Entity</label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Primary Brand Color (Used for Headers, PDF Reports & System Accents)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setPrimaryColor(preset.hex)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                        primaryColor === preset.hex
                          ? 'border-slate-800 shadow-xs ring-2 ring-slate-800/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-28 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300"
                  />
                  <span className="text-[11px] text-slate-500">Hexadecimal color code</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL (Optional Image Link)</label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Receipt & PDF Statement Footer Disclaimer
                </label>
                <textarea
                  rows={2}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Branding Preview
                </span>
                <div className="flex items-center justify-between p-3 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    <div>
                      <p className="font-bold text-xs">{displayName}</p>
                      <p className="text-[10px] text-white/80">{umraLicenseNo}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase">
                    UGX • Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fiscal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fiscal Year Start Month</label>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name} (Month {m.value})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Uganda government fiscal cycle begins July 1st.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fiscal Year End Month</label>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name} (Month {m.value})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Financial books close on the last day of this month.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URA Taxpayer Identification No (TIN)</label>
                  <input
                    type="text"
                    value={taxRegistrationNo}
                    onChange={(e) => setTaxRegistrationNo(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UMRA Tier 4 Operating License No</label>
                  <input
                    type="text"
                    value={umraLicenseNo}
                    onChange={(e) => setUmraLicenseNo(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Statutory reporting schedules in the <strong>Audit & UMRA</strong> view use this fiscal year configuration to calculate quarterly filings (Q1 through Q4) and year-end audit closing dates.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'penalties' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grace Period (Days Before Penalty Accrual)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12 font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400">Days</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">UMRA standard practice allows 3 to 5 grace days.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Automatic Daily Late Penalty Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={5}
                      value={dailyPenaltyPercent}
                      onChange={(e) => setDailyPenaltyPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12 font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400">% / day</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Applied strictly to overdue principal installment.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Maximum Late Penalty Cap (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      max={50}
                      value={maxPenaltyCapPercent}
                      onChange={(e) => setMaxPenaltyCapPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12 font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400">% cap</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Prevents unbounded compounding per statutory consumer protection.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Automatic Account Suspension Threshold
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={15}
                      max={180}
                      value={autoLockDaysPastDue}
                      onChange={(e) => setAutoLockDaysPastDue(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12 font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400">DPD</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Locks further disbursements when borrower reaches this DPD.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  These threshold rules are evaluated during midnight end-of-day batch processing and reflected in the <strong>Portfolio At Risk (PAR)</strong> aging buckets and collection notices.
                </p>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Admin: <span className="font-semibold text-slate-700">{currentUser.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved Successfully
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
