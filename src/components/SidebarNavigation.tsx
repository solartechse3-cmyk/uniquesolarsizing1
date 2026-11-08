import React from 'react';
import { 
  Layers, 
  LayoutGrid,
  FileText, 
  MessageSquare, 
  CreditCard, 
  Settings, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Sparkles, 
  X,
  Radio,
  ExternalLink,
  ChevronRight,
  Zap,
  Calendar,
  Clock,
  AlertCircle,
  Crown,
  RefreshCw,
  ArrowUpRight,
  Database,
  Lock,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveNavTab, PaymentRecord, UserPresence, SupportedLanguage, AppBranding, SubscriptionDuration, LicenseToken, AdminContactConfig } from '../types';
import { isSubscriptionActive, isSubscriptionExpired, useSubscriptionCountdown, formatDurationLabel } from '../lib/subscriptionUtils';

interface SidebarNavigationProps {
  activeTab: ActiveNavTab | 'documents' | 'spec_requests' | 'payment_accounts' | 'settings';
  onSelectTab: (tab: ActiveNavTab) => void;
  onOpenDocuments: () => void;
  onOpenSpecRequests: () => void;
  onOpenPayment: () => void;
  onOpenSettings: () => void;
  onOpenActiveUsers?: () => void;
  onOpenMountingDb?: () => void;
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage | ((prev: SupportedLanguage) => SupportedLanguage)) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  currentPaymentRecord: PaymentRecord | null;
  activeLicense?: LicenseToken | null;
  adminContact?: AdminContactConfig;
  activePresences: UserPresence[];
  resourceCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  appBranding?: AppBranding;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onSelectTab,
  onOpenDocuments,
  onOpenSpecRequests,
  onOpenPayment,
  onOpenSettings,
  onOpenActiveUsers,
  onOpenMountingDb,
  lang,
  setLang,
  theme,
  toggleTheme,
  currentPaymentRecord,
  activeLicense,
  adminContact,
  activePresences,
  resourceCount,
  isOpenMobile,
  onCloseMobile,
  appBranding,
}) => {
  const isLicenseValid = Boolean(activeLicense && activeLicense.status === 'active' && new Date(activeLicense.expiresAt).getTime() > Date.now());
  const isPaid = isLicenseValid || isSubscriptionActive(currentPaymentRecord);
  const isLicenseExpired = Boolean(activeLicense && (activeLicense.status === 'expired' || new Date(activeLicense.expiresAt).getTime() <= Date.now()));
  const isExpired = !isLicenseValid && (isLicenseExpired || isSubscriptionExpired(currentPaymentRecord));

  const menuItems = [
    {
      id: 'string_sizer' as const,
      labelEn: 'Solar String Sizer',
      labelMy: 'ဆိုလာပြား စတြင်း တွက်စက်',
      labelZh: '光伏组串配比计算器',
      subtextEn: isPaid ? 'MPPT & Voltage Thresholds' : 'PRO Package Locked',
      subtextMy: isPaid ? 'ဗို့အားနှင့် MPPT အချိုးအစား' : 'PRO Package လိုအပ်ပါသည်',
      subtextZh: isPaid ? 'MPPT与电压耐压阈值计算' : 'PRO 会员专享功能',
      icon: isPaid ? Layers : Lock,
      type: 'nav' as const,
      badge: isPaid ? 'MPPT' : 'PRO',
      badgeColor: isPaid ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    },
    {
      id: 'mounting_calc' as const,
      labelEn: 'Solar Mounting Calculator',
      labelMy: 'ဆိုလာတပ်ဆင်ရေး တွက်ချက်စက်',
      labelZh: '光伏支架与材料清单计算器',
      subtextEn: isPaid ? 'Structure, Rails & BOQ Quotation' : 'PRO Package Locked',
      subtextMy: isPaid ? 'တပ်ဆင်ရေးပစ္စည်းနှင့် ကုန်ကျစရိတ်' : 'PRO Package လိုအပ်ပါသည်',
      subtextZh: isPaid ? '支架导轨与工程量报价单' : 'PRO 会员专享功能',
      icon: isPaid ? LayoutGrid : Lock,
      type: 'nav' as const,
      badge: isPaid ? 'BOQ' : 'PRO',
      badgeColor: isPaid ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    },
    {
      id: 'dc_breaker_calc' as const,
      labelEn: 'DC Breaker Calculator',
      labelMy: 'DC Breaker & အကာအကွယ် တွက်စက်',
      labelZh: '直流断路器与保护计算器',
      subtextEn: isPaid ? 'DC Fuse, MCB, Isolator & SPD' : 'PRO Package Locked',
      subtextMy: isPaid ? 'Fuse, MCB, Isolator, SPD တွက်ချက်ခြင်း' : 'PRO Package လိုအပ်ပါသည်',
      subtextZh: isPaid ? '熔断器、断路器、隔离开关与防雷器' : 'PRO 会员专享功能',
      icon: isPaid ? Zap : Lock,
      type: 'nav' as const,
      badge: isPaid ? 'DC' : 'PRO',
      badgeColor: isPaid ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    },
    {
      id: 'mounting_database' as const,
      labelEn: 'Mounting Database (Admin)',
      labelMy: 'ဆိုလာဖရိန် Database (Admin)',
      labelZh: '支架光伏数据库 (管理)',
      subtextEn: 'Excel/CSV Templates & Sync',
      subtextMy: 'နမူနာ Excel/CSV နှင့် ဒေတာဘေ့စ်',
      subtextZh: 'Excel/CSV模板与云同步',
      icon: Database,
      type: 'action' as const,
      badge: 'Admin',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      onClick: onOpenMountingDb
    },
    {
      id: 'documents' as const,
      labelEn: 'Documents & Vault',
      labelMy: 'နည်းပညာ ဖိုင်မှတ်တမ်းများ',
      labelZh: '技术文档与资料库',
      subtextEn: isPaid ? 'PDF Guides & Datasheets' : 'PRO Locked Vault',
      subtextMy: isPaid ? 'လက်စွဲစာအုပ်နှင့် ကတ်တလောက်' : 'PRO အဖွဲ့ဝင်များသာ ရယူနိုင်သည်',
      subtextZh: isPaid ? 'PDF手册、参数表与图纸' : 'PRO 会员专享资料库',
      icon: FileText,
      type: 'action' as const,
      count: isPaid ? resourceCount : undefined,
      badge: isPaid ? undefined : 'PRO',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      onClick: onOpenDocuments
    },
    {
      id: 'spec_requests' as const,
      labelEn: 'Spec & Brand Request',
      labelMy: 'ပစ္စည်းအသစ် တောင်းဆိုရန်',
      labelZh: '型号规格录入需求',
      subtextEn: isPaid ? 'Request Custom Specs' : 'PRO Member Feature',
      subtextMy: isPaid ? 'Inverter & Panel တောင်းဆိုမှု' : 'PRO အဖွဲ့ဝင်များသာ ပေးပို့နိုင်သည်',
      subtextZh: isPaid ? '提交新逆变器与组件需求' : 'PRO 会员专享功能',
      icon: MessageSquare,
      type: 'action' as const,
      badge: isPaid ? undefined : 'PRO',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      onClick: onOpenSpecRequests
    },
    {
      id: 'payment_accounts' as const,
      labelEn: 'PRO License & Buy',
      labelMy: 'PRO လိုင်စင်နှင့် ဝယ်ယူရန်',
      labelZh: 'PRO 授权与购买',
      subtextEn: isPaid ? 'PRO Active' : 'Viber / Telegram Direct',
      subtextMy: isPaid ? 'PRO အသုံးပြုခွင့် ရရှိထားသည်' : 'Viber / Telegram တွင် ဝယ်ယူရန်',
      subtextZh: isPaid ? 'PRO 会员已激活' : 'Viber / Telegram 购买',
      icon: isPaid ? ShieldCheck : KeyRound,
      type: 'action' as const,
      isProStatus: true,
      onClick: onOpenPayment
    },
    {
      id: 'settings' as const,
      labelEn: 'Settings & Admin',
      labelMy: 'စနစ်ပြင်ဆင်မှုနှင့် Admin',
      labelZh: '系统设置与管理后台',
      subtextEn: 'Database & Sync Controls',
      subtextMy: 'စနစ် ထိန်းချုပ်ခန်း',
      subtextZh: '数据库、云同步与配置管理',
      icon: Settings,
      type: 'action' as const,
      onClick: onOpenSettings
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d1527] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-5 pb-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <img 
              src={appBranding?.logoUrl || './logo.png'} 
              alt={appBranding?.appName || "UNIQUE SOLAR PRO"} 
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/logo.png')) {
                  target.src = './logo.png';
                }
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5 truncate">
              <span className="truncate">{appBranding?.appName || 'UNIQUE SOLAR PRO'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                {appBranding?.appVersion || 'v2.5'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {appBranding?.appSubtitle || (lang === 'my' ? 'အင်ဂျင်နီယာ တွက်ချက်မှုစနစ်' : lang === 'zh' ? '光伏工程计算系统' : 'Engineering Suite')}
            </div>
          </div>
        </div>

        {/* Mobile Close Button */}
        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white lg:hidden cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu Items */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          const label = lang === 'my' ? item.labelMy : lang === 'zh' ? item.labelZh : item.labelEn;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.type === 'nav') {
                  onSelectTab(item.id as ActiveNavTab);
                } else if (item.onClick) {
                  item.onClick();
                }
                if (isOpenMobile) {
                  onCloseMobile();
                }
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left transition-all duration-200 cursor-pointer group relative ${
                isActive
                  ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
              }`}
              id={`sidebar-item-${item.id}`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className={`text-[14px] sm:text-[14.5px] truncate tracking-tight ${isActive ? 'text-white font-bold' : ''}`}>
                    {label}
                  </span>
                  
                  {/* Badges / Counts */}
                  {item.badge && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                    }`}>
                      {item.count}
                    </span>
                  )}
                  {item.isProStatus && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isPaid 
                        ? (isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30')
                        : isExpired
                        ? (isActive ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30')
                        : (isActive ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30')
                    }`}>
                      {isPaid ? 'PRO' : isExpired ? 'EXPIRED' : 'FREE'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Subscription Validity & Renewal Banner Card */}
      <div className="px-3.5 pb-2">
        <SidebarSubscriptionCard
          currentPaymentRecord={currentPaymentRecord}
          activeLicense={activeLicense}
          adminContact={adminContact}
          lang={lang}
          onOpenPayment={onOpenPayment}
          isOpenMobile={isOpenMobile}
          onCloseMobile={onCloseMobile}
        />
      </div>

      {/* Footer System Status & Controls */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0a0f1d]/90">
        {/* Live Online Indicator */}
        <button
          onClick={onOpenActiveUsers}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-855 border border-slate-800/90 hover:border-emerald-500/40 text-xs transition-all cursor-pointer group shadow-sm"
          title={lang === 'my' ? 'လက်ရှိ အသုံးပြုနေသူများ အသေးစိတ်ကြည့်ရန်' : lang === 'zh' ? '查看当前在线用户与设备' : 'Click to view active users and connected devices'}
          id="sidebar-active-users-btn"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
              {lang === 'my' ? 'လောလောဆယ် သုံးနေသူ' : lang === 'zh' ? '当前在线用户' : 'Active Users'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
              {Math.max(activePresences.length, 1)}
            </span>
          </div>
        </button>

        {/* Quick Toggles: Theme & 3-Way Language */}
        <div className="grid grid-cols-2 gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            id="sidebar-theme-toggle"
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </>
            )}
          </button>

          {/* 3-Way Language Toggle */}
          <button
            onClick={() => setLang(l => l === 'en' ? 'my' : l === 'my' ? 'zh' : 'en')}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-amber-300 hover:text-amber-200 transition-all cursor-pointer shadow-sm"
            title="Toggle Language: မြန်မာ / 中文 / English"
            id="sidebar-lang-toggle"
          >
            <span>{lang === 'my' ? '🇲🇲 မြန်မာ' : lang === 'zh' ? '🇨🇳 中文' : '🇬🇧 ENG'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-slate-800/90 h-screen sticky top-0 z-30 shadow-2xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Overlay */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Sidebar Content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-80 max-w-[85vw] h-full z-10 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

interface SidebarSubscriptionCardProps {
  currentPaymentRecord: PaymentRecord | null;
  activeLicense?: LicenseToken | null;
  adminContact?: AdminContactConfig;
  lang: SupportedLanguage;
  onOpenPayment: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const SidebarSubscriptionCard: React.FC<SidebarSubscriptionCardProps> = ({
  currentPaymentRecord,
  activeLicense,
  adminContact,
  lang,
  onOpenPayment,
  isOpenMobile,
  onCloseMobile
}) => {
  const isLicenseValid = Boolean(activeLicense && activeLicense.status === 'active' && new Date(activeLicense.expiresAt).getTime() > Date.now());
  const isPaid = isLicenseValid || isSubscriptionActive(currentPaymentRecord);
  const isExpired = !isLicenseValid && (isSubscriptionExpired(currentPaymentRecord) || (activeLicense && activeLicense.status === 'expired'));
  
  const expiryDate = activeLicense?.expiresAt || currentPaymentRecord?.expiresAt;
  const subInfo = useSubscriptionCountdown(expiryDate, lang);

  const contact = adminContact || {
    viberPhone: '09 403 708 145',
    viberUrl: 'viber://chat?number=09403708145',
    telegramUsername: 'uniquesolarpro',
    telegramUrl: 'https://t.me/uniquesolarpro'
  };

  if (isPaid) {
    const durationLabel = activeLicense
      ? activeLicense.duration.toUpperCase().replace('_', ' ') + ' PRO'
      : formatDurationLabel(currentPaymentRecord?.planDuration as SubscriptionDuration, lang);

    const deviceUsage = activeLicense
      ? `${activeLicense.boundDevices?.length || 1}/${activeLicense.deviceLimit} Device`
      : '1 Device';

    return (
      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-blue-950/70 via-slate-900/90 to-slate-950 border border-blue-500/40 text-white shadow-xl space-y-2.5 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Crown className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0" />
            <span className="text-xs font-black tracking-wide text-amber-300 truncate">
              {durationLabel}
            </span>
          </div>
          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ACTIVE</span>
          </span>
        </div>

        {/* Real-time Ticking Countdown Matrix */}
        {expiryDate ? (
          <div className="space-y-2 bg-slate-950/80 p-2.5 rounded-xl border border-blue-900/40 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-spin-slow" />
                <span>{lang === 'my' ? 'တိုက်ရိုက် လက်ကျန်အချိန်' : 'Live Countdown'}</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {deviceUsage}
              </span>
            </div>

            {/* 4-Block Digital Ticking Clock */}
            <div className="grid grid-cols-4 gap-1 text-center font-mono">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/90 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-amber-300 tabular-nums leading-tight">
                  {subInfo.countdownParts.days}
                </span>
                <span className="text-[8.5px] text-slate-400 font-sans mt-0.5">
                  {lang === 'my' ? 'ရက်' : 'Day'}
                </span>
              </div>

              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/90 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-white tabular-nums leading-tight">
                  {subInfo.countdownParts.hours}
                </span>
                <span className="text-[8.5px] text-slate-400 font-sans mt-0.5">
                  {lang === 'my' ? 'နာရီ' : 'Hour'}
                </span>
              </div>

              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/90 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-white tabular-nums leading-tight">
                  {subInfo.countdownParts.minutes}
                </span>
                <span className="text-[8.5px] text-slate-400 font-sans mt-0.5">
                  {lang === 'my' ? 'မိနစ်' : 'Min'}
                </span>
              </div>

              <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-500/40 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-emerald-400 tabular-nums leading-tight animate-pulse">
                  {subInfo.countdownParts.seconds}
                </span>
                <span className="text-[8.5px] text-emerald-400 font-sans mt-0.5">
                  {lang === 'my' ? 'စက္ကန့်' : 'Sec'}
                </span>
              </div>
            </div>

            {/* Expiry Date Info */}
            <div className="pt-1.5 border-t border-slate-800/80 text-[10.5px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{lang === 'my' ? 'ကုန်ဆုံးမည့်ရက်:' : 'Expires:'}</span>
              </span>
              <span className="font-mono font-semibold text-slate-200 truncate max-w-[140px]" title={subInfo.validUntilDateTime}>
                {subInfo.validUntilDateTime}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'my' ? 'တစ်သက်တာ အသုံးပြုခွင့် (Lifetime Active)' : 'Lifetime Pro Access'}</span>
          </div>
        )}

        {/* Renew / Extend Button */}
        <button
          onClick={() => {
            onOpenPayment();
            if (isOpenMobile) onCloseMobile();
          }}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer group"
          id="sidebar-renew-btn"
        >
          <Zap className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
          <span>{lang === 'my' ? 'လိုင်စင် အချက်အလက် / သက်တမ်းတိုး' : 'License Details & Renew'}</span>
        </button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-rose-950/60 to-slate-900/90 border border-rose-500/30 text-white shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold">
              {lang === 'my' ? 'သက်တမ်းကုန်ဆုံးပါပြီ' : 'License Expired'}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            EXPIRED
          </span>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] space-y-1">
          <div className="text-slate-400">
            {lang === 'my' ? 'ယခင်သက်တမ်း ကုန်ဆုံးသွားပါပြီ။ Viber သို့မဟုတ် Telegram တွင် သက်တမ်းတိုးနိုင်ပါသည်' : 'License ended. Contact on Viber or Telegram to renew.'}
          </div>
        </div>

        <button
          onClick={() => {
            onOpenPayment();
            if (isOpenMobile) onCloseMobile();
          }}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          id="sidebar-renew-expired-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{lang === 'my' ? 'သက်တမ်းတိုးမည် (Renew PRO)' : 'Renew PRO Access'}</span>
        </button>
      </div>
    );
  }

  // Free Tier Card
  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-white space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>SOLAR PRO SUITE</span>
        </span>
        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">PAID VERSION</span>
      </div>
      <p className="text-[11px] text-slate-300 leading-snug">
        {lang === 'my' 
          ? '၁ ပတ်၊ ၁ လ၊ ၃ လ၊ ၁ နှစ် (1 Device သို့မဟုတ် 2 Devices) အတွက် Viber/Telegram တွင် ဝယ်ယူနိုင်ပါသည်' 
          : '1 Week, 1 Month, 3 Months, 1 Year plans available on Viber & Telegram.'}
      </p>

      <button
        onClick={() => {
          onOpenPayment();
          if (isOpenMobile) onCloseMobile();
        }}
        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
        id="sidebar-upgrade-btn"
      >
        <KeyRound className="w-3.5 h-3.5" />
        <span>{lang === 'my' ? 'လိုင်စင်ဖွင့်မည် / ဆက်သွယ်ရန်' : 'Activate PRO / Contact'}</span>
      </button>
    </div>
  );
};
