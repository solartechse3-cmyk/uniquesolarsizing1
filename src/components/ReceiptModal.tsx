import React, { useRef } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Printer, 
  X, 
  Share2, 
  ShieldCheck, 
  Sun, 
  Copy, 
  Check, 
  Calendar, 
  CreditCard,
  Building2,
  FileCheck,
  Clock,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { PaymentConfig, PaymentRecord, SubscriptionDuration } from '../types';
import { maskPhoneNumber } from '../lib/supabase';
import { formatDurationLabel, formatSubscriptionExpiryDateTime } from '../lib/subscriptionUtils';
import { exportElementToA4Pdf, printA4Element } from '../lib/pdfExport';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'my';
  theme: 'light' | 'dark';
  paymentConfig: PaymentConfig;
  paymentRecord: PaymentRecord | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  paymentConfig,
  paymentRecord,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState(false);

  if (!isOpen || !paymentRecord) return null;

  const invoiceNumber = `INV-${new Date(paymentRecord.submittedAt).getFullYear()}-${paymentRecord.transactionDigits}`;
  const formattedDate = new Date(paymentRecord.approvedAt || paymentRecord.submittedAt).toLocaleDateString(
    lang === 'my' ? 'my-MM' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  const handleCopyId = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(invoiceNumber).catch(() => {});
      }
    } catch (err) {}
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const [isExportingPdf, setIsExportingPdf] = React.useState(false);

  const handlePrint = () => {
    if (receiptRef.current) {
      printA4Element(receiptRef.current, `Digital_Receipt_${invoiceNumber}`);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) {
      window.print();
      return;
    }
    setIsExportingPdf(true);
    try {
      await exportElementToA4Pdf(receiptRef.current, `Digital_Receipt_${invoiceNumber}`);
    } catch (err) {
      console.error('PDF export error:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg my-auto relative"
      >
        {/* Modal Controls (Hidden in print) */}
        <div className="flex justify-end gap-2 mb-3 print:hidden">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
            title="Download PDF"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{lang === 'my' ? 'PDF ထုတ်ယူနေသည်...' : 'Saving PDF...'}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'PDF သိမ်းမည်' : 'Save PDF'}</span>
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'ပရင့်ထုတ်မည်' : 'Print Receipt'}</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Digital Receipt Card */}
        <div 
          ref={receiptRef}
          id="digital-receipt-printable"
          className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden print:shadow-none print:border-none print:p-4"
        >
          {/* Top Decorative Header */}
          <div className="border-b-2 border-dashed border-slate-200 pb-6 mb-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                    {paymentConfig.merchantName || 'Solar Tech'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Solar Array String Sizer & Mounting Calculators Pro</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold uppercase tracking-wide">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'my' ? 'အတည်ပြုပြီး' : 'PAID & VERIFIED'}</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold block">
                {lang === 'my' ? 'တရားဝင် ငွေပေးချေမှုပြေစာ' : 'OFFICIAL PAYMENT RECEIPT'}
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {paymentRecord.amount.toLocaleString()} <span className="text-xl font-bold text-slate-600">{paymentRecord.currency}</span>
              </h2>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-3.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">{lang === 'my' ? 'ပြေစာအမှတ်' : 'Receipt / Invoice ID'}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-800">{invoiceNumber}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer print:hidden"
                  title="Copy Invoice ID"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">{lang === 'my' ? 'ရက်စွဲ နှင့် အချိန်' : 'Date & Time'}</span>
              <span className="font-medium text-slate-800">{formattedDate}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">{lang === 'my' ? 'လုပ်ငန်းစဉ် နောက်ဆုံး ၆ လုံး' : 'Transaction Digits'}</span>
              <span className="font-mono font-bold text-blue-600 tracking-wider text-base">
                {paymentRecord.transactionDigits}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">{lang === 'my' ? 'ငွေပေးချေသည့် စနစ်' : 'Payment Method'}</span>
              <span className="font-semibold uppercase text-slate-800">{paymentRecord.method}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">{lang === 'my' ? 'အစီအစဉ် အမျိုးအစား' : 'Access Plan'}</span>
              <span className="font-semibold text-slate-800">
                {paymentRecord.planName || paymentConfig.planName}
              </span>
            </div>

            {paymentRecord.planDuration && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">{lang === 'my' ? 'သက်တမ်း သတ်မှတ်ချက်' : 'Subscription Duration'}</span>
                <span className="font-bold text-blue-600">
                  {formatDurationLabel(paymentRecord.planDuration as SubscriptionDuration, lang)}
                </span>
              </div>
            )}

            {paymentRecord.expiresAt && (
              <div className="flex justify-between items-center py-2 bg-emerald-50 px-3 rounded-xl border border-emerald-200">
                <span className="text-emerald-800 font-semibold flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{lang === 'my' ? 'သက်တမ်းကုန်ဆုံးမည့်ရက်နှင့် အချိန်' : 'Expires At'}</span>
                </span>
                <span className="font-mono font-bold text-emerald-700 text-xs text-right">
                  {formatSubscriptionExpiryDateTime(paymentRecord.expiresAt, lang)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">{lang === 'my' ? 'လက်ခံသူ ဖုန်းနံပါတ်' : 'Merchant Number'}</span>
              <span className="font-mono text-slate-800 font-bold tracking-widest">{maskPhoneNumber(paymentRecord.merchantPhone)}</span>
            </div>
          </div>

          {/* Verification Watermark / Seal */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Verified System Authentication</span>
            </div>
            <div className="text-right font-mono">
              AUTH-SEC-{paymentRecord.transactionDigits}
            </div>
          </div>

          {/* Close button for non-print */}
          <div className="mt-6 print:hidden">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all cursor-pointer shadow-md"
            >
              {lang === 'my' ? 'ပိတ်မည်' : 'Close Receipt'}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
