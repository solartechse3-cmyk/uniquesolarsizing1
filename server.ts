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
// SUPABASE CLOUD REAL-TIME BRIDGE (SERVER -> GITHUB PAGES)
// ----------------------------------------------------
const DEFAULT_SUPABASE_URL = "https://vkiwylrerryidoiyqeqh.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraXd5bHJlcnJ5aWRvaXlxZXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDE3NDMsImV4cCI6MjEwMjcxNzc0M30.skGou_-7bKiDdW4lhfEqkywHzvj3mZT9-N_PTED7Rtc";

function normalizeServerSupabaseUrl(rawUrl?: string): string {
  const cleaned = String(rawUrl || "").trim();
  if (!cleaned) return DEFAULT_SUPABASE_URL;
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-z0-9_\-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  if (/^[a-z0-9_\-]{15,30}$/i.test(cleaned)) {
    return `https://${cleaned}.supabase.co`;
  }
  if (/^https?:\/\/[a-z0-9_\-]+\.supabase\.co(\/.*)?$/i.test(cleaned)) {
    return cleaned.replace(/\/+$/, "").replace(/(\.supabase\.co)\/.*$/i, "$1");
  }
  return DEFAULT_SUPABASE_URL;
}

function isValidServerSupabaseAnonKey(rawKey?: string): boolean {
  const k = String(rawKey || "").trim();
  if (!k || k.length < 30) return false;
  if (/^https?:\/\//i.test(k) || k.includes("supabase.com/dashboard")) return false;
  return k.startsWith("eyJ") || k.startsWith("sb_publishable_") || k.startsWith("sb_secret_");
}

function getSupabaseRestConfig(): { url: string; anonKey: string } {
  const storedCfg = memoryStorage?.["supabase_config"];
  const candidateUrl = storedCfg?.url || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const candidateKey = storedCfg?.anonKey || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return {
    url: normalizeServerSupabaseUrl(candidateUrl),
    anonKey: isValidServerSupabaseAnonKey(candidateKey) ? String(candidateKey).trim() : DEFAULT_SUPABASE_ANON_KEY
  };
}

async function upsertSupabaseAppSettings(
  rows: Array<{ id: string; value: any; updated_at?: string }>
): Promise<boolean> {
  if (!rows || rows.length === 0) return true;
  try {
    const { url, anonKey } = getSupabaseRestConfig();
    if (!url || !anonKey) return false;
    const nowIso = new Date().toISOString();
    const payload = rows.map(r => ({
      id: r.id,
      value: r.value,
      updated_at: r.updated_at || nowIso
    }));
    const res = await fetch(`${url}/rest/v1/app_settings?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("Supabase upsert app_settings warning:", res.status, errText);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("Supabase upsert app_settings error:", err?.message || err);
    return false;
  }
}

async function fetchSupabaseAppSetting(id: string): Promise<any | null> {
  try {
    const { url, anonKey } = getSupabaseRestConfig();
    if (!url || !anonKey) return null;
    const res = await fetch(
      `${url}/rest/v1/app_settings?id=eq.${encodeURIComponent(id)}&select=id,value,updated_at`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`
        },
        signal: AbortSignal.timeout(5000)
      }
    );
    if (!res.ok) return null;
    const rows: any = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].value;
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function broadcastSupabaseEvent(event: string, payload: Record<string, any>): Promise<void> {
  try {
    const { url, anonKey } = getSupabaseRestConfig();
    if (!url || !anonKey) return;
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        messages: [
          {
            topic: "solar_global_database_events",
            event,
            payload
          }
        ]
      }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (err) {}
}

async function syncLicensesToSupabase(licenses: any[]): Promise<void> {
  const safeList = Array.isArray(licenses) ? licenses : [];
  await upsertSupabaseAppSettings([
    { id: "global_licenses", value: safeList, updated_at: new Date().toISOString() }
  ]);
  await broadcastSupabaseEvent("licenses_changed", {
    count: safeList.length,
    timestamp: Date.now()
  });
}

async function pullAndMergeLicensesFromSupabase(): Promise<any[]> {
  const localList: any[] = Array.isArray(memoryStorage["licenses"]) ? memoryStorage["licenses"] : [];
  const cloudList = await fetchSupabaseAppSetting("global_licenses");
  if (!Array.isArray(cloudList)) {
    // Cloud does not have global_licenses yet — push local list if non-empty
    if (localList.length > 0) {
      syncLicensesToSupabase(localList).catch(() => {});
    }
    return localList;
  }

  // Merge by uppercase token so neither GitHub Pages activations nor local/Telegram generations are lost
  const map = new Map<string, any>();
  for (const item of cloudList) {
    if (item && item.token) {
      map.set(String(item.token).toUpperCase(), item);
    }
  }

  let needsCloudPush = false;
  let localChanged = false;

  for (const localItem of localList) {
    if (!localItem || !localItem.token) continue;
    const key = String(localItem.token).toUpperCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, localItem);
      needsCloudPush = true;
    } else {
      // Merge boundDevices union if local has devices not in cloud
      const cloudDevs: any[] = Array.isArray(existing.boundDevices) ? existing.boundDevices : [];
      const localDevs: any[] = Array.isArray(localItem.boundDevices) ? localItem.boundDevices : [];
      if (cloudDevs.length !== localDevs.length || existing.status !== localItem.status || existing.expiresAt !== localItem.expiresAt) {
        localChanged = true;
      }
    }
  }

  if (cloudList.length !== localList.length) {
    localChanged = true;
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  if (localChanged) {
    memoryStorage["licenses"] = merged;
    saveStorageToDisk();
  }
  if (needsCloudPush) {
    syncLicensesToSupabase(merged).catch(() => {});
  }
  return merged;
}

async function syncAllDataFromSupabaseOnStartup(): Promise<void> {
  try {
    const { url, anonKey } = getSupabaseRestConfig();
    if (!url || !anonKey) return;
    const ids = [
      "global_custom_inverters",
      "global_custom_panels",
      "global_custom_batteries",
      "global_admin_resources",
      "global_spec_requests",
      "global_payment_config",
      "global_payment_records",
      "global_app_branding",
      "global_admin_contact",
      "global_mounting_database"
    ];
    const inParam = `(${ids.map(id => `"${id}"`).join(",")})`;
    const res = await fetch(
      `${url}/rest/v1/app_settings?id=in.${encodeURIComponent(inParam)}&select=id,value,updated_at`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Cache-Control": "no-cache"
        },
        signal: AbortSignal.timeout(8000)
      }
    );
    if (!res.ok) return;
    const rows: any = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return;

    const map: Record<string, any> = {};
    for (const r of rows) {
      if (r && r.id) map[r.id] = r.value;
    }

    let changed = false;
    const writeStaticJson = (filename: string, data: any) => {
      try {
        const pubDir = path.join(process.cwd(), "public", "data");
        const docsDir = path.join(process.cwd(), "docs", "data");
        if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
        if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
        fs.writeFileSync(path.join(pubDir, filename), JSON.stringify(data, null, 2), "utf-8");
        fs.writeFileSync(path.join(docsDir, filename), JSON.stringify(data, null, 2), "utf-8");
      } catch (e) {}
    };

    if (Array.isArray(map["global_custom_inverters"]) && map["global_custom_inverters"].length > 0) {
      memoryStorage["inverters"] = map["global_custom_inverters"];
      writeStaticJson("inverters.json", map["global_custom_inverters"]);
      changed = true;
    }
    if (Array.isArray(map["global_custom_panels"]) && map["global_custom_panels"].length > 0) {
      memoryStorage["panels"] = map["global_custom_panels"];
      writeStaticJson("panels.json", map["global_custom_panels"]);
      changed = true;
    }
    if (Array.isArray(map["global_custom_batteries"]) && map["global_custom_batteries"].length > 0) {
      memoryStorage["batteries"] = map["global_custom_batteries"];
      changed = true;
    }
    if (Array.isArray(map["global_admin_resources"])) {
      memoryStorage["resources"] = map["global_admin_resources"];
      changed = true;
    }
    if (Array.isArray(map["global_spec_requests"]) && map["global_spec_requests"].length > 0) {
      memoryStorage["spec_requests"] = map["global_spec_requests"];
      changed = true;
    }
    if (map["global_payment_config"] && typeof map["global_payment_config"] === "object") {
      memoryStorage["payment_config"] = map["global_payment_config"];
      changed = true;
    }
    if (Array.isArray(map["global_payment_records"])) {
      memoryStorage["payment_records"] = map["global_payment_records"];
      changed = true;
    }
    if (map["global_app_branding"] && typeof map["global_app_branding"] === "object") {
      memoryStorage["app_branding"] = map["global_app_branding"];
      changed = true;
    }
    if (map["global_admin_contact"] && typeof map["global_admin_contact"] === "object") {
      memoryStorage["admin_contact"] = map["global_admin_contact"];
      changed = true;
    }
    if (map["global_mounting_database"] && typeof map["global_mounting_database"] === "object") {
      memoryStorage["mounting_database"] = map["global_mounting_database"];
      changed = true;
    }

    if (changed) {
      saveStorageToDisk();
    }
    await pullAndMergeLicensesFromSupabase();
  } catch (err: any) {
    console.warn("Startup Supabase sync notice:", err?.message || err);
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
  customAppUrl: "https://solartechse3-cmyk.github.io/uniquesolarsizing1",
  noteMy: "Viber သို့မဟုတ် Telegram တွင် ဆက်သွယ်၍ 1 Week, 1 Month, 3 Months PRO License Link ရယူနိုင်ပါသည်",
  noteEn: "Contact via Viber or Telegram to purchase 1 Week, 1 Month, 3 Months PRO License Link"
};

const DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG = {
  enabled: true,
  botToken: "9212139270:AAEHgyL2ur0c_N1dW-uYkBhvdgYoRDUCuDk",
  botUsername: "UniqueSolarProLicenseBot",
  adminChatId: "1715154450",
  notifyOnActivation: true,
  notifyOnPayment: true,
  lastTestedAt: "2026-11-05T14:11:49.716Z"
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
  return 'https://solartechse3-cmyk.github.io/uniquesolarsizing1';
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

function normalizeMyanmarDigits(str: string): string {
  return String(str || '').replace(/[၀-၉]/g, ch => String(ch.charCodeAt(0) - 0x1040));
}

function parseDurationToken(
  raw?: string
): '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime' | null {
  const cleaned = normalizeMyanmarDigits(raw || '')
    .trim()
    .replace(/^[,.:;]+|[,.:;]+$/g, '')
    .toLowerCase()
    .replace(/[\s_\-]+/g, '');
  if (!cleaned) return null;

  if ([
    '1w', '1wk', '1wks', 'week', '1week', '1weeks',
    '7d', '7day', '7days', '1ပတ်', 'ပတ်', '7ရက်'
  ].includes(cleaned)) {
    return '1_week';
  }
  if ([
    '1m', '1mo', '1mon', '1mons', 'month', '1month', '1months',
    '30d', '30day', '30days', '1လ', '30ရက်'
  ].includes(cleaned)) {
    return '1_month';
  }
  if ([
    '3m', '3mo', '3mon', '3mons', '3month', '3months',
    '90d', '90day', '90days', '3လ', '90ရက်'
  ].includes(cleaned)) {
    return '3_months';
  }
  if ([
    '6m', '6mo', '6mon', '6mons', '6month', '6months',
    '180d', '180day', '180days', '6လ', '180ရက်'
  ].includes(cleaned)) {
    return '6_months';
  }
  if ([
    '1y', '1yr', '1yrs', 'year', '1year', '1years',
    '12m', '12mo', '12mon', '12month', '12months',
    '365d', '365day', '365days', '1နှစ်', 'နှစ်', '12လ', '365ရက်'
  ].includes(cleaned)) {
    return '1_year';
  }
  if ([
    'life', 'lifetime', 'forever', 'unlimited', 'perm', 'permanent',
    '10y', '10yr', '10year', '10years', 'တစ်သက်တာ'
  ].includes(cleaned)) {
    return 'lifetime';
  }
  return null;
}

function parseDeviceLimitToken(raw?: string, allowBareNumber: boolean = true): 1 | 2 | null {
  const cleaned = normalizeMyanmarDigits(raw || '')
    .trim()
    .replace(/^[,.:;]+|[,.:;]+$/g, '')
    .toLowerCase()
    .replace(/[\s_\-]+/g, '');
  if (!cleaned) return null;
  if (['1d', '1dev', '1device', '1devices', '1လုံး'].includes(cleaned)) return 1;
  if (['2d', '2dev', '2device', '2devices', '2လုံး'].includes(cleaned)) return 2;
  if (allowBareNumber && cleaned === '1') return 1;
  if (allowBareNumber && cleaned === '2') return 2;
  return null;
}

function parseTelegramGenArgs(
  rawArgs: string[],
  fixedDuration?: '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime'
): {
  customerName: string;
  duration: '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime' | null;
  deviceLimit: 1 | 2;
} {
  // Merge adjacent number + unit pairs (e.g. ["1", "week"] -> ["1week"], ["2", "devices"] -> ["2devices"])
  const tokens: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const cur = rawArgs[i];
    const next = rawArgs[i + 1];
    if (cur && next) {
      const curNorm = normalizeMyanmarDigits(cur).trim().replace(/^[,.:;]+|[,.:;]+$/g, '').toLowerCase();
      const nextNorm = normalizeMyanmarDigits(next).trim().replace(/^[,.:;]+|[,.:;]+$/g, '').toLowerCase();
      const isNum = /^\d+$/.test(curNorm);
      const isDurUnit = [
        'w', 'wk', 'wks', 'week', 'weeks',
        'm', 'mo', 'mon', 'mons', 'month', 'months',
        'y', 'yr', 'yrs', 'year', 'years',
        'day', 'days', 'ပတ်', 'လ', 'နှစ်', 'ရက်'
      ].includes(nextNorm) || (nextNorm === 'd' && ['7', '30', '90', '180', '365'].includes(curNorm));
      const isDevUnit = ['dev', 'device', 'devices', 'လုံး'].includes(nextNorm)
        || (nextNorm === 'd' && ['1', '2'].includes(curNorm));
      if (isNum && (isDurUnit || isDevUnit)) {
        tokens.push(`${curNorm}${nextNorm}`);
        i++;
        continue;
      }
    }
    tokens.push(cur);
  }

  let duration: '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime' | null = fixedDuration || null;
  let durIdx = -1;

  // Scan RIGHT-TO-LEFT for duration token so multi-word customer names (e.g. "Ko Aung 1w 1") parse accurately
  if (!duration) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      const parsed = parseDurationToken(tokens[i]);
      if (parsed) {
        duration = parsed;
        durIdx = i;
        break;
      }
    }
  }

  let deviceLimit: 1 | 2 = 1;
  let devIdx = -1;

  // Check token right after duration (e.g. "/gen Ko Aung 1w 2" or "/gen 1w 2 Ko Aung")
  if (durIdx !== -1 && durIdx + 1 < tokens.length) {
    const afterDur = parseDeviceLimitToken(tokens[durIdx + 1], true);
    if (afterDur !== null) {
      deviceLimit = afterDur;
      devIdx = durIdx + 1;
    }
  }

  // Otherwise check the trailing token (e.g. "/1w Ko Aung 2" or "/gen 1w Ko Aung 2")
  if (devIdx === -1 && tokens.length > 0) {
    const lastIdx = tokens.length - 1;
    if (lastIdx !== durIdx) {
      const lastDev = parseDeviceLimitToken(tokens[lastIdx], true);
      if (lastDev !== null) {
        deviceLimit = lastDev;
        devIdx = lastIdx;
      }
    }
  }

  // Also check for any explicitly labeled device token anywhere (e.g. "2d", "2devices")
  if (devIdx === -1) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (i === durIdx) continue;
      const explicitDev = parseDeviceLimitToken(tokens[i], false);
      if (explicitDev !== null) {
        deviceLimit = explicitDev;
        devIdx = i;
        break;
      }
    }
  }

  const nameTokens = tokens
    .filter((_, idx) => idx !== durIdx && idx !== devIdx)
    .map(t => t.replace(/^,+|,+$/g, ''))
    .filter(Boolean);
  const customerName = nameTokens.join(' ').trim();

  return { customerName, duration, deviceLimit };
}

type CanonicalLicenseDuration = '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime';

const LICENSE_PLAN_SPECS: Record<CanonicalLicenseDuration, {
  code: '1W' | '1M' | '3M' | '6M' | '1Y' | 'LIFE';
  days: number;
  labelEn: string;
  labelMy: string;
}> = {
  '1_week': { code: '1W', days: 7, labelEn: '1 Week (7 Days)', labelMy: '၁ ပတ် (၇ ရက်)' },
  '1_month': { code: '1M', days: 30, labelEn: '1 Month (30 Days)', labelMy: '၁ လ (ရက် ၃၀)' },
  '3_months': { code: '3M', days: 90, labelEn: '3 Months (90 Days)', labelMy: '၃ လ (ရက် ၉၀)' },
  '6_months': { code: '6M', days: 180, labelEn: '6 Months (180 Days)', labelMy: '၆ လ (၁၈၀ ရက်)' },
  '1_year': { code: '1Y', days: 365, labelEn: '1 Year (365 Days)', labelMy: '၁ နှစ် (၃၆၅ ရက်)' },
  'lifetime': { code: 'LIFE', days: 3650, labelEn: 'Lifetime (10 Years)', labelMy: 'တစ်သက်တာ (၁၀ နှစ်)' }
};

const LICENSE_CODE_TO_DURATION: Record<string, CanonicalLicenseDuration> = {
  '1W': '1_week',
  '1M': '1_month',
  '3M': '3_months',
  '6M': '6_months',
  '1Y': '1_year',
  'LIFE': 'lifetime'
};

function randomKeySegment(len: number = 4): string {
  // Exclude confusing characters (0, O, 1, I) so buyers never mistype keys
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function extractCanonicalLicenseToken(rawInput: string): string {
  const str = String(rawInput || '').trim();
  const tokenMatch = str.match(/SOLAR-PRO-(1W|1M|3M|6M|1Y|LIFE)-(1D|2D)-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
  if (tokenMatch) return tokenMatch[0].toUpperCase();
  const paramMatch = str.match(/[?&]license=([A-Za-z0-9_-]+)/i);
  if (paramMatch && paramMatch[1]) return paramMatch[1].toUpperCase();
  return str.toUpperCase();
}

function normalizeServerLicenseRecord(lic: any): any {
  if (!lic || typeof lic !== 'object' || !lic.token) return lic;
  const tokenStr = String(lic.token).trim().toUpperCase();
  const match = tokenStr.match(/^SOLAR-PRO-(1W|1M|3M|6M|1Y|LIFE)-(1D|2D)-[A-Z0-9]{4}-[A-Z0-9]{4}$/i);
  if (!match) return lic;
  const expectedDuration = LICENSE_CODE_TO_DURATION[match[1].toUpperCase()];
  const expectedDevLimit: 1 | 2 = match[2].toUpperCase() === '2D' ? 2 : 1;
  if (!expectedDuration) return lic;
  const spec = LICENSE_PLAN_SPECS[expectedDuration];
  const currentDuration = parseDurationToken(lic.duration);
  const fixed: any = {
    ...lic,
    token: tokenStr,
    duration: expectedDuration,
    durationDays: spec.days,
    deviceLimit: expectedDevLimit
  };
  // Self-heal expiresAt ONLY if the record's duration mismatched its own token prefix (never overwrite genuine Admin extensions)
  if (currentDuration !== expectedDuration && lic.createdAt && !lic.manuallyExtended) {
    const createdMs = new Date(lic.createdAt).getTime();
    if (!isNaN(createdMs)) {
      fixed.expiresAt = new Date(createdMs + spec.days * 86400000).toISOString();
    }
  }
  return fixed;
}

// Helper to generate a new PRO License Record (used by Web UI, API, and Telegram Bot)
function generateLicenseRecord(customerName: string, duration?: string, deviceLimit: number = 1, note?: string) {
  const d: CanonicalLicenseDuration = parseDurationToken(duration) || '1_month';
  const spec = LICENSE_PLAN_SPECS[d];
  const days = spec.days;
  const safeDeviceLimit: 1 | 2 = Number(deviceLimit) === 2 ? 2 : 1;

  const rand1 = randomKeySegment(4);
  const rand2 = randomKeySegment(4);
  const durCode = spec.code;
  const devCode = safeDeviceLimit === 2 ? '2D' : '1D';
  const token = `SOLAR-PRO-${durCode}-${devCode}-${rand1}-${rand2}`;

  const now = new Date();
  const expires = new Date(now.getTime() + days * 86400000);

  const newLicense = {
    id: `lic_${Date.now()}_${randomKeySegment(4).toLowerCase()}`,
    token,
    customerName: (customerName || '').trim() || 'Engineer Customer',
    duration: d,
    durationDays: days,
    deviceLimit: safeDeviceLimit,
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

  // Sync newly generated license immediately to Supabase Cloud so GitHub Pages users can activate it instantly
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});

  // Auto-sync to Google Sheet in background if webhook is configured
  autoSyncLicenseToGoogleSheet(newLicense).catch(() => {});

  return newLicense;
}

// Generate License Link
app.post("/api/license/generate", async (req, res) => {
  try {
    const { customerName, duration, deviceLimit, note } = req.body;
    // Pull & merge latest cloud licenses first so we never overwrite recent activations or keys created from GitHub Pages
    await pullAndMergeLicensesFromSupabase().catch(() => {});
    const newLicense = generateLicenseRecord(customerName, duration, deviceLimit, note);
    await syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});
    return res.json({ success: true, license: newLicense });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to generate license' });
  }
});

// Activate License on Device
app.post("/api/license/activate", async (req, res) => {
  try {
    const { token, deviceId, deviceModel } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const cleanedToken = extractCanonicalLicenseToken(token);
    let list = (memoryStorage["licenses"] || []).map(normalizeServerLicenseRecord);
    let licIndex = list.findIndex((l: any) => 
      l.token.toUpperCase() === cleanedToken || 
      l.id === cleanedToken ||
      cleanedToken.includes(l.token.toUpperCase())
    );

    if (licIndex === -1) {
      list = (await pullAndMergeLicensesFromSupabase()).map(normalizeServerLicenseRecord);
      licIndex = list.findIndex((l: any) => 
        l.token.toUpperCase() === cleanedToken || 
        l.id === cleanedToken ||
        cleanedToken.includes(l.token.toUpperCase())
      );
    }

    if (licIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'not_found', 
        message: 'လိုင်စင်ကုဒ် မှားယွင်းနေပါသည်။ Viber သို့မဟုတ် Telegram တွင် Admin အား ဆက်သွယ်ပါ (Invalid License Key)' 
      });
    }

    const lic = normalizeServerLicenseRecord(list[licIndex]);
    list[licIndex] = lic;
    memoryStorage["licenses"] = list;
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
      syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});
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
      if (Array.isArray(lic.unboundDeviceIds)) {
        lic.unboundDeviceIds = lic.unboundDeviceIds.filter((id: string) => id !== safeDeviceId);
      }
      saveStorageToDisk();
      broadcastSSE("licenses", memoryStorage["licenses"]);
      syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});
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
    if (Array.isArray(lic.unboundDeviceIds)) {
      lic.unboundDeviceIds = lic.unboundDeviceIds.filter((id: string) => id !== safeDeviceId);
    }
    saveStorageToDisk();
    broadcastSSE("licenses", memoryStorage["licenses"]);
    syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});

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
app.post("/api/license/unbind-device", async (req, res) => {
  const { licenseId, deviceId } = req.body;
  const list = await pullAndMergeLicensesFromSupabase();
  const lic = list.find((l: any) => l.id === licenseId || l.token === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });

  if (!deviceId || deviceId === 'all') {
    lic.boundDevices = [];
    lic.unboundAllAt = new Date().toISOString();
  } else {
    lic.boundDevices = (lic.boundDevices || []).filter((d: any) => d.deviceId !== deviceId);
    const prevUnbound = Array.isArray(lic.unboundDeviceIds) ? lic.unboundDeviceIds : [];
    lic.unboundDeviceIds = Array.from(new Set([...prevUnbound, deviceId]));
  }

  memoryStorage["licenses"] = list;
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});
  res.json({ success: true, license: lic });
});

// Extend license
app.post("/api/license/extend", async (req, res) => {
  const { licenseId, days } = req.body;
  const list = await pullAndMergeLicensesFromSupabase();
  const lic = list.find((l: any) => l.id === licenseId || l.token === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });

  const addDays = parseInt(days, 10) || 30;
  const currentExp = new Date(lic.expiresAt).getTime();
  const baseTime = currentExp > Date.now() ? currentExp : Date.now();
  lic.expiresAt = new Date(baseTime + addDays * 86400000).toISOString();
  lic.status = 'active';
  lic.manuallyExtended = true;

  memoryStorage["licenses"] = list;
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});
  res.json({ success: true, license: lic });
});

// Change license status
app.post("/api/license/status", async (req, res) => {
  const { licenseId, status } = req.body;
  const list = await pullAndMergeLicensesFromSupabase();
  const lic = list.find((l: any) => l.id === licenseId || l.token === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });

  lic.status = status;
  memoryStorage["licenses"] = list;
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});
  res.json({ success: true, license: lic });
});

// Delete license
app.delete("/api/license/:id", async (req, res) => {
  const id = req.params.id;
  const list = await pullAndMergeLicensesFromSupabase();
  memoryStorage["licenses"] = list.filter((l: any) => l.id !== id && l.token !== id);
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {});
  res.json({ success: true });
});

// Get all licenses
app.get("/api/licenses", async (req, res) => {
  const list = await pullAndMergeLicensesFromSupabase();
  res.json({ success: true, licenses: list });
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
  upsertSupabaseAppSettings([
    { id: "global_admin_contact", value: memoryStorage["admin_contact"] },
    { id: "admin_contact_config", value: memoryStorage["admin_contact"] }
  ]).then(() => {
    broadcastSupabaseEvent("admin_contact_changed", { contact: memoryStorage["admin_contact"], timestamp: Date.now() }).catch(() => {});
  }).catch(() => {});
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

async function sendTelegramMessage(
  token: string, 
  chatId: string, 
  text: string, 
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyMarkup?: any
) {
  if (!token || !chatId) return { ok: false, description: 'Missing token or chatId' };
  try {
    const payload: any = {
      chat_id: chatId,
      text,
      disable_web_page_preview: false
    };
    if (parseMode) payload.parse_mode = parseMode;
    if (replyMarkup) payload.reply_markup = replyMarkup;

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

async function syncTelegramBotProfileAndMenu(token: string, appUrl: string) {
  if (!token) return { success: false, error: 'No token' };
  const cleanUrl = (appUrl || getPublicAppUrl()).replace(/\/+$/, '');
  try {
    // 1. Set Chat Menu Button with Web App link to GitHub Pages
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '☀️ Open Solar Pro',
          web_app: { url: cleanUrl }
        }
      }),
      signal: AbortSignal.timeout(6000)
    });

    // 2. Set Commands list in Telegram
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Open App & Usage Guide' },
          { command: 'gen', description: '[Admin] /gen <name> <1w|1m|3m|6m|1y|life> [1|2]' },
          { command: '1w', description: '[Admin] Quick 1 Week key (/1w <name> [1|2])' },
          { command: '1m', description: '[Admin] Quick 1 Month key (/1m <name> [1|2])' },
          { command: '3m', description: '[Admin] Quick 3 Months key (/3m <name> [1|2])' },
          { command: '6m', description: '[Admin] Quick 6 Months key (/6m <name> [1|2])' },
          { command: '1y', description: '[Admin] Quick 1 Year key (/1y <name> [1|2])' },
          { command: 'licenses', description: '[Admin] View recent licenses' },
          { command: 'csv', description: '[Admin] Download license Excel / CSV' },
          { command: 'stats', description: '[Admin] Total licenses & bound devices' },
          { command: 'app', description: 'Open Unique Solar Pro on GitHub Pages' },
          { command: 'help', description: 'Commands cheat sheet' }
        ]
      }),
      signal: AbortSignal.timeout(6000)
    });

    // 3. Set Description for Bot Profile
    await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: `☀️ UNIQUE SOLAR PRO - Engineering Suite ⚡️\nSolar Panel Sizing & Inverter Matching App for Engineers in Myanmar.\n\n🌐 Web App Link (VPN-Free):\n${cleanUrl}\n\n🔑 Instant 1-Click PRO License Activation & Management.`
      }),
      signal: AbortSignal.timeout(6000)
    });

    // 4. Set Short Description
    await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        short_description: `Unique Solar Pro - ${cleanUrl}`
      }),
      signal: AbortSignal.timeout(6000)
    });

    console.log(`Telegram Bot profile & menu successfully synced with GitHub link: ${cleanUrl}`);
    return { success: true, appUrl: cleanUrl };
  } catch (err: any) {
    console.warn('syncTelegramBotProfileAndMenu error:', err?.message);
    return { success: false, error: err?.message };
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
const pendingGenPrompts = new Map<string, { customerName: string; deviceLimit: 1 | 2; createdAt: number }>();

async function answerTelegramCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  if (!token || !callbackQueryId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || '' }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (e) {}
}

async function generateAndSendTelegramLicense(
  cfg: any,
  chatId: string,
  fromLabel: string,
  customerName: string,
  duration: '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime',
  deviceLimit: 1 | 2
) {
  const appUrl = getPublicAppUrl();
  const safeName = (customerName || '').trim() || 'Engineer Customer';

  // DEDUPLICATION: Prevent accidental double-tap duplicates within 15s (distinct by duration + deviceLimit)
  const dedupKey = `${chatId}_${safeName.toLowerCase()}_${duration}_${deviceLimit}`;
  const recent = recentCommandCache.get(dedupKey);
  let newLic: any;
  let isDuplicate = false;

  let cloudSynced = false;
  if (recent && (Date.now() - recent.time < 15000)) {
    newLic = recent.license;
    isDuplicate = true;
    cloudSynced = true;
  } else {
    await pullAndMergeLicensesFromSupabase();
    newLic = generateLicenseRecord(safeName, duration, deviceLimit, `Generated via Telegram Bot (${fromLabel})`);
    // Await Supabase Cloud persistence BEFORE sending key to Telegram so GitHub Pages activation works immediately!
    cloudSynced = await upsertSupabaseAppSettings([
      { id: "global_licenses", value: memoryStorage["licenses"], updated_at: new Date().toISOString() }
    ]);
    if (cloudSynced) {
      broadcastSupabaseEvent("licenses_changed", { count: memoryStorage["licenses"].length, timestamp: Date.now() }).catch(() => {});
    }
    recentCommandCache.set(dedupKey, { time: Date.now(), license: newLic });
    if (recentCommandCache.size > 200) {
      const oldest = recentCommandCache.keys().next().value;
      if (oldest) recentCommandCache.delete(oldest);
    }
  }

  const activationLink = `${appUrl}/?license=${newLic.token}`;
  const planSpec = LICENSE_PLAN_SPECS[duration];
  const durLabel = `${planSpec.labelEn} • ${planSpec.labelMy}`;

  const expiresDateStr = new Date(newLic.expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const escapeTelegramHtml = (str: string) =>
    String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const dupNotice = isDuplicate
    ? '⚠️ <i>(လွန်ခဲ့သော စက္ကန့်ပိုင်းက ထုတ်ထားပြီးဖြစ်သော လိုင်စင်အား ပြန်လည်ပြသပေးထားပါသည် - Duplicate Prevented)</i>\n\n'
    : '';

  const replyMsg = `${dupNotice}🎉 <b>PRO LICENSE ထုတ်လုပ်ပြီးပါပြီ!</b> ⚡️
━━━━━━━━━━━━━━━━━
👤 <b>ဝယ်ယူသူ:</b> ${escapeTelegramHtml(safeName)}
⏳ <b>သက်တမ်း:</b> ${durLabel}
📅 <b>ကုန်ဆုံးမည့်ရက်:</b> ${expiresDateStr}
📱 <b>ခွင့်ပြုစက်:</b> ${newLic.deviceLimit} Device(s)
☁️ <b>Cloud Sync:</b> ${cloudSynced ? '✅ Ready (Online)' : '⚡️ Direct Offline-Ready'}

🌐 <b>VPN မလိုဘဲ တိုက်ရိုက်ဖွင့်ရန် (One-Click Link):</b>
${activationLink}

🔑 <b>License Key:</b>
<code>${newLic.token}</code>
<i>👉 အကယ်၍ Link မဖွင့်ချင်ပါက App ၏ "Enter License Key" တွင် ဤ Key ကို ကူးထည့်ရုံဖြင့်လည်း VPN မလိုဘဲ Activate ဖြစ်ပါသည်!</i>
━━━━━━━━━━━━━━━━━
<i>(ဝယ်ယူသူထံ ဤစာတိုကို တိုက်ရိုက် Forward ပို့ပေးလိုက်ရုံဖြင့် အလွယ်တကူ Activate ပြုလုပ်နိုင်ပါသည်)</i>`;

  await sendTelegramMessage(cfg.botToken, chatId, replyMsg, 'HTML', {
    inline_keyboard: [
      [
        { text: '⚡️ 1-Click Activate PRO', url: activationLink },
        { text: '☀️ Open App', url: appUrl }
      ]
    ]
  });
}

async function handleTelegramCallbackQuery(cfg: any, cbq: any) {
  if (!cbq || !cbq.data) return;
  const chatId = String(cbq.message?.chat?.id || cbq.from?.id || '');
  const isAdmin = !cfg.adminChatId || chatId === String(cfg.adminChatId);
  if (!isAdmin) {
    await answerTelegramCallbackQuery(cfg.botToken, cbq.id, '⛔️ Admin only');
    return;
  }

  const dataStr = String(cbq.data);
  if (dataStr.startsWith('qgen:')) {
    const [, promptId, durRaw, devRaw] = dataStr.split(':');
    const duration = parseDurationToken(durRaw);
    if (!duration) {
      await answerTelegramCallbackQuery(cfg.botToken, cbq.id, 'Invalid duration');
      return;
    }
    const pending = pendingGenPrompts.get(promptId);
    const customerName = pending?.customerName || 'Engineer Customer';
    const deviceLimit: 1 | 2 = devRaw === '2' ? 2 : (pending?.deviceLimit || 1);
    const fromLabel = cbq.from?.username ? `@${cbq.from.username}` : (cbq.from?.first_name || 'Admin');

    await answerTelegramCallbackQuery(cfg.botToken, cbq.id, `Generating ${duration.replace('_', ' ')} key...`);
    await generateAndSendTelegramLicense(cfg, chatId, fromLabel, customerName, duration, deviceLimit);
  }
}

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
  // Automatically sync Telegram menu button & Web App link to point to GitHub Pages URL
  syncTelegramBotProfileAndMenu(cfg.botToken, getPublicAppUrl()).catch(() => {});
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

    const allowedUpdates = encodeURIComponent(JSON.stringify(["message", "callback_query"]));
    const url = `https://api.telegram.org/bot${cfg.botToken}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=8&allowed_updates=${allowedUpdates}`;
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
        } else if (update.callback_query) {
          await handleTelegramCallbackQuery(cfg, update.callback_query);
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

  const parts = rawText.split(/\s+/);
  const rawCmd = (parts[0] || '').toLowerCase();
  const cmd = rawCmd.split('@')[0]; // handles /cmd@UniqueSolarProLicenseBot

  const appUrl = getPublicAppUrl();
  const isAdmin = !cfg.adminChatId || chatId === String(cfg.adminChatId);

  // Command: /app, /link, /github, /web - Open Unique Solar Pro on GitHub Pages
  if (cmd === '/app' || cmd === '/link' || cmd === '/github' || cmd === '/web' || cmd === '/url') {
    const appMsg = `☀️ <b>UNIQUE SOLAR PRO - WEB APP</b> ⚡️
━━━━━━━━━━━━━━━━━
🌐 <b>GitHub Pages Link (VPN-Free):</b>
${appUrl}

💡 <b>အသုံးပြုပုံ:</b>
မြန်မာနိုင်ငံရှိ မည်သည့်ဖုန်း၊ တက်ဘလက် သို့မဟုတ် ကွန်ပျူတာ Browser မှမဆို VPN မလိုဘဲ တိုက်ရိုက်ဖွင့်လှစ် အသုံးပြုနိုင်ပါသည်!`;

    await sendTelegramMessage(cfg.botToken, chatId, appMsg, 'HTML', {
      inline_keyboard: [
        [
          { text: '☀️ Open Solar Pro (Web App)', web_app: { url: appUrl } },
          { text: '🌐 Direct Browser Link', url: appUrl }
        ]
      ]
    });
    return;
  }

  // Command: /id - Show chat ID
  if (cmd === '/id') {
    await sendTelegramMessage(cfg.botToken, chatId, `🆔 သင့် Telegram Chat ID သည်: <code>${chatId}</code> ဖြစ်ပါသည်။`, 'HTML');
    return;
  }

  // Command: /check <token> - Check license status
  if (cmd === '/check' || cmd === '/status' && parts[1]) {
    const tokenQuery = parts[1] ? parts[1].trim().toUpperCase() : '';
    if (!tokenQuery) {
      await sendTelegramMessage(
        cfg.botToken,
        chatId,
        `ℹ️ <b>လိုင်စင်စစ်ဆေးရန်:</b>\n<code>/check &lt;လိုင်စင်ကုဒ်&gt;</code> ပုံစံဖြင့် စစ်ဆေးနိုင်ပါသည်ခင်ဗျာ။\nဥပမာ: <code>/check SOLAR-PRO-1M-1D-XXXX-YYYY</code>`,
        'HTML'
      );
      return;
    }
    const list = await pullAndMergeLicensesFromSupabase();
    const found = list.find((l: any) => l.token.toUpperCase() === tokenQuery || l.id === tokenQuery);
    if (!found) {
      await sendTelegramMessage(
        cfg.botToken,
        chatId,
        `❌ လိုင်စင်ကုဒ် <code>${tokenQuery}</code> အား စနစ်ထဲတွင် မတွေ့ရှိပါခင်ဗျာ။\nအသစ်ဝယ်ယူလိုပါက Admin သို့ ဆက်သွယ်နိုင်ပါသည်။`,
        'HTML',
        {
          inline_keyboard: [
            [
              { text: '☀️ Open Unique Solar App', web_app: { url: appUrl } },
              { text: '💬 Contact Admin', url: 'https://t.me/uniquesolarpro' }
            ]
          ]
        }
      );
      return;
    }
    const boundCount = Array.isArray(found.boundDevices) ? found.boundDevices.length : 0;
    const isExpired = new Date(found.expiresAt).getTime() < Date.now();
    const statusText = isExpired ? '🔴 Expired' : found.status === 'active' ? '🟢 Active' : '🟡 Inactive';
    const msg = `🔑 <b>PRO LICENSE STATUS</b>\n━━━━━━━━━━━━━━━━━\n👤 ဝယ်ယူသူ: <b>${found.customerName}</b>\n📊 Status: ${statusText}\n⏳ သက်တမ်း: ${found.duration}\n📅 ကုန်ဆုံးမည့်ရက်: ${new Date(found.expiresAt).toLocaleDateString()}\n📱 စက်ချိတ်ဆက်မှု: ${boundCount}/${found.deviceLimit} Devices\n\n🌐 <b>One-Click Link:</b>\n${appUrl}/?license=${found.token}`;
    await sendTelegramMessage(cfg.botToken, chatId, msg, 'HTML', {
      inline_keyboard: [
        [
          { text: '⚡️ 1-Click Activate', url: `${appUrl}/?license=${found.token}` },
          { text: '☀️ Open App', web_app: { url: appUrl } }
        ]
      ]
    });
    return;
  }

  // Non-Admin Welcome / Start handling
  if (!isAdmin) {
    if (cmd === '/start' || cmd === '/help') {
      const publicWelcome = `☀️ <b>UNIQUE SOLAR PRO</b> ⚡️
မင်္ဂလာပါ <b>${fromName}</b>!
မြန်မာနိုင်ငံရှိ Solar Engineers, Installers & Technicians များအတွက် အထူးထုတ်လုပ်ထားသော Solar Panel Sizing & Inverter Matching Engineering Suite ဖြစ်ပါသည်။

🌐 <b>GitHub Pages App Link (VPN-Free):</b>
${appUrl}

⚡️ <b>ပါဝင်သော လုပ်ဆောင်ချက်များ:</b>
• Inverter & Solar Panel String Sizing (Voc, Vmp, MPPT, Max/Min String)
• 3D Solar Mounting Structure Calculators (Roof & Ground)
• DC Breaker, Fuse, Cable & SPD Sizing
• Engineering SLD & PDF Export

💡 <b>PRO License ဝယ်ယူရန်/မေးမြန်းရန်:</b>
• Telegram Admin: @uniquesolarpro
• Viber Phone: 09 403 708 145

🔑 <b>လိုင်စင်စစ်ဆေးရန်:</b>
<code>/check &lt;LicenseKey&gt;</code>`;

      await sendTelegramMessage(cfg.botToken, chatId, publicWelcome, 'HTML', {
        inline_keyboard: [
          [
            { text: '☀️ Open Solar Pro (Web App)', web_app: { url: appUrl } },
            { text: '🌐 Direct Browser Link', url: appUrl }
          ],
          [
            { text: '💬 Contact Admin (@uniquesolarpro)', url: 'https://t.me/uniquesolarpro' }
          ]
        ]
      });
      return;
    }

    // Block non-admin from admin-only commands
    await sendTelegramMessage(
      cfg.botToken,
      chatId,
      `⛔️ <b>Admin Command ဖြစ်ပါသည်။</b>\nဤလုပ်ဆောင်ချက်သည် Solar Pro Admin သီးသန့်ဖြစ်ပါသည် (Unauthorized).\nသင့် Telegram Chat ID: <code>${chatId}</code>\n\n🌐 App ဖွင့်ရန်: ${appUrl}`,
      'HTML',
      {
        inline_keyboard: [
          [
            { text: '☀️ Open Solar Pro', web_app: { url: appUrl } }
          ]
        ]
      }
    );
    return;
  }

  // --- ADMIN COMMANDS ---
  if (cmd === '/start' || cmd === '/help') {
    const helpMsg = `☀️ <b>UNIQUE SOLAR PRO - ADMIN SUITE</b> ⚡️
မင်္ဂလာပါ Admin <b>${fromName}</b>!
Bot ချိတ်ဆက်ထားသော GitHub Pages Link:
🌐 <code>${appUrl}</code>

📌 <b>အသုံးပြုနိုင်သော Admin Commands များ:</b>
1️⃣ <b>လိုင်စင်ထုတ်ရန် (နာမည် Space ပါလည်း ရပါသည်):</b>
<code>/gen &lt;နာမည်&gt; &lt;သက်တမ်း&gt; [စက်အရေအတွက်]</code>
ဥပမာများ:
• <code>/gen Ko Aung 1w 1</code> (၁ ပတ် - ၇ ရက်)
• <code>/gen Ko Aung 1m 1</code> (၁ လ - ၃၀ ရက်)
• <code>/gen Daw Hla 3m 2</code> (၃ လ - ၉၀ ရက်)
• <code>/gen 09798111222 1y 1</code> (၁ နှစ် - ၃၆၅ ရက်)
• <code>/gen Engineer U Kyaw life 2</code> (တစ်သက်တာ)

⚡️ <b>အမြန်ထုတ်နည်း (Quick Commands):</b>
• <code>/1w Ko Aung 1</code> — 1 Week (၇ ရက်)
• <code>/1m Ko Aung 1</code> — 1 Month (ရက် ၃၀)
• <code>/3m Ko Aung 2</code> — 3 Months (ရက် ၉၀)
• <code>/6m Ko Aung 2</code> — 6 Months (၁၈၀ ရက်)
• <code>/1y Ko Aung 1</code> — 1 Year (၃၆၅ ရက်)
• <code>/life Ko Aung 2</code> — Lifetime (၁၀ နှစ်)

2️⃣ <b>လိုင်စင်များ ကြည့်ရန် & ဒေါင်းလုဒ် ရယူရန်:</b>
• <code>/licenses</code> - နောက်ဆုံး ထုတ်ထားသော စာရင်းများ
• <code>/csv</code> သို့မဟုတ် <code>/export</code> - စာရင်းအားလုံးကို Excel / CSV ဖိုင်ဖြင့် ဒေါင်းလုဒ် ရယူရန်

3️⃣ <b>အခြေအနေ ကြည့်ရန်:</b>
• <code>/stats</code> - စုစုပေါင်း လိုင်စင်နှင့် စက်အရေအတွက်

4️⃣ <b>Chat ID ကြည့်ရန်:</b>
• <code>/id</code> - သင့် Telegram Chat ID: <code>${chatId}</code>

5️⃣ <b>GitHub App Link:</b>
• <code>/app</code> - GitHub Pages App Link ရယူရန်`;

    await sendTelegramMessage(cfg.botToken, chatId, helpMsg, 'HTML', {
      inline_keyboard: [
        [
          { text: '☀️ Open Solar Pro (Web App)', web_app: { url: appUrl } },
          { text: '🌐 Direct Browser Link', url: appUrl }
        ]
      ]
    });
    return;
  }

  if (cmd === '/export' || cmd === '/csv' || cmd === '/download') {
    await sendTelegramChatAction(cfg.botToken, chatId, 'upload_document');
    const list = await pullAndMergeLicensesFromSupabase();
    if (list.length === 0) {
      await sendTelegramMessage(cfg.botToken, chatId, `📝 ထုတ်ထားသော လိုင်စင် မှတ်တမ်း မရှိသေးပါခင်ဗျာ။ <code>/gen</code> ဖြင့် စတင်ထုတ်နိုင်ပါသည်။`, 'HTML');
      return;
    }

    const csvContent = generateLicensesCSV(list, appUrl);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Unique_Solar_Pro_Licenses_${dateStr}.csv`;

    const active = list.filter((l: any) => l.status === 'active').length;
    let boundTotal = 0;
    list.forEach((l: any) => {
      if (Array.isArray(l.boundDevices)) boundTotal += l.boundDevices.length;
    });

    const caption = `📁 <b>PRO LICENSE DATABASE EXPORT (.CSV)</b>\n━━━━━━━━━━━━━━━━━\n🔑 စုစုပေါင်း: <b>${list.length}</b> ခု\n🟢 Active: <b>${active}</b> ခု\n📱 ချိတ်ဆက်စက်: <b>${boundTotal}</b> လုံး\n🌐 App: ${appUrl}\n\n💡 ဤ CSV ဖိုင်အား Excel သို့မဟုတ် Google Sheets တွင် တိုက်ရိုက်ဖွင့်၍ ဖုန်း သို့မဟုတ် ကွန်ပျူတာတွင် အလွယ်တကူ သိမ်းဆည်း ကြည့်ရှုနိုင်ပါသည်!`;

    const sent = await sendTelegramDocument(cfg.botToken, chatId, filename, csvContent, caption);
    if (!sent) {
      await sendTelegramMessage(cfg.botToken, chatId, `⚠️ CSV Document ပေးပို့ရာတွင် အခက်အခဲရှိပါက <code>/licenses</code> ဖြင့် စာရင်း ကြည့်ရှုနိုင်ပါသည်။`, 'HTML');
    }
    return;
  }

  // Shorthand quick duration commands: /1w, /1m, /3m, /6m, /1y, /life (and /gen, /generate, /gen1w...)
  const shorthandDurationMap: Record<string, '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime'> = {
    '/1w': '1_week',
    '/1week': '1_week',
    '/gen1w': '1_week',
    '/gen_1w': '1_week',
    '/1m': '1_month',
    '/1month': '1_month',
    '/gen1m': '1_month',
    '/gen_1m': '1_month',
    '/3m': '3_months',
    '/3months': '3_months',
    '/gen3m': '3_months',
    '/gen_3m': '3_months',
    '/6m': '6_months',
    '/6months': '6_months',
    '/gen6m': '6_months',
    '/gen_6m': '6_months',
    '/1y': '1_year',
    '/1year': '1_year',
    '/gen1y': '1_year',
    '/gen_1y': '1_year',
    '/life': 'lifetime',
    '/lifetime': 'lifetime',
    '/genlife': 'lifetime',
    '/gen_life': 'lifetime'
  };
  const fixedDuration = shorthandDurationMap[cmd];

  if (cmd === '/gen' || cmd === '/generate' || fixedDuration) {
    const parsed = parseTelegramGenArgs(parts.slice(1), fixedDuration);

    // NEVER silently default to 1_month if duration was missing or invalid — show quick inline duration picker buttons!
    if (!parsed.duration) {
      const pendingId = Math.random().toString(36).substring(2, 8);
      const pendingName = parsed.customerName || 'Engineer Customer';
      const escapedPendingName = pendingName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      pendingGenPrompts.set(pendingId, {
        customerName: pendingName,
        deviceLimit: parsed.deviceLimit,
        createdAt: Date.now()
      });
      if (pendingGenPrompts.size > 200) {
        const oldest = pendingGenPrompts.keys().next().value;
        if (oldest) pendingGenPrompts.delete(oldest);
      }

      const warnMsg = parsed.customerName
        ? `⏳ <b>${escapedPendingName}</b> အတွက် သက်တမ်း (Duration) ကို အောက်ပါခလုတ်များမှ တိုက်ရိုက်ရွေးချယ်နိုင်ပါသည် (သို့မဟုတ် <code>/gen ${escapedPendingName} 1w 1</code> ပုံစံဖြင့် ရိုက်ပို့ပါ):`
        : `⚠️ <b>သက်တမ်း (1w / 1m / 3m / 6m / 1y / life) ကို ထည့်သွင်းပေးပါ!</b>\n\n📌 <b>ဥပမာများ:</b>\n• <code>/gen Ko Aung 1w 1</code> (၁ ပတ်)\n• <code>/gen Ko Aung 1m 1</code> (၁ လ)\n• <code>/gen Ko Aung 3m 2</code> (၃ လ - ၂ လုံး)\n• <code>/gen Ko Aung 1y 1</code> (၁ နှစ်)\n• <code>/1w Ko Aung</code> (အမြန်ထုတ်နည်း)\n\n👇 သို့မဟုတ် အောက်ပါခလုတ်ဖြင့် တိုက်ရိုက်ထုတ်နိုင်ပါသည်:`;

      await sendTelegramMessage(cfg.botToken, chatId, warnMsg, 'HTML', {
        inline_keyboard: [
          [
            { text: '🗓 1 Week (7d)', callback_data: `qgen:${pendingId}:1_week:${parsed.deviceLimit}` },
            { text: '🗓 1 Month (30d)', callback_data: `qgen:${pendingId}:1_month:${parsed.deviceLimit}` }
          ],
          [
            { text: '🗓 3 Months (90d)', callback_data: `qgen:${pendingId}:3_months:${parsed.deviceLimit}` },
            { text: '🗓 6 Months (180d)', callback_data: `qgen:${pendingId}:6_months:${parsed.deviceLimit}` }
          ],
          [
            { text: '🗓 1 Year (365d)', callback_data: `qgen:${pendingId}:1_year:${parsed.deviceLimit}` },
            { text: '♾ Lifetime (10y)', callback_data: `qgen:${pendingId}:lifetime:${parsed.deviceLimit}` }
          ]
        ]
      });
      return;
    }

    const fromLabel = msg.from?.username ? `@${msg.from.username}` : fromName;
    await generateAndSendTelegramLicense(
      cfg,
      chatId,
      fromLabel,
      parsed.customerName || 'Engineer Customer',
      parsed.duration,
      parsed.deviceLimit
    );
    return;
  }

  if (cmd === '/licenses') {
    const list = await pullAndMergeLicensesFromSupabase();
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
    await sendTelegramMessage(cfg.botToken, chatId, reply, 'HTML', {
      inline_keyboard: [
        [
          { text: '☀️ Open Solar Pro', web_app: { url: appUrl } }
        ]
      ]
    });
    return;
  }

  if (cmd === '/stats') {
    const list = await pullAndMergeLicensesFromSupabase();
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
🌐 Public GitHub App: ${appUrl}
💾 Server Uptime: Online`;
    await sendTelegramMessage(cfg.botToken, chatId, statsMsg, 'HTML', {
      inline_keyboard: [
        [
          { text: '☀️ Open Solar Pro', web_app: { url: appUrl } }
        ]
      ]
    });
    return;
  }

  // Fallback help
  await sendTelegramMessage(
    cfg.botToken, 
    chatId, 
    `💡 လိုင်စင်ထုတ်ယူရန် <code>/gen &lt;နာမည်&gt; &lt;1w|1m|3m|6m|1y|life&gt; [1|2]</code> ဟု ရိုက်ပို့ပါခင်ဗျာ။\nဥပမာ: <code>/gen Ko Aung 1w 1</code> သို့မဟုတ် <code>/1w Ko Aung 1</code>\n🌐 App Link ရယူရန် <code>/app</code> ဟု ပို့ပေးပါ။`,
    'HTML',
    {
      inline_keyboard: [
        [
          { text: '☀️ Open Solar Pro', web_app: { url: appUrl } }
        ]
      ]
    }
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

// Telegram Test Ping & Sync
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
    const appUrl = getPublicAppUrl();

    // 2. Automatically sync Telegram Web App Menu button & Profile to point to GitHub Pages URL
    await syncTelegramBotProfileAndMenu(token, appUrl);

    if (chatId) {
      // 3. Send test message with inline buttons
      const sendRes = await sendTelegramMessage(
        token, 
        chatId, 
        `✅ <b>UNIQUE SOLAR PRO - Connection Success!</b> ⚡️\nBot: @${botUsername}\n🌐 <b>GitHub Pages App:</b> ${appUrl}\nStatus: Online & Ready to generate license links!`,
        'HTML',
        {
          inline_keyboard: [
            [
              { text: '☀️ Open Solar Pro (Web App)', web_app: { url: appUrl } },
              { text: '🌐 Direct Browser Link', url: appUrl }
            ]
          ]
        }
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
      appUrl,
      message: chatId 
        ? `Bot @${botUsername} သို့ ချိတ်ဆက်မှု အောင်မြင်ပြီး Chat ID: ${chatId} သို့ စာတို ပို့ဆောင်ပြီးပါပြီ!`
        : `Bot @${botUsername} အတည်ပြုပြီးပါပြီ!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Telegram test failed' });
  }
});

// Sync Telegram Menu button & commands with GitHub Pages URL
app.post("/api/telegram/sync-menu", async (req, res) => {
  try {
    const cfg = memoryStorage["telegram_bot"];
    if (!cfg || !cfg.botToken) {
      return res.status(400).json({ success: false, error: 'Telegram Bot is not configured yet' });
    }
    const appUrl = getPublicAppUrl();
    const result = await syncTelegramBotProfileAndMenu(cfg.botToken, appUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Sync failed' });
  }
});

// Telegram Webhook Handler (if user sets Telegram webhook)
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    const cfg = memoryStorage["telegram_bot"];
    if (cfg && cfg.enabled && req.body) {
      if (req.body.message) {
        await handleTelegramIncomingMessage(cfg, req.body.message);
      } else if (req.body.callback_query) {
        await handleTelegramCallbackQuery(cfg, req.body.callback_query);
      }
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
  const { url, anonKey } = getSupabaseRestConfig();
  res.json({
    success: true,
    config: {
      url,
      anonKey,
      isConnected: Boolean(url && anonKey)
    }
  });
});

app.post("/api/supabase-config", (req, res) => {
  const { url, anonKey } = req.body;
  const cleanUrl = normalizeServerSupabaseUrl(url);
  const cleanKey = isValidServerSupabaseAnonKey(anonKey) ? String(anonKey).trim() : DEFAULT_SUPABASE_ANON_KEY;
  const cfg = {
    url: cleanUrl,
    anonKey: cleanKey,
    isConnected: Boolean(cleanUrl && cleanKey)
  };
  memoryStorage["supabase_config"] = cfg;
  saveStorageToDisk();

  // Also update .env file if it exists so builds inherit clean credentials
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
app.post("/api/publish-update", async (req, res) => {
  const {
    note,
    inverters,
    panels,
    batteries,
    mountingDatabase,
    adminContact,
    adminResources,
    appBranding,
    paymentConfig,
    skipSupabaseMirror
  } = req.body;

  if (inverters && Array.isArray(inverters)) {
    memoryStorage["inverters"] = inverters;
    try {
      const pubDir = path.join(process.cwd(), "public", "data");
      const docsDir = path.join(process.cwd(), "docs", "data");
      if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(pubDir, "inverters.json"), JSON.stringify(inverters, null, 2), "utf-8");
      fs.writeFileSync(path.join(docsDir, "inverters.json"), JSON.stringify(inverters, null, 2), "utf-8");
    } catch (e) {}
  }
  if (panels && Array.isArray(panels)) {
    memoryStorage["panels"] = panels;
    try {
      const pubDir = path.join(process.cwd(), "public", "data");
      const docsDir = path.join(process.cwd(), "docs", "data");
      if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(pubDir, "panels.json"), JSON.stringify(panels, null, 2), "utf-8");
      fs.writeFileSync(path.join(docsDir, "panels.json"), JSON.stringify(panels, null, 2), "utf-8");
    } catch (e) {}
  }
  if (batteries && Array.isArray(batteries)) {
    memoryStorage["batteries"] = batteries;
  }
  if (mountingDatabase) {
    memoryStorage["mounting_database"] = mountingDatabase;
  }
  if (adminContact) {
    memoryStorage["admin_contact"] = adminContact;
  }
  if (adminResources && Array.isArray(adminResources)) {
    memoryStorage["resources"] = adminResources;
  }
  if (appBranding) {
    memoryStorage["app_branding"] = appBranding;
  }
  // IMPORTANT: Never overwrite `licenses` during Publish Live Update so active user boundDevices are never wiped
  if (paymentConfig) {
    memoryStorage["payment_config"] = paymentConfig;
  }

  saveStorageToDisk();

  const publishedAt = new Date().toISOString();
  const publishPayload = {
    publishedAt,
    inverters: memoryStorage["inverters"],
    panels: memoryStorage["panels"],
    batteries: memoryStorage["batteries"],
    resources: memoryStorage["resources"],
    mounting_database: memoryStorage["mounting_database"],
    admin_contact: memoryStorage["admin_contact"] || DEFAULT_INITIAL_ADMIN_CONTACT,
    app_branding: memoryStorage["app_branding"],
    payment_config: memoryStorage["payment_config"],
    note: note || "Admin published live update"
  };

  broadcastSSE("system_published", publishPayload);

  // Only mirror keys explicitly provided in req.body to Supabase (and skip if client already wrote directly to Supabase)
  if (!skipSupabaseMirror) {
    const cloudRows: Array<{ id: string; value: any; updated_at: string }> = [
      { id: "global_system_published", value: { publishedAt, note: publishPayload.note, timestamp: Date.now() }, updated_at: publishedAt }
    ];
    if (Array.isArray(inverters)) {
      cloudRows.push(
        { id: "global_custom_inverters", value: inverters, updated_at: publishedAt },
        { id: "inverters", value: inverters, updated_at: publishedAt }
      );
    }
    if (Array.isArray(panels)) {
      cloudRows.push(
        { id: "global_custom_panels", value: panels, updated_at: publishedAt },
        { id: "panels", value: panels, updated_at: publishedAt }
      );
    }
    if (Array.isArray(batteries)) {
      cloudRows.push({ id: "global_custom_batteries", value: batteries, updated_at: publishedAt });
    }
    if (mountingDatabase) {
      cloudRows.push({ id: "global_mounting_database", value: mountingDatabase, updated_at: publishedAt });
    }
    if (adminContact) {
      cloudRows.push(
        { id: "global_admin_contact", value: adminContact, updated_at: publishedAt },
        { id: "admin_contact_config", value: adminContact, updated_at: publishedAt }
      );
    }
    if (appBranding) {
      cloudRows.push({ id: "global_app_branding", value: appBranding, updated_at: publishedAt });
    }
    if (paymentConfig) {
      cloudRows.push({ id: "global_payment_config", value: paymentConfig, updated_at: publishedAt });
    }
    if (Array.isArray(adminResources)) {
      const lightResources = adminResources.map((r: any) => {
        if (r.fileData && String(r.fileData).startsWith("data:")) {
          upsertSupabaseAppSettings([{
            id: `resource_file_${r.id}`,
            value: { id: r.id, fileName: r.fileName, fileType: r.fileType, fileData: r.fileData },
            updated_at: publishedAt
          }]).catch(() => {});
          const { fileData: _ignored, ...meta } = r;
          return { ...meta, hasCloudFile: true };
        }
        return r;
      });
      cloudRows.push({ id: "global_admin_resources", value: lightResources, updated_at: publishedAt });
    }

    await upsertSupabaseAppSettings(cloudRows);
    broadcastSupabaseEvent("system_published", {
      publishedAt,
      note: publishPayload.note,
      timestamp: Date.now()
    }).catch(() => {});
  }

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
      hasCloudFile: Boolean(fileData),
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploadedBy || 'Admin',
      isPaidOnly: isPaidOnly !== false,
      downloadsCount: 0
    };

    const currentResources: any[] = memoryStorage["resources"] || [];
    memoryStorage["resources"] = [newResource, ...currentResources];
    saveStorageToDisk();

    broadcastSSE("resources", memoryStorage["resources"]);

    // Sync uploaded file & metadata to Supabase Cloud for GitHub Pages PRO users
    (async () => {
      if (fileData) {
        await upsertSupabaseAppSettings([{
          id: `resource_file_${id}`,
          value: { id, fileName: newResource.fileName, fileType: newResource.fileType, fileData }
        }]);
      }
      const lightResources = memoryStorage["resources"].map((r: any) => {
        const { fileData: _ignored, ...meta } = r;
        return meta;
      });
      await upsertSupabaseAppSettings([{ id: "global_admin_resources", value: lightResources }]);
      await broadcastSupabaseEvent("resources_changed", { count: lightResources.length, timestamp: Date.now() });
    })().catch(() => {});

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
    data = data.map((r: any) => {
      if (r.fileData && r.fileData.length > 50) {
        saveResourceFileToDisk(r.id, r.fileData);
      }
      return {
        ...r,
        fileUrl: r.fileUrl || `/api/files/${r.id}`
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

  // Also mirror key updates to Supabase Cloud for live GitHub Pages sync
  (async () => {
    const nowIso = new Date().toISOString();
    if (key === "inverters") {
      await upsertSupabaseAppSettings([
        { id: "global_custom_inverters", value: data, updated_at: nowIso },
        { id: "inverters", value: data, updated_at: nowIso }
      ]);
      await broadcastSupabaseEvent("inverters_changed", { count: Array.isArray(data) ? data.length : 0, timestamp: Date.now() });
    } else if (key === "panels") {
      await upsertSupabaseAppSettings([
        { id: "global_custom_panels", value: data, updated_at: nowIso },
        { id: "panels", value: data, updated_at: nowIso }
      ]);
      await broadcastSupabaseEvent("panels_changed", { count: Array.isArray(data) ? data.length : 0, timestamp: Date.now() });
    } else if (key === "batteries") {
      await upsertSupabaseAppSettings([{ id: "global_custom_batteries", value: data, updated_at: nowIso }]);
      await broadcastSupabaseEvent("batteries_changed", { count: Array.isArray(data) ? data.length : 0, timestamp: Date.now() });
    } else if (key === "mounting_database") {
      await upsertSupabaseAppSettings([{ id: "global_mounting_database", value: data, updated_at: nowIso }]);
      await broadcastSupabaseEvent("mounting_database_changed", { timestamp: Date.now() });
    } else if (key === "app_branding") {
      await upsertSupabaseAppSettings([{ id: "global_app_branding", value: data, updated_at: nowIso }]);
      await broadcastSupabaseEvent("app_branding_changed", { timestamp: Date.now() });
    } else if (key === "payment_config") {
      await upsertSupabaseAppSettings([{ id: "global_payment_config", value: data, updated_at: nowIso }]);
      await broadcastSupabaseEvent("payment_config_changed", { timestamp: Date.now() });
    } else if (key === "payment_records") {
      await upsertSupabaseAppSettings([{ id: "global_payment_records", value: data, updated_at: nowIso }]);
      await broadcastSupabaseEvent("payment_records_changed", { timestamp: Date.now() });
    } else if (key === "spec_requests") {
      await upsertSupabaseAppSettings([{ id: "global_spec_requests", value: data, updated_at: nowIso }]);
      await broadcastSupabaseEvent("spec_requests_changed", { timestamp: Date.now() });
    } else if (key === "resources" && Array.isArray(data)) {
      const lightResources = data.map((r: any) => {
        if (r.fileData && String(r.fileData).startsWith("data:")) {
          upsertSupabaseAppSettings([{
            id: `resource_file_${r.id}`,
            value: { id: r.id, fileName: r.fileName, fileType: r.fileType, fileData: r.fileData },
            updated_at: nowIso
          }]).catch(() => {});
          const { fileData: _ignored, ...meta } = r;
          return { ...meta, hasCloudFile: true };
        }
        return r;
      });
      await upsertSupabaseAppSettings([{ id: "global_admin_resources", value: lightResources, updated_at: nowIso }]);
      await broadcastSupabaseEvent("resources_changed", { count: lightResources.length, timestamp: Date.now() });
    } else if (key === "licenses") {
      await syncLicensesToSupabase(data);
    } else if (key === "admin_contact") {
      await upsertSupabaseAppSettings([
        { id: "global_admin_contact", value: data, updated_at: nowIso },
        { id: "admin_contact_config", value: data, updated_at: nowIso }
      ]);
      await broadcastSupabaseEvent("admin_contact_changed", { timestamp: Date.now() });
    }
  })().catch(() => {});

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
    syncAllDataFromSupabaseOnStartup().catch(() => {});
    startTelegramPolling();
  });
}

startServer();
