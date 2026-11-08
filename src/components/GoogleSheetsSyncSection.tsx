import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Settings2, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Link2,
  Database,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  getStoredSheetConfig, 
  saveStoredSheetConfig, 
  syncAllRecordsToGoogleSheet, 
  testGoogleSheetWebhook,
  exportPaymentRecordsAsCSV,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  GoogleSheetConfig 
} from '../lib/googleSheetsService';
import { PaymentRecord, SupportedLanguage } from '../types';

interface GoogleSheetsSyncSectionProps {
  lang: SupportedLanguage;
  theme: 'dark' | 'light';
  records: PaymentRecord[];
  onShowToast?: (msg: { text: string; type: 'success' | 'error' | 'info' }) => void;
}

export const GoogleSheetsSyncSection: React.FC<GoogleSheetsSyncSectionProps> = ({
  lang,
  theme,
  records,
  onShowToast
}) => {
  const isDark = theme === 'dark';
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(getStoredSheetConfig());
  const [webhookInput, setWebhookInput] = useState(sheetConfig.webhookUrl || '');
  const [sheetUrlInput, setSheetUrlInput] = useState(sheetConfig.spreadsheetUrl || '');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isConnected = Boolean(sheetConfig.webhookUrl);

  const handleSaveConfig = async () => {
    saveStoredSheetConfig({
      webhookUrl: webhookInput.trim() || null,
      spreadsheetUrl: sheetUrlInput.trim() || null
    });
    setSheetConfig(getStoredSheetConfig());
    setShowConfigModal(false);

    if (onShowToast) {
      onShowToast({
        text: lang === 'my' 
          ? 'Google Sheet Webhook ဆက်တင်များကို သိမ်းဆည်းလိုက်ပါပြီ!' 
          : 'Google Sheet Webhook settings saved successfully!',
        type: 'success'
      });
    }
  };

  const handleTestConnection = async () => {
    if (!webhookInput.trim()) {
      if (onShowToast) {
        onShowToast({
          text: lang === 'my' ? 'ကျေးဇူးပြု၍ Webhook URL အရင်ထည့်သွင်းပေးပါ' : 'Please enter Webhook URL first',
          type: 'error'
        });
      }
      return;
    }

    setIsTesting(true);
    try {
      const ok = await testGoogleSheetWebhook(webhookInput.trim());
      if (ok) {
        if (onShowToast) {
          onShowToast({
            text: lang === 'my' 
              ? 'Google Sheet Webhook သို့ အချက်အလက်များ အောင်မြင်စွာ ပို့ဆောင်နိုင်ပါသည်!' 
              : 'Google Sheet Webhook test connection successful!',
            type: 'success'
          });
        }
      } else {
        throw new Error('Test ping failed');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast({
          text: lang === 'my' ? 'Webhook ချိတ်ဆက်မှု မအောင်မြင်ပါ' : 'Webhook test connection failed',
          type: 'error'
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncAll = async () => {
    if (!sheetConfig.webhookUrl) {
      setShowConfigModal(true);
      if (onShowToast) {
        onShowToast({
          text: lang === 'my' 
            ? 'Google Sheet သို့ ပို့ဆောင်ရန် Webhook URL အရင်ထည့်သွင်းပေးပါ' 
            : 'Please configure Google Sheet Webhook URL first',
          type: 'info'
        });
      }
      return;
    }

    setIsSyncingAll(true);
    try {
      const res = await syncAllRecordsToGoogleSheet(records);
      if (res.success) {
        if (onShowToast) {
          onShowToast({
            text: lang === 'my' 
              ? `ငွေလွှဲမှတ်တမ်း ${res.syncedCount} ခုလုံးကို Google Sheet သို့ အောင်မြင်စွာ ပို့ပြီးပါပြီ!` 
              : `All ${res.syncedCount} payment records synced to Google Sheet successfully!`,
            type: 'success'
          });
        }
      } else {
        throw new Error(res.error || 'Sync failed');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast({
          text: lang === 'my' ? `Sync လုပ်ဆောင်မှု မအောင်မြင်ပါ: ${err.message}` : `Sync failed: ${err.message}`,
          type: 'error'
        });
      }
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
    if (onShowToast) {
      onShowToast({
        text: lang === 'my' ? 'Google Apps Script Code ကို Copy ကူးပြီးပါပြီ!' : 'Apps Script code copied to clipboard!',
        type: 'success'
      });
    }
  };

  const handleExportCSV = () => {
    exportPaymentRecordsAsCSV(records);
    if (onShowToast) {
      onShowToast({
        text: lang === 'my' ? 'Google Sheet CSV ဖိုင်ကို ဒေါင်းလုဒ်ရယူပြီးပါပြီ!' : 'Google Sheet CSV exported successfully!',
        type: 'success'
      });
    }
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      isDark 
        ? 'bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-950 border-emerald-500/30' 
        : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-200'
    }`}>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <span>{lang === 'my' ? 'Google Sheets & Supabase တိုက်ရိုက်ချိတ်ဆက်စနစ်' : 'Google Sheets & Supabase Live Sync'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isConnected 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}>
                  {isConnected ? 'ONLINE & ACTIVE' : 'SETUP NEEDED'}
                </span>
              </h4>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'my' 
                ? 'Customer မှ KPay / WavePay ဖြင့် ဝယ်ယူပြီး Admin က Approve ပေးလိုက်သည်နှင့် Google Sheet ထဲသို့ အလိုအလျောက် ရေးသွင်းပေးမည့် စနစ် (Firebase မလိုပါ)' 
                : 'Auto-logs customer payment details into your Google Sheet via Webhook & Supabase (100% Firebase-free).'}
            </p>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            title="Download CSV for Google Sheets"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{lang === 'my' ? 'CSV ဒေါင်းလုဒ်' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfigModal(!showConfigModal)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
              isConnected 
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{isConnected ? (lang === 'my' ? 'Sheet ဆက်တင်' : 'Sheet Config') : (lang === 'my' ? 'Sheet ချိတ်ဆက်မည်' : 'Connect Sheet')}</span>
          </button>
        </div>
      </div>

      {/* STATUS & QUICK ACTIONS */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-xs font-bold text-slate-300">
              {lang === 'my' ? 'အခြေအနေ:' : 'Status:'}
            </span>
            <span className={`text-xs font-bold font-mono ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isConnected 
                ? (lang === 'my' ? 'Google Sheet သို့ အလိုအလျောက် ပို့ရန် အသင့်ဖြစ်နေပါပြီ' : 'Connected & Auto-Sync Active') 
                : (lang === 'my' ? 'Webhook URL ထည့်သွင်းရန် လိုအပ်ပါသည်' : 'Webhook URL Not Configured')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {sheetConfig.spreadsheetUrl ? (
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>{lang === 'my' ? 'Google Sheet ဖွင့်မည်' : 'Open Sheet'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}

            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? (lang === 'my' ? 'ပို့နေသည်...' : 'Syncing...') : (lang === 'my' ? 'မှတ်တမ်းအားလုံး Sheet သို့ပို့မည်' : 'Sync All Records')}</span>
            </button>
          </div>
        </div>

        {/* PILLS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{lang === 'my' ? 'Supabase Database တွင် အမြဲသိမ်းဆည်း' : 'Saved in Supabase Cloud'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{lang === 'my' ? 'Admin Approve နှိပ်သည်နှင့် Google Sheet သို့ ပို့' : 'Auto-Sends upon Admin Approve'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{lang === 'my' ? 'Pop-up Blocker ကင်းလွတ်စွာ အလုပ်လုပ်' : '100% Popup-Free Webhook Sync'}</span>
          </div>
        </div>

        {/* CONFIGURATION DRAWER */}
        {showConfigModal && (
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'my' ? 'Google Sheet Webhook ချိတ်ဆက်မှု ဆက်တင်' : 'Google Sheet Webhook Settings'}</span>
              </span>
              <button
                type="button"
                onClick={handleCopyScript}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? (lang === 'my' ? 'ကုဒ် Copy ကူးပြီး!' : 'Copied!') : (lang === 'my' ? 'Google Sheet Script ကူးမည်' : 'Copy Apps Script')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {lang === 'my' ? 'Google Apps Script Webhook URL (အဓိကချိတ်ဆက်ရန်) *:' : 'Google Apps Script Webhook URL *:'}
                </label>
                <input
                  type="text"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {lang === 'my' ? 'Google Sheet Link / URL (ဖွင့်ကြည့်ရန်အတွက်):' : 'Google Sheet URL (For 1-click open):'}
                </label>
                <input
                  type="text"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* QUICK 3-STEP SETUP GUIDE */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'my' ? 'Google Sheet နှင့် ချိတ်ဆက်နည်း (Buyer Licenses & Payments Dual Tabs Auto Sync):' : 'How to Connect Google Sheet (Dual Tabs for Licenses & Payments):'}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                <li>{lang === 'my' ? 'Google Drive တွင် Google Sheet အသစ်တစ်ခု ဖွင့်ပါ (၎င်း Sheet တွင် "PRO Licenses" နှင့် "Payments" စာမျက်နှာ ၂ ခု အလိုအလျောက် ဖန်တီးပေးပါမည်)' : 'Open a Google Sheet in Google Drive (auto-creates "PRO Licenses" and "Payments" tabs)'}</li>
                <li>{lang === 'my' ? 'အပေါ်ဘက် Menu မှ Extensions > Apps Script ကို နှိပ်ပြီး "Google Sheet Script ကူးမည်" ခလုတ်နှိပ်၍ ရလာသော Code ကို အကုန် Paste လုပ်ပါ' : 'Click Extensions > Apps Script, paste the copied code'}</li>
                <li>{lang === 'my' ? 'ညာဘက်အပေါ်မှ Deploy > New Deployment > Web App (Who has access: "Anyone") ရွေးချယ်ပြီး ရရှိလာသော Web App URL ကို အထက်ပါ Box တွင် ထည့်၍ သိမ်းဆည်းပါ' : 'Click Deploy > New Deployment > Web App (Access: Anyone), copy the Web App URL and paste above!'}</li>
              </ol>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !webhookInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <span>{isTesting ? (lang === 'my' ? 'စမ်းသပ်နေသည်...' : 'Testing...') : (lang === 'my' ? 'ချိတ်ဆက်မှု စမ်းသပ်မည် (Test Ping)' : 'Test Connection')}</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  {lang === 'my' ? 'ပိတ်မည်' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  {lang === 'my' ? 'သိမ်းဆည်းမည် (Save)' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
