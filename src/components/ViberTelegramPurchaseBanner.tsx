import React, { useState } from 'react';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Unlock, 
  Phone, 
  ExternalLink,
  Laptop,
  Clock,
  AlertCircle,
  HelpCircle,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminContactConfig, LicenseToken, SupportedLanguage } from '../types';

interface ViberTelegramPurchaseBannerProps {
  adminContact: AdminContactConfig;
  activeLicense: LicenseToken | null;
  lang: SupportedLanguage;
  theme: 'light' | 'dark';
  onActivateToken: (token: string) => Promise<{ success: boolean; message?: string }>;
  onOpenAdminModal?: () => void;
  onOpenActivationModal?: () => void;
}

export const ViberTelegramPurchaseBanner: React.FC<ViberTelegramPurchaseBannerProps> = ({
  adminContact,
  activeLicense,
  lang,
  theme,
  onActivateToken,
  onOpenAdminModal,
  onOpenActivationModal
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_contact_banner_expanded');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const [inputToken, setInputToken] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    try {
      localStorage.setItem('solar_sizer_contact_banner_expanded', String(next));
    } catch (e) {}
  };

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (e) {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = inputToken.trim();
    if (!token) return;

    setIsActivating(true);
    setActionFeedback(null);
    try {
      const res = await onActivateToken(token);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          text: lang === 'my' ? '🎉 PRO License အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ!' : '🎉 PRO License activated successfully!'
        });
        setInputToken('');
      } else {
        setActionFeedback({
          type: 'error',
          text: res.message || (lang === 'my' ? 'လိုင်စင်ကုဒ် မှားယွင်းနေပါသည်' : 'Invalid License Key')
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err?.message || 'Activation failed'
      });
    } finally {
      setIsActivating(false);
      setTimeout(() => setActionFeedback(null), 6000);
    }
  };

  // Formatted Viber & Telegram links
  const viberCleanNumber = (adminContact.viberPhone || '').replace(/\D/g, '');
  const viberLink = adminContact.viberUrl || (viberCleanNumber ? `viber://chat?number=${viberCleanNumber}` : '#');
  const tgUser = (adminContact.telegramUsername || '').replace(/^@/, '');
  const telegramLink = adminContact.telegramUrl || (tgUser ? `https://t.me/${tgUser}` : '#');

  // Days remaining calculation
  let remainingDays = 0;
  let remainingHours = 0;
  if (activeLicense) {
    const diff = new Date(activeLicense.expiresAt).getTime() - Date.now();
    if (diff > 0) {
      remainingDays = Math.floor(diff / 86400000);
      remainingHours = Math.floor((diff % 86400000) / 3600000);
    }
  }

  const isLicenseActive = Boolean(
    activeLicense && 
    activeLicense.status === 'active' && 
    new Date(activeLicense.expiresAt).getTime() > Date.now()
  );
  const isLicenseExpired = Boolean(
    activeLicense && 
    (activeLicense.status === 'expired' || new Date(activeLicense.expiresAt).getTime() <= Date.now())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2" id="viber-telegram-purchase-section">
      <div className={`rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${
        isLicenseExpired
          ? (theme === 'dark' ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-[#180e14] border-rose-500/30' : 'bg-gradient-to-r from-rose-50 via-white to-amber-50/20 border-rose-200')
          : (theme === 'dark'
              ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-[#0e1628] border-slate-800'
              : 'bg-gradient-to-r from-white via-slate-50 to-amber-50/30 border-slate-200')
      }`}>
        {/* Banner Top Strip */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 ${
              isLicenseExpired
                ? 'bg-gradient-to-tr from-rose-600 to-amber-600 shadow-rose-500/20'
                : 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/20'
            }`}>
              {isLicenseExpired ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{lang === 'my' ? 'UNIQUE SOLAR PRO (Engineering Suite)' : 'UNIQUE SOLAR PRO (Engineering Suite)'}</span>
                </h3>
                {isLicenseActive ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>PRO ACTIVE: {remainingDays}d {remainingHours}h ({activeLicense?.boundDevices?.length || 1}/{activeLicense?.deviceLimit || 1} Device)</span>
                  </span>
                ) : isLicenseExpired ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? '⚠️ လိုင်စင် သက်တမ်းကုန်ဆုံးပါပြီ (EXPIRED)' : '⚠️ PRO LICENSE EXPIRED'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Lock className="w-3 h-3" />
                    <span>{lang === 'my' ? 'Viber / Telegram တွင် တိုက်ရိုက်ဝယ်ယူနိုင်ပါသည်' : 'Buy Directly on Viber or Telegram'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isLicenseActive 
                  ? (lang === 'my' 
                      ? `လိုင်စင်ဖွင့်ထားပြီးပါပြီ (${activeLicense?.customerName})။ Roof Mount BOQ, Ground Mount 3D, DC Breaker & Vault အားလုံး အသုံးပြုနိုင်ပါသည်။` 
                      : `PRO License is active for ${activeLicense?.customerName}. All engineering features are unlocked.`)
                  : isLicenseExpired
                  ? (lang === 'my'
                      ? 'သင့် PRO လိုင်စင် သက်တမ်းကုန်ဆုံးသွားပါပြီ။ ဆက်လက်အသုံးပြုလိုပါက Viber သို့မဟုတ် Telegram တွင် License Key အသစ် ထပ်မံဝယ်ယူ အသက်သွင်းပေးပါခင်ဗျာ။'
                      : 'Your PRO license has expired. Please buy a new license key via Viber or Telegram to renew.')
                  : (adminContact.noteMy || 'Viber သို့မဟုတ် Telegram တွင် ဆက်သွယ်၍ 1 Week, 1 Month, 3 Months PRO License Link ရယူနိုင်ပါသည်')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {/* Enter License Key Quick Button */}
            <button
              type="button"
              onClick={onOpenActivationModal}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{activeLicense ? (lang === 'my' ? 'လိုင်စင် အချက်အလက်' : 'License Info') : (lang === 'my' ? 'လိုင်စင်ကုဒ် ထည့်မည်' : 'Enter License Key')}</span>
            </button>

            {/* Collapse/Expand Toggle */}
            <button
              type="button"
              onClick={toggleExpanded}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title={isExpanded ? 'Hide' : 'Expand'}
            >
              {isExpanded ? (
                <>
                  <span className="hidden sm:inline text-[11px] font-semibold">{lang === 'my' ? 'ခေါက်သိမ်းမည်' : 'Hide'}</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline text-[11px] font-semibold">{lang === 'my' ? 'ဝယ်ယူရန် ဆက်သွယ်ရန်များ' : 'Buy Options'}</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-4 sm:p-5 space-y-4">
                {/* 2 Main Action Cards: VIBER & TELEGRAM */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Official Viber */}
                  <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950/70 border-purple-500/30 hover:border-purple-500/60'
                      : 'bg-white border-purple-200 hover:border-purple-300 shadow-sm'
                  } flex flex-col justify-between space-y-3.5 relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#7360f2] text-white flex items-center justify-center font-black shadow-md shadow-purple-600/30 shrink-0">
                          {/* Viber Icon SVG */}
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M19.5 3H4.5A2.5 2.5 0 0 0 2 5.5v11A2.5 2.5 0 0 0 4.5 19H8v3l4-3h7.5a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 19.5 3zm-2.8 11.2c-.3.4-.8.7-1.4.7-.4 0-.8-.1-1.3-.3-1.6-.7-2.9-1.7-4-3-1.3-1.2-2.3-2.5-3-4-.2-.5-.3-.9-.3-1.3 0-.6.3-1.1.7-1.4.3-.2.6-.3.9-.3h.1c.3 0 .6.2.7.5.3.7.6 1.4 1 2 .1.2.1.4 0 .6l-.5.6c-.1.1-.1.2 0 .3.4.8.9 1.5 1.5 2.1.6.6 1.3 1.1 2.1 1.5.1.1.2.1.3 0l.6-.5c.2-.1.4-.1.6 0 .6.4 1.3.7 2 1 .3.1.5.4.5.7v.1c0 .3-.1.6-.3.9z"/>
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                              Viber တွင် တိုက်ရိုက်ဝယ်ယူရန်
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">
                              RECOMMENDED
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {lang === 'my' ? 'တစ်ပတ်၊ ၁ လ၊ ၃ လ PRO License Link အား Viber တွင် ချက်ချင်းရယူပါ' : 'Instant 1 Week, 1 Month, 3 Months License link via Viber'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Viber Number Display & Copy */}
                    <div className="bg-slate-100 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-purple-500 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Viber Phone Number</span>
                          <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-wider">
                            {adminContact.viberPhone || '09 403 708 145'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(adminContact.viberPhone.replace(/\s+/g, ''), 'viber_phone')}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          copiedKey === 'viber_phone'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-purple-500'
                        }`}
                        title="Copy Viber Number"
                      >
                        {copiedKey === 'viber_phone' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Action Button: Open Viber */}
                    <a
                      href={viberLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#7360f2] hover:bg-[#6250e0] text-white text-xs font-black transition-all shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 active:scale-95 text-center"
                    >
                      <span>Viber ဖြင့် တိုက်ရိုက် မက်ဆေ့ခ်ျပို့ရန်</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Card 2: Official Telegram */}
                  <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950/70 border-cyan-500/30 hover:border-cyan-500/60'
                      : 'bg-white border-cyan-200 hover:border-cyan-300 shadow-sm'
                  } flex flex-col justify-between space-y-3.5 relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#229ed9] text-white flex items-center justify-center font-black shadow-md shadow-cyan-600/30 shrink-0">
                          {/* Telegram Icon SVG */}
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/>
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                              Telegram တွင် တိုက်ရိုက်ဝယ်ယူရန်
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                              24/7 ONLINE
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {lang === 'my' ? 'Telegram Chat တွင် Admin နှင့် တိုက်ရိုက် ဆက်သွယ်ဝယ်ယူရန်' : 'Contact admin on Telegram for instant activation link'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Telegram Username Display & Copy */}
                    <div className="bg-slate-100 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-cyan-500 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Telegram Username</span>
                          <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-wider">
                            @{tgUser || 'UniqueSolarPro'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(`@${tgUser}`, 'tg_user')}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          copiedKey === 'tg_user'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500'
                        }`}
                        title="Copy Telegram Username"
                      >
                        {copiedKey === 'tg_user' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Action Button: Open Telegram */}
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#229ed9] hover:bg-[#1b8bc2] text-white text-xs font-black transition-all shadow-md shadow-cyan-600/25 flex items-center justify-center gap-2 active:scale-95 text-center"
                    >
                      <span>Telegram ဖြင့် စာပို့ဝယ်ယူရန်</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Inline Quick License Activation Box */}
                <div className={`p-4 rounded-2xl border ${
                  theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
                }`}>
                  <form onSubmit={handleManualActivate} className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span>{lang === 'my' ? 'လိုင်စင်ကုဒ် ထည့်သွင်းမည်:' : 'Activate License Key:'}</span>
                    </div>

                    <div className="flex-1 w-full relative">
                      <input
                        type="text"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        placeholder="e.g. SOLAR-PRO-1M-1D-XXXX-YYYY"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase transition-all ${
                          theme === 'dark'
                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500'
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                        } focus:outline-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isActivating || !inputToken.trim()}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20 shrink-0"
                    >
                      {isActivating ? (lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Activating...') : (lang === 'my' ? 'လိုင်စင်ဖွင့်မည်' : 'Activate')}
                    </button>
                  </form>

                  {/* Activation Feedback Alert */}
                  {actionFeedback && (
                    <div className={`mt-3 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                      actionFeedback.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}>
                      {actionFeedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{actionFeedback.text}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Strip: Package Specs & Admin Edit Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      ⚡ Packages: 1 Week (တစ်ပတ်) • 1 Month (၁ လ) • 3 Months (၃ လ) • 1 Year (၁ နှစ်)
                    </span>
                    <span className="text-slate-400">
                      (ခွင့်ပြုချက်: 1 Device သို့မဟုတ် 2 Devices)
                    </span>
                  </div>

                  {onOpenAdminModal && (
                    <button
                      type="button"
                      onClick={onOpenAdminModal}
                      className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>{lang === 'my' ? 'Viber/Telegram နံပါတ် ပြင်ဆင်ရန် (Admin)' : 'Edit Contact Info (Admin)'}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
