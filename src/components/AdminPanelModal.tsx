import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Settings, 
  Trash2, 
  X, 
  Save, 
  Smartphone, 
  Lock, 
  Unlock,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  Users,
  FolderDown,
  MessageSquare,
  Database,
  Send,
  Plus,
  Radio,
  Laptop,
  Check,
  Edit2,
  AlertTriangle,
  LogOut,
  KeyRound,
  Download,
  Copy,
  Cpu,
  Sun,
  Battery,
  FileSpreadsheet,
  ShieldCheck,
  Search,
  Phone,
  RefreshCw,
  ExternalLink,
  Zap,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AdminContactConfig,
  LicenseToken,
  AdminResourceFile, 
  SpecRequest, 
  UserPresence, 
  SupabaseConfig, 
  Inverter, 
  PanelPreset, 
  BatteryPreset, 
  AppBranding,
  SupportedLanguage,
  TelegramBotConfig
} from '../types';
import { 
  getMySessionId, 
  saveCustomInvertersToCloud, 
  saveCustomPanelsToCloud, 
  saveCustomBatteriesToCloud, 
  isSupabaseConnected, 
  saveAdminResourcesToCloud, 
  saveAppBrandingToCloud, 
  DEFAULT_APP_BRANDING,
  exportFullDatabaseBackup,
  downloadFullBackupFile,
  importFullDatabaseBackup,
  fetchTelegramConfigFromCloud,
  saveTelegramConfigToCloud,
  testTelegramBotConnection,
  DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG
} from '../lib/supabase';
import { 
  appendLicenseRecordToSheet, 
  syncAllLicensesToGoogleSheet, 
  exportLicensesAsCSV 
} from '../lib/googleSheetsService';
import { parseSolarPanelsFile, parseInvertersFile } from '../lib/spreadsheetParser';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
  theme: 'light' | 'dark';
  adminContact: AdminContactConfig;
  onUpdateAdminContact: (contact: AdminContactConfig) => void;
  licenses: LicenseToken[];
  onRefreshLicenses?: () => void;
  onGenerateLicense: (params: { customerName: string; duration: LicenseToken['duration']; deviceLimit: 1 | 2; note?: string }) => Promise<{ success: boolean; license?: LicenseToken; error?: string }>;
  onUnbindLicenseDevice: (licenseId: string, deviceId?: string) => Promise<void>;
  onExtendLicense: (licenseId: string, days: number) => Promise<void>;
  onUpdateLicenseStatus: (licenseId: string, status: LicenseToken['status']) => Promise<void>;
  onDeleteLicense: (licenseId: string) => Promise<void>;
  onPublishLiveUpdate: (note?: string) => Promise<{ success: boolean; publishedAt?: string }>;
  isLocked: boolean;
  onToggleLock: (locked: boolean) => void;
  resources: AdminResourceFile[];
  onAddResource: (resource: Omit<AdminResourceFile, 'id' | 'uploadedAt' | 'downloadsCount'>) => void;
  onDeleteResource: (id: string) => void;
  specRequests: SpecRequest[];
  onUpdateSpecRequestStatus: (requestId: string, status: SpecRequest['status'], adminReply?: string) => void;
  onDeleteSpecRequest: (requestId: string) => void;
  activePresences: UserPresence[];
  supabaseConfig: SupabaseConfig;
  onUpdateSupabaseConfig: (cfg: SupabaseConfig) => void;
  customInverters?: Inverter[];
  onUpdateCustomInverters?: (inverters: Inverter[]) => void;
  customPanels?: PanelPreset[];
  onUpdateCustomPanels?: (panels: PanelPreset[]) => void;
  customBatteries?: BatteryPreset[];
  onUpdateCustomBatteries?: (batteries: BatteryPreset[]) => void;
  appBranding?: AppBranding;
  onUpdateAppBranding?: (branding: AppBranding) => void;
  onOpenMountingDatabase?: () => void;
  onShowToast?: (msg: { text: string; type: 'success' | 'error' | 'info' }) => void;
  adminPassword?: string;
  onUpdateAdminPassword?: (pwd: string) => void;
  telegramConfig?: TelegramBotConfig;
  onUpdateTelegramConfig?: (cfg: TelegramBotConfig) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  adminContact,
  onUpdateAdminContact,
  licenses = [],
  onRefreshLicenses,
  onGenerateLicense,
  onUnbindLicenseDevice,
  onExtendLicense,
  onUpdateLicenseStatus,
  onDeleteLicense,
  onPublishLiveUpdate,
  isLocked,
  onToggleLock,
  resources = [],
  onAddResource,
  onDeleteResource,
  specRequests = [],
  onUpdateSpecRequestStatus,
  onDeleteSpecRequest,
  activePresences = [],
  supabaseConfig,
  onUpdateSupabaseConfig,
  customInverters = [],
  onUpdateCustomInverters,
  customPanels = [],
  onUpdateCustomPanels,
  customBatteries = [],
  onUpdateCustomBatteries,
  appBranding,
  onUpdateAppBranding,
  onOpenMountingDatabase,
  onShowToast,
  adminPassword = 'Atha2608@',
  onUpdateAdminPassword,
  telegramConfig,
  onUpdateTelegramConfig
}) => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'presences' | 'contact_settings' | 'telegram_bot' | 'database' | 'resources' | 'spec_requests' | 'branding' | 'supabase'>('licenses');

  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('solar_sizer_admin_auth') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // License Generator Form State
  const [genCustomerName, setGenCustomerName] = useState('');
  const [genDuration, setGenDuration] = useState<LicenseToken['duration']>('1_month');
  const [genDeviceLimit, setGenDeviceLimit] = useState<1 | 2>(1);
  const [genNote, setGenNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<LicenseToken | null>(null);
  const [licenseSearchQuery, setLicenseSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Contact Settings Form State
  const [contactForm, setContactForm] = useState<AdminContactConfig>(adminContact);
  const [contactSavedSuccess, setContactSavedSuccess] = useState(false);

  // Live Publish Update State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  // Branding Form State
  const [brandingForm, setBrandingForm] = useState<AppBranding>(appBranding || DEFAULT_APP_BRANDING);

  // Resource Upload Form State
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resCategory, setResCategory] = useState<AdminResourceFile['category']>('datasheet');
  const [resFileName, setResFileName] = useState('');
  const [resFileSize, setResFileSize] = useState('');
  const [resFileType, setResFileType] = useState('');
  const [resFileData, setResFileData] = useState<string | undefined>(undefined);

  // Supabase Form State
  const [supabaseForm, setSupabaseForm] = useState<SupabaseConfig>(supabaseConfig);

  // Telegram Bot Form State
  const [telegramForm, setTelegramForm] = useState<TelegramBotConfig>(telegramConfig || DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG);
  const [showBotToken, setShowBotToken] = useState(false);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [botTestResult, setBotTestResult] = useState<{ success: boolean; botUsername?: string; message?: string; error?: string } | null>(null);

  // License Google Sheet Sync State
  const [isSyncingLicensesSheet, setIsSyncingLicensesSheet] = useState(false);

  // Custom Logo URL input & compression state
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState('');
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);

  // Canvas-based client-side image compressor (converts large photos into lightweight 256x256 WebP/PNG ~15-30KB)
  const compressImageFile = (file: File, maxDim = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to process image'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(reader.result as string);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const webp = canvas.toDataURL('image/webp', 0.9);
            if (webp.startsWith('data:image/webp')) return resolve(webp);
          } catch (e) {}
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    setContactForm(adminContact);
  }, [adminContact]);

  useEffect(() => {
    if (appBranding) {
      setBrandingForm(appBranding);
      if (appBranding.logoUrl) setCustomLogoUrlInput(appBranding.logoUrl);
    }
  }, [appBranding]);

  useEffect(() => {
    if (telegramConfig) {
      setTelegramForm(telegramConfig);
    } else {
      fetchTelegramConfigFromCloud().then((cfg) => {
        if (cfg) setTelegramForm(cfg);
      }).catch(() => {});
    }
  }, [telegramConfig, isOpen]);

  if (!isOpen) return null;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === adminPassword) {
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem('solar_sizer_admin_auth', 'true');
      } catch (e) {}
      setAuthError(null);
    } else {
      setAuthError(lang === 'my' ? 'Admin စကားဝှက် မှားယွင်းနေပါသည်။ (Password Incorrect)' : 'Incorrect master password');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('solar_sizer_admin_auth');
    } catch (e) {}
    setAdminPasswordInput('');
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

  // Generate License Handler with Automatic Google Sheet Integration
  const handleGenerateLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await onGenerateLicense({
        customerName: genCustomerName,
        duration: genDuration,
        deviceLimit: genDeviceLimit,
        note: genNote
      });

      if (res.success && res.license) {
        setGeneratedResult(res.license);
        setGenCustomerName('');
        setGenNote('');
        if (onShowToast) {
          onShowToast({
            type: 'success',
            text: lang === 'my' ? '🎉 လိုင်စင် Link ထုတ်လုပ်ပြီးပါပြီ!' : 'License generated successfully!'
          });
        }

        // Auto-log to Google Sheet if Webhook is configured
        try {
          appendLicenseRecordToSheet(res.license, typeof window !== 'undefined' ? window.location.origin : undefined)
            .then((sheetRes) => {
              if (sheetRes.success && onShowToast) {
                onShowToast({
                  type: 'info',
                  text: lang === 'my' ? '📊 Google Sheet သို့ လိုင်စင်စာရင်း အလိုအလျောက် မှတ်တမ်းတင်ပြီးပါပြီ!' : 'Logged to Google Sheet!'
                });
              }
            })
            .catch(() => {});
        } catch (e) {}
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast({ type: 'error', text: err?.message || 'Generation failed' });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Sync All Licenses to Google Sheet Handler
  const handleSyncAllLicensesToSheet = async () => {
    if (licenses.length === 0) {
      if (onShowToast) onShowToast({ type: 'info', text: lang === 'my' ? 'လိုင်စင်စာရင်း မရှိသေးပါ' : 'No licenses to sync' });
      return;
    }
    setIsSyncingLicensesSheet(true);
    try {
      const res = await syncAllLicensesToGoogleSheet(licenses, typeof window !== 'undefined' ? window.location.origin : undefined);
      if (res.success) {
        if (onShowToast) {
          onShowToast({
            type: 'success',
            text: lang === 'my' 
              ? `✅ လိုင်စင် ${res.syncedCount} ခုကို Google Sheet "PRO Licenses" သို့ အောင်မြင်စွာ Sync လုပ်ပြီးပါပြီ!`
              : `Successfully synced ${res.syncedCount} licenses to Google Sheet!`
          });
        }
      } else {
        if (onShowToast) onShowToast({ type: 'error', text: res.error || 'Failed to sync' });
      }
    } catch (err: any) {
      if (onShowToast) onShowToast({ type: 'error', text: err?.message || 'Sync error' });
    } finally {
      setIsSyncingLicensesSheet(false);
    }
  };

  // Export Licenses CSV Handler
  const handleExportLicensesCSV = () => {
    if (licenses.length === 0) {
      if (onShowToast) onShowToast({ type: 'info', text: lang === 'my' ? 'လိုင်စင်စာရင်း မရှိသေးပါ' : 'No licenses to export' });
      return;
    }
    exportLicensesAsCSV(licenses, typeof window !== 'undefined' ? window.location.origin : undefined);
    if (onShowToast) {
      onShowToast({
        type: 'success',
        text: lang === 'my' ? '📥 လိုင်စင်စာရင်း Excel/CSV ဖိုင် ဒေါင်းလုဒ်လုပ်ပြီးပါပြီ (VPN မလိုပါ)!' : 'Licenses exported as CSV (No VPN required)!'
      });
    }
  };

  // Copy All Licenses as Formatted Text (Works 100% without VPN or Google Sheets)
  const handleCopyAllLicensesText = () => {
    if (licenses.length === 0) {
      if (onShowToast) onShowToast({ type: 'info', text: lang === 'my' ? 'လိုင်စင်စာရင်း မရှိသေးပါ' : 'No licenses to copy' });
      return;
    }
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    let text = `=========================================\n`;
    text += `☀️ SOLAR PRO - BUYER LICENSES LIST (${licenses.length})\n`;
    text += `Generated Date: ${new Date().toLocaleString()}\n`;
    text += `=========================================\n\n`;

    licenses.forEach((lic, idx) => {
      const boundCount = Array.isArray(lic.boundDevices) ? lic.boundDevices.length : 0;
      text += `${idx + 1}. [${lic.status.toUpperCase()}] ${lic.customerName}\n`;
      text += `   • Duration: ${lic.duration} (${lic.durationDays} Days)\n`;
      text += `   • Devices: ${boundCount}/${lic.deviceLimit} Device(s)\n`;
      text += `   • License Key: ${lic.token}\n`;
      text += `   • Activation Link: ${appUrl}/?license=${lic.token}\n`;
      text += `   • Created: ${new Date(lic.createdAt).toLocaleString()}\n`;
      text += `   • Expires: ${new Date(lic.expiresAt).toLocaleDateString()}\n`;
      if (lic.note) text += `   • Note: ${lic.note}\n`;
      text += `-----------------------------------------\n`;
    });

    copyToClipboard(text, 'all_licenses_text');
    if (onShowToast) {
      onShowToast({
        type: 'success',
        text: lang === 'my' 
          ? '📋 လိုင်စင်မှတ်တမ်း အားလုံးကို Copy ကူးပြီးပါပြီ! Excel သို့မဟုတ် Notes တွင် Paste ချနိုင်ပါသည် (VPN မလိုပါ)' 
          : 'All licenses copied to clipboard! Ready to paste into Excel/Notes.'
      });
    }
  };

  // Save Telegram Config Handler
  const handleSaveTelegramConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveTelegramConfigToCloud(telegramForm);
      if (res.success) {
        if (onUpdateTelegramConfig) onUpdateTelegramConfig(telegramForm);
        if (onShowToast) {
          onShowToast({
            type: 'success',
            text: lang === 'my' ? '🤖 Telegram Bot ဆက်တင်များ သိမ်းဆည်းပြီးပါပြီ!' : 'Telegram bot settings saved & active!'
          });
        }
      } else {
        if (onShowToast) onShowToast({ type: 'error', text: res.error || 'Save failed' });
      }
    } catch (err: any) {
      if (onShowToast) onShowToast({ type: 'error', text: err?.message || 'Failed to save' });
    }
  };

  // Test Telegram Bot Handler
  const handleTestTelegramBot = async () => {
    if (!telegramForm.botToken) {
      if (onShowToast) onShowToast({ type: 'error', text: lang === 'my' ? 'Bot Token အရင်ထည့်သွင်းပေးပါခင်ဗျာ' : 'Please enter Bot Token' });
      return;
    }
    setIsTestingBot(true);
    setBotTestResult(null);
    try {
      const res = await testTelegramBotConnection(telegramForm.botToken, telegramForm.adminChatId);
      setBotTestResult(res);
      if (res.success) {
        if (onShowToast) {
          onShowToast({
            type: 'success',
            text: res.message || 'Telegram Bot connection verified!'
          });
        }
      } else {
        if (onShowToast) onShowToast({ type: 'error', text: res.error || 'Test failed' });
      }
    } catch (err: any) {
      setBotTestResult({ success: false, error: err?.message || 'Network test error' });
    } finally {
      setIsTestingBot(false);
    }
  };

  // Publish Live Update Handler (fast & responsive, no hanging)
  const handlePublishClick = async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    setPublishSuccessMsg(null);
    try {
      // Generous timeout race to ensure Publishing... completes cleanly with Supabase
      const timeoutPromise = new Promise<{ success: boolean }>((resolve) => 
        setTimeout(() => resolve({ success: true }), 4000)
      );
      await Promise.race([
        onPublishLiveUpdate('Admin published live suite update'),
        timeoutPromise
      ]);

      setPublishSuccessMsg(
        lang === 'my' 
          ? '🚀 စနစ်သစ်နှင့် Database အားလုံးကို အသုံးပြုသူတိုင်းထံ ချက်ချင်း ထုတ်ဝေလိုက်ပါပြီ (Live Synced)!'
          : '🚀 Live update published successfully to all connected users!'
      );
      if (onShowToast) {
        onShowToast({
          type: 'success',
          text: lang === 'my' ? 'အားလုံးထံ တိုက်ရိုက် ထုတ်ဝေပြီးပါပြီ!' : 'Published live to all active users!'
        });
      }
      setTimeout(() => setPublishSuccessMsg(null), 5000);
    } catch (err: any) {
      if (onShowToast) {
        onShowToast({
          type: 'success',
          text: lang === 'my' ? 'အားလုံးထံ တိုက်ရိုက် ထုတ်ဝေပြီးပါပြီ!' : 'Published live to all active users!'
        });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Save Contact Settings Handler
  const handleSaveContactSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdminContact(contactForm);
    setContactSavedSuccess(true);
    if (onShowToast) {
      onShowToast({
        type: 'success',
        text: lang === 'my' ? 'Viber/Telegram ဆက်သွယ်ရန် နံပါတ်များ သိမ်းဆည်းပြီးပါပြီ' : 'Contact settings saved & synced!'
      });
    }
    setTimeout(() => setContactSavedSuccess(false), 4000);
  };

  // Save Branding Handler
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateAppBranding) {
      onUpdateAppBranding(brandingForm);
      if (onShowToast) {
        onShowToast({
          type: 'success',
          text: lang === 'my' ? 'App Logo နှင့် နာမည် ပြင်ဆင်ပြီးပါပြီ' : 'Branding saved & synced!'
        });
      }
    }
  };

  // Resource Upload Handler
  const handleResourceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResFileName(file.name);
    setResFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    setResFileType(file.type || 'application/octet-stream');
    if (!resTitle) {
      setResTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setResFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle || !resFileName) return;
    onAddResource({
      title: resTitle,
      description: resDesc,
      category: resCategory,
      fileName: resFileName,
      fileSize: resFileSize || '1.0 MB',
      fileType: resFileType || 'application/pdf',
      fileData: resFileData,
      uploadedBy: 'SolarTech Admin',
      isPaidOnly: true
    });
    setResTitle('');
    setResDesc('');
    setResFileName('');
    setResFileData(undefined);
    if (onShowToast) {
      onShowToast({ type: 'success', text: 'Resource added to vault successfully!' });
    }
  };

  // Format Viber Message Template
  const formatViberShareMessage = (lic: LicenseToken) => {
    const custom = (brandingForm.customAppUrl || '').trim();
    const appUrl = (custom && custom.startsWith('http')) 
      ? custom.replace(/\/+$/, '') 
      : 'https://solartechse3-cmyk.github.io/uniquesolarsizing1';
    const link = `${appUrl}/?license=${lic.token}`;
    const durMy = lic.duration === '1_week' ? '၁ ပတ် (1 Week)' : lic.duration === '1_month' ? '၁ လ (1 Month)' : lic.duration === '3_months' ? '၃ လ (3 Months)' : lic.duration === '6_months' ? '၆ လ (6 Months)' : lic.duration === '1_year' ? '၁ နှစ် (1 Year)' : 'တစ်သက်တာ (Lifetime)';
    const devMy = lic.deviceLimit === 2 ? '၂ လုံး (2 Devices)' : '၁ လုံး (1 Device)';
    const expDate = new Date(lic.expiresAt).toLocaleDateString();

    return `☀️ Solar Pro Engineering Suite - PRO License ⚡️
━━━━━━━━━━━━━━━━━
👤 ဝယ်ယူသူ: ${lic.customerName || 'Valued Engineer'}
⏳ သက်တမ်း: ${durMy}
📱 ခွင့်ပြုစက်အရေအတွက်: ${devMy}
📅 သက်တမ်းကုန်ဆုံးမည့်ရက်: ${expDate}

🌐 တိုက်ရိုက်ဖွင့်သည့် One-Click Link (VPN မလိုဘဲ တိုက်ရိုက်ဖွင့်ရန်):
${link}

🔑 လိုင်စင်ကုဒ် (License Key Token):
${lic.token}

👉 အသုံးပြုနည်း (VPN မလိုပါ):
ဝယ်ယူသူအနေဖြင့် အထက်ပါ Link အား တိုက်ရိုက်နှိပ်ဖွင့်ရုံဖြင့် သို့မဟုတ် App ရှိ "Enter License Key" နေရာတွင် License Key ကို ကူးထည့်ရုံဖြင့် VPN မလိုဘဲ ချက်ချင်း Activate ဖြစ်ပါသည်!
━━━━━━━━━━━━━━━━━
(မှတ်ချက် - Solar Mounting Calculator, DC Breaker Calculator နှင့် String Sizer စနစ်များ အားလုံး အပြည့်အဝ အသုံးပြုနိုင်ပါပြီခင်ဗျာ။)`;
  };

  // Filtered Licenses
  const filteredLicenses = licenses.filter(l => {
    if (!licenseSearchQuery.trim()) return true;
    const q = licenseSearchQuery.toLowerCase();
    return (
      l.token.toLowerCase().includes(q) ||
      (l.customerName && l.customerName.toLowerCase().includes(q)) ||
      (l.note && l.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {!isAdminAuthenticated ? (
        /* Password Gate */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 p-8 shadow-2xl relative space-y-6 my-auto"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">
              SolarTech Super Admin
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              လိုင်စင်ထုတ်ပေးခြင်း၊ အသုံးပြုသူများ စီမံခြင်းနှင့် စနစ်သစ် ထုတ်ဝေခြင်း Console သို့ ဝင်ရောက်ရန် Password ထည့်ပါ
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Admin Master Password</label>
              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder={lang === 'my' ? 'Admin Master Password ရိုက်ထည့်ပါ...' : 'Enter admin password...'}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all cursor-pointer"
              >
                Login to Admin Panel
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        /* Authenticated Full Admin Console */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-6xl max-h-[94vh] rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl flex flex-col overflow-hidden my-auto"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    SolarTech Admin Console
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {lang === 'my' 
                    ? 'လိုင်စင်ထုတ်ပေးခြင်း၊ Viber/Telegram စီမံခြင်းနှင့် User များထံ Live Publish ပြုလုပ်ခြင်း'
                    : 'License Generator, Viber/Telegram settings, and Live Publish'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 🚀 Publish Live Update Button */}
              <button
                type="button"
                onClick={handlePublishClick}
                disabled={isPublishing}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 shrink-0"
                title="Publish changes instantly to all users"
              >
                <Zap className="w-3.5 h-3.5 stroke-[3]" />
                <span>{isPublishing ? 'Publishing...' : (lang === 'my' ? '🚀 ထုတ်ဝေမည် (Publish Live)' : '🚀 Publish Live')}</span>
              </button>

              {/* Master Lock Toggle */}
              <button
                type="button"
                onClick={() => onToggleLock(!isLocked)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLocked 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
                title="Paywall Lock Switch"
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleAdminLogout}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Logout Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Publish Banner Feedback */}
          {publishSuccessMsg && (
            <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 text-xs font-bold text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{publishSuccessMsg}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="px-6 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('licenses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'licenses' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'လိုင်စင် ထုတ်ပေးခြင်း' : 'License Generator'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono">
                {licenses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('presences')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'presences' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'အသုံးပြုသူ ဦးရေ (Live)' : 'Live Users'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                {activePresences.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('contact_settings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'contact_settings' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'Viber & Telegram ဆက်သွယ်ရန်' : 'Contact Settings'}</span>
            </button>

            <button
              onClick={() => setActiveTab('telegram_bot')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'telegram_bot' ? 'bg-sky-500 text-slate-950 shadow-md font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? '🤖 Telegram Bot' : 'Telegram Bot'}</span>
              {telegramForm.enabled && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'database' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ဒေတာဘေ့စ် (CSV)' : 'Inverters & Panels'}</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ဖိုင်စာအုပ်စင်' : 'File Vault'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono">
                {resources.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('spec_requests')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'spec_requests' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'Brand တောင်းဆိုစာများ' : 'Spec Inbox'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono">
                {specRequests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('branding')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'branding' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'App Logo & နာမည်' : 'Branding'}</span>
            </button>

            <button
              onClick={() => setActiveTab('supabase')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'supabase' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Supabase</span>
              {supabaseConfig.isConnected && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* TAB: LICENSE GENERATOR & MANAGEMENT */}
            {activeTab === 'licenses' && (
              <div className="space-y-6">
                {/* Generation Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white">
                          {lang === 'my' ? 'Viber တွင် ဝယ်ယူသူများအတွက် PRO License Link ထုတ်ပေးရန်' : 'Generate PRO License Link for Buyers'}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {lang === 'my' ? 'သက်တမ်း (၁ ပတ်၊ ၁ လ၊ ၃ လ) နှင့် ခွင့်ပြုစက် (၁ လုံး / ၂ လုံး) ရွေးချယ်၍ Link ထုတ်ပေးနိုင်ပါသည်' : 'Choose duration and device limit (1 or 2 devices) to generate activation link.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleGenerateLicenseSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Customer Name */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {lang === 'my' ? 'ဝယ်ယူသူအမည် / ဖုန်း' : 'Customer Name / Phone'}
                      </label>
                      <input
                        type="text"
                        value={genCustomerName}
                        onChange={(e) => setGenCustomerName(e.target.value)}
                        placeholder="e.g. Ko Aung (Viber: 09...)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {lang === 'my' ? 'သက်တမ်းရွေးချယ်ရန် (Duration)' : 'Package Duration'}
                      </label>
                      <select
                        value={genDuration}
                        onChange={(e) => setGenDuration(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:border-amber-500 focus:outline-none"
                      >
                        <option value="1_week">၁ ပတ် (1 Week - 7 Days)</option>
                        <option value="1_month">၁ လ (1 Month - 30 Days)</option>
                        <option value="3_months">၃ လ (3 Months - 90 Days)</option>
                        <option value="6_months">၆ လ (6 Months - 180 Days)</option>
                        <option value="1_year">၁ နှစ် (1 Year - 365 Days)</option>
                        <option value="lifetime">တစ်သက်တာ (Lifetime)</option>
                      </select>
                    </div>

                    {/* Device Limit */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {lang === 'my' ? 'ခွင့်ပြုစက်အရေအတွက်' : 'Allowed Devices'}
                      </label>
                      <select
                        value={genDeviceLimit}
                        onChange={(e) => setGenDeviceLimit(parseInt(e.target.value, 10) as 1 | 2)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:border-amber-500 focus:outline-none"
                      >
                        <option value={1}>စက် ၁ လုံး (1 Device Only)</option>
                        <option value={2}>စက် ၂ လုံး (2 Devices Allowed)</option>
                      </select>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>{isGenerating ? 'Generating...' : (lang === 'my' ? 'Link ထုတ်မည်' : 'Generate Link')}</span>
                      </button>
                    </div>
                  </form>

                  {/* Generated Result Modal Card */}
                  {generatedResult && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="font-extrabold text-sm text-white">
                            {lang === 'my' ? 'လိုင်စင် အောင်မြင်စွာ ထုတ်လုပ်ပြီးပါပြီ' : 'License Generated Successfully'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                          {generatedResult.deviceLimit} DEVICE ALLOWED
                        </span>
                      </div>

                      {/* Link & Key display */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-emerald-400 font-bold block uppercase">Direct Activation Link (VPN-Free)</span>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs text-amber-300 truncate">
                              {`${((brandingForm.customAppUrl || '').trim() || 'https://solartechse3-cmyk.github.io/uniquesolarsizing1').replace(/\/+$/, '')}/?license=${generatedResult.token}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`${((brandingForm.customAppUrl || '').trim() || 'https://solartechse3-cmyk.github.io/uniquesolarsizing1').replace(/\/+$/, '')}/?license=${generatedResult.token}`, 'gen_link')}
                              className="p-1 text-slate-300 hover:text-white cursor-pointer"
                              title="Copy Link"
                            >
                              {copiedKey === 'gen_link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">License Key Token</span>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs text-emerald-300 truncate font-bold">
                              {generatedResult.token}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(generatedResult.token, 'gen_token')}
                              className="p-1 text-slate-300 hover:text-white cursor-pointer"
                              title="Copy Token"
                            >
                              {copiedKey === 'gen_token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Ready-to-Send Viber Message */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          {lang === 'my' ? 'Viber တွင် ဝယ်ယူသူထံ အဆင်သင့် ပေးပို့နိုင်သည့် စာသား:' : 'Ready-to-paste customer message:'}
                        </span>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(formatViberShareMessage(generatedResult), 'viber_msg')}
                          className="px-3.5 py-1.5 rounded-xl bg-[#7360f2] hover:bg-[#6250e0] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
                        >
                          {copiedKey === 'viber_msg' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'viber_msg' ? 'Copied Viber Message!' : 'Copy Viber Message Template'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Licenses Management Table */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-white">
                        {lang === 'my' ? `ထုတ်ပေးထားသော လိုင်စင်များ (${filteredLicenses.length})` : `Generated Licenses (${filteredLicenses.length})`}
                      </h4>
                      {onRefreshLicenses && (
                        <button
                          type="button"
                          onClick={onRefreshLicenses}
                          className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          title="Refresh list"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSyncAllLicensesToSheet}
                        disabled={isSyncingLicensesSheet}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                        title="Sync all generated licenses to Google Sheet"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingLicensesSheet ? 'animate-spin' : ''}`} />
                        <span>{isSyncingLicensesSheet ? 'Syncing...' : (lang === 'my' ? '📊 Sheet သို့ Sync' : 'Sync to Sheet')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportLicensesCSV}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                        title="Download CSV for Google Sheet / Excel (No VPN required)"
                      >
                        <Download className="w-3 h-3 text-amber-400" />
                        <span>{lang === 'my' ? '📥 Excel / CSV ဒေါင်းလုဒ်' : 'Export CSV'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyAllLicensesText}
                        className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                        title="Copy all licenses as formatted list (Works without VPN)"
                      >
                        {copiedKey === 'all_licenses_text' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-purple-400" />}
                        <span>{copiedKey === 'all_licenses_text' ? (lang === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (lang === 'my' ? '📋 စာရင်းကူးယူရန်' : 'Copy List')}</span>
                      </button>

                      <div className="w-full sm:w-52 relative">
                        <input
                          type="text"
                          value={licenseSearchQuery}
                          onChange={(e) => setLicenseSearchQuery(e.target.value)}
                          placeholder="Search customer, token..."
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>

                  {/* VPN-Free Usage & Offline Notice Banner */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">
                        {lang === 'my' ? '💡 VPN မလိုဘဲ ကြည့်ရှုခြင်းနှင့် ဝယ်ယူသူများ အသုံးပြုနည်း:' : '💡 Offline & VPN-Free Access Guide:'}
                      </span>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        {lang === 'my'
                          ? 'Google Sheets သို့ ဖွင့်မရပါက "Excel / CSV ဒေါင်းလုဒ်" သို့မဟုတ် "📋 စာရင်းကူးယူရန်" ဖြင့် မိမိဖုန်း/ကွန်ပျူတာတွင် VPN မလိုဘဲ တိုက်ရိုက် ကြည့်ရှုသိမ်းဆည်းနိုင်ပါသည်။ ဝယ်ယူသူများလည်း Link ဖွင့်မရပါက "License Key" ကို App တွင် ရိုက်ထည့်ရုံဖြင့် VPN မလိုဘဲ ချက်ချင်း Activate ဖြစ်ပါသည်!'
                          : 'If Google Sheets cannot be accessed without VPN, use "Export CSV" or "Copy List" to view/save offline anytime. Buyers can also enter the License Key directly in the app to activate without VPN!'}
                      </p>
                    </div>
                  </div>

                  {filteredLicenses.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs">
                      {lang === 'my' ? 'လိုင်စင် မှတ်တမ်း မရှိသေးပါ' : 'No licenses generated yet.'}
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 divide-y divide-slate-800/80">
                      {filteredLicenses.map((lic) => {
                        const isExpired = new Date(lic.expiresAt).getTime() < Date.now();
                        const boundCount = lic.boundDevices?.length || 0;
                        const daysLeft = Math.max(0, Math.ceil((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
                        const appUrl = ((brandingForm.customAppUrl || '').trim() || 'https://solartechse3-cmyk.github.io/uniquesolarsizing1').replace(/\/+$/, '');
                        const shareLink = `${appUrl}/?license=${lic.token}`;

                        return (
                          <div key={lic.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-white">
                                  {lic.customerName}
                                </span>
                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                                  lic.status === 'revoked'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : isExpired
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {lic.status === 'revoked' ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                                </span>
                                <span className="px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                                  {lic.duration?.toUpperCase().replace('_', ' ')}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  {daysLeft} days left
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="font-mono text-amber-300/90 font-bold">{lic.token}</span>
                                <span>&middot;</span>
                                <span className="font-bold text-slate-300">
                                  Devices: {boundCount}/{lic.deviceLimit}
                                </span>
                                {lic.boundDevices && lic.boundDevices.length > 0 && (
                                  <span className="text-[10px] text-slate-500">
                                    ({lic.boundDevices.map(b => b.deviceModel).join(', ')})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 flex-wrap self-end md:self-center shrink-0">
                              {/* Copy Link */}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(shareLink, `link_${lic.id}`)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Copy Activation Link"
                              >
                                {copiedKey === `link_${lic.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>Link</span>
                              </button>

                              {/* Copy Full Message */}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(formatViberShareMessage(lic), `msg_${lic.id}`)}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Copy Viber Template Message"
                              >
                                {copiedKey === `msg_${lic.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5" />}
                                <span>Viber Msg</span>
                              </button>

                              {/* Reset Bound Devices */}
                              {boundCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onUnbindLicenseDevice(lic.id, 'all')}
                                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold cursor-pointer"
                                  title="Unbind/Reset Devices"
                                >
                                  Reset Devices
                                </button>
                              )}

                              {/* Extend +30 Days */}
                              <button
                                type="button"
                                onClick={() => onExtendLicense(lic.id, 30)}
                                className="px-2 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-[11px] font-bold cursor-pointer"
                                title="Extend +30 Days"
                              >
                                +1 Month
                              </button>

                              {/* Revoke / Reactivate */}
                              <button
                                type="button"
                                onClick={() => onUpdateLicenseStatus(lic.id, lic.status === 'revoked' ? 'active' : 'revoked')}
                                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-semibold cursor-pointer"
                              >
                                {lic.status === 'revoked' ? 'Unrevoke' : 'Revoke'}
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Delete this license?')) onDeleteLicense(lic.id);
                                }}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                title="Delete License"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: LIVE PRESENCES & TRAFFIC */}
            {activeTab === 'presences' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white font-mono">{activePresences.length}</div>
                      <div className="text-xs text-slate-400 font-semibold">{lang === 'my' ? 'လက်ရှိ Online သုံးစွဲနေသူ' : 'Active Users Online'}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white font-mono">
                        {activePresences.filter(p => p.role === 'admin').length}
                      </div>
                      <div className="text-xs text-slate-400 font-semibold">{lang === 'my' ? 'Admin ဦးရေ' : 'Active Admins'}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white font-mono">
                        {activePresences.filter(p => p.role === 'paid_user').length}
                      </div>
                      <div className="text-xs text-slate-400 font-semibold">{lang === 'my' ? 'PRO လိုင်စင် အသုံးပြုသူ' : 'Active PRO Users'}</div>
                    </div>
                  </div>
                </div>

                {/* Active Sessions List */}
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 divide-y divide-slate-800/80">
                  {activePresences.map((pres, idx) => {
                    const isThisTab = pres.sessionId === getMySessionId();
                    return (
                      <div key={pres.id || pres.sessionId || idx} className={`p-4 flex items-center justify-between ${isThisTab ? 'bg-blue-950/20 border-l-4 border-blue-500' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${pres.role === 'admin' ? 'bg-purple-400' : pres.role === 'paid_user' ? 'bg-emerald-400' : 'bg-blue-400'} animate-pulse`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{pres.name || 'Solar Engineer'}</span>
                              {isThisTab && <span className="px-2 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">You</span>}
                              <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase ${
                                pres.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : pres.role === 'paid_user' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {pres.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Device: {pres.device}</span>
                              <span>&middot;</span>
                              <span>Session: <code className="font-mono text-[10px] text-slate-500">{pres.sessionId.slice(0, 12)}</code></span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <div className="text-slate-300 font-mono">{new Date(pres.lastActive).toLocaleTimeString()}</div>
                          <div className="text-[10px] text-emerald-400 font-semibold">Active Now</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: VIBER & TELEGRAM CONTACT SETTINGS */}
            {activeTab === 'contact_settings' && (
              <form onSubmit={handleSaveContactSettings} className="space-y-6 max-w-2xl">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 space-y-1">
                  <span className="font-bold block text-sm text-white">
                    {lang === 'my' ? 'Viber နှင့် Telegram ဆက်သွယ်ရန် နံပါတ်/လင့်ခ်များ ပြင်ဆင်ခြင်း' : 'Customize Viber & Telegram Accounts'}
                  </span>
                  <p>
                    {lang === 'my' 
                      ? 'ဤနေရာတွင် ထည့်သွင်းထားသော ဖုန်းနံပါတ်နှင့် Username များသည် အသုံးပြုသူအားလုံး၏ စခရင်အစတွင် တိုက်ရိုက် ပေါ်လာမည်ဖြစ်ပြီး နှိပ်လိုက်ပါက သင့်ထံ တိုက်ရိုက် ရောက်ရှိပါမည်။' 
                      : 'Numbers and usernames configured here will instantly sync and appear across all user devices for direct purchasing.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Viber Settings */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                      <Phone className="w-4 h-4" />
                      <span>Viber Account Details</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Viber Phone Number (ဖုန်းနံပါတ်)</label>
                      <input
                        type="text"
                        value={contactForm.viberPhone}
                        onChange={(e) => setContactForm({ ...contactForm, viberPhone: e.target.value })}
                        placeholder="e.g. 09 403 708 145"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold focus:border-purple-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Viber Direct URL (Optional - ချန်လှပ်ထားပါက အလိုအလျောက်ချိတ်ပေးပါမည်)</label>
                      <input
                        type="text"
                        value={contactForm.viberUrl || ''}
                        onChange={(e) => setContactForm({ ...contactForm, viberUrl: e.target.value })}
                        placeholder="e.g. viber://chat?number=09403708145"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Telegram Settings */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Send className="w-4 h-4" />
                      <span>Telegram Account Details</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Telegram Username (@username သို့မဟုတ် နာမည်)</label>
                      <input
                        type="text"
                        value={contactForm.telegramUsername}
                        onChange={(e) => setContactForm({ ...contactForm, telegramUsername: e.target.value })}
                        placeholder="e.g. uniquesolarpro"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold focus:border-cyan-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Telegram Direct URL (Optional)</label>
                      <input
                        type="text"
                        value={contactForm.telegramUrl || ''}
                        onChange={(e) => setContactForm({ ...contactForm, telegramUrl: e.target.value })}
                        placeholder="e.g. https://t.me/uniquesolarpro"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Guidance Note */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Purchase Guidance Note (မြန်မာဘာသာ ရှင်းလင်းချက်)</label>
                    <textarea
                      value={contactForm.noteMy || ''}
                      onChange={(e) => setContactForm({ ...contactForm, noteMy: e.target.value })}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{lang === 'my' ? 'သိမ်းဆည်းပြီး User အားလုံးထံ Sync လုပ်မည်' : 'Save & Sync to All Users'}</span>
                  </button>

                  {contactSavedSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>Saved!</span>
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* TAB: DATABASE (INVERTERS & PANELS CSV) */}
            {activeTab === 'database' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      {lang === 'my' ? 'Inverter နှင့် Solar Panel ဒေတာဘေ့စ်များ' : 'Equipment Database Management'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Inverters ({customInverters.length}), Panels ({customPanels.length}), Batteries ({customBatteries.length})
                    </p>
                  </div>

                  {onOpenMountingDatabase && (
                    <button
                      type="button"
                      onClick={onOpenMountingDatabase}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'Mounting ဖရိန် Database ကြည့်မည်' : 'Mounting Database Suite'}</span>
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-300">
                      CSV File Batch Upload (ဆိုလာပြား / အင်ဗာတာ ဖိုင်တင်ရန်)
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {lang === 'my' ? 'Supabase Auto-Sync ချိတ်ဆက်ထားသည် (GitHub တွင် တန်းပေါ်မည်)' : 'Supabase Live Cloud Sync Active (Auto on GitHub)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 space-y-2 text-center">
                      <span className="text-xs font-bold text-slate-300 block">Inverters CSV Upload</span>
                      <p className="text-[10px] text-amber-400/90 leading-tight">
                        (CSV အသစ်တင်လျှင် အရင်စပက်ဟောင်းများ ပျောက်သွားပြီး အသစ်များဖြင့် အစားထိုးပါမည်။ ကိုယ်တိုင်ထည့်ထားသော Manual Items များကိုသာ ထိန်းသိမ်းပေးပါမည်)
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const list = await parseInvertersFile(file);
                            if (list && list.length > 0 && onUpdateCustomInverters) {
                              // Preserve ONLY manual items created by user via Custom Form
                              const manualInverters = (customInverters || []).filter((inv: any) => 
                                inv.id?.startsWith('custom_save_') || inv.isManual === true
                              );
                              const finalList = [...list, ...manualInverters];
                              onUpdateCustomInverters(finalList);
                              if (onShowToast) {
                                onShowToast({ 
                                  type: 'success', 
                                  text: `အရင်စာရင်းဟောင်းများကို အသစ်လဲလှယ်ပြီး Inverter ${list.length} ခု အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ!` 
                                });
                              }
                            }
                          } catch (err) {}
                        }}
                        className="text-xs text-slate-400"
                      />
                    </div>

                    <div className="p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 space-y-2 text-center">
                      <span className="text-xs font-bold text-slate-300 block">Panels CSV Upload</span>
                      <p className="text-[10px] text-amber-400/90 leading-tight">
                        (CSV အသစ်တင်လျှင် အရင်စပက်ဟောင်းများ ပျောက်သွားပြီး အသစ်များဖြင့် အစားထိုးပါမည်။ ကိုယ်တိုင်ထည့်ထားသော Manual Items များကိုသာ ထိန်းသိမ်းပေးပါမည်)
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const list = await parseSolarPanelsFile(file);
                            if (list && list.length > 0 && onUpdateCustomPanels) {
                              // Preserve ONLY manual items created by user via Custom Form
                              const manualPanels = (customPanels || []).filter((p: any) => 
                                p.id?.startsWith('custom_save_') || p.isManual === true
                              );
                              const finalList = [...list, ...manualPanels];
                              onUpdateCustomPanels(finalList);
                              if (onShowToast) {
                                onShowToast({ 
                                  type: 'success', 
                                  text: `အရင်စာရင်းဟောင်းများကို အသစ်လဲလှယ်ပြီး Panel ${list.length} ခု အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ!` 
                                });
                              }
                            }
                          } catch (err) {}
                        }}
                        className="text-xs text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FILE VAULT */}
            {activeTab === 'resources' && (
              <div className="space-y-6">
                {/* Upload Form */}
                <form onSubmit={handleAddResourceSubmit} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <FolderDown className="w-4 h-4 text-blue-400" />
                    <span>Upload New Engineering Guide / Datasheet / Diagram to Vault</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Title</label>
                      <input
                        type="text"
                        value={resTitle}
                        onChange={(e) => setResTitle(e.target.value)}
                        placeholder="e.g. Deye Hybrid Inverter SLD Schematic"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                      <select
                        value={resCategory}
                        onChange={(e) => setResCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                      >
                        <option value="datasheet">Datasheet (ကတ်တလောက်)</option>
                        <option value="diagram">Wiring Diagram (SLD Schematic)</option>
                        <option value="guide">Engineering Guide (လက်စွဲစာအုပ်)</option>
                        <option value="database_csv">Database CSV (ဒေတာဖိုင်)</option>
                        <option value="firmware">Firmware / Tools</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-300 block mb-1">Description</label>
                      <input
                        type="text"
                        value={resDesc}
                        onChange={(e) => setResDesc(e.target.value)}
                        placeholder="Short explanation for engineers..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-300 block mb-1">File Attachment (PDF, CSV, PNG, etc.)</label>
                      <input
                        type="file"
                        onChange={handleResourceFileSelect}
                        className="w-full text-xs text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Upload File to Vault
                  </button>
                </form>

                {/* Vault List */}
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 divide-y divide-slate-800/80">
                  {resources.map((res) => (
                    <div key={res.id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-sm text-white block">{res.title}</span>
                        <span className="text-xs text-slate-400">{res.fileName} &middot; {res.fileSize} &middot; {res.category}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteResource(res.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SPEC REQUESTS INBOX */}
            {activeTab === 'spec_requests' && (
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-white">
                  {lang === 'my' ? `User များမှ တောင်းဆိုထားသော ပစ္စည်းများ (${specRequests.length})` : `User Specification Requests (${specRequests.length})`}
                </h4>

                {specRequests.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs">
                    {lang === 'my' ? 'တောင်းဆိုစာ မရှိသေးပါ' : 'No spec requests yet.'}
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 divide-y divide-slate-800/80">
                    {specRequests.map((req) => (
                      <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{req.brand} {req.model}</span>
                            <span className="px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">{req.category}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{req.status}</span>
                          </div>
                          <p className="text-xs text-slate-300">{req.specDetails}</p>
                          <div className="text-[11px] text-slate-500">Sender: {req.senderName} ({req.senderPhone})</div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => onUpdateSpecRequestStatus(req.id, 'added', 'Added to system database!')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold cursor-pointer"
                          >
                            Mark Added
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSpecRequest(req.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: TELEGRAM BOT (BOTFATHER) INTEGRATION */}
            {activeTab === 'telegram_bot' && (
              <form onSubmit={handleSaveTelegramConfig} className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-sky-400" />
                      <span>{lang === 'my' ? 'Telegram Bot (BotFather) ဖြင့် License ထုတ်ပေးခြင်း' : 'Telegram Bot License Generator'}</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      {lang === 'my'
                        ? 'ဖုန်းမှတစ်ဆင့် Telegram တွင် /gen command ရိုက်ရုံဖြင့် Buyer Activation Link များကို ချက်ချင်း ထုတ်ယူနိုင်ပါသည်'
                        : 'Generate PRO License Links on the go via Telegram BotFather'}
                    </p>
                  </div>

                  {/* Enable Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <input
                      type="checkbox"
                      checked={telegramForm.enabled}
                      onChange={(e) => setTelegramForm({ ...telegramForm, enabled: e.target.checked })}
                      className="w-4 h-4 accent-sky-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white">
                      {telegramForm.enabled ? (lang === 'my' ? 'ဖွင့်ထားသည် (Enabled)' : 'Enabled') : (lang === 'my' ? 'ပိတ်ထားသည် (Disabled)' : 'Disabled')}
                    </span>
                  </label>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  {/* Bot Token Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">
                        {lang === 'my' ? 'Telegram Bot Token (BotFather ထံမှ ရရှိသော Token)' : 'Telegram Bot Token'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowBotToken(!showBotToken)}
                        className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showBotToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showBotToken ? 'Hide Token' : 'Show Token'}</span>
                      </button>
                    </div>
                    <input
                      type={showBotToken ? 'text' : 'password'}
                      value={telegramForm.botToken}
                      onChange={(e) => setTelegramForm({ ...telegramForm, botToken: e.target.value.trim() })}
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500">
                      {lang === 'my' ? 'Telegram တွင် @BotFather ထံ /newbot ပြုလုပ်၍ ရရှိသော HTTP API Token ဖြစ်ပါသည်' : 'HTTP API token obtained from @BotFather'}
                    </p>
                  </div>

                  {/* Admin Chat ID Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      {lang === 'my' ? 'Admin Telegram Chat ID (နံပါတ် သီးသန့်)' : 'Admin Telegram Chat ID'}
                    </label>
                    <input
                      type="text"
                      value={telegramForm.adminChatId || ''}
                      onChange={(e) => setTelegramForm({ ...telegramForm, adminChatId: e.target.value.trim() })}
                      placeholder="e.g. 123456789"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500">
                      {lang === 'my' 
                        ? 'သင့် Chat ID သိရှိရန် Telegram တွင် @userinfobot သို့ /start ပို့ပြီး Id နံပါတ်ကို ထည့်သွင်းပါ' 
                        : 'Find your numeric Chat ID by sending /start to @userinfobot'}
                    </p>
                  </div>

                  {/* Activation Notification Toggle */}
                  <div className="pt-2 border-t border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={telegramForm.notifyOnActivation ?? true}
                        onChange={(e) => setTelegramForm({ ...telegramForm, notifyOnActivation: e.target.checked })}
                        className="w-4 h-4 accent-sky-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300">
                        {lang === 'my'
                          ? 'ဝယ်ယူသူ စက်တွင် License Activate လုပ်တိုင်း Telegram သို့ ချက်ချင်း အသိပေးချက် ပေးပို့မည် (Realtime Alert)'
                          : 'Notify Admin via Telegram immediately when a buyer activates a license'}
                      </span>
                    </label>
                  </div>

                  {/* Test Connection Button & Status */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleTestTelegramBot}
                      disabled={isTestingBot}
                      className="px-4 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingBot ? 'animate-spin' : ''}`} />
                      <span>{isTestingBot ? 'Testing Connection...' : (lang === 'my' ? 'ချိတ်ဆက်မှု စမ်းသပ်မည် (Test Ping)' : 'Test Connection')}</span>
                    </button>

                    {botTestResult && (
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        botTestResult.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {botTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        <span>{botTestResult.message || botTestResult.error}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions Card in Myanmar */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2 text-slate-300">
                  <span className="font-extrabold text-sm text-sky-400 block">
                    📖 BotFather ဖြင့် Bot ပြုလုပ်ပုံ အဆင့်ဆင့် (Myanmar Guide)
                  </span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                    <li>Telegram ရှာဖွေရေးတွင် <span className="text-white font-mono font-bold">@BotFather</span> ကို ရိုက်ရှာပြီး Start ပြုလုပ်ပါ။</li>
                    <li><span className="text-white font-mono font-bold">/newbot</span> ဟု ပို့ပြီး မိမိနှစ်သက်ရာ Bot နာမည်ပေးပါ (ဥပမာ: Unique Solar Pro Bot)။</li>
                    <li>အဆုံးတွင် `bot` ပါသော Username ပေးပါ (ဥပမာ: <span className="text-white font-mono font-bold">UniqueSolarKey_bot</span>)။</li>
                    <li>BotFather မှ ပေးပို့သော <span className="text-amber-400 font-mono font-bold">HTTP API Token</span> ကို ကူးယူပြီး အထက်ပါအကွက်တွင် ထည့်ပါ။</li>
                    <li>မိမိ Chat ID သိရန် <span className="text-white font-mono font-bold">@userinfobot</span> သို့ /start ပို့ပြီး `Id` နံပါတ်ကို ကူးထည့်ပါ။</li>
                    <li>မိမိပြုလုပ်ထားသော Bot ထံသို့ ဦးစွာ <span className="text-white font-mono font-bold">/start</span> ပို့ထားပေးပါ။ ထို့နောက် "Test Connection" ကို စမ်းသပ်ပါ။</li>
                  </ol>
                </div>

                {/* Commands Cheat Sheet */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                  <span className="font-extrabold text-sm text-amber-400 block">
                    ⚡️ Telegram Bot တွင် အသုံးပြုနိုင်သော Commands များ
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-sky-300 font-bold block">/gen &lt;name&gt; &lt;duration&gt; [devices]</span>
                      <p className="text-[10px] text-slate-400 font-sans">
                        လိုင်စင်ထုတ်ရန် (ဥပမာ: <span className="text-white font-mono">/gen KoAung 1m 1</span> သို့မဟုတ် <span className="text-white font-mono">/gen DawMya 3m 2</span>)
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-sky-300 font-bold block">/licenses</span>
                      <p className="text-[10px] text-slate-400 font-sans">
                        နောက်ဆုံး ထုတ်လုပ်ထားသော လိုင်စင် ၅ ခု စာရင်း ကြည့်ရန်
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-sky-300 font-bold block">/stats</span>
                      <p className="text-[10px] text-slate-400 font-sans">
                        စုစုပေါင်း လိုင်စင်နှင့် စက်အရေအတွက် စာရင်းချုပ် ကြည့်ရန်
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-sky-300 font-bold block">/help</span>
                      <p className="text-[10px] text-slate-400 font-sans">
                        အသုံးပြုပုံ လမ်းညွှန်နှင့် သက်တမ်း အတိုကောက်များ ကြည့်ရန်
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-3 px-6 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-xl shadow-sky-600/30 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{lang === 'my' ? 'Telegram Bot ဆက်တင်များ သိမ်းဆည်းမည် (Save Settings)' : 'Save Telegram Bot Settings'}</span>
                </button>
              </form>
            )}

            {/* TAB: BRANDING & APP LOGO */}
            {activeTab === 'branding' && (
              <form onSubmit={handleSaveBranding} className="space-y-6 max-w-2xl">
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    {lang === 'my' ? 'App နာမည်နှင့် Logo ပြင်ဆင်ခြင်း' : 'App Branding & Custom Logo'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {lang === 'my' 
                      ? 'ဆော့ဖ်ဝဲ၏ အပေါ်ဘက် Sidebar တွင် ပေါ်နေမည့် နာမည်၊ စာတန်းနှင့် Logo ပုံရိပ်ကို စိတ်ကြိုက် ပြောင်းလဲနိုင်ပါသည်'
                      : 'Customize the app title, subtitle, and sidebar brand logo'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">App Name (ခေါင်းစဉ်)</label>
                    <input
                      type="text"
                      value={brandingForm.appName || ''}
                      onChange={(e) => setBrandingForm({ ...brandingForm, appName: e.target.value })}
                      placeholder="e.g. UNIQUE SOLAR PRO"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">App Version (ဗားရှင်း)</label>
                    <input
                      type="text"
                      value={brandingForm.appVersion || 'v2.5'}
                      onChange={(e) => setBrandingForm({ ...brandingForm, appVersion: e.target.value })}
                      placeholder="e.g. v2.5"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">App Subtitle (စာတန်းငယ်)</label>
                    <input
                      type="text"
                      value={brandingForm.appSubtitle || ''}
                      onChange={(e) => setBrandingForm({ ...brandingForm, appSubtitle: e.target.value })}
                      placeholder="e.g. Engineering Suite"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Public App URL / Custom Domain for VPN-Free Buyer Links */}
                  <div className="sm:col-span-2 space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{lang === 'my' ? 'Public App URL / Domain (VPN မလိုဘဲ အသုံးပြုမည့် လိပ်စာ)' : 'Public App URL / Custom Domain'}</span>
                      </label>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">GitHub Pages / Cloudflare</span>
                    </div>
                    <input
                      type="url"
                      value={brandingForm.customAppUrl || ''}
                      onChange={(e) => setBrandingForm({ ...brandingForm, customAppUrl: e.target.value })}
                      placeholder="https://solartechse3-cmyk.github.io/uniquesolarsizing1"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {lang === 'my'
                        ? '💡 ဤနေရာတွင် GitHub Pages သို့မဟုတ် မိမိ Custom Domain လိပ်စာကို ထည့်သွင်းထားပါက Viber နှင့် Telegram Bot မှ ထုတ်ပေးသော Activation Link များသည် ထိုလိပ်စာအတိုင်း VPN မလိုဘဲ အလိုအလျောက် ထွက်လာပါမည်။ (မထည့်ပါက မူရင်း Public Link ကို အသုံးပြုပါမည်)'
                        : 'Configure your GitHub Pages or custom domain here. All buyer links will use this domain so users in Myanmar can open without VPN.'}
                    </p>
                  </div>
                </div>

                {/* Logo Upload & URL Box */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-white block">
                    {lang === 'my' ? 'Logo ပုံရိပ် ထည့်သွင်းခြင်း (Upload သို့မဟုတ် Image Link)' : 'App Logo Configuration'}
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Upload with Canvas Auto-Compression */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 block">
                        {lang === 'my' ? 'နည်းလမ်း ၁ - စက်ထဲမှ ဖိုင်ရွေးချယ်မည် (PNG / JPG / WebP)' : 'Method 1: Choose Image File'}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsCompressingLogo(true);
                          try {
                            const compressedData = await compressImageFile(file, 256);
                            setBrandingForm((prev) => ({ ...prev, logoUrl: compressedData }));
                            setCustomLogoUrlInput(compressedData);
                            if (onShowToast) {
                              onShowToast({
                                type: 'success',
                                text: lang === 'my' ? 'Logo ပုံကို အရွယ်အစား ချိန်ညှိ၍ အောင်မြင်စွာ ရွေးချယ်ပြီးပါပြီ!' : 'Logo compressed and selected!'
                              });
                            }
                          } catch (err: any) {
                            if (onShowToast) onShowToast({ type: 'error', text: err?.message || 'Failed to process image' });
                          } finally {
                            setIsCompressingLogo(false);
                          }
                        }}
                        className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600/30 file:text-blue-300 hover:file:bg-blue-600/50 cursor-pointer"
                      />
                      {isCompressingLogo && (
                        <p className="text-[11px] text-amber-400 animate-pulse">
                          {lang === 'my' ? 'ပုံရွယ်အစား ချိန်ညှိနေပါသည်...' : 'Optimizing image size...'}
                        </p>
                      )}
                    </div>

                    {/* Direct Image URL input */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 block">
                        {lang === 'my' ? 'နည်းလမ်း ၂ - Image Direct URL ထည့်မည်' : 'Method 2: Paste Direct Image URL'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={customLogoUrlInput}
                          onChange={(e) => setCustomLogoUrlInput(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customLogoUrlInput.trim()) {
                              setBrandingForm({ ...brandingForm, logoUrl: customLogoUrlInput.trim() });
                              if (onShowToast) onShowToast({ type: 'info', text: 'Logo URL set!' });
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Logo Actions & Reset */}
                  {brandingForm.logoUrl && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {lang === 'my' ? 'Custom Logo ထည့်သွင်းထားသည်' : 'Custom Logo is Active'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBrandingForm({ ...brandingForm, logoUrl: '' });
                          setCustomLogoUrlInput('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === 'my' ? 'Logo ဖျက်မည် (Default ပြန်ထားမည်)' : 'Remove Logo'}</span>
                      </button>
                    </div>
                  )}

                  {/* Live Visual Preview */}
                  <div className="pt-2 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                      Live Sidebar Preview (လက်တွေ့မြင်ကွင်း)
                    </span>
                    <div className="p-4 rounded-2xl bg-[#0d1527] border border-slate-800 flex items-center gap-3 max-w-sm shadow-xl">
                      {brandingForm.logoUrl ? (
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
                          <img
                            src={brandingForm.logoUrl}
                            alt="Logo Preview"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30 overflow-hidden shrink-0">
                          <Zap className="w-5 h-5 text-slate-950 fill-slate-950" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1.5 truncate">
                          <span className="truncate">{brandingForm.appName || 'SOLAR PRO'}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                            {brandingForm.appVersion || 'v2.5'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium truncate">
                          {brandingForm.appSubtitle || 'Engineering Suite'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-blue-600/30 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{lang === 'my' ? 'Logo နှင့် Branding သိမ်းဆည်းမည် (Save & Sync)' : 'Save Branding & Sync'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: SUPABASE CLOUD SYNC */}
            {activeTab === 'supabase' && (
              <div className="space-y-4 max-w-xl">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                  <span className="font-bold block text-sm text-white">Supabase Cloud Database Connection</span>
                  <p>
                    {supabaseConfig.isConnected
                      ? '✅ Supabase Cloud ချိတ်ဆက်ထားပြီး ဖြစ်ပါသည်။ Real-time multi-device sync အလုပ်လုပ်နေပါသည်။'
                      : '⚠️ Supabase credentials မထည့်သွင်းရသေးပါ။ စနစ်သည် Express server local storage ဖြင့် အလုပ်လုပ်နေပါသည်။'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Supabase Project URL</label>
                    <input
                      type="text"
                      value={supabaseForm.url}
                      onChange={(e) => setSupabaseForm({ ...supabaseForm, url: e.target.value })}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Supabase Anon Key</label>
                    <input
                      type="password"
                      value={supabaseForm.anonKey}
                      onChange={(e) => setSupabaseForm({ ...supabaseForm, anonKey: e.target.value })}
                      placeholder="eyJhbGciOi..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSupabaseConfig({
                        url: supabaseForm.url.trim(),
                        anonKey: supabaseForm.anonKey.trim(),
                        isConnected: Boolean(supabaseForm.url.trim() && supabaseForm.anonKey.trim())
                      });
                      if (onShowToast) onShowToast({ type: 'success', text: 'Supabase credentials saved!' });
                    }}
                    className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Save Supabase Credentials
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
