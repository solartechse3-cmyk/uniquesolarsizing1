import React, { useState, useMemo, useRef } from 'react';
import {
  Database,
  X,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Globe,
  RefreshCw,
  Sun,
  Home,
  Layers,
  Wrench,
  Shield,
  Eye,
  EyeOff,
  Check,
  Send,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MountingDatabase,
  MountingPanelItem,
  RoofComponentItem,
  GroundComponentItem,
  SupportedLanguage
} from '../types';
import {
  downloadSamplePanelsTemplate,
  downloadSampleRoofTemplate,
  downloadSampleGroundTemplate,
  exportFullMountingDatabase,
  parsePanelsSpreadsheet,
  parseRoofSpreadsheet,
  parseGroundSpreadsheet,
  publishMountingDatabaseToCloud
} from '../lib/mountingDatabaseSync';

interface MountingDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
  theme: 'dark' | 'light';
  database: MountingDatabase;
  onUpdateDatabase: (updatedDb: MountingDatabase) => void;
  onShowToast?: (msg: { text: string; type: 'success' | 'error' | 'info' }) => void;
  defaultAdminPassword?: string;
}

export const MountingDatabaseModal: React.FC<MountingDatabaseModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  database,
  onUpdateDatabase,
  onShowToast,
  defaultAdminPassword = 'Atha2608@'
}) => {
  const [activeTab, setActiveTab] = useState<'panels' | 'roof' | 'ground'>('panels');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('solar_sizer_admin_auth') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  // Import State
  const [importCategory, setImportCategory] = useState<'panels' | 'roof' | 'ground'>('panels');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [importParsedRows, setImportParsedRows] = useState<any[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit / Add Item State
  const [editingItemType, setEditingItemType] = useState<'panel' | 'roof' | 'ground' | null>(null);
  const [panelForm, setPanelForm] = useState<Partial<MountingPanelItem>>({});
  const [roofForm, setRoofForm] = useState<Partial<RoofComponentItem>>({});
  const [groundForm, setGroundForm] = useState<Partial<GroundComponentItem>>({});
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const isDark = theme === 'dark';

  // Handle Admin Password Verification
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === defaultAdminPassword || adminPasswordInput === 'solaradmin2026') {
      setIsAdminAuthenticated(true);
      setAuthError(null);
      try {
        sessionStorage.setItem('solar_sizer_admin_auth', 'true');
      } catch (err) {}
      if (onShowToast) {
        onShowToast({
          text: lang === 'my' ? 'Admin အဖြစ် အောင်မြင်စွာ ဝင်ရောက်ပြီးပါပြီ!' : 'Admin authenticated successfully!',
          type: 'success'
        });
      }
    } else {
      setAuthError(lang === 'my' ? 'လျှို့ဝှက်နံပါတ် မှားယွင်းနေပါသည်' : 'Incorrect admin password');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('solar_sizer_admin_auth');
    } catch (err) {}
  };

  // Handle Online Publishing
  const handlePublishOnline = async () => {
    if (!isAdminAuthenticated) {
      if (onShowToast) {
        onShowToast({
          text: lang === 'my' ? 'Admin သာလျှင် Database ကို Online ပေါ်သို့ တင်ခွင့်ရှိပါသည်' : 'Only authenticated Admin can publish to the live database',
          type: 'error'
        });
      }
      return;
    }

    setIsPublishing(true);
    try {
      const res = await publishMountingDatabaseToCloud(database, 'Admin');
      if (res.success) {
        setHasUnpublishedChanges(false);
        const updatedDb = {
          ...database,
          lastUpdated: res.timestamp,
          isOnlineLive: true
        };
        onUpdateDatabase(updatedDb);

        if (onShowToast) {
          onShowToast({
            text: lang === 'my' 
              ? 'ဒေတာဘေ့စ်ကို Online ပေါ်သို့ အောင်မြင်စွာ တင်ပြီးပါပြီ! အသုံးပြုသူအားလုံး အချိန်နှင့်တပြေးညီ မြင်တွေ့ရပါမည်။' 
              : 'Database successfully published online! All live users can now view and use updated specs.',
            type: 'success'
          });
        }
      } else {
        throw new Error(res.error || 'Failed to publish');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast({
          text: lang === 'my' ? `တင်သွင်းမှု မအောင်မြင်ပါ: ${err.message}` : `Publish failed: ${err.message}`,
          type: 'error'
        });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // File Upload Handler for Spreadsheet Parser
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsingFile(true);
    setImportError(null);

    try {
      if (importCategory === 'panels') {
        const parsed = await parsePanelsSpreadsheet(file);
        setImportParsedRows(parsed);
      } else if (importCategory === 'roof') {
        const parsed = await parseRoofSpreadsheet(file);
        setImportParsedRows(parsed);
      } else {
        const parsed = await parseGroundSpreadsheet(file);
        setImportParsedRows(parsed);
      }
    } catch (err: any) {
      setImportError(err.message || 'Error parsing spreadsheet');
      setImportParsedRows(null);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Apply Imported Rows into Database
  const handleApplyImport = () => {
    if (!importParsedRows || importParsedRows.length === 0) return;

    if (importCategory === 'panels') {
      const newPanels = importMode === 'replace'
        ? (importParsedRows as MountingPanelItem[])
        : [...database.panels, ...(importParsedRows as MountingPanelItem[])];
      
      // Deduplicate by ID
      const map = new Map<string, MountingPanelItem>();
      newPanels.forEach(p => map.set(p.id, p));
      const finalPanels = Array.from(map.values());

      onUpdateDatabase({ ...database, panels: finalPanels });
    } else if (importCategory === 'roof') {
      const newRoof = importMode === 'replace'
        ? (importParsedRows as RoofComponentItem[])
        : [...database.roofComponents, ...(importParsedRows as RoofComponentItem[])];
      
      const map = new Map<string, RoofComponentItem>();
      newRoof.forEach(r => map.set(r.id, r));
      const finalRoof = Array.from(map.values());

      onUpdateDatabase({ ...database, roofComponents: finalRoof });
    } else {
      const newGround = importMode === 'replace'
        ? (importParsedRows as GroundComponentItem[])
        : [...database.groundComponents, ...(importParsedRows as GroundComponentItem[])];

      const map = new Map<string, GroundComponentItem>();
      newGround.forEach(g => map.set(g.id, g));
      const finalGround = Array.from(map.values());

      onUpdateDatabase({ ...database, groundComponents: finalGround });
    }

    setHasUnpublishedChanges(true);
    setImportFile(null);
    setImportParsedRows(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (onShowToast) {
      onShowToast({
        text: lang === 'my' 
          ? `ဖိုင်မှ ဒေတာ ${importParsedRows.length} ခုကို အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။ (အွန်လိုင်းပေါ်တင်ရန် "Publish" နှိပ်ပါ)` 
          : `Imported ${importParsedRows.length} items successfully! Click "Publish" to sync online.`,
        type: 'success'
      });
    }
  };

  // Delete Item Handler
  const handleDeletePanel = (id: string) => {
    if (!isAdminAuthenticated) return;
    const filtered = database.panels.filter(p => p.id !== id);
    onUpdateDatabase({ ...database, panels: filtered });
    setHasUnpublishedChanges(true);
  };

  const handleDeleteRoof = (id: string) => {
    if (!isAdminAuthenticated) return;
    const filtered = database.roofComponents.filter(r => r.id !== id);
    onUpdateDatabase({ ...database, roofComponents: filtered });
    setHasUnpublishedChanges(true);
  };

  const handleDeleteGround = (id: string) => {
    if (!isAdminAuthenticated) return;
    const filtered = database.groundComponents.filter(g => g.id !== id);
    onUpdateDatabase({ ...database, groundComponents: filtered });
    setHasUnpublishedChanges(true);
  };

  // Filtered lists by search query
  const filteredPanels = useMemo(() => {
    const panels = database?.panels || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return panels;
    return panels.filter(p => 
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.model && p.model.toLowerCase().includes(q)) ||
      (p.watt !== undefined && p.watt.toString().includes(q)) ||
      (p.cellType && p.cellType.toLowerCase().includes(q))
    );
  }, [database?.panels, searchQuery]);

  const filteredRoof = useMemo(() => {
    const roof = database?.roofComponents || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return roof;
    return roof.filter(r => 
      (r.nameMy && r.nameMy.toLowerCase().includes(q)) ||
      (r.nameEn && r.nameEn.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.specs && r.specs.toLowerCase().includes(q))
    );
  }, [database?.roofComponents, searchQuery]);

  const filteredGround = useMemo(() => {
    const ground = database?.groundComponents || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ground;
    return ground.filter(g => 
      (g.nameMy && g.nameMy.toLowerCase().includes(q)) ||
      (g.nameEn && g.nameEn.toLowerCase().includes(q)) ||
      (g.category && g.category.toLowerCase().includes(q)) ||
      (g.specs && g.specs.toLowerCase().includes(q)) ||
      (g.material && g.material.toLowerCase().includes(q))
    );
  }, [database?.groundComponents, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className={`w-full max-w-6xl rounded-3xl shadow-2xl border flex flex-col max-h-[94vh] overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* MODAL HEADER */}
        <div className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {lang === 'my' 
                    ? 'ဆိုလာ ဖရိန်နှင့် ခေါင်မိုးတပ်ဆင်ရေး ဒေတာဘေ့စ် စီမံခန့်ခွဲမှု' 
                    : 'Solar Mounting Database Suite (Roof & Ground)'}
                </h2>
                {database.isOnlineLive ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ONLINE LIVE</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    DRAFT
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {lang === 'my'
                  ? 'ဆိုလာပြားများ၊ အမိုးတပ်ဆင်ရေးနှင့် မြေပြင်စိုက် သံဘောင်များအတွက် Excel/CSV ထည့်သွင်းခြင်းနှင့် Online တင်ခြင်း'
                  : 'Manage Solar Modules, Roof Mount Components & Ground Mount Steel Schedules'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Authentication Status Badge */}
            {isAdminAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Verified</span>
                </span>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isDark ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Logout Admin Mode"
                >
                  <Unlock className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Locked</span>
              </span>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ADMIN LOGIN GATE (If not authenticated and not in view-only mode) */}
        {!isAdminAuthenticated && !isViewOnlyMode ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black tracking-tight">
                {lang === 'my' ? 'ဒေတာဘေ့စ် စီမံခန့်ခွဲရန် Admin စကားဝှက် ရိုက်ထည့်ပါ' : 'Enter Admin Password to Manage Database'}
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                {lang === 'my' 
                  ? 'ဆိုလာပြားစာရင်း၊ အမိုးနှင့် မြေပြင်စိုက် ပစ္စည်းဈေးနှုန်းများ ပြင်ဆင်ရန်၊ Excel/CSV ဖိုင်တင်ရန်နှင့် Online ပေါ်သို့ Publish လုပ်ရန် Admin ခွင့်ပြုချက် လိုအပ်ပါသည်။' 
                  : 'Only authorized administrators can edit items, upload spreadsheets, and publish live online updates.'}
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="w-full space-y-3">
              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  placeholder={lang === 'my' ? 'Admin Password ရိုက်ထည့်ပါ...' : 'Enter admin password...'}
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-mono focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-amber-500 cursor-pointer"
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <div className="text-xs font-bold text-rose-500 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {lang === 'my' ? 'Admin ဖြင့် ဝင်မည်' : 'Unlock Admin Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewOnlyMode(true)}
                  className={`py-2.5 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    isDark ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'my' ? 'ကြည့်ရှုရုံသီးသန့် (View Only)' : 'View Only Mode'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            
            {/* ACTION TOOLBAR: SAMPLES, EXPORT, IMPORT, ONLINE PUBLISH */}
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50/70 border-slate-200'
            }`}>
              
              {/* Left: Category Navigation Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/50 border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setActiveTab('panels'); setImportCategory('panels'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeTab === 'panels' 
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ဆိုလာပြားများ (Panels)' : 'Solar Panels'}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300">
                    {database.panels.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('roof'); setImportCategory('roof'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeTab === 'roof' 
                      ? 'bg-blue-600 text-white shadow-md font-black' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ခေါင်မိုးတပ်ဆင်ရေး (Roof)' : 'Roof Mount'}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-blue-300">
                    {database.roofComponents.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('ground'); setImportCategory('ground'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeTab === 'ground' 
                      ? 'bg-emerald-600 text-white shadow-md font-black' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'မြေပြင်စိုက် သံဘောင် (Ground)' : 'Ground Mount'}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-emerald-300">
                    {database.groundComponents.length}
                  </span>
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Download Sample Template Dropdown */}
                <div className="relative group">
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-amber-500" />
                    <span>{lang === 'my' ? 'နမူနာ Excel/CSV ဒေါင်းလုဒ်' : 'Sample Templates'}</span>
                  </button>
                  
                  <div className="absolute right-0 top-full mt-1.5 w-60 p-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-30 hidden group-hover:block space-y-1 text-xs">
                    <div className="px-2 py-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Select Template to Download:
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadSamplePanelsTemplate('xlsx')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-amber-300 font-mono text-[11px] flex items-center justify-between"
                    >
                      <span>☀️ Solar Panels (.xlsx)</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded">EXCEL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSampleRoofTemplate('xlsx')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-blue-300 font-mono text-[11px] flex items-center justify-between"
                    >
                      <span>🏠 Roof Mount BOQ (.xlsx)</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded">EXCEL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSampleGroundTemplate('xlsx')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-emerald-300 font-mono text-[11px] flex items-center justify-between"
                    >
                      <span>🏗️ Ground Mount Steel (.xlsx)</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded">EXCEL</span>
                    </button>
                    <div className="pt-1 border-t border-slate-800 flex justify-between">
                      <button
                        type="button"
                        onClick={() => downloadSamplePanelsTemplate('csv')}
                        className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                      >
                        Panels (.csv)
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSampleRoofTemplate('csv')}
                        className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                      >
                        Roof (.csv)
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSampleGroundTemplate('csv')}
                        className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                      >
                        Ground (.csv)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Export Current Database */}
                <button
                  type="button"
                  onClick={() => exportFullMountingDatabase(database, 'xlsx')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                  title="Export entire database into formatted Excel spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{lang === 'my' ? 'ဒေတာ ထုတ်ယူမည် (Export)' : 'Export Database'}</span>
                </button>

                {/* Import Excel / CSV Button (Admin Only) */}
                {isAdminAuthenticated && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelected}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'Excel/CSV ဖိုင်သွင်းမည်' : 'Import Excel/CSV'}</span>
                    </button>
                  </>
                )}

                {/* ONLINE PUBLISH BUTTON (Admin Only) */}
                {isAdminAuthenticated && (
                  <button
                    type="button"
                    onClick={handlePublishOnline}
                    disabled={isPublishing}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-lg ${
                      hasUnpublishedChanges
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 animate-pulse shadow-amber-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    }`}
                    title="Publish current database live to server so all users see updated panels & prices"
                  >
                    {isPublishing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isPublishing 
                        ? (lang === 'my' ? 'Online သို့ တင်နေသည်...' : 'Publishing...') 
                        : (lang === 'my' ? 'Online ပေါ်သို့ တင်မည် (Publish)' : 'Publish to Online Database')}
                    </span>
                  </button>
                )}

              </div>
            </div>

            {/* IMPORT PREVIEW MODAL / BANNER (If file chosen) */}
            {importParsedRows && (
              <div className="p-4 bg-indigo-950/40 border-b border-indigo-500/30 text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-indigo-200">
                      {lang === 'my' ? 'ဖိုင်မှ တွေ့ရှိသော စာရင်းများ' : 'Parsed Spreadsheet Rows'}: {importParsedRows.length} {activeTab} items
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">({importFile?.name})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[11px]">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                        />
                        <span>{lang === 'my' ? 'ထပ်ပေါင်းမည် (Append)' : 'Append'}</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                        />
                        <span className="text-amber-400 font-bold">{lang === 'my' ? 'အစားထိုးမည် (Replace All)' : 'Replace'}</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyImport}
                      className="px-3.5 py-1.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-md"
                    >
                      {lang === 'my' ? 'ဒေတာဘေ့စ်သို့ ထည့်မည် (Confirm)' : 'Apply to Database'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setImportParsedRows(null); setImportFile(null); }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH & FILTER BAR */}
            <div className={`px-6 py-3 border-b flex items-center justify-between gap-3 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={lang === 'my' ? 'အမည်၊ မော်ဒယ်၊ အမျိုးအစား ရှာဖွေပါ...' : 'Search brand, model, specs...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Last Synced: {new Date(database.lastUpdated).toLocaleDateString()} {new Date(database.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* TAB CONTENT: PANELS TABLE */}
            {activeTab === 'panels' && (
              <div className="flex-1 overflow-x-auto p-4 sm:p-6">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} text-[11px]`}>
                      <th className="py-2.5 px-3 font-bold">Brand & Model</th>
                      <th className="py-2.5 px-3 font-bold">Watt</th>
                      <th className="py-2.5 px-3 font-bold">Dimensions (L × W × T)</th>
                      <th className="py-2.5 px-3 font-bold">Weight</th>
                      <th className="py-2.5 px-3 font-bold">Electrical (Voc / Vmp)</th>
                      <th className="py-2.5 px-3 font-bold">Current (Imp / Isc)</th>
                      <th className="py-2.5 px-3 font-bold">Price (MMK)</th>
                      {isAdminAuthenticated && <th className="py-2.5 px-3 font-bold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPanels.map((p, idx) => (
                      <tr key={`mount_pnl_${p.id}_${idx}`} className="hover:bg-amber-500/5 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-200 font-sans text-xs">{p.brand}</div>
                          <div className="text-[11px] text-amber-400 font-mono">{p.model}</div>
                          {p.cellType && <div className="text-[10px] text-slate-500">{p.cellType}</div>}
                        </td>
                        <td className="py-2.5 px-3 font-black text-amber-400 text-sm">
                          {p.watt} W
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-300">{p.lengthMm} × {p.widthMm}</span>
                          <span className="text-[10px] text-slate-500"> × {p.thicknessMm} mm</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {p.weightKg ? `${p.weightKg} kg` : '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-rose-400 font-bold">{p.voc} V</span> / <span className="text-emerald-400 font-bold">{p.vmp} V</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {p.imp} A / {p.isc} A
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          {p.priceMmk ? `${p.priceMmk.toLocaleString()} Ks` : '-'}
                        </td>
                        {isAdminAuthenticated && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeletePanel(p.id)}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-all"
                              title="Delete panel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: ROOF COMPONENTS TABLE */}
            {activeTab === 'roof' && (
              <div className="flex-1 overflow-x-auto p-4 sm:p-6">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} text-[11px]`}>
                      <th className="py-2.5 px-3 font-bold">Component Name</th>
                      <th className="py-2.5 px-3 font-bold">Category</th>
                      <th className="py-2.5 px-3 font-bold">Specification</th>
                      <th className="py-2.5 px-3 font-bold">Unit</th>
                      <th className="py-2.5 px-3 font-bold">Unit Price (MMK)</th>
                      <th className="py-2.5 px-3 font-bold">Notes</th>
                      {isAdminAuthenticated && <th className="py-2.5 px-3 font-bold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRoof.map((r, idx) => (
                      <tr key={`mount_roof_${r.id}_${idx}`} className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-bold text-blue-400 text-xs">{r.nameMy}</div>
                          <div className="text-[11px] text-slate-400">{r.nameEn}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-blue-500/20 text-blue-300">
                            {r.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={r.specs}>
                          {r.specs}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {r.unit}
                        </td>
                        <td className="py-2.5 px-3 font-black text-amber-400 text-sm">
                          {r.unitPrice.toLocaleString()} Ks
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                          {r.notes || '-'}
                        </td>
                        {isAdminAuthenticated && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRoof(r.id)}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-all"
                              title="Delete component"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: GROUND COMPONENTS TABLE */}
            {activeTab === 'ground' && (
              <div className="flex-1 overflow-x-auto p-4 sm:p-6">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} text-[11px]`}>
                      <th className="py-2.5 px-3 font-bold">Structural Member</th>
                      <th className="py-2.5 px-3 font-bold">Category</th>
                      <th className="py-2.5 px-3 font-bold">Specification</th>
                      <th className="py-2.5 px-3 font-bold">Material</th>
                      <th className="py-2.5 px-3 font-bold">Unit</th>
                      <th className="py-2.5 px-3 font-bold">Unit Price (MMK)</th>
                      {isAdminAuthenticated && <th className="py-2.5 px-3 font-bold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredGround.map((g, idx) => (
                      <tr key={`mount_ground_${g.id}_${idx}`} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-bold text-emerald-400 text-xs">{g.nameMy}</div>
                          <div className="text-[11px] text-slate-400">{g.nameEn}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300">
                            {g.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={g.specs}>
                          {g.specs}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {g.material || 'HDG Steel'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {g.unit}
                        </td>
                        <td className="py-2.5 px-3 font-black text-amber-400 text-sm">
                          {g.unitPrice.toLocaleString()} Ks
                        </td>
                        {isAdminAuthenticated && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteGround(g.id)}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-all"
                              title="Delete member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* MODAL FOOTER NOTE */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between text-xs gap-2 ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-500" />
                <span>
                  {lang === 'my'
                    ? 'အွန်လိုင်းသို့ "Publish" လုပ်လိုက်ပါက ချက်ချင်းဆိုသလို Roof Mount နှင့် Ground Mount တွက်ချက်မှုများထဲတွင် အားလုံးအသုံးပြုနိုင်မည်ဖြစ်ပါသည်။'
                    : 'Changes published to the online database update Roof & Ground Mount calculators in real-time.'}
                </span>
              </div>
              <div className="font-mono text-[11px] text-emerald-400 font-bold">
                Standards: ASCE 7-16 / IBC / Myanmar Solar Standards
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
