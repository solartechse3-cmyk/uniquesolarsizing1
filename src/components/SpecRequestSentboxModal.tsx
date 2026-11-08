import React, { useState } from 'react';
import { 
  Send, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  PlusCircle, 
  Sparkles, 
  X, 
  Cpu, 
  Sun, 
  BatteryCharging, 
  Info,
  Phone,
  User,
  ExternalLink,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Shield,
  Crown,
  Zap,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SpecRequest } from '../types';

interface SpecRequestSentboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'my';
  theme: 'light' | 'dark';
  requests: SpecRequest[];
  onSubmitRequest: (request: Omit<SpecRequest, 'id' | 'submittedAt' | 'status'>) => void;
  isAdmin?: boolean;
  adminPassword?: string;
  isPaidUser?: boolean;
  onOpenPayment?: () => void;
}

export const SpecRequestSentboxModal: React.FC<SpecRequestSentboxModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  requests,
  onSubmitRequest,
  isAdmin = false,
  adminPassword = 'Atha2608@',
  isPaidUser = false,
  onOpenPayment
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'sentbox'>('compose');
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(isAdmin);
  const [showAdminLoginInCompose, setShowAdminLoginInCompose] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Form states
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<SpecRequest['category']>('inverter');
  const [datasheetUrl, setDatasheetUrl] = useState('');
  const [specDetails, setSpecDetails] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const canUseCompose = isPaidUser || isAdmin || adminUnlocked;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUseCompose) {
      if (onOpenPayment) {
        onClose();
        onOpenPayment();
      }
      return;
    }

    if (!brand.trim() || !model.trim() || !specDetails.trim()) return;

    onSubmitRequest({
      senderName: senderName.trim() || 'Solar Engineer',
      senderPhone: senderPhone.trim() || '09 798 123 456',
      brand: brand.trim(),
      model: model.trim(),
      category,
      datasheetUrl: datasheetUrl.trim() || undefined,
      specDetails: specDetails.trim(),
    });

    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setBrand('');
      setModel('');
      setDatasheetUrl('');
      setSpecDetails('');
    }, 2500);
  };

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === adminPassword.trim()) {
      setAdminUnlocked(true);
      setAuthError('');
      setPasswordInput('');
      setShowAdminLoginInCompose(false);
    } else {
      setAuthError(lang === 'my' ? 'Admin Password မှားယွင်းနေပါသည်။' : 'Incorrect Admin Password');
    }
  };

  const getStatusBadge = (status: SpecRequest['status']) => {
    switch (status) {
      case 'added':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {lang === 'my' ? 'ဒေတာဘေ့စ်တွင် ထည့်သွင်းပြီး' : 'Added to Database'}
          </span>
        );
      case 'reviewed':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1">
            <Info className="w-3 h-3" />
            {lang === 'my' ? 'Admin စိစစ်ပြီး (Reviewed)' : 'Reviewed'}
          </span>
        );
      case 'declined':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {lang === 'my' ? 'ငြင်းပယ်ထားပါသည်' : 'Declined'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" />
            {lang === 'my' ? 'စိစစ်ဆဲ (Pending)' : 'Under Review'}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {lang === 'my' ? 'ပစ္စည်းအသစ် Specification တောင်းဆိုစာပို့ရန်' : 'Brand & Spec Request'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono uppercase flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  PRO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'my' 
                  ? 'ထည့်သွင်းလိုသော အင်ဗာတာ/ဆိုလာပြား Specification များအား Admin ထံ တိုက်ရိုက် စာပို့တောင်းဆိုနိုင်ပါသည်' 
                  : 'Submit custom inverter, panel, or battery specs to admin for database inclusion'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('compose')}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'compose'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{lang === 'my' ? 'စာအသစ်ပို့မည် (Request Form)' : 'New Request'}</span>
              {!canUseCompose && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  PRO
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('sentbox')}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'sentbox'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>{lang === 'my' ? 'Sentbox စာရင်း (Admin သီးသန့်)' : 'Sentbox (Admin Only)'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                Admin
              </span>
            </button>
          </div>

          {adminUnlocked ? (
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Verified
            </span>
          ) : isPaidUser ? (
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              PRO Member
            </span>
          ) : null}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'compose' ? (
            !canUseCompose ? (
              /* PRO Lock Screen for Request Form */
              <div className="py-6 px-4 text-center max-w-lg mx-auto space-y-5">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
                  <Crown className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    PRO Exclusive Feature
                  </div>
                  <h4 className="font-extrabold text-lg sm:text-xl text-white">
                    {lang === 'my' ? 'ပစ္စည်းအသစ် တောင်းဆိုစာပို့ခြင်းသည် PRO Feature ဖြစ်ပါသည်' : 'Brand & Spec Request is a PRO Feature'}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {lang === 'my'
                      ? 'စနစ်တွင် မပါဝင်သေးသော Inverter, Solar Panel, Battery မော်ဒယ်သစ်များအား စနစ်ထဲသို့ တိုက်ရိုက် ထည့်သွင်းပေးရန် Admin ထံ စာပို့တောင်းဆိုနိုင်ရန် PRO အဖွဲ့ဝင်အဖြစ် အဆင့်မြှင့်တင်ပါ'
                      : 'Request custom inverter, solar panel, and battery specifications to be permanently added to the calculation database by upgrading to PRO.'}
                  </p>
                </div>

                {/* Key PRO benefits */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left space-y-2.5">
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-3 h-3" />
                    </div>
                    <span>{lang === 'my' ? 'Inverter & Solar Panel မော်ဒယ်သစ်များကို ဦးစားပေး စိစစ်ထည့်သွင်းပေးခြင်း' : 'Priority datasheet review and preset addition for requested models'}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <span>{lang === 'my' ? 'Standard String & MPPT Sizer တွက်ချက်မှုတွင် စိတ်ကြိုက် အသုံးပြုနိုင်ခြင်း' : 'Seamlessly size strings and MPPTs with requested equipment'}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                    <span>{lang === 'my' ? 'အင်ဂျင်နီယာအဖွဲ့မှ တိုက်ရိုက် စစ်ဆေးပြီး အတည်ပြုပေးခြင်း' : 'Direct engineering verification with official datasheets'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenPayment) onOpenPayment();
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm cursor-pointer shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-98"
                  >
                    <Crown className="w-4 h-4 text-slate-950" />
                    <span>{lang === 'my' ? 'PRO သို့ အဆင့်မြှင့်တင်မည် (Upgrade to PRO)' : 'Upgrade to PRO Membership'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {!showAdminLoginInCompose ? (
                    <button
                      type="button"
                      onClick={() => setShowAdminLoginInCompose(true)}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'my' ? 'Admin ဖြစ်ပါက စကားဝှက်ဖြင့် ဝင်ရောက်အသုံးပြုမည်' : 'Unlock with Admin Password'}</span>
                    </button>
                  ) : (
                    <form onSubmit={handleUnlockAdmin} className="space-y-2 pt-2 text-left bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                        <span>{lang === 'my' ? 'Admin Master Password ရိုက်ထည့်ပါ' : 'Enter Admin Password'}</span>
                        <button 
                          type="button" 
                          onClick={() => setShowAdminLoginInCompose(false)}
                          className="text-[11px] text-slate-500 hover:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => {
                              setPasswordInput(e.target.value);
                              setAuthError('');
                            }}
                            placeholder="Admin Password..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-amber-500 text-xs font-mono"
                            autoFocus
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlock</span>
                        </button>
                      </div>
                      {authError && <p className="text-[11px] text-rose-400">{authError}</p>}
                    </form>
                  )}
                </div>
              </div>
            ) : (
              /* Normal Form View for PRO & Admin */
              <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
                {submittedSuccess ? (
                  <div className="p-8 text-center bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                    <h4 className="font-bold text-base text-white">
                      {lang === 'my' ? 'တောင်းဆိုစာ အောင်မြင်စွာ ပေးပို့ပြီးပါပြီ!' : 'Request Sent to Admin Successfully!'}
                    </h4>
                    <p className="text-xs text-emerald-300 max-w-md mx-auto">
                      {lang === 'my' 
                        ? 'သင့်တောင်းဆိုချက်အား စနစ် Admin ထံသို့ တိုက်ရိုက် ပေးပို့လိုက်ပါပြီ။ Admin မှ အချက်အလက်များ စိစစ်ပြီး အမြန်ဆုံး ထည့်သွင်းပေးပါမည်။' 
                        : 'Your spec request has been securely delivered to the Admin inbox. Admin will verify and update the database presets.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmittedSuccess(false)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 mt-2"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'နောက်ထပ် စာပို့မည်' : 'Submit Another Request'}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          {lang === 'my' ? 'သင်၏ အမည်' : 'Your Name'}
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder="e.g. Ko Aung"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          {lang === 'my' ? 'ဖုန်းနံပါတ် / ဆက်သွယ်ရန်' : 'Phone Number'}
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            value={senderPhone}
                            onChange={(e) => setSenderPhone(e.target.value)}
                            placeholder="09 123 456 789"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          {lang === 'my' ? 'ပစ္စည်းအမျိုးအစား' : 'Category'} *
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500"
                        >
                          <option value="inverter">Inverter (အင်ဗာတာ)</option>
                          <option value="panel">Solar Panel (ဆိုလာပြား)</option>
                          <option value="battery">Lithium Battery (ဘက်ထရီ)</option>
                          <option value="charge_controller">MPPT Charge Controller</option>
                          <option value="other">Other Solar Equipment</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          {lang === 'my' ? 'တံဆိပ် / Brand အမည်' : 'Brand Name'} *
                        </label>
                        <input
                          type="text"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          placeholder="e.g. Deye, Must, Growatt, Jinko"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          {lang === 'my' ? 'မော်ဒယ်အမည် (Model Name / Number)' : 'Model Name'} *
                        </label>
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="e.g. SUN-6K-SG04LP1 / Tiger Neo 585W"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          {lang === 'my' ? 'Datasheet လင့်ခ် (ရှိပါက ထည့်ပါ)' : 'Datasheet Link / PDF URL (Optional)'}
                        </label>
                        <input
                          type="url"
                          value={datasheetUrl}
                          onChange={(e) => setDatasheetUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-400 font-semibold mb-1">
                          {lang === 'my' ? 'အသေးစိတ် Specification များ (Voc, Vmp, kW, Current)' : 'Technical Specifications'} *
                        </label>
                        <textarea
                          value={specDetails}
                          onChange={(e) => setSpecDetails(e.target.value)}
                          rows={3}
                          placeholder={lang === 'my' ? 'ဥပမာ- Max DC Voltage: 500V, MPPT: 120V-450V, Max Input: 6500W, Current: 15A...' : 'Example: Voc: 52V, Vmp: 44V, Watt: 580W, Imp: 13.1A, Isc: 13.9A...'}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-amber-500 resize-none font-mono text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>{lang === 'my' ? 'Admin ထံ တောင်းဆိုစာ ပေးပို့မည်' : 'Send Spec Request'}</span>
                      </button>
                    </div>
                  </>
                )}
              </form>
            )
          ) : !adminUnlocked ? (
            /* Admin Gate for Sentbox */
            <div className="py-8 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">
                  {lang === 'my' ? 'Sentbox အား စနစ် Admin သာ ကြည့်ရှုခွင့်ရှိပါသည်' : 'Admin Restricted Sentbox'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'my' 
                    ? 'အသုံးပြုသူများ ပေးပို့ထားသော စာများနှင့် ဖုန်းနံပါတ်များကို လုံခြုံရေးအရ စနစ် Admin သာ ကြည့်ရှုနိုင်ရန် ကာကွယ်ထားပါသည်။ Admin Password ရိုက်ထည့်၍ ကြည့်ရှုနိုင်ပါသည်။'
                    : 'Submitted spec requests and user contact details are strictly protected. Please verify Admin Password to view incoming requests.'}
                </p>
              </div>

              <form onSubmit={handleUnlockAdmin} className="space-y-3 pt-2">
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setAuthError('');
                    }}
                    placeholder={lang === 'my' ? 'Admin Password ရိုက်ထည့်ပါ...' : 'Enter Admin Password...'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white outline-none focus:border-amber-500 text-sm font-mono"
                    autoFocus
                  />
                </div>

                {authError && (
                  <p className="text-xs text-rose-400 font-medium">{authError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{lang === 'my' ? 'Admin အနေဖြင့် ဝင်ရောက်ကြည့်ရှုမည်' : 'Unlock Sentbox as Admin'}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Admin Unlocked Sentbox View */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400">
                  {lang === 'my' ? `လက်ခံရရှိထားသော တောင်းဆိုစာများ (${requests.length})` : `Total Received Requests (${requests.length})`}
                </span>
                <button
                  onClick={() => setAdminUnlocked(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>{lang === 'my' ? 'ပြန်လည်ပိတ်မည်' : 'Lock'}</span>
                </button>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                  <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <h4 className="text-slate-400 font-semibold text-sm">
                    {lang === 'my' ? 'ပေးပို့ထားသော တောင်းဆိုစာ မရှိသေးပါ' : 'No requests in Sentbox yet'}
                  </h4>
                  <p className="text-slate-500 text-xs mt-1">
                    {lang === 'my' ? 'User များမှ ပေးပို့လာသော တောင်းဆိုစာများ ဤနေရာတွင် ပေါ်လာပါမည်' : 'Incoming requests from users will appear here.'}
                  </p>
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                          {req.category === 'inverter' ? <Cpu className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white flex items-center gap-2">
                            <span>{req.brand} - {req.model}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono uppercase">
                              {req.category}
                            </span>
                          </h4>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-blue-300">{req.senderName}</span>
                            {req.senderPhone && (
                              <>
                                <span>&middot;</span>
                                <span className="font-mono text-emerald-400">{req.senderPhone}</span>
                              </>
                            )}
                            <span>&middot;</span>
                            <span>{new Date(req.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {getStatusBadge(req.status)}
                      </div>
                    </div>

                    {/* Spec details preview */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                      {req.specDetails}
                    </div>

                    {req.datasheetUrl && (
                      <div className="text-xs">
                        <a
                          href={req.datasheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline inline-flex items-center gap-1 font-mono"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{req.datasheetUrl}</span>
                        </a>
                      </div>
                    )}

                    {/* Admin Reply Note if any */}
                    {req.adminReply && (
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-blue-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Admin တုံ့ပြန်ချက် (Admin Reply):</span>
                        </div>
                        <p className="text-slate-200">{req.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
