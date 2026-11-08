import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  ShieldCheck, 
  Check, 
  Phone, 
  Send, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Laptop, 
  AlertCircle, 
  Copy, 
  Layers, 
  LayoutGrid, 
  Box, 
  Zap, 
  FileText,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { AdminContactConfig, LicenseToken, SupportedLanguage } from '../types';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
  theme: 'light' | 'dark';
  adminContact: AdminContactConfig;
  activeLicense: LicenseToken | null;
  onActivateLicense: (token: string) => Promise<{ success: boolean; message?: string }>;
  onDeactivateLicense?: () => void;
  onOpenAdmin?: () => void;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  adminContact,
  activeLicense,
  onActivateLicense,
  onDeactivateLicense,
  onOpenAdmin
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (e) {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          // If copied whole link e.g. https://...?license=PRO-..., extract token
          if (text.includes('license=')) {
            const match = text.match(/license=([A-Za-z0-9_-]+)/);
            if (match && match[1]) {
              setTokenInput(match[1]);
              return;
            }
          }
          setTokenInput(text.trim());
        }
      }
    } catch (e) {}
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let token = tokenInput.trim();
    if (!token) return;

    if (token.includes('license=')) {
      const match = token.match(/license=([A-Za-z0-9_-]+)/);
      if (match && match[1]) token = match[1];
    }

    setIsActivating(true);
    setFeedback(null);

    try {
      const res = await onActivateLicense(token);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: lang === 'my' 
            ? '🎉 PRO License အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ! ကိရိယာအားလုံး အပြည့်အဝ အသုံးပြုနိုင်ပါပြီ။' 
            : '🎉 PRO License activated! All engineering suites unlocked.'
        });
        setTokenInput('');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setFeedback({
          type: 'error',
          message: res.message || (lang === 'my' ? 'လိုင်စင်ကုဒ် မှားယွင်းနေပါသည်' : 'Invalid License Key')
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Activation error'
      });
    } finally {
      setIsActivating(false);
    }
  };

  const viberCleanNumber = (adminContact.viberPhone || '').replace(/\D/g, '');
  const viberLink = adminContact.viberUrl || (viberCleanNumber ? `viber://chat?number=${viberCleanNumber}` : '#');
  const tgUser = (adminContact.telegramUsername || '').replace(/^@/, '');
  const telegramLink = adminContact.telegramUrl || (tgUser ? `https://t.me/${tgUser}` : '#');

  let remainingDays = 0;
  let remainingHours = 0;
  if (activeLicense) {
    const diff = new Date(activeLicense.expiresAt).getTime() - Date.now();
    if (diff > 0) {
      remainingDays = Math.floor(diff / 86400000);
      remainingHours = Math.floor((diff % 86400000) / 3600000);
    }
  }

  const featuresList = [
    { icon: Layers, label: 'Solar String Sizer Pro (Full Database & MPPT Wiring)' },
    { icon: LayoutGrid, label: 'Solar Mounting Calculator (Tin, Tile, Slab Roof & Full MMK BOQ)' },
    { icon: Box, label: 'Solar Ground Mount Calculator (Multi-Row Frame & Structure)' },
    { icon: Zap, label: 'Solar DC Breaker Calculator (gPV Fuse, MCB, Isolator, SPD)' },
    { icon: FileText, label: 'Engineering Vault (Datasheets, Guides, CSVs & Diagrams)' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden my-auto ${
          theme === 'dark' 
            ? 'bg-slate-900 border-slate-800 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {activeLicense ? (lang === 'my' ? 'PRO License အချက်အလက်' : 'PRO License Details') : (lang === 'my' ? 'PRO License ဝယ်ယူခြင်းနှင့် ဖွင့်ခြင်း' : 'PRO License Purchase & Activation')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeLicense ? 'Active Engineering Suite License' : 'Viber / Telegram Direct Activation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {activeLicense ? (
            /* Active License Overview State */
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    <div>
                      <span className="text-xs uppercase font-bold text-emerald-500 block">License Status</span>
                      <span className="font-extrabold text-base text-white">PRO LICENSE ACTIVE</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                    {activeLicense.duration?.toUpperCase().replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-emerald-500/20">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Customer / Account:</span>
                    <span className="font-bold text-white">{activeLicense.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Device Limit:</span>
                    <span className="font-bold text-white font-mono">
                      {activeLicense.boundDevices?.length || 1} / {activeLicense.deviceLimit} Devices Used
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Expires At:</span>
                    <span className="font-bold text-white font-mono">
                      {new Date(activeLicense.expiresAt).toLocaleDateString()} ({remainingDays} Days Remaining)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">License Token:</span>
                    <span className="font-bold text-white font-mono text-[10px] truncate block">
                      {activeLicense.token}
                    </span>
                  </div>
                </div>
              </div>

              {/* Unlocked Features */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === 'my' ? 'အသုံးပြုနိုင်သော Features များ:' : 'Unlocked Engineering Tools:'}
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {featuresList.map((f, idx) => {
                    const Icon = f.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{f.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bound Devices List */}
              {activeLicense.boundDevices && activeLicense.boundDevices.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="text-slate-400 uppercase font-bold text-[11px] block">
                    {lang === 'my' ? 'ချိတ်ဆက်ထားသော စက်များ:' : 'Bound Devices:'}
                  </span>
                  <div className="space-y-1.5">
                    {activeLicense.boundDevices.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-blue-400" />
                          <span className="font-bold">{d.deviceModel}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Seen: {new Date(d.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deactivate / Switch Device button */}
              {onDeactivateLicense && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={onDeactivateLicense}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'ဤစက်မှ လိုင်စင် ဖြုတ်မည် (Deactivate Device)' : 'Deactivate from this Device'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Purchase & Activation Flow */
            <div className="space-y-6">
              {/* How to buy 안내 */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  ၁။ Viber သို့မဟုတ် Telegram တွင် တိုက်ရိုက် ဆက်သွယ်ဝယ်ယူရန်
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Viber Direct */}
                  <a
                    href={viberLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-[#7360f2] to-[#5947e0] text-white flex items-center justify-between shadow-lg shadow-purple-600/20 hover:opacity-95 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-200 block">Viber Contact</span>
                        <span className="font-mono font-bold text-sm tracking-wide">{adminContact.viberPhone}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-purple-200 group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  {/* Telegram Direct */}
                  <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-[#229ed9] to-[#1a84b8] text-white flex items-center justify-between shadow-lg shadow-cyan-600/20 hover:opacity-95 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-cyan-200 block">Telegram Contact</span>
                        <span className="font-mono font-bold text-sm tracking-wide">@{tgUser}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-cyan-200 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <p>
                    {lang === 'my' 
                      ? '💡 Viber သို့မဟုတ် Telegram တွင် ဆက်သွယ်၍ ၁ ပတ်၊ ၁ လ၊ ၃ လ၊ ၁ နှစ် အတွက် One Device သို့မဟုတ် Two Devices ရွေးချယ်ဝယ်ယူနိုင်ပါသည်။ Admin မှ တိုက်ရိုက် Link နှင့် လိုင်စင်ကုဒ် ပေးပို့ပေးပါမည်။' 
                      : '💡 Contact admin on Viber/Telegram to choose 1 Week, 1 Month, 3 Months duration for 1 Device or 2 Devices.'}
                  </p>
                </div>
              </div>

              {/* License Key / Link Input Form */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    ၂။ Admin ထံမှ ရရှိထားသော လိုင်စင်ကုဒ် (သို့မဟုတ် Link) ထည့်သွင်းပါ
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    VPN မလိုပါ (No VPN Needed)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                  {lang === 'my'
                    ? '💡 VPN မရှိပါက Admin ထံမှ ရရှိသော "SOLAR-PRO-..." Key အား ဤနေရာတွင် ထည့်သွင်းရုံဖြင့် အားလုံး ချက်ချင်း ပွင့်သွားပါမည်။'
                    : '💡 If you do not have VPN, simply paste the "SOLAR-PRO-..." Key here to activate instantly without VPN!'}
                </div>

                <form onSubmit={handleActivateSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="e.g. SOLAR-PRO-1M-1D-XXXX-YYYY သို့မဟုတ် Link ထည့်ပါ"
                      className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm font-mono font-bold uppercase transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                      } focus:outline-none shadow-inner`}
                    />

                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Paste
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isActivating || !tokenInput.trim()}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <KeyRound className="w-4 h-4 stroke-[2.5]" />
                    <span>{isActivating ? (lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Activating...') : (lang === 'my' ? 'လိုင်စင်ဖွင့်မည် (Activate Now)' : 'Activate PRO Access')}</span>
                  </button>
                </form>

                {feedback && (
                  <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}>
                    {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{feedback.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Solar Pro Engineering Suite</span>
          {onOpenAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="text-blue-500 hover:underline cursor-pointer font-semibold"
            >
              Admin Mode
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
