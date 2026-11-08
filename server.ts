import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const portArgIndex = process.argv.indexOf("--port");
const portFromArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : NaN;
const PORT = !isNaN(portFromArg) ? portFromArg : (Number(process.env.PORT) || 3000);

const hostArgIndex = process.argv.indexOf("--host");
const HOST = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : "0.0.0.0";

// Enable JSON body parsing with large payload limit (for base64 datasheets/PDFs)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Server-Sent Events (SSE) clients pool for instant global real-time synchronization
const sseClients = new Set<express.Response>();

function broadcastSSE(type: string, data: any) {
  const payload = `event: message\ndata: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// ----------------------------------------------------
// MULTI-DEVICE REAL-TIME PRESENCE REGISTRY
// ----------------------------------------------------
interface ServerUserPresence {
  id: string;
  sessionId: string;
  role: 'admin' | 'paid_user' | 'user';
  name: string;
  device: string;
  lastActive: string;
  startedAt: string;
  lastPing: number;
}

const activeSessions = new Map<string, ServerUserPresence>();

function getActiveSessionsList(): ServerUserPresence[] {
  const now = Date.now();
  const list: ServerUserPresence[] = [];
  for (const [sessId, session] of activeSessions.entries()) {
    // Keep active if pinged in the last 15 seconds
    if (now - session.lastPing < 15000) {
      list.push(session);
    } else {
      activeSessions.delete(sessId);
    }
  }
  return list;
}

function broadcastPresenceUpdate() {
  const list = getActiveSessionsList();
  broadcastSSE("presence", {
    count: list.length,
    presences: list,
    timestamp: Date.now()
  });
}

// Heartbeat pruner: checks every 4 seconds and broadcasts changes
setInterval(() => {
  const beforeCount = activeSessions.size;
  const list = getActiveSessionsList();
  if (list.length !== beforeCount) {
    broadcastPresenceUpdate();
  }
}, 4000);

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const STORAGE_FILE = path.join(DATA_DIR, "app_storage.json");
const BACKUP_STORAGE_FILE = path.join(DATA_DIR, "app_storage.backup.json");

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create data directory:", err);
}

// Helper to save base64 file to disk
function saveResourceFileToDisk(resourceId: string, fileData: string): string {
  try {
    if (!fileData) return '';
    let base64Content = fileData;
    if (fileData.includes(';base64,')) {
      base64Content = fileData.split(';base64,')[1];
    }
    const buffer = Buffer.from(base64Content, 'base64');
    const filePath = path.join(UPLOADS_DIR, `${resourceId}`);
    fs.writeFileSync(filePath, buffer);
    return `/api/files/${resourceId}`;
  } catch (err) {
    console.warn(`Could not write file ${resourceId} to disk:`, err);
    return '';
  }
}

// In-memory store initialized from disk or defaults
let memoryStorage: Record<string, any> = {};

// Initial default resources for instant access
const DEFAULT_INITIAL_RESOURCES = [
  {
    id: 'res_1',
    title: 'Solar String Voltage & Temperature Coefficient Guide (Myanmar Version)',
    description: 'Comprehensive calculation formulas for Voc at -10°C to +45°C with safety buffer rules for Deye, Growatt, and Huawei inverters.',
    category: 'guide',
    fileName: 'Solar_String_Sizing_Engineering_Guide_MM.pdf',
    fileSize: '2.4 MB',
    fileType: 'application/pdf',
    uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    uploadedBy: 'SolarTech Admin',
    isPaidOnly: true,
    downloadsCount: 142
  },
  {
    id: 'res_2',
    title: 'Full Inverter Database CSV (Deye, Huawei, Growatt, Solis, Sungrow, SRNE)',
    description: 'Bulk CSV import data containing 45+ commercial & residential inverters ready for offline and online sizing.',
    category: 'database_csv',
    fileName: 'Myanmar_Solar_Inverters_Database_2026.csv',
    fileSize: '185 KB',
    fileType: 'text/csv',
    uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    uploadedBy: 'SolarTech Admin',
    isPaidOnly: true,
    downloadsCount: 310
  },
  {
    id: 'res_3',
    title: 'N-Type TOPCon & Bifacial Panel Datasheet Specifications Pack',
    description: 'Electrical performance curves, temperature coefficients, and NOCT ratings for Jinko Tiger Neo, Longi Hi-MO, JA Solar, and Trina Vertex.',
    category: 'datasheet',
    fileName: 'TOPCon_Bifacial_Panels_Spec_Pack.pdf',
    fileSize: '4.8 MB',
    fileType: 'application/pdf',
    uploadedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    uploadedBy: 'SolarTech Admin',
    isPaidOnly: true,
    downloadsCount: 98
  },
  {
    id: 'res_4',
    title: 'Standard Hybrid Inverter DC/AC Single Line Wiring Diagram (SLD)',
    description: 'Standard single-line diagram with surge protector (SPD), DC circuit breakers, grounding layout, and string combiner box wiring.',
    category: 'diagram',
    fileName: 'Hybrid_Solar_SLD_Wiring_Schematic.pdf',
    fileSize: '3.1 MB',
    fileType: 'application/pdf',
    uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    uploadedBy: 'SolarTech Admin',
    isPaidOnly: true,
    downloadsCount: 224
  }
];

const DEFAULT_INITIAL_INVERTERS = [
  {
    id: "inv_deye_6k_sg03_lp1",
    brand: "Deye",
    model: "SUN-6K-SG03/04 LP1-EU SM2 (6kW)",
    kw: 6,
    maxDcInputWatt: 7800,
    vmpMin: 125,
    vmpMax: 425,
    nominalVoltage: 370,
    maxDcVoltage: 500,
    mppt: 2,
    stringPerMppt: "1+1",
    imp: "13+13",
    isc: "17+17"
  },
  {
    id: "inv_deye_8k_sg01_lp1",
    brand: "Deye",
    model: "SUN-8K-SG01/05LP1-EU-SM2 (8kW)",
    kw: 8,
    maxDcInputWatt: 10400,
    vmpMin: 125,
    vmpMax: 425,
    nominalVoltage: 370,
    maxDcVoltage: 500,
    mppt: 2,
    stringPerMppt: "2+2",
    imp: "26+26",
    isc: "34+34"
  },
  {
    id: "inv_solis_s6_6k_plus",
    brand: "Solis",
    model: "S6EH1P6K-L-PLUS (6kW)",
    kw: 6,
    maxDcInputWatt: 9600,
    vmpMin: 90,
    vmpMax: 520,
    nominalVoltage: 350,
    maxDcVoltage: 600,
    mppt: 2,
    stringPerMppt: "1+1",
    imp: "16+16",
    isc: "24+24"
  },
  {
    id: "inv_solis_s6_8k_plu",
    brand: "Solis",
    model: "S6-EH1P8K-L-PLU (8kW)",
    kw: 8,
    maxDcInputWatt: 12800,
    vmpMin: 90,
    vmpMax: 520,
    nominalVoltage: 350,
    maxDcVoltage: 600,
    mppt: 2,
    stringPerMppt: "2+2",
    imp: "32+32",
    isc: "48+48"
  },
  {
    id: "inv_deye_12k_sg02_am3",
    brand: "Deye",
    model: "SUN-12K-SG02LP1-EU-AM3 (12kW)",
    kw: 12,
    maxDcInputWatt: 15600,
    vmpMin: 125,
    vmpMax: 425,
    nominalVoltage: 370,
    maxDcVoltage: 500,
    mppt: 3,
    stringPerMppt: "2+2+2",
    imp: "26+26+26",
    isc: "34+34+34"
  },
  {
    id: "inv_deye_6k_og01_am2",
    brand: "Deye",
    model: "SUN-6K-OG01LP1-EU-AM2 (6kW)",
    kw: 6,
    maxDcInputWatt: 7800,
    vmpMin: 120,
    vmpMax: 430,
    nominalVoltage: 360,
    maxDcVoltage: 500,
    mppt: 2,
    stringPerMppt: "1+1",
    imp: "13+13",
    isc: "17+17"
  },
  {
    id: "inv_deye_15k_sg01_am2h",
    brand: "Deye",
    model: "SUN-15K-SG01HP3-EU-AM2(H) (15kW)",
    kw: 15,
    maxDcInputWatt: 19500,
    vmpMin: 150,
    vmpMax: 850,
    nominalVoltage: 600,
    maxDcVoltage: 1000,
    mppt: 2,
    stringPerMppt: "2+1",
    imp: "26+13",
    isc: "34+17"
  },
  {
    id: "inv_deye_25k_sg01_am2h",
    brand: "Deye",
    model: "SUN-25K-SG01HP3-EU-AM2(H) (25kW)",
    kw: 25,
    maxDcInputWatt: 32500,
    vmpMin: 150,
    vmpMax: 850,
    nominalVoltage: 600,
    maxDcVoltage: 1000,
    mppt: 2,
    stringPerMppt: "2+2",
    imp: "26+26",
    isc: "34+34"
  },
  {
    id: "inv_deye_30k_sg02_am3h",
    brand: "Deye",
    model: "SUN-30K-SG02HP3-EU-AM3(H) (30kW)",
    kw: 30,
    maxDcInputWatt: 39000,
    vmpMin: 150,
    vmpMax: 850,
    nominalVoltage: 600,
    maxDcVoltage: 1000,
    mppt: 3,
    stringPerMppt: "2+2+2",
    imp: "30+30+30",
    isc: "40+40+40"
  },
  {
    id: "inv_deye_50k_sg01_bm4h",
    brand: "Deye",
    model: "SUN-50K-SG01HP3-EU-BM4(H) (50kW)",
    kw: 50,
    maxDcInputWatt: 65000,
    vmpMin: 150,
    vmpMax: 850,
    nominalVoltage: 600,
    maxDcVoltage: 1000,
    mppt: 4,
    stringPerMppt: "2+2+2+2",
    imp: "36+36+36+36",
    isc: "54+54+54+54"
  },
  {
    id: "inv_deye_12k_sg04_lp3_l",
    brand: "Deye",
    model: "SUN-12K-SG04LP3(L) (12kW)",
    kw: 12,
    maxDcInputWatt: 15600,
    vmpMin: 200,
    vmpMax: 650,
    nominalVoltage: 550,
    maxDcVoltage: 800,
    mppt: 2,
    stringPerMppt: "2+1",
    imp: "26+13",
    isc: "34+17"
  },
  {
    id: "inv_deye_20k_sg05_lp3_l",
    brand: "Deye",
    model: "SUN-20K-SG05LP3-EU-SM2(L) (20kW)",
    kw: 20,
    maxDcInputWatt: 26000,
    vmpMin: 200,
    vmpMax: 650,
    nominalVoltage: 550,
    maxDcVoltage: 800,
    mppt: 2,
    stringPerMppt: "2+2",
    imp: "26+26",
    isc: "34+34"
  },
  {
    id: "inv_deye_15k_g05_o",
    brand: "Deye",
    model: "SUN-15K-G05(O) (15kW)",
    kw: 15,
    maxDcInputWatt: 19500,
    vmpMin: 200,
    vmpMax: 850,
    nominalVoltage: 600,
    maxDcVoltage: 1000,
    mppt: 2,
    stringPerMppt: "2+2",
    imp: "26+26",
    isc: "34+34"
  },
  {
    id: "inv_goodwe_12k_et_l_g10",
    brand: "Goodwe",
    model: "ET LV, GW12K-ET-L-G10 (12kW)",
    kw: 12,
    maxDcInputWatt: 15600,
    vmpMin: 200,
    vmpMax: 850,
    nominalVoltage: 620,
    maxDcVoltage: 1000,
    mppt: 2,
    stringPerMppt: "2+2",
    imp: "25+25",
    isc: "32+32"
  },
  {
    id: "inv_goodwe_15k_et_l_g10",
    brand: "Goodwe",
    model: "ET LV, GW15K-ET-L-G10 (15kW)",
    kw: 15,
    maxDcInputWatt: 19500,
    vmpMin: 200,
    vmpMax: 850,
    nominalVoltage: 620,
    maxDcVoltage: 1000,
    mppt: 2,
    stringPerMppt: "2+2",
    imp: "25+25",
    isc: "32+32"
  },
  {
    id: "inv_goodwe_20k_et_l_g10",
    brand: "Goodwe",
    model: "ET LV, GW20K-ET-L-G10 (20kW)",
    kw: 20,
    maxDcInputWatt: 26000,
    vmpMin: 200,
    vmpMax: 850,
    nominalVoltage: 620,
    maxDcVoltage: 1000,
    mppt: 2,
    stringPerMppt: "2+2",
    imp: "30+30",
    isc: "38+38"
  },
  {
    id: "inv_goodwe_50k_et_10",
    brand: "Goodwe",
    model: "GW50K-ET-10 (50kW)",
    kw: 50,
    maxDcInputWatt: 65000,
    vmpMin: 200,
    vmpMax: 850,
    nominalVoltage: 620,
    maxDcVoltage: 1000,
    mppt: 4,
    stringPerMppt: "2+2+2+2",
    imp: "30+30+30+30",
    isc: "38+38+38+38"
  }
];

const DEFAULT_INITIAL_PANELS = [
  {
    id: "panel_jinko_615w",
    name: "Jinko 615W",
    watt: 615,
    voc: 55.8,
    vmp: 46.5,
    imp: 13.23,
    isc: 13.98,
    width: 1.134,
    length: 2.465,
    thickness: 35
  },
  {
    id: "panel_jinko_590w",
    name: "Jinko 590W",
    watt: 590,
    voc: 52.2,
    vmp: 44.1,
    imp: 13.37,
    isc: 14.18,
    width: 1.134,
    length: 2.278,
    thickness: 30
  },
  {
    id: "panel_trina_720w",
    name: "Trina 720W",
    watt: 720,
    voc: 47.6,
    vmp: 40.2,
    imp: 17.91,
    isc: 18.83,
    width: 1.303,
    length: 2.384,
    thickness: 33
  },
  {
    id: "panel_trina_710w",
    name: "Trina 710W",
    watt: 710,
    voc: 47.2,
    vmp: 39.8,
    imp: 17.84,
    isc: 18.76,
    width: 1.303,
    length: 2.384,
    thickness: 33
  },
  {
    id: "panel_sharktopsun_610w",
    name: "SharkTopSun 610W",
    watt: 610,
    voc: 52.8,
    vmp: 44.6,
    imp: 13.68,
    isc: 14.45,
    width: 1.134,
    length: 2.382,
    thickness: 30
  }
];

const DEFAULT_INITIAL_PAYMENT_CONFIG = {
  merchantName: "Solar Tech Myanmar",
  merchantPhone: "09 798 123 456",
  amount: 10000,
  currency: "MMK",
  planName: "Solar String Sizer Pro (Lifetime)",
  autoApproveMinutes: 0,
  accounts: [
    {
      id: 'acc_kbzpay_1',
      provider: 'kbzpay',
      payName: 'KBZPay (KPay)',
      accountName: 'U Aung Myo Oo (Solar Tech)',
      accountNumber: '09 798 123 456',
      isActive: true,
      colorTheme: 'blue'
    }
  ]
};

const DEFAULT_INITIAL_ADMIN_CONTACT = {
  viberPhone: "09 403 708 145",
  viberUrl: "viber://chat?number=09403708145",
  telegramUsername: "uniquesolarpro",
  telegramUrl: "https://t.me/uniquesolarpro",
  customAppUrl: "https://solartechse3-cmyk.github.io/uniquesolarsizing",
  noteMy: "Viber သို့မဟုတ် Telegram တွင် ဆက်သွယ်၍ 1 Week, 1 Month, 3 Months PRO License Link ရယူနိုင်ပါသည်",
  noteEn: "Contact via Viber or Telegram to purchase 1 Week, 1 Month, 3 Months PRO License Link"
};

const DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG = {
  enabled: false,
  botToken: "",
  botUsername: "",
  adminChatId: "",
  notifyOnActivation: true,
  notifyOnPayment: true,
  lastTestedAt: ""
};

const DEFAULT_INITIAL_SPEC_REQUESTS = [
  {
    id: 'spec_1',
    senderName: 'U Kyaw Swar (Yangon Solar)',
    senderPhone: '09 795 443 211',
    brand: 'Must Solar',
    model: 'PH18-5248 PRO (5.2kW)',
    category: 'inverter',
    specDetails: 'Max DC Voltage: 450V, MPPT Range: 150V - 430V, Max PV Input: 5500W, Max Current: 18A. Please add to default list.',
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'added',
    adminReply: 'Added to the standard inverter database list. Thank you for the contribution!',
    repliedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'spec_2',
    senderName: 'Ko Min Min',
    senderPhone: '09 450 112 889',
    brand: 'Trina Solar',
    model: 'Vertex S+ 445W (NEG9R.28)',
    category: 'panel',
    specDetails: 'Voc: 52.6V, Vmp: 44.3V, Isc: 10.71A, Imp: 10.05A. TOPCon dual-glass lightweight.',
    submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: 'reviewed',
    adminReply: 'Verified against Trina datasheet. Will be added in next batch.',
    repliedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

function loadStorageFromDisk() {
  let loaded = false;
  // 1. Try reading primary storage file
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memoryStorage = parsed;
        loaded = true;
      }
    }
  } catch (err) {
    console.warn("Could not read app_storage.json, trying backup:", err);
  }

  // 2. If primary failed or was empty, try backup file
  if (!loaded) {
    try {
      if (fs.existsSync(BACKUP_STORAGE_FILE)) {
        const rawBackup = fs.readFileSync(BACKUP_STORAGE_FILE, "utf-8");
        const parsedBackup = JSON.parse(rawBackup);
        if (parsedBackup && typeof parsedBackup === "object") {
          memoryStorage = parsedBackup;
          loaded = true;
        }
      }
    } catch (err) {
      console.warn("Could not read app_storage.backup.json:", err);
    }
  }

  // Ensure default datasets exist only if truly missing so custom user updates are NEVER wiped
  let needsSave = false;
  if (!memoryStorage["admin_contact"]) {
    memoryStorage["admin_contact"] = DEFAULT_INITIAL_ADMIN_CONTACT;
    needsSave = true;
  }
  if (!memoryStorage["licenses"] || !Array.isArray(memoryStorage["licenses"])) {
    memoryStorage["licenses"] = [];
    needsSave = true;
  }
  if (!memoryStorage["resources"] || !Array.isArray(memoryStorage["resources"]) || memoryStorage["resources"].length === 0) {
    memoryStorage["resources"] = DEFAULT_INITIAL_RESOURCES;
    needsSave = true;
  } else {
    // Process existing resources to ensure binary files exist in data/uploads/
    memoryStorage["resources"] = memoryStorage["resources"].map((res: any) => {
      if (res.fileData && res.fileData.length > 50) {
        saveResourceFileToDisk(res.id, res.fileData);
      }
      return {
        ...res,
        fileUrl: `/api/files/${res.id}`
      };
    });
  }
  if (!memoryStorage["inverters"] || !Array.isArray(memoryStorage["inverters"]) || memoryStorage["inverters"].length === 0) {
    memoryStorage["inverters"] = DEFAULT_INITIAL_INVERTERS;
    needsSave = true;
  }
  if (!memoryStorage["panels"] || !Array.isArray(memoryStorage["panels"]) || memoryStorage["panels"].length === 0) {
    memoryStorage["panels"] = DEFAULT_INITIAL_PANELS;
    needsSave = true;
  }
  if (!memoryStorage["payment_config"] || !memoryStorage["payment_config"].accounts || memoryStorage["payment_config"].accounts.length === 0) {
    memoryStorage["payment_config"] = DEFAULT_INITIAL_PAYMENT_CONFIG;
    needsSave = true;
  }
  if (!memoryStorage["payment_records"]) {
    memoryStorage["payment_records"] = [];
    needsSave = true;
  }
  if (!memoryStorage["app_branding"]) {
    memoryStorage["app_branding"] = {
      appName: "SOLAR PRO",
      appSubtitle: "Engineering Suite",
      appVersion: "v2.5",
      logoUrl: ""
    };
    needsSave = true;
  }
  if (!memoryStorage["telegram_bot"]) {
    memoryStorage["telegram_bot"] = DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG;
    needsSave = true;
  }
  if (!memoryStorage["spec_requests"] || !Array.isArray(memoryStorage["spec_requests"]) || memoryStorage["spec_requests"].length === 0) {
    memoryStorage["spec_requests"] = DEFAULT_INITIAL_SPEC_REQUESTS;
    needsSave = true;
  }
  if (!memoryStorage["mounting_database"] || !memoryStorage["mounting_database"].panels || memoryStorage["mounting_database"].panels.length === 0) {
    memoryStorage["mounting_database"] = {
      version: '2026.1',
      lastUpdated: new Date().toISOString(),
      publishedBy: 'SolarTech Engineering Division (Admin)',
      isOnlineLive: true,
      panels: [
        { id: 'panel_longi_585', brand: 'Longi Solar', model: 'Hi-MO 6 Explorer LR5-72HTH-585M', watt: 585, lengthMm: 2278, widthMm: 1134, thicknessMm: 35, weightKg: 27.5, cellType: 'HPBC N-Type Mono', voc: 52.26, vmp: 43.88, imp: 13.34, isc: 14.15, efficiency: 22.6, priceMmk: 285000 },
        { id: 'panel_jinko_585', brand: 'Jinko Solar', model: 'Tiger Neo N-Type JKM585N-72HL4-V', watt: 585, lengthMm: 2278, widthMm: 1134, thicknessMm: 30, weightKg: 28.0, cellType: 'TOPCon Bifacial', voc: 51.90, vmp: 43.80, imp: 13.36, isc: 14.15, efficiency: 22.65, priceMmk: 290000 },
        { id: 'panel_ja_575', brand: 'JA Solar', model: 'DeepBlue 4.0 Pro JAM72D40-575/GB', watt: 575, lengthMm: 2278, widthMm: 1134, thicknessMm: 30, weightKg: 27.8, cellType: 'Bycium+ TOPCon Mono', voc: 51.50, vmp: 43.20, imp: 13.31, isc: 14.02, efficiency: 22.3, priceMmk: 275000 },
        { id: 'panel_trina_580', brand: 'Trina Solar', model: 'Vertex TSM-DEG19RC.20-580W', watt: 580, lengthMm: 2384, widthMm: 1134, thicknessMm: 30, weightKg: 29.5, cellType: '210mm Vertex TOPCon', voc: 45.40, vmp: 38.30, imp: 15.15, isc: 15.98, efficiency: 22.2, priceMmk: 280000 },
        { id: 'panel_canadian_550', brand: 'Canadian Solar', model: 'HiKu6 CS6W-550MS Mono-PERC', watt: 550, lengthMm: 2278, widthMm: 1134, thicknessMm: 35, weightKg: 27.6, cellType: 'Mono-PERC Half-Cell', voc: 49.60, vmp: 41.70, imp: 13.19, isc: 14.00, efficiency: 21.3, priceMmk: 260000 },
        { id: 'panel_trina_670', brand: 'Trina Solar', model: 'Vertex TSM-DEG21C.20 670W Ultra', watt: 670, lengthMm: 2384, widthMm: 1303, thicknessMm: 35, weightKg: 33.7, cellType: '210mm Ultra Bifacial', voc: 45.70, vmp: 38.20, imp: 17.55, isc: 18.62, efficiency: 21.6, priceMmk: 340000 }
      ],
      roofComponents: [
        { id: 'rf_rail_4200', nameMy: 'အလူမီနီယမ် ရထားလမ်းဘား ၄.၂ မီတာ', nameEn: 'Anodized Aluminum Guide Rail (4200mm)', category: 'rail', specs: 'AL6005-T5 Anodized ≥12μm', unit: 'ချောင်း (Bars)', unitPrice: 48000, notes: 'Main rail for roof mounting' },
        { id: 'rf_l_feet_kit', nameMy: 'သွပ်မိုး L-Feet ခြေထောက်တွဲ အစုံ', nameEn: 'Roof L-Feet Bracket Mount Kit', category: 'bracket', specs: 'AL6005-T5 + SUS304 + EPDM Pad', unit: 'စုံ (Sets)', unitPrice: 6500, notes: 'Tin/corrugated roof bracket' },
        { id: 'rf_kliplok_clamp', nameMy: 'ဖောက်ရန်မလိုသော ခေါင်မိုးညှပ် Klip-Lok Clamp', nameEn: 'Non-Penetrative Standing Seam Clamp', category: 'bracket', specs: 'High Tensile Aluminum + SUS304 Grub Screws', unit: 'ခု (Pcs)', unitPrice: 9500, notes: 'Zero penetration commercial seam clamp' },
        { id: 'rf_tile_hook', nameMy: 'ကြွေပြား/အုတ်ကြွပ်မိုး ချိတ်ကောက် SUS304', nameEn: 'Stainless Steel Tile Roof Hook SUS304', category: 'bracket', specs: 'SUS304 Heavy Duty 4.0mm', unit: 'ခု (Pcs)', unitPrice: 12500, notes: 'Under-tile rafter hook' },
        { id: 'rf_mid_clamp', nameMy: 'ဆိုလာပြားကြားညှပ် Mid Clamp (30-35mm)', nameEn: 'Adjustable Solar Mid Clamp Kit', category: 'clamp', specs: 'AL6005-T5 + M8 Bolt + Grounding Clip', unit: 'ခု (Pcs)', unitPrice: 2800, notes: 'Mid-module clamping' },
        { id: 'rf_end_clamp', nameMy: 'ဆိုလာပြားအစွန်းညှပ် End Clamp', nameEn: 'Universal Solar End Clamp (30-35mm)', category: 'clamp', specs: 'AL6005-T5 + SUS304 M8 Bolt', unit: 'ခု (Pcs)', unitPrice: 3200, notes: 'Boundary terminal clamp' },
        { id: 'rf_rail_splice', nameMy: 'ရထားလမ်းဘား ဆက်အံကလစ် Splice Connector', nameEn: 'Internal Rail Splice Joiner (200mm)', category: 'splice', specs: 'AL6005-T5 + Fasteners', unit: 'ခု (Pcs)', unitPrice: 4500, notes: 'Rail extension joint' },
        { id: 'rf_ground_lug', nameMy: 'မြေစိုက်ကြိုးချိတ် Grounding Lug', nameEn: 'Tinned Copper Grounding Lug Kit', category: 'grounding', specs: 'Tinned Copper / Stainless Steel Earthing', unit: 'ခု (Pcs)', unitPrice: 4500, notes: 'Array bonding' }
      ],
      groundComponents: [
        { id: 'gm_rafter_3x1_5', nameMy: 'ဒိုင်းမကြီး (3" × 1 1/2" × 2.5mm Hollow)', nameEn: 'Main Rafter Beam (3" × 1 1/2" Hollow Tube)', category: 'rafter', specs: '76×38×2.5mm HDG Box Tube (≥65μm zinc)', unit: 'ချောင်း (Bars)', unitPrice: 145000, material: 'HDG Steel Q235B', notes: 'Main rafter beam' },
        { id: 'gm_column_4u', nameMy: 'ထောက်တိုင် (4" U-Channel 100×50×5mm)', nameEn: 'Beam Column (4" U-Channel Post)', category: 'column', specs: '100×50×5mm Heavy Duty HDG U-Channel', unit: 'ချောင်း (Posts)', unitPrice: 98000, material: 'HDG U-Steel Q235B', notes: 'Support posts' },
        { id: 'gm_cross_anchor', nameMy: 'ကြက်ခြေခတ် (1 1/2" × 1 1/2" × 2.0mm Hollow)', nameEn: 'Cross-Anchor Bracing (1 1/2" Square Tube)', category: 'cross_anchor', specs: '38×38×2.0mm HDG Square Section Bracing', unit: 'ချောင်း (Bars)', unitPrice: 45000, material: 'HDG Square Tube Q235B', notes: 'Diagonal X-bracing' },
        { id: 'gm_purlin_1_5x1_5', nameMy: 'ဆိုလာတင်တန်း (1 1/2" × 1 1/2" × 2.0mm Hollow)', nameEn: 'Purlin Solar Rails (1 1/2" Square Tube)', category: 'purlin', specs: '38×38×2.0mm HDG Square Box Tube Rails', unit: 'ချောင်း (Bars)', unitPrice: 68000, material: 'HDG Square Tube Q235B', notes: 'Solar mounting rails' },
        { id: 'gm_tie_beam', nameMy: 'အလျားလိုက် ဆက်တန်း (3" × 1 1/2" Hollow)', nameEn: 'Longitudinal Tie Beam (3" × 1 1/2")', category: 'tie_beam', specs: '76×38×2.0mm HDG Box Section', unit: 'ချောင်း (Bars)', unitPrice: 58000, material: 'HDG Steel Q235B', notes: 'Column linking' },
        { id: 'gm_concrete_pier', nameMy: 'ကွန်ကရစ် အုတ်မြစ်တိုင် (400×400×900mm)', nameEn: 'Concrete Pier Footing (400×400×900mm)', category: 'foundation', specs: 'C25/30 Concrete + Rebar + M16 J-Bolts', unit: 'တိုင် (Piers)', unitPrice: 55000, material: 'Concrete & Rebar', notes: 'Pier footing' },
        { id: 'gm_ground_screw', nameMy: 'မြေပြင်စိုက် ဝက်အူတိုင် (1600mm / 76mm Dia)', nameEn: 'Ground Screw Anchor Pile (1600×76mm)', category: 'foundation', specs: 'Q235 HDG Continuous Helical Blades', unit: 'တိုင် (Screws)', unitPrice: 75000, material: 'HDG Steel Pile', notes: 'Rammed pile' },
        { id: 'gm_mid_clamp', nameMy: 'ဆိုလာပြားကြားညှပ် Mid Clamp', nameEn: 'Solar Mid Clamp Kit (Ground Mount)', category: 'clamp', specs: 'Aluminum / HDG Clamp + SUS304 Bolt', unit: 'ခု (Pcs)', unitPrice: 2800, material: 'AL6005-T5 / SUS304', notes: 'Inter-panel clamp' },
        { id: 'gm_end_clamp', nameMy: 'ဆိုလာပြားအစွန်းညှပ် End Clamp', nameEn: 'Solar End Clamp Kit (Ground Mount)', category: 'clamp', specs: 'Heavy Duty Clamp + SUS304 Bolt', unit: 'ခု (Pcs)', unitPrice: 3200, material: 'AL6005-T5 / SUS304', notes: 'Array edge clamp' },
        { id: 'gm_hardware_pack', nameMy: 'တပ်ဆင်ရေး မူလီ၊ နတ်နှင့် ချိတ်ဆက်ပြား အစုံထုပ်', nameEn: 'Structural Fastener & Hardware Pack', category: 'hardware', specs: 'Grade 8.8 HDG M10/M12 Bolts + Gussets', unit: 'ထုပ် (Packs)', unitPrice: 35000, material: 'HDG Grade 8.8 Steel', notes: 'Assembly spares' }
      ]
    };
    needsSave = true;
  }

  // Privacy Protection: Remove any old shared site_surveys and load_calculations from global server storage
  if (memoryStorage["site_surveys"] !== undefined) {
    delete memoryStorage["site_surveys"];
    needsSave = true;
  }
  if (memoryStorage["load_calculations"] !== undefined) {
    delete memoryStorage["load_calculations"];
    needsSave = true;
  }

  if (needsSave) {
    saveStorageToDisk();
  }
}

function saveStorageToDisk() {
  try {
    const dataStr = JSON.stringify(memoryStorage, null, 2);
    // Write primary storage file
    fs.writeFileSync(STORAGE_FILE, dataStr, "utf-8");
    // Also write secondary backup storage file to prevent data loss
    fs.writeFileSync(BACKUP_STORAGE_FILE, dataStr, "utf-8");
  } catch (err) {
    console.warn("Could not write app_storage.json to disk:", err);
  }
}

// Initial disk load
loadStorageFromDisk();

// ----------------------------------------------------
// API ROUTES (Mounted before Vite middleware)
// ----------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Real-time presence heartbeat endpoint
app.post("/api/presence", (req, res) => {
  const { presence } = req.body;
  if (presence && presence.sessionId) {
    const isNew = !activeSessions.has(presence.sessionId);
    activeSessions.set(presence.sessionId, {
      id: presence.id || `pres_${presence.sessionId}`,
      sessionId: presence.sessionId,
      role: presence.role || "user",
      name: presence.name || "Solar User",
      device: presence.device || "Web Browser",
      lastActive: new Date().toISOString(),
      startedAt: presence.startedAt || new Date().toISOString(),
      lastPing: Date.now()
    });
    if (isNew) {
      broadcastPresenceUpdate();
    }
  }
  const list = getActiveSessionsList();
  res.json({ success: true, count: list.length, presences: list });
});

// Real-time presence leave / tab closed endpoint
app.post("/api/presence/leave", (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const sessionId = body?.sessionId;
    if (sessionId && activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
      broadcastPresenceUpdate();
    }
  } catch (e) {}
  res.json({ success: true });
});

// Real-time presence list GET endpoint
app.get("/api/presence", (req, res) => {
  const list = getActiveSessionsList();
  res.json({ success: true, count: list.length, presences: list });
});

// SSE endpoint for live multi-user / multi-device synchronization
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Send initial keep-alive ping
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: Date.now() })}\n\n`);

  // Immediately send current live presence snapshot to the new connected client
  const currentPresences = getActiveSessionsList();
  res.write(`event: message\ndata: ${JSON.stringify({ 
    type: "presence", 
    data: { count: currentPresences.length, presences: currentPresences }, 
    timestamp: Date.now() 
  })}\n\n`);

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// Payment verification endpoint across devices by phone number or transaction digits
app.post("/api/verify-payment", (req, res) => {
  const { query, phone, digits, sessionId } = req.body;
  const records = memoryStorage["payment_records"] || [];

  const matched = records.find((r: any) => {
    if (r.status !== "approved") return false;
    if (query) {
      const q = String(query).trim().replace(/\D/g, "");
      const rPhone = String(r.customerPhone || "").replace(/\D/g, "");
      const rDigits = String(r.transactionDigits || "").trim();
      if (q && (rDigits === q || rPhone.endsWith(q) || q.endsWith(rPhone))) return true;
    }
    if (digits && String(r.transactionDigits).trim() === String(digits).trim()) return true;
    if (phone && r.customerPhone && String(r.customerPhone).replace(/\D/g, "").includes(String(phone).replace(/\D/g, ""))) return true;
    if (sessionId && r.sessionId === sessionId) return true;
    return false;
  });

  if (matched) {
    return res.json({ success: true, approved: true, record: matched });
  }

  return res.json({ success: true, approved: false, message: "No approved payment found matching provided criteria" });
});

// Get all application datasets in a single fast call (Global Shared Data ONLY - site surveys & load calculations are private to each user's device)
app.get("/api/data-all", (req, res) => {
  res.json({
    success: true,
    data: {
      inverters: memoryStorage["inverters"] || null,
      panels: memoryStorage["panels"] || null,
      batteries: memoryStorage["batteries"] || null,
      resources: memoryStorage["resources"] || null,
      spec_requests: memoryStorage["spec_requests"] || null,
      payment_config: memoryStorage["payment_config"] || null,
      payment_records: memoryStorage["payment_records"] || null,
      app_branding: memoryStorage["app_branding"] || null,
      mounting_database: memoryStorage["mounting_database"] || null,
      admin_contact: memoryStorage["admin_contact"] || DEFAULT_INITIAL_ADMIN_CONTACT,
      telegram_bot: memoryStorage["telegram_bot"] || DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG,
      licenses: memoryStorage["licenses"] || [],
    }
  });
});

// ----------------------------------------------------
// LICENSE GENERATOR & MULTI-DEVICE ACTIVATION ENDPOINTS
// ----------------------------------------------------

// Resolves public / shared URL (defaults to user's VPN-free GitHub Pages domain)
function getPublicAppUrl(): string {
  const custom = memoryStorage["app_branding"]?.customAppUrl || memoryStorage["admin_contact"]?.customAppUrl;
  if (custom && typeof custom === 'string' && custom.trim().startsWith('http')) {
    return custom.trim().replace(/\/+$/, '');
  }
  // 100% VPN-free GitHub Pages domain for this repository
  return 'https://solartechse3-cmyk.github.io/uniquesolarsizing';
}

async function autoSyncLicenseToGoogleSheet(lic: any) {
  try {
    const cfg = memoryStorage["sheet_config"];
    if (!cfg || !cfg.webhookUrl) return;

    const appUrl = getPublicAppUrl();
    const row = [
      (memoryStorage["licenses"]?.length || 1),
      new Date(lic.createdAt).toLocaleString('en-US'),
      lic.customerName || 'Valued Engineer',
      lic.duration || '1_month',
      `${lic.deviceLimit || 1} Device(s)`,
      lic.token,
      `${appUrl}/?license=${lic.token}`,
      lic.status || 'active',
      new Date(lic.expiresAt).toLocaleDateString('en-US'),
      Array.isArray(lic.boundDevices) ? lic.boundDevices.length : 0,
      new Date().toLocaleDateString('en-US'),
      lic.note || ''
    ];

    await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_licenses',
        sheetName: 'PRO Licenses',
        rows: [row]
      }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (err) {
    // Non-blocking background sync
  }
}

// Helper to generate a new PRO License Record (used by Web UI, API, and Telegram Bot)
function generateLicenseRecord(customerName: string, duration?: string, deviceLimit: number = 1, note?: string) {
  const d = duration || '1_month';
  let days = 30;
  if (d === '1_week') days = 7;
  else if (d === '1_month') days = 30;
  else if (d === '3_months') days = 90;
  else if (d === '6_months') days = 180;
  else if (d === '1_year') days = 365;
  else if (d === 'lifetime') days = 3650;

  const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const durCode = d === '1_week' ? '1W' : d === '1_month' ? '1M' : d === '3_months' ? '3M' : d === '6_months' ? '6M' : d === '1_year' ? '1Y' : 'LIFE';
  const devCode = deviceLimit === 2 ? '2D' : '1D';
  const token = `SOLAR-PRO-${durCode}-${devCode}-${rand1}-${rand2}`;

  const now = new Date();
  const expires = new Date(now.getTime() + days * 86400000);

  const newLicense = {
    id: `lic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    token,
    customerName: (customerName || '').trim() || 'Engineer Customer',
    duration: d,
    durationDays: days,
    deviceLimit: deviceLimit === 2 ? 2 : 1,
    boundDevices: [],
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: 'active',
    note: (note || '').trim()
  };

  const list = memoryStorage["licenses"] || [];
  memoryStorage["licenses"] = [newLicense, ...list];
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);

  // Auto-sync to Google Sheet in background if webhook is configured
  autoSyncLicenseToGoogleSheet(newLicense).catch(() => {});

  return newLicense;
}

// Generate License Link
app.post("/api/license/generate", (req, res) => {
  try {
    const { customerName, duration, deviceLimit, note } = req.body;
    const newLicense = generateLicenseRecord(customerName, duration, deviceLimit, note);
    return res.json({ success: true, license: newLicense });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to generate license' });
  }
});

// Activate License on Device
app.post("/api/license/activate", (req, res) => {
  try {
    const { token, deviceId, deviceModel } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const cleanedToken = String(token).trim().toUpperCase();
    const list = memoryStorage["licenses"] || [];
    const licIndex = list.findIndex((l: any) => 
      l.token.toUpperCase() === cleanedToken || 
      l.id === cleanedToken ||
      cleanedToken.includes(l.token.toUpperCase())
    );

    if (licIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'not_found', 
        message: 'လိုင်စင်ကုဒ် မှားယွင်းနေပါသည်။ Viber သို့မဟုတ် Telegram တွင် Admin အား ဆက်သွယ်ပါ (Invalid License Key)' 
      });
    }

    const lic = list[licIndex];
    if (lic.status === 'revoked') {
      return res.status(403).json({ 
        success: false, 
        error: 'revoked', 
        message: 'ဤလိုင်စင်ကို Admin မှ ပိတ်ထားပါသည် (License Revoked)' 
      });
    }

    const now = Date.now();
    if (new Date(lic.expiresAt).getTime() < now) {
      lic.status = 'expired';
      saveStorageToDisk();
      broadcastSSE("licenses", memoryStorage["licenses"]);
      return res.status(403).json({ 
        success: false, 
        error: 'expired', 
        message: 'ဤလိုင်စင် သက်တမ်းကုန်ဆုံးသွားပါပြီ။ သက်တမ်းတိုးရန် Admin အား ဆက်သွယ်ပါ (License Expired)' 
      });
    }

    const safeDeviceId = deviceId || `dev_${Math.random().toString(36).substring(2, 8)}`;
    const safeDeviceModel = deviceModel || 'Web Browser';
    const bound = Array.isArray(lic.boundDevices) ? lic.boundDevices : [];

    const existingDevice = bound.find((b: any) => b.deviceId === safeDeviceId);
    if (existingDevice) {
      existingDevice.lastSeenAt = new Date().toISOString();
      existingDevice.deviceModel = safeDeviceModel;
      saveStorageToDisk();
      broadcastSSE("licenses", memoryStorage["licenses"]);
      return res.json({ success: true, license: lic, alreadyBound: true });
    }

    // Check device limit (1 or 2)
    if (bound.length >= lic.deviceLimit) {
      return res.status(400).json({
        success: false,
        error: 'device_limit_exceeded',
        message: `ခွင့်ပြုထားသည့် စက်အရေအတွက် (${lic.deviceLimit} လုံး) ပြည့်သွားပါပြီ။ အခြားစက်တွင် အသုံးပြုလိုပါက Admin ထံ ဆက်သွယ်ပါ။`,
        deviceLimit: lic.deviceLimit,
        boundCount: bound.length
      });
    }

    // Bind new device
    bound.push({
      deviceId: safeDeviceId,
      deviceModel: safeDeviceModel,
      activatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    });
    lic.boundDevices = bound;
    saveStorageToDisk();
    broadcastSSE("licenses", memoryStorage["licenses"]);

    // Notify Admin via Telegram Bot if enabled
    try {
      const tgCfg = memoryStorage["telegram_bot"];
      if (tgCfg && tgCfg.enabled && tgCfg.botToken && tgCfg.adminChatId && tgCfg.notifyOnActivation) {
        const boundCount = bound.length;
        const devLimit = lic.deviceLimit || 1;
        const expireStr = new Date(lic.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const text = `🔔 *PRO License Activated on Buyer Device!*
👤 *Customer:* ${lic.customerName || 'N/A'}
📱 *Device:* ${safeDeviceModel}
🆔 *Device ID:* \`${safeDeviceId}\`
🔑 *License Key:* \`${lic.token}\`
⏳ *Expires At:* ${expireStr}
📊 *Devices Activated:* ${boundCount}/${devLimit}`;
        sendTelegramMessage(tgCfg.botToken, tgCfg.adminChatId, text).catch(() => {});
      }
    } catch (e) {}

    return res.json({ success: true, license: lic, newDeviceBound: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Activation failed' });
  }
});

// Unbind device(s)
app.post("/api/license/unbind-device", (req, res) => {
  const { licenseId, deviceId } = req.body;
  const list = memoryStorage["licenses"] || [];
  const lic = list.find((l: any) => l.id === licenseId || l.token === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });

  if (!deviceId || deviceId === 'all') {
    lic.boundDevices = [];
  } else {
    lic.boundDevices = (lic.boundDevices || []).filter((d: any) => d.deviceId !== deviceId);
  }

  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  res.json({ success: true, license: lic });
});

// Extend license
app.post("/api/license/extend", (req, res) => {
  const { licenseId, days } = req.body;
  const list = memoryStorage["licenses"] || [];
  const lic = list.find((l: any) => l.id === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });

  const addDays = parseInt(days, 10) || 30;
  const currentExp = new Date(lic.expiresAt).getTime();
  const baseTime = currentExp > Date.now() ? currentExp : Date.now();
  lic.expiresAt = new Date(baseTime + addDays * 86400000).toISOString();
  lic.status = 'active';

  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  res.json({ success: true, license: lic });
});

// Change license status
app.post("/api/license/status", (req, res) => {
  const { licenseId, status } = req.body;
  const list = memoryStorage["licenses"] || [];
  const lic = list.find((l: any) => l.id === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });

  lic.status = status;
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  res.json({ success: true, license: lic });
});

// Delete license
app.delete("/api/license/:id", (req, res) => {
  const id = req.params.id;
  const list = memoryStorage["licenses"] || [];
  memoryStorage["licenses"] = list.filter((l: any) => l.id !== id && l.token !== id);
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  res.json({ success: true });
});

// Get all licenses
app.get("/api/licenses", (req, res) => {
  res.json({ success: true, licenses: memoryStorage["licenses"] || [] });
});

// Admin Contact GET & POST
app.get("/api/admin-contact", (req, res) => {
  res.json({ success: true, contact: memoryStorage["admin_contact"] || DEFAULT_INITIAL_ADMIN_CONTACT });
});

app.post("/api/admin-contact", (req, res) => {
  const contact = req.body.contact || req.body;
  memoryStorage["admin_contact"] = {
    ...DEFAULT_INITIAL_ADMIN_CONTACT,
    ...contact
  };
  saveStorageToDisk();
  broadcastSSE("admin_contact", memoryStorage["admin_contact"]);
  res.json({ success: true, contact: memoryStorage["admin_contact"] });
});

// ----------------------------------------------------
// TELEGRAM BOT (BOTFATHER) & PRO LICENSE GENERATOR
// ----------------------------------------------------

async function sendTelegramChatAction(token: string, chatId: string, action: string = 'typing') {
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
      signal: AbortSignal.timeout(3000)
    });
  } catch (e) {}
}

async function sendTelegramMessage(token: string, chatId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  if (!token || !chatId) return { ok: false, description: 'Missing token or chatId' };
  try {
    const payload: any = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    };
    if (parseMode) payload.parse_mode = parseMode;

    let res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    let data: any = await res.json();

    // If parse error occurred with HTML or Markdown, automatically fallback to plain text so message is ALWAYS delivered!
    if (!data.ok && parseMode) {
      console.warn("Telegram sendMessage format error, retrying without formatting:", data.description);
      delete payload.parse_mode;
      res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
      });
      data = await res.json();
    }
    return data;
  } catch (err: any) {
    console.error('Failed to send Telegram message:', err?.message);
    return { ok: false, description: err?.message };
  }
}

async function sendTelegramDocument(token: string, chatId: string, filename: string, content: string, caption?: string) {
  if (!token || !chatId) return false;
  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    formData.append('document', blob, filename);
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000)
    });
    const data: any = await res.json();
    return !!data.ok;
  } catch (err) {
    console.warn('sendTelegramDocument failed:', err);
    return false;
  }
}

function generateLicensesCSV(licenses: any[], appUrl: string): string {
  const headers = [
    "No",
    "Customer Name",
    "Duration",
    "Device Limit",
    "License Key",
    "Status",
    "Created Date",
    "Expires Date",
    "Active Bound Devices",
    "Direct Activation Link",
    "Note"
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = licenses.map((lic: any, idx: number) => {
    const boundDevicesStr = Array.isArray(lic.boundDevices) 
      ? lic.boundDevices.map((d: any) => d.deviceModel || d.deviceId || 'Device').join('; ')
      : '';
    const activationLink = `${appUrl}/?license=${lic.token}`;

    return [
      idx + 1,
      escapeCSV(lic.customerName || 'Valued Customer'),
      escapeCSV(lic.duration || '1_month'),
      escapeCSV(lic.deviceLimit || 1),
      escapeCSV(lic.token),
      escapeCSV(lic.status || 'active'),
      escapeCSV(new Date(lic.createdAt).toLocaleString('en-US')),
      escapeCSV(new Date(lic.expiresAt).toLocaleDateString('en-US')),
      escapeCSV(boundDevicesStr),
      escapeCSV(activationLink),
      escapeCSV(lic.note || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

let telegramPollingTimeout: NodeJS.Timeout | null = null;
let isTelegramPolling = false;
let isPollingFetchInProgress = false;
let pollingAbortController: AbortController | null = null;
const processedUpdateIds = new Set<number>();
const recentCommandCache = new Map<string, { time: number; license: any }>();

function stopTelegramPolling() {
  if (telegramPollingTimeout) {
    clearTimeout(telegramPollingTimeout);
    telegramPollingTimeout = null;
  }
  isTelegramPolling = false;
  if (pollingAbortController) {
    try { pollingAbortController.abort(); } catch (e) {}
    pollingAbortController = null;
  }
}

function startTelegramPolling() {
  stopTelegramPolling();
  const cfg = memoryStorage["telegram_bot"];
  if (!cfg || !cfg.enabled || !cfg.botToken) {
    return;
  }

  isTelegramPolling = true;
  pollTelegramUpdates();
}

async function pollTelegramUpdates() {
  if (!isTelegramPolling) return;
  if (isPollingFetchInProgress) return; // Mutex: prevent duplicate concurrent polling cycles

  const cfg = memoryStorage["telegram_bot"];
  if (!cfg || !cfg.enabled || !cfg.botToken) {
    isTelegramPolling = false;
    return;
  }

  isPollingFetchInProgress = true;
  let receivedUpdatesCount = 0;

  try {
    let lastTelegramUpdateId = Number(cfg.lastUpdateId || 0);
    pollingAbortController = new AbortController();

    const url = `https://api.telegram.org/bot${cfg.botToken}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=8`;
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(12000) 
    });
    const data: any = await res.json();

    if (data && data.ok && Array.isArray(data.result)) {
      receivedUpdatesCount = data.result.length;
      for (const update of data.result) {
        if (!update || !update.update_id) continue;

        // Always track highest update ID so Telegram acknowledges it
        if (update.update_id > lastTelegramUpdateId) {
          lastTelegramUpdateId = update.update_id;
          cfg.lastUpdateId = lastTelegramUpdateId;
          memoryStorage["telegram_bot"] = cfg;
        }

        // Deduplication: if update_id was already handled, skip
        if (processedUpdateIds.has(update.update_id)) {
          continue;
        }
        processedUpdateIds.add(update.update_id);
        if (processedUpdateIds.size > 2000) {
          const first = processedUpdateIds.values().next().value;
          if (first !== undefined) processedUpdateIds.delete(first);
        }

        if (update.message && update.message.text) {
          // Immediately send typing status to Telegram so user gets instant feedback
          sendTelegramChatAction(cfg.botToken, String(update.message.chat.id), 'typing').catch(() => {});
          await handleTelegramIncomingMessage(cfg, update.message);
        }
      }

      // Persist acknowledged lastUpdateId to disk
      if (receivedUpdatesCount > 0) {
        saveStorageToDisk();
      }
    }
  } catch (err: any) {
    // Network or timeout, safely continue
  } finally {
    isPollingFetchInProgress = false;
    pollingAbortController = null;
  }

  if (isTelegramPolling) {
    // If messages were received, poll next batch almost immediately (50ms); else wait 500ms
    const nextDelay = receivedUpdatesCount > 0 ? 50 : 500;
    telegramPollingTimeout = setTimeout(pollTelegramUpdates, nextDelay);
  }
}

async function handleTelegramIncomingMessage(cfg: any, msg: any) {
  const chatId = String(msg.chat.id);
  const rawText = (msg.text || '').trim();
  const fromName = msg.from ? `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() : 'User';

  if (!rawText) return;

  // Auto-bind adminChatId if not set yet so the user NEVER gets blocked
  if (!cfg.adminChatId) {
    cfg.adminChatId = chatId;
    memoryStorage["telegram_bot"] = { ...cfg, adminChatId: chatId };
    saveStorageToDisk();
    broadcastSSE("telegram_bot", memoryStorage["telegram_bot"]);
  }

  // Security check: Only allow adminChatId if configured
  if (cfg.adminChatId && chatId !== String(cfg.adminChatId)) {
    await sendTelegramMessage(
      cfg.botToken, 
      chatId, 
      `⛔️ <b>ခွင့်ပြုချက်မရှိပါ။</b> ဤ Bot သည် Solar Pro Admin သီးသန့်အသုံးပြုရန် ဖြစ်ပါသည် (Unauthorized).\nသင့် Telegram Chat ID: <code>${chatId}</code>`,
      'HTML'
    );
    return;
  }

  const parts = rawText.split(/\s+/);
  const rawCmd = (parts[0] || '').toLowerCase();
  const cmd = rawCmd.split('@')[0]; // handles /gen@UniqueSolarProLicenseBot

  if (cmd === '/start' || cmd === '/help') {
    const helpMsg = `☀️ <b>UNIQUE SOLAR PRO - LICENSE BOT</b> ⚡️
မင်္ဂလာပါ <b>${fromName}</b>!
ဤ Bot မှတစ်ဆင့် ဝယ်ယူသူများအတွက် PRO License Key နှင့် One-Click Activation Link များကို ချက်ချင်း ထုတ်ယူနိုင်ပါသည်:

📌 <b>အသုံးပြုနိုင်သော Command များ:</b>
1️⃣ <b>လိုင်စင်ထုတ်ရန်:</b>
<code>/gen &lt;နာမည်&gt; &lt;သက်တမ်း&gt; [စက်အရေအတွက်]</code>
ဥပမာများ:
• <code>/gen KoAung 1m 1</code>
• <code>/gen DawHla 3m 2</code>
• <code>/gen 09798111222 1y 1</code>
• <code>/gen Engineer_U_Kyaw life 2</code>

⏳ <b>သက်တမ်း အတိုကောက်များ:</b>
• <code>1w</code> = 1 Week (၇ ရက်)
• <code>1m</code> = 1 Month (ရက် ၃၀)
• <code>3m</code> = 3 Months (ရက် ၉၀)
• <code>6m</code> = 6 Months (၁၈၀ ရက်)
• <code>1y</code> = 1 Year (၃၆၅ ရက်)
• <code>life</code> = Lifetime (၁၀ နှစ်)

2️⃣ <b>ထုတ်ပြီးသား လိုင်စင်များ ကြည့်ရန် & ဒေါင်းလုဒ် ရယူရန်:</b>
• <code>/licenses</code> - နောက်ဆုံး ထုတ်ထားသော စာရင်းများ
• <code>/csv</code> သို့မဟုတ် <code>/export</code> - စာရင်းအားလုံးကို Excel / CSV ဖိုင်ဖြင့် ဒေါင်းလုဒ် ရယူရန်

3️⃣ <b>အခြေအနေ ကြည့်ရန်:</b>
<code>/stats</code> - စုစုပေါင်း လိုင်စင်နှင့် စက်အရေအတွက်

4️⃣ <b>Chat ID ကြည့်ရန်:</b>
<code>/id</code> - သင့် Telegram Chat ID: <code>${chatId}</code>`;
    await sendTelegramMessage(cfg.botToken, chatId, helpMsg, 'HTML');
    return;
  }

  if (cmd === '/id') {
    await sendTelegramMessage(cfg.botToken, chatId, `🆔 သင့် Telegram Chat ID သည်: <code>${chatId}</code> ဖြစ်ပါသည်။`, 'HTML');
    return;
  }

  if (cmd === '/export' || cmd === '/csv' || cmd === '/download') {
    await sendTelegramChatAction(cfg.botToken, chatId, 'upload_document');
    const list = memoryStorage["licenses"] || [];
    if (list.length === 0) {
      await sendTelegramMessage(cfg.botToken, chatId, `📝 ထုတ်ထားသော လိုင်စင် မှတ်တမ်း မရှိသေးပါခင်ဗျာ။ <code>/gen</code> ဖြင့် စတင်ထုတ်နိုင်ပါသည်။`, 'HTML');
      return;
    }

    const appUrl = getPublicAppUrl();
    const csvContent = generateLicensesCSV(list, appUrl);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Unique_Solar_Pro_Licenses_${dateStr}.csv`;

    const active = list.filter((l: any) => l.status === 'active').length;
    let boundTotal = 0;
    list.forEach((l: any) => {
      if (Array.isArray(l.boundDevices)) boundTotal += l.boundDevices.length;
    });

    const caption = `📁 <b>PRO LICENSE DATABASE EXPORT (.CSV)</b>\n━━━━━━━━━━━━━━━━━\n🔑 စုစုပေါင်း: <b>${list.length}</b> ခု\n🟢 Active: <b>${active}</b> ခု\n📱 ချိတ်ဆက်စက်: <b>${boundTotal}</b> လုံး\n\n💡 ဤ CSV ဖိုင်အား Excel သို့မဟုတ် Google Sheets တွင် တိုက်ရိုက်ဖွင့်၍ ဖုန်း သို့မဟုတ် ကွန်ပျူတာတွင် အလွယ်တကူ သိမ်းဆည်း ကြည့်ရှုနိုင်ပါသည်!`;

    const sent = await sendTelegramDocument(cfg.botToken, chatId, filename, csvContent, caption);
    if (!sent) {
      await sendTelegramMessage(cfg.botToken, chatId, `⚠️ CSV Document ပေးပို့ရာတွင် အခက်အခဲရှိပါက <code>/licenses</code> ဖြင့် စာရင်း ကြည့်ရှုနိုင်ပါသည်။`, 'HTML');
    }
    return;
  }

  if (cmd === '/gen' || cmd === '/generate') {
    if (parts.length < 3) {
      await sendTelegramMessage(cfg.botToken, chatId, `⚠️ <b>အသုံးပြုပုံ မှားယွင်းနေပါသည်!</b>
အောက်ပါ ပုံစံအတိုင်း ရိုက်ထည့်ပေးပါ:
<code>/gen &lt;နာမည်&gt; &lt;သက်တမ်း&gt; [စက်အရေအတွက်]</code>
ဥပမာ: <code>/gen KoAung 1m 1</code> သို့မဟုတ် <code>/gen DawMya 3m 2</code>`, 'HTML');
      return;
    }

    const customerName = parts[1];
    const durRaw = parts[2].toLowerCase();
    const devLimitRaw = parts[3] ? parseInt(parts[3], 10) : 1;
    const deviceLimit = devLimitRaw === 2 ? 2 : 1;

    let duration = '1_month';
    if (durRaw === '1w' || durRaw === '1week') duration = '1_week';
    else if (durRaw === '1m' || durRaw === '1month') duration = '1_month';
    else if (durRaw === '3m' || durRaw === '3months') duration = '3_months';
    else if (durRaw === '6m' || durRaw === '6months') duration = '6_months';
    else if (durRaw === '1y' || durRaw === '1year') duration = '1_year';
    else if (durRaw === 'life' || durRaw === 'lifetime') duration = 'lifetime';

    // DEDUPLICATION: Prevent duplicate keys if user sent multiple times within 20s
    const dedupKey = `${chatId}_${customerName.toLowerCase()}_${duration}_${deviceLimit}`;
    const recent = recentCommandCache.get(dedupKey);
    let newLic: any;
    let isDuplicate = false;

    if (recent && (Date.now() - recent.time < 20000)) {
      newLic = recent.license;
      isDuplicate = true;
    } else {
      newLic = generateLicenseRecord(customerName, duration, deviceLimit, `Generated via Telegram Bot (@${msg.from?.username || fromName})`);
      recentCommandCache.set(dedupKey, { time: Date.now(), license: newLic });
      if (recentCommandCache.size > 200) {
        const oldest = recentCommandCache.keys().next().value;
        if (oldest) recentCommandCache.delete(oldest);
      }
    }

    const appUrl = getPublicAppUrl();
    const activationLink = `${appUrl}/?license=${newLic.token}`;

    const durLabel = duration === '1_week' ? '1 Week (7 Days)' : duration === '1_month' ? '1 Month (30 Days)' : duration === '3_months' ? '3 Months (90 Days)' : duration === '6_months' ? '6 Months (180 Days)' : duration === '1_year' ? '1 Year (365 Days)' : 'Lifetime (10 Years)';

    const dupNotice = isDuplicate ? '⚠️ <i>(လွန်ခဲ့သော စက္ကန့်ပိုင်းက ထုတ်ထားပြီးဖြစ်သော လိုင်စင်အား ပြန်လည်ပြသပေးထားပါသည် - Duplicate Prevented)</i>\n\n' : '';

    const replyMsg = `${dupNotice}🎉 <b>PRO LICENSE ထုတ်လုပ်ပြီးပါပြီ!</b> ⚡️
━━━━━━━━━━━━━━━━━
👤 <b>ဝယ်ယူသူ:</b> ${customerName}
⏳ <b>သက်တမ်း:</b> ${durLabel}
📱 <b>ခွင့်ပြုစက်:</b> ${newLic.deviceLimit} Device(s)

🌐 <b>VPN မလိုဘဲ တိုက်ရိုက်ဖွင့်ရန် (One-Click Link):</b>
${activationLink}

🔑 <b>License Key:</b>
<code>${newLic.token}</code>
<i>👉 အကယ်၍ Link မဖွင့်ချင်ပါက App ၏ "Enter License Key" တွင် ဤ Key ကို ကူးထည့်ရုံဖြင့်လည်း VPN မလိုဘဲ Activate ဖြစ်ပါသည်!</i>
━━━━━━━━━━━━━━━━━
<i>(ဝယ်ယူသူထံ ဤစာတိုကို တိုက်ရိုက် Forward ပို့ပေးလိုက်ရုံဖြင့် အလွယ်တကူ Activate ပြုလုပ်နိုင်ပါသည်)</i>`;

    await sendTelegramMessage(cfg.botToken, chatId, replyMsg, 'HTML');
    return;
  }

  if (cmd === '/licenses') {
    const list = memoryStorage["licenses"] || [];
    if (list.length === 0) {
      await sendTelegramMessage(cfg.botToken, chatId, `📝 ထုတ်ထားသော လိုင်စင် မရှိသေးပါခင်ဗျာ။ <code>/gen</code> ဖြင့် စတင်ထုတ်နိုင်ပါသည်။`, 'HTML');
      return;
    }
    const recent = list.slice(0, 10);
    let reply = `📋 <b>နောက်ဆုံး ထုတ်လုပ်ထားသော လိုင်စင်များ (စုစုပေါင်း ${list.length} ခု အနက် ${recent.length} ခု):</b>\n━━━━━━━━━━━━━━━━━\n`;
    recent.forEach((lic: any, idx: number) => {
      const boundCount = lic.boundDevices ? lic.boundDevices.length : 0;
      const statusIcon = lic.status === 'active' ? (boundCount > 0 ? '🟢' : '🟡') : '🔴';
      reply += `${idx + 1}. ${statusIcon} <b>${lic.customerName}</b> (${lic.duration})\n   🔑 <code>${lic.token}</code>\n   📱 Active: ${boundCount}/${lic.deviceLimit} Devices\n\n`;
    });
    reply += `━━━━━━━━━━━━━━━━━\n💾 <b>စာရင်းအားလုံးကို Excel / CSV ဖိုင်ဖြင့် ဒေါင်းလုဒ် ရယူရန်:</b>\n<code>/csv</code> သို့မဟုတ် <code>/export</code> ဟု ရိုက်ပို့နိုင်ပါသည်ခင်ဗျာ!`;
    await sendTelegramMessage(cfg.botToken, chatId, reply, 'HTML');
    return;
  }

  if (cmd === '/stats') {
    const list = memoryStorage["licenses"] || [];
    const active = list.filter((l: any) => l.status === 'active').length;
    let boundTotal = 0;
    list.forEach((l: any) => {
      if (Array.isArray(l.boundDevices)) boundTotal += l.boundDevices.length;
    });
    const statsMsg = `📊 <b>SYSTEM LICENSE STATISTICS</b>
━━━━━━━━━━━━━━━━━
🔑 Total Licenses: <b>${list.length}</b>
🟢 Active Licenses: <b>${active}</b>
📱 Total Bound Devices: <b>${boundTotal}</b>
👥 Active User Sessions: <b>${sseClients.size}</b>
💾 Server Uptime: Online`;
    await sendTelegramMessage(cfg.botToken, chatId, statsMsg, 'HTML');
    return;
  }

  // Fallback help
  await sendTelegramMessage(
    cfg.botToken, 
    chatId, 
    `💡 လိုင်စင်ထုတ်ယူရန် <code>/gen &lt;နာမည်&gt; &lt;သက်တမ်း&gt; [စက်အရေအတွက်]</code> ဟု ရိုက်ပို့ပါခင်ဗျာ။\nဥပမာ: <code>/gen KoAung 1m 1</code>\nအသုံးပြုပုံ အပြည့်အစုံ ကြည့်ရန် <code>/help</code> ဟု ပို့ပေးပါ။`,
    'HTML'
  );
}

// Telegram Config GET & POST
app.get("/api/telegram/config", (req, res) => {
  res.json({
    success: true,
    config: memoryStorage["telegram_bot"] || DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG
  });
});

app.post("/api/telegram/config", (req, res) => {
  const newConfig = {
    ...DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG,
    ...(memoryStorage["telegram_bot"] || {}),
    ...(req.body.config || req.body)
  };
  memoryStorage["telegram_bot"] = newConfig;
  saveStorageToDisk();
  broadcastSSE("telegram_bot", newConfig);

  // Restart polling with new config
  startTelegramPolling();

  res.json({ success: true, config: newConfig });
});

// Telegram Test Ping
app.post("/api/telegram/test", async (req, res) => {
  try {
    const { botToken, adminChatId } = req.body;
    const token = botToken || memoryStorage["telegram_bot"]?.botToken;
    const chatId = adminChatId || memoryStorage["telegram_bot"]?.adminChatId;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Telegram Bot Token ထည့်သွင်းပေးပါခင်ဗျာ' });
    }

    // 1. Check getMe
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData: any = await meRes.json();
    if (!meData.ok) {
      return res.status(400).json({ success: false, error: `Bot Token မှားယွင်းနေပါသည်: ${meData.description}` });
    }

    const botUsername = meData.result?.username;
    if (chatId) {
      // 2. Send test message
      const sendRes = await sendTelegramMessage(
        token, 
        chatId, 
        `✅ <b>UNIQUE SOLAR PRO - Connection Success!</b> ⚡️\nBot: @${botUsername}\nStatus: Online & Ready to generate license links!`,
        'HTML'
      );
      if (!sendRes.ok) {
        return res.status(400).json({
          success: false,
          botUsername,
          error: `Bot Token မှန်ကန်သော်လည်း Chat ID သို့ စာပို့မရပါ: ${sendRes.description}. Bot ထံ ဦးစွာ /start ပေးပို့ပေးပါခင်ဗျာ။`
        });
      }
    }

    // Auto-save and activate polling immediately upon test success!
    const updatedCfg = {
      ...DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG,
      ...(memoryStorage["telegram_bot"] || {}),
      enabled: true,
      botToken: token,
      botUsername: botUsername || '',
      adminChatId: chatId ? String(chatId) : (memoryStorage["telegram_bot"]?.adminChatId || ''),
      lastTestedAt: new Date().toISOString()
    };
    memoryStorage["telegram_bot"] = updatedCfg;
    saveStorageToDisk();
    broadcastSSE("telegram_bot", updatedCfg);
    startTelegramPolling();

    return res.json({
      success: true,
      botUsername,
      config: updatedCfg,
      message: chatId 
        ? `Bot @${botUsername} သို့ ချိတ်ဆက်မှု အောင်မြင်ပြီး Chat ID: ${chatId} သို့ စာတို ပို့ဆောင်ပြီးပါပြီ!`
        : `Bot @${botUsername} အတည်ပြုပြီးပါပြီ!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Telegram test failed' });
  }
});

// Telegram Webhook Handler (if user sets Telegram webhook)
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    const cfg = memoryStorage["telegram_bot"];
    if (cfg && cfg.enabled && req.body && req.body.message) {
      await handleTelegramIncomingMessage(cfg, req.body.message);
    }
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
});

// Google Sheet Config GET & POST
app.get("/api/sheet-config", (req, res) => {
  res.json({
    success: true,
    config: memoryStorage["sheet_config"] || { webhookUrl: "", spreadsheetUrl: "", spreadsheetName: "Solar Pro - Customer Payment Records", autoSyncOnApproval: true }
  });
});

app.post("/api/sheet-config", (req, res) => {
  const cfg = {
    webhookUrl: req.body.webhookUrl || '',
    spreadsheetUrl: req.body.spreadsheetUrl || '',
    spreadsheetName: req.body.spreadsheetName || 'Solar Pro - Customer Payment Records',
    autoSyncOnApproval: req.body.autoSyncOnApproval !== false
  };
  memoryStorage["sheet_config"] = cfg;
  saveStorageToDisk();
  res.json({ success: true, config: cfg });
});

// Supabase Cloud Configuration GET & POST
app.get("/api/supabase-config", (req, res) => {
  const cfg = memoryStorage["supabase_config"] || {
    url: process.env.VITE_SUPABASE_URL || "",
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || "",
    isConnected: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)
  };
  res.json({ success: true, config: cfg });
});

app.post("/api/supabase-config", (req, res) => {
  const { url, anonKey } = req.body;
  const cfg = {
    url: (url || "").trim(),
    anonKey: (anonKey || "").trim(),
    isConnected: Boolean((url || "").trim() && (anonKey || "").trim())
  };
  memoryStorage["supabase_config"] = cfg;
  saveStorageToDisk();

  // Also update .env file if it exists so builds inherit it
  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
    if (envContent.includes("VITE_SUPABASE_URL=")) {
      envContent = envContent.replace(/VITE_SUPABASE_URL=.*/, `VITE_SUPABASE_URL=${cfg.url}`);
    } else {
      envContent += `\nVITE_SUPABASE_URL=${cfg.url}`;
    }
    if (envContent.includes("VITE_SUPABASE_ANON_KEY=")) {
      envContent = envContent.replace(/VITE_SUPABASE_ANON_KEY=.*/, `VITE_SUPABASE_ANON_KEY=${cfg.anonKey}`);
    } else {
      envContent += `\nVITE_SUPABASE_ANON_KEY=${cfg.anonKey}`;
    }
    fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");
  } catch (e) {}

  res.json({ success: true, config: cfg });
});

// Publish Live System Update to All Active Users
app.post("/api/publish-update", (req, res) => {
  const { note } = req.body;
  const publishPayload = {
    publishedAt: new Date().toISOString(),
    inverters: memoryStorage["inverters"],
    panels: memoryStorage["panels"],
    batteries: memoryStorage["batteries"],
    resources: memoryStorage["resources"],
    mounting_database: memoryStorage["mounting_database"],
    admin_contact: memoryStorage["admin_contact"] || DEFAULT_INITIAL_ADMIN_CONTACT,
    app_branding: memoryStorage["app_branding"],
    note: note || "Admin published live update"
  };

  broadcastSSE("system_published", publishPayload);
  res.json({ success: true, publishedAt: publishPayload.publishedAt });
});

// Specific key GET endpoint
app.get("/api/data/:key", (req, res) => {
  const key = req.params.key;
  if (key === 'site_surveys' || key === 'load_calculations') {
    return res.json({ success: true, key, data: null });
  }
  const val = memoryStorage[key];
  if (val !== undefined) {
    res.json({ success: true, key, data: val });
  } else {
    res.json({ success: true, key, data: null });
  }
});

// Serve uploaded engineering files (PDF, CSV, SLD diagrams, etc.)
app.get("/api/files/:id", (req, res) => {
  const id = req.params.id;
  const resources: any[] = memoryStorage["resources"] || [];
  const resource = resources.find((r: any) => r.id === id);

  const filePath = path.join(UPLOADS_DIR, id);
  if (fs.existsSync(filePath)) {
    const filename = resource ? resource.fileName : `${id}.bin`;
    const mimeType = resource?.fileType || (filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.csv') ? 'text/csv' : 'application/octet-stream');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(filePath).pipe(res);
  }

  // Fallback: if resource has embedded base64 fileData
  if (resource && resource.fileData) {
    const fileData = resource.fileData;
    let base64Content = fileData;
    let mimeType = resource.fileType || 'application/pdf';
    if (fileData.startsWith('data:')) {
      const parts = fileData.split(';base64,');
      mimeType = parts[0].replace('data:', '') || mimeType;
      base64Content = parts[1] || '';
    }
    const buffer = Buffer.from(base64Content, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resource.fileName)}"`);
    return res.send(buffer);
  }

  return res.status(404).json({ error: "File not found" });
});

// Direct single/batch resource file upload endpoint
app.post("/api/upload-resource", (req, res) => {
  try {
    const { title, description, category, fileName, fileSize, fileType, fileData, isPaidOnly, uploadedBy } = req.body;
    if (!title || !fileName) {
      return res.status(400).json({ error: "Title and fileName are required" });
    }

    const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const fileUrl = `/api/files/${id}`;

    if (fileData) {
      saveResourceFileToDisk(id, fileData);
    }

    const newResource = {
      id,
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'datasheet',
      fileName: fileName.trim(),
      fileSize: fileSize || '1.0 MB',
      fileType: fileType || (fileName.endsWith('.csv') ? 'text/csv' : 'application/pdf'),
      fileUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploadedBy || 'Admin',
      isPaidOnly: isPaidOnly !== false,
      downloadsCount: 0
    };

    const currentResources: any[] = memoryStorage["resources"] || [];
    memoryStorage["resources"] = [newResource, ...currentResources];
    saveStorageToDisk();

    broadcastSSE("resources", memoryStorage["resources"]);

    return res.json({ success: true, resource: newResource, count: memoryStorage["resources"].length });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
});

// Specific key POST endpoint (saves and broadcasts live to all user devices)
app.post("/api/data/:key", (req, res) => {
  const key = req.params.key;
  let { data } = req.body;

  // Protect privacy: Do not store or broadcast private site surveys or load calculations across users
  if (key === 'site_surveys' || key === 'load_calculations') {
    return res.json({ success: true, key, count: Array.isArray(data) ? data.length : 1, private: true });
  }

  // If resources are being posted, save binary files to disk and assign fileUrl
  if (key === 'resources' && Array.isArray(data)) {
    data = data.map((res: any) => {
      if (res.fileData && res.fileData.length > 50) {
        saveResourceFileToDisk(res.id, res.fileData);
      }
      return {
        ...res,
        fileUrl: res.fileUrl || `/api/files/${res.id}`
      };
    });
  }

  memoryStorage[key] = data;
  saveStorageToDisk();

  // If inverters or panels are updated, also write static JSON files to public/data/ and docs/data/ for GitHub Pages
  if (key === 'inverters' || key === 'panels') {
    try {
      const pubDir = path.join(process.cwd(), "public", "data");
      const docsDir = path.join(process.cwd(), "docs", "data");
      if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(pubDir, `${key}.json`), JSON.stringify(data, null, 2), "utf-8");
      fs.writeFileSync(path.join(docsDir, `${key}.json`), JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn(`Could not write static public/docs file for ${key}:`, e);
    }
  }

  // Broadcast to all active users via SSE
  broadcastSSE(key, data);

  res.json({ success: true, key, count: Array.isArray(data) ? data.length : 1 });
});

// Full database backup export endpoint
app.get("/api/backup/export", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="solar_system_backup_${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    exportDate: new Date().toISOString(),
    version: "2.5",
    data: memoryStorage
  });
});

// Full database backup import endpoint
app.post("/api/backup/import", (req, res) => {
  try {
    const payload = req.body;
    const backupData = payload.data || payload;
    if (!backupData || typeof backupData !== "object") {
      return res.status(400).json({ error: "Invalid backup data structure" });
    }

    // Update memoryStorage keys
    for (const key of Object.keys(backupData)) {
      if (key !== "exportDate" && key !== "version") {
        memoryStorage[key] = backupData[key];
        broadcastSSE(key, backupData[key]);
      }
    }
    saveStorageToDisk();

    return res.json({
      success: true,
      message: "Database restored successfully",
      keysRestored: Object.keys(backupData)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to restore backup" });
  }
});


// ----------------------------------------------------
// SERVER START & VITE MIDDLEWARE
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Solar Sizer Server running on http://${HOST}:${PORT}`);
    startTelegramPolling();
  });
}

startServer();
