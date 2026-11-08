import React, { useState } from 'react';
import { 
  CreditCard, 
  Copy, 
  Check, 
  QrCode, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ArrowRight,
  User,
  Phone,
  Settings,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentConfig, PaymentAccountItem, PaymentRecord } from '../types';
import { maskPhoneNumber } from '../lib/supabase';

interface OfficialAccountsBannerProps {
  paymentConfig: PaymentConfig;
  currentRecord: PaymentRecord | null;
  lang: 'en' | 'my';
  theme: 'light' | 'dark';
  onOpenPaymentModal: (accountOrMethodId?: string) => void;
  onOpenAdminModal?: () => void;
}

export const OfficialAccountsBanner: React.FC<OfficialAccountsBannerProps> = ({
  paymentConfig,
  currentRecord,
  lang,
  theme,
  onOpenPaymentModal,
  onOpenAdminModal
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_accounts_banner_expanded');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedZoomQr, setSelectedZoomQr] = useState<{ title: string; image: string; name: string; number: string; accountId: string } | null>(null);

  const toggleExpanded = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    try {
      localStorage.setItem('solar_sizer_accounts_banner_expanded', String(nextState));
    } catch (e) {}
  };

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (err) {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Get active dynamic accounts or fallback
  const getRenderAccounts = (): PaymentAccountItem[] => {
    if (paymentConfig.accounts && paymentConfig.accounts.length > 0) {
      const active = paymentConfig.accounts.filter(a => a.isActive);
      if (active.length > 0) return active;
    }
    return [
      {
        id: 'acc_default_kbz',
        provider: 'kbzpay',
        payName: 'KBZPay (KPay)',
        accountName: paymentConfig.kbzName || paymentConfig.merchantName || 'Solar Tech Admin',
        accountNumber: paymentConfig.kbzNumber || paymentConfig.merchantPhone,
        qrImage: paymentConfig.kpayQrImage,
        isActive: true,
        colorTheme: 'blue'
      }
    ];
  };

  const accounts = getRenderAccounts();

  const getStyleProps = (acc: PaymentAccountItem) => {
    const prov = acc.provider.toLowerCase();
    const color = acc.colorTheme || (prov.includes('kbz') ? 'blue' : prov.includes('wave') ? 'yellow' : prov.includes('cb') ? 'red' : prov.includes('aya') ? 'pink' : 'purple');

    switch (color) {
      case 'blue':
        return {
          badgeBg: 'bg-blue-600 text-white',
          border: 'border-blue-500/20 hover:border-blue-500/50',
          bgGlow: 'from-blue-600/5 to-cyan-600/5 dark:from-blue-950/20 dark:to-cyan-950/20',
          iconColor: 'text-blue-500',
          btnBg: 'hover:border-blue-500/50'
        };
      case 'yellow':
      case 'orange':
        return {
          badgeBg: 'bg-amber-500 text-slate-950 font-bold',
          border: 'border-amber-500/20 hover:border-amber-500/50',
          bgGlow: 'from-yellow-500/5 to-amber-500/5 dark:from-yellow-950/20 dark:to-amber-950/20',
          iconColor: 'text-amber-500',
          btnBg: 'hover:border-amber-500/50'
        };
      case 'red':
        return {
          badgeBg: 'bg-red-600 text-white',
          border: 'border-red-500/20 hover:border-red-500/50',
          bgGlow: 'from-red-600/5 to-orange-600/5 dark:from-red-950/20 dark:to-orange-950/20',
          iconColor: 'text-red-500',
          btnBg: 'hover:border-red-500/50'
        };
      case 'pink':
        return {
          badgeBg: 'bg-rose-600 text-white',
          border: 'border-rose-500/20 hover:border-rose-500/50',
          bgGlow: 'from-rose-600/5 to-pink-600/5 dark:from-rose-950/20 dark:to-pink-950/20',
          iconColor: 'text-rose-500',
          btnBg: 'hover:border-rose-500/50'
        };
      case 'emerald':
        return {
          badgeBg: 'bg-emerald-600 text-white',
          border: 'border-emerald-500/20 hover:border-emerald-500/50',
          bgGlow: 'from-emerald-600/5 to-teal-600/5 dark:from-emerald-950/20 dark:to-teal-950/20',
          iconColor: 'text-emerald-500',
          btnBg: 'hover:border-emerald-500/50'
        };
      case 'purple':
      default:
        return {
          badgeBg: 'bg-purple-600 text-white',
          border: 'border-purple-500/20 hover:border-purple-500/50',
          bgGlow: 'from-purple-600/5 to-indigo-600/5 dark:from-purple-950/20 dark:to-indigo-950/20',
          iconColor: 'text-purple-500',
          btnBg: 'hover:border-purple-500/50'
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2" id="official-payment-accounts-section">
      <div className={`rounded-2xl border transition-all duration-300 shadow-sm ${
        theme === 'dark'
          ? 'bg-slate-900/90 border-slate-800 backdrop-blur-sm'
          : 'bg-white border-slate-200'
      }`}>
        {/* Banner Header & Toggle */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{lang === 'my' ? 'တရားဝင် ငွေလွှဲလက်ခံသည့် အကောင့်များ' : 'Official Payment Accounts'}</span>
                </h3>
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{accounts.length} Accounts Active</span>
                </span>
                {currentRecord?.status === 'approved' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    PAID & UNLOCKED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentRecord?.status === 'approved' 
                  ? (lang === 'my' ? 'ငွေလွှဲအတည်ပြုပြီးပါပြီ။ ဖိုင်များနှင့် တွက်ချက်မှု Data အားလုံး အသုံးပြုနိုင်ပါပြီ။' : 'Payment approved! Full database & engineering vault are unlocked.')
                  : currentRecord?.status === 'pending'
                  ? (lang === 'my' ? 'လုပ်ငန်းစဉ် နောက်ဆုံး ၆ လုံး ပေးပို့ထားပြီးပါပြီ။ Admin အတည်ပြုပေးသည်နှင့် အလိုအလျောက် ပွင့်ပါမည်။' : 'Transaction submitted. Will automatically unlock once admin approves.')
                  : (lang === 'my' ? 'Solar String Sizer Pro နှင့် Mounting Calculators (Roof & Ground 3D) စနစ်များအား စတင်အသုံးပြုရန် အောက်ပါအကောင့်များသို့ ငွေလွှဲပေးပို့နိုင်ပါသည်' : 'Official merchant accounts for Solar String Sizer Pro & Mounting Calculators license activation')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Quick Pay Action Button */}
            <button
              type="button"
              onClick={() => onOpenPaymentModal()}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{currentRecord?.status === 'approved' ? (lang === 'my' ? 'ငွေလွှဲအချက်အလက်' : 'Payment Details') : (lang === 'my' ? 'ငွေလွှဲစလစ် ပေးပို့မည်' : 'Submit Payment Slip')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Collapse/Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleExpanded}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title={isExpanded ? 'Collapse Accounts' : 'Expand Accounts'}
            >
              {isExpanded ? (
                <>
                  <span className="hidden md:inline text-[11px] font-semibold">{lang === 'my' ? 'ခေါက်သိမ်းမည်' : 'Hide'}</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span className="hidden md:inline text-[11px] font-semibold">{lang === 'my' ? 'အကောင့်များ ကြည့်မည်' : 'View Accounts'}</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Accounts Grid */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {accounts.map((acc) => {
                  const style = getStyleProps(acc);
                  const isCopiedNum = copiedKey === `num_${acc.id}`;
                  const isCopiedRec = copiedKey === `rec_${acc.id}`;

                  return (
                    <div
                      key={acc.id}
                      className={`relative rounded-xl border p-4 bg-gradient-to-br ${style.bgGlow} transition-all duration-200 ${style.border} flex flex-col justify-between space-y-3.5 group`}
                    >
                      {/* Top Header with Badge & QR Mini Button */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${style.badgeBg} shadow-sm truncate max-w-[170px]`}>
                          {acc.payName}
                        </span>

                        {acc.qrImage ? (
                          <button
                            type="button"
                            onClick={() => setSelectedZoomQr({
                              title: `${acc.payName} QR Code`,
                              image: acc.qrImage!,
                              name: acc.accountName,
                              number: acc.accountNumber,
                              accountId: acc.id
                            })}
                            className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors shadow-xs cursor-pointer flex items-center gap-1 text-[10px] font-bold shrink-0"
                            title="Zoom QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5 text-blue-500" />
                            <span>QR</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400">Official</span>
                        )}
                      </div>

                      {/* Middle Details: Recipient Name & Phone */}
                      <div className="space-y-2 text-xs">
                        {/* Recipient Account Name */}
                        <div className="bg-white/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5 flex items-center gap-1">
                            <User className={`w-3 h-3 ${style.iconColor}`} />
                            <span>{lang === 'my' ? 'လက်ခံသူအမည်' : 'Account Name'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 dark:text-white truncate" title={acc.accountName}>
                              {acc.accountName}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(acc.accountName, `rec_${acc.id}`)}
                              className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                                isCopiedRec
                                  ? 'bg-emerald-500/20 text-emerald-600'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                              }`}
                              title="Copy Name"
                            >
                              {isCopiedRec ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Phone / Account Number */}
                        <div className="bg-white/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>{lang === 'my' ? 'ဖုန်း/အကောင့်နံပါတ်' : 'Account Number'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-slate-900 dark:text-white tracking-widest text-xs sm:text-sm truncate">
                              {maskPhoneNumber(acc.accountNumber)}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(acc.accountNumber.replace(/\s+/g, ''), `num_${acc.id}`)}
                              className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                                isCopiedNum
                                  ? 'bg-emerald-500/20 text-emerald-600'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                              }`}
                              title="Copy Number"
                            >
                              {isCopiedNum ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action: Scan / Pay with this method */}
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(acc.id)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                          theme === 'dark'
                            ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-white'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
                        } ${style.btnBg}`}
                      >
                        <QrCode className={`w-3.5 h-3.5 ${style.iconColor}`} />
                        <span className="truncate">{lang === 'my' ? `${acc.payName} ဖြင့် လွှဲမည်` : `Pay with ${acc.payName}`}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Info strip */}
              <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'my' ? 'နှုန်းထား:' : 'Plan Fee:'}
                  </span>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                    {paymentConfig.amount.toLocaleString()} {paymentConfig.currency}
                  </span>
                  <span className="text-slate-400">({paymentConfig.planName})</span>
                </div>

                <div className="flex items-center gap-3">
                  <span>{lang === 'my' ? 'ငွေလွှဲပြီးနောက် ၆ လုံးကုဒ်ဖြင့် အတည်ပြုပါ' : 'Submit last 6 digits of TxID after transfer'}</span>
                  {onOpenAdminModal && (
                    <button
                      type="button"
                      onClick={onOpenAdminModal}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                    >
                      {lang === 'my' ? 'အကောင့်များ အသစ်ထည့်/ပြင်ရန် (Admin)' : 'Manage Accounts (Admin)'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QR Code Quick Zoom Modal */}
      {selectedZoomQr && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full relative text-center space-y-4 shadow-2xl">
            <button
              onClick={() => setSelectedZoomQr(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
            >
              ✕
            </button>

            <h3 className="font-bold text-white text-base">
              {selectedZoomQr.title}
            </h3>

            <div className="bg-white p-3.5 rounded-2xl mx-auto shadow-2xl inline-block">
              <img 
                src={selectedZoomQr.image} 
                alt={selectedZoomQr.title} 
                className="w-60 h-60 object-contain rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-400">{selectedZoomQr.name}</p>
              <p className="text-xs font-mono text-slate-300 font-bold tracking-widest">{maskPhoneNumber(selectedZoomQr.number)}</p>
              <p className="text-xs text-slate-400 font-medium">{paymentConfig.amount.toLocaleString()} {paymentConfig.currency}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const targetId = selectedZoomQr.accountId;
                  setSelectedZoomQr(null);
                  onOpenPaymentModal(targetId);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'ဤနည်းဖြင့် ငွေလွှဲမည်' : 'Proceed to Pay'}
              </button>
              <button
                onClick={() => setSelectedZoomQr(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
