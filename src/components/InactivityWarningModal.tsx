import React from 'react';
import { ShieldAlert, Clock, Lock, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { InactivityState } from '../utils/inactivityTimer';

interface InactivityWarningModalProps {
  isOpen: boolean;
  inactivityState: InactivityState;
  onStayLoggedIn: () => void;
  onLockNow: () => void;
  onSimulateLock?: () => void;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  inactivityState,
  onStayLoggedIn,
  onLockNow,
  onSimulateLock,
}) => {
  if (!isOpen) return null;

  // Calculate percentage of warning window remaining
  const totalWarningSeconds = inactivityState.warningWindowSeconds || 120;
  const remainingSeconds = inactivityState.remainingSeconds;
  const progressPercent = Math.min(100, Math.max(0, (remainingSeconds / totalWarningSeconds) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-amber-500/10 text-center relative overflow-hidden">
        {/* Animated Amber Glow Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />

        {/* Shield Icon Header */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <span>Inactivity Security Warning</span>
          </h3>
          <p className="text-xs text-amber-300/90 font-medium">
            Session Auto-Lock Trigger: 15-Minute Threshold
          </p>
        </div>

        {/* Live Countdown Display */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Time Remaining Before Lockout</span>
          </div>

          <div
            className={`text-4xl font-extrabold font-mono tracking-wider ${
              remainingSeconds <= 30 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
            }`}
          >
            {inactivityState.formattedCountdown}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                remainingSeconds <= 30 ? 'bg-rose-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Explanatory Regulatory Context */}
        <p className="text-xs text-slate-300 leading-relaxed text-left bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
          No mouse, keyboard, or touch activity has been detected. In accordance with the{' '}
          <strong className="text-white">Uganda Data Protection and Privacy Act 2019</strong> and{' '}
          <strong className="text-white">UMRA Tier 4 Institutional Security Guidelines</strong>, your workspace will lock
          to prevent unauthorized access to customer KYC files and microfinance records.
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onStayLoggedIn}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Stay Logged In (Extend Session)
          </button>

          <button
            onClick={onLockNow}
            className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            Lock Session Now
          </button>
        </div>

        {/* Quick Simulation Trigger for Testers */}
        {onSimulateLock && (
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>QA Testing Mode:</span>
            <button
              onClick={onSimulateLock}
              className="text-amber-400 hover:text-amber-300 font-medium transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Force Immediate Lock
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
