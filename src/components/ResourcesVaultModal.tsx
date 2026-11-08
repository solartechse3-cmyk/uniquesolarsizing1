import React, { useState } from 'react';
import { 
  FolderDown, 
  FileText, 
  Download, 
  UploadCloud, 
  Search, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Sparkles, 
  FileCode, 
  FileSpreadsheet, 
  BookOpen, 
  Layers, 
  Trash2, 
  Plus, 
  X,
  ExternalLink,
  ShieldAlert,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminResourceFile } from '../types';

interface ResourcesVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'my';
  theme: 'light' | 'dark';
  isPaidUser: boolean;
  isAdmin: boolean;
  resources: AdminResourceFile[];
  onAddResource: (resource: Omit<AdminResourceFile, 'id' | 'uploadedAt' | 'downloadsCount'>) => void;
  onDeleteResource: (id: string) => void;
  onOpenPayment: () => void;
}

export const ResourcesVaultModal: React.FC<ResourcesVaultModalProps> = ({
  isOpen,
  onClose,
  lang,
  theme,
  isPaidUser,
  isAdmin,
  resources,
  onAddResource,
  onDeleteResource,
  onOpenPayment,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AdminResourceFile['category']>('datasheet');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileData, setFileData] = useState<string>('');
  const [isPaidOnly, setIsPaidOnly] = useState<boolean>(true);

  if (!isOpen) return null;

  // Check if current user has paid / pro access or is admin
  const canAccess = isPaidUser || isAdmin;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setFileSize(`${sizeMb} MB`);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fileName.trim()) return;

    onAddResource({
      title: title.trim(),
      description: description.trim(),
      category,
      fileName: fileName.trim(),
      fileSize: fileSize || '1.2 MB',
      fileType: fileName.endsWith('.csv') ? 'text/csv' : 'application/pdf',
      fileData: fileData || undefined,
      uploadedBy: isAdmin ? 'Admin' : 'SolarTech',
      isPaidOnly
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setFileName('');
    setFileSize('');
    setFileData('');
    setShowUploadForm(false);
  };

  const handleDownload = async (res: AdminResourceFile) => {
    if (!canAccess && res.isPaidOnly) {
      onOpenPayment();
      return;
    }

    try {
      // 1. Direct base64 data URL
      if (res.fileData && res.fileData.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = res.fileData;
        link.download = res.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // 2. Fetch from server streaming endpoint
      const serverUrl = res.fileUrl || `/api/files/${res.id}`;
      try {
        const resp = await fetch(serverUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = res.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          return;
        }
      } catch (fetchErr) {}

      // 3. Fallback text file download if raw data not embedded
      const blob = new Blob([
        `=== ${res.title} ===\n\nCategory: ${res.category}\nFile: ${res.fileName}\nUploaded: ${new Date(res.uploadedAt).toLocaleDateString()}\n\n${res.description}\n\n[Solar Tech Engineering Resources - Verified for Pro Users]`
      ], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = res.fileName.endsWith('.pdf') || res.fileName.endsWith('.csv') ? res.fileName : `${res.fileName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const filteredResources = resources.filter(res => {
    const matchesCategory = selectedCategory === 'all' || res.category === selectedCategory;
    const matchesSearch = 
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (cat: AdminResourceFile['category']) => {
    switch (cat) {
      case 'datasheet': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'diagram': return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'database_csv': return <FileSpreadsheet className="w-4 h-4 text-amber-400" />;
      case 'guide': return <BookOpen className="w-4 h-4 text-purple-400" />;
      default: return <FileCode className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {lang === 'my' ? 'Admin ထည့်သွင်းထားသော ဖိုင်နှင့် စာရွက်စာတမ်းများ' : 'Admin Resource & Engineering Vault'}
                </h3>
                {canAccess ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase flex items-center gap-1">
                    <Unlock className="w-2.5 h-2.5" />
                    {lang === 'my' ? 'PRO ဖွင့်ထားသည်' : 'PRO Unlocked'}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    {lang === 'my' ? 'PRO သာလျှင် (Paid Only)' : 'PRO Members Only'}
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                  <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                  <span>Real-time Synced</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'my' 
                  ? 'အင်ဗာတာ Datasheet များ၊ Single Line Diagram၊ Wiring Guide များနှင့် ဒေတာဘေ့စ် CSV များ' 
                  : 'Verified manufacturer datasheets, SLD wiring schematics, and CSV datasets'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                {showUploadForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{lang === 'my' ? 'ဖိုင်အသစ်ထည့်မည်' : 'Upload File'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upload Form Modal (Admin Only) */}
        <AnimatePresence>
          {showUploadForm && isAdmin && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleFormSubmit}
              className="p-6 bg-slate-950 border-b border-slate-800 space-y-4 text-xs sm:text-sm"
            >
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-purple-400" />
                <span>{lang === 'my' ? 'Admin မှ အင်ဂျင်နီယာဖိုင်အသစ် တင်ပေးရန်' : 'Upload New Engineering Resource'}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {lang === 'my' ? 'ဖိုင်ခေါင်းစဉ် / အမည်' : 'Resource Title'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Huawei SUN2000 M3 Series String Manual"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {lang === 'my' ? 'ဖိုင်အမျိုးအစား (Category)' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-purple-500"
                  >
                    <option value="datasheet">Datasheet (အချက်အလက် စာရွက်)</option>
                    <option value="diagram">Wiring Diagram / SLD (ဆားကစ်ပုံ)</option>
                    <option value="guide">Engineering Guide (တွက်ချက်မှုလမ်းညွှန်)</option>
                    <option value="database_csv">Database CSV (အင်ဗာတာစာရင်း)</option>
                    <option value="firmware">Firmware / Software</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">
                    {lang === 'my' ? 'အသေးစိတ် ဖော်ပြချက်' : 'Description'}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Provide details about what this file contains..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {lang === 'my' ? 'ဖိုင်ရွေးချယ်ပါ (Upload File)' : 'Select File'}
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-1.5 text-slate-300 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 sm:pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={isPaidOnly}
                      onChange={(e) => setIsPaidOnly(e.target.checked)}
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold">{lang === 'my' ? 'Paid User သာ ကြည့်ခွင့်ပြုမည် (Paid Only)' : 'Restricted to Pro Paid Users'}</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-lg shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ဖိုင်တင်မည်' : 'Save & Publish File'}</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {!canAccess ? (
          /* Locked Paywall State for Non-Paid Users */
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-purple-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/10">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
            </div>

            <div className="max-w-lg space-y-2">
              <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {lang === 'my' 
                  ? 'အင်ဂျင်နီယာ ဖိုင်မှတ်တမ်းများအား ကြည့်ရှုရန် Pro အသုံးပြုခွင့် လိုအပ်ပါသည်' 
                  : 'PRO Membership Required to Access Vault'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {lang === 'my' 
                  ? 'Admin မှ တင်သွင်းထားသော အင်ဗာတာ Datasheets၊ Single Line Diagram (SLD) ဆားကစ်ပုံများ၊ Wiring Guides များနှင့် Database CSV ဖိုင်များကို PRO အသုံးပြုသူများသာ ကြည့်ရှုဒေါင်းလုဒ် ရယူနိုင်ပါသည်။' 
                  : 'Verified manufacturer datasheets, SLD wiring schematics, CSV engineering datasets, and wiring guides are restricted to PRO members.'}
              </p>
            </div>

            {/* Pro Features Included */}
            <div className="w-full max-w-md bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-300">
              <div className="font-bold text-amber-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'my' ? 'PRO အဖွဲ့ဝင်များအတွက် အကျိုးခံစားခွင့်များ' : 'PRO Vault Benefits'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lang === 'my' ? 'တရားဝင် Inverter & Battery Datasheet အပြည့်အစုံ' : 'Full Inverter & Battery Datasheet Vault'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lang === 'my' ? 'Single Line Diagram (SLD) & Protection Circuit ဆားကစ်များ' : 'Single Line Diagram (SLD) Schematics'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lang === 'my' ? 'Inverter & Solar Panel Database CSV အစုံ' : 'Complete Verified Equipment CSV Databases'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lang === 'my' ? 'Solar Installation & String Sizing Guides' : 'Engineering Sizing & Installation Guides'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md pt-2">
              <button
                onClick={onOpenPayment}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>{lang === 'my' ? 'ငွေလွှဲပြေစာ ပေးပို့ပြီး Pro ဖွင့်မည်' : 'Unlock PRO Access Now'}</span>
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Filters & Search */}
            <div className="p-4 sm:px-6 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: lang === 'my' ? 'အားလုံး' : 'All', icon: Layers },
                  { id: 'datasheet', label: 'Datasheets', icon: FileText },
                  { id: 'diagram', label: 'Diagrams', icon: Layers },
                  { id: 'guide', label: 'Guides', icon: BookOpen },
                  { id: 'database_csv', label: 'CSV Databases', icon: FileSpreadsheet },
                ].map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'my' ? 'ဖိုင်ရှာဖွေရန်...' : 'Search resources...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Resource List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {filteredResources.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                  <FolderDown className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <h4 className="text-slate-400 font-semibold text-sm">
                    {lang === 'my' ? 'ဖိုင်စာရင်း မတွေ့ရှိပါ' : 'No resources found'}
                  </h4>
                  <p className="text-slate-500 text-xs mt-1">
                    {searchQuery 
                      ? (lang === 'my' ? 'ရှာဖွေမှု စကားလုံးကို ပြောင်းလဲစစ်ဆေးပါ' : 'Try adjusting your search query')
                      : (lang === 'my' ? 'Admin မှ မကြာမီ ဖိုင်များ ထပ်မံထည့်သွင်းပေးပါမည်' : 'Admin will upload verified documents soon.')}
                  </p>
                </div>
              ) : (
                filteredResources.map((res) => (
                  <div
                    key={res.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        {getCategoryIcon(res.category)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-white">
                            {res.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                            {res.category.replace('_', ' ')}
                          </span>
                          {res.isPaidOnly && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              PRO
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2">
                          {res.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono">
                          <span>📄 {res.fileName}</span>
                          <span>&middot;</span>
                          <span>📦 {res.fileSize}</span>
                          <span>&middot;</span>
                          <span>📅 {new Date(res.uploadedAt).toLocaleDateString()}</span>
                          <span>&middot;</span>
                          <span>👤 {res.uploadedBy}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isAdmin && (
                        <button
                          onClick={() => onDeleteResource(res.id)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer border border-slate-800"
                          title="Delete resource"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDownload(res)}
                        className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{lang === 'my' ? 'ဒေါင်းလုဒ်' : 'Download'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
