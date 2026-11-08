import React, { useState } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  LayoutGrid, 
  Layers, 
  ArrowRight, 
  FileText, 
  Sun, 
  Zap, 
  Check, 
  AlertCircle,
  KeyRound,
  Calculator,
  Phone,
  Send,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';
import { AdminContactConfig, LicenseToken, SupportedLanguage } from '../types';

interface MountingCalculatorPaywallGateProps {
  activeTab: 'string_sizer' | 'mounting_calc' | 'dc_breaker_calc';
  lang: SupportedLanguage;
  theme: 'dark' | 'light';
  adminContact?: AdminContactConfig;
  activeLicense?: LicenseToken | null;
  onOpenActivation: () => void;
  onSwitchToStringSizer?: () => void;
  onActivateToken?: (token: string) => Promise<{ success: boolean; message?: string }>;
}

export const MountingCalculatorPaywallGate: React.FC<MountingCalculatorPaywallGateProps> = ({
  activeTab,
  lang,
  theme,
  adminContact,
  activeLicense,
  onOpenActivation,
  onSwitchToStringSizer,
  onActivateToken,
}) => {
  const isStringSizer = activeTab === 'string_sizer';
  const isRoofMount = activeTab === 'mounting_calc';
  const isDCBreaker = activeTab === 'dc_breaker_calc';

  const isExpired = Boolean(
    activeLicense && (
      activeLicense.status === 'expired' || 
      new Date(activeLicense.expiresAt).getTime() <= Date.now()
    )
  );

  const [inputToken, setInputToken] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const contact = adminContact || {
    viberPhone: '09 403 708 145',
    viberUrl: 'viber://chat?number=09403708145',
    telegramUsername: 'uniquesolarpro',
    telegramUrl: 'https://t.me/uniquesolarpro'
  };

  const viberCleanNumber = (contact.viberPhone || '09 403 708 145').replace(/\D/g, '');
  const viberLink = contact.viberUrl || (viberCleanNumber ? `viber://chat?number=${viberCleanNumber}` : 'viber://chat?number=09403708145');
  const tgUser = (contact.telegramUsername || 'uniquesolarpro').replace(/^@/, '');
  const telegramLink = contact.telegramUrl || `https://t.me/${tgUser || 'uniquesolarpro'}`;

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (e) {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInlineActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = inputToken.trim();
    if (!token || !onActivateToken) return;

    setIsActivating(true);
    setFeedback(null);
    try {
      const res = await onActivateToken(token);
      if (res.success) {
        setFeedback({
          type: 'success',
          text: lang === 'my' ? '🎉 PRO License အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ!' : '🎉 PRO License activated successfully!'
        });
        setInputToken('');
      } else {
        setFeedback({
          type: 'error',
          text: res.message || (lang === 'my' ? 'လိုင်စင်ကုဒ် မှားယွင်းနေပါသည်' : 'Invalid License Key')
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Activation failed'
      });
    } finally {
      setIsActivating(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  const t = {
    badge: isExpired
      ? (lang === 'my' ? '⚠️ PRO LICENSE သက်တမ်းကုန်ဆုံးပါပြီ (EXPIRED)' : '⚠️ PRO LICENSE EXPIRED')
      : (lang === 'my' ? 'PRO PACKAGE သီးသန့်' : lang === 'zh' ? 'PRO 会员专享' : 'PRO PACKAGE REQUIRED'),
    
    title: isExpired
      ? (lang === 'my' 
          ? 'လိုင်စင်ကာလ ကုန်ဆုံးသွားပါပြီ - License Key အသစ် ထပ်မံဝယ်ယူပါ' 
          : 'License Expired - Please Purchase a New License Key')
      : isStringSizer
      ? (lang === 'my'
          ? 'Solar String Sizer & MPPT Calculator (PRO Suite)'
          : lang === 'zh'
          ? '光伏组串与MPPT匹配计算器 (PRO版)'
          : 'Solar String Sizer & MPPT Calculator (PRO Suite)')
      : isDCBreaker
      ? (lang === 'my'
          ? 'Solar DC Breaker & Protection Calculator (Fuse, MCB, Isolator, SPD)'
          : lang === 'zh'
          ? 'Solar DC Breaker & Protection Calculator (Fuse, MCB, Isolator, SPD)'
          : 'Solar DC Breaker & Protection Calculator (Fuse, MCB, Isolator, SPD)')
      : (lang === 'my' 
          ? 'Solar Mounting Calculator (ခေါင်မိုး/အမိုး တပ်ဆင်ရေး)' 
          : lang === 'zh' 
          ? 'Solar Mounting Calculator (屋顶支架与材料清单)' 
          : 'Solar Mounting Calculator (Roof Mount & BOQ)'),

    tagline: isExpired
      ? (lang === 'my'
          ? `သင့် PRO License သက်တမ်း ကုန်ဆုံးသွားပြီဖြစ်၍ Solar String Sizer, Solar Mounting Calculator နှင့် DC Breaker Calculator စနစ်များကို ဆက်လက်အသုံးပြုနိုင်ရန် License Key အသစ်အား Viber (${contact.viberPhone}) သို့မဟုတ် Telegram (@${tgUser}) တွင် ဆက်သွယ်ဝယ်ယူ အသက်သွင်းပေးပါခင်ဗျာ။`
          : `Your PRO license has expired. To continue using Solar String Sizer, Solar Mounting Calculator, and DC Breaker Calculator, please renew by purchasing a new License Key via Viber (${contact.viberPhone}) or Telegram (@${tgUser}).`)
      : isStringSizer
      ? (lang === 'my'
          ? `Solar String Sizer စနစ်ကို အသုံးပြုရန် PRO License ဝယ်ယူထားရှိရန် လိုအပ်ပါသည်။ Viber (${contact.viberPhone}) သို့မဟုတ် Telegram (@${tgUser}) တွင် ဆက်သွယ်ဝယ်ယူ အသက်သွင်းနိုင်ပါသည်။`
          : 'Full access to Solar String Sizer and temperature-compensated MPPT calculation is exclusive to PRO license members.')
      : isDCBreaker
      ? (lang === 'my'
          ? `Solar DC Breaker & Protection Calculator စနစ်ကို Viber (${contact.viberPhone}) သို့မဟုတ် Telegram (@${tgUser}) တွင် PRO License ရယူထားသော အင်ဂျင်နီယာများသာ အပြည့်အဝ အသုံးပြုနိုင်ပါသည်။`
          : 'Full access to DC Breaker, Fuse, Isolator & SPD Calculator is exclusive to PRO license members.')
      : (lang === 'my'
          ? `Solar Mounting Calculator (ခေါင်မိုး/အမိုး) စနစ်ကို Viber (${contact.viberPhone}) သို့မဟုတ် Telegram (@${tgUser}) တွင် PRO License ရယူထားသော အဖွဲ့ဝင်များသာ အပြည့်အဝ အသုံးပြုနိုင်ပါသည်။`
          : 'Full access to our Roof Mount Engineering Calculator is exclusive to PRO package members.'),

    ctaKey: lang === 'my' ? 'လိုင်စင်ကုဒ် ထည့်သွင်းမည် (Enter License)' : 'Enter License Key',
    ctaViber: lang === 'my' ? 'Viber တွင် ဆက်သွယ်ဝယ်ယူရန်' : 'Buy via Viber',
    ctaTelegram: lang === 'my' ? 'Telegram တွင် ဆက်သွယ်ဝယ်ယူရန်' : 'Buy via Telegram',
  };

  const stringSizerFeatures = [
    {
      icon: Sun,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      titleMy: 'အပူချိန်အလိုက် Voc/Vmp တိကျတွက်ချက်မှု',
      titleEn: 'Temperature-Compensated Voc/Vmp',
      descMy: 'ဆောင်းရာသီ အနိမ့်ဆုံးအပူချိန် (-5°C) တွင် Voc အမြင့်ဆုံးဗို့အားနှင့် နွေရာသီ (60°C) တွင် Vmp အနိမ့်ဆုံးဗို့အား အတိအကျတွက်ချက်ခြင်း',
      descEn: 'Accurate Voc max cold temperature & Vmp min hot temperature string voltage calculations'
    },
    {
      icon: Zap,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      titleMy: 'Inverter MPPT Voltage Range Matching',
      titleEn: 'MPPT Tracking Voltage Verification',
      descMy: 'အင်ဗာတာ၏ MPPT Operating Voltage Range အတွင်း ကျရောက်မှု ရှိ/မရှိနှင့် Max Input Current ဘေးကင်းမှု အလိုအလျောက် စစ်ဆေးပေးခြင်း',
      descEn: 'Automatic safety verification against Inverter MPPT operating window and maximum input current'
    },
    {
      icon: Calculator,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      titleMy: 'DC / AC Sizing Ratio (Overpaneling)',
      titleEn: 'DC-to-AC Overpaneling Ratio',
      descMy: 'အင်ဗာတာ စွမ်းရည်နှင့် ဆိုလာပြား စုစုပေါင်း ဝပ် (Wattage) အချိုး 110% မှ 130% အထိ အကောင်းဆုံး လျှပ်စစ်ထုတ်လုပ်နိုင်စွမ်း အကြံပြုချက်',
      descEn: 'Optimized DC/AC oversizing recommendations (110%-130%) to prevent clipping and maximize generation'
    },
    {
      icon: FileText,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      titleMy: 'Engineering Calculation Summary & Export',
      titleEn: 'Engineering Summary & Export',
      descMy: 'ဆိုလာစနစ် ဒီဇိုင်းအတွက် MPPT တစ်ခုချင်းစီအလိုက် စတြင်းတွဲနည်း၊ အန္တရာယ်ကင်းရှင်းမှု အစီရင်ခံစာများ အပြည့်အစုံ ရရှိနိုင်ခြင်း',
      descEn: 'Complete professional engineering summary with per-MPPT string diagrams and export options'
    }
  ];

  const roofFeatures = [
    {
      icon: LayoutGrid,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      titleMy: 'ခေါင်မိုးပုံစံအလိုက် အတိအကျ တွက်ချက်မှု',
      titleEn: 'Roof Type Specific Engineering',
      descMy: 'Metal Sheet Tin Roof, Tile Roof (ကြွေပြား/အုတ်ကြွပ်) နှင့် Flat Concrete Slab အလိုက် L-Feet, Hanger Bolts အတိအကျတွက်ချက်ပေးခြင်း',
      descEn: 'Accurate L-Feet, Hanger Bolt & Bracket sizing for Tin, Tile & Flat Concrete roofs'
    },
    {
      icon: Layers,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      titleMy: 'အလူမီနီယမ် ရထားလမ်းနှင့် ကုပ်များ',
      titleEn: 'Aluminium Rails & Clamps',
      descMy: 'Aluminium Rail 4.2m အလျား၊ Mid Clamps, End Clamps, Rail Splice Kit နှင့် Grounding Lugs အရေအတွက် အလိုအလျောက်တွက်ချက်ပေးခြင်း',
      descEn: 'Automatic count for 4.2m Rails, Mid/End Clamps, Splice Kits & Earth Grounding Lugs'
    },
    {
      icon: Calculator,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      titleMy: 'BOQ Quotation ကုန်ကျစရိတ် စာရင်း',
      titleEn: 'Automatic BOQ Cost Quotation',
      descMy: 'မြန်မာကျပ်ငွေ (MMK) ဖြင့် ပစ္စည်းတစ်ခုချင်းစီ၏ ဈေးနှုန်း၊ စုစုပေါင်းကုန်ကျစရိတ်နှင့် Profit Margin အပြည့်အစုံ ချက်ချင်းရရှိခြင်း',
      descEn: 'Instant Bill of Quantities (BOQ) with real Myanmar MMK market pricing & margin control'
    },
    {
      icon: FileText,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      titleMy: 'PDF Quotation & Excel Export',
      titleEn: 'Official PDF & Excel Quotations',
      descMy: 'Customer များသို့ တင်ပြနိုင်သော တရားဝင် Quotation PDF Format နှင့် Excel စာရင်းများကို တစ်ချက်နှိပ်ရုံဖြင့် ဒေါင်းလုဒ်ဆွဲနိုင်ခြင်း',
      descEn: 'Download official customer-ready PDF quotation formats and Excel spreadsheets'
    }
  ];

  const dcFeatures = [
    {
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      titleMy: 'DC Fuse တွက်ချက်မှု (gPV 1000V)',
      titleEn: 'DC String Fuse Sizing',
      descMy: 'ဆိုလာပြား Isc × 1.25 × 1.25 Safety Factor ဖြင့် ပြိုင်ဆက်စတြင်းများအတွက် gPV Fuse Rating အတိအကျတွက်ပေးခြင်း',
      descEn: 'Accurate gPV 1000V DC fuse sizing using NEC 690.8 safety factor multipliers'
    },
    {
      icon: ShieldAlert,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      titleMy: 'DC Breaker (MCB / MCCB)',
      titleEn: 'DC Breaker (MCB) Sizing',
      descMy: 'Total Isc × 1.56 အလိုက် Overcurrent & Short-circuit Trip Rating, Poles (2P/4P) နှင့် Breaking Capacity တွက်ချက်ခြင်း',
      descEn: 'Calculates DC MCB trip amperes, poles (2P/4P) and DC voltage ratings'
    },
    {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      titleMy: 'DC Isolator Rotary Disconnector',
      titleEn: 'DC Isolator Switch Sizing',
      descMy: 'IEC 60947-3 DC-PV2 စံချိန်စံညွှန်းအရ ဝန်ရှိနေစဉ် ဓာတ်အားဖြတ်တောက်နိုင်သော IP66 Outdoor Rotary Isolator ရွေးချယ်ပေးခြင်း',
      descEn: 'IEC 60947-3 DC-PV2 rated load-break rotary switch and IP66 enclosure specs'
    },
    {
      icon: Sparkles,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      titleMy: 'DC SPD မိုးကြိုးဗို့အားထိန်း',
      titleEn: 'DC Surge Protective Device (SPD)',
      descMy: 'ဆောင်းရာသီ အမြင့်ဆုံး Voc × 1.2 အလိုက် 600V, 1000V, 1500V Type 2 (In:20kA / Imax:40kA) DC SPD သတ်မှတ်ချက်',
      descEn: 'Continuous operating voltage Ucpv (600V/1000V/1500V) and 40kA discharge ratings'
    }
  ];

  const features = isStringSizer ? stringSizerFeatures : isDCBreaker ? dcFeatures : roofFeatures;

  return (
    <div className="w-full py-4 sm:py-8 space-y-6">
      <div className={`relative overflow-hidden rounded-3xl border ${
        isExpired 
          ? (theme === 'dark' ? 'bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40' : 'bg-gradient-to-b from-rose-50/80 via-white to-slate-50 border-rose-300 shadow-xl')
          : (theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-xl')
      }`}>
        <div className={`absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isExpired ? 'bg-rose-500/15' : 'bg-blue-500/10'
        }`} />
        <div className={`absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isExpired ? 'bg-amber-500/15' : 'bg-amber-500/10'
        }`} />

        <div className="relative p-6 sm:p-10 lg:p-12 space-y-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-black uppercase tracking-wider shadow-sm ${
              isExpired 
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse' 
                : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
            }`}>
              {isExpired ? <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
              <span>{t.badge}</span>
            </div>

            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight ${
              isExpired ? 'text-rose-400 dark:text-rose-300' : ''
            }`}>
              {t.title}
            </h2>

            <p className={`text-sm sm:text-base leading-relaxed ${
              isExpired 
                ? (theme === 'dark' ? 'text-rose-200/90 font-medium' : 'text-rose-900 font-medium')
                : (theme === 'dark' ? 'text-slate-300' : 'text-slate-600')
            }`}>
              {t.tagline}
            </p>
          </div>

          {/* Direct Viber & Telegram Contact Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Viber Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#7360f2] to-[#5b48db] text-white flex flex-col justify-between gap-3 shadow-xl shadow-purple-600/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-200 block">Viber တွင် ဆက်သွယ်ဝယ်ယူရန်</span>
                    <span className="font-mono font-black text-base sm:text-lg">{contact.viberPhone}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(contact.viberPhone.replace(/\s+/g, ''), 'viber_phone')}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Copy Viber Phone"
                >
                  {copiedKey === 'viber_phone' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
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

              <a
                href={viberLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-white text-[#5b48db] font-black text-xs sm:text-sm shadow-md hover:bg-purple-50 transition-all flex items-center justify-center gap-2 active:scale-95 text-center"
              >
                <span>Viber ဖြင့် တိုက်ရိုက် မက်ဆေ့ခ်ျပို့ရန်</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Telegram Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#229ed9] to-[#1880b4] text-white flex flex-col justify-between gap-3 shadow-xl shadow-cyan-600/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-cyan-200 block">Telegram တွင် ဆက်သွယ်ဝယ်ယူရန်</span>
                    <span className="font-mono font-black text-base sm:text-lg">@{tgUser}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(`@${tgUser}`, 'tg_user')}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Copy Telegram Username"
                >
                  {copiedKey === 'tg_user' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
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

              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-white text-[#1880b4] font-black text-xs sm:text-sm shadow-md hover:bg-cyan-50 transition-all flex items-center justify-center gap-2 active:scale-95 text-center"
              >
                <span>Telegram ဖြင့် စာပို့ဝယ်ယူရန်</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Inline License Activation Input */}
          {onActivateToken && (
            <div className={`max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl border ${
              theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
            }`}>
              <form onSubmit={handleInlineActivate} className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>{lang === 'my' ? 'ဝယ်ယူထားသော License Key ထည့်ပါ:' : 'Enter Purchased License Key:'}</span>
                </div>

                <div className="flex-1 w-full relative">
                  <input
                    type="text"
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    placeholder="E.G. SOLAR-PRO-1W-1D-XXXX-YYYY"
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
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20 shrink-0 flex items-center justify-center gap-1.5"
                >
                  {isActivating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  <span>{isActivating ? (lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Activating...') : (lang === 'my' ? 'လိုင်စင်ဖွင့်မည်' : 'Activate')}</span>
                </button>
              </form>

              {feedback && (
                <div className={`mt-3 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                }`}>
                  {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{feedback.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    theme === 'dark' 
                      ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700' 
                      : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                  } space-y-3 flex flex-col justify-between`}
                >
                  <div className="space-y-2.5">
                    <div className={`w-10 h-10 rounded-xl ${feat.bg} ${feat.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {lang === 'my' ? feat.titleMy : feat.titleEn}
                    </h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                      {lang === 'my' ? feat.descMy : feat.descEn}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                    <Check className="w-3.5 h-3.5" />
                    <span>PRO Included</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenActivation}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <KeyRound className="w-4 h-4 stroke-[2.5]" />
              <span>{t.ctaKey}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onSwitchToStringSizer && !isStringSizer && (
              <button
                type="button"
                onClick={onSwitchToStringSizer}
                className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl border ${
                  theme === 'dark' 
                    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                    : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                } font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2`}
              >
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Solar String Sizer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
