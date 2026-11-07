import React from 'react';
import {
  Tenant,
  Branch,
  AppUser,
  UserRole,
  OperatingEnvironment,
} from '../types';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Receipt,
  PlusCircle,
  Clock,
  ArrowRightLeft,
  ChevronDown,
  Settings,
  Bell,
  Search,
  KeyRound,
  LayoutDashboard,
  UserCheck,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  tenants: Tenant[];
  currentTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  branches: Branch[];
  currentBranch: Branch;
  onSelectBranch: (branch: Branch) => void;
  users: AppUser[];
  currentUser: AppUser;
  onSelectUser: (user: AppUser) => void;
  currentEnvironment: OperatingEnvironment;
  onSelectEnvironment: (env: OperatingEnvironment) => void;
  unreadNotificationsCount?: number;
  onOpenQuickPayment: () => void;
  onOpenNewLoan: () => void;
  onOpenNewExpense: () => void;
  onOpenTenantSettings?: () => void;
  onOpenAuthModal?: () => void;
  onOpenCreditBureauModal?: () => void;
  onOpenNotificationsModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tenants,
  currentTenant,
  onSelectTenant,
  branches,
  currentBranch,
  onSelectBranch,
  users,
  currentUser,
  onSelectUser,
  currentEnvironment,
  onSelectEnvironment,
  unreadNotificationsCount = 0,
  onOpenQuickPayment,
  onOpenNewLoan,
  onOpenNewExpense,
  onOpenTenantSettings,
  onOpenAuthModal,
  onOpenCreditBureauModal,
  onOpenNotificationsModal,
  onLogout,
}) => {
  const roleDisplayNames: Record<UserRole, { name: string; color: string }> = {
    PLATFORM_SUPER_ADMIN: { name: 'Super Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    PLATFORM_ADMIN: { name: 'Platform Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    COMPANY_OWNER: { name: 'Company Owner', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    TENANT_OWNER: { name: 'Company Owner', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    COMPANY_ADMIN: { name: 'Company Admin', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    BRANCH_MANAGER: { name: 'Branch Manager', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    LOAN_OFFICER: { name: 'Loan Officer', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    CREDIT_OFFICER: { name: 'Credit Approver', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    CASHIER_ACCOUNTANT: { name: 'Cashier / Accountant', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    CASHIER_TELLER: { name: 'Cashier / Teller', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    ACCOUNTANT: { name: 'Accountant', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    SAVINGS_OFFICER: { name: 'Savings Officer', color: 'bg-violet-100 text-violet-800 border-violet-200' },
    RECOVERY_OFFICER: { name: 'Recovery Officer', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    AUDITOR: { name: 'Auditor (Read-Only)', color: 'bg-slate-100 text-slate-800 border-slate-200' },
    BORROWER: { name: 'Borrower (Self-Service)', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  };

  const tenantBranches = branches.filter((b) => b.tenantId === currentTenant.id);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs no-print">
      {/* Top Banner: Environment Switcher & System Status */}
      <div className="bg-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        {/* Left: 3 Operating Environments Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
            Environment:
          </span>
          <div className="bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 flex space-x-1">
            {currentUser.role !== 'BORROWER' && (
              <button
                onClick={() => onSelectEnvironment('lending_workspace')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentEnvironment === 'lending_workspace'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Company Workspace</span>
              </button>
            )}

            {(currentUser.role === 'BORROWER' ||
              currentUser.role === 'PLATFORM_SUPER_ADMIN' ||
              currentUser.role === 'PLATFORM_ADMIN') && (
              <button
                onClick={() => onSelectEnvironment('borrower_portal')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentEnvironment === 'borrower_portal'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Borrower Portal</span>
              </button>
            )}

            {(currentUser.role === 'PLATFORM_SUPER_ADMIN' ||
              currentUser.role === 'PLATFORM_ADMIN') && (
              <button
                onClick={() => onSelectEnvironment('platform_admin')}
                className={`px-3 py-1 rounded-md font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentEnvironment === 'platform_admin'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Platform Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Security Status, Notifications, MFA & Auth modal triggers */}
        <div className="flex items-center gap-3">
          {/* Shared Credit Bureau shortcut */}
          {onOpenCreditBureauModal && currentEnvironment === 'lending_workspace' && (
            <button
              onClick={onOpenCreditBureauModal}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer"
              title="Search shared cross-company credit bureau records or submit review"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Credit Bureau</span>
            </button>
          )}

          {/* Notifications Button */}
          {onOpenNotificationsModal && (
            <button
              onClick={onOpenNotificationsModal}
              className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="View multi-channel system notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-900 rounded-full font-black text-[9px] flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* MFA / Switch Account */}
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-800 text-[11px] font-bold cursor-pointer"
              title="Switch user account or test MFA challenge"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>Switch User</span>
            </button>
          )}

          {/* Logout / Lock Session */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-800 text-[11px] font-bold cursor-pointer"
              title="Sign out and lock workspace"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Bar: Show Company details when in lending workspace */}
      {currentEnvironment === 'lending_workspace' && (
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Tenant Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: currentTenant.branding.primaryColor }}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-slate-900 text-base tracking-tight leading-tight">
                    {currentTenant.displayName}
                  </h1>
                  <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                    {currentTenant.defaultCurrency}
                  </span>
                  {currentTenant.mfaEnforced && (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded">
                      MFA Enforced
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  License: {currentTenant.branding.umraLicenseNo}
                </p>
              </div>
            </div>

            {/* Company Organization Display / Switcher */}
            {(currentUser.role === 'PLATFORM_SUPER_ADMIN' || currentUser.role === 'PLATFORM_ADMIN') ? (
              <div className="relative group">
                <select
                  value={currentTenant.id}
                  onChange={(e) => {
                    const found = tenants.find((t) => t.id === e.target.value);
                    if (found) onSelectTenant(found);
                  }}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-1.5 px-2.5 pr-7 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none"
                  aria-label="Super Admin: Switch Company Workspace"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      Org: {t.displayName} ({t.planName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="truncate max-w-[160px]">{currentTenant.displayName}</span>
                <span className="text-[10px] text-slate-400 font-mono">({currentTenant.planName})</span>
              </div>
            )}

            {/* Branch Switcher */}
            <div className="relative group hidden sm:block">
              <select
                value={currentBranch.id}
                onChange={(e) => {
                  const found = branches.find((b) => b.id === e.target.value);
                  if (found) onSelectBranch(found);
                }}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium py-1.5 px-2.5 pr-7 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none"
                aria-label="Filter Branch Location"
              >
                {tenantBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Branch: {b.name} ({b.code})
                  </option>
                ))}
              </select>
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* User Profile & Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Active User Card */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 px-2.5 rounded-xl border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800 leading-none mb-0.5">
                  {currentUser.name}
                </p>
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleDisplayNames[currentUser.role]?.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {roleDisplayNames[currentUser.role]?.name || currentUser.role}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <button
              onClick={onOpenQuickPayment}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Record a loan repayment or member deposit"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Receive</span> Payment
            </button>

            <button
              onClick={onOpenNewLoan}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Originate new loan application"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">New</span> Loan
            </button>

            <button
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Record operational expense or budget spend"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span> Expense
            </button>

            {onOpenTenantSettings && (
              <button
                onClick={onOpenTenantSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer border bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                title="Tenant Settings"
              >
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden md:inline">Settings</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
