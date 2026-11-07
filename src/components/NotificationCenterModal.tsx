import React, { useState } from 'react';
import { SystemNotification } from '../types';
import { formatUGX } from '../utils/finance';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  CheckCheck,
  X,
  Calendar,
  Send,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onMarkAllAsRead: () => void;
  onTriggerScan?: (refDate: string) => void;
  lastScanResult?: {
    dispatchedCount: number;
    skippedCount: number;
    scannedDate: string;
  } | null;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onTriggerScan,
  lastScanResult,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [scanDate, setScanDate] = useState<string>('2026-11-03');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  if (!isOpen) return null;

  const remindersCount = notifications.filter((n) => n.type === 'repayment_reminder').length;
  const smsCount = notifications.filter((n) => n.channel === 'sms').length;
  const emailCount = notifications.filter((n) => n.channel === 'email').length;

  const filtered = notifications.filter((n) => {
    if (selectedChannel === 'all') return true;
    if (selectedChannel === 'reminders') return n.type === 'repayment_reminder';
    return n.channel === selectedChannel;
  });

  const handleManualScan = () => {
    if (!onTriggerScan) return;
    setIsScanning(true);
    setTimeout(() => {
      onTriggerScan(scanDate);
      setIsScanning(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">System Notification Hub</h3>
              <p className="text-[11px] text-slate-400">
                Automated 3-Day SMS &amp; Email Reminders • Multi-Channel Communications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Day Automated Reminder Engine Control Bar */}
        <div className="bg-emerald-950/20 border-b border-emerald-200/50 p-3 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-emerald-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Auto 3-Day Reminder Scheduler Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <input
                type="date"
                value={scanDate}
                onChange={(e) => setScanDate(e.target.value)}
                className="text-[11px] font-mono-num font-medium bg-transparent focus:outline-none text-slate-700"
                title="Simulation Date for 3-Day Window"
              />
            </div>
            {onTriggerScan && (
              <button
                type="button"
                onClick={handleManualScan}
                disabled={isScanning}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Scan Now'}
              </button>
            )}
          </div>
        </div>

        {lastScanResult && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 text-[11px] text-slate-600 flex items-center justify-between shrink-0">
            <span>
              Last Scan ({lastScanResult.scannedDate}):{' '}
              <strong className="text-emerald-700 font-bold">
                {lastScanResult.dispatchedCount} Dispatched
              </strong>
              , {lastScanResult.skippedCount} Idempotent (Already Sent)
            </span>
            <span className="text-slate-400 font-mono-num text-[10px]">
              Deduplication Active
            </span>
          </div>
        )}

        {/* Channel Filters */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setSelectedChannel('all')}
            className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
              selectedChannel === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setSelectedChannel('reminders')}
            className={`px-2.5 py-1 rounded-md font-bold cursor-pointer flex items-center gap-1 transition-colors ${
              selectedChannel === 'reminders'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <Clock className="w-3 h-3 text-emerald-600" />
            3-Day Reminders ({remindersCount})
          </button>
          <button
            onClick={() => setSelectedChannel('sms')}
            className={`px-2.5 py-1 rounded-md font-bold cursor-pointer flex items-center gap-1 transition-colors ${
              selectedChannel === 'sms'
                ? 'bg-sky-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Smartphone className="w-3 h-3 text-sky-600" />
            SMS ({smsCount})
          </button>
          <button
            onClick={() => setSelectedChannel('email')}
            className={`px-2.5 py-1 rounded-md font-bold cursor-pointer flex items-center gap-1 transition-colors ${
              selectedChannel === 'email'
                ? 'bg-indigo-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Mail className="w-3 h-3 text-indigo-600" />
            Email ({emailCount})
          </button>
          <button
            onClick={() => setSelectedChannel('whatsapp')}
            className={`px-2.5 py-1 rounded-md font-bold cursor-pointer flex items-center gap-1 transition-colors ${
              selectedChannel === 'whatsapp'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-emerald-500" />
            WhatsApp
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No notifications for this filter view.
            </div>
          ) : (
            filtered.map((item) => {
              const meta = item.metadata as Record<string, unknown> | undefined;
              const is3DayReminder = item.type === 'repayment_reminder';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border text-xs transition-colors shadow-2xs ${
                    item.isRead
                      ? 'bg-white border-slate-200'
                      : is3DayReminder
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-white border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-slate-100 text-slate-700 shrink-0">
                        {item.channel === 'email' && <Mail className="w-3.5 h-3.5 text-indigo-600" />}
                        {item.channel === 'sms' && <Smartphone className="w-3.5 h-3.5 text-sky-600" />}
                        {item.channel === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />}
                        {item.channel === 'in_app' && <Bell className="w-3.5 h-3.5 text-slate-600" />}
                      </span>
                      <div>
                        <strong className="text-slate-900 font-bold block leading-tight">
                          {item.title}
                        </strong>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span className="uppercase font-semibold tracking-wider font-mono">
                            {item.channel}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(item.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {is3DayReminder && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 shrink-0">
                        3-Day Prior Alert
                      </span>
                    )}
                  </div>

                  {/* Recipient Details & Metadata Badges */}
                  {(Boolean(item.recipientPhone) || Boolean(item.recipientEmail) || (meta && meta.amountDue != null)) && (
                    <div className="mb-2 p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2 text-[11px]">
                      {item.recipientPhone && item.channel === 'sms' && (
                        <span className="flex items-center gap-1 text-slate-700 font-mono-num">
                          <Smartphone className="w-3 h-3 text-sky-600" />
                          To: <strong>{item.recipientPhone}</strong>
                        </span>
                      )}
                      {item.recipientEmail && item.channel === 'email' && (
                        <span className="flex items-center gap-1 text-slate-700 font-mono-num">
                          <Mail className="w-3 h-3 text-indigo-600" />
                          To: <strong>{item.recipientEmail}</strong>
                        </span>
                      )}
                      {meta && meta.amountDue != null && (
                        <span className="font-bold text-emerald-700 font-mono-num">
                          Amount: {formatUGX(Number(meta.amountDue))}
                        </span>
                      )}
                      {meta && meta.dueDate != null && (
                        <span className="text-slate-500 font-mono-num">
                          Due: {String(meta.dueDate)}
                        </span>
                      )}
                      {meta && meta.gateway != null && (
                        <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                          {String(meta.gateway)}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-slate-700 text-[11px] leading-relaxed whitespace-pre-line bg-white/70 p-2 rounded border border-slate-100">
                    {item.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
