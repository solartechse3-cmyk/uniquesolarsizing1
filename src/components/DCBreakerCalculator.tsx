import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Shield,
  ShieldCheck, 
  ShieldAlert, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  SlidersHorizontal, 
  ArrowRight, 
  Layers, 
  Sun, 
  Info, 
  RotateCcw, 
  Copy, 
  Check, 
  Printer, 
  FileText,
  ChevronDown,
  Activity,
  Maximize2,
  Cpu
} from 'lucide-react';
import { PanelPreset, SupportedLanguage } from '../types';
import { DEFAULT_PANEL_PRESETS } from '../data/panelPresets';
import { DCBreakerPrintModal } from './DCBreakerPrintModal';

interface DCBreakerCalculatorProps {
  lang: SupportedLanguage;
  theme: 'dark' | 'light';
  customPanels?: PanelPreset[];
  onShowToast?: (msg: { text: string; type?: 'success' | 'error' | 'info' }) => void;
}

export const DCBreakerCalculator: React.FC<DCBreakerCalculatorProps> = ({
  lang,
  theme,
  customPanels = [],
  onShowToast
}) => {
  // Combine default and custom panels with deduplication by ID
  const allPanels = useMemo(() => {
    const list: PanelPreset[] = [];
    const seen = new Set<string>();

    (customPanels || []).forEach(p => {
      if (p.id && !seen.has(p.id)) {
        seen.add(p.id);
        list.push(p);
      }
    });

    DEFAULT_PANEL_PRESETS.forEach(p => {
      if (p.id && !seen.has(p.id)) {
        seen.add(p.id);
        list.push(p);
      }
    });

    return list;
  }, [customPanels]);

  // Selected Panel State
  const [selectedPanelId, setSelectedPanelId] = useState<string>(allPanels[0]?.id || 'custom');
  const [isManualPanelMode, setIsManualPanelMode] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Manual Panel Overrides
  const [manualPanel, setManualPanel] = useState<{
    brand: string;
    model: string;
    watt: number;
    voc: number;
    vmp: number;
    isc: number;
    imp: number;
    tempCoeffVoc: number; // in %/°C, e.g. -0.28
  }>({
    brand: 'Custom Tier-1',
    model: 'Mono 585W',
    watt: 585,
    voc: 52.1,
    vmp: 43.8,
    isc: 14.15,
    imp: 13.36,
    tempCoeffVoc: -0.28
  });

  // Active Panel Specs
  const activePanel = useMemo(() => {
    if (isManualPanelMode || selectedPanelId === 'custom') {
      return manualPanel;
    }
    const found = allPanels.find(p => p.id === selectedPanelId);
    if (found) {
      return {
        brand: found.brand,
        model: found.model,
        watt: found.watt,
        voc: found.voc,
        vmp: found.vmp,
        isc: found.isc,
        imp: found.imp,
        tempCoeffVoc: -0.28 // standard default
      };
    }
    return manualPanel;
  }, [isManualPanelMode, selectedPanelId, allPanels, manualPanel]);

  // Environmental Ambient Temperature
  const [minAmbientTempC, setMinAmbientTempC] = useState<number>(15); // Myanmar winter morning min temp ~15°C

  // Series and Inverter Architecture Configuration
  const [panelsInSeries, setPanelsInSeries] = useState<number>(14); // Ns
  
  // Wiring Architecture:
  // 'mppt' = Multi-MPPT Inverter (1 to 8 MPPT Trackers, with dedicated series string inputs per MPPT)
  // 'combiner' = Central Combiner Box (Direct strings into combiner circuit)
  const [wiringMode, setWiringMode] = useState<'mppt' | 'combiner'>('mppt');
  const [mpptCount, setMpptCount] = useState<number>(2); // e.g. 1, 2, 3, 4, 6 MPPTs
  const [stringsPerMppt, setStringsPerMppt] = useState<number>(2); // 1 = 1 string/MPPT, 2 = 2 strings/MPPT (e.g. 2 MPPT x 2 = 4 strings total, 4 MPPT x 2 = 8 strings total)
  const [parallelStrings, setParallelStrings] = useState<number>(4); // for central combiner mode

  // Protection Architecture:
  // 'per_string' = Dedicated protection per series string (1 Breaker, 1 Isolator, 1 SPD per series string, 2 Fuses per string (+ & -))
  // 'per_mppt' = Grouped protection per MPPT input channel
  const [protectionScope, setProtectionScope] = useState<'per_string' | 'per_mppt'>('per_string');

  // Safety Factor Settings:
  // User specified: "isc and voc ကို 1.25 နဲ့ပဲမြှောက်ပေးပါ safety factor ကို"
  // Both Isc and Voc are multiplied by 1.25 safety factor
  const safetyFactorIsc = 1.25;
  const safetyFactorVoc = 1.25;

  // DC Cable parameters
  const [cableLengthM, setCableLengthM] = useState<number>(25); // one-way run length in meters
  const [cableSizeMm2, setCableSizeMm2] = useState<number>(6.0); // 4.0, 6.0, 10.0, 16.0

  // Copy state
  const [copied, setCopied] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // CALCULATIONS
  // --------------------------------------------------------------------------
  const calculations = useMemo(() => {
    const isMpptMode = wiringMode === 'mppt';
    const actualMpptCount = isMpptMode ? Math.max(1, mpptCount) : 1;
    const actualStringsPerMppt = isMpptMode ? Math.max(1, stringsPerMppt) : Math.max(1, parallelStrings);
    const totalStrings = isMpptMode ? actualMpptCount * actualStringsPerMppt : Math.max(1, parallelStrings);
    const isPerStringProtection = protectionScope === 'per_string';

    const Ns = Math.max(1, panelsInSeries);
    const Np = actualStringsPerMppt; // Strings connected per MPPT channel (or total strings)
    const totalPanels = Ns * totalStrings;
    const totalPowerKw = (totalPanels * activePanel.watt) / 1000;

    // Cold Temperature Voltage Correction
    // Voc(cold) = Voc_stc * [1 + (tempCoeff / 100) * (Tmin - 25)]
    const tempDelta = minAmbientTempC - 25;
    const vocColdSingle = activePanel.voc * (1 + (activePanel.tempCoeffVoc / 100) * tempDelta);
    
    // String Voltages (Series)
    const stringVocStc = Ns * activePanel.voc;
    const stringVocColdMax = Ns * vocColdSingle;
    const stringVmp = Ns * activePanel.vmp;

    // Single String Current
    const stringIsc = activePanel.isc;
    const stringImp = activePanel.imp;

    // Per-MPPT Channel Current (Current entering each MPPT input channel)
    const mpptIsc = actualStringsPerMppt * stringIsc;
    const mpptImp = actualStringsPerMppt * stringImp;
    const mpptContinuousIsc = mpptIsc * safetyFactorIsc; // Isc_mppt * 1.25
    const mpptDesignOcpdCurrent = mpptIsc * safetyFactorIsc; // Isc_mppt * 1.25

    // Total System Current (across all MPPTs/strings)
    const arrayTotalIsc = totalStrings * stringIsc;
    const arrayTotalImp = totalStrings * stringImp;
    const arrayContinuousIsc = arrayTotalIsc * safetyFactorIsc; // Total Isc * 1.25
    const arrayDesignOcpdCurrent = arrayTotalIsc * safetyFactorIsc; // Total Isc * 1.25

    // 1. DC FUSE CALCULATION (Per String gPV Fuse)
    // Sized by Isc * 1.25
    const stringDesignFuseCurrent = stringIsc * safetyFactorIsc;
    const standardFuseRatings = [10, 12, 15, 16, 20, 25, 30, 32, 40, 50];
    const recommendedStringFuseA = standardFuseRatings.find(r => r >= stringDesignFuseCurrent) || 32;
    const isFuseRequired = isPerStringProtection || actualStringsPerMppt >= 2;
    const totalFusesCount = totalStrings * 2; // Positive & negative legs per string (e.g. 4 strings = 8 fuses)

    // 2. DC BREAKER (DC MCB / MCCB)
    // Sized by Isc * 1.25
    const breakerDesignCurrent = isPerStringProtection 
      ? (stringIsc * safetyFactorIsc)
      : (isMpptMode ? mpptDesignOcpdCurrent : arrayDesignOcpdCurrent);
    const standardBreakerRatings = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200];
    const recommendedBreakerA = standardBreakerRatings.find(r => r >= breakerDesignCurrent) || 32;
    const totalBreakersCount = isPerStringProtection ? totalStrings : (isMpptMode ? actualMpptCount : 1);

    let breakerPoles = '2P (500V/550V DC)';
    let breakerVoltageRating = 500;
    if (stringVocColdMax > 1000) {
      breakerPoles = '4P / MCCB (1200V/1500V DC)';
      breakerVoltageRating = 1500;
    } else if (stringVocColdMax > 500) {
      breakerPoles = '4P (1000V DC) / 2P 1000V';
      breakerVoltageRating = 1000;
    }

    // 3. DC ISOLATOR SWITCH (Rotary Disconnector IEC 60947-3 DC-PV2)
    // Sized by Isc * 1.25
    const isolatorDesignCurrent = isPerStringProtection
      ? (stringIsc * safetyFactorIsc)
      : (isMpptMode ? mpptContinuousIsc : arrayContinuousIsc);
    const standardIsolatorRatings = [16, 25, 32, 40, 63, 100, 125];
    const recommendedIsolatorA = standardIsolatorRatings.find(r => r >= isolatorDesignCurrent) || 32;
    const isolatorVoltage = stringVocColdMax > 1000 ? 1500 : stringVocColdMax > 600 ? 1000 : 600;
    const totalIsolatorsCount = isPerStringProtection ? totalStrings : (isMpptMode ? actualMpptCount : 1);

    // 4. DC SPD (Surge Protective Device Type 2)
    // Sized by Voc(cold max) * 1.25
    const spdMinContinuousVoltage = stringVocColdMax * safetyFactorVoc;
    let recommendedSpdVoltage = 600;
    if (spdMinContinuousVoltage > 1000) {
      recommendedSpdVoltage = 1500;
    } else if (spdMinContinuousVoltage > 600) {
      recommendedSpdVoltage = 1000;
    }
    const totalSpdsCount = isPerStringProtection ? totalStrings : (isMpptMode ? actualMpptCount : 1);

    // 5. DC CABLE SIZING & VOLTAGE DROP
    const rho = 0.0175;
    const loopDistanceM = 2 * cableLengthM;
    const cableResistance = (rho * loopDistanceM) / cableSizeMm2;
    const currentInCableRun = isPerStringProtection ? stringImp : (isMpptMode ? mpptImp : arrayTotalImp);
    const voltageDropV = currentInCableRun * cableResistance;
    const voltageDropPercent = (voltageDropV / stringVmp) * 100;
    const minCableCurrentCapacity = isPerStringProtection ? (stringIsc * safetyFactorIsc) : (isMpptMode ? mpptContinuousIsc : arrayContinuousIsc);

    let recommendedCableMm2 = 4.0;
    if (minCableCurrentCapacity > 45) {
      recommendedCableMm2 = 16.0;
    } else if (minCableCurrentCapacity > 32) {
      recommendedCableMm2 = 10.0;
    } else if (minCableCurrentCapacity > 22) {
      recommendedCableMm2 = 6.0;
    }

    return {
      Ns,
      Np,
      mpptCount: actualMpptCount,
      stringsPerMppt: actualStringsPerMppt,
      totalStrings,
      isMpptMode,
      protectionScope,
      isPerStringProtection,
      safetyFactorIsc,
      safetyFactorVoc,
      totalPanels,
      totalPowerKw,
      vocColdSingle,
      stringVocStc,
      stringVocColdMax,
      stringVmp,
      stringIsc,
      stringImp,
      mpptIsc,
      mpptImp,
      mpptContinuousIsc,
      mpptDesignOcpdCurrent,
      arrayTotalIsc,
      arrayTotalImp,
      arrayContinuousIsc,
      arrayDesignOcpdCurrent,
      // Fuse
      stringDesignFuseCurrent,
      recommendedStringFuseA,
      totalFusesCount,
      isFuseRequired,
      // Breaker
      breakerDesignCurrent,
      recommendedBreakerA,
      breakerPoles,
      breakerVoltageRating,
      totalBreakersCount,
      // Isolator
      isolatorDesignCurrent,
      recommendedIsolatorA,
      isolatorVoltage,
      totalIsolatorsCount,
      // SPD
      spdMinContinuousVoltage,
      recommendedSpdVoltage,
      totalSpdsCount,
      // Cable
      voltageDropV,
      voltageDropPercent,
      minCableCurrentCapacity,
      recommendedCableMm2
    };
  }, [panelsInSeries, parallelStrings, wiringMode, mpptCount, stringsPerMppt, protectionScope, activePanel, minAmbientTempC, safetyFactorIsc, safetyFactorVoc, cableLengthM, cableSizeMm2]);

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const summary = `=== SOLAR DC BREAKER & PROTECTION CALCULATION ===
Panel: ${activePanel.brand} ${activePanel.model} (${activePanel.watt}W)
Isc: ${activePanel.isc}A | Voc: ${activePanel.voc}V | Imp: ${activePanel.imp}A | Vmp: ${activePanel.vmp}V
Architecture: ${calculations.isMpptMode ? `${calculations.mpptCount} MPPT Trackers × ${calculations.stringsPerMppt} String/MPPT = ${calculations.totalStrings} Strings (Series ${calculations.totalStrings} စုံ)` : `${calculations.Np} Strings in Combiner`}
Protection Scheme: ${calculations.isPerStringProtection ? 'Dedicated Per Series String (စတြင်း ၁ စုံစီ သီးခြား အကာအကွယ်)' : 'Grouped Per MPPT Channel'}
Array Layout: ${calculations.Ns} Modules/String × ${calculations.totalStrings} Strings = ${calculations.totalPanels} Panels (${calculations.totalPowerKw.toFixed(2)} kWp)
Max Cold Voc: ${calculations.stringVocColdMax.toFixed(1)}V | Vmp: ${calculations.stringVmp.toFixed(1)}V
Current: ${calculations.isPerStringProtection ? `Single String Isc = ${calculations.stringIsc.toFixed(2)}A | Total System Isc = ${calculations.arrayTotalIsc.toFixed(2)}A` : `MPPT Input Isc = ${calculations.mpptIsc.toFixed(2)}A | Total System Isc = ${calculations.arrayTotalIsc.toFixed(2)}A`}
Continuous Current: ${(calculations.isMpptMode ? calculations.mpptContinuousIsc : calculations.arrayContinuousIsc).toFixed(2)}A
Design OCPD Current: ${(calculations.isMpptMode ? calculations.mpptDesignOcpdCurrent : calculations.arrayDesignOcpdCurrent).toFixed(2)}A

[RECOMMENDED PROTECTION DEVICES]
1. DC Fuse (gPV 10×38mm): ${calculations.recommendedStringFuseA}A @ 1000V DC - ${calculations.totalFusesCount} Pcs (+ & - poles per string)
2. DC Breaker (DC MCB): ${calculations.recommendedBreakerA}A @ ${calculations.breakerVoltageRating}V DC (${calculations.breakerPoles}) - ${calculations.totalBreakersCount} Pcs (${calculations.isPerStringProtection ? `${calculations.totalStrings} Series Strings (1 Breaker/String)` : `${calculations.mpptCount} MPPT Inputs`})
3. DC Isolator Switch: ${calculations.recommendedIsolatorA}A @ ${calculations.isolatorVoltage}V DC (IEC 60947-3 DC-PV2) - ${calculations.totalIsolatorsCount} Pcs (${calculations.isPerStringProtection ? `${calculations.totalStrings} Series Strings (1 Isolator/String)` : `${calculations.mpptCount} MPPT Inputs`})
4. DC SPD (Type 2 Surge): Ucpv ${calculations.recommendedSpdVoltage}V DC, In 20kA / Imax 40kA (3-Pole) - ${calculations.totalSpdsCount} Pcs (${calculations.isPerStringProtection ? `${calculations.totalStrings} Series Strings (1 SPD/String)` : `${calculations.mpptCount} MPPT Channels`})
5. Solar DC Cable: ${cableSizeMm2} mm² PV1-F (${cableLengthM}m run, Voltage drop: ${calculations.voltageDropV.toFixed(2)}V / ${calculations.voltageDropPercent.toFixed(2)}%, ${calculations.totalStrings} Runs)
Generated by Solar Tech Engineering Suite`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    if (onShowToast) {
      onShowToast({
        text: lang === 'my' ? 'တွက်ချက်မှု အချက်အလက်များအား Copy ကူးပြီးပါပြီ!' : 'Calculation summary copied to clipboard!',
        type: 'success'
      });
    }
    setTimeout(() => setCopied(false), 2500);
  };

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const innerCardBg = isDark ? 'bg-slate-950/60 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900';
  const inputBg = isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500';
  const subBoxBg = isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200';
  const btnSubtle = isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-700';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const colAmber = isDark ? 'text-amber-400' : 'text-amber-700';
  const colBlue = isDark ? 'text-blue-400' : 'text-blue-700';
  const colEmerald = isDark ? 'text-emerald-400' : 'text-emerald-700';
  const colPurple = isDark ? 'text-purple-400' : 'text-purple-700';
  const colTeal = isDark ? 'text-teal-400' : 'text-teal-700';
  const colCyan = isDark ? 'text-cyan-400' : 'text-cyan-700';

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header Card */}
      <div className={`p-5 sm:p-6 rounded-3xl border ${cardBg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                {lang === 'my' 
                  ? 'Solar DC Breaker & အကာအကွယ် စနစ် တွက်ချက်စက်' 
                  : lang === 'zh'
                  ? '光伏直流断路器与保护计算器 (Fuse, MCB, Isolator, SPD)'
                  : 'Solar DC Breaker & Protection Calculator'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                IEC & NEC 690
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'my'
                ? 'Solar Panel Isc, Series နှင့် Parallel အရ DC Fuse, DC MCB, DC Isolator နှင့် DC SPD အတိအကျ တွက်ချက်ခြင်း'
                : 'Automated sizing for DC Fuse, DC MCB, DC Isolator Switch & DC SPD based on Array Isc, Series & Parallel strings'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            type="button"
            onClick={handleCopySummary}
            className={`px-3 py-2 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'} text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
            <span>{copied ? (lang === 'my' ? 'Copy ပြီးပါပြီ' : 'Copied!') : (lang === 'my' ? 'အချက်အလက် ကူးယူမည်' : 'Copy Summary')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Print Calculation Sheet / Download PDF"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'my' ? 'Print / PDF ထုတ်မည်' : 'Print / PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid: Inputs (Left) and Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==================================================================== */}
        {/* LEFT COLUMN (5 Cols): PANEL SELECTION, SERIES & PARALLEL TOGGLES     */}
        {/* ==================================================================== */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. SOLAR PANEL SPECIFICATION CARD */}
          <div className={`p-5 rounded-3xl border ${cardBg} space-y-4`}>
            <div className="flex items-center justify-between pb-2 border-b border-current/10">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-sm">
                  {lang === 'my' ? '၁။ ဆိုလာပြား Specifications ရွေးချယ်ပါ' : '1. Solar Panel Specifications'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualPanelMode(!isManualPanelMode)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  isManualPanelMode 
                    ? 'bg-amber-500 text-slate-950 border-amber-400' 
                    : 'text-slate-400 hover:text-white border-slate-700'
                }`}
              >
                {isManualPanelMode ? (lang === 'my' ? 'Manual Edit ဖွင့်ထား' : 'Manual Mode') : (lang === 'my' ? 'စိတ်ကြိုက်ပြင်မည်' : 'Edit Specs')}
              </button>
            </div>

            {/* Preset Selector Dropdown */}
            {!isManualPanelMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'my' ? 'ဆိုလာပြား Model ရွေးချယ်ရန်:' : 'Select Solar Panel Preset:'}
                </label>
                <div className="relative">
                  <select
                    value={selectedPanelId}
                    onChange={(e) => setSelectedPanelId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border ${inputBg} text-xs font-semibold appearance-none cursor-pointer pr-8`}
                  >
                    {allPanels.map((p, idx) => (
                      <option key={`dc_panel_opt_${p.id}_${idx}`} value={p.id}>
                        {p.brand} {p.model} — {p.watt}W (Isc: {p.isc}A, Voc: {p.voc}V)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 pointer-events-none text-slate-400" />
                </div>
              </div>
            )}

            {/* Panel Parameters Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-2xl border ${innerCardBg}`}>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Short Circuit Current (Isc)</span>
                {isManualPanelMode ? (
                  <input
                    type="number"
                    step="0.05"
                    value={manualPanel.isc}
                    onChange={(e) => setManualPanel({ ...manualPanel, isc: parseFloat(e.target.value) || 10 })}
                    className={`w-full mt-1 p-1 rounded-lg border ${inputBg} font-mono font-bold ${colAmber}`}
                  />
                ) : (
                  <span className={`text-sm font-black font-mono ${colAmber}`}>{activePanel.isc.toFixed(2)} A</span>
                )}
              </div>

              <div className={`p-2.5 rounded-2xl border ${innerCardBg}`}>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Max Power Current (Imp)</span>
                {isManualPanelMode ? (
                  <input
                    type="number"
                    step="0.05"
                    value={manualPanel.imp}
                    onChange={(e) => setManualPanel({ ...manualPanel, imp: parseFloat(e.target.value) || 9 })}
                    className={`w-full mt-1 p-1 rounded-lg border ${inputBg} font-mono font-bold ${colBlue}`}
                  />
                ) : (
                  <span className={`text-sm font-black font-mono ${colBlue}`}>{activePanel.imp.toFixed(2)} A</span>
                )}
              </div>

              <div className={`p-2.5 rounded-2xl border ${innerCardBg}`}>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Open Circuit Voltage (Voc)</span>
                {isManualPanelMode ? (
                  <input
                    type="number"
                    step="0.1"
                    value={manualPanel.voc}
                    onChange={(e) => setManualPanel({ ...manualPanel, voc: parseFloat(e.target.value) || 40 })}
                    className={`w-full mt-1 p-1 rounded-lg border ${inputBg} font-mono font-bold ${colEmerald}`}
                  />
                ) : (
                  <span className={`text-sm font-black font-mono ${colEmerald}`}>{activePanel.voc.toFixed(1)} V</span>
                )}
              </div>

              <div className={`p-2.5 rounded-2xl border ${innerCardBg}`}>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-semibold">Max Power Voltage (Vmp)</span>
                {isManualPanelMode ? (
                  <input
                    type="number"
                    step="0.1"
                    value={manualPanel.vmp}
                    onChange={(e) => setManualPanel({ ...manualPanel, vmp: parseFloat(e.target.value) || 35 })}
                    className={`w-full mt-1 p-1 rounded-lg border ${inputBg} font-mono font-bold ${colTeal}`}
                  />
                ) : (
                  <span className={`text-sm font-black font-mono ${colTeal}`}>{activePanel.vmp.toFixed(1)} V</span>
                )}
              </div>
            </div>

            {/* Cold Temperature Setting (Affects Voc Max) */}
            <div className="pt-2 border-t border-current/10">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                  <span>{lang === 'my' ? 'ဆောင်းရာသီ အနိမ့်ဆုံး အပူချိန် (Tmin):' : 'Lowest Ambient Temp:'}</span>
                </span>
                <span className={`font-mono font-bold ${colCyan}`}>{minAmbientTempC} °C</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={minAmbientTempC}
                onChange={(e) => setMinAmbientTempC(parseInt(e.target.value) || 15)}
                className="w-full accent-cyan-400 cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                <span>0°C (တောင်ပေါ်ဒေသ)</span>
                <span>15°C (ပျမ်းမျှ)</span>
                <span>30°C</span>
              </div>
            </div>
          </div>

          {/* 2. SERIES & PARALLEL CONFIGURATION (Interactive Toggles) */}
          <div className={`p-5 rounded-3xl border ${cardBg} space-y-4`}>
            <div className="flex items-center justify-between pb-2 border-b border-current/10">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm">
                  {lang === 'my' ? '၂။ Series နှင့် Parallel ချိတ်ဆက်မှု' : '2. Series & Parallel Configuration'}
                </h3>
              </div>
            </div>

            {/* Panels In Series (Ns) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${textSecondary}`}>
                  {lang === 'my' ? 'စတြင်း ၁ ခုတွင် ဆက်ထားသော ဆိုလာပြား (Series):' : 'Panels in Series per String (Ns):'}
                </span>
                <span className={`font-mono font-black ${colEmerald} text-sm`}>
                  {panelsInSeries} ချပ် (Modules)
                </span>
              </div>

              {/* Quick Stepper */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPanelsInSeries(Math.max(1, panelsInSeries - 1))}
                  className={`w-9 h-9 rounded-xl ${btnSubtle} font-black text-sm flex items-center justify-center cursor-pointer border active:scale-95`}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={panelsInSeries}
                  onChange={(e) => setPanelsInSeries(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`flex-1 p-2 rounded-xl text-center font-mono font-bold text-sm border ${inputBg}`}
                />
                <button
                  type="button"
                  onClick={() => setPanelsInSeries(panelsInSeries + 1)}
                  className={`w-9 h-9 rounded-xl ${btnSubtle} font-black text-sm flex items-center justify-center cursor-pointer border active:scale-95`}
                >
                  +
                </button>
              </div>

              {/* Quick Preset Buttons for Series */}
              <div className="flex flex-wrap gap-1 pt-1">
                {[8, 10, 12, 14, 16, 18, 20, 22].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPanelsInSeries(n)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      panelsInSeries === n
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : isDark
                        ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {n}S
                  </button>
                ))}
              </div>
            </div>

            {/* System Architecture & String Configuration (Multi-MPPT vs Direct Parallel) */}
            <div className="space-y-3 pt-3 border-t border-current/10">
              
              {/* Architecture Selector Tabs */}
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${textSecondary}`}>
                  {lang === 'my' ? 'ဆိုလာချိတ်ဆက်မှု စနစ် (Architecture):' : 'System Wiring Architecture:'}
                </span>
                <span className={`font-mono font-bold ${colAmber} text-[11px]`}>
                  {wiringMode === 'mppt' 
                    ? `${mpptCount} MPPT × ${stringsPerMppt} Str = ${calculations.totalStrings} Strings (Series ${calculations.totalStrings} စုံ)` 
                    : `${parallelStrings} Strings`}
                </span>
              </div>

              <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl ${isDark ? 'bg-slate-950/70 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setWiringMode('mppt')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    wiringMode === 'mppt'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'Multi-MPPT Inverter စနစ်' : 'Multi-MPPT Inverter'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWiringMode('combiner')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    wiringMode === 'combiner'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'Combiner Box စနစ်' : 'Combiner Box'}</span>
                </button>
              </div>

              {/* Protection Architecture Scope Selector */}
              <div className={`p-3 rounded-2xl ${subBoxBg} space-y-2`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${colEmerald} flex items-center gap-1.5`}>
                    <Shield className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'အကာအကွယ်ပစ္စည်း တပ်ဆင်မှု (Protection Scope):' : 'Protection Device Architecture:'}</span>
                  </span>
                  <span className={`font-mono text-[10px] ${textMuted}`}>
                    {protectionScope === 'per_string' 
                      ? (lang === 'my' ? '၁ စုံစီ သီးခြား' : '1 Set per String') 
                      : (lang === 'my' ? 'MPPT ၁ ခုစီ စုပေါင်း' : 'Grouped per MPPT')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setProtectionScope('per_string')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                      protectionScope === 'per_string'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md ring-2 ring-emerald-400/50'
                        : isDark
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                    }`}
                  >
                    <span>{lang === 'my' ? '🛡️ စတြင်း ၁ စုံစီ သီးခြား' : '🛡️ Dedicated Per-String'}</span>
                    <span className="text-[9px] font-normal opacity-90 mt-0.5">
                      {lang === 'my' ? `${calculations.totalStrings} Strings = Breaker ${calculations.totalStrings} လုံး` : `${calculations.totalStrings} Strings = ${calculations.totalStrings} Breakers`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProtectionScope('per_mppt')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                      protectionScope === 'per_mppt'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md ring-2 ring-emerald-400/50'
                        : isDark
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                    }`}
                  >
                    <span>{lang === 'my' ? '⚡ MPPT ၁ ခုစီ စုပေါင်း' : '⚡ Grouped per MPPT'}</span>
                    <span className="text-[9px] font-normal opacity-90 mt-0.5">
                      {lang === 'my' ? `${calculations.mpptCount} MPPT = Breaker ${calculations.mpptCount} လုံး` : `${calculations.mpptCount} MPPTs = ${calculations.mpptCount} Breakers`}
                    </span>
                  </button>
                </div>
              </div>

              {wiringMode === 'mppt' ? (
                <div className={`space-y-3 p-3.5 rounded-2xl ${subBoxBg}`}>
                  {/* 1. MPPT Trackers Count */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${textMuted} font-semibold`}>
                        {lang === 'my' ? '1. Inverter MPPT Trackers အရေအတွက်:' : '1. Inverter MPPT Count:'}
                      </span>
                      <span className={`font-mono font-black ${colAmber}`}>
                        {mpptCount} MPPT{mpptCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 6].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMpptCount(n)}
                          className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                            mpptCount === n
                              ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                              : isDark
                              ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                          }`}
                        >
                          {n} MPPT
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Strings per MPPT Tracker */}
                  <div className="space-y-1.5 pt-2 border-t border-current/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${textMuted} font-semibold`}>
                        {lang === 'my' ? '2. MPPT တစ်ခုစီရှိ စတြင်း (Strings / MPPT):' : '2. Strings per MPPT Tracker:'}
                      </span>
                      <span className={`font-mono font-black ${colBlue}`}>
                        {stringsPerMppt} String{stringsPerMppt > 1 ? 's' : ''} / MPPT (စုစုပေါင်း {calculations.totalStrings} Strings)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        {
                          val: 1,
                          label: '1 String',
                          subEn: '1 String / MPPT',
                          subMy: 'စတြင်း ၁ စုံစီ',
                          badge: `${mpptCount * 1} Strings Total`
                        },
                        {
                          val: 2,
                          label: '2 Strings',
                          subEn: '2 Strings / MPPT',
                          subMy: 'စတြင်း ၂ စုံစီ',
                          badge: `${mpptCount * 2} Strings Total`
                        },
                        {
                          val: 3,
                          label: '3 Strings',
                          subEn: '3 Strings / MPPT',
                          subMy: 'စတြင်း ၃ စုံစီ',
                          badge: `${mpptCount * 3} Strings Total`
                        },
                        {
                          val: 4,
                          label: '4 Strings',
                          subEn: '4 Strings / MPPT',
                          subMy: 'စတြင်း ၄ စုံစီ',
                          badge: `${mpptCount * 4} Strings Total`
                        }
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setStringsPerMppt(item.val)}
                          className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                            stringsPerMppt === item.val
                              ? 'bg-blue-600 text-white font-black shadow-md ring-2 ring-blue-400/50'
                              : isDark
                              ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                          }`}
                        >
                          <span className="text-xs">{item.label}</span>
                          <span className="text-[9px] font-normal opacity-80 leading-tight mt-0.5">
                            {lang === 'my' ? item.subMy : item.subEn}
                          </span>
                          <span className={`text-[8px] font-mono mt-1 px-1.5 py-0.5 rounded ${isDark ? 'bg-black/40 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
                            {item.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Quick Popular Inverter Configuration Presets */}
                  <div className="pt-2 border-t border-current/10">
                    <span className={`text-[11px] ${textMuted} block mb-1.5`}>
                      {lang === 'my' ? '⚡ လူသုံးအများဆုံး စနစ်ပုံစံများ (Quick Presets):' : '⚡ Popular Inverter Configurations:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { m: 1, s: 1, label: '1 MPPT × 1 (1 String)' },
                        { m: 2, s: 1, label: '2 MPPT × 1 (2 Strings သီးခြား)' },
                        { m: 1, s: 2, label: '1 MPPT × 2 (2 Strings စုံစီ)' },
                        { m: 3, s: 1, label: '3 MPPT × 1 (3 Strings သီးခြား)' },
                        { m: 2, s: 2, label: '🔥 2 MPPT × 2 = 4 Strings (Series ၄ စုံ)', hot: true },
                        { m: 4, s: 1, label: '4 MPPT × 1 = 4 Strings' },
                        { m: 3, s: 2, label: '3 MPPT × 2 = 6 Strings' },
                        { m: 4, s: 2, label: '⚡ 4 MPPT × 2 = 8 Strings (Series ၈ စုံ)', hot: true },
                        { m: 6, s: 2, label: '6 MPPT × 2 = 12 Strings' }
                      ].map(preset => {
                        const isMatch = mpptCount === preset.m && stringsPerMppt === preset.s;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setMpptCount(preset.m);
                              setStringsPerMppt(preset.s);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              isMatch
                                ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-300'
                                : preset.hot
                                ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : isDark
                                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Engineering Explanation Callout */}
                  <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                    protectionScope === 'per_string'
                      ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}>
                    {protectionScope === 'per_string' ? (
                      <p>
                        {lang === 'my'
                          ? `✅ အတည်ပြုချက်- စုစုပေါင်း Series String ${calculations.totalStrings} စုံ (Strings) ရှိပါသဖြင့် String ၁ စုံစီအတွက် သီးခြားစီ- Breaker ${calculations.totalBreakersCount} လုံး (${calculations.recommendedBreakerA}A)၊ Isolator ${calculations.totalIsolatorsCount} လုံး (${calculations.recommendedIsolatorA}A)၊ SPD ${calculations.totalSpdsCount} လုံး (${calculations.recommendedSpdVoltage}V) နှင့် DC Fuses ${calculations.totalFusesCount} ချောင်း (+ နှင့် - ဝင်ရိုးနှစ်ဖက်စီ) တိကျစွာ တွက်ချက်ထားပါသည်။`
                          : `✅ Verified: System has ${calculations.totalStrings} series strings. Under Dedicated Per-String Protection: ${calculations.totalBreakersCount} Breakers (${calculations.recommendedBreakerA}A), ${calculations.totalIsolatorsCount} Isolators (${calculations.recommendedIsolatorA}A), ${calculations.totalSpdsCount} SPDs (${calculations.recommendedSpdVoltage}V), and ${calculations.totalFusesCount} Fuses (+ & - legs) are specified (1 Breaker, 1 Isolator, 1 SPD & 2 Fuses per series string).`}
                      </p>
                    ) : (
                      <p>
                        {lang === 'my'
                          ? `⚡ မှတ်ချက်- MPPT တစ်ခုချင်းစီအလိုက် Grouped Protection ပြုလုပ်ထားပါသည်။ MPPT ${calculations.mpptCount} ခုအတွက် Breaker ${calculations.totalBreakersCount} လုံး (${calculations.recommendedBreakerA}A)၊ Isolator ${calculations.totalIsolatorsCount} လုံး (${calculations.recommendedIsolatorA}A)၊ SPD ${calculations.totalSpdsCount} လုံး နှင့် String Fuses ${calculations.totalFusesCount} ချောင်း တွက်ချက်ထားပါသည်။`
                          : `⚡ Note: Grouped protection per MPPT channel. ${calculations.mpptCount} MPPT channels use ${calculations.totalBreakersCount} Breakers (${calculations.recommendedBreakerA}A), ${calculations.totalIsolatorsCount} Isolators, ${calculations.totalSpdsCount} SPDs, and ${calculations.totalFusesCount} fuses.`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Central Combiner Box Mode */
                <div className={`space-y-2 p-3.5 rounded-2xl ${subBoxBg}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${textMuted} font-semibold`}>
                      {lang === 'my' ? 'ပြိုင်ဆက်ထားသော စတြင်းအရေအတွက် (Parallel Strings Np):' : 'Parallel Strings into Single Combiner:'}
                    </span>
                    <span className={`font-mono font-black ${colAmber}`}>
                      {parallelStrings} Strings Parallel
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setParallelStrings(num)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                          parallelStrings === num
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-400/50'
                            : isDark
                            ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                        }`}
                      >
                        <span>{num} String{num > 1 ? 's' : ''}</span>
                        <span className="text-[9px] opacity-75 font-mono">{num === 1 ? 'Series Only' : 'Parallel'}</span>
                      </button>
                    ))}
                  </div>

                  <div className={`flex items-center justify-between text-xs ${textMuted} pt-1`}>
                    <span>{lang === 'my' ? 'အကြီးစား Combiner (Custom):' : 'Custom strings:'}</span>
                    <div className="flex items-center gap-1.5">
                      {[5, 6, 8, 10, 12].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setParallelStrings(s)}
                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] cursor-pointer ${
                            parallelStrings === s 
                              ? 'bg-amber-400 text-slate-950 font-bold' 
                              : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {s}P
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LIVE ARRAY OUTPUT STATS SUMMARY */}
            <div className={`p-3.5 rounded-2xl border ${innerCardBg} space-y-2 mt-2`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-current/10 text-xs">
                <span className={`font-extrabold ${colAmber}`}>
                  {lang === 'my' ? 'ဆိုလာပြား စုစုပေါင်း အရေအတွက်:' : 'Total Panels & Power:'}
                </span>
                <span className={`font-mono font-black text-sm ${textTitle}`}>
                  {calculations.totalPanels} ချပ် ({calculations.totalPowerKw.toFixed(2)} kWp)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className={`text-[10px] ${textMuted} block`}>
                    {calculations.isMpptMode ? 'Per MPPT Input Isc:' : 'Total Array Isc:'}
                  </span>
                  <span className={`font-bold ${colAmber}`}>
                    {calculations.isMpptMode ? calculations.mpptIsc.toFixed(2) : calculations.arrayTotalIsc.toFixed(2)} A
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] ${textMuted} block`}>
                    {calculations.isMpptMode ? 'Total System Isc:' : 'Total Array Imp:'}
                  </span>
                  <span className={`font-bold ${colBlue}`}>
                    {calculations.isMpptMode ? `${calculations.arrayTotalIsc.toFixed(2)} A` : `${calculations.arrayTotalImp.toFixed(2)} A`}
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] ${textMuted} block`}>Max Cold Voc ({minAmbientTempC}°C):</span>
                  <span className={`font-bold ${colEmerald}`}>{calculations.stringVocColdMax.toFixed(1)} V</span>
                </div>
                <div>
                  <span className={`text-[10px] ${textMuted} block`}>Operating Vmp:</span>
                  <span className={`font-bold ${colTeal}`}>{calculations.stringVmp.toFixed(1)} V</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SAFETY FACTOR CALCULATION EXPLAINER CARD */}
          <div className={`p-4 rounded-3xl border ${cardBg} space-y-2 text-xs`}>
            <div className={`flex items-center gap-2 ${colAmber} font-bold`}>
              <Info className="w-4 h-4 shrink-0" />
              <span>{lang === 'my' ? 'Safety Factor သတ်မှတ်ချက် (1.25x Multiplier)' : 'Safety Factor Rules (1.25x Multiplier)'}</span>
            </div>
            <p className={`${textMuted} leading-relaxed text-[11px]`}>
              {lang === 'my'
                ? 'Isc (လျှပ်စီးကြောင်း) နှင့် Voc (ဗို့အား) နှစ်မျိုးစလုံးအတွက် စံသတ်မှတ်ချက် Safety Factor 1.25x ဖြင့် အကာအကွယ်ပစ္စည်းများကို တွက်ချက်ထားပါသည် (Isc × 1.25, Voc × 1.25)'
                : 'Safety factor of 1.25x is applied to both short circuit current (Isc × 1.25) and open circuit voltage (Voc × 1.25) across all protection devices.'}
            </p>
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'} border font-mono text-[11px] space-y-1`}>
              <div>Design Current = Isc × 1.25 = {(calculations.isPerStringProtection ? calculations.stringIsc * 1.25 : calculations.arrayContinuousIsc).toFixed(2)} A</div>
              <div>SPD Design Voltage = Voc × 1.25 = {calculations.spdMinContinuousVoltage.toFixed(1)} V</div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN (7 Cols): THE 4 PROTECTION DEVICES RESULTS & SCHEMATIC */}
        {/* ==================================================================== */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* THE 4 KEY PROTECTION DEVICES CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. DC FUSE (gPV Fuse) */}
            <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
              calculations.isFuseRequired
                ? isDark
                  ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 shadow-md'
                  : 'bg-amber-50/90 border-amber-300 text-slate-900 shadow-sm'
                : isDark
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
            } space-y-3 relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 ${colAmber} border border-amber-500/30`}>
                  gPV 10×38mm
                </span>
                <span className={`text-xs font-bold ${colAmber}`}>
                  {calculations.isFuseRequired ? 'MANDATORY (လိုအပ်)' : 'OPTIONAL (1 String)'}
                </span>
              </div>

              <div>
                <h4 className={`font-black text-base ${textTitle} flex items-center gap-1.5`}>
                  <span>⚡ DC Fuse (ဆိုလာဖျူ့စ်)</span>
                </h4>
                <p className={`text-[11px] ${textMuted} mt-0.5`}>
                  {lang === 'my' 
                    ? 'ပြိုင်ဆက်စတြင်းများမှ Reverse Current အန္တရာယ် ကာကွယ်ရန်'
                    : 'Protects each string against reverse fault currents'}
                </p>
              </div>

              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-amber-200 shadow-xs'} border space-y-1.5`}>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className={textMuted}>Calculated (Isc × 1.25):</span>
                  <span className={`font-bold ${colAmber}`}>{calculations.stringDesignFuseCurrent.toFixed(2)} A</span>
                </div>
                <div className={`flex justify-between items-center text-sm font-mono pt-1 border-t ${isDark ? 'border-slate-800' : 'border-amber-100'}`}>
                  <span className={`font-bold ${textSecondary}`}>Recommended Rating:</span>
                  <span className={`font-black ${colAmber} text-base`}>{calculations.recommendedStringFuseA} A</span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${textMuted}`}>
                  <span>Voltage Rating:</span>
                  <span className={`${textTitle} font-bold`}>1000V DC (gPV)</span>
                </div>
                {calculations.isFuseRequired && (
                  <div className={`flex justify-between items-center text-xs font-mono ${textMuted}`}>
                    <span>Required Quantity:</span>
                    <span className={`${colAmber} font-bold`}>{calculations.totalFusesCount} Pcs (+ and - legs)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. DC BREAKER (DC MCB / MCCB) */}
            <div className={`p-4 sm:p-5 rounded-3xl border ${
              isDark
                ? 'bg-blue-500/10 border-blue-500/40 text-slate-100 shadow-md'
                : 'bg-blue-50/90 border-blue-300 text-slate-900 shadow-sm'
            } space-y-3 relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 ${colBlue} border border-blue-500/30`}>
                  DC MCB / MCCB
                </span>
                <span className={`text-xs font-bold ${colBlue}`}>
                  OVERCURRENT & TRIP
                </span>
              </div>

              <div>
                <h4 className={`font-black text-base ${textTitle} flex items-center gap-1.5`}>
                  <span>🛡️ DC Breaker (ဘရိတ်ကာ)</span>
                </h4>
                <p className={`text-[11px] ${textMuted} mt-0.5`}>
                  {lang === 'my' 
                    ? 'Short-circuit နှင့် ဝန်ပိုအားပြတ်တောက် အကာအကွယ်'
                    : 'Overcurrent & short-circuit trip protection'}
                </p>
              </div>

              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-blue-200 shadow-xs'} border space-y-1.5`}>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className={textMuted}>
                    {calculations.isPerStringProtection 
                      ? 'Calculated (String Isc × 1.25):' 
                      : (calculations.isMpptMode ? 'Calculated (MPPT Isc × 1.25):' : 'Calculated (Total Isc × 1.25):')}
                  </span>
                  <span className={`font-bold ${colBlue}`}>
                    {calculations.breakerDesignCurrent.toFixed(2)} A
                  </span>
                </div>
                <div className={`flex justify-between items-center text-sm font-mono pt-1 border-t ${isDark ? 'border-slate-800' : 'border-blue-100'}`}>
                  <span className={`font-bold ${textSecondary}`}>
                    Recommended Rating {calculations.isPerStringProtection ? '(Per Series String):' : (calculations.isMpptMode ? '(Per MPPT):' : ':')}
                  </span>
                  <span className={`font-black ${colBlue} text-base`}>{calculations.recommendedBreakerA} A</span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${textMuted}`}>
                  <span>Poles & Voltage:</span>
                  <span className={`${textTitle} font-bold`}>{calculations.breakerPoles}</span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${textMuted}`}>
                  <span>Required Quantity:</span>
                  <span className={`${colBlue} font-bold`}>
                    {calculations.totalBreakersCount} Pcs {calculations.isPerStringProtection 
                      ? `(${calculations.totalStrings} Series Strings - 1 Breaker / String)` 
                      : (calculations.isMpptMode ? `(${calculations.mpptCount} MPPT Inputs)` : '(Main DC)')}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. DC ISOLATOR SWITCH (Rotary Disconnector) */}
            <div className={`p-4 sm:p-5 rounded-3xl border ${
              isDark
                ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100 shadow-md'
                : 'bg-emerald-50/90 border-emerald-300 text-slate-900 shadow-sm'
            } space-y-3 relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 ${colEmerald} border border-emerald-500/30`}>
                  IEC 60947-3
                </span>
                <span className={`text-xs font-bold ${colEmerald}`}>
                  LOAD-BREAK DISCONNECT
                </span>
              </div>

              <div>
                <h4 className={`font-black text-base ${textTitle} flex items-center gap-1.5`}>
                  <span>🔌 DC Isolator (ခလုတ်ဖြတ်စက်)</span>
                </h4>
                <p className={`text-[11px] ${textMuted} mt-0.5`}>
                  {lang === 'my' 
                    ? 'ဝန်ရှိနေစဉ် အန္တရာယ်ကင်းစွာ ဓာတ်အားဖြတ်တောက်ရန်'
                    : 'Safe load-break disconnection for maintenance'}
                </p>
              </div>

              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-emerald-200 shadow-xs'} border space-y-1.5`}>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className={textMuted}>
                    Minimum Rating {calculations.isPerStringProtection ? '(String Isc × 1.25):' : (calculations.isMpptMode ? '(MPPT Isc × 1.25):' : '(Total Isc × 1.25):')}
                  </span>
                  <span className={`font-bold ${colEmerald}`}>{calculations.isolatorDesignCurrent.toFixed(2)} A</span>
                </div>
                <div className={`flex justify-between items-center text-sm font-mono pt-1 border-t ${isDark ? 'border-slate-800' : 'border-emerald-100'}`}>
                  <span className={`font-bold ${textSecondary}`}>
                    Recommended Rating {calculations.isPerStringProtection ? '(Per Series String):' : (calculations.isMpptMode ? '(Per MPPT):' : ':')}
                  </span>
                  <span className={`font-black ${colEmerald} text-base`}>{calculations.recommendedIsolatorA} A</span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${textMuted}`}>
                  <span>Voltage & Standard:</span>
                  <span className={`${textTitle} font-bold`}>{calculations.isolatorVoltage}V DC (DC-PV2)</span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${textMuted}`}>
                  <span>Required Quantity:</span>
                  <span className={`${colEmerald} font-bold`}>
                    {calculations.totalIsolatorsCount} Pcs {calculations.isPerStringProtection 
                      ? `(${calculations.totalStrings} Series Strings - 1 Isolator / String)` 
                      : (calculations.isMpptMode ? `(${calculations.mpptCount} MPPT Inputs)` : '(Main DC)')}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. DC SPD (Surge Protective Device) */}
            <div className={`p-4 sm:p-5 rounded-3xl border ${
              isDark
                ? 'bg-purple-500/10 border-purple-500/40 text-slate-100 shadow-md'
                : 'bg-purple-50/90 border-purple-300 text-slate-900 shadow-sm'
            } space-y-3 relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 ${colPurple} border border-purple-500/30`}>
                  Type 2 / Class II
                </span>
                <span className={`text-xs font-bold ${colPurple}`}>
                  LIGHTNING SURGE
                </span>
              </div>

              <div>
                <h4 className={`font-black text-base ${textTitle} flex items-center gap-1.5`}>
                  <span>⚡ DC SPD (မိုးကြိုးဗို့အားထိန်း)</span>
                </h4>
                <p className={`text-[11px] ${textMuted} mt-0.5`}>
                  {lang === 'my' 
                    ? 'မိုးကြိုးနှင့် Overvoltage ရုတ်တရက်တက်ခြင်း ကာကွယ်ရန်'
                    : 'Protects inverter & strings from lightning surges'}
                </p>
              </div>

              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-purple-200 shadow-xs'} border space-y-1.5`}>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className={textMuted}>Continuous Max (Voc × 1.25):</span>
                  <span className={`font-bold ${colPurple}`}>≥ {calculations.spdMinContinuousVoltage.toFixed(0)} V</span>
                </div>
                <div className={`flex justify-between items-center text-sm font-mono pt-1 border-t ${isDark ? 'border-slate-800' : 'border-purple-100'}`}>
                  <span className={`font-bold ${textSecondary}`}>SPD Rating (Ucpv):</span>
                  <span className={`font-black ${colPurple} text-base`}>{calculations.recommendedSpdVoltage}V DC</span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${textMuted}`}>
                  <span>Required Quantity:</span>
                  <span className={`${colPurple} font-bold`}>
                    {calculations.totalSpdsCount} Pcs {calculations.isPerStringProtection 
                      ? `(${calculations.totalStrings} Series Strings - 1 SPD / String)` 
                      : (calculations.isMpptMode ? `(${calculations.mpptCount} MPPT Channels)` : '(Main SPD)')}
                  </span>
                </div>
                <div className={`flex justify-between items-center text-xs font-mono ${textMuted}`}>
                  <span>Poles & Config:</span>
                  <span className={`${textTitle} font-bold`}>3P (Y-Type with Ground)</span>
                </div>
              </div>
            </div>
          </div>

          {/* VISUAL SINGLE LINE DIAGRAM (SLD SCHEMATIC) */}
          <div className={`p-5 rounded-3xl border ${cardBg} space-y-3`}>
            <div className="flex items-center justify-between pb-2 border-b border-current/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="font-extrabold text-sm">
                  {lang === 'my' ? 'Single Line Circuit Diagram (ပတ်လမ်းပုံကြမ်း)' : 'Single Line Circuit Diagram (SLD)'}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                PV Strings ➔ Fuse ➔ SPD ➔ Isolator ➔ Breaker ➔ Inverter
              </span>
            </div>

            {/* Interactive Flow Diagram */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 overflow-x-auto">
              <div className="min-w-[620px] flex items-center justify-between gap-2 py-2">
                
                {/* 1. PV Array Block */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-center w-36 shrink-0">
                  <Sun className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                  <span className="text-xs font-black text-white block">
                    {calculations.isMpptMode ? `${calculations.mpptCount} MPPT Trackers` : 'PV Array'}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold block">
                    {calculations.isMpptMode 
                      ? `${calculations.totalStrings} Strings (${calculations.stringsPerMppt} Str/MPPT)` 
                      : `${calculations.Ns}S × ${calculations.Np}P`}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    {calculations.isMpptMode 
                      ? `MPPT Isc: ${calculations.mpptIsc.toFixed(1)}A | ${calculations.stringVocColdMax.toFixed(0)}V` 
                      : `${calculations.stringVocColdMax.toFixed(0)}V / ${calculations.arrayTotalIsc.toFixed(1)}A`}
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                {/* 2. DC Fuse Block */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/30 text-center w-28 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 mx-auto mb-1 flex items-center justify-center font-bold text-xs">
                    F
                  </div>
                  <span className="text-xs font-bold text-white block">DC Fuse</span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold block">
                    {calculations.isFuseRequired ? `${calculations.recommendedStringFuseA}A` : 'Optional'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    {calculations.isFuseRequired ? `${calculations.totalFusesCount} Pcs (+ & -)` : '1 Str/MPPT'}
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                {/* 3. DC SPD Block */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-purple-500/30 text-center w-28 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 mx-auto mb-1 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <span className="text-xs font-bold text-white block">DC SPD</span>
                  <span className="text-[10px] font-mono text-purple-400 font-bold block">
                    {calculations.recommendedSpdVoltage}V DC
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    {calculations.totalSpdsCount}× Type 2
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                {/* 4. DC Isolator Block */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/30 text-center w-30 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 mx-auto mb-1 flex items-center justify-center font-bold text-xs">
                    ⏻
                  </div>
                  <span className="text-xs font-bold text-white block">DC Isolator</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                    {calculations.recommendedIsolatorA}A {calculations.isPerStringProtection ? '/Str' : (calculations.isMpptMode ? '/MPPT' : '')}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    {calculations.totalIsolatorsCount}× {calculations.isolatorVoltage}V DC
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                {/* 5. DC Breaker Block */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-blue-500/30 text-center w-30 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 mx-auto mb-1 flex items-center justify-center font-bold text-xs">
                    MCB
                  </div>
                  <span className="text-xs font-bold text-white block">DC Breaker</span>
                  <span className="text-[10px] font-mono text-blue-400 font-bold block">
                    {calculations.recommendedBreakerA}A {calculations.isPerStringProtection ? '/Str' : (calculations.isMpptMode ? '/MPPT' : '')}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    {calculations.totalBreakersCount}× {calculations.breakerVoltageRating}V DC
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                {/* 6. Inverter Input Block */}
                <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-500 text-center w-34 shrink-0">
                  <Zap className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                  <span className="text-xs font-black text-white block">Inverter</span>
                  <span className="text-[10px] font-mono text-blue-300 font-bold block">
                    {calculations.isMpptMode ? `${calculations.mpptCount} MPPT Inputs` : 'Main DC Input'}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 block">
                    {calculations.totalStrings} Strings Protected
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* DC SOLAR CABLE SIZING & VOLTAGE DROP CARD */}
          <div className={`p-5 rounded-3xl border ${cardBg} space-y-3`}>
            <div className="flex items-center justify-between pb-2 border-b border-current/10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <h3 className="font-extrabold text-sm">
                  {lang === 'my' ? 'ဆိုလာကြိုး အရွယ်အစားနှင့် Voltage Drop တွက်ချက်ခြင်း' : 'Solar DC Cable Sizing & Voltage Drop'}
                </h3>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                calculations.voltageDropPercent <= 1.5 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : calculations.voltageDropPercent <= 2.5
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {calculations.voltageDropPercent <= 1.5 ? 'EXCELLENT (<1.5%)' : calculations.voltageDropPercent <= 2.5 ? 'ACCEPTABLE' : 'HIGH DROP (>2.5%)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Cable Length Slider */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className={`${textMuted} font-semibold`}>{lang === 'my' ? 'ကြိုးအလျား (One-way Run):' : 'One-way Cable Length:'}</span>
                  <span className={`font-mono font-bold ${textTitle}`}>{cableLengthM} m ({Math.round(cableLengthM * 3.28)} ft)</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={cableLengthM}
                  onChange={(e) => setCableLengthM(parseInt(e.target.value) || 20)}
                  className="w-full accent-blue-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Cable Size Selector */}
              <div className="space-y-1">
                <span className={`${textMuted} font-semibold block`}>{lang === 'my' ? 'ကြိုးဆိုဒ် (Solar PV Cable Size):' : 'Cable Cross-Section:'}</span>
                <div className="flex gap-1.5">
                  {[4.0, 6.0, 10.0, 16.0].map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setCableSizeMm2(sz)}
                      className={`flex-1 py-1 px-1 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                        cableSizeMm2 === sz 
                          ? 'bg-blue-600 text-white shadow-sm font-black' 
                          : isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {sz} mm²
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Voltage drop outcome */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-current/10 text-xs font-mono">
              <div className={`p-2 rounded-xl ${innerCardBg}`}>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Voltage Drop (V):</span>
                <span className={`font-bold ${colAmber}`}>{calculations.voltageDropV.toFixed(2)} V</span>
              </div>
              <div className={`p-2 rounded-xl ${innerCardBg}`}>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Loss Percentage:</span>
                <span className={`font-black ${
                  calculations.voltageDropPercent <= 1.5 ? colEmerald : calculations.voltageDropPercent <= 2.5 ? colAmber : 'text-rose-500 dark:text-rose-400'
                }`}>
                  {calculations.voltageDropPercent.toFixed(2)} %
                </span>
              </div>
              <div className={`p-2 rounded-xl ${innerCardBg}`}>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Recommended Min:</span>
                <span className={`font-bold ${colCyan}`}>≥ {calculations.recommendedCableMm2} mm²</span>
              </div>
            </div>
          </div>

          {/* COMPLETE BILL OF MATERIALS (BOM) SUMMARY TABLE */}
          <div className={`p-5 rounded-3xl border ${cardBg} space-y-3`}>
            <div className="flex items-center justify-between pb-2 border-b border-current/10">
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${colEmerald}`} />
                <h3 className="font-extrabold text-sm">
                  {lang === 'my' ? 'DC Combiner Box ပစ္စည်းစာရင်း (BOQ Summary)' : 'DC Protection & Combiner Box BOQ'}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {calculations.isMpptMode 
                  ? `${calculations.mpptCount} MPPT Inputs (${calculations.totalStrings} Strings)` 
                  : `${calculations.Np} Parallel Strings`}
              </span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-current/10 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                    <th className="pb-2">ပစ္စည်းအမည် (Component)</th>
                    <th className="pb-2">သတ်မှတ်ချက် (Specification)</th>
                    <th className="pb-2 text-center">အရေအတွက်</th>
                    <th className="pb-2 text-right">အမျိုးအစား</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5 font-medium">
                  <tr>
                    <td className={`py-2 font-bold ${textTitle}`}>DC Solar Fuse</td>
                    <td className={`py-2 font-mono ${colAmber}`}>{calculations.recommendedStringFuseA}A 1000V DC gPV</td>
                    <td className={`py-2 text-center font-mono font-bold ${colAmber}`}>
                      {calculations.isFuseRequired ? `${calculations.totalFusesCount} Pcs (+ & -)` : 'Optional (1 Str/MPPT)'}
                    </td>
                    <td className="py-2 text-right text-slate-500 dark:text-slate-400">10×38mm</td>
                  </tr>
                  <tr>
                    <td className={`py-2 font-bold ${textTitle}`}>DC MCB Breaker</td>
                    <td className={`py-2 font-mono ${colBlue}`}>
                      {calculations.recommendedBreakerA}A {calculations.breakerVoltageRating}V DC ({calculations.breakerPoles})
                    </td>
                    <td className={`py-2 text-center font-mono font-bold ${colBlue}`}>
                      {calculations.totalBreakersCount} Pcs {calculations.isPerStringProtection ? `(${calculations.totalStrings} Strings - 1/Str)` : `(${calculations.mpptCount} MPPT)`}
                    </td>
                    <td className="py-2 text-right text-slate-500 dark:text-slate-400">DIN Rail MCB</td>
                  </tr>
                  <tr>
                    <td className={`py-2 font-bold ${textTitle}`}>DC Rotary Isolator</td>
                    <td className={`py-2 font-mono ${colEmerald}`}>{calculations.recommendedIsolatorA}A {calculations.isolatorVoltage}V DC (DC-PV2)</td>
                    <td className={`py-2 text-center font-mono font-bold ${colEmerald}`}>
                      {calculations.totalIsolatorsCount} Pcs {calculations.isPerStringProtection ? `(${calculations.totalStrings} Strings - 1/Str)` : `(${calculations.mpptCount} MPPT)`}
                    </td>
                    <td className="py-2 text-right text-slate-500 dark:text-slate-400">IP66 Outdoor</td>
                  </tr>
                  <tr>
                    <td className={`py-2 font-bold ${textTitle}`}>DC Surge Arrester (SPD)</td>
                    <td className={`py-2 font-mono ${colPurple}`}>Ucpv {calculations.recommendedSpdVoltage}V DC (In:20kA / Imax:40kA)</td>
                    <td className={`py-2 text-center font-mono font-bold ${colPurple}`}>
                      {calculations.totalSpdsCount} Pcs {calculations.isPerStringProtection ? `(${calculations.totalStrings} Strings - 1/Str)` : `(${calculations.mpptCount} MPPT)`}
                    </td>
                    <td className="py-2 text-right text-slate-500 dark:text-slate-400">Type 2 (3-Pole)</td>
                  </tr>
                  <tr>
                    <td className={`py-2 font-bold ${textTitle}`}>Solar PV Cable (EN50618)</td>
                    <td className={`py-2 font-mono ${colCyan}`}>{cableSizeMm2} mm² Tinned Copper (H1Z2Z2-K)</td>
                    <td className="py-2 text-center font-mono">
                      {cableLengthM * 2 * (calculations.isMpptMode ? calculations.totalStrings : 1)} m ({calculations.totalStrings} Runs)
                    </td>
                    <td className="py-2 text-right text-slate-500 dark:text-slate-400">Red + Black Pairs</td>
                  </tr>
                  <tr>
                    <td className={`py-2 font-bold ${textTitle}`}>DC Combiner / Distribution Box</td>
                    <td className={`py-2 font-mono ${textSecondary}`}>
                      {calculations.isMpptMode 
                        ? `IP65 Enclosure (${calculations.mpptCount * 4}-Way for ${calculations.mpptCount} MPPTs)` 
                        : `IP65 Waterproof Enclosure (${calculations.Np > 2 ? '12-Way' : '8-Way'})`}
                    </td>
                    <td className="py-2 text-center font-mono">1 Box</td>
                    <td className="py-2 text-right text-slate-500 dark:text-slate-400">Surface Mount</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* DC Breaker & Protection Engineering Report Print / PDF Modal */}
      <DCBreakerPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        lang={lang}
        activePanel={activePanel}
        panelsInSeries={panelsInSeries}
        parallelStrings={calculations.isMpptMode ? calculations.stringsPerMppt : parallelStrings}
        cableLengthM={cableLengthM}
        cableSizeMm2={cableSizeMm2}
        minAmbientTempC={minAmbientTempC}
        calculations={calculations}
      />
    </div>
  );
};
