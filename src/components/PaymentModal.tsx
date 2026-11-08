import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  CreditCard, 
  Check, 
  X, 
  QrCode, 
  Sparkles, 
  Lock, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  AlertCircle,
  KeyRound,
  Upload,
  Info,
  DollarSign,
  User,
  Phone,
  Maximize2,
  Download,
  Building2,
  FolderDown,
  Eye,
  Calendar,
  Zap,
  ShieldCheck,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentConfig, PaymentAccountItem, PaymentRecord, PaymentStatus, SubscriptionDuration } from '../types';
import { maskPhoneNumber } from '../lib/supabase';
import { DEFAULT_DURATION_PACKAGES, formatDurationLabel, useSubscriptionCountdown, isSubscriptionActive, formatSubscriptionExpiryDateTime, calculateExtendedExpirationDate } from '../lib/subscriptionUtils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose?: () => void;
  lang: 'en' | 'my';
  theme: 'light' | 'dark';
  paymentConfig: PaymentConfig;
  currentRecord: PaymentRecord | null;
  initialMethod?: string;
  isPreview?: boolean;
  onPaymentSubmit: (record: Omit<PaymentRecord, 'id' | 'submittedAt' | 'status'>) => void;
  onAdminApproveCurrent?: () => void;
  onResetPayment?: () => void;
  onOpenReceipt?: () => void;
  onOpenAdmin?: () => void;
  onOpenResources?: () => void;
  onRestoreApprovedRecord?: (record: PaymentRecord) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  paymentConfig,
  currentRecord,
  initialMethod = 'kbzpay',
  isPreview = false,
  onPaymentSubmit,
  onAdminApproveCurrent,
  onResetPayment,
  onOpenReceipt,
  onOpenAdmin,
  onOpenResources,
  onRestoreApprovedRecord,
}) => {
  // Extract all active accounts from config or fallback
  const accountsList: PaymentAccountItem[] = useMemo(() => {
    if (paymentConfig?.accounts && paymentConfig.accounts.length > 0) {
      const active = paymentConfig.accounts.filter(a => a.isActive);
      if (active.length > 0) return active;
    }
    return [
      {
        id: 'acc_default_kbz',
        provider: 'kbzpay',
        payName: 'KBZPay (KPay)',
        accountName: paymentConfig?.kbzName || paymentConfig?.merchantName || 'Solar Tech Admin',
        accountNumber: paymentConfig?.kbzNumber || paymentConfig?.merchantPhone || '09 798 123 456',
        qrImage: paymentConfig?.kpayQrImage,
        isActive: true,
        colorTheme: 'blue'
      }
    ];
  }, [paymentConfig]);

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    if (initialMethod) {
      const match = accountsList.find(a => a.id === initialMethod || a.provider.toLowerCase() === initialMethod.toLowerCase());
      if (match) return match.id;
    }
    return accountsList[0]?.id || 'acc_default_kbz';
  });

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminQuickUnlock, setShowAdminQuickUnlock] = useState(false);
  const [showQrZoom, setShowQrZoom] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreQuery, setRestoreQuery] = useState('');
  const [isCheckingRestore, setIsCheckingRestore] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live decreasing subscription countdown
  const liveRemainingInfo = useSubscriptionCountdown(currentRecord?.expiresAt, lang);

  // Duration packages pricing calculation
  const durationPackages = useMemo(() => {
    const fallbackAmount = paymentConfig?.amount || 10000;
    const base1w = paymentConfig?.durationsPricing?.oneWeek || 3000;
    const base1m = paymentConfig?.durationsPricing?.oneMonth || fallbackAmount;
    const base3m = paymentConfig?.durationsPricing?.threeMonths || Math.round(base1m * 2.5);

    return [
      {
        id: '1_week' as SubscriptionDuration,
        months: 0.25,
        labelEn: '1 Week',
        labelMy: '၁ ပတ် သက်တမ်း',
        labelZh: '1周体验',
        price: base1w,
        discountPercent: 0,
        popular: false
      },
      {
        id: '1_month' as SubscriptionDuration,
        months: 1,
        labelEn: '1 Month',
        labelMy: '၁ လ သက်တမ်း',
        labelZh: '1个月会员',
        price: base1m,
        tagEn: 'Standard',
        tagMy: 'အခြေခံ',
        discountPercent: 0,
        popular: false
      },
      {
        id: '3_months' as SubscriptionDuration,
        months: 3,
        labelEn: '3 Months',
        labelMy: '၃ လ သက်တမ်း',
        labelZh: '3个月会员',
        price: base3m,
        tagEn: 'Popular',
        tagMy: 'လူကြိုက်များ',
        discountPercent: 17,
        popular: true
      }
    ];
  }, [paymentConfig]);

  const [selectedDuration, setSelectedDuration] = useState<SubscriptionDuration>(() => {
    return (currentRecord?.planDuration as SubscriptionDuration) || '1_month';
  });

  const [isRenewing, setIsRenewing] = useState(false);

  // Sync initialMethod when opened or prop changes
  useEffect(() => {
    if (initialMethod && accountsList.length > 0) {
      const match = accountsList.find(a => a.id === initialMethod || a.provider.toLowerCase() === initialMethod.toLowerCase());
      if (match) {
        setSelectedAccountId(match.id);
      }
    }
  }, [initialMethod, isOpen, accountsList]);

  // Sync digits if current record exists
  useEffect(() => {
    if (currentRecord?.transactionDigits && currentRecord.transactionDigits.length === 6) {
      setDigits(currentRecord.transactionDigits.split(''));
    }
  }, [currentRecord]);

  if (!isOpen) return null;

  const cfg = paymentConfig || {
    merchantName: "Solar Tech Myanmar",
    merchantPhone: "09 798 123 456",
    amount: 10000,
    currency: "MMK",
    planName: "Solar String Sizer Pro",
    autoApproveMinutes: 0
  };

  const currentStatus: PaymentStatus = currentRecord?.status || 'unpaid';
  const isApproved = currentStatus === 'approved';
  const isActivePro = isApproved && isSubscriptionActive(currentRecord);
  const isExpired = isApproved && !isSubscriptionActive(currentRecord);
  const remainingInfo = isApproved ? liveRemainingInfo : null;

  const activePackage = durationPackages.find(p => p.id === selectedDuration) || durationPackages[0];
  const payableAmount = activePackage.price;

  // Active selected account object
  const activeAccount = accountsList.find(a => a.id === selectedAccountId) || accountsList[0];

  const activeNumber = activeAccount?.accountNumber || cfg.merchantPhone;
  const activeRecipientName = activeAccount?.accountName || cfg.merchantName;
  const activeQrImage = activeAccount?.qrImage;

  // Handle single digit changes
  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    
    // Handle paste of multiple characters
    if (cleanVal.length > 1) {
      const pasteDigits = cleanVal.slice(0, 6).split('');
      const newDigits = [...digits];
      pasteDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(pasteDigits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-advance to next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasteData) {
      const newDigits = [...digits];
      for (let i = 0; i < pasteData.length; i++) {
        newDigits[i] = pasteData[i];
      }
      setDigits(newDigits);
      const focusIndex = Math.min(pasteData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(lang === 'my' ? 'ဖိုင်ဆိုဒ် 5MB အောက်သာ ဖြစ်ရပါမည်။' : 'File size must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSlipImage(reader.result as string);
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullDigits = digits.join('');
    if (fullDigits.length < 6) {
      setErrorMessage(
        lang === 'my' 
          ? 'ကျေးဇူးပြု၍ နောက်ဆုံး ၆ လုံး ဂဏန်းပြည့်အောင် ထည့်သွင်းပေးပါ။' 
          : 'Please enter all 6 digits of the transaction ID.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    setTimeout(() => {
      onPaymentSubmit({
        transactionDigits: fullDigits,
        method: activeAccount?.provider || 'payment',
        accountId: activeAccount?.id,
        accountPayName: activeAccount?.payName || 'Payment Account',
        amount: payableAmount,
        currency: cfg.currency,
        merchantName: activeRecipientName,
        merchantPhone: activeNumber,
        slipImage: slipImage || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        planDuration: activePackage.id,
        durationMonths: activePackage.months,
        planName: `${cfg.planName} (${activePackage.labelMy})`,
      });
      setIsSubmitting(false);
      setIsRenewing(false);
    }, 600);
  };

  const handleQuickAdminUnlock = () => {
    if (onAdminApproveCurrent) {
      onAdminApproveCurrent();
    }
    setShowAdminQuickUnlock(false);
  };

  const handleVerifyAndRestore = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = restoreQuery.trim();
    if (!q) {
      setRestoreFeedback({
        status: 'error',
        message: lang === 'my' ? 'ဖုန်းနံပါတ် သို့မဟုတ် လုပ်ငန်းစဉ် နောက်ဆုံး ၆ လုံး ထည့်သွင်းပေးပါ။' : 'Please enter your phone number or last 6 transaction digits.'
      });
      return;
    }

    setIsCheckingRestore(true);
    setRestoreFeedback({ status: 'idle', message: '' });

    try {
      const resp = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await resp.json();

      if (data.approved && data.record) {
        setRestoreFeedback({
          status: 'success',
          message: lang === 'my' ? 'အတည်ပြုပြီးသား အကောင့် တွေ့ရှိပါပြီ။ ခွင့်ပြုချက် ပြန်လည်ရရှိပါပြီ!' : 'Verified! Your approved payment was found and access is restored.'
        });
        setTimeout(() => {
          if (onRestoreApprovedRecord) {
            onRestoreApprovedRecord(data.record);
          }
          setShowRestoreModal(false);
          if (onClose) onClose();
        }, 1000);
      } else {
        setRestoreFeedback({
          status: 'error',
          message: lang === 'my' 
            ? 'အတည်ပြုပြီးသား ငွေလွှဲမှတ်တမ်း မတွေ့ရှိသေးပါ။ Admin မှ အတည်မပြုရသေးပါက ခေတ္တစောင့်ဆိုင်းပေးပါ။' 
            : 'No approved payment found matching this number. Please wait if Admin is still reviewing.'
        });
      }
    } catch (err) {
      setRestoreFeedback({
        status: 'error',
        message: lang === 'my' ? 'စစ်ဆေးရာတွင် ချိတ်ဆက်မှု အခက်အခဲရှိနေပါသည်။' : 'Connection error while verifying status.'
      });
    } finally {
      setIsCheckingRestore(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto my-auto relative"
      >
        {/* Top Header Floating Dollar Badge */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center mx-auto mb-3 shadow-xl shadow-blue-500/30 border-2 border-white/20 ring-4 ring-blue-500/10">
            <DollarSign className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
            {lang === 'my' ? 'App အသုံးပြုရန် ငွေပေးချေပါ' : 'Pay to Access the App'}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-medium mt-1">
            {lang === 'my' ? 'စစ်ဆေးရန် ပေးပို့ပြီးပါက Admin မှ အတည်ပြုပေးပါမည်' : 'Admin will review and approve once payment details are submitted'}
          </p>
        </div>

        {/* Main Card */}
        <div className={`rounded-3xl border ${theme === 'dark' ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} shadow-2xl overflow-hidden`}>
          
          {/* Top Preview Mode Banner for Admin */}
          {isPreview && (
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-2.5 text-slate-950 flex flex-wrap items-center justify-between text-xs font-bold gap-2 shadow-inner">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-950 animate-pulse" />
                <span>
                  {lang === 'my' 
                    ? 'Customer ဖက်မှ မြင်တွေ့ရမည့် ငွေလွှဲဒီဇိုင်း ပုံစံ (Admin Live Preview)' 
                    : 'Customer View Payment Transfer UI (Admin Live Preview)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider">
                  {lang === 'my' ? 'စမ်းသပ်မှု ပုံစံ' : 'Preview Mode'}
                </span>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'ပိတ်မည် (Close)' : 'Close'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Top Info Ribbon */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-2.5 text-white flex items-center justify-between text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{cfg.planName || 'Lifetime Pro Access'} &middot; {cfg.amount.toLocaleString()} {cfg.currency}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {onClose && (
                <button 
                  onClick={onClose} 
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Conditional Rendering based on Payment Status */}
          {currentStatus === 'pending' ? (
            /* PENDING REVIEW STATE */
            <div className="p-6 sm:p-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto animate-pulse">
                <Clock className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {lang === 'my' ? 'ငွေလွှဲပြေစာကို Admin မှ စစ်ဆေးနေပါသည်' : 'Payment Submitted & Under Review'}
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lang === 'my' 
                    ? 'ကျေးဇူးတင်ပါသည်။ သင်ပေးပို့ထားသော ငွေလွှဲစလစ်အား Admin မှ စိစစ်အတည်ပြုပြီးပါက Cloud အင်ဂျင်နီယာဖိုင်များနှင့် Pro Features များအားလုံး အလိုအလျောက် ဖွင့်ပေးမည်ဖြစ်ပါသည်။' 
                    : 'Thank you! Your transaction ID is currently being verified by the admin. Cloud engineering resources will unlock once approved.'}
                </p>
              </div>

              {/* Submitted Details Box */}
              <div className={`max-w-md mx-auto p-5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} text-left space-y-3 text-sm`}>
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-800">
                  <span className="text-slate-500">{lang === 'my' ? 'လုပ်ငန်းစဉ်အမှတ် (နောက်ဆုံး ၆ လုံး)' : 'Transaction Digits'}</span>
                  <span className="font-mono font-bold text-base tracking-widest text-blue-500">
                    {currentRecord?.transactionDigits}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{lang === 'my' ? 'ရွေးချယ်ထားသော သက်တမ်း' : 'Selected Plan'}</span>
                  <span className="font-semibold text-amber-500 dark:text-amber-400">
                    {formatDurationLabel(currentRecord?.planDuration as SubscriptionDuration, lang)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{lang === 'my' ? 'ငွေလွှဲစနစ်' : 'Payment Method'}</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {currentRecord?.accountPayName || currentRecord?.method?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{lang === 'my' ? 'ပမာဏ' : 'Amount'}</span>
                  <span className="font-bold text-emerald-500">{currentRecord?.amount.toLocaleString()} {currentRecord?.currency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{lang === 'my' ? 'လက်ခံသူ' : 'Recipient'}</span>
                  <span className="font-semibold truncate max-w-[200px]">{currentRecord?.merchantName} ({maskPhoneNumber(currentRecord?.merchantPhone)})</span>
                </div>
                {currentRecord?.submittedAt && (
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{lang === 'my' ? 'တင်သွင်းချိန်' : 'Submitted At'}</span>
                    <span>{new Date(currentRecord.submittedAt).toLocaleString()}</span>
                  </div>
                )}
                {currentRecord?.slipImage && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 block mb-1.5">{lang === 'my' ? 'ပူးတွဲပေးပို့ထားသော ပြေစာပုံ' : 'Attached Slip Preview'}</span>
                    <img src={currentRecord.slipImage} alt="Payment slip" className="max-h-36 rounded-lg border border-slate-300 dark:border-slate-700 object-contain mx-auto" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onResetPayment && (
                  <button
                    onClick={onResetPayment}
                    className={`px-4 py-3 rounded-xl border ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'} font-semibold transition-all cursor-pointer flex items-center gap-2`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{lang === 'my' ? 'ပြန်လည်ဖြည့်သွင်းမည်' : 'Re-enter Transaction'}</span>
                  </button>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all cursor-pointer"
                  >
                    {lang === 'my' ? 'ပိတ်မည် (Close)' : 'Close'}
                  </button>
                )}
              </div>
            </div>
          ) : isActivePro && !isRenewing ? (
            /* ACTIVE PRO APPROVED STATE */
            <div className="p-6 sm:p-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{formatDurationLabel(currentRecord?.planDuration as SubscriptionDuration, lang)} &middot; Active</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {lang === 'my' ? 'PRO အသုံးပြုခွင့် သက်တမ်း အပြည့်ရှိပါသည်' : 'PRO Subscription Active!'}
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lang === 'my' 
                    ? 'Solar String Sizer Pro စနစ်၊ Solar Mounting Calculator (Roof Mount & Ground Mount 3D) နှင့် Cloud အင်ဂျင်နီယာဖိုင်များ အားလုံးကို အပြည့်အဝ အသုံးပြုနိုင်ပါသည်။' 
                    : 'Your account is fully activated. You have unlimited access to String Sizer, Roof Mount, Ground Mount 3D simulation, and Cloud engineering resources.'}
                </p>
              </div>

              {/* Expiration Details Card with Live Countdown Clock */}
              {remainingInfo && (
                <div className={`max-w-md mx-auto p-5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-950/80 border-blue-500/30' : 'bg-blue-50/50 border-blue-200'} space-y-3.5 text-xs sm:text-sm shadow-inner`}>
                  {/* Expiration Date & Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-left">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>{lang === 'my' ? 'သက်တမ်းကုန်ဆုံးမည့်ရက်နှင့် အချိန်' : 'Valid Date & Time'}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-amber-300 text-sm">
                      {remainingInfo.validUntilDateTime}
                    </span>
                  </div>

                  {/* 4-Box Live Ticking Clock */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{lang === 'my' ? 'တိုက်ရိုက် လက်ကျန်အချိန် (Live Countdown)' : 'Live Time Remaining'}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        DECREASING
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                      <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'} shadow-sm`}>
                        <div className="text-base sm:text-lg font-black text-amber-400 tabular-nums">
                          {remainingInfo.countdownParts.days}
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans">
                          {lang === 'my' ? 'ရက်' : 'Days'}
                        </div>
                      </div>

                      <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'} shadow-sm`}>
                        <div className="text-base sm:text-lg font-black text-slate-800 dark:text-white tabular-nums">
                          {remainingInfo.countdownParts.hours}
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans">
                          {lang === 'my' ? 'နာရီ' : 'Hours'}
                        </div>
                      </div>

                      <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'} shadow-sm`}>
                        <div className="text-base sm:text-lg font-black text-slate-800 dark:text-white tabular-nums">
                          {remainingInfo.countdownParts.minutes}
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans">
                          {lang === 'my' ? 'မိနစ်' : 'Mins'}
                        </div>
                      </div>

                      <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-blue-950/60 border border-blue-500/40' : 'bg-blue-100 border border-blue-300'} shadow-sm`}>
                        <div className="text-base sm:text-lg font-black text-emerald-500 tabular-nums animate-pulse">
                          {remainingInfo.countdownParts.seconds}
                        </div>
                        <div className="text-[9px] text-emerald-500 font-sans font-bold">
                          {lang === 'my' ? 'စက္ကန့်' : 'Secs'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {currentRecord?.approvedAt && (
                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-400">
                      <span>{lang === 'my' ? 'စတင်ခွင့်ပြုချိန်' : 'Activated On'}</span>
                      <span className="font-mono">{new Date(currentRecord.approvedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenewing(true)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm shadow-lg shadow-blue-600/30"
                  id="pro-modal-renew-btn"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>{lang === 'my' ? 'ထပ်ဝယ်မည် / သက်တမ်းတိုးမည်' : 'Renew / Extend Subscription'}</span>
                </button>

                {onOpenResources && (
                  <button
                    onClick={() => {
                      if (onClose) onClose();
                      onOpenResources();
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-2 transition-all cursor-pointer text-xs sm:text-sm border border-slate-700"
                  >
                    <FolderDown className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'my' ? 'Vault ဖိုင်များ' : 'Engineering Vault'}</span>
                  </button>
                )}

                {onOpenReceipt && (
                  <button
                    onClick={onOpenReceipt}
                    className={`px-4 py-3 rounded-xl border ${theme === 'dark' ? 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'} font-semibold transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm`}
                  >
                    <span>{lang === 'my' ? 'ပြေစာ ကြည့်မည်' : 'View Receipt'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* UNPAID / EXPIRED / RENEWING FORM STATE */
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Active Renewal Banner when isRenewing */}
              {isActivePro && isRenewing && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/40 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h4 className="font-bold text-amber-300">
                        {lang === 'my' ? 'PRO သက်တမ်း ထပ်မံတိုးမြှင့်ခြင်း / ထပ်ဝယ်ခြင်း' : 'Renew & Extend PRO Access'}
                      </h4>
                    </div>
                    <p className="text-slate-300 text-xs">
                      {lang === 'my' 
                        ? `လက်ရှိ သက်တမ်းကုန်ဆုံးမည့်အချိန်: ${formatSubscriptionExpiryDateTime(currentRecord?.expiresAt, lang)}`
                        : `Current expiry date: ${formatSubscriptionExpiryDateTime(currentRecord?.expiresAt, lang)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRenewing(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer self-start sm:self-center transition-colors shrink-0"
                  >
                    {lang === 'my' ? '← လက်ရှိအခြေအနေသို့' : '← Back'}
                  </button>
                </div>
              )}

              {/* Expired Notification Banner */}
              {isExpired && !isRenewing && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-3 text-xs sm:text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-300">
                      {lang === 'my' ? 'သင့် PRO အသုံးပြုခွင့် သက်တမ်း ကုန်ဆုံးသွားပါပြီ' : 'Your PRO Subscription has expired'}
                    </h4>
                    <p className="text-slate-300 text-xs">
                      {lang === 'my' 
                        ? '၁ လ/၃ လ စသည့် သက်တမ်းကုန်ဆုံးသွားသောကြောင့် Free User သို့ အလိုအလျောက် ပြောင်းလဲထားပါသည်။ Cloud အင်ဂျင်နီယာဖိုင်များနှင့် PRO Features များကို ဆက်လက်အသုံးပြုရန် အောက်ပါ Package များမှ ရွေးချယ်ပြီး သက်တမ်းတိုးနိုင်ပါသည်။'
                        : 'Your subscription period has ended and reverted to Free User tier. Select a package below to renew your PRO access.'}
                    </p>
                  </div>
                </div>
              )}

              {/* 1. DURATION PACKAGE SELECTOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'my' ? '၁။ အသုံးပြုလိုသော သက်တမ်း Package ရွေးချယ်ပါ' : '1. Choose Subscription Duration Plan'}</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {lang === 'my' ? 'သက်တမ်းကုန်ပါက Free သို့ ပြောင်းပါမည်' : 'Auto-reverts to Free once expired'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {durationPackages.map((pkg) => {
                    const isSelected = selectedDuration === pkg.id;
                    const projectedExpiry = calculateExtendedExpirationDate(currentRecord?.expiresAt, pkg.id);
                    const projectedFormatted = formatSubscriptionExpiryDateTime(projectedExpiry, lang);

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedDuration(pkg.id)}
                        className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/30 text-white'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {/* Top Badge (Tag / Discount) */}
                        <div className="flex items-center justify-between gap-1 mb-2 min-h-[22px]">
                          {(lang === 'my' ? pkg.tagMy : pkg.tagEn) ? (
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isSelected 
                                ? 'bg-blue-600 text-white' 
                                : pkg.popular 
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {lang === 'my' ? pkg.tagMy : pkg.tagEn}
                            </span>
                          ) : (
                            <span />
                          )}
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-400 dark:border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Title & Duration */}
                        <div className="space-y-1">
                          <h4 className={`text-sm sm:text-base font-black ${isSelected ? 'text-blue-500 dark:text-blue-400' : ''}`}>
                            {lang === 'my' ? pkg.labelMy : lang === 'zh' ? pkg.labelZh : pkg.labelEn}
                          </h4>
                          <div className="text-base sm:text-lg font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                            {pkg.price.toLocaleString()} <span className="text-xs font-bold">{cfg.currency}</span>
                          </div>

                          {/* Projected Expiry hint */}
                          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-400">
                            <span className="block truncate" title={projectedFormatted}>
                              {lang === 'my' ? `သက်တမ်း: ${projectedFormatted.split('(')[0]} ထိ` : `Valid to: ${new Date(projectedExpiry).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* All-in-One Package Included Features Banner */}
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-blue-400 block">
                        {lang === 'my' ? 'All-in-One Solar Engineering PRO Suite ပါဝင်မှုများ' : 'All-in-One Solar Engineering PRO Suite Included'}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {lang === 'my' 
                          ? '⚡ Solar String Sizer + 🏠 Roof Mount + 🏗️ Ground Mount 3D + 🛡️ DC Breaker Calculator + 📁 Engineering Vault' 
                          : '⚡ Solar String Sizer + 🏠 Roof Mount + 🏗️ Ground Mount 3D + 🛡️ DC Breaker Calculator + 📁 Engineering Vault'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] shrink-0 border border-emerald-500/30">
                    ALL UNLOCKED
                  </span>
                </div>
              </div>

              {/* 2. PAYMENT DETAILS & SUBMISSION FORM */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2 border-t border-slate-200 dark:border-slate-800">
                
                {/* LEFT COLUMN: QR CODE & PAYMENT GATEWAY */}
                <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-4">
                  
                  {/* Dynamic Payment Accounts Tabs */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 w-full">
                    {accountsList.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer truncate max-w-[150px] ${
                          selectedAccountId === acc.id 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                        }`}
                        title={acc.payName}
                      >
                        {acc.payName}
                      </button>
                    ))}
                  </div>

                  {/* QR Code Container */}
                  <div className="relative p-4 rounded-3xl bg-blue-50/60 dark:bg-slate-950/80 border border-blue-100 dark:border-slate-800 flex flex-col items-center justify-center w-full max-w-[240px] shadow-inner">
                    
                    {activeQrImage ? (
                      /* Admin Uploaded Real QR Code Image */
                      <div className="relative w-48 h-48 rounded-2xl bg-white p-2 shadow-md flex flex-col items-center justify-center group overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img 
                          src={activeQrImage} 
                          alt={`${activeAccount?.payName} QR Code`} 
                          className="w-full h-full object-contain rounded-xl"
                        />
                        
                        {/* Hover action overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowQrZoom(true)}
                            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="Zoom QR"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span>Zoom</span>
                          </button>
                          <a
                            href={activeQrImage}
                            download={`${activeAccount?.payName.toLowerCase().replace(/\s+/g, '-')}-qr.png`}
                            className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-lg cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="Download QR"
                          >
                            <Download className="w-4 h-4" />
                            <span>Save</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* Styled QR Placeholder */
                      <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 flex flex-col items-center justify-center bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group">
                        
                        {/* 3x3 QR visual pattern */}
                        <div className="grid grid-cols-3 gap-2 w-24 h-24 mb-2 p-2">
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                          <div className="bg-slate-300 dark:bg-slate-700 rounded-md" />
                        </div>

                        <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 dark:text-slate-400 uppercase truncate max-w-[140px]">
                          {activeAccount?.payName}
                        </span>
                      </div>
                    )}

                    {activeQrImage && (
                      <button
                        type="button"
                        onClick={() => setShowQrZoom(true)}
                        className="mt-2 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>{lang === 'my' ? 'QR Code အကြီးကြည့်ရန်' : 'Click to view full QR'}</span>
                      </button>
                    )}
                  </div>

                  {/* Sub text & Dynamic Amount */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase block">
                      SCAN TO PAY
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">
                      {activeAccount?.payName}
                    </h4>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
                      <span>{lang === 'my' ? 'ကျသင့်ငွေ' : 'Payable'}:</span>
                      <span className="font-mono text-sm font-extrabold">{payableAmount.toLocaleString()} {cfg.currency}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: RECIPIENT DETAILS & SUBMIT FORM */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* Recipient Details Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="text-[11px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
                        {lang === 'my' ? 'ငွေလက်ခံသူ အချက်အလက်များ' : 'RECIPIENT DETAILS'}
                      </span>
                      <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400">
                        {activeAccount?.payName}
                      </span>
                    </div>
                    
                    {/* Recipient Account Name */}
                    <div className="flex justify-between items-center text-xs sm:text-sm py-0.5">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <span>{lang === 'my' ? 'လက်ခံသူ အမည်' : 'Recipient Name'}</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[200px]" title={activeRecipientName}>
                        {activeRecipientName}
                      </span>
                    </div>

                    {/* Recipient Phone / Account Number */}
                    <div className="flex justify-between items-center text-xs sm:text-sm py-0.5">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{lang === 'my' ? 'လက်ခံမည့် ဖုန်း/အကောင့်' : 'Phone / Account'}</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm tracking-widest">
                        {maskPhoneNumber(activeNumber)}
                      </span>
                    </div>
                  </div>

                  {/* 6-Digit Transaction Code Form */}
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    
                    {/* Payer Information (Sender Name & Phone) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'my' ? 'ငွေလွှဲသူအမည် (ရွေးချယ်နိုင်သည်)' : 'Your Name (Optional)'}
                        </label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder={lang === 'my' ? 'ဥပမာ - ဦးကျော်' : 'e.g. U Kyaw'}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'my' ? 'ငွေလွှဲသူဖုန်း (ရွေးချယ်နိုင်သည်)' : 'Your Phone (Optional)'}
                        </label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="09..."
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {lang === 'my' ? '၂။ လုပ်ငန်းစဉ်အမှတ် နောက်ဆုံး ၆ လုံး ထည့်ပါ *' : '2. Last 6 digits of Transaction ID *'}
                      </label>

                      {/* 6 Individual Digit Inputs */}
                      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                        {digits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (inputRefs.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            onPaste={handlePaste}
                            placeholder="-"
                            className={`w-9 h-11 sm:w-11 sm:h-12 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border-2 transition-all outline-none ${
                              digit 
                                ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' 
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            }`}
                            required
                          />
                        ))}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {lang === 'my' ? 'ငွေလွှဲပြီးရရှိသော Transaction ID နောက်ဆုံး ၆ လုံး ရိုက်ထည့်ပါ' : 'Enter the last 6 digits from your payment receipt'}
                      </p>
                    </div>

                    {/* Optional Slip Upload / Attach */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {lang === 'my' ? 'ငွေလွှဲပြေစာ ပုံတွဲတင်ရန် (ရွေးချယ်နိုင်သည်)' : 'Attach Slip Screenshot (Optional)'}
                        </span>
                        {slipImage && (
                          <button
                            type="button"
                            onClick={() => setSlipImage(null)}
                            className="text-rose-500 hover:underline text-[11px] cursor-pointer"
                          >
                            {lang === 'my' ? 'ပုံဖျက်မည်' : 'Remove image'}
                          </button>
                        )}
                      </div>

                      {!slipImage ? (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-2.5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30 group"
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            onChange={handleFileUpload} 
                            className="hidden" 
                          />
                          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 group-hover:text-blue-500">
                            <Upload className="w-4 h-4" />
                            <span>{lang === 'my' ? 'ငွေလွှဲစလစ် ပုံရွေးရန် ဤနေရာကို နှိပ်ပါ' : 'Click to select slip screenshot'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-3 bg-slate-50 dark:bg-slate-900">
                          <img src={slipImage} alt="Slip" className="w-10 h-10 object-cover rounded-lg border border-slate-300 dark:border-slate-600" />
                          <div className="text-xs">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {lang === 'my' ? 'ပြေစာပုံ တွဲတင်ပြီးပါပြီ' : 'Slip photo attached'}
                            </span>
                            <span className="text-slate-400 text-[10px]">Ready to submit with transaction</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Confirm & Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-75"
                      id="payment-submit-btn"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>
                            {lang === 'my' 
                              ? `${formatDurationLabel(activePackage.id, 'my')} (${payableAmount.toLocaleString()} MMK) အတည်ပြုလွှာ ပေးပို့မည်` 
                              : `Submit ${formatDurationLabel(activePackage.id, 'en')} (${payableAmount.toLocaleString()} MMK)`}
                          </span>
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </>
                      )}
                    </button>

                    {/* Footer Security Badge */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                      <Lock className="w-3 h-3" />
                      <span>{lang === 'my' ? 'Admin မှ စစ်ဆေးပြီးပါက PRO အလိုအလျောက် ပွင့်ပါမည်' : 'Auto-unlocks once confirmed by Admin'}</span>
                    </div>
                  </form>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* Restore Access Dialog Modal */}
        {showRestoreModal && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`p-6 sm:p-8 rounded-3xl border max-w-md w-full relative space-y-4 shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800/20 dark:hover:bg-slate-700/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    {lang === 'my' ? 'အတည်ပြုထားသော အကောင့်စစ်ဆေးရန်' : 'Restore Approved Access'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'my' ? 'ဖုန်း သို့မဟုတ် တာဘလက် အခြား Device များတွင် ပြန်လည်အသုံးပြုရန်' : 'Activate your account across devices'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyAndRestore} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'my' ? 'ငွေလွှဲခဲ့သော ဖုန်းနံပါတ် သို့မဟုတ် လုပ်ငန်းစဉ် နောက်ဆုံး ၆ လုံး' : 'Registered Phone or Last 6 Digits'}
                  </label>
                  <input
                    type="text"
                    value={restoreQuery}
                    onChange={(e) => setRestoreQuery(e.target.value)}
                    placeholder="e.g. 09798123456 or 123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                {restoreFeedback.message && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    restoreFeedback.status === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}>
                    {restoreFeedback.status === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{restoreFeedback.message}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRestoreModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isCheckingRestore}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCheckingRestore ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{lang === 'my' ? 'စစ်ဆေးမည်' : 'Check Status'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Fullscreen QR Zoom Modal */}
        {showQrZoom && activeQrImage && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full relative text-center space-y-4">
              <button
                onClick={() => setShowQrZoom(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-bold text-white text-base">
                {activeAccount?.payName} QR Code
              </h3>

              <div className="bg-white p-4 rounded-2xl mx-auto shadow-2xl inline-block">
                <img src={activeQrImage} alt="Full QR" className="w-64 h-64 object-contain" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-400">{activeRecipientName}</p>
                <p className="text-xs font-mono text-slate-400 font-bold tracking-widest">{maskPhoneNumber(activeNumber)}</p>
                <p className="text-xs text-slate-300 font-semibold">{cfg.amount.toLocaleString()} {cfg.currency}</p>
              </div>

              <button
                onClick={() => setShowQrZoom(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Close Fullscreen
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};
