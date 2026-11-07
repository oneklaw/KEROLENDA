import React from 'react';
import { PaymentReceipt, Tenant, Customer, Loan } from '../types';
import { formatUGX } from '../utils/finance';
import { Printer, CheckCircle, ShieldCheck, X } from 'lucide-react';

interface ReceiptModalProps {
  receipt: PaymentReceipt;
  tenant: Tenant;
  customer?: Customer;
  loan?: Loan;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  tenant,
  customer,
  loan,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Action Header (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Official Payment Voucher</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body */}
        <div className="p-6 text-slate-800 text-xs font-mono-num space-y-4 print-card">
          {/* Header Branding */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="font-black text-slate-900 text-base tracking-tight uppercase">
              {tenant.legalName}
            </h2>
            <p className="text-[11px] text-slate-600">{tenant.registeredAddress}</p>
            <p className="text-[11px] text-slate-500">
              TIN: {tenant.branding.taxRegistrationNo} • UMRA Lic: {tenant.branding.umraLicenseNo}
            </p>
            <p className="text-[11px] text-slate-500">Helpline: {tenant.supportPhone}</p>
            <div className="inline-block mt-2 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-[10px] font-bold tracking-wider uppercase text-slate-700">
              Official Repayment Receipt
            </div>
          </div>

          {/* Receipt Identifiers */}
          <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-dashed border-slate-300">
            <div>
              <span className="text-slate-500 block">Receipt No:</span>
              <strong className="text-slate-900 font-bold">{receipt.receiptNo}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Date & Time:</span>
              <strong className="text-slate-900">
                {new Date(receipt.postedAt).toLocaleString('en-UG', {
                  timeZone: 'Africa/Kampala',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Customer:</span>
              <strong className="text-slate-900">{customer?.fullName || 'Valued Member'}</strong>
              <span className="text-slate-500 block text-[10px]">{customer?.phone}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Loan / Ref:</span>
              <strong className="text-slate-900">{loan?.loanNo || 'Savings Deposit'}</strong>
              <span className="text-slate-500 block text-[10px]">TIN: {customer?.kyc.idNumberMasked}</span>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">Channel:</span>
              <strong className="text-slate-800">{receipt.channel}</strong>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">Provider Ref:</span>
              <strong className="text-slate-800 font-mono text-[10px]">{receipt.externalReference}</strong>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">Idempotency Key:</span>
              <span className="text-slate-600 font-mono text-[10px]">{receipt.idempotencyKey}</span>
            </div>
          </div>

          {/* Waterfall Allocation Breakdown */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700 pb-1 border-b border-slate-200">
              <span>Allocation Description</span>
              <span>Amount (UGX)</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Principal Reduction</span>
              <span>{formatUGX(receipt.principalAllocated)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Accrued Interest Paid</span>
              <span>{formatUGX(receipt.interestAllocated)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Loan Processing / Admin Fees</span>
              <span>{formatUGX(receipt.feeAllocated)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Late Repayment Penalties</span>
              <span>{formatUGX(receipt.penaltyAllocated)}</span>
            </div>
            {receipt.unallocatedSuspense > 0 && (
              <div className="flex justify-between text-[11px] text-amber-700">
                <span>Suspense / Advance Credit</span>
                <span>{formatUGX(receipt.unallocatedSuspense)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-900">
              <span>TOTAL RECEIVED</span>
              <span>{formatUGX(receipt.amount)}</span>
            </div>
          </div>

          {/* Loan Balance After Payment */}
          {loan && (
            <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-[11px]">
              <div className="flex justify-between">
                <span className="text-emerald-900 font-medium">New Remaining Principal:</span>
                <strong className="text-emerald-950 font-bold">
                  {formatUGX(loan.principalOutstanding)}
                </strong>
              </div>
              <div className="flex justify-between text-[10px] text-emerald-800 mt-0.5">
                <span>Loan Maturity Date:</span>
                <span>{loan.maturityDate}</span>
              </div>
            </div>
          )}

          {/* QR Code & Barcode Simulation */}
          <div className="pt-2 text-center border-t border-dashed border-slate-300">
            <div className="w-24 h-24 mx-auto border-2 border-slate-900 p-1 bg-white mb-1 flex flex-col items-center justify-center">
              {/* Simulated stylized QR Code Matrix */}
              <div className="grid grid-cols-5 gap-1 w-full h-full p-1 bg-slate-900">
                <div className="bg-white col-span-2 row-span-2"></div>
                <div className="bg-slate-900"></div>
                <div className="bg-white col-span-2 row-span-2"></div>
                <div className="bg-white col-span-3"></div>
                <div className="bg-white"></div>
                <div className="bg-white col-span-2 row-span-2"></div>
                <div className="bg-slate-900"></div>
                <div className="bg-white col-span-2 row-span-2"></div>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-mono">
              VERIFY: UMRA-AUTH-{receipt.receiptNo}
            </p>
          </div>

          {/* Footer Legal & Regulatory Notice */}
          <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
            <p className="font-semibold text-slate-700">{tenant.branding.receiptFooter}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Valid receipt generated by KEROLENDA Microfinance Engine. Posted entries are immutable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
