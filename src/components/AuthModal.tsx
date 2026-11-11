import React, { useState, useEffect } from 'react';
import {
  AppUser,
  Tenant,
  MFAMethod,
  MFAChallenge,
  CompanyRegistrationPayload,
  BorrowerAccount,
  OperatingEnvironment,
} from '../types';
import { generateMfaChallenge, verifyMfaChallenge } from '../utils/mfaService';
import {
  resolveUserAndCompany,
  validateUserCredentials,
  ResolvedAuthIdentity,
  parseUnifiedCredentials,
  formatMaskedCredentials,
} from '../utils/authResolver';
import {
  ShieldCheck,
  Mail,
  Smartphone,
  MessageSquare,
  Lock,
  ArrowRight,
  RefreshCw,
  Building,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  KeyRound,
  User,
  Copy,
  Check,
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean;
  lockoutNotice?: string | null;
  users: AppUser[];
  currentUser: AppUser;
  tenants: Tenant[];
  currentTenant: Tenant;
  borrowers: BorrowerAccount[];
  onLoginSuccess: (
    user: AppUser,
    tenant?: Tenant,
    environment?: OperatingEnvironment,
    borrower?: BorrowerAccount
  ) => void;
  onRegisterCompany: (payload: CompanyRegistrationPayload) => void;
  onRegisterBorrower: (
    borrowerData: Omit<
      BorrowerAccount,
      'id' | 'borrowerNo' | 'creditScore' | 'creditRating' | 'registeredAt'
    >
  ) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isMandatory = false,
  lockoutNotice,
  users,
  currentUser,
  tenants,
  currentTenant,
  borrowers,
  onLoginSuccess,
  onRegisterCompany,
  onRegisterBorrower,
}) => {
  // Mode: 'login' | 'mfa_verify' | 'register_company' | 'register_borrower'
  const [mode, setMode] = useState<'login' | 'mfa_verify' | 'register_company' | 'register_borrower'>('login');

  // Separate fields for Username and Password
  const [username, setUsername] = useState('konekalit');
  const [password, setPassword] = useState('123Bell123');
  const [showPassword, setShowPassword] = useState(false); // Password masked by default
  const [showOtp, setShowOtp] = useState(true); // Visible as user types by default
  const [selectedMfaMethod, setSelectedMfaMethod] = useState<MFAMethod>('email');

  // Resolved identity and MFA Challenge State
  const [resolvedIdentity, setResolvedIdentity] = useState<ResolvedAuthIdentity | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<MFAChallenge | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState(300); // 5 min
  const [resendCooldownSec, setResendCooldownSec] = useState(0);

  // New Company Registration Form
  const [companyForm, setCompanyForm] = useState<CompanyRegistrationPayload>({
    companyName: '',
    legalName: '',
    regNo: 'URSB-2026-',
    tin: 'TIN-100',
    umraLicenseNo: 'UMRA/MFI/2026/',
    businessAddress: '',
    city: 'Kampala',
    phone: '+256 ',
    email: '',
    primaryColor: '#0f766e',
    accentColor: '#0284c7',
    defaultCurrency: 'UGX',
    adminName: '',
    adminEmail: '',
    adminPhone: '+256 ',
    planName: 'Growth Pro',
    enforceMFA: true,
  });

  // Borrower Self-Registration Form
  const [borrowerForm, setBorrowerForm] = useState({
    fullName: '',
    nin: '',
    email: '',
    phone: '+256 ',
    dob: '1992-06-15',
    gender: 'Male' as 'Female' | 'Male' | 'Other',
    residenceTown: '',
    residenceDistrict: 'Kampala',
    occupation: '',
    monthlyIncomeUGX: 3_500_000,
    monthlyExpensesUGX: 1_600_000,
    preferredMfaMethod: 'sms' as MFAMethod,
    mfaEnabled: true,
  });

  // Countdown timer for active MFA challenge
  useEffect(() => {
    if (!activeChallenge) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, activeChallenge.expiresAt - now);
      setTimeLeftSec(Math.floor(remainingMs / 1000));

      const resendMs = Math.max(0, activeChallenge.resendAvailableAt - now);
      setResendCooldownSec(Math.floor(resendMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeChallenge]);

  if (!isOpen) return null;

  // Step 1: Initiate Login -> Validates separate username & masked password fields and triggers MFA
  const handleInitiateLogin = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setMfaError(null);

    const trimmedUser = username.trim();

    if (!trimmedUser) {
      setMfaError('Please type your username or registered work email in the username field.');
      return;
    }

    if (!password) {
      setMfaError('Please type your account password in the password field.');
      return;
    }

    // Automatically resolve user, company, role, and environment without user selection!
    const identity = resolveUserAndCompany(trimmedUser, users, tenants, borrowers);

    // Validate credentials for users with assigned passwords
    const credCheck = validateUserCredentials(identity.user, password);
    if (!credCheck.valid) {
      setMfaError(credCheck.error || 'Invalid credentials');
      return;
    }

    setResolvedIdentity(identity);

    // Determine security requirement: user preference or tenant enforcement
    const isMfaRequired =
      identity.user.mfaEnabled ||
      (identity.tenant && identity.tenant.mfaEnforced) ||
      true; // Default to true for enterprise security

    const methodToUse = identity.user.preferredMfaMethod || selectedMfaMethod || 'email';
    setSelectedMfaMethod(methodToUse);

    const challenge = generateMfaChallenge(identity.user, methodToUse);
    setActiveChallenge(challenge);
    setOtpInput('');
    setMode('mfa_verify');
  };

  // Step 2: Validate OTP Code -> Directs user straight into their company workspace
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChallenge || !resolvedIdentity) return;

    const result = verifyMfaChallenge(activeChallenge, otpInput);
    if (!result.success) {
      setMfaError(result.error || 'Verification failed');
      setActiveChallenge({
        ...activeChallenge,
        attemptsLeft: result.attemptsLeft,
      });
      return;
    }

    // Success! Auto-direct user to their assigned company or environment
    onLoginSuccess(
      {
        ...resolvedIdentity.user,
        lastLoginAt: new Date().toISOString(),
        failedMfaAttempts: 0,
      },
      resolvedIdentity.tenant,
      resolvedIdentity.environment,
      resolvedIdentity.borrower
    );

    if (onClose) onClose();
  };

  // Resend OTP
  const handleResendOtp = (method: MFAMethod) => {
    if (!resolvedIdentity) return;
    setSelectedMfaMethod(method);
    const challenge = generateMfaChallenge(resolvedIdentity.user, method);
    setActiveChallenge(challenge);
    setOtpInput('');
    setMfaError(null);
  };

  // Submit Company Registration
  const handleSubmitCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.companyName || !companyForm.adminEmail) return;
    onRegisterCompany(companyForm);
    setMode('login');
    setUsername(companyForm.adminEmail);
  };

  // Submit Borrower Registration
  const handleSubmitBorrower = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerForm.fullName || !borrowerForm.nin) return;

    onRegisterBorrower({
      userId: `user-bor-${Date.now()}`,
      fullName: borrowerForm.fullName,
      nin: borrowerForm.nin,
      ninMasked:
        borrowerForm.nin.length >= 8
          ? `${borrowerForm.nin.slice(0, 4)}****${borrowerForm.nin.slice(-3)}`
          : 'CM9001****442T',
      email: borrowerForm.email,
      phone: borrowerForm.phone,
      dob: borrowerForm.dob,
      gender: borrowerForm.gender,
      residenceTown: borrowerForm.residenceTown || 'Central Division',
      residenceDistrict: borrowerForm.residenceDistrict,
      occupation: borrowerForm.occupation || 'Self-Employed Trader',
      monthlyIncomeUGX: Number(borrowerForm.monthlyIncomeUGX),
      monthlyExpensesUGX: Number(borrowerForm.monthlyExpensesUGX),
      status: 'active',
      mfaEnabled: borrowerForm.mfaEnabled,
      preferredMfaMethod: borrowerForm.preferredMfaMethod,
    });

    setMode('login');
    setUsername(borrowerForm.email);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isMandatory
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 backdrop-blur-md'
          : 'bg-slate-900/70 backdrop-blur-xs'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 p-1 flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/kerolenda-icon.svg"
                alt="KEROLENDA Icon"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">
                  KEROLENDA
                </h3>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Financial Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Institutional Microfinance Management System
              </p>
            </div>
          </div>
          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Selector (Tabs) */}
        {mode !== 'mfa_verify' && (
          <div className="bg-slate-100 p-1 flex border-b border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Log In</span>
            </button>
            <button
              onClick={() => setMode('register_company')}
              className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register_company'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>+ Register Company</span>
            </button>
            <button
              onClick={() => setMode('register_borrower')}
              className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register_borrower'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>+ Borrower Sign-Up</span>
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto">
          {/* MODE 1: LOGIN (Email & Password ONLY — NO Company Select!) */}
          {mode === 'login' && (
            <form onSubmit={handleInitiateLogin} className="space-y-4 text-xs">
              {/* Animated Welcome Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-4 text-white shadow-md border border-slate-700/60">
                {/* Background ambient glowing orbs */}
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-teal-500/15 rounded-full blur-xl animate-pulse" />

                {/* Foreground animated content */}
                <div className="relative z-10 flex items-center gap-4">
                  {/* Floating Logo Icon with Pulse Ring and Status Beacon */}
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-emerald-500/30 blur-md animate-pulse-ring" />
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-emerald-500/40 p-2 flex items-center justify-center shadow-lg animate-float-slow">
                      <img
                        src="/assets/aistudio/kerolenda-icon.svg"
                        alt="KEROLENDA Icon"
                        className="w-8 h-8 object-contain drop-shadow"
                      />
                    </div>
                    {/* Live system status ping */}
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
                    </span>
                  </div>

                  {/* Welcoming typography & greetings */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-white tracking-tight">
                        Welcome to KEROLENDA
                      </h4>
                      <span className="animate-wave text-sm" role="img" aria-label="wave">
                        👋
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Sign in to access your organization workspace, portfolio, and financial services.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Secure Institutional Access
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {lockoutNotice && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-900 text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
                  <span className="font-medium">{lockoutNotice}</span>
                </div>
              )}

              {mfaError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{mfaError}</span>
                </div>
              )}

              {/* Separate Fields for Username and Password */}
              <div className="space-y-3.5">
                {/* Field 1: Username / Email */}
                <div>
                  <label
                    htmlFor="usernameInput"
                    className="font-semibold text-slate-800 flex items-center justify-between text-xs mb-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Username or Email *</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Plain text input
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="usernameInput"
                      name="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setMfaError(null);
                      }}
                      placeholder="e.g. konekalit or onekalitkenneth@gmail.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition shadow-xs"
                    />
                    {username && (
                      <button
                        type="button"
                        onClick={() => setUsername('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                        title="Clear username"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Field 2: Password (Masked by default) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="passwordInput"
                      className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                      <span>Password (Masked) *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors"
                      title={showPassword ? 'Mask password with dots' : 'Show password text'}
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3 h-3 text-emerald-700" />
                          <span>Mask</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 text-emerald-700" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="passwordInput"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setMfaError(null);
                      }}
                      placeholder="Enter account password"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-xs tracking-wider focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition shadow-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span>
                      {showPassword ? (
                        <span className="text-amber-700 font-medium">⚠️ Password is currently visible</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">🔒 Password is masked with secure dots</span>
                      )}
                    </span>
                    <span className="text-slate-400">Press Enter to continue</span>
                  </div>
                </div>

                {/* Quick Account Test Selector */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Quick Test Personas:</span>
                    <span className="text-[9px] text-slate-400 font-normal">Click to fill</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('konekalit');
                        setPassword('123Bell123');
                        setMfaError(null);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[10px] font-medium transition cursor-pointer"
                    >
                      Platform Admin (konekalit)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('sarah.namubiru@victoriamfi.ug');
                        setPassword('Victoria@2026');
                        setMfaError(null);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[10px] font-medium transition cursor-pointer"
                    >
                      Victoria Admin (sarah)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('john.mukasa@victoriamfi.ug');
                        setPassword('Mukasa@2026');
                        setMfaError(null);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[10px] font-medium transition cursor-pointer"
                    >
                      Credit Officer (john)
                    </button>
                  </div>
                </div>
              </div>

              {/* Preferred MFA Channel */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Preferred MFA Verification Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMfaMethod('email')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold cursor-pointer transition-all ${
                      selectedMfaMethod === 'email'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-emerald-600" />
                    <span>Email OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMfaMethod('sms')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold cursor-pointer transition-all ${
                      selectedMfaMethod === 'sms'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>SMS OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMfaMethod('whatsapp')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold cursor-pointer transition-all ${
                      selectedMfaMethod === 'whatsapp'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 text-xs"
              >
                <span>Authenticate &amp; Request OTP</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </form>
          )}

          {/* MODE 2: MFA OTP VERIFICATION WITH COMPANY BADGE */}
          {mode === 'mfa_verify' && activeChallenge && resolvedIdentity && (
            <div className="space-y-4 text-xs">
              {/* Destination & Company Auto-Detected Banner */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Auto-Detected Workspace:
                  </span>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-4 h-4" />
                    <span>{resolvedIdentity.companyName}</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Signing in as <strong>{resolvedIdentity.user.name}</strong> ({resolvedIdentity.user.role})
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Direct Routing Active
                  </span>
                </div>
              </div>

              <div className="text-center py-2">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-600">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Enter Verification Code</h4>
                <p className="text-slate-500 text-[11px] mt-1 max-w-sm mx-auto">
                  A 6-digit OTP has been dispatched via <strong>{activeChallenge.method}</strong> to{' '}
                  <strong className="text-slate-700">{activeChallenge.destinationMasked}</strong>.
                </p>
              </div>

              {/* Verification Security Notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-[11px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold block text-slate-900">Security Verification Active</span>
                    <span className="text-slate-500 text-[10px]">
                      Test Environment Reference Token: <strong className="font-mono text-slate-800">{activeChallenge.code}</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpInput(activeChallenge.code)}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                >
                  Paste Token
                </button>
              </div>

              {mfaError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{mfaError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-700">
                      6-Digit Security Token *
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Visible as you type
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowOtp(!showOtp)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                        title={showOtp ? 'Switch to masked dots' : 'Make digits visible'}
                      >
                        {showOtp ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showOtp ? 'Hide' : 'Make Visible'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 6-Digit Segmented Visual Cards (Visible as typed) */}
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const digit = otpInput[index];
                      const isCurrent = otpInput.length === index;
                      return (
                        <div
                          key={index}
                          className={`h-13 rounded-xl border flex items-center justify-center text-xl font-mono font-extrabold transition-all select-none ${
                            digit !== undefined
                              ? 'bg-white border-emerald-500 text-slate-900 shadow-xs ring-2 ring-emerald-500/20'
                              : isCurrent
                              ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-400/40 animate-pulse'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          {digit !== undefined ? (showOtp ? digit : '•') : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Synced Direct Input */}
                  <div className="relative">
                    <input
                      type={showOtp ? 'text' : 'password'}
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoFocus
                      required
                      placeholder="Type 6-digit code (e.g. 849201)"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full text-center tracking-widest font-mono text-lg py-2 border rounded-xl border-slate-300 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white shadow-xs"
                    />
                    {otpInput.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOtpInput('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                        title="Clear code"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Live Real-time MFA Code Preview */}
                  {otpInput.length > 0 && (
                    <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-emerald-800 font-medium">Entered MFA Code:</span>
                        <span className="font-mono font-black text-sm text-emerald-950 tracking-widest">
                          {showOtp ? otpInput.split('').join(' ') : '• '.repeat(otpInput.length).trim()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-emerald-700 font-semibold bg-white border border-emerald-300 px-1.5 py-0.5 rounded">
                          {otpInput.length}/6 digits
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {showOtp ? 'Visible as typed' : 'Masked'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5 px-1">
                    <span>
                      Expires in:{' '}
                      <strong className="text-slate-700">
                        {Math.floor(timeLeftSec / 60)}:
                        {(timeLeftSec % 60).toString().padStart(2, '0')}
                      </strong>
                    </span>
                    <span>
                      Attempts left:{' '}
                      <strong className="text-slate-700">{activeChallenge.attemptsLeft}</strong>
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpInput.length < 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <span>Verify OTP &amp; Unlock Workspace</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-100 text-[11px]">
                <p className="text-slate-500 mb-1.5">Didn't receive the code or need another channel?</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={resendCooldownSec > 0}
                    onClick={() => handleResendOtp(activeChallenge.method)}
                    className="text-emerald-700 font-bold hover:underline disabled:text-slate-400 cursor-pointer"
                  >
                    {resendCooldownSec > 0 ? `Resend in ${resendCooldownSec}s` : 'Resend Code'}
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleResendOtp(activeChallenge.method === 'email' ? 'sms' : 'email')
                    }
                    className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    Switch to {activeChallenge.method === 'email' ? 'SMS' : 'Email'}
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    Change Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: REGISTER NEW LENDING COMPANY */}
          {mode === 'register_company' && (
            <form onSubmit={handleSubmitCompany} className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 text-[11px]">
                <strong className="block font-bold">New Lending Institution Registration:</strong>
                Registers an independent Tier 4 microfinance company or SACCO with an isolated tenant
                workspace, separate general ledger, and independent borrower database.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Trading Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nile Horizon Credit"
                    value={companyForm.companyName}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, companyName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Legal Registered Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Nile Horizon Credit Ltd"
                    value={companyForm.legalName}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, legalName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Identification (TIN) *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.tin}
                    onChange={(e) => setCompanyForm({ ...companyForm, tin: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UMRA License Number *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.umraLicenseNo}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, umraLicenseNo: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Head Office Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Plot 12 Jinja Road, Kampala"
                    value={companyForm.businessAddress}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, businessAddress: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Company Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@nilecredit.ug"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-[11px] mb-2 uppercase tracking-wider">
                  Initial Administrator Account
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kenneth Onekalit"
                      value={companyForm.adminName}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, adminName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Admin Login Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="kenneth@nilecredit.ug"
                      value={companyForm.adminEmail}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, adminEmail: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="enforceMfaCheckbox"
                  checked={companyForm.enforceMFA}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, enforceMFA: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="enforceMfaCheckbox"
                  className="font-semibold text-slate-700 cursor-pointer"
                >
                  Enforce Multi-Factor Authentication (MFA) for all company staff
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-xs mt-3"
              >
                <span>Register Company &amp; Provision Workspace</span>
                <Building className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* MODE 4: BORROWER SELF-REGISTRATION */}
          {mode === 'register_borrower' && (
            <form onSubmit={handleSubmitBorrower} className="space-y-3.5 text-xs">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 text-[11px]">
                <strong className="block font-bold">Borrower Central Registration:</strong>
                Register a personal borrower account to discover licensed lenders, view loan products,
                submit applications, and monitor credit health.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Christine Nakato"
                    value={borrowerForm.fullName}
                    onChange={(e) =>
                      setBorrowerForm({ ...borrowerForm, fullName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    National ID Number (NIN) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CF92019284102K"
                    value={borrowerForm.nin}
                    onChange={(e) =>
                      setBorrowerForm({ ...borrowerForm, nin: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="nakato.c@gmail.com"
                    value={borrowerForm.email}
                    onChange={(e) =>
                      setBorrowerForm({ ...borrowerForm, email: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Phone (MoMo) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+256 772 000 000"
                    value={borrowerForm.phone}
                    onChange={(e) =>
                      setBorrowerForm({ ...borrowerForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Occupation / Business</label>
                  <input
                    type="text"
                    placeholder="Retail Store Owner"
                    value={borrowerForm.occupation}
                    onChange={(e) =>
                      setBorrowerForm({ ...borrowerForm, occupation: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Income (UGX)</label>
                  <input
                    type="number"
                    value={borrowerForm.monthlyIncomeUGX}
                    onChange={(e) =>
                      setBorrowerForm({ ...borrowerForm, monthlyIncomeUGX: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-xs mt-3"
              >
                <span>Create Borrower Account &amp; Access Portal</span>
                <UserCheck className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
