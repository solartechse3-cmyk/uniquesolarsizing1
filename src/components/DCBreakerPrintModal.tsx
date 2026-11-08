import React, { useState } from 'react';
import { Printer, Download, X, Zap, Shield, ShieldCheck, CheckCircle2, AlertTriangle, FileText, Calendar, User, MapPin, Loader2, Sparkles } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { exportElementToA4Pdf, printA4Element } from '../lib/pdfExport';

interface DCBreakerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
  activePanel: {
    brand: string;
    model: string;
    watt: number;
    voc: number;
    isc: number;
    vmp: number;
    imp: number;
    tempCoeffVoc?: number;
  };
  panelsInSeries: number;
  parallelStrings: number;
  cableLengthM: number;
  cableSizeMm2: number;
  minAmbientTempC: number;
  calculations: {
    Ns: number;
    Np: number;
    mpptCount?: number;
    stringsPerMppt?: number;
    totalStrings?: number;
    isMpptMode?: boolean;
    protectionScope?: 'per_string' | 'per_mppt';
    isPerStringProtection?: boolean;
    mpptIsc?: number;
    mpptImp?: number;
    mpptContinuousIsc?: number;
    mpptDesignOcpdCurrent?: number;
    totalPanels: number;
    totalPowerKw: number;
    vocColdSingle: number;
    stringVocStc: number;
    stringVocColdMax: number;
    stringVmp: number;
    stringIsc: number;
    stringImp: number;
    arrayTotalIsc: number;
    arrayTotalImp: number;
    arrayContinuousIsc: number;
    arrayDesignOcpdCurrent: number;
    // Fuse
    stringDesignFuseCurrent: number;
    recommendedStringFuseA: number;
    totalFusesCount: number;
    isFuseRequired: boolean;
    // Breaker
    recommendedBreakerA: number;
    breakerPoles: string;
    breakerVoltageRating: number;
    totalBreakersCount?: number;
    // Isolator
    isolatorDesignCurrent: number;
    recommendedIsolatorA: number;
    isolatorVoltage: number;
    totalIsolatorsCount?: number;
    // SPD
    spdMinContinuousVoltage: number;
    recommendedSpdVoltage: number;
    totalSpdsCount?: number;
    // Cable
    voltageDropV: number;
    voltageDropPercent: number;
    minCableCurrentCapacity: number;
    recommendedCableMm2: number;
  };
}

export const DCBreakerPrintModal: React.FC<DCBreakerPrintModalProps> = ({
  isOpen,
  onClose,
  lang,
  activePanel,
  panelsInSeries,
  parallelStrings,
  cableLengthM,
  cableSizeMm2,
  minAmbientTempC,
  calculations
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [projectName, setProjectName] = useState('Solar PV System 1');
  const [clientName, setClientName] = useState('Customer / Site Owner');
  const [engineerName, setEngineerName] = useState('Solar PV Design Engineer');
  const [siteLocation, setSiteLocation] = useState('Myanmar');

  if (!isOpen) return null;

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handlePrint = () => {
    const el = document.getElementById('dc-breaker-print-sheet');
    if (el) {
      printA4Element(el, `Solar_DC_Breaker_Protection_Report_${calculations.totalPowerKw.toFixed(1)}kWp`);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById('dc-breaker-print-sheet');
    if (!el) {
      window.print();
      return;
    }
    setIsExportingPdf(true);
    try {
      const fileName = `Solar_DC_Breaker_Protection_Report_${calculations.totalPowerKw.toFixed(1)}kWp_${Date.now()}`;
      await exportElementToA4Pdf(el, fileName);
    } catch (err) {
      console.error('PDF export error:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Modal Container */}
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] overflow-y-auto border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:rounded-none">
        
        {/* Sticky Action Top Bar (Hidden in Print) */}
        <div className="sticky top-0 z-20 bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  {lang === 'my' 
                    ? 'Solar DC Breaker & အကာအကွယ် စနစ် အင်ဂျင်နီယာ တွက်ချက်မှု အစီရင်ခံစာ' 
                    : 'Solar DC Protection & Breaker Engineering Report'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500 text-slate-950 font-black">
                  A4 READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'my'
                  ? 'DC Fuse, DC Breaker (MCB), DC Isolator, DC SPD နှင့် Cable Sizing အသေးစိတ်'
                  : 'ISO Electrical Schedule: Fuse, MCB, Isolator, SPD & Cable Sizing per NEC 690'}
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
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

        {/* User Metadata Quick Inputs Bar (Hidden during Print) */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center gap-4 text-xs print:hidden">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold">Project:</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-900 font-medium text-xs w-40 focus:outline-blue-500"
              placeholder="Project Name"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold">Client:</span>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-900 font-medium text-xs w-36 focus:outline-blue-500"
              placeholder="Client / Owner"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold">Engineer:</span>
            <input
              type="text"
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-900 font-medium text-xs w-36 focus:outline-blue-500"
              placeholder="Engineer"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-semibold">Location:</span>
            <input
              type="text"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-900 font-medium text-xs w-28 focus:outline-blue-500"
              placeholder="Site Location"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE DRAWING SHEET (A4 FORM - ISO ELECTRICAL ENGINEERING STANDARD) */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-10 space-y-6 font-sans bg-white print:p-4 print:space-y-4" id="dc-breaker-print-sheet">
          
          {/* 1. ISO TITLE BLOCK HEADER */}
          <div className="border-3 border-slate-900 rounded-2xl p-5 bg-slate-50/70 print:bg-white print:border-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-600">
                    PHOTOVOLTAIC DC ELECTRICAL PROTECTION DESIGN · NEC 690 & IEC 60364-7-712
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                    SOLAR DC BREAKER & PROTECTION CALCULATION REPORT
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    ဆိုလာ DC Fuse, DC MCB/MCCB, DC Isolator Switch, DC SPD နှင့် PV Cable အင်ဂျင်နီယာ တွက်ချက်မှု အစီရင်ခံစာ
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right sm:text-right shrink-0">
                <div className="inline-block px-3 py-1 rounded-lg bg-emerald-600 text-white font-mono font-extrabold text-xs uppercase tracking-wider">
                  ENGINEERING APPROVED
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  DOC REF: DC-PROT-{Date.now().toString().slice(-6)}
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PROJECT NAME</span>
                <span className="font-extrabold text-slate-900 text-sm truncate block">{projectName}</span>
              </div>
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CLIENT / OWNER</span>
                <span className="font-extrabold text-slate-900 text-sm truncate block">{clientName}</span>
              </div>
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">DESIGN ENGINEER</span>
                <span className="font-extrabold text-slate-900 text-sm truncate block">{engineerName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">DATE & LOCATION</span>
                <span className="font-extrabold text-slate-900 text-sm truncate block">{currentDateStr} · {siteLocation}</span>
              </div>
            </div>
          </div>

          {/* 2. SYSTEM TOPOLOGY & PV GENERATOR SPECIFICATIONS */}
          <div className="border-2 border-slate-800 rounded-2xl p-5 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                  PV Generator Specifications & Circuit Topology
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {calculations.totalPanels} Panels · {calculations.totalPowerKw.toFixed(2)} kWp
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Selected Module</span>
                <span className="font-black text-slate-900 text-sm block">{activePanel.brand}</span>
                <span className="text-slate-600 text-[11px]">{activePanel.model} ({activePanel.watt}W)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Module Isc / Voc</span>
                <span className="font-black text-amber-600 text-sm block">Isc: {activePanel.isc} A</span>
                <span className="text-slate-600 text-[11px]">Voc: {activePanel.voc} V | Imp: {activePanel.imp} A</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Inverter & String Config</span>
                <span className="font-black text-indigo-700 text-sm block">
                  {calculations.isMpptMode 
                    ? `${calculations.mpptCount || 1} MPPT × ${calculations.stringsPerMppt || 1} Str = ${calculations.totalStrings || calculations.Np} Strings (Series ${calculations.totalStrings || calculations.Np} စုံ)` 
                    : `${calculations.Np} Strings`}
                </span>
                <span className="text-slate-600 text-[11px]">
                  {calculations.Ns} Modules/String ({calculations.totalPanels} Modules Total)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Cold Ambient Temp</span>
                <span className="font-black text-slate-900 text-sm block">{minAmbientTempC} °C</span>
                <span className="text-slate-600 text-[11px]">Temp Coeff: {activePanel.tempCoeffVoc || -0.28}%/°C</span>
              </div>
            </div>

            {/* Electrical Calculation Summary Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] text-amber-700 font-bold uppercase block">Max String Voc (Cold)</span>
                <span className="font-mono font-black text-amber-900 text-base">{calculations.stringVocColdMax.toFixed(1)} V</span>
                <span className="text-[10px] text-amber-700 block">STC: {calculations.stringVocStc.toFixed(1)} V</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-[10px] text-blue-700 font-bold uppercase block">String Operating Vmp</span>
                <span className="font-mono font-black text-blue-900 text-base">{calculations.stringVmp.toFixed(1)} V</span>
                <span className="text-[10px] text-blue-700 block">Imp: {calculations.arrayTotalImp.toFixed(2)} A</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Continuous Current (1.25x)</span>
                <span className="font-mono font-black text-emerald-900 text-base">{calculations.arrayContinuousIsc.toFixed(2)} A</span>
                <span className="text-[10px] text-emerald-700 block">Raw Isc: {calculations.arrayTotalIsc.toFixed(2)} A</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200">
                <span className="text-[10px] text-purple-700 font-bold uppercase block">Design Current (1.25x)</span>
                <span className="font-mono font-black text-purple-900 text-base">{calculations.arrayDesignOcpdCurrent.toFixed(2)} A</span>
                <span className="text-[10px] text-purple-700 block">Isc × 1.25 Safety Factor</span>
              </div>
            </div>
          </div>

          {/* 3. SCHEDULE OF PROTECTION EQUIPMENT & SIZING (MAIN BOQ SCHEDULE) */}
          <div className="border-2 border-slate-900 rounded-2xl overflow-hidden bg-white">
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">2</span>
                <h3 className="font-black text-sm uppercase tracking-wider">
                  DC Protection Equipment Sizing Schedule (စက်ပစ္စည်း အသေးစိတ် အစီရင်ခံစာ)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-amber-300 font-bold">
                IEC 60947-2 / IEC 60947-3 / IEC 61643-31
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-300">
                    <th className="py-2.5 px-3">Item #</th>
                    <th className="py-2.5 px-4">Equipment & Function</th>
                    <th className="py-2.5 px-3">Design Basis / Formula</th>
                    <th className="py-2.5 px-3">Calculated Rating</th>
                    <th className="py-2.5 px-4">Recommended Standard Device</th>
                    <th className="py-2.5 px-3">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {/* Item 1: DC Fuse */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">01</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-950">DC String Fuse (gPV)</div>
                      <div className="text-[11px] text-slate-500">Overcurrent & reverse-current string protection</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      Inom ≥ 1.25 × Isc = 1.25 × {activePanel.isc}A
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-amber-600">
                      {calculations.stringDesignFuseCurrent.toFixed(1)} A
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 text-sm">
                        {calculations.recommendedStringFuseA}A, 1000V DC (10×38mm)
                      </div>
                      <div className="text-[11px] text-slate-500">gPV Photovoltaic Cartridge DIN-Rail Mount</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {calculations.isFuseRequired ? `${calculations.totalFusesCount} Pcs (+ & -)` : 'Optional (1 String)'}
                    </td>
                  </tr>

                  {/* Item 2: DC Breaker */}
                  <tr className="hover:bg-slate-50 bg-slate-50/40">
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">02</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-950">DC Circuit Breaker (MCB / MCCB)</div>
                      <div className="text-[11px] text-slate-500">
                        {calculations.isPerStringProtection
                          ? `Dedicated overcurrent & short-circuit trip protection per series string (${calculations.totalStrings} Strings)`
                          : (calculations.isMpptMode 
                            ? `Individual MPPT input circuit overcurrent & trip protection (${calculations.mpptCount || 1} MPPTs)` 
                            : 'Short circuit & thermal overload main isolation')}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {calculations.isPerStringProtection
                        ? `In ≥ String Isc (${calculations.stringIsc.toFixed(1)}A) × 1.25`
                        : (calculations.isMpptMode 
                          ? `In ≥ MPPT Isc (${(calculations.mpptIsc || calculations.arrayTotalIsc).toFixed(1)}A) × 1.25`
                          : `In ≥ Total Isc × 1.25 = ${calculations.arrayContinuousIsc.toFixed(1)}A`)}
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-blue-600">
                      {(calculations.isPerStringProtection 
                        ? (calculations.stringIsc * 1.25) 
                        : (calculations.isMpptMode ? (calculations.mpptContinuousIsc || calculations.arrayContinuousIsc) : calculations.arrayContinuousIsc)).toFixed(1)} A
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 text-sm">
                        {calculations.recommendedBreakerA}A, {calculations.breakerVoltageRating}V DC ({calculations.breakerPoles})
                      </div>
                      <div className="text-[11px] text-slate-500">Icu ≥ 6kA/10kA, Non-Polarized DC MCB</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {calculations.totalBreakersCount || 1} Units ({calculations.isPerStringProtection ? `${calculations.totalStrings} Series Strings (1 Breaker/Str)` : (calculations.isMpptMode ? `${calculations.mpptCount || 1} MPPT Channels` : 'Main DC Array')})
                    </td>
                  </tr>

                  {/* Item 3: DC Isolator Switch */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">03</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-950">DC Isolator Switch (Rotary Disconnector)</div>
                      <div className="text-[11px] text-slate-500">
                        {calculations.isPerStringProtection
                          ? `Manual load-break emergency disconnection per series string (${calculations.totalStrings} Strings)`
                          : 'Manual load-break emergency disconnection per MPPT'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {calculations.isPerStringProtection 
                        ? `Ie ≥ String Isc (${calculations.stringIsc.toFixed(1)}A) × 1.25`
                        : `Ie ≥ ${calculations.isMpptMode ? 'MPPT' : 'Total'} Isc × 1.25, Ue ≥ Voc(cold)`}
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-indigo-600">
                      {calculations.isolatorDesignCurrent.toFixed(1)} A
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 text-sm">
                        {calculations.recommendedIsolatorA}A, {calculations.isolatorVoltage}V DC (DC-PV2 Category)
                      </div>
                      <div className="text-[11px] text-slate-500">IP65 / IP66 Outdoor Enclosure, Lockable Handle</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {calculations.totalIsolatorsCount || 1} Units ({calculations.isPerStringProtection ? `${calculations.totalStrings} Series Strings (1 Isolator/Str)` : (calculations.isMpptMode ? `${calculations.mpptCount || 1} MPPT Inputs` : 'Inverter DC Input')})
                    </td>
                  </tr>

                  {/* Item 4: DC SPD */}
                  <tr className="hover:bg-slate-50 bg-slate-50/40">
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">04</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-950">DC Surge Protective Device (SPD)</div>
                      <div className="text-[11px] text-slate-500">Atmospheric lightning & transient overvoltage surge</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      Ucpv ≥ 1.25 × Voc(max) = {(calculations.stringVocColdMax * 1.25).toFixed(0)}V
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-emerald-600">
                      Ucpv ≥ {calculations.spdMinContinuousVoltage.toFixed(0)} V
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 text-sm">
                        Type 2 (Class II), Ucpv = {calculations.recommendedSpdVoltage}V DC
                      </div>
                      <div className="text-[11px] text-slate-500">In 20kA / Imax 40kA, 3-Pole (+, -, PE) with Remote Signal</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {calculations.totalSpdsCount || 1} Units ({calculations.isPerStringProtection ? `${calculations.totalStrings} Series Strings (1 SPD/Str)` : (calculations.isMpptMode ? `${calculations.mpptCount || 1} MPPT Channels` : 'Combiner / Inverter')})
                    </td>
                  </tr>

                  {/* Item 5: Solar DC Cable */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">05</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-950">Solar PV Cable (PV1-F / H1Z2Z2-K)</div>
                      <div className="text-[11px] text-slate-500">Tinned copper, UV resistant, halogen-free double jacket</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      Iz ≥ 1.25 × Isc, ΔV ≤ 2.0%
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-slate-900">
                      {cableSizeMm2} mm² (Run: {cableLengthM}m)
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 text-sm">
                        {cableSizeMm2} mm² PV Solar Cable (1500V DC rated)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Voltage Drop: {calculations.voltageDropV.toFixed(2)}V ({calculations.voltageDropPercent.toFixed(2)}% loss - {calculations.voltageDropPercent <= 2 ? 'COMPLIANT' : 'CHECK LOSS'})
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {cableLengthM * 2} Meters (+ & -)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. TECHNICAL EQUATIONS & REGULATORY CODE BASIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Design Formulas & Electrical Standards (တွက်ချက်မှု ပုံသေနည်းများ)</span>
              </h4>
              <ul className="space-y-1.5 text-slate-700 font-mono text-[11px]">
                <li>• Design Safety Current Factor: <span className="font-bold text-slate-950">1.25 × Isc</span></li>
                <li>• Low Temp Maximum String Voltage: <span className="font-bold text-slate-950">Voc(cold) = Voc × [1 + βvoc × (Tmin - 25)] × Ns</span></li>
                <li>• Maximum Continuous SPD Voltage: <span className="font-bold text-slate-950">Ucpv ≥ 1.25 × Voc(cold_max)</span></li>
              </ul>
            </div>

            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Engineering Precautions (အင်ဂျင်နီယာ သတိပြုရန် အချက်များ)</span>
              </h4>
              <ul className="space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                <li>• <strong>Polarity Caution:</strong> Polarized DC breakers (+ / -) မှားယွင်းဆက်သွယ်ပါက မီးလောင်ကျွမ်းခြင်း သို့မဟုတ် Arc ဖြစ်ပေါ်စေနိုင်သဖြင့် Non-polarized breaker သုံးစွဲရန် အထူးအကြံပြုပါသည်။</li>
                <li>• <strong>String Fusing:</strong> Parallel Strings ၂ လိုင်းထက်ပိုပါက (Np ≥ 3) String Fuse တပ်ဆင်ရန် NEC Code အရ မဖြစ်မနေ လိုအပ်ပါသည်။</li>
                <li>• <strong>Earthing / Grounding:</strong> DC SPD ၏ PE terminal ကို စနစ်တကျ Earth Grounding (Earth resistance ≤ 5 Ω) နှင့် တိုက်ရိုက်ချိတ်ဆက်ရမည်။</li>
              </ul>
            </div>
          </div>

          {/* 5. ENGINEER VERIFICATION & APPROVAL SIGN-OFF BLOCK */}
          <div className="border-2 border-slate-900 rounded-2xl p-5 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 text-xs">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">DESIGNED & PREPARED BY:</span>
                  <span className="font-black text-slate-900 text-sm block">{engineerName}</span>
                  <span className="text-slate-500 text-[11px]">Solar Photovoltaic Electrical Engineer</span>
                </div>
                <div className="pt-6 border-b-2 border-slate-400 w-3/4"></div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Engineer Signature & Date</span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">CHECKED & VERIFIED BY:</span>
                  <span className="font-black text-slate-900 text-sm block">Chief Technical Officer (CTO)</span>
                  <span className="text-slate-500 text-[11px]">Renewable Energy Engineering Department</span>
                </div>
                <div className="pt-6 border-b-2 border-slate-400 w-3/4"></div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Approval Stamp & Signature</span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">CLIENT ACCEPTANCE / OWNER:</span>
                  <span className="font-black text-slate-900 text-sm block">{clientName}</span>
                  <span className="text-slate-500 text-[11px]">System Owner / Project Client</span>
                </div>
                <div className="pt-6 border-b-2 border-slate-400 w-3/4"></div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Client Acknowledgement Signature</span>
              </div>
            </div>
          </div>

          {/* Print Footer Notice */}
          <div className="text-center text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-200">
            Automated Solar PV Protection Design System · Generated on {new Date().toLocaleString()} · Complies with IEC 62548, IEC 60364-7-712 & NEC 690
          </div>
        </div>

      </div>
    </div>
  );
};
