import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Smartphone, 
  Laptop, 
  Monitor, 
  Radio, 
  Shield, 
  Sparkles, 
  X, 
  Wifi, 
  Clock, 
  Activity, 
  Layers
} from 'lucide-react';
import { UserPresence, SupportedLanguage } from '../types';

interface ActiveUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePresences: UserPresence[];
  lang: SupportedLanguage;
  theme: 'dark' | 'light';
  currentSessionId: string;
}

export const ActiveUsersModal: React.FC<ActiveUsersModalProps> = ({
  isOpen,
  onClose,
  activePresences,
  lang,
  theme,
  currentSessionId
}) => {
  if (!isOpen) return null;

  const totalCount = Math.max(activePresences.length, 1);
  const mobileCount = activePresences.filter(p => /mobile|android|iphone|ipad/i.test(p.device || '')).length;
  const desktopCount = totalCount - mobileCount;
  const proCount = activePresences.filter(p => p.role === 'paid_user' || p.role === 'admin').length;

  const getDeviceIcon = (deviceStr: string) => {
    if (/mobile|android|iphone/i.test(deviceStr)) {
      return <Smartphone className="w-4 h-4 text-cyan-400" />;
    }
    if (/mac|laptop/i.test(deviceStr)) {
      return <Laptop className="w-4 h-4 text-indigo-400" />;
    }
    return <Monitor className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          id="active-users-modal-card"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-b from-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {lang === 'my' ? 'လက်ရှိ အသုံးပြုနေသူများ' : lang === 'zh' ? '实时在线用户与设备' : 'Live Active Users'}
                  </h3>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>{lang === 'my' ? 'တိုက်ရိုက် Real-time စင့်ခ်လုပ်ထားသည်' : lang === 'zh' ? '实时分布式状态网络已连接' : 'Real-time SSE Mesh Connected'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              aria-label="Close"
              id="close-active-users-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-slate-950/60 border-b border-slate-800/80 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">
                {lang === 'my' ? 'စုစုပေါင်း' : lang === 'zh' ? '在线总数' : 'Total Online'}
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {totalCount}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">
                {lang === 'my' ? 'ဖုန်း / မိုဘိုင်း' : lang === 'zh' ? '手机端' : 'Mobile'}
              </span>
              <span className="text-xl font-black text-cyan-400 font-mono">
                {mobileCount}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">
                {lang === 'my' ? 'ကွန်ပျူတာ' : lang === 'zh' ? '桌面电脑' : 'Desktop'}
              </span>
              <span className="text-xl font-black text-indigo-400 font-mono">
                {desktopCount}
              </span>
            </div>
          </div>

          {/* User List */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{lang === 'my' ? 'ချိတ်ဆက်ထားသော Device များ' : lang === 'zh' ? '已连接设备与会话' : 'Connected Devices & Sessions'}</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Activity className="w-3 h-3" /> Live
              </span>
            </div>

            {activePresences.map((presence, idx) => {
              const isThisTab = presence.sessionId === currentSessionId;
              return (
                <div
                  key={presence.sessionId || idx}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isThisTab
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-950/40'
                      : 'bg-slate-950/40 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {getDeviceIcon(presence.device || '')}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {presence.name || (presence.role === 'admin' ? 'Solar Admin' : 'Solar User')}
                        </span>
                        {isThisTab && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                            {lang === 'my' ? 'သင် (ဤ Device)' : lang === 'zh' ? '您 (当前设备)' : 'You (This Device)'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="truncate">{presence.device || 'Web Browser'}</span>
                        <span>&middot;</span>
                        <span className="flex items-center gap-1 text-emerald-400 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Online</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {presence.role === 'admin' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        ADMIN
                      </span>
                    ) : presence.role === 'paid_user' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        PRO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        FREE
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {lang === 'my' ? 'ကွန်ရက်ချိတ်ဆက်မှု အဆင်ပြေပါသည်' : lang === 'zh' ? '分布式网格同步正常' : 'Mesh network active & synchronized'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {lang === 'my' ? 'ပိတ်မည်' : lang === 'zh' ? '关闭' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
