import React, { useState } from 'react';
import {
  AppUser,
  Tenant,
  Branch,
  UserRole,
  CompanyInvitation,
  ROLE_PERMISSIONS,
  SystemPermission,
  MFAMethod,
} from '../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
  Smartphone,
  Phone,
  Building,
  KeyRound,
  Trash2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface CompanyUsersViewProps {
  tenant: Tenant;
  branches: Branch[];
  currentUser: AppUser;
  users: AppUser[];
  invitations: CompanyInvitation[];
  onInviteUser: (invitation: Omit<CompanyInvitation, 'id' | 'invitedAt' | 'expiresAt' | 'status'>) => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onToggleUserStatus: (userId: string, currentStatus: 'active' | 'disabled' | 'pending_activation') => void;
  onRevokeInvitation: (invitationId: string) => void;
  onToggleCompanyMfaEnforcement: (tenantId: string, enforce: boolean) => void;
}

const ROLES_LIST: { role: UserRole; label: string; description: string }[] = [
  { role: 'COMPANY_OWNER', label: 'Company Owner', description: 'Full control over company settings, billing, users, and regulatory filings' },
  { role: 'COMPANY_ADMIN', label: 'Company Administrator', description: 'Manages branches, employees, configurations, and loan origination policies' },
  { role: 'BRANCH_MANAGER', label: 'Branch Manager', description: 'Oversees daily branch lending, credit approvals, till balances, and recovery' },
  { role: 'LOAN_OFFICER', label: 'Loan Officer', description: 'Registers borrowers, collects KYC documents, and originates applications' },
  { role: 'CREDIT_OFFICER', label: 'Credit & Risk Officer', description: 'Appraises creditworthiness, reviews collateral, and recommends decisions' },
  { role: 'CASHIER_ACCOUNTANT', label: 'Cashier / Teller / Accountant', description: 'Receipts payments, manages cash till, logs expenses, and posts journals' },
  { role: 'RECOVERY_OFFICER', label: 'Recovery & Collections Officer', description: 'Manages arrears, promises to pay, field visits, and restructuring' },
  { role: 'AUDITOR', label: 'Auditor (Read-Only)', description: 'Read-only access to double-entry journals, audit trails, and compliance reports' },
];

export const CompanyUsersView: React.FC<CompanyUsersViewProps> = ({
  tenant,
  branches,
  currentUser,
  users,
  invitations,
  onInviteUser,
  onUpdateUserRole,
  onToggleUserStatus,
  onRevokeInvitation,
  onToggleCompanyMfaEnforcement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<AppUser | null>(null);

  // Invitation Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('+256 ');
  const [inviteRole, setInviteRole] = useState<UserRole>('LOAN_OFFICER');
  const [inviteBranchId, setInviteBranchId] = useState(branches[0]?.id || 'branch-kla-main');
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Filter users by current tenant
  const tenantUsers = users.filter((u) => u.tenantId === tenant.id);
  const tenantInvitations = invitations.filter((i) => i.tenantId === tenant.id);

  const filteredUsers = tenantUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const branch = branches.find((b) => b.id === inviteBranchId);
    const code = `INV-${tenant.slug.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    onInviteUser({
      tenantId: tenant.id,
      tenantName: tenant.displayName,
      email: inviteEmail.trim(),
      phone: invitePhone.length > 7 ? invitePhone.trim() : undefined,
      role: inviteRole,
      branchId: inviteBranchId,
      branchName: branch?.name || 'Main Branch',
      invitationCode: code,
      invitedByUserName: currentUser.name,
    });

    setInviteEmail('');
    setInvitePhone('+256 ');
    setShowInviteModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Company Isolation & MFA Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Company Staff &amp; Role-Based Access Control (RBAC)
            </h2>
            <span className="text-[11px] font-mono-num font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Tenant: {tenant.displayName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict tenant data isolation: Employee permissions, branch assignments, and mandatory multi-factor authentication.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Company-wide MFA enforcement switch */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <ShieldCheck className={`w-4 h-4 ${tenant.mfaEnforced ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-slate-700 font-medium">Mandatory MFA:</span>
            <button
              onClick={() => onToggleCompanyMfaEnforcement(tenant.id, !tenant.mfaEnforced)}
              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] cursor-pointer transition-colors ${
                tenant.mfaEnforced
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {tenant.mfaEnforced ? 'Enforced' : 'Optional'}
            </button>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Invite Staff Member
          </button>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff by name, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 sm:w-80"
            />
          </div>
          <span className="text-slate-500 font-medium">
            Total <strong>{filteredUsers.length}</strong> active staff in {tenant.displayName}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Contact (Email / Phone)</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Branch Location</th>
                <th className="py-2.5 px-3 text-center">MFA Status</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const branch = branches.find((b) => b.id === user.branchId);
                const isSuspended = user.status === 'disabled';

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[11px]">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <strong className="text-slate-900 block">{user.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono-num">
                            ID: {user.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <p className="text-slate-800">{user.email}</p>
                      <p className="text-[11px] text-slate-400 font-mono-num">{user.phone}</p>
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => setSelectedUserForPermissions(user)}
                        className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 cursor-pointer flex items-center gap-1"
                        title="Click to view granular permissions"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{user.role.replace(/_/g, ' ')}</span>
                      </button>
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      {branch?.name || 'Headquarters'}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {user.mfaEnabled || tenant.mfaEnforced ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          MFA Active ({user.preferredMfaMethod || 'email'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Optional
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuspended
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedUserForPermissions(user)}
                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                        >
                          Permissions
                        </button>

                        <button
                          onClick={() => onToggleUserStatus(user.id, user.status)}
                          className={`px-2 py-1 rounded-md font-semibold text-[11px] cursor-pointer ${
                            isSuspended
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {tenantInvitations.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600" />
            Pending Invitations ({tenantInvitations.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tenantInvitations.map((inv) => (
              <div
                key={inv.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900">{inv.email}</strong>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                      {inv.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Branch: {inv.branchName} • Code:{' '}
                    <span className="font-mono-num font-bold text-slate-800">{inv.invitationCode}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inv.invitationCode);
                      setCopiedInviteId(inv.id);
                      setTimeout(() => setCopiedInviteId(null), 2000);
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Copy Invitation Code"
                  >
                    {copiedInviteId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onRevokeInvitation(inv.id)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                    title="Revoke Invitation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INVITE STAFF MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Invite Staff Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. grace.akello@company.ug"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (Optional)</label>
                <input
                  type="text"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono-num focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Assignment *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-medium focus:outline-none"
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Branch *</label>
                <select
                  value={inviteBranchId}
                  onChange={(e) => setInviteBranchId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-medium focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Send Invitation Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMISSIONS & RBAC INSPECTOR MODAL */}
      {selectedUserForPermissions && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  RBAC Permission Matrix
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedUserForPermissions.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForPermissions(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">Active Role</span>
                  <strong className="text-slate-900 text-sm">
                    {selectedUserForPermissions.role.replace(/_/g, ' ')}
                  </strong>
                </div>

                {currentUser.role === 'COMPANY_OWNER' && (
                  <select
                    value={selectedUserForPermissions.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      onUpdateUserRole(selectedUserForPermissions.id, newRole);
                      setSelectedUserForPermissions({
                        ...selectedUserForPermissions,
                        role: newRole,
                      });
                    }}
                    className="px-2.5 py-1.5 border rounded-lg bg-white font-semibold text-xs"
                  >
                    {ROLES_LIST.map((r) => (
                      <option key={r.role} value={r.role}>
                        Change to {r.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Granular Permissions breakdown list */}
              <div>
                <span className="font-bold text-slate-800 block mb-2">
                  System Permissions Granted to this Role:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(ROLE_PERMISSIONS[selectedUserForPermissions.role] || []).map((perm, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200 text-emerald-900 font-mono-num text-[11px] flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{perm.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setSelectedUserForPermissions(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
