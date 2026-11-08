import * as XLSX from 'xlsx';
import { MountingDatabase, MountingPanelItem, RoofComponentItem, GroundComponentItem } from '../types';
import { INITIAL_MOUNTING_DATABASE } from '../data/mountingDatabaseDefaults';

const STORAGE_MOUNTING_DB_KEY = 'solar_mounting_database_v1';

/**
 * Clean string for fuzzy header matching
 */
function cleanHeader(h: any): string {
  if (h === null || h === undefined) return '';
  return String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// ----------------------------------------------------
// SAMPLE EXCEL & CSV TEMPLATE GENERATORS
// ----------------------------------------------------

export function downloadSamplePanelsTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const headers = [
    'Brand',
    'Model',
    'Watt (W)',
    'Length (mm)',
    'Width (mm)',
    'Thickness (mm)',
    'Weight (kg)',
    'Cell Type',
    'Voc (V)',
    'Vmp (V)',
    'Imp (A)',
    'Isc (A)',
    'Efficiency (%)',
    'Unit Price (MMK)'
  ];

  const rows = [
    ['Longi Solar', 'Hi-MO 6 Explorer LR5-72HTH-585M', 585, 2278, 1134, 35, 27.5, 'HPBC N-Type Mono', 52.26, 43.88, 13.34, 14.15, 22.6, 285000],
    ['Jinko Solar', 'Tiger Neo N-Type JKM585N-72HL4-V', 585, 2278, 1134, 30, 28.0, 'TOPCon Bifacial', 51.90, 43.80, 13.36, 14.15, 22.65, 290000],
    ['JA Solar', 'DeepBlue 4.0 Pro JAM72D40-575/GB', 575, 2278, 1134, 30, 27.8, 'Bycium+ TOPCon Mono', 51.50, 43.20, 13.31, 14.02, 22.3, 275000],
    ['Trina Solar', 'Vertex TSM-DEG19RC.20-580W', 580, 2384, 1134, 30, 29.5, '210mm Vertex TOPCon', 45.40, 38.30, 15.15, 15.98, 22.2, 280000],
    ['Canadian Solar', 'HiKu6 CS6W-550MS Mono-PERC', 550, 2278, 1134, 35, 27.6, 'Mono-PERC Half-Cell', 49.60, 41.70, 13.19, 14.00, 21.3, 260000],
    ['Trina Solar', 'Vertex DEG21C.20 670W Ultra High Power', 670, 2384, 1303, 35, 33.7, '210mm Ultra Bifacial', 45.70, 38.20, 17.55, 18.62, 21.6, 340000],
    ['Astronergy', 'Astro 5 Semi CHSM54N-HC-450W', 450, 1762, 1134, 30, 21.5, 'TOPCon Residential', 38.90, 32.70, 13.76, 14.54, 22.5, 225000]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Solar_Panels');

  const fileName = `Sample_Solar_Panels_Template_${Date.now()}.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
  }
}

export function downloadSampleRoofTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const headers = [
    'Component ID',
    'Component Name (Myanmar)',
    'Component Name (English)',
    'Category',
    'Engineering Specs',
    'Unit',
    'Unit Price (MMK)',
    'Technical Notes'
  ];

  const rows = [
    ['rf_rail_4200', 'အလူမီနီယမ် ရထားလမ်းဘား ၄.၂ မီတာ', 'Anodized Aluminum Guide Rail (4200mm)', 'rail', 'AL6005-T5 Anodized ≥12μm', 'ချောင်း (Bars)', 48000, 'Main mounting rail'],
    ['rf_l_feet_kit', 'သွပ်မိုး L-Feet ခြေထောက်တွဲ အစုံ', 'Roof L-Feet Bracket Mount Kit', 'bracket', 'AL6005-T5 + SUS304 + EPDM Pad', 'စုံ (Sets)', 6500, 'Tin roof bracket'],
    ['rf_kliplok_clamp', 'ဖောက်ရန်မလိုသော ခေါင်မိုးညှပ် Klip-Lok Clamp', 'Non-Penetrative Standing Seam Clamp', 'bracket', 'High Tensile Aluminum + SUS304 Grub Screws', 'ခု (Pcs)', 9500, 'Standing seam roof'],
    ['rf_tile_hook', 'ကြွေပြား/အုတ်ကြွပ်မိုး ချိတ်ကောက် SUS304', 'Tile Roof Hook SUS304', 'bracket', 'SUS304 Heavy Duty Stainless Steel 4.0mm', 'ခု (Pcs)', 12500, 'Tile roof hook'],
    ['rf_mid_clamp', 'ဆိုလာပြားကြားညှပ် Mid Clamp (30-35mm)', 'Adjustable Solar Mid Clamp Kit', 'clamp', 'AL6005-T5 + M8 Bolt + Grounding Clip', 'ခု (Pcs)', 2800, 'Mid-module clamp'],
    ['rf_end_clamp', 'ဆိုလာပြားအစွန်းညှပ် End Clamp', 'Universal Solar End Clamp', 'clamp', 'AL6005-T5 + SUS304 M8 Bolt', 'ခု (Pcs)', 3200, 'Boundary clamp'],
    ['rf_rail_splice', 'ရထားလမ်းဘား ဆက်အံကလစ် Splice (200mm)', 'Internal Rail Splice Joiner (200mm)', 'splice', 'AL6005-T5 + 2 Fasteners', 'ခု (Pcs)', 4500, 'Rail extension'],
    ['rf_ground_lug', 'မြေစိုက်ကြိုးချိတ် Grounding Lug', 'Tinned Copper Grounding Lug Kit', 'grounding', 'Tinned Copper / Stainless Steel', 'ခု (Pcs)', 4500, 'Array earthing']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Roof_Mount_Pricing');

  const fileName = `Sample_Roof_Mount_Pricing_Template_${Date.now()}.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
  }
}

export function downloadSampleGroundTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const headers = [
    'Component ID',
    'Component Name (Myanmar)',
    'Component Name (English)',
    'Category',
    'Engineering Specs',
    'Unit',
    'Unit Price (MMK)',
    'Material Grade',
    'Technical Notes'
  ];

  const rows = [
    ['gm_rafter_3x1_5', 'ဒိုင်းမကြီး (3" × 1 1/2" × 2.5mm Hollow)', 'Main Rafter Beam (3" × 1 1/2" Hollow Tube)', 'rafter', '76×38×2.5mm HDG Box Tube (≥65μm zinc)', 'ချောင်း (Bars)', 145000, 'HDG Carbon Steel Q235B', 'Rafter carrying slope'],
    ['gm_column_4u', 'ထောက်တိုင် (4" U-Channel 100×50×5mm)', 'Beam Column (4" U-Channel Post)', 'column', '100×50×5mm Heavy Duty HDG U-Channel', 'ချောင်း (Posts)', 98000, 'HDG U-Steel Q235B', 'Upright columns'],
    ['gm_cross_anchor', 'ကြက်ခြေခတ် (1 1/2" × 1 1/2" × 2.0mm Hollow)', 'Cross-Anchor Bracing (1 1/2" Square Tube)', 'cross_anchor', '38×38×2.0mm HDG Square Section Bracing', 'ချောင်း (Bars)', 45000, 'HDG Square Tube Q235B', 'Cross-anchor bracing'],
    ['gm_purlin_1_5x1_5', 'ဆိုလာတင်တန်း (1 1/2" × 1 1/2" × 2.0mm Hollow)', 'Purlin Solar Rails (1 1/2" Square Tube)', 'purlin', '38×38×2.0mm HDG Square Box Tube Rails', 'ချောင်း (Bars)', 68000, 'HDG Square Tube Q235B', 'Module support purlins'],
    ['gm_tie_beam', 'အလျားလိုက် ဆက်တန်း (3" × 1 1/2" Hollow)', 'Longitudinal Tie Beam (3" × 1 1/2")', 'tie_beam', '76×38×2.0mm HDG Box Section', 'ချောင်း (Bars)', 58000, 'HDG Steel Q235B', 'Column linking beam'],
    ['gm_concrete_pier', 'ကွန်ကရစ် အုတ်မြစ်တိုင် (400×400×900mm)', 'Concrete Pier Footing (400×400×900mm)', 'foundation', 'C25/30 Concrete + Rebar + M16 J-Bolts', 'တိုင် (Piers)', 55000, 'Concrete & Rebar', 'Foundation footing'],
    ['gm_ground_screw', 'မြေပြင်စိုက် ဝက်အူတိုင် (1600mm / 76mm Dia)', 'Ground Screw Anchor Pile (1600×76mm)', 'foundation', 'Q235 HDG Continuous Helical Blades', 'တိုင် (Screws)', 75000, 'HDG Steel Pile', 'Rammed pile foundation'],
    ['gm_mid_clamp', 'ဆိုလာပြားကြားညှပ် Mid Clamp', 'Solar Mid Clamp Kit (Ground Mount)', 'clamp', 'Aluminum / HDG Clamp + SUS304 Bolt', 'ခု (Pcs)', 2800, 'AL6005-T5 / SUS304', 'Inter-module clamping'],
    ['gm_end_clamp', 'ဆိုလာပြားအစွန်းညှပ် End Clamp', 'Solar End Clamp Kit (Ground Mount)', 'clamp', 'Heavy Duty Clamp + SUS304 Bolt', 'ခု (Pcs)', 3200, 'AL6005-T5 / SUS304', 'Array edge clamping'],
    ['gm_hardware_pack', 'တပ်ဆင်ရေး မူလီ၊ နတ်နှင့် ချိတ်ဆက်ပြား အစုံထုပ်', 'Structural Fastener & Hardware Pack', 'hardware', 'Grade 8.8 HDG M10/M12 Bolts + Gussets', 'ထုပ် (Packs)', 35000, 'HDG Grade 8.8 Steel', 'Site assembly spares']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Ground_Mount_Pricing');

  const fileName = `Sample_Ground_Mount_Steel_Pricing_Template_${Date.now()}.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
  }
}

// ----------------------------------------------------
// EXPORT COMPLETE DATABASE
// ----------------------------------------------------

export function exportFullMountingDatabase(db: MountingDatabase, format: 'xlsx' | 'csv' = 'xlsx') {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Panels
  const panelHeaders = ['ID', 'Brand', 'Model', 'Watt (W)', 'Length (mm)', 'Width (mm)', 'Thickness (mm)', 'Weight (kg)', 'Cell Type', 'Voc (V)', 'Vmp (V)', 'Imp (A)', 'Isc (A)', 'Efficiency (%)', 'Price (MMK)'];
  const panelRows = db.panels.map(p => [
    p.id, p.brand, p.model, p.watt, p.lengthMm, p.widthMm, p.thicknessMm, p.weightKg || '', p.cellType || '', p.voc || '', p.vmp || '', p.imp || '', p.isc || '', p.efficiency || '', p.priceMmk || ''
  ]);
  const wsPanels = XLSX.utils.aoa_to_sheet([panelHeaders, ...panelRows]);
  XLSX.utils.book_append_sheet(wb, wsPanels, 'Solar_Panels');

  // Sheet 2: Roof Components
  const roofHeaders = ['ID', 'Name (Myanmar)', 'Name (English)', 'Category', 'Specs', 'Unit', 'Unit Price (MMK)', 'Notes'];
  const roofRows = db.roofComponents.map(r => [
    r.id, r.nameMy, r.nameEn, r.category, r.specs, r.unit, r.unitPrice, r.notes || ''
  ]);
  const wsRoof = XLSX.utils.aoa_to_sheet([roofHeaders, ...roofRows]);
  XLSX.utils.book_append_sheet(wb, wsRoof, 'Roof_Mount_BOQ');

  // Sheet 3: Ground Components
  const groundHeaders = ['ID', 'Name (Myanmar)', 'Name (English)', 'Category', 'Specs', 'Unit', 'Unit Price (MMK)', 'Material', 'Notes'];
  const groundRows = db.groundComponents.map(g => [
    g.id, g.nameMy, g.nameEn, g.category, g.specs, g.unit, g.unitPrice, g.material || '', g.notes || ''
  ]);
  const wsGround = XLSX.utils.aoa_to_sheet([groundHeaders, ...groundRows]);
  XLSX.utils.book_append_sheet(wb, wsGround, 'Ground_Mount_Steel');

  const fileName = `Solar_Mounting_Database_Export_${new Date().toISOString().slice(0, 10)}.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
  }
}

// ----------------------------------------------------
// EXCEL & CSV SPREADSHEET PARSERS
// ----------------------------------------------------

export async function parsePanelsSpreadsheet(file: File): Promise<MountingPanelItem[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('No sheet found in file');

  const ws = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rawRows || rawRows.length < 2) throw new Error('File is empty or missing data rows');

  // Header detection
  let headerIdx = 0;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    if (rawRows[r] && rawRows[r].some((c: any) => typeof c === 'string' && c.trim().length > 0)) {
      headerIdx = r;
      break;
    }
  }

  const headerRow = rawRows[headerIdx].map(cleanHeader);
  const dataRows = rawRows.slice(headerIdx + 1);

  // Column matching
  const brandIdx = headerRow.findIndex(h => h.includes('brand') || h.includes('make') || h.includes('manufacturer'));
  const modelIdx = headerRow.findIndex(h => h.includes('model') || h.includes('panelname') || h === 'name' || h.includes('type'));
  const wattIdx = headerRow.findIndex(h => h === 'watt' || h === 'watts' || h === 'wattw' || h === 'wattage' || h === 'power' || h === 'pmax' || h.includes('watt'));
  const lengthIdx = headerRow.findIndex(h => h.includes('length') || h.includes('height') || h.includes('long'));
  const widthIdx = headerRow.findIndex(h => h.includes('width') || h.includes('wide'));
  const thicknessIdx = headerRow.findIndex(h => h.includes('thickness') || h.includes('thick') || h.includes('depth'));
  const weightIdx = headerRow.findIndex(h => h.includes('weight') || h.includes('kg'));
  const cellTypeIdx = headerRow.findIndex(h => h.includes('cell') || h.includes('technology'));
  const vocIdx = headerRow.findIndex(h => h === 'voc' || h.includes('opencircuit'));
  const vmpIdx = headerRow.findIndex(h => h === 'vmp' || h.includes('maxpower') && h.includes('volt'));
  const impIdx = headerRow.findIndex(h => h === 'imp' || h.includes('maxpower') && h.includes('current'));
  const iscIdx = headerRow.findIndex(h => h === 'isc' || h.includes('shortcircuit'));
  const effIdx = headerRow.findIndex(h => h.includes('efficiency') || h.includes('eff'));
  const priceIdx = headerRow.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('mmk') || h.includes('kyat'));
  const idIdx = headerRow.findIndex(h => h === 'id' || h === 'code');

  const items: MountingPanelItem[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0 || row.every((c: any) => c === '' || c === null || c === undefined)) continue;

    const brand = brandIdx !== -1 && row[brandIdx] ? String(row[brandIdx]).trim() : 'Solar Module';
    const model = modelIdx !== -1 && row[modelIdx] ? String(row[modelIdx]).trim() : `Model-${i + 1}`;
    const watt = wattIdx !== -1 ? parseFloat(String(row[wattIdx]).replace(/[^0-9.]/g, '')) || 550 : 550;
    
    // Length & Width: normalize mm vs meters
    let lengthMm = lengthIdx !== -1 ? parseFloat(String(row[lengthIdx]).replace(/[^0-9.]/g, '')) || 2278 : 2278;
    if (lengthMm > 0 && lengthMm < 10) lengthMm = Math.round(lengthMm * 1000); // converted from meters
    
    let widthMm = widthIdx !== -1 ? parseFloat(String(row[widthIdx]).replace(/[^0-9.]/g, '')) || 1134 : 1134;
    if (widthMm > 0 && widthMm < 10) widthMm = Math.round(widthMm * 1000); // converted from meters

    let thicknessMm = thicknessIdx !== -1 ? parseFloat(String(row[thicknessIdx]).replace(/[^0-9.]/g, '')) || 30 : 30;
    if (thicknessMm > 100) thicknessMm = 30; // sanity check

    const weightKg = weightIdx !== -1 ? parseFloat(String(row[weightIdx]).replace(/[^0-9.]/g, '')) || 27.5 : 27.5;
    const cellType = cellTypeIdx !== -1 && row[cellTypeIdx] ? String(row[cellTypeIdx]).trim() : 'N-Type TOPCon';
    const voc = vocIdx !== -1 ? parseFloat(String(row[vocIdx]).replace(/[^0-9.]/g, '')) || 51.5 : 51.5;
    const vmp = vmpIdx !== -1 ? parseFloat(String(row[vmpIdx]).replace(/[^0-9.]/g, '')) || 43.2 : 43.2;
    const imp = impIdx !== -1 ? parseFloat(String(row[impIdx]).replace(/[^0-9.]/g, '')) || 13.3 : 13.3;
    const isc = iscIdx !== -1 ? parseFloat(String(row[iscIdx]).replace(/[^0-9.]/g, '')) || 14.1 : 14.1;
    const efficiency = effIdx !== -1 ? parseFloat(String(row[effIdx]).replace(/[^0-9.]/g, '')) || 22.5 : 22.5;
    const priceMmk = priceIdx !== -1 ? parseFloat(String(row[priceIdx]).replace(/[^0-9.]/g, '')) || 280000 : 280000;

    const rawId = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : '';
    const cleanId = rawId || `panel_${brand.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${watt}w_${i + 1}`;

    items.push({
      id: cleanId,
      brand,
      model,
      watt,
      lengthMm,
      widthMm,
      thicknessMm,
      weightKg,
      cellType,
      voc,
      vmp,
      imp,
      isc,
      efficiency,
      priceMmk
    });
  }

  if (items.length === 0) {
    throw new Error('No valid panels found in spreadsheet. Ensure columns for Watt, Length, and Width are included.');
  }

  return items;
}

export async function parseRoofSpreadsheet(file: File): Promise<RoofComponentItem[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('No sheet found in file');

  const ws = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rawRows || rawRows.length < 2) throw new Error('File is empty or missing data rows');

  let headerIdx = 0;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    if (rawRows[r] && rawRows[r].some((c: any) => typeof c === 'string' && c.trim().length > 0)) {
      headerIdx = r;
      break;
    }
  }

  const headerRow = rawRows[headerIdx].map(cleanHeader);
  const dataRows = rawRows.slice(headerIdx + 1);

  const nameMyIdx = headerRow.findIndex(h => h.includes('myanmar') || h.includes('namemy') || (h.includes('name') && !h.includes('en')));
  const nameEnIdx = headerRow.findIndex(h => h.includes('english') || h.includes('nameen') || h.includes('item'));
  const catIdx = headerRow.findIndex(h => h.includes('category') || h.includes('type'));
  const specsIdx = headerRow.findIndex(h => h.includes('specs') || h.includes('specification') || h.includes('detail'));
  const unitIdx = headerRow.findIndex(h => h.includes('unit'));
  const priceIdx = headerRow.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('mmk') || h.includes('rate'));
  const notesIdx = headerRow.findIndex(h => h.includes('note') || h.includes('remark'));
  const idIdx = headerRow.findIndex(h => h === 'id' || h === 'code');

  const items: RoofComponentItem[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0 || row.every((c: any) => c === '' || c === null || c === undefined)) continue;

    const rawId = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `rf_comp_${i + 1}`;
    const nameMy = nameMyIdx !== -1 && row[nameMyIdx] ? String(row[nameMyIdx]).trim() : (nameEnIdx !== -1 ? String(row[nameEnIdx]).trim() : `Roof Item ${i + 1}`);
    const nameEn = nameEnIdx !== -1 && row[nameEnIdx] ? String(row[nameEnIdx]).trim() : nameMy;
    
    let category: RoofComponentItem['category'] = 'other';
    const rawCat = catIdx !== -1 ? String(row[catIdx]).toLowerCase() : '';
    if (rawCat.includes('rail')) category = 'rail';
    else if (rawCat.includes('clamp')) category = 'clamp';
    else if (rawCat.includes('bracket') || rawCat.includes('hook') || rawCat.includes('feet')) category = 'bracket';
    else if (rawCat.includes('splice') || rawCat.includes('join')) category = 'splice';
    else if (rawCat.includes('ground') || rawCat.includes('earth')) category = 'grounding';
    else if (rawCat.includes('fasten') || rawCat.includes('bolt') || rawCat.includes('screw')) category = 'fastener';

    const specs = specsIdx !== -1 && row[specsIdx] ? String(row[specsIdx]).trim() : 'AL6005-T5 / SUS304 Standard';
    const unit = unitIdx !== -1 && row[unitIdx] ? String(row[unitIdx]).trim() : 'ခု (Pcs)';
    const unitPrice = priceIdx !== -1 ? parseFloat(String(row[priceIdx]).replace(/[^0-9.]/g, '')) || 0 : 0;
    const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : '';

    items.push({
      id: rawId,
      nameMy,
      nameEn,
      category,
      specs,
      unit,
      unitPrice,
      notes
    });
  }

  if (items.length === 0) throw new Error('No valid roof mount items found in spreadsheet');
  return items;
}

export async function parseGroundSpreadsheet(file: File): Promise<GroundComponentItem[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('No sheet found in file');

  const ws = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rawRows || rawRows.length < 2) throw new Error('File is empty or missing data rows');

  let headerIdx = 0;
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    if (rawRows[r] && rawRows[r].some((c: any) => typeof c === 'string' && c.trim().length > 0)) {
      headerIdx = r;
      break;
    }
  }

  const headerRow = rawRows[headerIdx].map(cleanHeader);
  const dataRows = rawRows.slice(headerIdx + 1);

  const nameMyIdx = headerRow.findIndex(h => h.includes('myanmar') || h.includes('namemy') || (h.includes('name') && !h.includes('en')));
  const nameEnIdx = headerRow.findIndex(h => h.includes('english') || h.includes('nameen') || h.includes('item'));
  const catIdx = headerRow.findIndex(h => h.includes('category') || h.includes('type'));
  const specsIdx = headerRow.findIndex(h => h.includes('specs') || h.includes('specification') || h.includes('detail'));
  const unitIdx = headerRow.findIndex(h => h.includes('unit'));
  const priceIdx = headerRow.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('mmk') || h.includes('rate'));
  const matIdx = headerRow.findIndex(h => h.includes('material') || h.includes('steel') || h.includes('grade'));
  const notesIdx = headerRow.findIndex(h => h.includes('note') || h.includes('remark'));
  const idIdx = headerRow.findIndex(h => h === 'id' || h === 'code');

  const items: GroundComponentItem[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0 || row.every((c: any) => c === '' || c === null || c === undefined)) continue;

    const rawId = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `gm_comp_${i + 1}`;
    const nameMy = nameMyIdx !== -1 && row[nameMyIdx] ? String(row[nameMyIdx]).trim() : (nameEnIdx !== -1 ? String(row[nameEnIdx]).trim() : `Ground Item ${i + 1}`);
    const nameEn = nameEnIdx !== -1 && row[nameEnIdx] ? String(row[nameEnIdx]).trim() : nameMy;
    
    let category: GroundComponentItem['category'] = 'other';
    const rawCat = catIdx !== -1 ? String(row[catIdx]).toLowerCase() : '';
    if (rawCat.includes('rafter') || rawCat.includes('beam')) category = 'rafter';
    else if (rawCat.includes('column') || rawCat.includes('post') || rawCat.includes('channel')) category = 'column';
    else if (rawCat.includes('cross') || rawCat.includes('anchor') || rawCat.includes('brace')) category = 'cross_anchor';
    else if (rawCat.includes('purlin') || rawCat.includes('rail')) category = 'purlin';
    else if (rawCat.includes('tie')) category = 'tie_beam';
    else if (rawCat.includes('pier') || rawCat.includes('foundation') || rawCat.includes('footing') || rawCat.includes('screw')) category = 'foundation';
    else if (rawCat.includes('clamp')) category = 'clamp';
    else if (rawCat.includes('hardware') || rawCat.includes('fastener') || rawCat.includes('bolt')) category = 'hardware';

    const specs = specsIdx !== -1 && row[specsIdx] ? String(row[specsIdx]).trim() : 'Hot-Dip Galvanized Q235B / SUS304';
    const unit = unitIdx !== -1 && row[unitIdx] ? String(row[unitIdx]).trim() : 'ချောင်း (Bars)';
    const unitPrice = priceIdx !== -1 ? parseFloat(String(row[priceIdx]).replace(/[^0-9.]/g, '')) || 0 : 0;
    const material = matIdx !== -1 && row[matIdx] ? String(row[matIdx]).trim() : 'HDG Carbon Steel Q235B';
    const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : '';

    items.push({
      id: rawId,
      nameMy,
      nameEn,
      category,
      specs,
      unit,
      unitPrice,
      material,
      notes
    });
  }

  if (items.length === 0) throw new Error('No valid ground mount items found in spreadsheet');
  return items;
}

// ----------------------------------------------------
// SERVER STORAGE & ONLINE LIVE PUBLISHING ENGINE
// ----------------------------------------------------

/**
 * Synchronous initial retrieval from LocalStorage or Default
 */
export function getInitialMountingDatabase(): MountingDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_MOUNTING_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.panels) && parsed.panels.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return INITIAL_MOUNTING_DATABASE;
}

/**
 * Fetch Mounting Database from Express Server / LocalStorage
 */
export async function fetchMountingDatabaseFromCloud(): Promise<{ db: MountingDatabase; source: 'cloud' | 'local' }> {
  // 1. Try Server API first
  try {
    const res = await fetch('/api/data/mounting_database');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && json.data.panels && Array.isArray(json.data.panels)) {
        try {
          localStorage.setItem(STORAGE_MOUNTING_DB_KEY, JSON.stringify(json.data));
        } catch (e) {}
        return { db: json.data, source: 'cloud' };
      }
    }
  } catch (err) {}

  // 2. Try LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_MOUNTING_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.panels)) {
        return { db: parsed, source: 'local' };
      }
    }
  } catch (e) {}

  // 3. Fallback to Initial Default Mounting Database
  return { db: INITIAL_MOUNTING_DATABASE, source: 'local' };
}

/**
 * Publish Database Online for all users across the web
 */
export async function publishMountingDatabaseToCloud(
  database: MountingDatabase,
  adminName: string = 'Admin'
): Promise<{ success: boolean; error?: string; timestamp: string }> {
  const updatedDb: MountingDatabase = {
    ...database,
    lastUpdated: new Date().toISOString(),
    publishedBy: `${adminName} (Verified Admin)`,
    isOnlineLive: true
  };

  // 1. Save to local storage immediately
  try {
    localStorage.setItem(STORAGE_MOUNTING_DB_KEY, JSON.stringify(updatedDb));
  } catch (e) {}

  // 2. Post to central Express backend (saves to disk in data/app_storage.json and broadcasts to all clients)
  try {
    const res = await fetch('/api/data/mounting_database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: updatedDb })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error || 'Server rejected database publish', timestamp: updatedDb.lastUpdated };
    }

    // Also notify local browser tabs
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('solar_mounting_db_sync');
        bc.postMessage({ type: 'MOUNTING_DB_PUBLISHED', data: updatedDb, timestamp: Date.now() });
        setTimeout(() => bc.close(), 1000);
      } catch (e) {}
    }

    return { success: true, timestamp: updatedDb.lastUpdated };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error publishing database', timestamp: updatedDb.lastUpdated };
  }
}

/**
 * Subscribe to real-time updates from other admin sessions
 */
export function subscribeToMountingDatabaseUpdates(onUpdate: (db: MountingDatabase) => void): () => void {
  let isCleanedUp = false;
  let eventSource: EventSource | null = null;
  let broadcastChannel: BroadcastChannel | null = null;

  // 1. Listen via Server-Sent Events (SSE)
  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'mounting_database' && payload.data) {
            onUpdate(payload.data);
          }
        } catch (e) {}
      };
    } catch (e) {}
  }

  // 2. Listen via BroadcastChannel across local tabs
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel('solar_mounting_db_sync');
      broadcastChannel.onmessage = (event) => {
        if (isCleanedUp) return;
        if (event.data?.type === 'MOUNTING_DB_PUBLISHED' && event.data?.data) {
          onUpdate(event.data.data);
        }
      };
    } catch (e) {}
  }

  return () => {
    isCleanedUp = true;
    if (eventSource) eventSource.close();
    if (broadcastChannel) broadcastChannel.close();
  };
}
