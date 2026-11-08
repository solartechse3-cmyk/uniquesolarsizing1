import React, { useState } from 'react';
import { Printer, Download, X, Layers, FileText, CheckCircle2, User, MapPin, Loader2, Calendar } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { exportElementToA4Pdf, printA4Element } from '../lib/pdfExport';

interface BOQItemPrint {
  id: string;
  nameMy: string;
  nameEn?: string;
  nameZh?: string;
  specs: string;
  quantity: number;
  unitMy: string;
  unitEn?: string;
  unitZh?: string;
  unitPriceKs: number;
  totalPriceKs: number;
}

interface SolarMountingPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
  projectName: string;
  customerName: string;
  boqItems: BOQItemPrint[];
  grandTotalKs: number;
  totalPanels: number;
  numRows: number;
  numCols: number;
  orientation: 'landscape' | 'portrait';
  panelWatt: number;
  panelBrand: string;
  panelModel: string;
  roofType: string;
}

export const SolarMountingPrintModal: React.FC<SolarMountingPrintModalProps> = ({
  isOpen,
  onClose,
  lang,
  projectName,
  customerName,
  boqItems,
  grandTotalKs,
  totalPanels,
  numRows,
  numCols,
  orientation,
  panelWatt,
  panelBrand,
  panelModel,
  roofType
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [engineerName, setEngineerName] = useState('Solar Structural Engineer');
  const [siteLocation, setSiteLocation] = useState('Yangon, Myanmar');

  if (!isOpen) return null;

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const totalKw = (totalPanels * panelWatt) / 1000;

  const handlePrint = () => {
    const el = document.getElementById('solar-mounting-print-sheet');
    if (el) {
      printA4Element(el, `${projectName || 'Solar_Mounting'}_BOQ_Quotation`);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById('solar-mounting-print-sheet');
    if (!el) {
      window.print();
      return;
    }
    setIsExportingPdf(true);
    try {
      const fileName = `Solar_Mounting_BOQ_Quotation_${totalPanels}Panels_${Date.now()}`;
      await exportElementToA4Pdf(el, fileName);
    } catch (e) {
      console.error('PDF export error:', e);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Modal Container */}
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] overflow-y-auto border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:rounded-none">
        
        {/* Top Header Bar (Hidden in Print) */}
        <div className="sticky top-0 z-20 bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  {lang === 'my' 
                    ? 'ဆိုလာ တပ်ဆင်မှုစနစ် ကုန်ကျစရိတ်နှင့် ပစ္စည်းစာရင်း (BOQ Quotation Report)' 
                    : 'Solar Mounting System BOQ & Material Quotation'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-500 text-slate-950 font-black">
                  A4 PRINT READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'my'
                  ? 'အလူမီနီယမ် / GI ရထားလမ်း၊ ကလစ်များ၊ အောက်ခြေအထိုင်နှင့် ဆက်စပ်ပစ္စည်းများ တရားဝင် Quotation'
                  : 'Official Bill of Materials with pricing, array specs, and engineering sign-off'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              title="Download High-Resolution A4 PDF File"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'my' ? 'PDF ထုတ်ယူနေပါသည်...' : 'Generating PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{lang === 'my' ? 'PDF ဒေါင်းလုဒ်ဆွဲမည်' : 'Download PDF'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs shadow-md shadow-orange-500/20 cursor-pointer transition-all active:scale-95"
              title="Print directly to local printer"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'my' ? 'ပရင်တာသို့ Print ထုတ်မည်' : 'Print / Printer'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Metadata Quick Inputs (Hidden in Print) */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center gap-4 text-xs print:hidden">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold">Engineer:</span>
            <input
              type="text"
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-900 font-medium text-xs w-44 focus:outline-blue-500"
              placeholder="Design Engineer"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold">Location:</span>
            <input
              type="text"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-900 font-medium text-xs w-44 focus:outline-blue-500"
              placeholder="Site Location"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE DRAWING SHEET (ISO BOQ QUOTATION A4 FORMAT) */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-10 space-y-6 font-sans bg-white print:p-4 print:space-y-4" id="solar-mounting-print-sheet">
          
          {/* Header Title Block */}
          <div className="border-3 border-slate-900 rounded-2xl p-5 bg-slate-50/70 print:bg-white print:border-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-orange-400 flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
                  🏗️
                </div>
                <div>
                  <div className="text-[10px] font-mono font-black uppercase tracking-widest text-orange-600">
                    STRUCTURAL MOUNTING ENGINEERING · BILL OF MATERIALS & QUOTATION
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                    SOLAR MOUNTING STRUCTURE BILL OF QUANTITIES (BOQ)
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    ဆိုလာ ဖရိန်တပ်ဆင်မှု ပစ္စည်းစာရင်းနှင့် တန်ဖိုးတွက်ချက်မှု တရားဝင် အစီရင်ခံစာ
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-3 py-1 rounded-lg bg-orange-600 text-white font-mono font-extrabold text-xs uppercase tracking-wider">
                  OFFICIAL QUOTATION
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  REF: SMC-BOQ-{Date.now().toString().slice(-6)}
                </div>
              </div>
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PROJECT NAME</span>
                <span className="font-extrabold text-slate-900 text-sm truncate block">{projectName || 'Solar Rooftop Project'}</span>
              </div>
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CUSTOMER / CLIENT</span>
                <span className="font-extrabold text-slate-900 text-sm truncate block">{customerName || 'Direct Client'}</span>
              </div>
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">STRUCTURAL ENGINEER</span>
                <span className="font-extrabold text-slate-900 text-sm truncate block">{engineerName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">DATE & LOCATION</span>
                <span className="font-extrabold text-slate-900 text-sm truncate block">{currentDateStr} · {siteLocation}</span>
              </div>
            </div>
          </div>

          {/* Array System Specifications Card */}
          <div className="border-2 border-slate-800 rounded-2xl p-5 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                  Solar Array Configuration & Structural Baseline
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                {totalPanels} Panels ({totalKw.toFixed(2)} kWp)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Solar Module</span>
                <span className="font-black text-slate-900 text-sm block">{panelBrand || 'Tier-1 Mono'}</span>
                <span className="text-slate-600 text-[11px]">{panelModel} ({panelWatt}W)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Array Matrix</span>
                <span className="font-black text-slate-900 text-sm block">{numRows} Rows × {numCols} Cols</span>
                <span className="text-slate-600 text-[11px]">Total: {totalPanels} Modules</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Orientation</span>
                <span className="font-black text-slate-900 text-sm capitalize block">{orientation}</span>
                <span className="text-slate-600 text-[11px]">{orientation === 'portrait' ? 'Vertical Rails' : 'Horizontal Rails'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Roof / Structure Type</span>
                <span className="font-black text-slate-900 text-sm capitalize block">{roofType || 'Metal Tin Sheet'}</span>
                <span className="text-slate-600 text-[11px]">Heavy Duty GI / AL6005-T5</span>
              </div>
            </div>
          </div>

          {/* Itemized BOQ Table */}
          <div className="border-2 border-slate-900 rounded-2xl overflow-hidden bg-white">
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-400 text-slate-950 font-black text-xs flex items-center justify-center">2</span>
                <h3 className="font-black text-sm uppercase tracking-wider">
                  Itemized Bill of Materials & Cost Quotation (အသေးစိတ် ပစ္စည်းစာရင်းနှင့် တန်ဖိုး)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-orange-300 font-bold">
                CURRENCY: MYANMAR KYAT (MMK)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-300">
                    <th className="py-2.5 px-3 text-center">#</th>
                    <th className="py-2.5 px-4">Component Description</th>
                    <th className="py-2.5 px-3">Specification</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Unit Price (MMK)</th>
                    <th className="py-2.5 px-4 text-right">Subtotal (MMK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {boqItems.map((item, idx) => {
                    const displayName = lang === 'en' ? item.nameEn || item.nameMy : lang === 'zh' ? item.nameZh || item.nameMy : item.nameMy;
                    const displayUnit = lang === 'en' ? item.unitEn || item.unitMy : lang === 'zh' ? item.unitZh || item.unitMy : item.unitMy;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-extrabold text-slate-950">{displayName}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {item.specs}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                          {item.quantity} <span className="text-[10px] text-slate-500">{displayUnit}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-700">
                          {item.unitPriceKs.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-950">
                          {item.totalPriceKs.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-900 font-extrabold text-slate-900">
                    <td colSpan={4} className="py-3 px-4 text-right text-xs uppercase tracking-wider">
                      GRAND TOTAL ESTIMATION (စုစုပေါင်း ကုန်ကျစရိတ်ခန့်မှန်းခြေ):
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-right text-base sm:text-lg font-black font-mono text-emerald-700">
                      {grandTotalKs.toLocaleString()} <span className="text-xs font-bold text-slate-600">MMK</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Technical & Commercial Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Structural Material Standards (ပစ္စည်းအရည်အသွေး သတ်မှတ်ချက်များ)</span>
              </h4>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                • ရထားလမ်း (Rails) များသည် Hot-dip Galvanized (GI) သို့မဟုတ် Anodized Aluminum AL6005-T5 သံချေးမတက်သော အရည်အသွေးမြင့် ပစ္စည်းများဖြစ်ပါသည်။
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                • Mid Clamps, End Clamps နှင့် Fasteners (ဝက်အူ/မူလီ) အားလုံး SUS304 / A2 Stainless Steel သုံးစွဲထားသည်။
              </p>
            </div>

            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-1.5">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Commercial Terms & Validity (ကိုးကားချက်နှင့် စည်းကမ်းချက်များ)</span>
              </h4>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                • Quotation ၏ တန်ဖိုးသည် ထုတ်ပြန်သည့်နေ့မှစ၍ (၁၄) ရက်အတွင်း အတည်ဖြစ်ပါသည်။
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                • အမှန်တကယ် ဆိုက်ရောက်တပ်ဆင်ရာတွင် အမိုးဖွဲ့စည်းပုံအခြေအနေအရ အနည်းငယ် ပြောင်းလဲမှုရှိနိုင်ပါသည်။
              </p>
            </div>
          </div>

          {/* Approval Signatures Block */}
          <div className="border-2 border-slate-900 rounded-2xl p-5 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2 text-xs">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">PREPARED BY (ENGINEERING DEPT):</span>
                  <span className="font-black text-slate-900 text-sm block">{engineerName}</span>
                  <span className="text-slate-500 text-[11px]">Solar Photovoltaic Structure Design Specialist</span>
                </div>
                <div className="pt-8 border-b-2 border-slate-400 w-3/4"></div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Signature & Company Seal</span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">ACCEPTED & APPROVED BY (CLIENT):</span>
                  <span className="font-black text-slate-900 text-sm block">{customerName || 'Customer / Site Representative'}</span>
                  <span className="text-slate-500 text-[11px]">Authorized Project Representative</span>
                </div>
                <div className="pt-8 border-b-2 border-slate-400 w-3/4"></div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Client Signature & Date</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-200">
            Solar Mounting Engineering Suite · ISO 9001 / IEC 62548 Compliant · Printed on {new Date().toLocaleString()}
          </div>
        </div>

      </div>
    </div>
  );
};
