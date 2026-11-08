import * as XLSX from 'xlsx';
import { Inverter, PanelPreset, BatteryPreset } from '../types';

/**
 * Clean and normalize string for fuzzy header matching
 */
function cleanHeader(h: any): string {
  if (h === null || h === undefined) return '';
  return String(h)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Universal Solar Panel Parser
 * Supports XLSX, XLS, and CSV files (with comma, semicolon, tab).
 * Accurately detects Watt, Voc, Vmp, Imp, Isc, Name, Brand/Model.
 */
export async function parseSolarPanelsFile(file: File): Promise<PanelPreset[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Read first worksheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No sheet found in workbook');
  }
  
  const worksheet = workbook.Sheets[firstSheetName];
  // Convert sheet to 2D array
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (!rawRows || rawRows.length < 2) {
    throw new Error('Empty spreadsheet or no data rows found');
  }

  // Find header row (first row with non-empty cells)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    const row = rawRows[r];
    if (row && row.some((cell: any) => typeof cell === 'string' && cell.trim().length > 0)) {
      headerRowIndex = r;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex].map(cleanHeader);
  const dataRows = rawRows.slice(headerRowIndex + 1);

  // Column Index Mapping
  let nameIdx = headerRow.findIndex(h => 
    h === 'name' || h === 'panelname' || h === 'model' || h === 'brand' || h === 'module' || 
    h === 'type' || h === 'paneltemplate' || h === 'description' || h.includes('solarpanel') ||
    h.includes('modelname') || h.includes('brandmodel')
  );

  let wattIdx = headerRow.findIndex(h => 
    h === 'watt' || h === 'watts' || h === 'wattage' || h === 'power' || h === 'pmax' || 
    h === 'wp' || h === 'pmaxw' || h === 'powerw' || h === 'wattw' || h === 'nominalpower' ||
    h === 'ratedpower' || h === 'stcpower' || h === 'maxpower' || h.includes('watt') || h.includes('pmax')
  );

  let vocIdx = headerRow.findIndex(h => 
    h === 'voc' || h === 'vocv' || h === 'opencircuit' || h === 'opencircuitvoltage' || 
    h === 'circuitvoltage' || h.includes('opencircuit') || (h.includes('voc') && !h.includes('vmp'))
  );

  let vmpIdx = headerRow.findIndex(h => 
    h === 'vmp' || h === 'vmpv' || h === 'vmpp' || h === 'maxpowervoltage' || 
    h === 'peakpowervoltage' || h === 'operatingvoltage' || h.includes('maxpowervoltage') || (h.includes('vmp') && !h.includes('voc'))
  );

  let impIdx = headerRow.findIndex(h => 
    h === 'imp' || h === 'impa' || h === 'impp' || h === 'maxpowercurrent' || 
    h === 'peakpowercurrent' || h === 'operatingcurrent' || (h.includes('imp') && !h.includes('vmp') && !h.includes('isc'))
  );

  let iscIdx = headerRow.findIndex(h => 
    h === 'isc' || h === 'isca' || h === 'shortcircuit' || h === 'shortcircuitcurrent' || 
    h.includes('shortcircuit') || (h.includes('isc') && !h.includes('voc'))
  );

  let idIdx = headerRow.findIndex(h => h === 'id' || h === 'code' || h === 'itemid' || h === 'no');

  const parsedPanels: PanelPreset[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0 || row.every((c: any) => c === '' || c === null || c === undefined)) {
      continue;
    }

    // Extract raw values by mapped column indices
    let rawId = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
    let rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
    let rawWatt = wattIdx !== -1 ? parseFloat(String(row[wattIdx]).replace(/[^0-9.]/g, '')) : NaN;
    let rawVoc = vocIdx !== -1 ? parseFloat(String(row[vocIdx]).replace(/[^0-9.]/g, '')) : NaN;
    let rawVmp = vmpIdx !== -1 ? parseFloat(String(row[vmpIdx]).replace(/[^0-9.]/g, '')) : NaN;
    let rawImp = impIdx !== -1 ? parseFloat(String(row[impIdx]).replace(/[^0-9.]/g, '')) : NaN;
    let rawIsc = iscIdx !== -1 ? parseFloat(String(row[iscIdx]).replace(/[^0-9.]/g, '')) : NaN;

    // Fallback: If header mapping didn't find columns, use position-based or heuristic value detection
    if (isNaN(rawWatt) || isNaN(rawVoc) || isNaN(rawVmp)) {
      const numbers: number[] = [];
      const strings: string[] = [];

      row.forEach((cell: any) => {
        if (cell === null || cell === undefined || cell === '') return;
        const s = String(cell).trim();
        const cleanedNum = parseFloat(s.replace(/[^0-9.]/g, ''));
        if (!isNaN(cleanedNum) && s.match(/^[0-9.]+$/)) {
          numbers.push(cleanedNum);
        } else if (s.length > 0) {
          strings.push(s);
        }
      });

      if (!rawName && strings.length > 0) {
        rawName = strings.join(' - ');
      }

      // Identify Watt (typically largest number > 100, e.g. 250 - 750)
      if (isNaN(rawWatt)) {
        const potentialWatt = numbers.find(n => n >= 150 && n <= 1000);
        if (potentialWatt !== undefined) {
          rawWatt = potentialWatt;
        }
      }

      // Identify Voltages (typically 30 - 80V)
      const voltageCandidates = numbers.filter(n => n >= 25 && n <= 100 && n !== rawWatt).sort((a, b) => b - a);
      if (isNaN(rawVoc) && voltageCandidates.length > 0) {
        rawVoc = voltageCandidates[0]; // Higher voltage is Voc
      }
      if (isNaN(rawVmp) && voltageCandidates.length > 1) {
        rawVmp = voltageCandidates[1]; // Lower voltage is Vmp
      } else if (isNaN(rawVmp) && !isNaN(rawVoc)) {
        rawVmp = parseFloat((rawVoc * 0.83).toFixed(2));
      }

      // Identify Currents (typically 5 - 25A)
      const currentCandidates = numbers.filter(n => n >= 3 && n <= 30 && n !== rawWatt && n !== rawVoc && n !== rawVmp).sort((a, b) => b - a);
      if (isNaN(rawIsc) && currentCandidates.length > 0) {
        rawIsc = currentCandidates[0]; // Higher current is Isc
      }
      if (isNaN(rawImp) && currentCandidates.length > 1) {
        rawImp = currentCandidates[1]; // Lower current is Imp
      } else if (isNaN(rawImp) && !isNaN(rawIsc)) {
        rawImp = parseFloat((rawIsc * 0.94).toFixed(2));
      }
    }

    // Default Fallbacks if still missing
    const finalWatt = !isNaN(rawWatt) && rawWatt > 0 ? rawWatt : 550;
    const finalVoc = !isNaN(rawVoc) && rawVoc > 0 ? rawVoc : 49.5;
    const finalVmp = !isNaN(rawVmp) && rawVmp > 0 ? rawVmp : parseFloat((finalVoc * 0.84).toFixed(1));
    const finalImp = !isNaN(rawImp) && rawImp > 0 ? rawImp : parseFloat((finalWatt / finalVmp).toFixed(2));
    const finalIsc = !isNaN(rawIsc) && rawIsc > 0 ? rawIsc : parseFloat((finalImp * 1.06).toFixed(2));

    // Name fallback
    const finalName = rawName || (rawId ? rawId : `Solar Panel ${finalWatt}W`);
    const cleanIdBase = (rawId || finalName || 'panel').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    const finalId = `panel_${cleanIdBase}_${Date.now()}_${i + 1}_${Math.random().toString(36).slice(2, 6)}`;

    parsedPanels.push({
      id: finalId,
      name: finalName,
      watt: finalWatt,
      voc: finalVoc,
      vmp: finalVmp,
      imp: finalImp,
      isc: finalIsc
    });
  }

  if (parsedPanels.length === 0) {
    throw new Error('No valid solar panels found in file. Please ensure columns include Watt, Voc, and Vmp.');
  }

  return parsedPanels;
}

/**
 * Universal Inverter Parser
 * Supports XLSX, XLS, and CSV files.
 */
export async function parseInvertersFile(file: File): Promise<Inverter[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No sheet found in workbook');
  }
  
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (!rawRows || rawRows.length < 2) {
    throw new Error('Empty spreadsheet or no data rows found');
  }

  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    const row = rawRows[r];
    if (row && row.some((cell: any) => typeof cell === 'string' && cell.trim().length > 0)) {
      headerRowIndex = r;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex].map(cleanHeader);
  const dataRows = rawRows.slice(headerRowIndex + 1);

  const brandIdx = headerRow.findIndex(h => h.includes('brand') || h.includes('make') || h.includes('manufacturer'));
  const modelIdx = headerRow.findIndex(h => h.includes('model') || h.includes('type') || h.includes('invertername'));
  const kwIdx = headerRow.findIndex(h => h === 'kw' || h.includes('capacitykw') || h.includes('ratingkw') || h.includes('powerkw') || h === 'capacity' || h === 'accapacity');
  const maxDkWattIdx = headerRow.findIndex(h => h.includes('maxdcinputwatt') || h.includes('maxdcinputpower') || h.includes('inputpower') || h.includes('inputwatt') || h.includes('maxdcpower') || (h.includes('max') && h.includes('watt')));
  const vmpMinIdx = headerRow.findIndex(h => h.includes('vmpmin') || h.includes('minvmp') || h.includes('mpptmin') || h.includes('minmppt'));
  const vmpMaxIdx = headerRow.findIndex(h => h.includes('vmpmax') || h.includes('maxvmp') || h.includes('mpptmax') || h.includes('maxmppt'));
  const maxDcIdx = headerRow.findIndex(h => h.includes('maxdcvoltage') || h.includes('maxdcinputvoltage') || h.includes('maxvoltage') || (h.includes('max') && h.includes('volt') && !h.includes('nominal')));
  const nominalIdx = headerRow.findIndex((h, idx) => idx !== maxDcIdx && (h.includes('nominalvoltage') || h.includes('ratedvoltage') || h.includes('nominalvolt') || h === 'nominal' || h === 'rated'));
  const mpptIdx = headerRow.findIndex(h => h === 'mppt' || h.includes('mpptchannels') || h.includes('mpptcount'));
  const stringPerMpptIdx = headerRow.findIndex(h => h.includes('stringpermppt') || h.includes('stringspermppt') || h.includes('stringmppt'));
  const impIdx = headerRow.findIndex(h => h === 'imp' || h.includes('maxmpptoperatinginputcurrent') || h.includes('operatingcurrent') || h.includes('mpptcurrent'));
  const iscIdx = headerRow.findIndex(h => h === 'isc' || h.includes('maxmpptshortcircuitcurrent') || h.includes('shortcircuitcurrent'));
  const idIdx = headerRow.findIndex(h => h === 'id' || h === 'code' || h === 'itemid');

  const parsedInverters: Inverter[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0 || row.every((c: any) => c === '' || c === null || c === undefined)) {
      continue;
    }

    const brand = brandIdx !== -1 && row[brandIdx] ? String(row[brandIdx]).trim() : 'Custom';
    const model = modelIdx !== -1 && row[modelIdx] ? String(row[modelIdx]).trim() : `Model-${i + 1}`;
    const rawId = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : '';
    const cleanIdBase = (rawId || `${brand}_${model}`).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    const id = `inv_${cleanIdBase}_${Date.now()}_${i + 1}_${Math.random().toString(36).slice(2, 6)}`;
    
    const kw = kwIdx !== -1 ? parseFloat(String(row[kwIdx]).replace(/[^0-9.]/g, '')) || 5 : 5;
    const maxDcInputWatt = maxDkWattIdx !== -1 ? parseFloat(String(row[maxDkWattIdx]).replace(/[^0-9.]/g, '')) || (kw * 1300) : (kw * 1300);
    const vmpMin = vmpMinIdx !== -1 ? parseFloat(String(row[vmpMinIdx]).replace(/[^0-9.]/g, '')) || 120 : 120;
    const vmpMax = vmpMaxIdx !== -1 ? parseFloat(String(row[vmpMaxIdx]).replace(/[^0-9.]/g, '')) || 450 : 450;
    
    let nominalVoltage = nominalIdx !== -1 ? parseFloat(String(row[nominalIdx]).replace(/[^0-9.]/g, '')) || 360 : 360;
    let maxDcVoltage = maxDcIdx !== -1 ? parseFloat(String(row[maxDcIdx]).replace(/[^0-9.]/g, '')) || 500 : 500;

    // Safety swap if inverted in table
    if (nominalVoltage > maxDcVoltage) {
      const temp = nominalVoltage;
      nominalVoltage = maxDcVoltage;
      maxDcVoltage = temp;
    }

    const mppt = mpptIdx !== -1 ? parseInt(String(row[mpptIdx]).replace(/[^0-9]/g, '')) || 2 : 2;
    
    // Preserve exact notation like 1+1, 2+2, 2*10, or number for stringPerMppt
    let stringPerMppt: string | number = 1;
    if (stringPerMpptIdx !== -1 && row[stringPerMpptIdx] !== undefined && row[stringPerMpptIdx] !== null && String(row[stringPerMpptIdx]).trim() !== '') {
      const rawStr = String(row[stringPerMpptIdx]).trim();
      if (rawStr.includes('+') || rawStr.includes('*') || rawStr.includes('/')) {
        stringPerMppt = rawStr;
      } else {
        const parsedNum = parseInt(rawStr, 10);
        stringPerMppt = !isNaN(parsedNum) ? parsedNum : rawStr;
      }
    }

    // Preserve exact notation like 18+18, 26+26, 20*10, or number for imp
    let imp: string | number = 13.5;
    if (impIdx !== -1 && row[impIdx] !== undefined && row[impIdx] !== null && String(row[impIdx]).trim() !== '') {
      const rawStr = String(row[impIdx]).trim();
      if (rawStr.includes('+') || rawStr.includes('*') || rawStr.includes('/')) {
        imp = rawStr;
      } else {
        const parsedNum = parseFloat(rawStr);
        imp = !isNaN(parsedNum) ? parsedNum : rawStr;
      }
    }

    // Preserve exact notation like 27+27, 34+34, 30*10, or number for isc
    let isc: string | number = 14.5;
    if (iscIdx !== -1 && row[iscIdx] !== undefined && row[iscIdx] !== null && String(row[iscIdx]).trim() !== '') {
      const rawStr = String(row[iscIdx]).trim();
      if (rawStr.includes('+') || rawStr.includes('*') || rawStr.includes('/')) {
        isc = rawStr;
      } else {
        const parsedNum = parseFloat(rawStr);
        isc = !isNaN(parsedNum) ? parsedNum : rawStr;
      }
    }

    parsedInverters.push({
      id,
      brand,
      model,
      kw,
      maxDcInputWatt,
      vmpMin,
      vmpMax,
      nominalVoltage,
      maxDcVoltage,
      mppt,
      stringPerMppt,
      imp,
      isc
    });
  }

  if (parsedInverters.length === 0) {
    throw new Error('No valid inverters found in file.');
  }

  return parsedInverters;
}

/**
 * Universal Battery Parser
 * Supports XLSX, XLS, and CSV files.
 * Accurately extracts Brand, Model, Chemistry/Type, Nominal Voltage, Capacity (Ah & kWh), DoD %, Max Charge/Discharge.
 */
export async function parseBatteriesFile(file: File): Promise<BatteryPreset[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No sheet found in workbook');
  }
  
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (!rawRows || rawRows.length < 2) {
    throw new Error('Empty spreadsheet or no data rows found');
  }

  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    const row = rawRows[r];
    if (row && row.some((cell: any) => typeof cell === 'string' && cell.trim().length > 0)) {
      headerRowIndex = r;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex].map(cleanHeader);
  const dataRows = rawRows.slice(headerRowIndex + 1);

  const brandIdx = headerRow.findIndex(h => h.includes('brand') || h.includes('make') || h.includes('manufacturer'));
  const modelIdx = headerRow.findIndex(h => h.includes('model') || h.includes('type') || h.includes('batteryname') || h.includes('name'));
  const typeIdx = headerRow.findIndex(h => h.includes('chemistry') || h === 'batterytype' || h === 'chem' || (h.includes('type') && h !== 'model'));
  const voltageIdx = headerRow.findIndex(h => h.includes('nominalvoltage') || h.includes('voltage') || h.includes('volt') || h === 'v' || h === 'vdc');
  const ahIdx = headerRow.findIndex(h => h.includes('capacityah') || h === 'ah' || h.includes('amp') || h.includes('capacityamphour'));
  const kwhIdx = headerRow.findIndex(h => h.includes('capacitykwh') || h.includes('kwh') || h.includes('energykwh') || h.includes('energy'));
  const dodIdx = headerRow.findIndex(h => h.includes('dod') || h.includes('depthofdischarge') || h.includes('dodpercent'));
  const maxDischargeIdx = headerRow.findIndex(h => h.includes('maxdischarge') || h.includes('dischargerate') || h.includes('dischargecurrent') || h.includes('maxdischargecurrent'));
  const maxChargeIdx = headerRow.findIndex(h => h.includes('maxcharge') || h.includes('chargerate') || h.includes('chargecurrent') || h.includes('maxchargecurrent'));
  const idIdx = headerRow.findIndex(h => h === 'id' || h === 'code' || h === 'itemid');

  const parsedBatteries: BatteryPreset[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0 || row.every((c: any) => c === '' || c === null || c === undefined)) {
      continue;
    }

    const brand = brandIdx !== -1 && row[brandIdx] ? String(row[brandIdx]).trim() : 'Custom';
    const model = modelIdx !== -1 && row[modelIdx] ? String(row[modelIdx]).trim() : `Battery-${i + 1}`;
    const rawId = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : '';
    const cleanIdBase = (rawId || `${brand}_${model}`).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    const id = `bat_${cleanIdBase}_${Date.now()}_${i + 1}_${Math.random().toString(36).slice(2, 6)}`;

    // Battery chemistry detection
    let rawTypeStr = typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).toLowerCase().trim() : '';
    let batteryType: 'lithium' | 'lead_acid' | 'gel' = 'lithium';
    if (rawTypeStr.includes('lead') || rawTypeStr.includes('acid') || rawTypeStr.includes('agm') || rawTypeStr.includes('flooded')) {
      batteryType = 'lead_acid';
    } else if (rawTypeStr.includes('gel')) {
      batteryType = 'gel';
    } else {
      batteryType = 'lithium';
    }

    let nominalVoltage = voltageIdx !== -1 ? parseFloat(String(row[voltageIdx]).replace(/[^0-9.]/g, '')) || 51.2 : 51.2;
    let capacityAh = ahIdx !== -1 ? parseFloat(String(row[ahIdx]).replace(/[^0-9.]/g, '')) || 100 : 100;
    
    // Auto calculate kWh if missing, or use provided kWh
    let capacityKwh = kwhIdx !== -1 ? parseFloat(String(row[kwhIdx]).replace(/[^0-9.]/g, '')) : NaN;
    if (isNaN(capacityKwh) || capacityKwh <= 0) {
      capacityKwh = parseFloat(((nominalVoltage * capacityAh) / 1000).toFixed(2));
    }

    let dodPercent = dodIdx !== -1 ? parseFloat(String(row[dodIdx]).replace(/[^0-9.]/g, '')) : NaN;
    if (isNaN(dodPercent) || dodPercent <= 0) {
      dodPercent = batteryType === 'lithium' ? 90 : batteryType === 'gel' ? 60 : 50;
    }

    let maxDischargeCurrent = maxDischargeIdx !== -1 ? parseFloat(String(row[maxDischargeIdx]).replace(/[^0-9.]/g, '')) || capacityAh : capacityAh;
    let maxChargeCurrent = maxChargeIdx !== -1 ? parseFloat(String(row[maxChargeIdx]).replace(/[^0-9.]/g, '')) || (capacityAh * 0.5) : (capacityAh * 0.5);

    const chemistryVal = batteryType === 'lithium' ? 'lifepo4' : batteryType === 'gel' ? 'gel_lead_acid' : 'nmc';

    parsedBatteries.push({
      id,
      brand,
      model,
      type: batteryType,
      chemistry: chemistryVal,
      voltage: nominalVoltage,
      nominalVoltage,
      capacityAh,
      energyKwh: capacityKwh,
      capacityKwh,
      dodPercent,
      maxDischargeCurrent,
      maxChargeCurrent
    });
  }

  if (parsedBatteries.length === 0) {
    throw new Error('No valid batteries found in file.');
  }

  return parsedBatteries;
}
