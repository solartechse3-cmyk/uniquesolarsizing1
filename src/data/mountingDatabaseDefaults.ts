import { MountingDatabase, MountingPanelItem, RoofComponentItem, GroundComponentItem } from '../types';

export const DEFAULT_MOUNTING_PANELS: MountingPanelItem[] = [
  {
    id: 'panel_longi_585_himo6',
    brand: 'Longi Solar',
    model: 'Hi-MO 6 Explorer LR5-72HTH-585M',
    watt: 585,
    lengthMm: 2278,
    widthMm: 1134,
    thicknessMm: 35,
    weightKg: 27.5,
    cellType: 'HPBC N-Type Mono',
    voc: 52.26,
    vmp: 43.88,
    imp: 13.34,
    isc: 14.15,
    efficiency: 22.6,
    priceMmk: 285000
  },
  {
    id: 'panel_jinko_585_tiger_neo',
    brand: 'Jinko Solar',
    model: 'Tiger Neo N-Type JKM585N-72HL4-V',
    watt: 585,
    lengthMm: 2278,
    widthMm: 1134,
    thicknessMm: 30,
    weightKg: 28.0,
    cellType: 'TOPCon Dual-Glass Bifacial',
    voc: 51.90,
    vmp: 43.80,
    imp: 13.36,
    isc: 14.15,
    efficiency: 22.65,
    priceMmk: 290000
  },
  {
    id: 'panel_ja_575_deepblue',
    brand: 'JA Solar',
    model: 'DeepBlue 4.0 Pro JAM72D40-575/GB',
    watt: 575,
    lengthMm: 2278,
    widthMm: 1134,
    thicknessMm: 30,
    weightKg: 27.8,
    cellType: 'Bycium+ TOPCon Mono',
    voc: 51.50,
    vmp: 43.20,
    imp: 13.31,
    isc: 14.02,
    efficiency: 22.3,
    priceMmk: 275000
  },
  {
    id: 'panel_trina_580_vertex',
    brand: 'Trina Solar',
    model: 'Vertex TSM-DEG19RC.20-580W',
    watt: 580,
    lengthMm: 2384,
    widthMm: 1134,
    thicknessMm: 30,
    weightKg: 29.5,
    cellType: '210mm Vertex TOPCon',
    voc: 45.40,
    vmp: 38.30,
    imp: 15.15,
    isc: 15.98,
    efficiency: 22.2,
    priceMmk: 280000
  },
  {
    id: 'panel_canadian_550_hiku6',
    brand: 'Canadian Solar',
    model: 'HiKu6 CS6W-550MS Mono-PERC',
    watt: 550,
    lengthMm: 2278,
    widthMm: 1134,
    thicknessMm: 35,
    weightKg: 27.6,
    cellType: 'Mono-PERC Half-Cell',
    voc: 49.60,
    vmp: 41.70,
    imp: 13.19,
    isc: 14.00,
    efficiency: 21.3,
    priceMmk: 260000
  },
  {
    id: 'panel_trina_670_ultra',
    brand: 'Trina Solar',
    model: 'Vertex TSM-DEG21C.20 670W Ultra High Power',
    watt: 670,
    lengthMm: 2384,
    widthMm: 1303,
    thicknessMm: 35,
    weightKg: 33.7,
    cellType: '210mm Ultra Bifacial',
    voc: 45.70,
    vmp: 38.20,
    imp: 17.55,
    isc: 18.62,
    efficiency: 21.6,
    priceMmk: 340000
  },
  {
    id: 'panel_astronergy_450_chsm54',
    brand: 'Astronergy',
    model: 'Astro 5 Semi CHSM54N-HC-450W (Lightweight)',
    watt: 450,
    lengthMm: 1762,
    widthMm: 1134,
    thicknessMm: 30,
    weightKg: 21.5,
    cellType: 'TOPCon Residential',
    voc: 38.90,
    vmp: 32.70,
    imp: 13.76,
    isc: 14.54,
    efficiency: 22.5,
    priceMmk: 225000
  }
];

export const DEFAULT_ROOF_COMPONENTS: RoofComponentItem[] = [
  {
    id: 'rf_rail_4200',
    nameMy: 'အလူမီနီယမ် ရထားလမ်းဘား ၄.၂ မီတာ (Standard Solar Rail 4.2m)',
    nameEn: 'Anodized Aluminum Guide Rail (4200mm / 4.2m)',
    category: 'rail',
    specs: 'AL6005-T5 Anodized ≥12μm, Slotted mounting groove',
    unit: 'ချောင်း (Bars)',
    unitPrice: 48000,
    notes: 'Main mounting beam for Corrugated, Tile, and Klip-lok roofs'
  },
  {
    id: 'rf_rail_3300',
    nameMy: 'အလူမီနီယမ် ရထားလမ်းဘား ၃.၃ မီတာ (Solar Rail 3.3m)',
    nameEn: 'Anodized Aluminum Guide Rail (3300mm / 3.3m)',
    category: 'rail',
    specs: 'AL6005-T5 Anodized ≥12μm, 3.3 Meter Length',
    unit: 'ချောင်း (Bars)',
    unitPrice: 38000,
    notes: 'Compact roof span rail'
  },
  {
    id: 'rf_l_feet_kit',
    nameMy: 'သွပ်မိုး L-Feet ခြေထောက်တွဲ အစုံ (EPDM ရာဘာပြားနှင့် ဝက်အူပါ)',
    nameEn: 'Roof L-Feet Bracket Mount Kit (with EPDM Washer & Self-Drilling Screw)',
    category: 'bracket',
    specs: 'AL6005-T5 L-Foot + SUS304 M8 Flange Bolt + EPDM Pad + 6.3×80mm Screw',
    unit: 'စုံ (Sets)',
    unitPrice: 6500,
    notes: 'Standard tin/corrugated sheet roof waterproof mounting'
  },
  {
    id: 'rf_kliplok_clamp',
    nameMy: 'ဖောက်ရန်မလိုသော ခေါင်မိုးညှပ် Klip-Lok 700 / 406 Clamp',
    nameEn: 'Non-Penetrative Standing Seam Klip-Lok Clamp (700 / 406 Profile)',
    category: 'bracket',
    specs: 'High Tensile Aluminum Alloy + 2× SUS304 Grub Screws + Rail Nut',
    unit: 'ခု (Pcs)',
    unitPrice: 9500,
    notes: 'Leak-proof zero penetration commercial standing seam metal roof clamp'
  },
  {
    id: 'rf_tile_hook',
    nameMy: 'ကြွေပြား/အုတ်ကြွပ်မိုး ချိတ်ကောက် (SUS304 Tile Roof Hook)',
    nameEn: 'Stainless Steel SUS304 Adjustable Tile Roof Hook',
    category: 'bracket',
    specs: 'SUS304 Heavy Duty Stainless Steel 4.0mm thickness with 3 wood lag screws',
    unit: 'ခု (Pcs)',
    unitPrice: 12500,
    notes: 'Curved tile and roman tile waterproof under-rafter hook'
  },
  {
    id: 'rf_mid_clamp',
    nameMy: 'ဆိုလာပြားကြားညှပ် Mid Clamp (30mm - 35mm အရှင်ညှပ်)',
    nameEn: 'Adjustable Solar Mid Clamp with Grounding Pin (30-35mm)',
    category: 'clamp',
    specs: 'AL6005-T5 + SUS304 M8×45mm Hex Bolt + Rail Nut + Integrated Grounding Clip',
    unit: 'ခု (Pcs)',
    unitPrice: 2800,
    notes: 'Inter-module clamping for 30mm & 35mm module frames'
  },
  {
    id: 'rf_end_clamp',
    nameMy: 'ဆိုလာပြားအစွန်းညှပ် End Clamp (30mm / 35mm Frame)',
    nameEn: 'Universal Solar End Clamp (30mm / 35mm Module Frame)',
    category: 'clamp',
    specs: 'AL6005-T5 + SUS304 M8 Hex Socket Bolt + Spring Nut',
    unit: 'ခု (Pcs)',
    unitPrice: 3200,
    notes: 'Outer boundary panel secure terminal clamp'
  },
  {
    id: 'rf_rail_splice',
    nameMy: 'ရထားလမ်းဘား ဆက်အံကလစ် Splice Connector (200mm)',
    nameEn: 'Aluminum Internal Rail Splice Joiner (200mm Length)',
    category: 'splice',
    specs: 'AL6005-T5 + 2× SUS304 Self-tapping fastening screws',
    unit: 'ခု (Pcs)',
    unitPrice: 4500,
    notes: 'Rigid rail extension joint with thermal expansion gap'
  },
  {
    id: 'rf_ground_lug',
    nameMy: 'မြေစိုက်ကြိုးချိတ် Grounding Lug & Bonding Washer',
    nameEn: 'Tinned Copper Grounding Lug Kit (Fits 4-16mm² Earthing Wire)',
    category: 'grounding',
    specs: 'Electrolytic Tinned Copper / Stainless Steel Earthing Plate',
    unit: 'ခု (Pcs)',
    unitPrice: 4500,
    notes: 'Array-to-earth electrical continuity bonding'
  },
  {
    id: 'rf_fastener_kit',
    nameMy: 'SUS304 မူလီ၊ နတ်နှင့် ဝက်အူ အပိုအစုံထုပ် (Hardware Pack)',
    nameEn: 'Stainless Steel Fastener & Hardware Accessory Kit',
    category: 'fastener',
    specs: 'SUS304 M8 Bolts, Washers, Nuts & EPDM Waterproof Washers',
    unit: 'ထုပ် (Packs)',
    unitPrice: 25000,
    notes: 'Spares for site assembly'
  }
];

export const DEFAULT_GROUND_COMPONENTS: GroundComponentItem[] = [
  {
    id: 'gm_rafter_3x1_5',
    nameMy: 'ဒိုင်းမကြီး (Main Rafter Beam: 3" × 1 1/2" × 2.5mm Hollow)',
    nameEn: 'Main Rafter Beam (3" × 1 1/2" × 2.5mm Hot-Dip Galvanized Rectangular Hollow Tube)',
    category: 'rafter',
    specs: '76×38×2.5mm HDG Box Tube (≥65μm zinc coating, ASTM A123)',
    unit: 'ချောင်း (Bars)',
    unitPrice: 145000,
    material: 'HDG Carbon Steel Q235B',
    notes: 'North-South slope rafters carrying purlins and module rows'
  },
  {
    id: 'gm_column_4u',
    nameMy: 'ထောက်တိုင် (Beam Column: 4" U-Channel 100×50×5mm Heavy HDG)',
    nameEn: 'Vertical Beam Column (4" U-Channel 100×50×5mm Hot-Dip Galvanized)',
    category: 'column',
    specs: '100×50×5mm Heavy Duty U-Channel Steel Post (≥65μm zinc coating)',
    unit: 'ချောင်း (Posts)',
    unitPrice: 98000,
    material: 'HDG Heavy U-Steel Q235B',
    notes: 'Front, intermediate, and rear upright support columns'
  },
  {
    id: 'gm_cross_anchor_1_5x1_5',
    nameMy: 'ကြက်ခြေခတ် (Cross Anchors Bracing: 1 1/2" × 1 1/2" × 2.0mm Hollow)',
    nameEn: 'Cross-Anchor Bracing (1 1/2" × 1 1/2" × 2.0mm HDG Square Hollow Tube)',
    category: 'cross_anchor',
    specs: '38×38×2.0mm HDG Square Hollow Section (Diagonal X-Bracing)',
    unit: 'ချောင်း (Bars)',
    unitPrice: 45000,
    material: 'HDG Square Tube Q235B',
    notes: 'Cross-anchor bracing between column bents for ASCE 7-16 wind resistance'
  },
  {
    id: 'gm_purlin_1_5x1_5',
    nameMy: 'ဆိုလာတင်တန်း (Purlin Rails: 1 1/2" × 1 1/2" × 2.0mm Hollow Box Tube)',
    nameEn: 'Purlin Solar Rails (1 1/2" × 1 1/2" × 2.0mm HDG Square Hollow Tube)',
    category: 'purlin',
    specs: '38×38×2.0mm HDG Square Tube, 2 Rails per Module Row across East-West width',
    unit: 'ချောင်း (Bars)',
    unitPrice: 68000,
    material: 'HDG Square Tube Q235B',
    notes: 'Continuous longitudinal solar mounting rails across the frame'
  },
  {
    id: 'gm_tie_beam_3x1_5',
    nameMy: 'အလျားလိုက် ဆက်တန်း (Longitudinal Tie Beam: 3" × 1 1/2" Hollow)',
    nameEn: 'Longitudinal Tie Beam (3" × 1 1/2" × 2.0mm Hollow Box Tube)',
    category: 'tie_beam',
    specs: '76×38×2.0mm HDG Rectangular Box Section connecting post bents',
    unit: 'ချောင်း (Bars)',
    unitPrice: 58000,
    material: 'HDG Steel Q235B',
    notes: 'East-West column linking beams'
  },
  {
    id: 'gm_concrete_pier',
    nameMy: 'ကွန်ကရစ် အုတ်မြစ်တိုင် (Reinforced Concrete Pier Footing 400×400×900mm)',
    nameEn: 'Reinforced Concrete Pier Footing (400×400×900mm with Anchor J-Bolts)',
    category: 'foundation',
    specs: 'C25/30 Concrete + Rebar Cage + 4× M16 Hot-Dip Galvanized Anchor J-Bolts',
    unit: 'တိုင် (Piers)',
    unitPrice: 55000,
    material: 'Concrete & Galvanized Rebar',
    notes: 'Heavy flood and wind-resistant ground foundation'
  },
  {
    id: 'gm_ground_screw',
    nameMy: 'မြေပြင်စိုက် ဝက်အူတိုင် (Ground Screw Anchor Pile 1600mm / 76mm Dia)',
    nameEn: 'Hot-Dip Galvanized Ground Screw Anchor Pile (1600×76×3.5mm with Flange Plate)',
    category: 'foundation',
    specs: 'Q235 HDG Steel, 76mm Diameter, 1600mm Length, Helical Continuous Blades',
    unit: 'တိုင် (Screws)',
    unitPrice: 75000,
    material: 'HDG Steel Pile',
    notes: 'Rapid zero-concrete rammed foundation'
  },
  {
    id: 'gm_mid_clamp',
    nameMy: 'ဆိုလာပြားကြားညှပ် Mid Clamp (HDG / Aluminum with SUS304 Bolt)',
    nameEn: 'Solar Mid Clamp Kit with Grounding Pin (for Ground Mount Purlins)',
    category: 'clamp',
    specs: 'Aluminum / HDG Steel Clamp with SUS304 M8 Bolt & Channel Nut',
    unit: 'ခု (Pcs)',
    unitPrice: 2800,
    material: 'AL6005-T5 / SUS304',
    notes: '20mm inter-panel spacing clamp'
  },
  {
    id: 'gm_end_clamp',
    nameMy: 'ဆိုလာပြားအစွန်းညှပ် End Clamp (Heavy Duty)',
    nameEn: 'Solar End Clamp Kit (Terminal Frame Clamping)',
    category: 'clamp',
    specs: 'Heavy Duty Clamp with SUS304 M8 Bolt & Rail Nut',
    unit: 'ခု (Pcs)',
    unitPrice: 3200,
    material: 'AL6005-T5 / SUS304',
    notes: 'Array edge clamp'
  },
  {
    id: 'gm_hardware_pack',
    nameMy: 'တပ်ဆင်ရေး မူလီ၊ နတ်နှင့် ချိတ်ဆက်ပြား အစုံထုပ် (Structural Fasteners Pack)',
    nameEn: 'High-Tensile Galvanized Bolt & Connection Gusset Hardware Pack',
    category: 'hardware',
    specs: 'Grade 8.8 HDG M10 / M12 Bolts, Heavy Washers, Locking Nuts, Gusset Plates',
    unit: 'ထုပ် (Packs)',
    unitPrice: 35000,
    material: 'HDG Grade 8.8 Steel',
    notes: 'High-strength frame connection hardware'
  }
];

export const INITIAL_MOUNTING_DATABASE: MountingDatabase = {
  version: '2026.1',
  lastUpdated: new Date().toISOString(),
  publishedBy: 'SolarTech Engineering Division (Admin)',
  isOnlineLive: true,
  panels: DEFAULT_MOUNTING_PANELS,
  roofComponents: DEFAULT_ROOF_COMPONENTS,
  groundComponents: DEFAULT_GROUND_COMPONENTS
};
