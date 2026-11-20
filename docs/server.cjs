var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var portArgIndex = process.argv.indexOf("--port");
var portFromArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : NaN;
var PORT = !isNaN(portFromArg) ? portFromArg : Number(process.env.PORT) || 3e3;
var hostArgIndex = process.argv.indexOf("--host");
var HOST = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : "0.0.0.0";
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
var sseClients = /* @__PURE__ */ new Set();
function broadcastSSE(type, data) {
  const payload = `event: message
data: ${JSON.stringify({ type, data, timestamp: Date.now() })}

`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}
var DEFAULT_SUPABASE_URL = "https://vkiwylrerryidoiyqeqh.supabase.co";
var DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraXd5bHJlcnJ5aWRvaXlxZXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDE3NDMsImV4cCI6MjEwMjcxNzc0M30.skGou_-7bKiDdW4lhfEqkywHzvj3mZT9-N_PTED7Rtc";
function normalizeServerSupabaseUrl(rawUrl) {
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
function isValidServerSupabaseAnonKey(rawKey) {
  const k = String(rawKey || "").trim();
  if (!k || k.length < 30) return false;
  if (/^https?:\/\//i.test(k) || k.includes("supabase.com/dashboard")) return false;
  return k.startsWith("eyJ") || k.startsWith("sb_publishable_") || k.startsWith("sb_secret_");
}
function getSupabaseRestConfig() {
  const storedCfg = memoryStorage?.["supabase_config"];
  const candidateUrl = storedCfg?.url || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const candidateKey = storedCfg?.anonKey || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return {
    url: normalizeServerSupabaseUrl(candidateUrl),
    anonKey: isValidServerSupabaseAnonKey(candidateKey) ? String(candidateKey).trim() : DEFAULT_SUPABASE_ANON_KEY
  };
}
async function upsertSupabaseAppSettings(rows) {
  if (!rows || rows.length === 0) return true;
  try {
    const { url, anonKey } = getSupabaseRestConfig();
    if (!url || !anonKey) return false;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const payload = rows.map((r) => ({
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
      signal: AbortSignal.timeout(12e3)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("Supabase upsert app_settings warning:", res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase upsert app_settings error:", err?.message || err);
    return false;
  }
}
async function fetchSupabaseAppSetting(id) {
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
        signal: AbortSignal.timeout(5e3)
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].value;
    }
    return null;
  } catch (err) {
    return null;
  }
}
async function broadcastSupabaseEvent(event, payload) {
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
      signal: AbortSignal.timeout(5e3)
    });
  } catch (err) {
  }
}
async function syncLicensesToSupabase(licenses) {
  const safeList = Array.isArray(licenses) ? licenses : [];
  await upsertSupabaseAppSettings([
    { id: "global_licenses", value: safeList, updated_at: (/* @__PURE__ */ new Date()).toISOString() }
  ]);
  await broadcastSupabaseEvent("licenses_changed", {
    count: safeList.length,
    timestamp: Date.now()
  });
}
async function pullAndMergeLicensesFromSupabase() {
  const localList = Array.isArray(memoryStorage["licenses"]) ? memoryStorage["licenses"] : [];
  const cloudList = await fetchSupabaseAppSetting("global_licenses");
  if (!Array.isArray(cloudList)) {
    if (localList.length > 0) {
      syncLicensesToSupabase(localList).catch(() => {
      });
    }
    return localList;
  }
  const map = /* @__PURE__ */ new Map();
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
      const cloudDevs = Array.isArray(existing.boundDevices) ? existing.boundDevices : [];
      const localDevs = Array.isArray(localItem.boundDevices) ? localItem.boundDevices : [];
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
    syncLicensesToSupabase(merged).catch(() => {
    });
  }
  return merged;
}
async function syncAllDataFromSupabaseOnStartup() {
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
    const inParam = `(${ids.map((id) => `"${id}"`).join(",")})`;
    const res = await fetch(
      `${url}/rest/v1/app_settings?id=in.${encodeURIComponent(inParam)}&select=id,value,updated_at`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Cache-Control": "no-cache"
        },
        signal: AbortSignal.timeout(8e3)
      }
    );
    if (!res.ok) return;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return;
    const map = {};
    for (const r of rows) {
      if (r && r.id) map[r.id] = r.value;
    }
    let changed = false;
    const writeStaticJson = (filename, data) => {
      try {
        const pubDir = import_path.default.join(process.cwd(), "public", "data");
        const docsDir = import_path.default.join(process.cwd(), "docs", "data");
        if (!import_fs.default.existsSync(pubDir)) import_fs.default.mkdirSync(pubDir, { recursive: true });
        if (!import_fs.default.existsSync(docsDir)) import_fs.default.mkdirSync(docsDir, { recursive: true });
        import_fs.default.writeFileSync(import_path.default.join(pubDir, filename), JSON.stringify(data, null, 2), "utf-8");
        import_fs.default.writeFileSync(import_path.default.join(docsDir, filename), JSON.stringify(data, null, 2), "utf-8");
      } catch (e) {
      }
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
  } catch (err) {
    console.warn("Startup Supabase sync notice:", err?.message || err);
  }
}
var activeSessions = /* @__PURE__ */ new Map();
function getActiveSessionsList() {
  const now = Date.now();
  const list = [];
  for (const [sessId, session] of activeSessions.entries()) {
    if (now - session.lastPing < 15e3) {
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
setInterval(() => {
  const beforeCount = activeSessions.size;
  const list = getActiveSessionsList();
  if (list.length !== beforeCount) {
    broadcastPresenceUpdate();
  }
}, 4e3);
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var UPLOADS_DIR = import_path.default.join(DATA_DIR, "uploads");
var STORAGE_FILE = import_path.default.join(DATA_DIR, "app_storage.json");
var BACKUP_STORAGE_FILE = import_path.default.join(DATA_DIR, "app_storage.backup.json");
try {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(UPLOADS_DIR)) {
    import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create data directory:", err);
}
function saveResourceFileToDisk(resourceId, fileData) {
  try {
    if (!fileData) return "";
    let base64Content = fileData;
    if (fileData.includes(";base64,")) {
      base64Content = fileData.split(";base64,")[1];
    }
    const buffer = Buffer.from(base64Content, "base64");
    const filePath = import_path.default.join(UPLOADS_DIR, `${resourceId}`);
    import_fs.default.writeFileSync(filePath, buffer);
    return `/api/files/${resourceId}`;
  } catch (err) {
    console.warn(`Could not write file ${resourceId} to disk:`, err);
    return "";
  }
}
var memoryStorage = {};
var DEFAULT_INITIAL_RESOURCES = [
  {
    id: "res_1",
    title: "Solar String Voltage & Temperature Coefficient Guide (Myanmar Version)",
    description: "Comprehensive calculation formulas for Voc at -10\xB0C to +45\xB0C with safety buffer rules for Deye, Growatt, and Huawei inverters.",
    category: "guide",
    fileName: "Solar_String_Sizing_Engineering_Guide_MM.pdf",
    fileSize: "2.4 MB",
    fileType: "application/pdf",
    uploadedAt: new Date(Date.now() - 864e5 * 3).toISOString(),
    uploadedBy: "SolarTech Admin",
    isPaidOnly: true,
    downloadsCount: 142
  },
  {
    id: "res_2",
    title: "Full Inverter Database CSV (Deye, Huawei, Growatt, Solis, Sungrow, SRNE)",
    description: "Bulk CSV import data containing 45+ commercial & residential inverters ready for offline and online sizing.",
    category: "database_csv",
    fileName: "Myanmar_Solar_Inverters_Database_2026.csv",
    fileSize: "185 KB",
    fileType: "text/csv",
    uploadedAt: new Date(Date.now() - 864e5 * 5).toISOString(),
    uploadedBy: "SolarTech Admin",
    isPaidOnly: true,
    downloadsCount: 310
  },
  {
    id: "res_3",
    title: "N-Type TOPCon & Bifacial Panel Datasheet Specifications Pack",
    description: "Electrical performance curves, temperature coefficients, and NOCT ratings for Jinko Tiger Neo, Longi Hi-MO, JA Solar, and Trina Vertex.",
    category: "datasheet",
    fileName: "TOPCon_Bifacial_Panels_Spec_Pack.pdf",
    fileSize: "4.8 MB",
    fileType: "application/pdf",
    uploadedAt: new Date(Date.now() - 864e5 * 7).toISOString(),
    uploadedBy: "SolarTech Admin",
    isPaidOnly: true,
    downloadsCount: 98
  },
  {
    id: "res_4",
    title: "Standard Hybrid Inverter DC/AC Single Line Wiring Diagram (SLD)",
    description: "Standard single-line diagram with surge protector (SPD), DC circuit breakers, grounding layout, and string combiner box wiring.",
    category: "diagram",
    fileName: "Hybrid_Solar_SLD_Wiring_Schematic.pdf",
    fileSize: "3.1 MB",
    fileType: "application/pdf",
    uploadedAt: new Date(Date.now() - 864e5 * 10).toISOString(),
    uploadedBy: "SolarTech Admin",
    isPaidOnly: true,
    downloadsCount: 224
  }
];
var DEFAULT_INITIAL_INVERTERS = [
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
    maxDcVoltage: 1e3,
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
    maxDcVoltage: 1e3,
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
    maxDcInputWatt: 39e3,
    vmpMin: 150,
    vmpMax: 850,
    nominalVoltage: 600,
    maxDcVoltage: 1e3,
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
    maxDcInputWatt: 65e3,
    vmpMin: 150,
    vmpMax: 850,
    nominalVoltage: 600,
    maxDcVoltage: 1e3,
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
    maxDcInputWatt: 26e3,
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
    maxDcVoltage: 1e3,
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
    maxDcVoltage: 1e3,
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
    maxDcVoltage: 1e3,
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
    maxDcInputWatt: 26e3,
    vmpMin: 200,
    vmpMax: 850,
    nominalVoltage: 620,
    maxDcVoltage: 1e3,
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
    maxDcInputWatt: 65e3,
    vmpMin: 200,
    vmpMax: 850,
    nominalVoltage: 620,
    maxDcVoltage: 1e3,
    mppt: 4,
    stringPerMppt: "2+2+2+2",
    imp: "30+30+30+30",
    isc: "38+38+38+38"
  }
];
var DEFAULT_INITIAL_PANELS = [
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
var DEFAULT_INITIAL_PAYMENT_CONFIG = {
  merchantName: "Solar Tech Myanmar",
  merchantPhone: "09 798 123 456",
  amount: 1e4,
  currency: "MMK",
  planName: "Solar String Sizer Pro (Lifetime)",
  autoApproveMinutes: 0,
  accounts: [
    {
      id: "acc_kbzpay_1",
      provider: "kbzpay",
      payName: "KBZPay (KPay)",
      accountName: "U Aung Myo Oo (Solar Tech)",
      accountNumber: "09 798 123 456",
      isActive: true,
      colorTheme: "blue"
    }
  ]
};
var DEFAULT_INITIAL_ADMIN_CONTACT = {
  viberPhone: "09 403 708 145",
  viberUrl: "viber://chat?number=09403708145",
  telegramUsername: "uniquesolarpro",
  telegramUrl: "https://t.me/uniquesolarpro",
  customAppUrl: "https://solartechse3-cmyk.github.io/uniquesolarsizing1",
  noteMy: "Viber \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A Telegram \u1010\u103D\u1004\u103A \u1006\u1000\u103A\u101E\u103D\u101A\u103A\u104D 1 Week, 1 Month, 3 Months PRO License Link \u101B\u101A\u1030\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A",
  noteEn: "Contact via Viber or Telegram to purchase 1 Week, 1 Month, 3 Months PRO License Link"
};
var DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG = {
  enabled: true,
  botToken: "9212139270:AAEHgyL2ur0c_N1dW-uYkBhvdgYoRDUCuDk",
  botUsername: "UniqueSolarProLicenseBot",
  adminChatId: "1715154450",
  notifyOnActivation: true,
  notifyOnPayment: true,
  lastTestedAt: "2026-11-05T14:11:49.716Z"
};
var DEFAULT_INITIAL_SPEC_REQUESTS = [
  {
    id: "spec_1",
    senderName: "U Kyaw Swar (Yangon Solar)",
    senderPhone: "09 795 443 211",
    brand: "Must Solar",
    model: "PH18-5248 PRO (5.2kW)",
    category: "inverter",
    specDetails: "Max DC Voltage: 450V, MPPT Range: 150V - 430V, Max PV Input: 5500W, Max Current: 18A. Please add to default list.",
    submittedAt: new Date(Date.now() - 864e5 * 2).toISOString(),
    status: "added",
    adminReply: "Added to the standard inverter database list. Thank you for the contribution!",
    repliedAt: new Date(Date.now() - 864e5 * 1).toISOString()
  },
  {
    id: "spec_2",
    senderName: "Ko Min Min",
    senderPhone: "09 450 112 889",
    brand: "Trina Solar",
    model: "Vertex S+ 445W (NEG9R.28)",
    category: "panel",
    specDetails: "Voc: 52.6V, Vmp: 44.3V, Isc: 10.71A, Imp: 10.05A. TOPCon dual-glass lightweight.",
    submittedAt: new Date(Date.now() - 864e5 * 1).toISOString(),
    status: "reviewed",
    adminReply: "Verified against Trina datasheet. Will be added in next batch.",
    repliedAt: new Date(Date.now() - 36e5 * 4).toISOString()
  }
];
function loadStorageFromDisk() {
  let loaded = false;
  try {
    if (import_fs.default.existsSync(STORAGE_FILE)) {
      const raw = import_fs.default.readFileSync(STORAGE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memoryStorage = parsed;
        loaded = true;
      }
    }
  } catch (err) {
    console.warn("Could not read app_storage.json, trying backup:", err);
  }
  if (!loaded) {
    try {
      if (import_fs.default.existsSync(BACKUP_STORAGE_FILE)) {
        const rawBackup = import_fs.default.readFileSync(BACKUP_STORAGE_FILE, "utf-8");
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
    memoryStorage["resources"] = memoryStorage["resources"].map((res) => {
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
      version: "2026.1",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      publishedBy: "SolarTech Engineering Division (Admin)",
      isOnlineLive: true,
      panels: [
        { id: "panel_longi_585", brand: "Longi Solar", model: "Hi-MO 6 Explorer LR5-72HTH-585M", watt: 585, lengthMm: 2278, widthMm: 1134, thicknessMm: 35, weightKg: 27.5, cellType: "HPBC N-Type Mono", voc: 52.26, vmp: 43.88, imp: 13.34, isc: 14.15, efficiency: 22.6, priceMmk: 285e3 },
        { id: "panel_jinko_585", brand: "Jinko Solar", model: "Tiger Neo N-Type JKM585N-72HL4-V", watt: 585, lengthMm: 2278, widthMm: 1134, thicknessMm: 30, weightKg: 28, cellType: "TOPCon Bifacial", voc: 51.9, vmp: 43.8, imp: 13.36, isc: 14.15, efficiency: 22.65, priceMmk: 29e4 },
        { id: "panel_ja_575", brand: "JA Solar", model: "DeepBlue 4.0 Pro JAM72D40-575/GB", watt: 575, lengthMm: 2278, widthMm: 1134, thicknessMm: 30, weightKg: 27.8, cellType: "Bycium+ TOPCon Mono", voc: 51.5, vmp: 43.2, imp: 13.31, isc: 14.02, efficiency: 22.3, priceMmk: 275e3 },
        { id: "panel_trina_580", brand: "Trina Solar", model: "Vertex TSM-DEG19RC.20-580W", watt: 580, lengthMm: 2384, widthMm: 1134, thicknessMm: 30, weightKg: 29.5, cellType: "210mm Vertex TOPCon", voc: 45.4, vmp: 38.3, imp: 15.15, isc: 15.98, efficiency: 22.2, priceMmk: 28e4 },
        { id: "panel_canadian_550", brand: "Canadian Solar", model: "HiKu6 CS6W-550MS Mono-PERC", watt: 550, lengthMm: 2278, widthMm: 1134, thicknessMm: 35, weightKg: 27.6, cellType: "Mono-PERC Half-Cell", voc: 49.6, vmp: 41.7, imp: 13.19, isc: 14, efficiency: 21.3, priceMmk: 26e4 },
        { id: "panel_trina_670", brand: "Trina Solar", model: "Vertex TSM-DEG21C.20 670W Ultra", watt: 670, lengthMm: 2384, widthMm: 1303, thicknessMm: 35, weightKg: 33.7, cellType: "210mm Ultra Bifacial", voc: 45.7, vmp: 38.2, imp: 17.55, isc: 18.62, efficiency: 21.6, priceMmk: 34e4 }
      ],
      roofComponents: [
        { id: "rf_rail_4200", nameMy: "\u1021\u101C\u1030\u1019\u102E\u1014\u102E\u101A\u1019\u103A \u101B\u1011\u102C\u1038\u101C\u1019\u103A\u1038\u1018\u102C\u1038 \u1044.\u1042 \u1019\u102E\u1010\u102C", nameEn: "Anodized Aluminum Guide Rail (4200mm)", category: "rail", specs: "AL6005-T5 Anodized \u226512\u03BCm", unit: "\u1001\u103B\u1031\u102C\u1004\u103A\u1038 (Bars)", unitPrice: 48e3, notes: "Main rail for roof mounting" },
        { id: "rf_l_feet_kit", nameMy: "\u101E\u103D\u1015\u103A\u1019\u102D\u102F\u1038 L-Feet \u1001\u103C\u1031\u1011\u1031\u102C\u1000\u103A\u1010\u103D\u1032 \u1021\u1005\u102F\u1036", nameEn: "Roof L-Feet Bracket Mount Kit", category: "bracket", specs: "AL6005-T5 + SUS304 + EPDM Pad", unit: "\u1005\u102F\u1036 (Sets)", unitPrice: 6500, notes: "Tin/corrugated roof bracket" },
        { id: "rf_kliplok_clamp", nameMy: "\u1016\u1031\u102C\u1000\u103A\u101B\u1014\u103A\u1019\u101C\u102D\u102F\u101E\u1031\u102C \u1001\u1031\u102B\u1004\u103A\u1019\u102D\u102F\u1038\u100A\u103E\u1015\u103A Klip-Lok Clamp", nameEn: "Non-Penetrative Standing Seam Clamp", category: "bracket", specs: "High Tensile Aluminum + SUS304 Grub Screws", unit: "\u1001\u102F (Pcs)", unitPrice: 9500, notes: "Zero penetration commercial seam clamp" },
        { id: "rf_tile_hook", nameMy: "\u1000\u103C\u103D\u1031\u1015\u103C\u102C\u1038/\u1021\u102F\u1010\u103A\u1000\u103C\u103D\u1015\u103A\u1019\u102D\u102F\u1038 \u1001\u103B\u102D\u1010\u103A\u1000\u1031\u102C\u1000\u103A SUS304", nameEn: "Stainless Steel Tile Roof Hook SUS304", category: "bracket", specs: "SUS304 Heavy Duty 4.0mm", unit: "\u1001\u102F (Pcs)", unitPrice: 12500, notes: "Under-tile rafter hook" },
        { id: "rf_mid_clamp", nameMy: "\u1006\u102D\u102F\u101C\u102C\u1015\u103C\u102C\u1038\u1000\u103C\u102C\u1038\u100A\u103E\u1015\u103A Mid Clamp (30-35mm)", nameEn: "Adjustable Solar Mid Clamp Kit", category: "clamp", specs: "AL6005-T5 + M8 Bolt + Grounding Clip", unit: "\u1001\u102F (Pcs)", unitPrice: 2800, notes: "Mid-module clamping" },
        { id: "rf_end_clamp", nameMy: "\u1006\u102D\u102F\u101C\u102C\u1015\u103C\u102C\u1038\u1021\u1005\u103D\u1014\u103A\u1038\u100A\u103E\u1015\u103A End Clamp", nameEn: "Universal Solar End Clamp (30-35mm)", category: "clamp", specs: "AL6005-T5 + SUS304 M8 Bolt", unit: "\u1001\u102F (Pcs)", unitPrice: 3200, notes: "Boundary terminal clamp" },
        { id: "rf_rail_splice", nameMy: "\u101B\u1011\u102C\u1038\u101C\u1019\u103A\u1038\u1018\u102C\u1038 \u1006\u1000\u103A\u1021\u1036\u1000\u101C\u1005\u103A Splice Connector", nameEn: "Internal Rail Splice Joiner (200mm)", category: "splice", specs: "AL6005-T5 + Fasteners", unit: "\u1001\u102F (Pcs)", unitPrice: 4500, notes: "Rail extension joint" },
        { id: "rf_ground_lug", nameMy: "\u1019\u103C\u1031\u1005\u102D\u102F\u1000\u103A\u1000\u103C\u102D\u102F\u1038\u1001\u103B\u102D\u1010\u103A Grounding Lug", nameEn: "Tinned Copper Grounding Lug Kit", category: "grounding", specs: "Tinned Copper / Stainless Steel Earthing", unit: "\u1001\u102F (Pcs)", unitPrice: 4500, notes: "Array bonding" }
      ],
      groundComponents: [
        { id: "gm_rafter_3x1_5", nameMy: '\u1012\u102D\u102F\u1004\u103A\u1038\u1019\u1000\u103C\u102E\u1038 (3" \xD7 1 1/2" \xD7 2.5mm Hollow)', nameEn: 'Main Rafter Beam (3" \xD7 1 1/2" Hollow Tube)', category: "rafter", specs: "76\xD738\xD72.5mm HDG Box Tube (\u226565\u03BCm zinc)", unit: "\u1001\u103B\u1031\u102C\u1004\u103A\u1038 (Bars)", unitPrice: 145e3, material: "HDG Steel Q235B", notes: "Main rafter beam" },
        { id: "gm_column_4u", nameMy: '\u1011\u1031\u102C\u1000\u103A\u1010\u102D\u102F\u1004\u103A (4" U-Channel 100\xD750\xD75mm)', nameEn: 'Beam Column (4" U-Channel Post)', category: "column", specs: "100\xD750\xD75mm Heavy Duty HDG U-Channel", unit: "\u1001\u103B\u1031\u102C\u1004\u103A\u1038 (Posts)", unitPrice: 98e3, material: "HDG U-Steel Q235B", notes: "Support posts" },
        { id: "gm_cross_anchor", nameMy: '\u1000\u103C\u1000\u103A\u1001\u103C\u1031\u1001\u1010\u103A (1 1/2" \xD7 1 1/2" \xD7 2.0mm Hollow)', nameEn: 'Cross-Anchor Bracing (1 1/2" Square Tube)', category: "cross_anchor", specs: "38\xD738\xD72.0mm HDG Square Section Bracing", unit: "\u1001\u103B\u1031\u102C\u1004\u103A\u1038 (Bars)", unitPrice: 45e3, material: "HDG Square Tube Q235B", notes: "Diagonal X-bracing" },
        { id: "gm_purlin_1_5x1_5", nameMy: '\u1006\u102D\u102F\u101C\u102C\u1010\u1004\u103A\u1010\u1014\u103A\u1038 (1 1/2" \xD7 1 1/2" \xD7 2.0mm Hollow)', nameEn: 'Purlin Solar Rails (1 1/2" Square Tube)', category: "purlin", specs: "38\xD738\xD72.0mm HDG Square Box Tube Rails", unit: "\u1001\u103B\u1031\u102C\u1004\u103A\u1038 (Bars)", unitPrice: 68e3, material: "HDG Square Tube Q235B", notes: "Solar mounting rails" },
        { id: "gm_tie_beam", nameMy: '\u1021\u101C\u103B\u102C\u1038\u101C\u102D\u102F\u1000\u103A \u1006\u1000\u103A\u1010\u1014\u103A\u1038 (3" \xD7 1 1/2" Hollow)', nameEn: 'Longitudinal Tie Beam (3" \xD7 1 1/2")', category: "tie_beam", specs: "76\xD738\xD72.0mm HDG Box Section", unit: "\u1001\u103B\u1031\u102C\u1004\u103A\u1038 (Bars)", unitPrice: 58e3, material: "HDG Steel Q235B", notes: "Column linking" },
        { id: "gm_concrete_pier", nameMy: "\u1000\u103D\u1014\u103A\u1000\u101B\u1005\u103A \u1021\u102F\u1010\u103A\u1019\u103C\u1005\u103A\u1010\u102D\u102F\u1004\u103A (400\xD7400\xD7900mm)", nameEn: "Concrete Pier Footing (400\xD7400\xD7900mm)", category: "foundation", specs: "C25/30 Concrete + Rebar + M16 J-Bolts", unit: "\u1010\u102D\u102F\u1004\u103A (Piers)", unitPrice: 55e3, material: "Concrete & Rebar", notes: "Pier footing" },
        { id: "gm_ground_screw", nameMy: "\u1019\u103C\u1031\u1015\u103C\u1004\u103A\u1005\u102D\u102F\u1000\u103A \u101D\u1000\u103A\u1021\u1030\u1010\u102D\u102F\u1004\u103A (1600mm / 76mm Dia)", nameEn: "Ground Screw Anchor Pile (1600\xD776mm)", category: "foundation", specs: "Q235 HDG Continuous Helical Blades", unit: "\u1010\u102D\u102F\u1004\u103A (Screws)", unitPrice: 75e3, material: "HDG Steel Pile", notes: "Rammed pile" },
        { id: "gm_mid_clamp", nameMy: "\u1006\u102D\u102F\u101C\u102C\u1015\u103C\u102C\u1038\u1000\u103C\u102C\u1038\u100A\u103E\u1015\u103A Mid Clamp", nameEn: "Solar Mid Clamp Kit (Ground Mount)", category: "clamp", specs: "Aluminum / HDG Clamp + SUS304 Bolt", unit: "\u1001\u102F (Pcs)", unitPrice: 2800, material: "AL6005-T5 / SUS304", notes: "Inter-panel clamp" },
        { id: "gm_end_clamp", nameMy: "\u1006\u102D\u102F\u101C\u102C\u1015\u103C\u102C\u1038\u1021\u1005\u103D\u1014\u103A\u1038\u100A\u103E\u1015\u103A End Clamp", nameEn: "Solar End Clamp Kit (Ground Mount)", category: "clamp", specs: "Heavy Duty Clamp + SUS304 Bolt", unit: "\u1001\u102F (Pcs)", unitPrice: 3200, material: "AL6005-T5 / SUS304", notes: "Array edge clamp" },
        { id: "gm_hardware_pack", nameMy: "\u1010\u1015\u103A\u1006\u1004\u103A\u101B\u1031\u1038 \u1019\u1030\u101C\u102E\u104A \u1014\u1010\u103A\u1014\u103E\u1004\u1037\u103A \u1001\u103B\u102D\u1010\u103A\u1006\u1000\u103A\u1015\u103C\u102C\u1038 \u1021\u1005\u102F\u1036\u1011\u102F\u1015\u103A", nameEn: "Structural Fastener & Hardware Pack", category: "hardware", specs: "Grade 8.8 HDG M10/M12 Bolts + Gussets", unit: "\u1011\u102F\u1015\u103A (Packs)", unitPrice: 35e3, material: "HDG Grade 8.8 Steel", notes: "Assembly spares" }
      ]
    };
    needsSave = true;
  }
  if (memoryStorage["site_surveys"] !== void 0) {
    delete memoryStorage["site_surveys"];
    needsSave = true;
  }
  if (memoryStorage["load_calculations"] !== void 0) {
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
    import_fs.default.writeFileSync(STORAGE_FILE, dataStr, "utf-8");
    import_fs.default.writeFileSync(BACKUP_STORAGE_FILE, dataStr, "utf-8");
  } catch (err) {
    console.warn("Could not write app_storage.json to disk:", err);
  }
}
loadStorageFromDisk();
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
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
      lastActive: (/* @__PURE__ */ new Date()).toISOString(),
      startedAt: presence.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
      lastPing: Date.now()
    });
    if (isNew) {
      broadcastPresenceUpdate();
    }
  }
  const list = getActiveSessionsList();
  res.json({ success: true, count: list.length, presences: list });
});
app.post("/api/presence/leave", (req, res) => {
  try {
    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body);
    }
    const sessionId = body?.sessionId;
    if (sessionId && activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
      broadcastPresenceUpdate();
    }
  } catch (e) {
  }
  res.json({ success: true });
});
app.get("/api/presence", (req, res) => {
  const list = getActiveSessionsList();
  res.json({ success: true, count: list.length, presences: list });
});
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`event: connected
data: ${JSON.stringify({ status: "connected", time: Date.now() })}

`);
  const currentPresences = getActiveSessionsList();
  res.write(`event: message
data: ${JSON.stringify({
    type: "presence",
    data: { count: currentPresences.length, presences: currentPresences },
    timestamp: Date.now()
  })}

`);
  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
  });
});
app.post("/api/verify-payment", (req, res) => {
  const { query, phone, digits, sessionId } = req.body;
  const records = memoryStorage["payment_records"] || [];
  const matched = records.find((r) => {
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
      licenses: memoryStorage["licenses"] || []
    }
  });
});
function getPublicAppUrl() {
  const custom = memoryStorage["app_branding"]?.customAppUrl || memoryStorage["admin_contact"]?.customAppUrl;
  if (custom && typeof custom === "string" && custom.trim().startsWith("http")) {
    return custom.trim().replace(/\/+$/, "");
  }
  return "https://solartechse3-cmyk.github.io/uniquesolarsizing1";
}
async function autoSyncLicenseToGoogleSheet(lic) {
  try {
    const cfg = memoryStorage["sheet_config"];
    if (!cfg || !cfg.webhookUrl) return;
    const appUrl = getPublicAppUrl();
    const row = [
      memoryStorage["licenses"]?.length || 1,
      new Date(lic.createdAt).toLocaleString("en-US"),
      lic.customerName || "Valued Engineer",
      lic.duration || "1_month",
      `${lic.deviceLimit || 1} Device(s)`,
      lic.token,
      `${appUrl}/?license=${lic.token}`,
      lic.status || "active",
      new Date(lic.expiresAt).toLocaleDateString("en-US"),
      Array.isArray(lic.boundDevices) ? lic.boundDevices.length : 0,
      (/* @__PURE__ */ new Date()).toLocaleDateString("en-US"),
      lic.note || ""
    ];
    await fetch(cfg.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_licenses",
        sheetName: "PRO Licenses",
        rows: [row]
      }),
      signal: AbortSignal.timeout(5e3)
    });
  } catch (err) {
  }
}
function normalizeMyanmarDigits(str) {
  return String(str || "").replace(/[၀-၉]/g, (ch) => String(ch.charCodeAt(0) - 4160));
}
function parseDurationToken(raw) {
  const cleaned = normalizeMyanmarDigits(raw || "").trim().replace(/^[,.:;]+|[,.:;]+$/g, "").toLowerCase().replace(/[\s_\-]+/g, "");
  if (!cleaned) return null;
  if ([
    "1w",
    "1wk",
    "1wks",
    "week",
    "1week",
    "1weeks",
    "7d",
    "7day",
    "7days",
    "1\u1015\u1010\u103A",
    "\u1015\u1010\u103A",
    "7\u101B\u1000\u103A"
  ].includes(cleaned)) {
    return "1_week";
  }
  if ([
    "1m",
    "1mo",
    "1mon",
    "1mons",
    "month",
    "1month",
    "1months",
    "30d",
    "30day",
    "30days",
    "1\u101C",
    "30\u101B\u1000\u103A"
  ].includes(cleaned)) {
    return "1_month";
  }
  if ([
    "3m",
    "3mo",
    "3mon",
    "3mons",
    "3month",
    "3months",
    "90d",
    "90day",
    "90days",
    "3\u101C",
    "90\u101B\u1000\u103A"
  ].includes(cleaned)) {
    return "3_months";
  }
  if ([
    "6m",
    "6mo",
    "6mon",
    "6mons",
    "6month",
    "6months",
    "180d",
    "180day",
    "180days",
    "6\u101C",
    "180\u101B\u1000\u103A"
  ].includes(cleaned)) {
    return "6_months";
  }
  if ([
    "1y",
    "1yr",
    "1yrs",
    "year",
    "1year",
    "1years",
    "12m",
    "12mo",
    "12mon",
    "12month",
    "12months",
    "365d",
    "365day",
    "365days",
    "1\u1014\u103E\u1005\u103A",
    "\u1014\u103E\u1005\u103A",
    "12\u101C",
    "365\u101B\u1000\u103A"
  ].includes(cleaned)) {
    return "1_year";
  }
  if ([
    "life",
    "lifetime",
    "forever",
    "unlimited",
    "perm",
    "permanent",
    "10y",
    "10yr",
    "10year",
    "10years",
    "\u1010\u1005\u103A\u101E\u1000\u103A\u1010\u102C"
  ].includes(cleaned)) {
    return "lifetime";
  }
  return null;
}
function parseDeviceLimitToken(raw, allowBareNumber = true) {
  const cleaned = normalizeMyanmarDigits(raw || "").trim().replace(/^[,.:;]+|[,.:;]+$/g, "").toLowerCase().replace(/[\s_\-]+/g, "");
  if (!cleaned) return null;
  if (["1d", "1dev", "1device", "1devices", "1\u101C\u102F\u1036\u1038"].includes(cleaned)) return 1;
  if (["2d", "2dev", "2device", "2devices", "2\u101C\u102F\u1036\u1038"].includes(cleaned)) return 2;
  if (allowBareNumber && cleaned === "1") return 1;
  if (allowBareNumber && cleaned === "2") return 2;
  return null;
}
function parseTelegramGenArgs(rawArgs, fixedDuration) {
  const tokens = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const cur = rawArgs[i];
    const next = rawArgs[i + 1];
    if (cur && next) {
      const curNorm = normalizeMyanmarDigits(cur).trim().replace(/^[,.:;]+|[,.:;]+$/g, "").toLowerCase();
      const nextNorm = normalizeMyanmarDigits(next).trim().replace(/^[,.:;]+|[,.:;]+$/g, "").toLowerCase();
      const isNum = /^\d+$/.test(curNorm);
      const isDurUnit = [
        "w",
        "wk",
        "wks",
        "week",
        "weeks",
        "m",
        "mo",
        "mon",
        "mons",
        "month",
        "months",
        "y",
        "yr",
        "yrs",
        "year",
        "years",
        "day",
        "days",
        "\u1015\u1010\u103A",
        "\u101C",
        "\u1014\u103E\u1005\u103A",
        "\u101B\u1000\u103A"
      ].includes(nextNorm) || nextNorm === "d" && ["7", "30", "90", "180", "365"].includes(curNorm);
      const isDevUnit = ["dev", "device", "devices", "\u101C\u102F\u1036\u1038"].includes(nextNorm) || nextNorm === "d" && ["1", "2"].includes(curNorm);
      if (isNum && (isDurUnit || isDevUnit)) {
        tokens.push(`${curNorm}${nextNorm}`);
        i++;
        continue;
      }
    }
    tokens.push(cur);
  }
  let duration = fixedDuration || null;
  let durIdx = -1;
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
  let deviceLimit = 1;
  let devIdx = -1;
  if (durIdx !== -1 && durIdx + 1 < tokens.length) {
    const afterDur = parseDeviceLimitToken(tokens[durIdx + 1], true);
    if (afterDur !== null) {
      deviceLimit = afterDur;
      devIdx = durIdx + 1;
    }
  }
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
  const nameTokens = tokens.filter((_, idx) => idx !== durIdx && idx !== devIdx).map((t) => t.replace(/^,+|,+$/g, "")).filter(Boolean);
  const customerName = nameTokens.join(" ").trim();
  return { customerName, duration, deviceLimit };
}
var LICENSE_PLAN_SPECS = {
  "1_week": { code: "1W", days: 7, labelEn: "1 Week (7 Days)", labelMy: "\u1041 \u1015\u1010\u103A (\u1047 \u101B\u1000\u103A)" },
  "1_month": { code: "1M", days: 30, labelEn: "1 Month (30 Days)", labelMy: "\u1041 \u101C (\u101B\u1000\u103A \u1043\u1040)" },
  "3_months": { code: "3M", days: 90, labelEn: "3 Months (90 Days)", labelMy: "\u1043 \u101C (\u101B\u1000\u103A \u1049\u1040)" },
  "6_months": { code: "6M", days: 180, labelEn: "6 Months (180 Days)", labelMy: "\u1046 \u101C (\u1041\u1048\u1040 \u101B\u1000\u103A)" },
  "1_year": { code: "1Y", days: 365, labelEn: "1 Year (365 Days)", labelMy: "\u1041 \u1014\u103E\u1005\u103A (\u1043\u1046\u1045 \u101B\u1000\u103A)" },
  "lifetime": { code: "LIFE", days: 3650, labelEn: "Lifetime (10 Years)", labelMy: "\u1010\u1005\u103A\u101E\u1000\u103A\u1010\u102C (\u1041\u1040 \u1014\u103E\u1005\u103A)" }
};
var LICENSE_CODE_TO_DURATION = {
  "1W": "1_week",
  "1M": "1_month",
  "3M": "3_months",
  "6M": "6_months",
  "1Y": "1_year",
  "LIFE": "lifetime"
};
function randomKeySegment(len = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
function extractCanonicalLicenseToken(rawInput) {
  const str = String(rawInput || "").trim();
  const tokenMatch = str.match(/SOLAR-PRO-(1W|1M|3M|6M|1Y|LIFE)-(1D|2D)-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
  if (tokenMatch) return tokenMatch[0].toUpperCase();
  const paramMatch = str.match(/[?&]license=([A-Za-z0-9_-]+)/i);
  if (paramMatch && paramMatch[1]) return paramMatch[1].toUpperCase();
  return str.toUpperCase();
}
function normalizeServerLicenseRecord(lic) {
  if (!lic || typeof lic !== "object" || !lic.token) return lic;
  const tokenStr = String(lic.token).trim().toUpperCase();
  const match = tokenStr.match(/^SOLAR-PRO-(1W|1M|3M|6M|1Y|LIFE)-(1D|2D)-[A-Z0-9]{4}-[A-Z0-9]{4}$/i);
  if (!match) return lic;
  const expectedDuration = LICENSE_CODE_TO_DURATION[match[1].toUpperCase()];
  const expectedDevLimit = match[2].toUpperCase() === "2D" ? 2 : 1;
  if (!expectedDuration) return lic;
  const spec = LICENSE_PLAN_SPECS[expectedDuration];
  const currentDuration = parseDurationToken(lic.duration);
  const fixed = {
    ...lic,
    token: tokenStr,
    duration: expectedDuration,
    durationDays: spec.days,
    deviceLimit: expectedDevLimit
  };
  if (currentDuration !== expectedDuration && lic.createdAt && !lic.manuallyExtended) {
    const createdMs = new Date(lic.createdAt).getTime();
    if (!isNaN(createdMs)) {
      fixed.expiresAt = new Date(createdMs + spec.days * 864e5).toISOString();
    }
  }
  return fixed;
}
function generateLicenseRecord(customerName, duration, deviceLimit = 1, note) {
  const d = parseDurationToken(duration) || "1_month";
  const spec = LICENSE_PLAN_SPECS[d];
  const days = spec.days;
  const safeDeviceLimit = Number(deviceLimit) === 2 ? 2 : 1;
  const rand1 = randomKeySegment(4);
  const rand2 = randomKeySegment(4);
  const durCode = spec.code;
  const devCode = safeDeviceLimit === 2 ? "2D" : "1D";
  const token = `SOLAR-PRO-${durCode}-${devCode}-${rand1}-${rand2}`;
  const now = /* @__PURE__ */ new Date();
  const expires = new Date(now.getTime() + days * 864e5);
  const newLicense = {
    id: `lic_${Date.now()}_${randomKeySegment(4).toLowerCase()}`,
    token,
    customerName: (customerName || "").trim() || "Engineer Customer",
    duration: d,
    durationDays: days,
    deviceLimit: safeDeviceLimit,
    boundDevices: [],
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: "active",
    note: (note || "").trim()
  };
  const list = memoryStorage["licenses"] || [];
  memoryStorage["licenses"] = [newLicense, ...list];
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {
  });
  autoSyncLicenseToGoogleSheet(newLicense).catch(() => {
  });
  return newLicense;
}
app.post("/api/license/generate", (req, res) => {
  try {
    const { customerName, duration, deviceLimit, note } = req.body;
    const newLicense = generateLicenseRecord(customerName, duration, deviceLimit, note);
    return res.json({ success: true, license: newLicense });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to generate license" });
  }
});
app.post("/api/license/activate", async (req, res) => {
  try {
    const { token, deviceId, deviceModel } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: "Token is required" });
    }
    const cleanedToken = extractCanonicalLicenseToken(token);
    let list = (memoryStorage["licenses"] || []).map(normalizeServerLicenseRecord);
    let licIndex = list.findIndex(
      (l) => l.token.toUpperCase() === cleanedToken || l.id === cleanedToken || cleanedToken.includes(l.token.toUpperCase())
    );
    if (licIndex === -1) {
      list = (await pullAndMergeLicensesFromSupabase()).map(normalizeServerLicenseRecord);
      licIndex = list.findIndex(
        (l) => l.token.toUpperCase() === cleanedToken || l.id === cleanedToken || cleanedToken.includes(l.token.toUpperCase())
      );
    }
    if (licIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "not_found",
        message: "\u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1000\u102F\u1012\u103A \u1019\u103E\u102C\u1038\u101A\u103D\u1004\u103A\u1038\u1014\u1031\u1015\u102B\u101E\u100A\u103A\u104B Viber \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A Telegram \u1010\u103D\u1004\u103A Admin \u1021\u102C\u1038 \u1006\u1000\u103A\u101E\u103D\u101A\u103A\u1015\u102B (Invalid License Key)"
      });
    }
    const lic = normalizeServerLicenseRecord(list[licIndex]);
    list[licIndex] = lic;
    memoryStorage["licenses"] = list;
    if (lic.status === "revoked") {
      return res.status(403).json({
        success: false,
        error: "revoked",
        message: "\u1024\u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1000\u102D\u102F Admin \u1019\u103E \u1015\u102D\u1010\u103A\u1011\u102C\u1038\u1015\u102B\u101E\u100A\u103A (License Revoked)"
      });
    }
    const now = Date.now();
    if (new Date(lic.expiresAt).getTime() < now) {
      lic.status = "expired";
      saveStorageToDisk();
      broadcastSSE("licenses", memoryStorage["licenses"]);
      syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {
      });
      return res.status(403).json({
        success: false,
        error: "expired",
        message: "\u1024\u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A \u101E\u1000\u103A\u1010\u1019\u103A\u1038\u1000\u102F\u1014\u103A\u1006\u102F\u1036\u1038\u101E\u103D\u102C\u1038\u1015\u102B\u1015\u103C\u102E\u104B \u101E\u1000\u103A\u1010\u1019\u103A\u1038\u1010\u102D\u102F\u1038\u101B\u1014\u103A Admin \u1021\u102C\u1038 \u1006\u1000\u103A\u101E\u103D\u101A\u103A\u1015\u102B (License Expired)"
      });
    }
    const safeDeviceId = deviceId || `dev_${Math.random().toString(36).substring(2, 8)}`;
    const safeDeviceModel = deviceModel || "Web Browser";
    const bound = Array.isArray(lic.boundDevices) ? lic.boundDevices : [];
    const existingDevice = bound.find((b) => b.deviceId === safeDeviceId);
    if (existingDevice) {
      existingDevice.lastSeenAt = (/* @__PURE__ */ new Date()).toISOString();
      existingDevice.deviceModel = safeDeviceModel;
      if (Array.isArray(lic.unboundDeviceIds)) {
        lic.unboundDeviceIds = lic.unboundDeviceIds.filter((id) => id !== safeDeviceId);
      }
      saveStorageToDisk();
      broadcastSSE("licenses", memoryStorage["licenses"]);
      syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {
      });
      return res.json({ success: true, license: lic, alreadyBound: true });
    }
    if (bound.length >= lic.deviceLimit) {
      return res.status(400).json({
        success: false,
        error: "device_limit_exceeded",
        message: `\u1001\u103D\u1004\u1037\u103A\u1015\u103C\u102F\u1011\u102C\u1038\u101E\u100A\u1037\u103A \u1005\u1000\u103A\u1021\u101B\u1031\u1021\u1010\u103D\u1000\u103A (${lic.deviceLimit} \u101C\u102F\u1036\u1038) \u1015\u103C\u100A\u1037\u103A\u101E\u103D\u102C\u1038\u1015\u102B\u1015\u103C\u102E\u104B \u1021\u1001\u103C\u102C\u1038\u1005\u1000\u103A\u1010\u103D\u1004\u103A \u1021\u101E\u102F\u1036\u1038\u1015\u103C\u102F\u101C\u102D\u102F\u1015\u102B\u1000 Admin \u1011\u1036 \u1006\u1000\u103A\u101E\u103D\u101A\u103A\u1015\u102B\u104B`,
        deviceLimit: lic.deviceLimit,
        boundCount: bound.length
      });
    }
    bound.push({
      deviceId: safeDeviceId,
      deviceModel: safeDeviceModel,
      activatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastSeenAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    lic.boundDevices = bound;
    if (Array.isArray(lic.unboundDeviceIds)) {
      lic.unboundDeviceIds = lic.unboundDeviceIds.filter((id) => id !== safeDeviceId);
    }
    saveStorageToDisk();
    broadcastSSE("licenses", memoryStorage["licenses"]);
    syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {
    });
    try {
      const tgCfg = memoryStorage["telegram_bot"];
      if (tgCfg && tgCfg.enabled && tgCfg.botToken && tgCfg.adminChatId && tgCfg.notifyOnActivation) {
        const boundCount = bound.length;
        const devLimit = lic.deviceLimit || 1;
        const expireStr = new Date(lic.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        const text = `\u{1F514} *PRO License Activated on Buyer Device!*
\u{1F464} *Customer:* ${lic.customerName || "N/A"}
\u{1F4F1} *Device:* ${safeDeviceModel}
\u{1F194} *Device ID:* \`${safeDeviceId}\`
\u{1F511} *License Key:* \`${lic.token}\`
\u23F3 *Expires At:* ${expireStr}
\u{1F4CA} *Devices Activated:* ${boundCount}/${devLimit}`;
        sendTelegramMessage(tgCfg.botToken, tgCfg.adminChatId, text).catch(() => {
        });
      }
    } catch (e) {
    }
    return res.json({ success: true, license: lic, newDeviceBound: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Activation failed" });
  }
});
app.post("/api/license/unbind-device", async (req, res) => {
  const { licenseId, deviceId } = req.body;
  const list = await pullAndMergeLicensesFromSupabase();
  const lic = list.find((l) => l.id === licenseId || l.token === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });
  if (!deviceId || deviceId === "all") {
    lic.boundDevices = [];
    lic.unboundAllAt = (/* @__PURE__ */ new Date()).toISOString();
  } else {
    lic.boundDevices = (lic.boundDevices || []).filter((d) => d.deviceId !== deviceId);
    const prevUnbound = Array.isArray(lic.unboundDeviceIds) ? lic.unboundDeviceIds : [];
    lic.unboundDeviceIds = Array.from(/* @__PURE__ */ new Set([...prevUnbound, deviceId]));
  }
  memoryStorage["licenses"] = list;
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {
  });
  res.json({ success: true, license: lic });
});
app.post("/api/license/extend", async (req, res) => {
  const { licenseId, days } = req.body;
  const list = await pullAndMergeLicensesFromSupabase();
  const lic = list.find((l) => l.id === licenseId || l.token === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });
  const addDays = parseInt(days, 10) || 30;
  const currentExp = new Date(lic.expiresAt).getTime();
  const baseTime = currentExp > Date.now() ? currentExp : Date.now();
  lic.expiresAt = new Date(baseTime + addDays * 864e5).toISOString();
  lic.status = "active";
  lic.manuallyExtended = true;
  memoryStorage["licenses"] = list;
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {
  });
  res.json({ success: true, license: lic });
});
app.post("/api/license/status", async (req, res) => {
  const { licenseId, status } = req.body;
  const list = await pullAndMergeLicensesFromSupabase();
  const lic = list.find((l) => l.id === licenseId || l.token === licenseId);
  if (!lic) return res.status(404).json({ error: "License not found" });
  lic.status = status;
  memoryStorage["licenses"] = list;
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {
  });
  res.json({ success: true, license: lic });
});
app.delete("/api/license/:id", async (req, res) => {
  const id = req.params.id;
  const list = await pullAndMergeLicensesFromSupabase();
  memoryStorage["licenses"] = list.filter((l) => l.id !== id && l.token !== id);
  saveStorageToDisk();
  broadcastSSE("licenses", memoryStorage["licenses"]);
  syncLicensesToSupabase(memoryStorage["licenses"]).catch(() => {
  });
  res.json({ success: true });
});
app.get("/api/licenses", async (req, res) => {
  const list = await pullAndMergeLicensesFromSupabase();
  res.json({ success: true, licenses: list });
});
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
    broadcastSupabaseEvent("admin_contact_changed", { contact: memoryStorage["admin_contact"], timestamp: Date.now() }).catch(() => {
    });
  }).catch(() => {
  });
  res.json({ success: true, contact: memoryStorage["admin_contact"] });
});
async function sendTelegramChatAction(token, chatId, action = "typing") {
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
      signal: AbortSignal.timeout(3e3)
    });
  } catch (e) {
  }
}
async function sendTelegramMessage(token, chatId, text, parseMode = "HTML", replyMarkup) {
  if (!token || !chatId) return { ok: false, description: "Missing token or chatId" };
  try {
    const payload = {
      chat_id: chatId,
      text,
      disable_web_page_preview: false
    };
    if (parseMode) payload.parse_mode = parseMode;
    if (replyMarkup) payload.reply_markup = replyMarkup;
    let res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8e3)
    });
    let data = await res.json();
    if (!data.ok && parseMode) {
      console.warn("Telegram sendMessage format error, retrying without formatting:", data.description);
      delete payload.parse_mode;
      res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8e3)
      });
      data = await res.json();
    }
    return data;
  } catch (err) {
    console.error("Failed to send Telegram message:", err?.message);
    return { ok: false, description: err?.message };
  }
}
async function syncTelegramBotProfileAndMenu(token, appUrl) {
  if (!token) return { success: false, error: "No token" };
  const cleanUrl = (appUrl || getPublicAppUrl()).replace(/\/+$/, "");
  try {
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "\u2600\uFE0F Open Solar Pro",
          web_app: { url: cleanUrl }
        }
      }),
      signal: AbortSignal.timeout(6e3)
    });
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Open App & Usage Guide" },
          { command: "gen", description: "[Admin] /gen <name> <1w|1m|3m|6m|1y|life> [1|2]" },
          { command: "1w", description: "[Admin] Quick 1 Week key (/1w <name> [1|2])" },
          { command: "1m", description: "[Admin] Quick 1 Month key (/1m <name> [1|2])" },
          { command: "3m", description: "[Admin] Quick 3 Months key (/3m <name> [1|2])" },
          { command: "6m", description: "[Admin] Quick 6 Months key (/6m <name> [1|2])" },
          { command: "1y", description: "[Admin] Quick 1 Year key (/1y <name> [1|2])" },
          { command: "licenses", description: "[Admin] View recent licenses" },
          { command: "csv", description: "[Admin] Download license Excel / CSV" },
          { command: "stats", description: "[Admin] Total licenses & bound devices" },
          { command: "app", description: "Open Unique Solar Pro on GitHub Pages" },
          { command: "help", description: "Commands cheat sheet" }
        ]
      }),
      signal: AbortSignal.timeout(6e3)
    });
    await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: `\u2600\uFE0F UNIQUE SOLAR PRO - Engineering Suite \u26A1\uFE0F
Solar Panel Sizing & Inverter Matching App for Engineers in Myanmar.

\u{1F310} Web App Link (VPN-Free):
${cleanUrl}

\u{1F511} Instant 1-Click PRO License Activation & Management.`
      }),
      signal: AbortSignal.timeout(6e3)
    });
    await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        short_description: `Unique Solar Pro - ${cleanUrl}`
      }),
      signal: AbortSignal.timeout(6e3)
    });
    console.log(`Telegram Bot profile & menu successfully synced with GitHub link: ${cleanUrl}`);
    return { success: true, appUrl: cleanUrl };
  } catch (err) {
    console.warn("syncTelegramBotProfileAndMenu error:", err?.message);
    return { success: false, error: err?.message };
  }
}
async function sendTelegramDocument(token, chatId, filename, content, caption) {
  if (!token || !chatId) return false;
  try {
    const formData = new FormData();
    formData.append("chat_id", chatId);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    formData.append("document", blob, filename);
    if (caption) {
      formData.append("caption", caption);
      formData.append("parse_mode", "HTML");
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(15e3)
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.warn("sendTelegramDocument failed:", err);
    return false;
  }
}
function generateLicensesCSV(licenses, appUrl) {
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
  const escapeCSV = (val) => {
    if (val === null || val === void 0) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };
  const rows = licenses.map((lic, idx) => {
    const boundDevicesStr = Array.isArray(lic.boundDevices) ? lic.boundDevices.map((d) => d.deviceModel || d.deviceId || "Device").join("; ") : "";
    const activationLink = `${appUrl}/?license=${lic.token}`;
    return [
      idx + 1,
      escapeCSV(lic.customerName || "Valued Customer"),
      escapeCSV(lic.duration || "1_month"),
      escapeCSV(lic.deviceLimit || 1),
      escapeCSV(lic.token),
      escapeCSV(lic.status || "active"),
      escapeCSV(new Date(lic.createdAt).toLocaleString("en-US")),
      escapeCSV(new Date(lic.expiresAt).toLocaleDateString("en-US")),
      escapeCSV(boundDevicesStr),
      escapeCSV(activationLink),
      escapeCSV(lic.note || "")
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}
var telegramPollingTimeout = null;
var isTelegramPolling = false;
var isPollingFetchInProgress = false;
var pollingAbortController = null;
var processedUpdateIds = /* @__PURE__ */ new Set();
var recentCommandCache = /* @__PURE__ */ new Map();
var pendingGenPrompts = /* @__PURE__ */ new Map();
async function answerTelegramCallbackQuery(token, callbackQueryId, text) {
  if (!token || !callbackQueryId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || "" }),
      signal: AbortSignal.timeout(5e3)
    });
  } catch (e) {
  }
}
async function generateAndSendTelegramLicense(cfg, chatId, fromLabel, customerName, duration, deviceLimit) {
  const appUrl = getPublicAppUrl();
  const safeName = (customerName || "").trim() || "Engineer Customer";
  const dedupKey = `${chatId}_${safeName.toLowerCase()}_${duration}_${deviceLimit}`;
  const recent = recentCommandCache.get(dedupKey);
  let newLic;
  let isDuplicate = false;
  let cloudSynced = false;
  if (recent && Date.now() - recent.time < 15e3) {
    newLic = recent.license;
    isDuplicate = true;
    cloudSynced = true;
  } else {
    await pullAndMergeLicensesFromSupabase();
    newLic = generateLicenseRecord(safeName, duration, deviceLimit, `Generated via Telegram Bot (${fromLabel})`);
    cloudSynced = await upsertSupabaseAppSettings([
      { id: "global_licenses", value: memoryStorage["licenses"], updated_at: (/* @__PURE__ */ new Date()).toISOString() }
    ]);
    if (cloudSynced) {
      broadcastSupabaseEvent("licenses_changed", { count: memoryStorage["licenses"].length, timestamp: Date.now() }).catch(() => {
      });
    }
    recentCommandCache.set(dedupKey, { time: Date.now(), license: newLic });
    if (recentCommandCache.size > 200) {
      const oldest = recentCommandCache.keys().next().value;
      if (oldest) recentCommandCache.delete(oldest);
    }
  }
  const activationLink = `${appUrl}/?license=${newLic.token}`;
  const planSpec = LICENSE_PLAN_SPECS[duration];
  const durLabel = `${planSpec.labelEn} \u2022 ${planSpec.labelMy}`;
  const expiresDateStr = new Date(newLic.expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  const escapeTelegramHtml = (str) => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const dupNotice = isDuplicate ? "\u26A0\uFE0F <i>(\u101C\u103D\u1014\u103A\u1001\u1032\u1037\u101E\u1031\u102C \u1005\u1000\u1039\u1000\u1014\u1037\u103A\u1015\u102D\u102F\u1004\u103A\u1038\u1000 \u1011\u102F\u1010\u103A\u1011\u102C\u1038\u1015\u103C\u102E\u1038\u1016\u103C\u1005\u103A\u101E\u1031\u102C \u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1021\u102C\u1038 \u1015\u103C\u1014\u103A\u101C\u100A\u103A\u1015\u103C\u101E\u1015\u1031\u1038\u1011\u102C\u1038\u1015\u102B\u101E\u100A\u103A - Duplicate Prevented)</i>\n\n" : "";
  const replyMsg = `${dupNotice}\u{1F389} <b>PRO LICENSE \u1011\u102F\u1010\u103A\u101C\u102F\u1015\u103A\u1015\u103C\u102E\u1038\u1015\u102B\u1015\u103C\u102E!</b> \u26A1\uFE0F
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} <b>\u101D\u101A\u103A\u101A\u1030\u101E\u1030:</b> ${escapeTelegramHtml(safeName)}
\u23F3 <b>\u101E\u1000\u103A\u1010\u1019\u103A\u1038:</b> ${durLabel}
\u{1F4C5} <b>\u1000\u102F\u1014\u103A\u1006\u102F\u1036\u1038\u1019\u100A\u1037\u103A\u101B\u1000\u103A:</b> ${expiresDateStr}
\u{1F4F1} <b>\u1001\u103D\u1004\u1037\u103A\u1015\u103C\u102F\u1005\u1000\u103A:</b> ${newLic.deviceLimit} Device(s)
\u2601\uFE0F <b>Cloud Sync:</b> ${cloudSynced ? "\u2705 Ready (Online)" : "\u26A1\uFE0F Direct Offline-Ready"}

\u{1F310} <b>VPN \u1019\u101C\u102D\u102F\u1018\u1032 \u1010\u102D\u102F\u1000\u103A\u101B\u102D\u102F\u1000\u103A\u1016\u103D\u1004\u1037\u103A\u101B\u1014\u103A (One-Click Link):</b>
${activationLink}

\u{1F511} <b>License Key:</b>
<code>${newLic.token}</code>
<i>\u{1F449} \u1021\u1000\u101A\u103A\u104D Link \u1019\u1016\u103D\u1004\u1037\u103A\u1001\u103B\u1004\u103A\u1015\u102B\u1000 App \u104F "Enter License Key" \u1010\u103D\u1004\u103A \u1024 Key \u1000\u102D\u102F \u1000\u1030\u1038\u1011\u100A\u1037\u103A\u101B\u102F\u1036\u1016\u103C\u1004\u1037\u103A\u101C\u100A\u103A\u1038 VPN \u1019\u101C\u102D\u102F\u1018\u1032 Activate \u1016\u103C\u1005\u103A\u1015\u102B\u101E\u100A\u103A!</i>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>(\u101D\u101A\u103A\u101A\u1030\u101E\u1030\u1011\u1036 \u1024\u1005\u102C\u1010\u102D\u102F\u1000\u102D\u102F \u1010\u102D\u102F\u1000\u103A\u101B\u102D\u102F\u1000\u103A Forward \u1015\u102D\u102F\u1037\u1015\u1031\u1038\u101C\u102D\u102F\u1000\u103A\u101B\u102F\u1036\u1016\u103C\u1004\u1037\u103A \u1021\u101C\u103D\u101A\u103A\u1010\u1000\u1030 Activate \u1015\u103C\u102F\u101C\u102F\u1015\u103A\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A)</i>`;
  await sendTelegramMessage(cfg.botToken, chatId, replyMsg, "HTML", {
    inline_keyboard: [
      [
        { text: "\u26A1\uFE0F 1-Click Activate PRO", url: activationLink },
        { text: "\u2600\uFE0F Open App", url: appUrl }
      ]
    ]
  });
}
async function handleTelegramCallbackQuery(cfg, cbq) {
  if (!cbq || !cbq.data) return;
  const chatId = String(cbq.message?.chat?.id || cbq.from?.id || "");
  const isAdmin = !cfg.adminChatId || chatId === String(cfg.adminChatId);
  if (!isAdmin) {
    await answerTelegramCallbackQuery(cfg.botToken, cbq.id, "\u26D4\uFE0F Admin only");
    return;
  }
  const dataStr = String(cbq.data);
  if (dataStr.startsWith("qgen:")) {
    const [, promptId, durRaw, devRaw] = dataStr.split(":");
    const duration = parseDurationToken(durRaw);
    if (!duration) {
      await answerTelegramCallbackQuery(cfg.botToken, cbq.id, "Invalid duration");
      return;
    }
    const pending = pendingGenPrompts.get(promptId);
    const customerName = pending?.customerName || "Engineer Customer";
    const deviceLimit = devRaw === "2" ? 2 : pending?.deviceLimit || 1;
    const fromLabel = cbq.from?.username ? `@${cbq.from.username}` : cbq.from?.first_name || "Admin";
    await answerTelegramCallbackQuery(cfg.botToken, cbq.id, `Generating ${duration.replace("_", " ")} key...`);
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
    try {
      pollingAbortController.abort();
    } catch (e) {
    }
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
  syncTelegramBotProfileAndMenu(cfg.botToken, getPublicAppUrl()).catch(() => {
  });
  pollTelegramUpdates();
}
async function pollTelegramUpdates() {
  if (!isTelegramPolling) return;
  if (isPollingFetchInProgress) return;
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
      signal: AbortSignal.timeout(12e3)
    });
    const data = await res.json();
    if (data && data.ok && Array.isArray(data.result)) {
      receivedUpdatesCount = data.result.length;
      for (const update of data.result) {
        if (!update || !update.update_id) continue;
        if (update.update_id > lastTelegramUpdateId) {
          lastTelegramUpdateId = update.update_id;
          cfg.lastUpdateId = lastTelegramUpdateId;
          memoryStorage["telegram_bot"] = cfg;
        }
        if (processedUpdateIds.has(update.update_id)) {
          continue;
        }
        processedUpdateIds.add(update.update_id);
        if (processedUpdateIds.size > 2e3) {
          const first = processedUpdateIds.values().next().value;
          if (first !== void 0) processedUpdateIds.delete(first);
        }
        if (update.message && update.message.text) {
          sendTelegramChatAction(cfg.botToken, String(update.message.chat.id), "typing").catch(() => {
          });
          await handleTelegramIncomingMessage(cfg, update.message);
        } else if (update.callback_query) {
          await handleTelegramCallbackQuery(cfg, update.callback_query);
        }
      }
      if (receivedUpdatesCount > 0) {
        saveStorageToDisk();
      }
    }
  } catch (err) {
  } finally {
    isPollingFetchInProgress = false;
    pollingAbortController = null;
  }
  if (isTelegramPolling) {
    const nextDelay = receivedUpdatesCount > 0 ? 50 : 500;
    telegramPollingTimeout = setTimeout(pollTelegramUpdates, nextDelay);
  }
}
async function handleTelegramIncomingMessage(cfg, msg) {
  const chatId = String(msg.chat.id);
  const rawText = (msg.text || "").trim();
  const fromName = msg.from ? `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim() : "User";
  if (!rawText) return;
  if (!cfg.adminChatId) {
    cfg.adminChatId = chatId;
    memoryStorage["telegram_bot"] = { ...cfg, adminChatId: chatId };
    saveStorageToDisk();
    broadcastSSE("telegram_bot", memoryStorage["telegram_bot"]);
  }
  const parts = rawText.split(/\s+/);
  const rawCmd = (parts[0] || "").toLowerCase();
  const cmd = rawCmd.split("@")[0];
  const appUrl = getPublicAppUrl();
  const isAdmin = !cfg.adminChatId || chatId === String(cfg.adminChatId);
  if (cmd === "/app" || cmd === "/link" || cmd === "/github" || cmd === "/web" || cmd === "/url") {
    const appMsg = `\u2600\uFE0F <b>UNIQUE SOLAR PRO - WEB APP</b> \u26A1\uFE0F
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F310} <b>GitHub Pages Link (VPN-Free):</b>
${appUrl}

\u{1F4A1} <b>\u1021\u101E\u102F\u1036\u1038\u1015\u103C\u102F\u1015\u102F\u1036:</b>
\u1019\u103C\u1014\u103A\u1019\u102C\u1014\u102D\u102F\u1004\u103A\u1004\u1036\u101B\u103E\u102D \u1019\u100A\u103A\u101E\u100A\u1037\u103A\u1016\u102F\u1014\u103A\u1038\u104A \u1010\u1000\u103A\u1018\u101C\u1000\u103A \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A \u1000\u103D\u1014\u103A\u1015\u103B\u1030\u1010\u102C Browser \u1019\u103E\u1019\u1006\u102D\u102F VPN \u1019\u101C\u102D\u102F\u1018\u1032 \u1010\u102D\u102F\u1000\u103A\u101B\u102D\u102F\u1000\u103A\u1016\u103D\u1004\u1037\u103A\u101C\u103E\u1005\u103A \u1021\u101E\u102F\u1036\u1038\u1015\u103C\u102F\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A!`;
    await sendTelegramMessage(cfg.botToken, chatId, appMsg, "HTML", {
      inline_keyboard: [
        [
          { text: "\u2600\uFE0F Open Solar Pro (Web App)", web_app: { url: appUrl } },
          { text: "\u{1F310} Direct Browser Link", url: appUrl }
        ]
      ]
    });
    return;
  }
  if (cmd === "/id") {
    await sendTelegramMessage(cfg.botToken, chatId, `\u{1F194} \u101E\u1004\u1037\u103A Telegram Chat ID \u101E\u100A\u103A: <code>${chatId}</code> \u1016\u103C\u1005\u103A\u1015\u102B\u101E\u100A\u103A\u104B`, "HTML");
    return;
  }
  if (cmd === "/check" || cmd === "/status" && parts[1]) {
    const tokenQuery = parts[1] ? parts[1].trim().toUpperCase() : "";
    if (!tokenQuery) {
      await sendTelegramMessage(
        cfg.botToken,
        chatId,
        `\u2139\uFE0F <b>\u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1005\u1005\u103A\u1006\u1031\u1038\u101B\u1014\u103A:</b>
<code>/check &lt;\u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1000\u102F\u1012\u103A&gt;</code> \u1015\u102F\u1036\u1005\u1036\u1016\u103C\u1004\u1037\u103A \u1005\u1005\u103A\u1006\u1031\u1038\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A\u1001\u1004\u103A\u1017\u103B\u102C\u104B
\u1025\u1015\u1019\u102C: <code>/check SOLAR-PRO-1M-1D-XXXX-YYYY</code>`,
        "HTML"
      );
      return;
    }
    const list = await pullAndMergeLicensesFromSupabase();
    const found = list.find((l) => l.token.toUpperCase() === tokenQuery || l.id === tokenQuery);
    if (!found) {
      await sendTelegramMessage(
        cfg.botToken,
        chatId,
        `\u274C \u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1000\u102F\u1012\u103A <code>${tokenQuery}</code> \u1021\u102C\u1038 \u1005\u1014\u1005\u103A\u1011\u1032\u1010\u103D\u1004\u103A \u1019\u1010\u103D\u1031\u1037\u101B\u103E\u102D\u1015\u102B\u1001\u1004\u103A\u1017\u103B\u102C\u104B
\u1021\u101E\u1005\u103A\u101D\u101A\u103A\u101A\u1030\u101C\u102D\u102F\u1015\u102B\u1000 Admin \u101E\u102D\u102F\u1037 \u1006\u1000\u103A\u101E\u103D\u101A\u103A\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A\u104B`,
        "HTML",
        {
          inline_keyboard: [
            [
              { text: "\u2600\uFE0F Open Unique Solar App", web_app: { url: appUrl } },
              { text: "\u{1F4AC} Contact Admin", url: "https://t.me/uniquesolarpro" }
            ]
          ]
        }
      );
      return;
    }
    const boundCount = Array.isArray(found.boundDevices) ? found.boundDevices.length : 0;
    const isExpired = new Date(found.expiresAt).getTime() < Date.now();
    const statusText = isExpired ? "\u{1F534} Expired" : found.status === "active" ? "\u{1F7E2} Active" : "\u{1F7E1} Inactive";
    const msg2 = `\u{1F511} <b>PRO LICENSE STATUS</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} \u101D\u101A\u103A\u101A\u1030\u101E\u1030: <b>${found.customerName}</b>
\u{1F4CA} Status: ${statusText}
\u23F3 \u101E\u1000\u103A\u1010\u1019\u103A\u1038: ${found.duration}
\u{1F4C5} \u1000\u102F\u1014\u103A\u1006\u102F\u1036\u1038\u1019\u100A\u1037\u103A\u101B\u1000\u103A: ${new Date(found.expiresAt).toLocaleDateString()}
\u{1F4F1} \u1005\u1000\u103A\u1001\u103B\u102D\u1010\u103A\u1006\u1000\u103A\u1019\u103E\u102F: ${boundCount}/${found.deviceLimit} Devices

\u{1F310} <b>One-Click Link:</b>
${appUrl}/?license=${found.token}`;
    await sendTelegramMessage(cfg.botToken, chatId, msg2, "HTML", {
      inline_keyboard: [
        [
          { text: "\u26A1\uFE0F 1-Click Activate", url: `${appUrl}/?license=${found.token}` },
          { text: "\u2600\uFE0F Open App", web_app: { url: appUrl } }
        ]
      ]
    });
    return;
  }
  if (!isAdmin) {
    if (cmd === "/start" || cmd === "/help") {
      const publicWelcome = `\u2600\uFE0F <b>UNIQUE SOLAR PRO</b> \u26A1\uFE0F
\u1019\u1004\u103A\u1039\u1002\u101C\u102C\u1015\u102B <b>${fromName}</b>!
\u1019\u103C\u1014\u103A\u1019\u102C\u1014\u102D\u102F\u1004\u103A\u1004\u1036\u101B\u103E\u102D Solar Engineers, Installers & Technicians \u1019\u103B\u102C\u1038\u1021\u1010\u103D\u1000\u103A \u1021\u1011\u1030\u1038\u1011\u102F\u1010\u103A\u101C\u102F\u1015\u103A\u1011\u102C\u1038\u101E\u1031\u102C Solar Panel Sizing & Inverter Matching Engineering Suite \u1016\u103C\u1005\u103A\u1015\u102B\u101E\u100A\u103A\u104B

\u{1F310} <b>GitHub Pages App Link (VPN-Free):</b>
${appUrl}

\u26A1\uFE0F <b>\u1015\u102B\u101D\u1004\u103A\u101E\u1031\u102C \u101C\u102F\u1015\u103A\u1006\u1031\u102C\u1004\u103A\u1001\u103B\u1000\u103A\u1019\u103B\u102C\u1038:</b>
\u2022 Inverter & Solar Panel String Sizing (Voc, Vmp, MPPT, Max/Min String)
\u2022 3D Solar Mounting Structure Calculators (Roof & Ground)
\u2022 DC Breaker, Fuse, Cable & SPD Sizing
\u2022 Engineering SLD & PDF Export

\u{1F4A1} <b>PRO License \u101D\u101A\u103A\u101A\u1030\u101B\u1014\u103A/\u1019\u1031\u1038\u1019\u103C\u1014\u103A\u1038\u101B\u1014\u103A:</b>
\u2022 Telegram Admin: @uniquesolarpro
\u2022 Viber Phone: 09 403 708 145

\u{1F511} <b>\u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1005\u1005\u103A\u1006\u1031\u1038\u101B\u1014\u103A:</b>
<code>/check &lt;LicenseKey&gt;</code>`;
      await sendTelegramMessage(cfg.botToken, chatId, publicWelcome, "HTML", {
        inline_keyboard: [
          [
            { text: "\u2600\uFE0F Open Solar Pro (Web App)", web_app: { url: appUrl } },
            { text: "\u{1F310} Direct Browser Link", url: appUrl }
          ],
          [
            { text: "\u{1F4AC} Contact Admin (@uniquesolarpro)", url: "https://t.me/uniquesolarpro" }
          ]
        ]
      });
      return;
    }
    await sendTelegramMessage(
      cfg.botToken,
      chatId,
      `\u26D4\uFE0F <b>Admin Command \u1016\u103C\u1005\u103A\u1015\u102B\u101E\u100A\u103A\u104B</b>
\u1024\u101C\u102F\u1015\u103A\u1006\u1031\u102C\u1004\u103A\u1001\u103B\u1000\u103A\u101E\u100A\u103A Solar Pro Admin \u101E\u102E\u1038\u101E\u1014\u1037\u103A\u1016\u103C\u1005\u103A\u1015\u102B\u101E\u100A\u103A (Unauthorized).
\u101E\u1004\u1037\u103A Telegram Chat ID: <code>${chatId}</code>

\u{1F310} App \u1016\u103D\u1004\u1037\u103A\u101B\u1014\u103A: ${appUrl}`,
      "HTML",
      {
        inline_keyboard: [
          [
            { text: "\u2600\uFE0F Open Solar Pro", web_app: { url: appUrl } }
          ]
        ]
      }
    );
    return;
  }
  if (cmd === "/start" || cmd === "/help") {
    const helpMsg = `\u2600\uFE0F <b>UNIQUE SOLAR PRO - ADMIN SUITE</b> \u26A1\uFE0F
\u1019\u1004\u103A\u1039\u1002\u101C\u102C\u1015\u102B Admin <b>${fromName}</b>!
Bot \u1001\u103B\u102D\u1010\u103A\u1006\u1000\u103A\u1011\u102C\u1038\u101E\u1031\u102C GitHub Pages Link:
\u{1F310} <code>${appUrl}</code>

\u{1F4CC} <b>\u1021\u101E\u102F\u1036\u1038\u1015\u103C\u102F\u1014\u102D\u102F\u1004\u103A\u101E\u1031\u102C Admin Commands \u1019\u103B\u102C\u1038:</b>
1\uFE0F\u20E3 <b>\u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1011\u102F\u1010\u103A\u101B\u1014\u103A (\u1014\u102C\u1019\u100A\u103A Space \u1015\u102B\u101C\u100A\u103A\u1038 \u101B\u1015\u102B\u101E\u100A\u103A):</b>
<code>/gen &lt;\u1014\u102C\u1019\u100A\u103A&gt; &lt;\u101E\u1000\u103A\u1010\u1019\u103A\u1038&gt; [\u1005\u1000\u103A\u1021\u101B\u1031\u1021\u1010\u103D\u1000\u103A]</code>
\u1025\u1015\u1019\u102C\u1019\u103B\u102C\u1038:
\u2022 <code>/gen Ko Aung 1w 1</code> (\u1041 \u1015\u1010\u103A - \u1047 \u101B\u1000\u103A)
\u2022 <code>/gen Ko Aung 1m 1</code> (\u1041 \u101C - \u1043\u1040 \u101B\u1000\u103A)
\u2022 <code>/gen Daw Hla 3m 2</code> (\u1043 \u101C - \u1049\u1040 \u101B\u1000\u103A)
\u2022 <code>/gen 09798111222 1y 1</code> (\u1041 \u1014\u103E\u1005\u103A - \u1043\u1046\u1045 \u101B\u1000\u103A)
\u2022 <code>/gen Engineer U Kyaw life 2</code> (\u1010\u1005\u103A\u101E\u1000\u103A\u1010\u102C)

\u26A1\uFE0F <b>\u1021\u1019\u103C\u1014\u103A\u1011\u102F\u1010\u103A\u1014\u100A\u103A\u1038 (Quick Commands):</b>
\u2022 <code>/1w Ko Aung 1</code> \u2014 1 Week (\u1047 \u101B\u1000\u103A)
\u2022 <code>/1m Ko Aung 1</code> \u2014 1 Month (\u101B\u1000\u103A \u1043\u1040)
\u2022 <code>/3m Ko Aung 2</code> \u2014 3 Months (\u101B\u1000\u103A \u1049\u1040)
\u2022 <code>/6m Ko Aung 2</code> \u2014 6 Months (\u1041\u1048\u1040 \u101B\u1000\u103A)
\u2022 <code>/1y Ko Aung 1</code> \u2014 1 Year (\u1043\u1046\u1045 \u101B\u1000\u103A)
\u2022 <code>/life Ko Aung 2</code> \u2014 Lifetime (\u1041\u1040 \u1014\u103E\u1005\u103A)

2\uFE0F\u20E3 <b>\u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1019\u103B\u102C\u1038 \u1000\u103C\u100A\u1037\u103A\u101B\u1014\u103A & \u1012\u1031\u102B\u1004\u103A\u1038\u101C\u102F\u1012\u103A \u101B\u101A\u1030\u101B\u1014\u103A:</b>
\u2022 <code>/licenses</code> - \u1014\u1031\u102C\u1000\u103A\u1006\u102F\u1036\u1038 \u1011\u102F\u1010\u103A\u1011\u102C\u1038\u101E\u1031\u102C \u1005\u102C\u101B\u1004\u103A\u1038\u1019\u103B\u102C\u1038
\u2022 <code>/csv</code> \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A <code>/export</code> - \u1005\u102C\u101B\u1004\u103A\u1038\u1021\u102C\u1038\u101C\u102F\u1036\u1038\u1000\u102D\u102F Excel / CSV \u1016\u102D\u102F\u1004\u103A\u1016\u103C\u1004\u1037\u103A \u1012\u1031\u102B\u1004\u103A\u1038\u101C\u102F\u1012\u103A \u101B\u101A\u1030\u101B\u1014\u103A

3\uFE0F\u20E3 <b>\u1021\u1001\u103C\u1031\u1021\u1014\u1031 \u1000\u103C\u100A\u1037\u103A\u101B\u1014\u103A:</b>
\u2022 <code>/stats</code> - \u1005\u102F\u1005\u102F\u1015\u1031\u102B\u1004\u103A\u1038 \u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1014\u103E\u1004\u1037\u103A \u1005\u1000\u103A\u1021\u101B\u1031\u1021\u1010\u103D\u1000\u103A

4\uFE0F\u20E3 <b>Chat ID \u1000\u103C\u100A\u1037\u103A\u101B\u1014\u103A:</b>
\u2022 <code>/id</code> - \u101E\u1004\u1037\u103A Telegram Chat ID: <code>${chatId}</code>

5\uFE0F\u20E3 <b>GitHub App Link:</b>
\u2022 <code>/app</code> - GitHub Pages App Link \u101B\u101A\u1030\u101B\u1014\u103A`;
    await sendTelegramMessage(cfg.botToken, chatId, helpMsg, "HTML", {
      inline_keyboard: [
        [
          { text: "\u2600\uFE0F Open Solar Pro (Web App)", web_app: { url: appUrl } },
          { text: "\u{1F310} Direct Browser Link", url: appUrl }
        ]
      ]
    });
    return;
  }
  if (cmd === "/export" || cmd === "/csv" || cmd === "/download") {
    await sendTelegramChatAction(cfg.botToken, chatId, "upload_document");
    const list = await pullAndMergeLicensesFromSupabase();
    if (list.length === 0) {
      await sendTelegramMessage(cfg.botToken, chatId, `\u{1F4DD} \u1011\u102F\u1010\u103A\u1011\u102C\u1038\u101E\u1031\u102C \u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A \u1019\u103E\u1010\u103A\u1010\u1019\u103A\u1038 \u1019\u101B\u103E\u102D\u101E\u1031\u1038\u1015\u102B\u1001\u1004\u103A\u1017\u103B\u102C\u104B <code>/gen</code> \u1016\u103C\u1004\u1037\u103A \u1005\u1010\u1004\u103A\u1011\u102F\u1010\u103A\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A\u104B`, "HTML");
      return;
    }
    const csvContent = generateLicensesCSV(list, appUrl);
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const filename = `Unique_Solar_Pro_Licenses_${dateStr}.csv`;
    const active = list.filter((l) => l.status === "active").length;
    let boundTotal = 0;
    list.forEach((l) => {
      if (Array.isArray(l.boundDevices)) boundTotal += l.boundDevices.length;
    });
    const caption = `\u{1F4C1} <b>PRO LICENSE DATABASE EXPORT (.CSV)</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F511} \u1005\u102F\u1005\u102F\u1015\u1031\u102B\u1004\u103A\u1038: <b>${list.length}</b> \u1001\u102F
\u{1F7E2} Active: <b>${active}</b> \u1001\u102F
\u{1F4F1} \u1001\u103B\u102D\u1010\u103A\u1006\u1000\u103A\u1005\u1000\u103A: <b>${boundTotal}</b> \u101C\u102F\u1036\u1038
\u{1F310} App: ${appUrl}

\u{1F4A1} \u1024 CSV \u1016\u102D\u102F\u1004\u103A\u1021\u102C\u1038 Excel \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A Google Sheets \u1010\u103D\u1004\u103A \u1010\u102D\u102F\u1000\u103A\u101B\u102D\u102F\u1000\u103A\u1016\u103D\u1004\u1037\u103A\u104D \u1016\u102F\u1014\u103A\u1038 \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A \u1000\u103D\u1014\u103A\u1015\u103B\u1030\u1010\u102C\u1010\u103D\u1004\u103A \u1021\u101C\u103D\u101A\u103A\u1010\u1000\u1030 \u101E\u102D\u1019\u103A\u1038\u1006\u100A\u103A\u1038 \u1000\u103C\u100A\u1037\u103A\u101B\u103E\u102F\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A!`;
    const sent = await sendTelegramDocument(cfg.botToken, chatId, filename, csvContent, caption);
    if (!sent) {
      await sendTelegramMessage(cfg.botToken, chatId, `\u26A0\uFE0F CSV Document \u1015\u1031\u1038\u1015\u102D\u102F\u1037\u101B\u102C\u1010\u103D\u1004\u103A \u1021\u1001\u1000\u103A\u1021\u1001\u1032\u101B\u103E\u102D\u1015\u102B\u1000 <code>/licenses</code> \u1016\u103C\u1004\u1037\u103A \u1005\u102C\u101B\u1004\u103A\u1038 \u1000\u103C\u100A\u1037\u103A\u101B\u103E\u102F\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A\u104B`, "HTML");
    }
    return;
  }
  const shorthandDurationMap = {
    "/1w": "1_week",
    "/1week": "1_week",
    "/gen1w": "1_week",
    "/gen_1w": "1_week",
    "/1m": "1_month",
    "/1month": "1_month",
    "/gen1m": "1_month",
    "/gen_1m": "1_month",
    "/3m": "3_months",
    "/3months": "3_months",
    "/gen3m": "3_months",
    "/gen_3m": "3_months",
    "/6m": "6_months",
    "/6months": "6_months",
    "/gen6m": "6_months",
    "/gen_6m": "6_months",
    "/1y": "1_year",
    "/1year": "1_year",
    "/gen1y": "1_year",
    "/gen_1y": "1_year",
    "/life": "lifetime",
    "/lifetime": "lifetime",
    "/genlife": "lifetime",
    "/gen_life": "lifetime"
  };
  const fixedDuration = shorthandDurationMap[cmd];
  if (cmd === "/gen" || cmd === "/generate" || fixedDuration) {
    const parsed = parseTelegramGenArgs(parts.slice(1), fixedDuration);
    if (!parsed.duration) {
      const pendingId = Math.random().toString(36).substring(2, 8);
      const pendingName = parsed.customerName || "Engineer Customer";
      const escapedPendingName = pendingName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      pendingGenPrompts.set(pendingId, {
        customerName: pendingName,
        deviceLimit: parsed.deviceLimit,
        createdAt: Date.now()
      });
      if (pendingGenPrompts.size > 200) {
        const oldest = pendingGenPrompts.keys().next().value;
        if (oldest) pendingGenPrompts.delete(oldest);
      }
      const warnMsg = parsed.customerName ? `\u23F3 <b>${escapedPendingName}</b> \u1021\u1010\u103D\u1000\u103A \u101E\u1000\u103A\u1010\u1019\u103A\u1038 (Duration) \u1000\u102D\u102F \u1021\u1031\u102C\u1000\u103A\u1015\u102B\u1001\u101C\u102F\u1010\u103A\u1019\u103B\u102C\u1038\u1019\u103E \u1010\u102D\u102F\u1000\u103A\u101B\u102D\u102F\u1000\u103A\u101B\u103D\u1031\u1038\u1001\u103B\u101A\u103A\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A (\u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A <code>/gen ${escapedPendingName} 1w 1</code> \u1015\u102F\u1036\u1005\u1036\u1016\u103C\u1004\u1037\u103A \u101B\u102D\u102F\u1000\u103A\u1015\u102D\u102F\u1037\u1015\u102B):` : `\u26A0\uFE0F <b>\u101E\u1000\u103A\u1010\u1019\u103A\u1038 (1w / 1m / 3m / 6m / 1y / life) \u1000\u102D\u102F \u1011\u100A\u1037\u103A\u101E\u103D\u1004\u103A\u1038\u1015\u1031\u1038\u1015\u102B!</b>

\u{1F4CC} <b>\u1025\u1015\u1019\u102C\u1019\u103B\u102C\u1038:</b>
\u2022 <code>/gen Ko Aung 1w 1</code> (\u1041 \u1015\u1010\u103A)
\u2022 <code>/gen Ko Aung 1m 1</code> (\u1041 \u101C)
\u2022 <code>/gen Ko Aung 3m 2</code> (\u1043 \u101C - \u1042 \u101C\u102F\u1036\u1038)
\u2022 <code>/gen Ko Aung 1y 1</code> (\u1041 \u1014\u103E\u1005\u103A)
\u2022 <code>/1w Ko Aung</code> (\u1021\u1019\u103C\u1014\u103A\u1011\u102F\u1010\u103A\u1014\u100A\u103A\u1038)

\u{1F447} \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A \u1021\u1031\u102C\u1000\u103A\u1015\u102B\u1001\u101C\u102F\u1010\u103A\u1016\u103C\u1004\u1037\u103A \u1010\u102D\u102F\u1000\u103A\u101B\u102D\u102F\u1000\u103A\u1011\u102F\u1010\u103A\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A:`;
      await sendTelegramMessage(cfg.botToken, chatId, warnMsg, "HTML", {
        inline_keyboard: [
          [
            { text: "\u{1F5D3} 1 Week (7d)", callback_data: `qgen:${pendingId}:1_week:${parsed.deviceLimit}` },
            { text: "\u{1F5D3} 1 Month (30d)", callback_data: `qgen:${pendingId}:1_month:${parsed.deviceLimit}` }
          ],
          [
            { text: "\u{1F5D3} 3 Months (90d)", callback_data: `qgen:${pendingId}:3_months:${parsed.deviceLimit}` },
            { text: "\u{1F5D3} 6 Months (180d)", callback_data: `qgen:${pendingId}:6_months:${parsed.deviceLimit}` }
          ],
          [
            { text: "\u{1F5D3} 1 Year (365d)", callback_data: `qgen:${pendingId}:1_year:${parsed.deviceLimit}` },
            { text: "\u267E Lifetime (10y)", callback_data: `qgen:${pendingId}:lifetime:${parsed.deviceLimit}` }
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
      parsed.customerName || "Engineer Customer",
      parsed.duration,
      parsed.deviceLimit
    );
    return;
  }
  if (cmd === "/licenses") {
    const list = await pullAndMergeLicensesFromSupabase();
    if (list.length === 0) {
      await sendTelegramMessage(cfg.botToken, chatId, `\u{1F4DD} \u1011\u102F\u1010\u103A\u1011\u102C\u1038\u101E\u1031\u102C \u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A \u1019\u101B\u103E\u102D\u101E\u1031\u1038\u1015\u102B\u1001\u1004\u103A\u1017\u103B\u102C\u104B <code>/gen</code> \u1016\u103C\u1004\u1037\u103A \u1005\u1010\u1004\u103A\u1011\u102F\u1010\u103A\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A\u104B`, "HTML");
      return;
    }
    const recent = list.slice(0, 10);
    let reply = `\u{1F4CB} <b>\u1014\u1031\u102C\u1000\u103A\u1006\u102F\u1036\u1038 \u1011\u102F\u1010\u103A\u101C\u102F\u1015\u103A\u1011\u102C\u1038\u101E\u1031\u102C \u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1019\u103B\u102C\u1038 (\u1005\u102F\u1005\u102F\u1015\u1031\u102B\u1004\u103A\u1038 ${list.length} \u1001\u102F \u1021\u1014\u1000\u103A ${recent.length} \u1001\u102F):</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;
    recent.forEach((lic, idx) => {
      const boundCount = lic.boundDevices ? lic.boundDevices.length : 0;
      const statusIcon = lic.status === "active" ? boundCount > 0 ? "\u{1F7E2}" : "\u{1F7E1}" : "\u{1F534}";
      reply += `${idx + 1}. ${statusIcon} <b>${lic.customerName}</b> (${lic.duration})
   \u{1F511} <code>${lic.token}</code>
   \u{1F4F1} Active: ${boundCount}/${lic.deviceLimit} Devices

`;
    });
    reply += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4BE} <b>\u1005\u102C\u101B\u1004\u103A\u1038\u1021\u102C\u1038\u101C\u102F\u1036\u1038\u1000\u102D\u102F Excel / CSV \u1016\u102D\u102F\u1004\u103A\u1016\u103C\u1004\u1037\u103A \u1012\u1031\u102B\u1004\u103A\u1038\u101C\u102F\u1012\u103A \u101B\u101A\u1030\u101B\u1014\u103A:</b>
<code>/csv</code> \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A <code>/export</code> \u101F\u102F \u101B\u102D\u102F\u1000\u103A\u1015\u102D\u102F\u1037\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A\u1001\u1004\u103A\u1017\u103B\u102C!`;
    await sendTelegramMessage(cfg.botToken, chatId, reply, "HTML", {
      inline_keyboard: [
        [
          { text: "\u2600\uFE0F Open Solar Pro", web_app: { url: appUrl } }
        ]
      ]
    });
    return;
  }
  if (cmd === "/stats") {
    const list = await pullAndMergeLicensesFromSupabase();
    const active = list.filter((l) => l.status === "active").length;
    let boundTotal = 0;
    list.forEach((l) => {
      if (Array.isArray(l.boundDevices)) boundTotal += l.boundDevices.length;
    });
    const statsMsg = `\u{1F4CA} <b>SYSTEM LICENSE STATISTICS</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F511} Total Licenses: <b>${list.length}</b>
\u{1F7E2} Active Licenses: <b>${active}</b>
\u{1F4F1} Total Bound Devices: <b>${boundTotal}</b>
\u{1F465} Active User Sessions: <b>${sseClients.size}</b>
\u{1F310} Public GitHub App: ${appUrl}
\u{1F4BE} Server Uptime: Online`;
    await sendTelegramMessage(cfg.botToken, chatId, statsMsg, "HTML", {
      inline_keyboard: [
        [
          { text: "\u2600\uFE0F Open Solar Pro", web_app: { url: appUrl } }
        ]
      ]
    });
    return;
  }
  await sendTelegramMessage(
    cfg.botToken,
    chatId,
    `\u{1F4A1} \u101C\u102D\u102F\u1004\u103A\u1005\u1004\u103A\u1011\u102F\u1010\u103A\u101A\u1030\u101B\u1014\u103A <code>/gen &lt;\u1014\u102C\u1019\u100A\u103A&gt; &lt;1w|1m|3m|6m|1y|life&gt; [1|2]</code> \u101F\u102F \u101B\u102D\u102F\u1000\u103A\u1015\u102D\u102F\u1037\u1015\u102B\u1001\u1004\u103A\u1017\u103B\u102C\u104B
\u1025\u1015\u1019\u102C: <code>/gen Ko Aung 1w 1</code> \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A <code>/1w Ko Aung 1</code>
\u{1F310} App Link \u101B\u101A\u1030\u101B\u1014\u103A <code>/app</code> \u101F\u102F \u1015\u102D\u102F\u1037\u1015\u1031\u1038\u1015\u102B\u104B`,
    "HTML",
    {
      inline_keyboard: [
        [
          { text: "\u2600\uFE0F Open Solar Pro", web_app: { url: appUrl } }
        ]
      ]
    }
  );
}
app.get("/api/telegram/config", (req, res) => {
  res.json({
    success: true,
    config: memoryStorage["telegram_bot"] || DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG
  });
});
app.post("/api/telegram/config", (req, res) => {
  const newConfig = {
    ...DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG,
    ...memoryStorage["telegram_bot"] || {},
    ...req.body.config || req.body
  };
  memoryStorage["telegram_bot"] = newConfig;
  saveStorageToDisk();
  broadcastSSE("telegram_bot", newConfig);
  startTelegramPolling();
  res.json({ success: true, config: newConfig });
});
app.post("/api/telegram/test", async (req, res) => {
  try {
    const { botToken, adminChatId } = req.body;
    const token = botToken || memoryStorage["telegram_bot"]?.botToken;
    const chatId = adminChatId || memoryStorage["telegram_bot"]?.adminChatId;
    if (!token) {
      return res.status(400).json({ success: false, error: "Telegram Bot Token \u1011\u100A\u1037\u103A\u101E\u103D\u1004\u103A\u1038\u1015\u1031\u1038\u1015\u102B\u1001\u1004\u103A\u1017\u103B\u102C" });
    }
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return res.status(400).json({ success: false, error: `Bot Token \u1019\u103E\u102C\u1038\u101A\u103D\u1004\u103A\u1038\u1014\u1031\u1015\u102B\u101E\u100A\u103A: ${meData.description}` });
    }
    const botUsername = meData.result?.username;
    const appUrl = getPublicAppUrl();
    await syncTelegramBotProfileAndMenu(token, appUrl);
    if (chatId) {
      const sendRes = await sendTelegramMessage(
        token,
        chatId,
        `\u2705 <b>UNIQUE SOLAR PRO - Connection Success!</b> \u26A1\uFE0F
Bot: @${botUsername}
\u{1F310} <b>GitHub Pages App:</b> ${appUrl}
Status: Online & Ready to generate license links!`,
        "HTML",
        {
          inline_keyboard: [
            [
              { text: "\u2600\uFE0F Open Solar Pro (Web App)", web_app: { url: appUrl } },
              { text: "\u{1F310} Direct Browser Link", url: appUrl }
            ]
          ]
        }
      );
      if (!sendRes.ok) {
        return res.status(400).json({
          success: false,
          botUsername,
          error: `Bot Token \u1019\u103E\u1014\u103A\u1000\u1014\u103A\u101E\u1031\u102C\u103A\u101C\u100A\u103A\u1038 Chat ID \u101E\u102D\u102F\u1037 \u1005\u102C\u1015\u102D\u102F\u1037\u1019\u101B\u1015\u102B: ${sendRes.description}. Bot \u1011\u1036 \u1026\u1038\u1005\u103D\u102C /start \u1015\u1031\u1038\u1015\u102D\u102F\u1037\u1015\u1031\u1038\u1015\u102B\u1001\u1004\u103A\u1017\u103B\u102C\u104B`
        });
      }
    }
    const updatedCfg = {
      ...DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG,
      ...memoryStorage["telegram_bot"] || {},
      enabled: true,
      botToken: token,
      botUsername: botUsername || "",
      adminChatId: chatId ? String(chatId) : memoryStorage["telegram_bot"]?.adminChatId || "",
      lastTestedAt: (/* @__PURE__ */ new Date()).toISOString()
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
      message: chatId ? `Bot @${botUsername} \u101E\u102D\u102F\u1037 \u1001\u103B\u102D\u1010\u103A\u1006\u1000\u103A\u1019\u103E\u102F \u1021\u1031\u102C\u1004\u103A\u1019\u103C\u1004\u103A\u1015\u103C\u102E\u1038 Chat ID: ${chatId} \u101E\u102D\u102F\u1037 \u1005\u102C\u1010\u102D\u102F \u1015\u102D\u102F\u1037\u1006\u1031\u102C\u1004\u103A\u1015\u103C\u102E\u1038\u1015\u102B\u1015\u103C\u102E!` : `Bot @${botUsername} \u1021\u1010\u100A\u103A\u1015\u103C\u102F\u1015\u103C\u102E\u1038\u1015\u102B\u1015\u103C\u102E!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Telegram test failed" });
  }
});
app.post("/api/telegram/sync-menu", async (req, res) => {
  try {
    const cfg = memoryStorage["telegram_bot"];
    if (!cfg || !cfg.botToken) {
      return res.status(400).json({ success: false, error: "Telegram Bot is not configured yet" });
    }
    const appUrl = getPublicAppUrl();
    const result = await syncTelegramBotProfileAndMenu(cfg.botToken, appUrl);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Sync failed" });
  }
});
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
app.get("/api/sheet-config", (req, res) => {
  res.json({
    success: true,
    config: memoryStorage["sheet_config"] || { webhookUrl: "", spreadsheetUrl: "", spreadsheetName: "Solar Pro - Customer Payment Records", autoSyncOnApproval: true }
  });
});
app.post("/api/sheet-config", (req, res) => {
  const cfg = {
    webhookUrl: req.body.webhookUrl || "",
    spreadsheetUrl: req.body.spreadsheetUrl || "",
    spreadsheetName: req.body.spreadsheetName || "Solar Pro - Customer Payment Records",
    autoSyncOnApproval: req.body.autoSyncOnApproval !== false
  };
  memoryStorage["sheet_config"] = cfg;
  saveStorageToDisk();
  res.json({ success: true, config: cfg });
});
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
  try {
    const envPath = import_path.default.join(process.cwd(), ".env");
    let envContent = import_fs.default.existsSync(envPath) ? import_fs.default.readFileSync(envPath, "utf-8") : "";
    if (envContent.includes("VITE_SUPABASE_URL=")) {
      envContent = envContent.replace(/VITE_SUPABASE_URL=.*/, `VITE_SUPABASE_URL=${cfg.url}`);
    } else {
      envContent += `
VITE_SUPABASE_URL=${cfg.url}`;
    }
    if (envContent.includes("VITE_SUPABASE_ANON_KEY=")) {
      envContent = envContent.replace(/VITE_SUPABASE_ANON_KEY=.*/, `VITE_SUPABASE_ANON_KEY=${cfg.anonKey}`);
    } else {
      envContent += `
VITE_SUPABASE_ANON_KEY=${cfg.anonKey}`;
    }
    import_fs.default.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");
  } catch (e) {
  }
  res.json({ success: true, config: cfg });
});
app.post("/api/publish-update", async (req, res) => {
  const { note, inverters, panels, batteries, mountingDatabase, adminContact, adminResources, appBranding, licenses, paymentConfig } = req.body;
  if (inverters && Array.isArray(inverters)) {
    memoryStorage["inverters"] = inverters;
    try {
      const pubDir = import_path.default.join(process.cwd(), "public", "data");
      const docsDir = import_path.default.join(process.cwd(), "docs", "data");
      if (!import_fs.default.existsSync(pubDir)) import_fs.default.mkdirSync(pubDir, { recursive: true });
      if (!import_fs.default.existsSync(docsDir)) import_fs.default.mkdirSync(docsDir, { recursive: true });
      import_fs.default.writeFileSync(import_path.default.join(pubDir, "inverters.json"), JSON.stringify(inverters, null, 2), "utf-8");
      import_fs.default.writeFileSync(import_path.default.join(docsDir, "inverters.json"), JSON.stringify(inverters, null, 2), "utf-8");
    } catch (e) {
    }
  }
  if (panels && Array.isArray(panels)) {
    memoryStorage["panels"] = panels;
    try {
      const pubDir = import_path.default.join(process.cwd(), "public", "data");
      const docsDir = import_path.default.join(process.cwd(), "docs", "data");
      if (!import_fs.default.existsSync(pubDir)) import_fs.default.mkdirSync(pubDir, { recursive: true });
      if (!import_fs.default.existsSync(docsDir)) import_fs.default.mkdirSync(docsDir, { recursive: true });
      import_fs.default.writeFileSync(import_path.default.join(pubDir, "panels.json"), JSON.stringify(panels, null, 2), "utf-8");
      import_fs.default.writeFileSync(import_path.default.join(docsDir, "panels.json"), JSON.stringify(panels, null, 2), "utf-8");
    } catch (e) {
    }
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
  if (paymentConfig) {
    memoryStorage["payment_config"] = paymentConfig;
  }
  saveStorageToDisk();
  const publishedAt = (/* @__PURE__ */ new Date()).toISOString();
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
  const cloudRows = [
    { id: "global_system_published", value: { publishedAt, note: publishPayload.note, timestamp: Date.now() }, updated_at: publishedAt }
  ];
  if (Array.isArray(memoryStorage["inverters"])) {
    cloudRows.push(
      { id: "global_custom_inverters", value: memoryStorage["inverters"], updated_at: publishedAt },
      { id: "inverters", value: memoryStorage["inverters"], updated_at: publishedAt }
    );
  }
  if (Array.isArray(memoryStorage["panels"])) {
    cloudRows.push(
      { id: "global_custom_panels", value: memoryStorage["panels"], updated_at: publishedAt },
      { id: "panels", value: memoryStorage["panels"], updated_at: publishedAt }
    );
  }
  if (Array.isArray(memoryStorage["batteries"])) {
    cloudRows.push({ id: "global_custom_batteries", value: memoryStorage["batteries"], updated_at: publishedAt });
  }
  if (memoryStorage["mounting_database"]) {
    cloudRows.push({ id: "global_mounting_database", value: memoryStorage["mounting_database"], updated_at: publishedAt });
  }
  if (memoryStorage["admin_contact"]) {
    cloudRows.push(
      { id: "global_admin_contact", value: memoryStorage["admin_contact"], updated_at: publishedAt },
      { id: "admin_contact_config", value: memoryStorage["admin_contact"], updated_at: publishedAt }
    );
  }
  if (memoryStorage["app_branding"]) {
    cloudRows.push({ id: "global_app_branding", value: memoryStorage["app_branding"], updated_at: publishedAt });
  }
  if (memoryStorage["payment_config"]) {
    cloudRows.push({ id: "global_payment_config", value: memoryStorage["payment_config"], updated_at: publishedAt });
  }
  if (Array.isArray(memoryStorage["resources"])) {
    const lightResources = memoryStorage["resources"].map((r) => {
      if (r.fileData && String(r.fileData).startsWith("data:")) {
        upsertSupabaseAppSettings([{
          id: `resource_file_${r.id}`,
          value: { id: r.id, fileName: r.fileName, fileType: r.fileType, fileData: r.fileData },
          updated_at: publishedAt
        }]).catch(() => {
        });
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
  }).catch(() => {
  });
  res.json({ success: true, publishedAt: publishPayload.publishedAt });
});
app.get("/api/data/:key", (req, res) => {
  const key = req.params.key;
  if (key === "site_surveys" || key === "load_calculations") {
    return res.json({ success: true, key, data: null });
  }
  const val = memoryStorage[key];
  if (val !== void 0) {
    res.json({ success: true, key, data: val });
  } else {
    res.json({ success: true, key, data: null });
  }
});
app.get("/api/files/:id", (req, res) => {
  const id = req.params.id;
  const resources = memoryStorage["resources"] || [];
  const resource = resources.find((r) => r.id === id);
  const filePath = import_path.default.join(UPLOADS_DIR, id);
  if (import_fs.default.existsSync(filePath)) {
    const filename = resource ? resource.fileName : `${id}.bin`;
    const mimeType = resource?.fileType || (filename.endsWith(".pdf") ? "application/pdf" : filename.endsWith(".csv") ? "text/csv" : "application/octet-stream");
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return import_fs.default.createReadStream(filePath).pipe(res);
  }
  if (resource && resource.fileData) {
    const fileData = resource.fileData;
    let base64Content = fileData;
    let mimeType = resource.fileType || "application/pdf";
    if (fileData.startsWith("data:")) {
      const parts = fileData.split(";base64,");
      mimeType = parts[0].replace("data:", "") || mimeType;
      base64Content = parts[1] || "";
    }
    const buffer = Buffer.from(base64Content, "base64");
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(resource.fileName)}"`);
    return res.send(buffer);
  }
  return res.status(404).json({ error: "File not found" });
});
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
      description: (description || "").trim(),
      category: category || "datasheet",
      fileName: fileName.trim(),
      fileSize: fileSize || "1.0 MB",
      fileType: fileType || (fileName.endsWith(".csv") ? "text/csv" : "application/pdf"),
      fileUrl,
      hasCloudFile: Boolean(fileData),
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      uploadedBy: uploadedBy || "Admin",
      isPaidOnly: isPaidOnly !== false,
      downloadsCount: 0
    };
    const currentResources = memoryStorage["resources"] || [];
    memoryStorage["resources"] = [newResource, ...currentResources];
    saveStorageToDisk();
    broadcastSSE("resources", memoryStorage["resources"]);
    (async () => {
      if (fileData) {
        await upsertSupabaseAppSettings([{
          id: `resource_file_${id}`,
          value: { id, fileName: newResource.fileName, fileType: newResource.fileType, fileData }
        }]);
      }
      const lightResources = memoryStorage["resources"].map((r) => {
        const { fileData: _ignored, ...meta } = r;
        return meta;
      });
      await upsertSupabaseAppSettings([{ id: "global_admin_resources", value: lightResources }]);
      await broadcastSupabaseEvent("resources_changed", { count: lightResources.length, timestamp: Date.now() });
    })().catch(() => {
    });
    return res.json({ success: true, resource: newResource, count: memoryStorage["resources"].length });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
});
app.post("/api/data/:key", (req, res) => {
  const key = req.params.key;
  let { data } = req.body;
  if (key === "site_surveys" || key === "load_calculations") {
    return res.json({ success: true, key, count: Array.isArray(data) ? data.length : 1, private: true });
  }
  if (key === "resources" && Array.isArray(data)) {
    data = data.map((r) => {
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
  if (key === "inverters" || key === "panels") {
    try {
      const pubDir = import_path.default.join(process.cwd(), "public", "data");
      const docsDir = import_path.default.join(process.cwd(), "docs", "data");
      if (!import_fs.default.existsSync(pubDir)) import_fs.default.mkdirSync(pubDir, { recursive: true });
      if (!import_fs.default.existsSync(docsDir)) import_fs.default.mkdirSync(docsDir, { recursive: true });
      import_fs.default.writeFileSync(import_path.default.join(pubDir, `${key}.json`), JSON.stringify(data, null, 2), "utf-8");
      import_fs.default.writeFileSync(import_path.default.join(docsDir, `${key}.json`), JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn(`Could not write static public/docs file for ${key}:`, e);
    }
  }
  broadcastSSE(key, data);
  (async () => {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
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
      const lightResources = data.map((r) => {
        if (r.fileData && String(r.fileData).startsWith("data:")) {
          upsertSupabaseAppSettings([{
            id: `resource_file_${r.id}`,
            value: { id: r.id, fileName: r.fileName, fileType: r.fileType, fileData: r.fileData },
            updated_at: nowIso
          }]).catch(() => {
          });
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
  })().catch(() => {
  });
  res.json({ success: true, key, count: Array.isArray(data) ? data.length : 1 });
});
app.get("/api/backup/export", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="solar_system_backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json"`);
  res.json({
    exportDate: (/* @__PURE__ */ new Date()).toISOString(),
    version: "2.5",
    data: memoryStorage
  });
});
app.post("/api/backup/import", (req, res) => {
  try {
    const payload = req.body;
    const backupData = payload.data || payload;
    if (!backupData || typeof backupData !== "object") {
      return res.status(400).json({ error: "Invalid backup data structure" });
    }
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
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to restore backup" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, HOST, () => {
    console.log(`Solar Sizer Server running on http://${HOST}:${PORT}`);
    syncAllDataFromSupabaseOnStartup().catch(() => {
    });
    startTelegramPolling();
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
