import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  X,
  PlusCircle,
  Receipt,
  ArrowRightLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { QUICK_ACTIONS, executeQuickAction } from '../utils/quickActionsService';

interface FloatingQuickActionsProps {
  onOpenNewLoan?: () => void;
  onOpenQuickPayment?: () => void;
  onOpenNewExpense?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const FloatingQuickActions: React.FC<FloatingQuickActionsProps> = ({
  onOpenNewLoan,
  onOpenQuickPayment,
  onOpenNewExpense,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key to dismiss
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleTriggerAction = (actionId: 'new_loan' | 'record_payment' | 'add_expense') => {
    executeQuickAction(actionId, {
      onOpenNewLoan,
      onOpenQuickPayment,
      onOpenNewExpense,
      onNavigateTab,
    });
    setIsOpen(false);
  };

  const getActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'PlusCircle':
        return <PlusCircle className="w-4 h-4 text-emerald-400" />;
      case 'Receipt':
        return <Receipt className="w-4 h-4 text-emerald-100" />;
      case 'ArrowRightLeft':
        return <ArrowRightLeft className="w-4 h-4 text-amber-100" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto no-print"
      aria-label="Floating Quick Actions"
    >
      {/* Expanded Quick Action Items */}
      {isOpen && (
        <div
          className="mb-3 flex flex-col items-end gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="bg-slate-900/90 text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md backdrop-blur-xs border border-slate-700/80 mb-0.5">
            Operational Quick Triggers
          </div>

          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleTriggerAction(action.id)}
              className={`group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl shadow-lg border border-white/10 ${action.bgClass} ${action.hoverClass} ${action.colorClass} transition-all duration-150 transform hover:-translate-x-1 cursor-pointer`}
              role="menuitem"
            >
              <span className="p-2 rounded-lg bg-black/20 group-hover:scale-110 transition-transform">
                {getActionIcon(action.iconName)}
              </span>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-tight">{action.label}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/20 text-white/90">
                    {action.keyboardShortcut}
                  </span>
                </div>
                <p className="text-[10px] text-white/70 line-clamp-1">{action.description}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-full shadow-xl transition-all duration-200 cursor-pointer border ${
          isOpen
            ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700 ring-4 ring-slate-900/20'
            : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white border-emerald-500/40 hover:shadow-emerald-600/30 hover:scale-105 ring-4 ring-emerald-500/10'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={isOpen ? 'Close Quick Actions menu' : 'Open Quick Actions menu'}
      >
        <span
          className={`p-1 rounded-full transition-transform duration-200 ${
            isOpen ? 'rotate-90 bg-slate-800' : 'group-hover:rotate-12 bg-white/10'
          }`}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />}
        </span>

        <span className="text-xs font-bold tracking-wide select-none">
          {isOpen ? 'Close Menu' : 'Quick Actions'}
        </span>

        {!isOpen && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        )}
      </button>
    </div>
  );
};
