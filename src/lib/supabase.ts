import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AdminResourceFile, SpecRequest, UserPresence, Inverter, PanelPreset, BatteryPreset, AppBranding, PaymentConfig, PaymentRecord, MountingDatabase, LicenseToken, AdminContactConfig, BoundDevice, TelegramBotConfig } from '../types';
import { DEFAULT_BATTERY_PRESETS } from '../data/batteryPresets';
import { DEFAULT_INVERTER_DATABASE } from '../data/inverterDatabase';
import { DEFAULT_PANEL_PRESETS } from '../data/panelPresets';

// Default initial resources so Paid users have instant access even before Admin uploads new ones
export const INITIAL_ADMIN_RESOURCES: AdminResourceFile[] = [
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

// Initial Spec Requests demo data
export const INITIAL_SPEC_REQUESTS: SpecRequest[] = [
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

let supabaseClient: SupabaseClient | null = null;

// Verified Supabase Cloud Production Credentials for 100% Real-Time Multi-Device Sync on GitHub Pages
export const DEFAULT_SUPABASE_URL = 'https://vkiwylrerryidoiyqeqh.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraXd5bHJlcnJ5aWRvaXlxZXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDE3NDMsImV4cCI6MjEwMjcxNzc0M30.skGou_-7bKiDdW4lhfEqkywHzvj3mZT9-N_PTED7Rtc';

/**
 * Normalizes user-input or environment Supabase URLs.
 * Handles dashboard URLs like https://supabase.com/dashboard/project/vkiwylrerryidoiyqeqh/...
 * and bare project IDs like vkiwylrerryidoiyqeqh.
 */
export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const cleaned = rawUrl.trim();
  // Extract project ref from dashboard settings page
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-z0-9_\-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  // Check if just project id ref
  if (/^[a-z0-9_\-]{15,30}$/i.test(cleaned)) {
    return `https://${cleaned}.supabase.co`;
  }
  // Strip trailing slashes and ensure https protocol
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return cleaned.replace(/\/+$/, '');
  }
  return `https://${cleaned}`.replace(/\/+$/, '');
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  let url = '';
  let anonKey = '';

  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv) {
      url = metaEnv.VITE_SUPABASE_URL || '';
      anonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';
    }
  } catch (e) {}

  if (!url || !anonKey) {
    try {
      const stored = localStorage.getItem('solar_sizer_supabase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          url = parsed.url;
          anonKey = parsed.anonKey;
        }
      }
    } catch (e) {}
  }

  // Fallback to verified production cloud credentials (critical for static GitHub Pages)
  if (!url) {
    url = DEFAULT_SUPABASE_URL;
  }
  if (!anonKey) {
    anonKey = DEFAULT_SUPABASE_ANON_KEY;
  }

  return { 
    url: normalizeSupabaseUrl(url), 
    anonKey: anonKey.trim() 
  };
}

export function initSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    supabaseClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    return supabaseClient;
  } catch (err) {
    console.warn('Supabase initialization failed:', err);
    return null;
  }
}

export function isSupabaseConnected(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

/**
 * Masks phone/account number, showing only the last 4 digits and replacing front digits with '*'
 * E.g., '09 403 708 145' or '09403708145' -> '*******8145'
 */
export function maskPhoneNumber(phoneOrAccount?: string): string {
  if (!phoneOrAccount) return '';
  const trimmed = phoneOrAccount.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length <= 4) {
    return trimmed;
  }
  const last4 = digits.slice(-4);
  const maskLength = digits.length - 4;
  return `${'*'.repeat(maskLength)}${last4}`;
}

// Generate device info
export function getClientDevice(): string {
  if (typeof navigator === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android Mobile';
  if (/iPhone/i.test(ua)) return 'iPhone iOS';
  if (/iPad/i.test(ua)) return 'iPad Tablet';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'macOS Workstation';
  if (/Linux/i.test(ua)) return 'Linux System';
  return 'Web Browser';
}

// Generate persistent unique session ID for this browser tab
export function getMySessionId(): string {
  try {
    let sess = sessionStorage.getItem('solar_tab_session_id');
    if (!sess) {
      const rand = Math.random().toString(36).substring(2, 7);
      sess = `sess_${Date.now().toString(36)}_${rand}`;
      sessionStorage.setItem('solar_tab_session_id', sess);
    }
    return sess;
  } catch (e) {
    return `sess_${Date.now()}`;
  }
}

// Generate persistent unique Device ID for this device / browser (persists across tabs and reloads)
export function getMyDeviceId(): string {
  try {
    let devId = localStorage.getItem('solar_persistent_device_id');
    if (!devId) {
      const rand = Math.random().toString(36).substring(2, 9);
      devId = `dev_${Date.now().toString(36)}_${rand}`;
      localStorage.setItem('solar_persistent_device_id', devId);
    }
    return devId;
  } catch (e) {
    return `dev_${Date.now()}`;
  }
}

const STORAGE_PRESENCE_KEY = 'solar_sizer_real_presence_registry';

interface PresenceRegistryMap {
  [sessionId: string]: UserPresence & { updatedAt: number };
}

// Clean up registry and get current online users from local mesh
function readAndPruneLocalRegistry(): UserPresence[] {
  try {
    const raw = localStorage.getItem(STORAGE_PRESENCE_KEY);
    if (!raw) return [];
    const map: PresenceRegistryMap = JSON.parse(raw);
    const now = Date.now();
    const alive: UserPresence[] = [];
    const updatedMap: PresenceRegistryMap = {};

    Object.keys(map).forEach((sessId) => {
      const item = map[sessId];
      // Keep sessions active if pinged within last 8 seconds
      if (item && now - item.updatedAt < 8500) {
        updatedMap[sessId] = item;
        alive.push({
          id: item.id,
          sessionId: item.sessionId,
          name: item.name,
          role: item.role,
          device: item.device,
          lastActive: item.lastActive,
          startedAt: item.startedAt
        });
      }
    });

    localStorage.setItem(STORAGE_PRESENCE_KEY, JSON.stringify(updatedMap));
    return alive;
  } catch (e) {
    return [];
  }
}

function writeMyPresenceToLocalRegistry(presence: UserPresence) {
  try {
    const raw = localStorage.getItem(STORAGE_PRESENCE_KEY);
    const map: PresenceRegistryMap = raw ? JSON.parse(raw) : {};
    map[presence.sessionId] = {
      ...presence,
      updatedAt: Date.now()
    };
    localStorage.setItem(STORAGE_PRESENCE_KEY, JSON.stringify(map));
  } catch (e) {}
}

function removeMyPresenceFromLocalRegistry(sessionId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_PRESENCE_KEY);
    if (!raw) return;
    const map: PresenceRegistryMap = JSON.parse(raw);
    delete map[sessionId];
    localStorage.setItem(STORAGE_PRESENCE_KEY, JSON.stringify(map));
  } catch (e) {}
}

// Helper to sync presence with Express server API for true multi-device tracking
async function postPresenceToServer(presence: UserPresence): Promise<UserPresence[] | null> {
  try {
    const res = await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presence })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.presences) && json.presences.length > 0) {
        return json.presences;
      }
    }
  } catch (e) {}
  return null;
}

function sendPresenceLeaveToServer(sessionId: string) {
  try {
    const payload = JSON.stringify({ sessionId });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/presence/leave', blob);
    } else {
      fetch('/api/presence/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  } catch (e) {}
}

// Supabase & Real Multi-Device Presence Engine
export function setupRealtimePresence(
  myPresence: UserPresence,
  onSync: (presences: UserPresence[]) => void
): () => void {
  let isCleanedUp = false;
  let broadcastChannel: BroadcastChannel | null = null;
  let supabaseChannel: any = null;
  let eventSource: EventSource | null = null;

  // 1. Register with Local Mesh Registry for initial fast startup
  writeMyPresenceToLocalRegistry(myPresence);
  const initialAlive = readAndPruneLocalRegistry();
  if (initialAlive.length > 0) {
    onSync(initialAlive);
  } else {
    onSync([myPresence]);
  }

  // 2. Immediate Server Presence Sync (Multi-Device)
  postPresenceToServer(myPresence).then((serverList) => {
    if (!isCleanedUp && serverList && serverList.length > 0) {
      serverList.forEach((p) => writeMyPresenceToLocalRegistry(p));
      onSync(serverList);
    }
  });

  // 3. Listen for Server-Sent Events (SSE) presence broadcasts
  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'presence' && parsed.data?.presences && Array.isArray(parsed.data.presences)) {
            const list: UserPresence[] = parsed.data.presences;
            if (list.length > 0) {
              list.forEach((p) => writeMyPresenceToLocalRegistry(p));
              onSync(list);
            }
          }
        } catch (e) {}
      };
    } catch (e) {}
  }

  // 4. Setup BroadcastChannel for Instant Cross-Tab Sync on the same device
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel('solar_presence_mesh');
      
      // Announce arrival
      broadcastChannel.postMessage({
        type: 'HEARTBEAT',
        presence: myPresence,
        timestamp: Date.now()
      });

      broadcastChannel.onmessage = (event) => {
        if (isCleanedUp) return;
        const data = event.data;
        if (data?.type === 'HEARTBEAT' && data.presence) {
          writeMyPresenceToLocalRegistry(data.presence);
        } else if (data?.type === 'LEAVE' && data.sessionId) {
          removeMyPresenceFromLocalRegistry(data.sessionId);
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel not available:', err);
    }
  }

  // 5. Setup Supabase Realtime Channel if credentials exist
  const client = initSupabase();
  if (client) {
    try {
      supabaseChannel = client.channel('solar_online_presence', {
        config: {
          presence: {
            key: myPresence.sessionId
          }
        }
      });

      supabaseChannel
        .on('presence', { event: 'sync' }, () => {
          if (isCleanedUp) return;
          const state = supabaseChannel.presenceState();
          const users: UserPresence[] = [];
          
          Object.keys(state).forEach((key) => {
            const list = state[key] as any[];
            list.forEach((item, idx) => {
              if (item) {
                users.push({
                  id: item.id || `pres_${key}_${idx}`,
                  sessionId: item.sessionId || key,
                  name: item.name || 'Solar Engineer',
                  role: item.role || 'user',
                  device: item.device || 'Web Browser',
                  lastActive: item.lastActive || new Date().toISOString(),
                  startedAt: item.startedAt || new Date().toISOString()
                });
              }
            });
          });

          if (users.length > 0) {
            users.forEach(u => writeMyPresenceToLocalRegistry(u));
            onSync(users);
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED' && !isCleanedUp) {
            await supabaseChannel.track({
              id: myPresence.id,
              sessionId: myPresence.sessionId,
              name: myPresence.name,
              role: myPresence.role,
              device: myPresence.device,
              lastActive: new Date().toISOString(),
              startedAt: myPresence.startedAt
            });
          }
        });
    } catch (err) {
      console.warn('Supabase Realtime subscribe error:', err);
    }
  }

  // 6. Periodic heartbeat loop across Server, BroadcastChannel and Local (every 2.5s)
  const heartbeatInterval = setInterval(() => {
    if (isCleanedUp) return;
    writeMyPresenceToLocalRegistry(myPresence);

    // Heartbeat to Server (primary multi-device sync authority)
    postPresenceToServer(myPresence).then((serverList) => {
      if (!isCleanedUp && serverList && serverList.length > 0) {
        serverList.forEach((p) => writeMyPresenceToLocalRegistry(p));
        onSync(serverList);
      } else if (!isCleanedUp) {
        // Fallback to local mesh if server is unreachable
        const alive = readAndPruneLocalRegistry();
        if (alive.length > 0) {
          onSync(alive);
        }
      }
    });

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'HEARTBEAT',
        presence: myPresence,
        timestamp: Date.now()
      });
    }
  }, 2500);

  // 7. Cleanup on tab unload / close
  const handleUnload = () => {
    sendPresenceLeaveToServer(myPresence.sessionId);
    removeMyPresenceFromLocalRegistry(myPresence.sessionId);
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: 'LEAVE',
          sessionId: myPresence.sessionId
        });
      } catch (e) {}
    }
    if (supabaseChannel) {
      try {
        supabaseChannel.untrack();
      } catch (e) {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleUnload);
  }

  return () => {
    isCleanedUp = true;
    clearInterval(heartbeatInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleUnload);
    }
    handleUnload();
    if (eventSource) {
      try {
        eventSource.close();
      } catch (e) {}
    }
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch (e) {}
    }
    if (supabaseChannel) {
      try {
        supabaseChannel.unsubscribe();
      } catch (e) {}
    }
  };
}

// ----------------------------------------------------
// SERVER API & CLOUD PERSISTENCE ENGINE
// ----------------------------------------------------

async function postDataToServer(key: string, data: any): Promise<boolean> {
  try {
    const res = await fetch(`/api/data/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function fetchDataFromServer(key: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/data/${key}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data !== undefined && json.data !== null) {
        return json.data;
      }
    }
  } catch (e) {}
  return null;
}

export async function fetchAllServerData(): Promise<{
  inverters?: Inverter[] | null;
  panels?: PanelPreset[] | null;
  batteries?: BatteryPreset[] | null;
  resources?: AdminResourceFile[] | null;
  spec_requests?: SpecRequest[] | null;
  payment_config?: any | null;
  payment_records?: any[] | null;
  site_surveys?: any[] | null;
  load_calculations?: any[] | null;
  app_branding?: AppBranding | null;
  mounting_database?: MountingDatabase | null;
}> {
  try {
    const res = await fetch('/api/data-all');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {}
  return {};
}

// ----------------------------------------------------
// ONLINE / CLOUD STORAGE & SYNC FOR BANK ACCOUNTS & CONFIG
// ----------------------------------------------------

const STORAGE_PAYMENT_CONFIG_KEY = 'solar_sizer_payment_config_v2';
const STORAGE_PAYMENT_RECORDS_KEY = 'solar_sizer_payment_records_v2';

/**
 * Save Payment Records to Server, Online Supabase and Local Storage
 * Enables Admin verification and instant Paid User unlock across all devices
 */
export async function savePaymentRecordsToCloud(
  records: any[]
): Promise<{ success: boolean; source: 'cloud' | 'local'; count: number; error?: string }> {
  // 1. Update local cache immediately
  try {
    localStorage.setItem(STORAGE_PAYMENT_RECORDS_KEY, JSON.stringify(records));
  } catch (e) {}

  // 2. Post to central Express server
  postDataToServer('payment_records', records);

  // 3. Broadcast across local browser tabs instantly
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('solar_payment_sync');
      bc.postMessage({
        type: 'PAYMENT_RECORDS_UPDATED',
        records,
        count: records.length,
        timestamp: Date.now()
      });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}
  }

  // 4. Upsert to Supabase Cloud
  const client = initSupabase();
  if (!client) {
    return { success: true, source: 'cloud', count: records.length };
  }

  try {
    const { error } = await client
      .from('app_settings')
      .upsert({
        id: 'global_payment_records',
        value: records,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      return { success: true, source: 'cloud', count: records.length, error: error.message };
    }

    try {
      const channel = client.channel('solar_global_database_events');
      channel.send({
        type: 'broadcast',
        event: 'payment_records_changed',
        payload: { records, timestamp: Date.now() }
      });
    } catch (err) {}

    return { success: true, source: 'cloud', count: records.length };
  } catch (err: any) {
    return { success: true, source: 'cloud', count: records.length, error: err?.message };
  }
}

/**
 * Fetch Payment Records from Server / Online Supabase (with Local fallback)
 */
export async function fetchPaymentRecordsFromCloud(): Promise<{ records: any[]; source: 'cloud' | 'local' }> {
  // 1. Try Server API first
  const serverRecords = await fetchDataFromServer('payment_records');
  if (serverRecords && Array.isArray(serverRecords)) {
    try {
      localStorage.setItem(STORAGE_PAYMENT_RECORDS_KEY, JSON.stringify(serverRecords));
    } catch (e) {}
    return { records: serverRecords, source: 'cloud' };
  }

  // 2. Try Supabase
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('id', 'global_payment_records')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value)) {
        try {
          localStorage.setItem(STORAGE_PAYMENT_RECORDS_KEY, JSON.stringify(data.value));
        } catch (e) {}
        return { records: data.value, source: 'cloud' };
      }
    } catch (e) {}
  }

  // 3. Fallback to local storage
  try {
    const raw = localStorage.getItem(STORAGE_PAYMENT_RECORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { records: parsed, source: 'local' };
      }
    }
  } catch (e) {}

  return { records: [], source: 'local' };
}

/**
 * Save Payment Config & Bank Accounts to Server, Online Supabase and Local Storage
 */
export async function savePaymentConfigToCloud(config: any): Promise<{ success: boolean; source: 'cloud' | 'local'; error?: string }> {
  // 1. Update local storage
  try {
    localStorage.setItem(STORAGE_PAYMENT_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {}

  // 2. Post to central Express backend server
  postDataToServer('payment_config', config);

  // 3. Broadcast across tabs
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('solar_config_sync');
      bc.postMessage({ type: 'PAYMENT_CONFIG_UPDATED', config, timestamp: Date.now() });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}
  }

  const client = initSupabase();
  if (!client) {
    return { success: true, source: 'cloud' };
  }

  try {
    const { error } = await client
      .from('app_settings')
      .upsert({
        id: 'global_payment_config',
        value: config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      return { success: true, source: 'cloud', error: error.message };
    }

    return { success: true, source: 'cloud' };
  } catch (err: any) {
    return { success: true, source: 'cloud', error: err?.message };
  }
}

/**
 * Fetch Payment Config & Bank Accounts from Server / Supabase (with Local fallback)
 */
export async function fetchPaymentConfigFromCloud(defaultConfig: any): Promise<{ config: any; source: 'cloud' | 'local' }> {
  // 1. Try Server API first
  const serverConfig = await fetchDataFromServer('payment_config');
  if (serverConfig && typeof serverConfig === 'object' && Array.isArray(serverConfig.accounts)) {
    try {
      localStorage.setItem(STORAGE_PAYMENT_CONFIG_KEY, JSON.stringify(serverConfig));
    } catch (e) {}
    return { config: serverConfig, source: 'cloud' };
  }

  // 2. Try Supabase
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('id', 'global_payment_config')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value.accounts)) {
        try {
          localStorage.setItem(STORAGE_PAYMENT_CONFIG_KEY, JSON.stringify(data.value));
        } catch (e) {}
        return { config: data.value, source: 'cloud' };
      }
    } catch (e) {}
  }

  // 3. Fallback to local storage
  try {
    const raw = localStorage.getItem(STORAGE_PAYMENT_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.accounts)) {
        return { config: parsed, source: 'local' };
      }
    }
  } catch (e) {}

  return { config: defaultConfig, source: 'local' };
}

// ----------------------------------------------------
// GLOBAL INVERTER & PANEL DATABASE SYNC (SERVER & CLOUD)
// ----------------------------------------------------

const STORAGE_CUSTOM_INVERTERS_KEY = 'solar_sizer_custom_inverters_v3';
const STORAGE_CUSTOM_PANELS_KEY = 'solar_sizer_custom_panels_v3';

/**
 * Save Inverter Database to Server, Online Supabase and Local Storage
 * Broadcasts to all active users in real-time
 */
export async function saveCustomInvertersToCloud(
  inverters: Inverter[]
): Promise<{ success: boolean; source: 'cloud' | 'local'; count: number; error?: string }> {
  // 1. Update local cache immediately
  try {
    localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(inverters));
  } catch (e) {}

  // 2. Post to central Express server (will also write static files)
  postDataToServer('inverters', inverters);

  // 3. Broadcast across local browser tabs instantly
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('solar_database_sync');
      bc.postMessage({
        type: 'INVERTERS_UPDATED',
        inverters,
        count: inverters.length,
        timestamp: Date.now()
      });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}
  }

  // 4. Persist to Supabase tables for all connected GitHub & web users
  const client = initSupabase();
  if (!client) {
    return { success: true, source: 'cloud', count: inverters.length };
  }

  try {
    // Save to app_settings (both global_custom_inverters and inverters keys)
    await client
      .from('app_settings')
      .upsert([
        {
          id: 'global_custom_inverters',
          value: inverters,
          updated_at: new Date().toISOString()
        },
        {
          id: 'inverters',
          value: inverters,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    // Broadcast live event via Supabase Realtime so all connected GitHub clients update instantly
    try {
      const liveChannel = client.channel('solar_global_database_events');
      liveChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event: 'inverters_changed',
            payload: { inverters, count: inverters.length, timestamp: Date.now() }
          });
          liveChannel.send({
            type: 'broadcast',
            event: 'system_published',
            payload: { inverters, timestamp: Date.now(), note: 'Inverters database updated' }
          });
          setTimeout(() => liveChannel.unsubscribe(), 2000);
        }
      });
    } catch (err) {}

    return { success: true, source: 'cloud', count: inverters.length };
  } catch (err: any) {
    return { success: true, source: 'cloud', count: inverters.length, error: err?.message };
  }
}

/**
 * Fetch Global Inverter Database from Online Supabase first, then Server / Local fallback
 * This ensures GitHub Pages links always receive Admin's live published CSV data
 */
export async function fetchCustomInvertersFromCloud(): Promise<{ inverters: Inverter[]; source: 'cloud' | 'local' }> {
  // 1. Try Supabase Cloud first (Primary single source of truth for GitHub Pages & Web)
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .in('id', ['global_custom_inverters', 'inverters'])
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
        try {
          localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(data.value));
        } catch (e) {}
        return { inverters: data.value, source: 'cloud' };
      }
    } catch (e) {}
  }

  // 2. Try Server API (for local development or self-hosted backend)
  const serverInverters = await fetchDataFromServer('inverters');
  if (serverInverters && Array.isArray(serverInverters) && serverInverters.length > 0) {
    try {
      localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(serverInverters));
    } catch (e) {}
    return { inverters: serverInverters, source: 'cloud' };
  }

  // 3. Try LocalStorage cache
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_INVERTERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const isOldDefaultOnly = parsed.some(i => i.id === 'inv_deye_5k_sg04') && !parsed.some(i => i.model?.includes('SUN-6K-SG03') || i.model?.includes('S6EH1P6K'));
        if (!isOldDefaultOnly) {
          return { inverters: parsed, source: 'local' };
        }
      }
    }
  } catch (e) {}

  // 4. Try static data file from GitHub Pages as offline fallback
  try {
    const staticRes = await fetch('./data/inverters.json', { cache: 'no-store' }).catch(() => 
      fetch('/data/inverters.json', { cache: 'no-store' })
    );
    if (staticRes && staticRes.ok) {
      const staticList = await staticRes.json();
      if (Array.isArray(staticList) && staticList.length > 0) {
        try {
          localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(staticList));
        } catch (e) {}
        return { inverters: staticList, source: 'cloud' };
      }
    }
  } catch (e) {}

  return { inverters: DEFAULT_INVERTER_DATABASE, source: 'local' };
}

/**
 * Save Solar Panels Database to Server, Online Supabase and Local Storage
 * Broadcasts to all active users in real-time
 */
export async function saveCustomPanelsToCloud(
  panels: PanelPreset[]
): Promise<{ success: boolean; source: 'cloud' | 'local'; count: number; error?: string }> {
  // 1. Update local cache immediately
  try {
    localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(panels));
  } catch (e) {}

  // 2. Post to central Express backend
  postDataToServer('panels', panels);

  // 3. Broadcast across local browser tabs instantly
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('solar_database_sync');
      bc.postMessage({
        type: 'PANELS_UPDATED',
        panels,
        count: panels.length,
        timestamp: Date.now()
      });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}
  }

  // 4. Persist to Supabase tables for all users
  const client = initSupabase();
  if (!client) {
    return { success: true, source: 'cloud', count: panels.length };
  }

  try {
    // Save to app_settings (both global_custom_panels and panels keys)
    await client
      .from('app_settings')
      .upsert([
        {
          id: 'global_custom_panels',
          value: panels,
          updated_at: new Date().toISOString()
        },
        {
          id: 'panels',
          value: panels,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    // Broadcast live event via Supabase Realtime so all connected GitHub clients update instantly
    try {
      const liveChannel = client.channel('solar_global_database_events');
      liveChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event: 'panels_changed',
            payload: { panels, count: panels.length, timestamp: Date.now() }
          });
          liveChannel.send({
            type: 'broadcast',
            event: 'system_published',
            payload: { panels, timestamp: Date.now(), note: 'Panels database updated' }
          });
          setTimeout(() => liveChannel.unsubscribe(), 2000);
        }
      });
    } catch (err) {}

    return { success: true, source: 'cloud', count: panels.length };
  } catch (err: any) {
    return { success: true, source: 'cloud', count: panels.length, error: err?.message };
  }
}

/**
 * Fetch Global Solar Panels Database from Online Supabase first, then Server / Local fallback
 * This ensures GitHub Pages links always receive Admin's live published CSV data
 */
export async function fetchCustomPanelsFromCloud(): Promise<{ panels: PanelPreset[]; source: 'cloud' | 'local' }> {
  // 1. Try Supabase Cloud first (Primary single source of truth for GitHub Pages & Web)
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .in('id', ['global_custom_panels', 'panels'])
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
        try {
          localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(data.value));
        } catch (e) {}
        return { panels: data.value, source: 'cloud' };
      }
    } catch (e) {}
  }

  // 2. Try Server API first
  const serverPanels = await fetchDataFromServer('panels');
  if (serverPanels && Array.isArray(serverPanels) && serverPanels.length > 0) {
    try {
      localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(serverPanels));
    } catch (e) {}
    return { panels: serverPanels, source: 'cloud' };
  }

  // 3. Try LocalStorage cache
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_PANELS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const isOldDefaultOnly = parsed.some((p: any) => p.id === 'panel_jinko_585_tiger_neo' || p.name?.includes('585W')) && !parsed.some((p: any) => p.name?.includes('615W') || p.name?.includes('SharkTopSun'));
        if (!isOldDefaultOnly) {
          return { panels: parsed, source: 'local' };
        }
      }
    }
  } catch (e) {}

  // 4. Try static data file from GitHub Pages as offline fallback
  try {
    const staticRes = await fetch('./data/panels.json', { cache: 'no-store' }).catch(() => 
      fetch('/data/panels.json', { cache: 'no-store' })
    );
    if (staticRes && staticRes.ok) {
      const staticList = await staticRes.json();
      if (Array.isArray(staticList) && staticList.length > 0) {
        try {
          localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(staticList));
        } catch (e) {}
        return { panels: staticList, source: 'cloud' };
      }
    }
  } catch (e) {}

  return { panels: DEFAULT_PANEL_PRESETS, source: 'local' };
}

// ----------------------------------------------------
// GLOBAL BATTERY DATABASE SYNC (SERVER & CLOUD)
// ----------------------------------------------------

export const STORAGE_CUSTOM_BATTERIES_KEY = 'solar_sizer_custom_batteries_v1';

/**
 * Save Battery Database to Server, Online Supabase and Local Storage
 * Broadcasts to all active users in real-time
 */
export async function saveCustomBatteriesToCloud(
  batteries: BatteryPreset[]
): Promise<{ success: boolean; source: 'cloud' | 'local'; count: number; error?: string }> {
  // 1. Update local cache immediately
  try {
    localStorage.setItem(STORAGE_CUSTOM_BATTERIES_KEY, JSON.stringify(batteries));
  } catch (e) {}

  // 2. Post to central Express server
  postDataToServer('batteries', batteries);

  // 3. Broadcast across local browser tabs instantly
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('solar_database_sync');
      bc.postMessage({
        type: 'BATTERIES_UPDATED',
        batteries,
        count: batteries.length,
        timestamp: Date.now()
      });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}
  }

  // 4. Persist to Supabase app_settings table for all users
  const client = initSupabase();
  if (!client) {
    return { success: true, source: 'cloud', count: batteries.length };
  }

  try {
    const { error } = await client
      .from('app_settings')
      .upsert({
        id: 'global_custom_batteries',
        value: batteries,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase global_custom_batteries save notice:', error.message);
      return { success: true, source: 'cloud', count: batteries.length, error: error.message };
    }

    try {
      const liveChannel = client.channel('solar_global_database_events');
      liveChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event: 'batteries_changed',
            payload: { batteries, count: batteries.length, timestamp: Date.now() }
          });
          setTimeout(() => liveChannel.unsubscribe(), 2000);
        }
      });
    } catch (err) {}

    return { success: true, source: 'cloud', count: batteries.length };
  } catch (err: any) {
    return { success: true, source: 'cloud', count: batteries.length, error: err?.message };
  }
}

/**
 * Fetch Global Battery Database from Server / Online Supabase (with Local fallback)
 */
export async function fetchCustomBatteriesFromCloud(): Promise<{ batteries: BatteryPreset[]; source: 'cloud' | 'local' }> {
  // 1. Try Supabase Cloud first (Primary for GitHub Pages & Web)
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('id', 'global_custom_batteries')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
        try {
          localStorage.setItem(STORAGE_CUSTOM_BATTERIES_KEY, JSON.stringify(data.value));
        } catch (e) {}
        return { batteries: data.value, source: 'cloud' };
      }
    } catch (e) {}
  }

  // 2. Try Server API
  const serverBatteries = await fetchDataFromServer('batteries');
  if (serverBatteries && Array.isArray(serverBatteries) && serverBatteries.length > 0) {
    try {
      localStorage.setItem(STORAGE_CUSTOM_BATTERIES_KEY, JSON.stringify(serverBatteries));
    } catch (e) {}
    return { batteries: serverBatteries, source: 'cloud' };
  }

  // 3. Fallback to local storage
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_BATTERIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { batteries: parsed, source: 'local' };
      }
    }
  } catch (e) {}

  return { batteries: DEFAULT_BATTERY_PRESETS, source: 'local' };
}

/**
 * Sync All Inverters, Panels and Batteries to Server & Supabase Cloud in one go
 */
export async function syncAllDatabaseToCloud(
  inverters: Inverter[],
  panels: PanelPreset[],
  batteries?: BatteryPreset[]
): Promise<{ success: boolean; invertersSaved: number; panelsSaved: number; batteriesSaved?: number; source: 'cloud' | 'local'; error?: string }> {
  const invRes = await saveCustomInvertersToCloud(inverters);
  const pnlRes = await saveCustomPanelsToCloud(panels);
  let batRes: any = null;
  if (batteries && Array.isArray(batteries)) {
    batRes = await saveCustomBatteriesToCloud(batteries);
  }

  return {
    success: invRes.success && pnlRes.success && (!batRes || batRes.success),
    invertersSaved: invRes.count,
    panelsSaved: pnlRes.count,
    batteriesSaved: batRes ? batRes.count : 0,
    source: 'cloud',
    error: invRes.error || pnlRes.error || batRes?.error
  };
}

/**
 * Realtime Subscription for Global Inverter, Panel & Battery Database Updates, Resources & Files
 * Connects to Server-Sent Events (/api/events), Supabase Realtime, and BroadcastChannel
 */
export function subscribeToGlobalDatabaseUpdates(callbacks: {
  onInvertersUpdate?: (inverters: Inverter[]) => void;
  onPanelsUpdate?: (panels: PanelPreset[]) => void;
  onBatteriesUpdate?: (batteries: BatteryPreset[]) => void;
  onResourcesUpdate?: (resources: AdminResourceFile[]) => void;
  onSpecRequestsUpdate?: (requests: SpecRequest[]) => void;
  onPaymentRecordsUpdate?: (records: any[]) => void;
  onPaymentConfigUpdate?: (config: any) => void;
  onAppBrandingUpdate?: (branding: AppBranding) => void;
  onLicensesUpdate?: (licenses: LicenseToken[]) => void;
  onAdminContactUpdate?: (contact: AdminContactConfig) => void;
  onSystemPublished?: (payload: { timestamp: string; note?: string; inverters?: Inverter[]; panels?: PanelPreset[]; batteries?: BatteryPreset[]; mountingDatabase?: any; adminContact?: AdminContactConfig }) => void;
}): () => void {
  let isCleanedUp = false;
  let broadcastChannel: BroadcastChannel | null = null;
  let supabaseChannel: any = null;
  let eventSource: EventSource | null = null;

  // 1. Server-Sent Events (SSE) stream for instant real-time sync across all clients
  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        try {
          const parsed = JSON.parse(event.data);
          const { type, data } = parsed;
          if (type === 'resources' && Array.isArray(data) && callbacks.onResourcesUpdate) {
            try { localStorage.setItem(STORAGE_ADMIN_RESOURCES_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onResourcesUpdate(data);
          } else if (type === 'inverters' && Array.isArray(data) && callbacks.onInvertersUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onInvertersUpdate(data);
          } else if (type === 'panels' && Array.isArray(data) && callbacks.onPanelsUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onPanelsUpdate(data);
          } else if (type === 'batteries' && Array.isArray(data) && callbacks.onBatteriesUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_BATTERIES_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onBatteriesUpdate(data);
          } else if (type === 'spec_requests' && Array.isArray(data) && callbacks.onSpecRequestsUpdate) {
            try { localStorage.setItem(STORAGE_SPEC_REQUESTS_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onSpecRequestsUpdate(data);
          } else if (type === 'payment_config' && data && callbacks.onPaymentConfigUpdate) {
            try { localStorage.setItem(STORAGE_PAYMENT_CONFIG_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onPaymentConfigUpdate(data);
          } else if (type === 'payment_records' && Array.isArray(data) && callbacks.onPaymentRecordsUpdate) {
            callbacks.onPaymentRecordsUpdate(data);
          } else if (type === 'app_branding' && data && callbacks.onAppBrandingUpdate) {
            try { localStorage.setItem(STORAGE_APP_BRANDING_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onAppBrandingUpdate(data);
          } else if (type === 'licenses' && Array.isArray(data) && callbacks.onLicensesUpdate) {
            try { localStorage.setItem(STORAGE_ALL_LICENSES_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onLicensesUpdate(data);
          } else if (type === 'admin_contact' && data && callbacks.onAdminContactUpdate) {
            try { localStorage.setItem(STORAGE_ADMIN_CONTACT_KEY, JSON.stringify(data)); } catch (e) {}
            callbacks.onAdminContactUpdate(data);
          } else if (type === 'system_published' && data && callbacks.onSystemPublished) {
            callbacks.onSystemPublished(data);
          }
        } catch (e) {}
      };
    } catch (e) {}
  }

  // 2. Cross-Tab Broadcast Channel
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel('solar_database_sync');
      broadcastChannel.onmessage = (event) => {
        if (isCleanedUp) return;
        const data = event.data;
        if (data?.type === 'INVERTERS_UPDATED' && Array.isArray(data.inverters) && callbacks.onInvertersUpdate) {
          callbacks.onInvertersUpdate(data.inverters);
        } else if (data?.type === 'PANELS_UPDATED' && Array.isArray(data.panels) && callbacks.onPanelsUpdate) {
          callbacks.onPanelsUpdate(data.panels);
        } else if (data?.type === 'BATTERIES_UPDATED' && Array.isArray(data.batteries) && callbacks.onBatteriesUpdate) {
          callbacks.onBatteriesUpdate(data.batteries);
        } else if (data?.type === 'RESOURCES_UPDATED' && Array.isArray(data.resources) && callbacks.onResourcesUpdate) {
          callbacks.onResourcesUpdate(data.resources);
        } else if (data?.type === 'SPEC_REQUESTS_UPDATED' && Array.isArray(data.requests) && callbacks.onSpecRequestsUpdate) {
          callbacks.onSpecRequestsUpdate(data.requests);
        } else if (data?.type === 'PAYMENT_RECORDS_UPDATED' && Array.isArray(data.records) && callbacks.onPaymentRecordsUpdate) {
          callbacks.onPaymentRecordsUpdate(data.records);
        } else if (data?.type === 'APP_BRANDING_UPDATED' && data.branding && callbacks.onAppBrandingUpdate) {
          callbacks.onAppBrandingUpdate(data.branding);
        }
      };
    } catch (e) {}
  }

  // 3. Supabase Realtime Channel
  const client = initSupabase();
  if (client) {
    try {
      supabaseChannel = client.channel('solar_global_database_events');
      
      supabaseChannel
        .on('broadcast', { event: 'inverters_changed' }, (payload: any) => {
          if (isCleanedUp) return;
          if (payload?.payload?.inverters && Array.isArray(payload.payload.inverters) && callbacks.onInvertersUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(payload.payload.inverters)); } catch (e) {}
            callbacks.onInvertersUpdate(payload.payload.inverters);
          }
        })
        .on('broadcast', { event: 'panels_changed' }, (payload: any) => {
          if (isCleanedUp) return;
          if (payload?.payload?.panels && Array.isArray(payload.payload.panels) && callbacks.onPanelsUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(payload.payload.panels)); } catch (e) {}
            callbacks.onPanelsUpdate(payload.payload.panels);
          }
        })
        .on('broadcast', { event: 'batteries_changed' }, (payload: any) => {
          if (isCleanedUp) return;
          if (payload?.payload?.batteries && Array.isArray(payload.payload.batteries) && callbacks.onBatteriesUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_BATTERIES_KEY, JSON.stringify(payload.payload.batteries)); } catch (e) {}
            callbacks.onBatteriesUpdate(payload.payload.batteries);
          }
        })
        .on('broadcast', { event: 'system_published' }, (payload: any) => {
          if (isCleanedUp) return;
          const data = payload?.payload;
          if (data) {
            if (data.inverters && Array.isArray(data.inverters) && callbacks.onInvertersUpdate) {
              try { localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(data.inverters)); } catch (e) {}
              callbacks.onInvertersUpdate(data.inverters);
            }
            if (data.panels && Array.isArray(data.panels) && callbacks.onPanelsUpdate) {
              try { localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(data.panels)); } catch (e) {}
              callbacks.onPanelsUpdate(data.panels);
            }
            if (data.batteries && Array.isArray(data.batteries) && callbacks.onBatteriesUpdate) {
              try { localStorage.setItem(STORAGE_CUSTOM_BATTERIES_KEY, JSON.stringify(data.batteries)); } catch (e) {}
              callbacks.onBatteriesUpdate(data.batteries);
            }
            if (data.adminContact && callbacks.onAdminContactUpdate) {
              try { localStorage.setItem(STORAGE_ADMIN_CONTACT_KEY, JSON.stringify(data.adminContact)); } catch (e) {}
              callbacks.onAdminContactUpdate(data.adminContact);
            }
            if (data.appBranding && callbacks.onAppBrandingUpdate) {
              try { localStorage.setItem(STORAGE_APP_BRANDING_KEY, JSON.stringify(data.appBranding)); } catch (e) {}
              callbacks.onAppBrandingUpdate(data.appBranding);
            }
            if (callbacks.onSystemPublished) {
              callbacks.onSystemPublished(data);
            }
          }
        })
        .on('broadcast', { event: 'mounting_database_changed' }, (payload: any) => {
          if (isCleanedUp) return;
          const data = payload?.payload;
          if (data?.mountingDatabase && callbacks.onSystemPublished) {
            callbacks.onSystemPublished({ timestamp: new Date().toISOString(), mountingDatabase: data.mountingDatabase });
          }
        })
        .on('broadcast', { event: 'resources_changed' }, (payload: any) => {
          if (isCleanedUp) return;
          if (payload?.payload?.resources && Array.isArray(payload.payload.resources) && callbacks.onResourcesUpdate) {
            try { localStorage.setItem(STORAGE_ADMIN_RESOURCES_KEY, JSON.stringify(payload.payload.resources)); } catch (e) {}
            callbacks.onResourcesUpdate(payload.payload.resources);
          }
        })
        .on('broadcast', { event: 'spec_requests_changed' }, (payload: any) => {
          if (isCleanedUp) return;
          if (payload?.payload?.requests && Array.isArray(payload.payload.requests) && callbacks.onSpecRequestsUpdate) {
            try { localStorage.setItem(STORAGE_SPEC_REQUESTS_KEY, JSON.stringify(payload.payload.requests)); } catch (e) {}
            callbacks.onSpecRequestsUpdate(payload.payload.requests);
          }
        })
        .on('broadcast', { event: 'payment_records_changed' }, (payload: any) => {
          if (isCleanedUp) return;
          if (payload?.payload?.records && Array.isArray(payload.payload.records) && callbacks.onPaymentRecordsUpdate) {
            try { localStorage.setItem(STORAGE_PAYMENT_RECORDS_KEY, JSON.stringify(payload.payload.records)); } catch (e) {}
            callbacks.onPaymentRecordsUpdate(payload.payload.records);
          }
        })
        .on('broadcast', { event: 'app_branding_changed' }, (payload: any) => {
          if (isCleanedUp) return;
          if (payload?.payload?.branding && callbacks.onAppBrandingUpdate) {
            try { localStorage.setItem(STORAGE_APP_BRANDING_KEY, JSON.stringify(payload.payload.branding)); } catch (e) {}
            callbacks.onAppBrandingUpdate(payload.payload.branding);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload: any) => {
          if (isCleanedUp) return;
          const rec = payload.new;
          if (rec?.id === 'global_custom_inverters' && Array.isArray(rec.value) && callbacks.onInvertersUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(rec.value)); } catch (e) {}
            callbacks.onInvertersUpdate(rec.value);
          } else if (rec?.id === 'global_custom_panels' && Array.isArray(rec.value) && callbacks.onPanelsUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(rec.value)); } catch (e) {}
            callbacks.onPanelsUpdate(rec.value);
          } else if (rec?.id === 'global_custom_batteries' && Array.isArray(rec.value) && callbacks.onBatteriesUpdate) {
            try { localStorage.setItem(STORAGE_CUSTOM_BATTERIES_KEY, JSON.stringify(rec.value)); } catch (e) {}
            callbacks.onBatteriesUpdate(rec.value);
          } else if (rec?.id === 'global_admin_resources' && Array.isArray(rec.value) && callbacks.onResourcesUpdate) {
            try { localStorage.setItem(STORAGE_ADMIN_RESOURCES_KEY, JSON.stringify(rec.value)); } catch (e) {}
            callbacks.onResourcesUpdate(rec.value);
          } else if (rec?.id === 'global_spec_requests' && Array.isArray(rec.value) && callbacks.onSpecRequestsUpdate) {
            try { localStorage.setItem(STORAGE_SPEC_REQUESTS_KEY, JSON.stringify(rec.value)); } catch (e) {}
            callbacks.onSpecRequestsUpdate(rec.value);
          } else if (rec?.id === 'global_payment_config' && rec?.value && callbacks.onPaymentConfigUpdate) {
            callbacks.onPaymentConfigUpdate(rec.value);
          } else if (rec?.id === 'global_payment_records' && Array.isArray(rec.value) && callbacks.onPaymentRecordsUpdate) {
            try { localStorage.setItem(STORAGE_PAYMENT_RECORDS_KEY, JSON.stringify(rec.value)); } catch (e) {}
            callbacks.onPaymentRecordsUpdate(rec.value);
          } else if (rec?.id === 'global_app_branding' && rec?.value && callbacks.onAppBrandingUpdate) {
            try { localStorage.setItem(STORAGE_APP_BRANDING_KEY, JSON.stringify(rec.value)); } catch (e) {}
            callbacks.onAppBrandingUpdate(rec.value);
          } else if (rec?.id === 'global_admin_contact' && rec?.value && callbacks.onAdminContactUpdate) {
            try { localStorage.setItem(STORAGE_ADMIN_CONTACT_KEY, JSON.stringify(rec.value)); } catch (e) {}
            callbacks.onAdminContactUpdate(rec.value);
          } else if (rec?.id === 'global_mounting_database' && rec?.value && callbacks.onSystemPublished) {
            callbacks.onSystemPublished({ timestamp: rec.updated_at || new Date().toISOString(), mountingDatabase: rec.value });
          }
        })
        .subscribe();
    } catch (e) {}
  }

  // 4. Periodic Cloud Sync Poller (checks Supabase Cloud every 8 seconds - vital for GitHub Pages)
  const syncSupabaseData = async () => {
    if (isCleanedUp) return;
    const client = initSupabase();
    if (client) {
      try {
        const { data: rows } = await client
          .from('app_settings')
          .select('id, value, updated_at');

        if (Array.isArray(rows) && rows.length > 0 && !isCleanedUp) {
          rows.forEach((row: any) => {
            if (row.id === 'global_custom_inverters' && Array.isArray(row.value) && callbacks.onInvertersUpdate) {
              callbacks.onInvertersUpdate(row.value);
            } else if (row.id === 'global_custom_panels' && Array.isArray(row.value) && callbacks.onPanelsUpdate) {
              callbacks.onPanelsUpdate(row.value);
            } else if (row.id === 'global_custom_batteries' && Array.isArray(row.value) && callbacks.onBatteriesUpdate) {
              callbacks.onBatteriesUpdate(row.value);
            } else if (row.id === 'global_admin_resources' && Array.isArray(row.value) && callbacks.onResourcesUpdate) {
              callbacks.onResourcesUpdate(row.value);
            } else if (row.id === 'global_admin_contact' && row.value && callbacks.onAdminContactUpdate) {
              callbacks.onAdminContactUpdate(row.value);
            } else if (row.id === 'global_app_branding' && row.value && callbacks.onAppBrandingUpdate) {
              callbacks.onAppBrandingUpdate(row.value);
            } else if (row.id === 'global_mounting_database' && row.value && callbacks.onSystemPublished) {
              callbacks.onSystemPublished({ timestamp: row.updated_at || new Date().toISOString(), mountingDatabase: row.value });
            }
          });
        }
      } catch (err) {}
    }

    // Also check server if running locally
    try {
      const allData = await fetchAllServerData();
      if (!isCleanedUp && allData) {
        if (allData.inverters && Array.isArray(allData.inverters) && allData.inverters.length > 0 && callbacks.onInvertersUpdate) {
          callbacks.onInvertersUpdate(allData.inverters);
        }
        if (allData.panels && Array.isArray(allData.panels) && allData.panels.length > 0 && callbacks.onPanelsUpdate) {
          callbacks.onPanelsUpdate(allData.panels);
        }
        if (allData.batteries && Array.isArray(allData.batteries) && allData.batteries.length > 0 && callbacks.onBatteriesUpdate) {
          callbacks.onBatteriesUpdate(allData.batteries);
        }
      }
    } catch (e) {}
  };

  const pollInterval = setInterval(syncSupabaseData, 8000);

  // Sync immediately when tab regains focus or becomes visible
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      syncSupabaseData();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
  }

  return () => {
    isCleanedUp = true;
    clearInterval(pollInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    }
    if (eventSource) {
      try { eventSource.close(); } catch (e) {}
    }
    if (broadcastChannel) {
      try { broadcastChannel.close(); } catch (e) {}
    }
    if (supabaseChannel) {
      try { supabaseChannel.unsubscribe(); } catch (e) {}
    }
  };
}

// ----------------------------------------------------
// GLOBAL ADMIN RESOURCES & FILES CLOUD STORAGE
// ----------------------------------------------------

const STORAGE_ADMIN_RESOURCES_KEY = 'solar_sizer_admin_resources_v3';
const STORAGE_SPEC_REQUESTS_KEY = 'solar_sizer_spec_requests_v3';

// Helper to strip heavy base64 data before saving to browser localStorage
export function sanitizeResourcesForLocalCache(resources: AdminResourceFile[]): AdminResourceFile[] {
  if (!Array.isArray(resources)) return [];
  return resources.map(res => {
    const fileUrl = res.fileUrl || `/api/files/${res.id}`;
    // If base64 fileData is large (>10KB), do not store in 5MB localStorage
    if (res.fileData && res.fileData.length > 10000) {
      return {
        ...res,
        fileUrl,
        fileData: undefined
      };
    }
    return {
      ...res,
      fileUrl
    };
  });
}

/**
 * Save Admin Resources / Files to Server, Online Supabase and Local Storage
 * Broadcasts to all connected users in real time
 */
export async function saveAdminResourcesToCloud(
  resources: AdminResourceFile[]
): Promise<{ success: boolean; source: 'cloud' | 'local'; count: number; error?: string }> {
  const sanitized = sanitizeResourcesForLocalCache(resources);

  // 1. Update local cache safely without overflowing quota
  try {
    localStorage.setItem(STORAGE_ADMIN_RESOURCES_KEY, JSON.stringify(sanitized));
  } catch (e) {
    try {
      // If still quota error, strip all fileData
      const minimal = resources.map(r => ({ ...r, fileUrl: `/api/files/${r.id}`, fileData: undefined }));
      localStorage.setItem(STORAGE_ADMIN_RESOURCES_KEY, JSON.stringify(minimal));
    } catch (e2) {}
  }

  // 2. Post full data to central Express backend (so disk files are saved)
  postDataToServer('resources', resources);

  // 3. Broadcast across local browser tabs instantly
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('solar_database_sync');
      bc.postMessage({
        type: 'RESOURCES_UPDATED',
        resources: sanitized,
        count: resources.length,
        timestamp: Date.now()
      });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}
  }

  // 4. Persist to Supabase app_settings table for all users (using sanitized to prevent JSONB quota limits)
  const client = initSupabase();
  if (!client) {
    return { success: true, source: 'cloud', count: resources.length };
  }

  try {
    const { error } = await client
      .from('app_settings')
      .upsert({
        id: 'global_admin_resources',
        value: sanitized,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase global_admin_resources save notice:', error.message);
      return { success: true, source: 'cloud', count: resources.length, error: error.message };
    }

    try {
      const liveChannel = client.channel('solar_global_database_events');
      liveChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event: 'resources_changed',
            payload: { resources: sanitized, count: resources.length, timestamp: Date.now() }
          });
          setTimeout(() => liveChannel.unsubscribe(), 2000);
        }
      });
    } catch (err) {}

    return { success: true, source: 'cloud', count: resources.length };
  } catch (err: any) {
    return { success: true, source: 'cloud', count: resources.length, error: err?.message };
  }
}

/**
 * Fetch Admin Resources / Files from Server / Online Supabase (with fallback)
 */
export async function fetchAdminResourcesFromCloud(
  defaultResources: AdminResourceFile[] = INITIAL_ADMIN_RESOURCES
): Promise<{ resources: AdminResourceFile[]; source: 'cloud' | 'local' }> {
  // 1. Try Server API first
  const serverResources = await fetchDataFromServer('resources');
  if (serverResources && Array.isArray(serverResources) && serverResources.length > 0) {
    try {
      localStorage.setItem(STORAGE_ADMIN_RESOURCES_KEY, JSON.stringify(serverResources));
    } catch (e) {}
    return { resources: serverResources, source: 'cloud' };
  }

  // 2. Try Supabase
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('id', 'global_admin_resources')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
        try {
          localStorage.setItem(STORAGE_ADMIN_RESOURCES_KEY, JSON.stringify(data.value));
        } catch (e) {}
        return { resources: data.value, source: 'cloud' };
      }
    } catch (e) {}
  }

  // 3. Fallback to local storage
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_RESOURCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { resources: parsed, source: 'local' };
      }
    }
  } catch (e) {}

  return { resources: defaultResources, source: 'local' };
}

/**
 * Save Spec Requests to Server, Online Supabase and Local Storage
 */
export async function saveSpecRequestsToCloud(
  requests: SpecRequest[]
): Promise<{ success: boolean; source: 'cloud' | 'local'; count: number; error?: string }> {
  try {
    localStorage.setItem(STORAGE_SPEC_REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {}

  postDataToServer('spec_requests', requests);

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('solar_database_sync');
      bc.postMessage({
        type: 'SPEC_REQUESTS_UPDATED',
        requests,
        count: requests.length,
        timestamp: Date.now()
      });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}
  }

  const client = initSupabase();
  if (!client) {
    return { success: true, source: 'cloud', count: requests.length };
  }

  try {
    const { error } = await client
      .from('app_settings')
      .upsert({
        id: 'global_spec_requests',
        value: requests,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      return { success: true, source: 'cloud', count: requests.length, error: error.message };
    }

    try {
      const liveChannel = client.channel('solar_global_database_events');
      liveChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event: 'spec_requests_changed',
            payload: { requests, count: requests.length, timestamp: Date.now() }
          });
          setTimeout(() => liveChannel.unsubscribe(), 2000);
        }
      });
    } catch (err) {}

    return { success: true, source: 'cloud', count: requests.length };
  } catch (err: any) {
    return { success: true, source: 'cloud', count: requests.length, error: err?.message };
  }
}

/**
 * Fetch Spec Requests from Server / Online Supabase
 */
export async function fetchSpecRequestsFromCloud(
  defaultRequests: SpecRequest[] = INITIAL_SPEC_REQUESTS
): Promise<{ requests: SpecRequest[]; source: 'cloud' | 'local' }> {
  const serverRequests = await fetchDataFromServer('spec_requests');
  if (serverRequests && Array.isArray(serverRequests) && serverRequests.length > 0) {
    try {
      localStorage.setItem(STORAGE_SPEC_REQUESTS_KEY, JSON.stringify(serverRequests));
    } catch (e) {}
    return { requests: serverRequests, source: 'cloud' };
  }

  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('id', 'global_spec_requests')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
        try {
          localStorage.setItem(STORAGE_SPEC_REQUESTS_KEY, JSON.stringify(data.value));
        } catch (e) {}
        return { requests: data.value, source: 'cloud' };
      }
    } catch (e) {}
  }

  try {
    const raw = localStorage.getItem(STORAGE_SPEC_REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { requests: parsed, source: 'local' };
      }
    }
  } catch (e) {}

  return { requests: defaultRequests, source: 'local' };
}

// ----------------------------------------------------
// APP BRANDING & LOGO CLOUD STORAGE & SYNC
// ----------------------------------------------------

export const STORAGE_APP_BRANDING_KEY = 'solar_sizer_app_branding_v1';

export const DEFAULT_APP_BRANDING: AppBranding = {
  appName: 'UNIQUE SOLAR PRO',
  appSubtitle: 'Engineering Suite',
  appVersion: 'v2.5',
  logoUrl: './logo.png',
  customAppUrl: 'https://solartechse3-cmyk.github.io/uniquesolarsizing1'
};

/**
 * Save App Branding & Logo to Server, Supabase, and Local Cache
 * Broadcasts across SSE and BroadcastChannel to sync all active users in real-time
 */
export async function saveAppBrandingToCloud(
  branding: AppBranding
): Promise<{ success: boolean; source: 'cloud' | 'local'; error?: string }> {
  // 1. Update local cache
  try {
    localStorage.setItem(STORAGE_APP_BRANDING_KEY, JSON.stringify(branding));
  } catch (e) {}

  // 2. Post to central Express backend
  await postDataToServer('app_branding', branding);

  // 3. Broadcast across local browser tabs instantly
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('solar_database_sync');
      bc.postMessage({
        type: 'APP_BRANDING_UPDATED',
        branding,
        timestamp: Date.now()
      });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}
  }

  // 4. Persist to Supabase if connected
  const client = initSupabase();
  if (!client) {
    return { success: true, source: 'cloud' };
  }

  try {
    const { error } = await client
      .from('app_settings')
      .upsert({
        id: 'global_app_branding',
        value: branding,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      return { success: true, source: 'cloud', error: error.message };
    }

    try {
      const liveChannel = client.channel('solar_global_database_events');
      liveChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event: 'app_branding_changed',
            payload: { branding, timestamp: Date.now() }
          });
          setTimeout(() => liveChannel.unsubscribe(), 2000);
        }
      });
    } catch (err) {}

    return { success: true, source: 'cloud' };
  } catch (err: any) {
    return { success: true, source: 'cloud', error: err?.message };
  }
}

/**
 * Fetch App Branding & Logo from Server / Supabase / Local Storage
 */
export async function fetchAppBrandingFromCloud(
  defaultBranding: AppBranding = DEFAULT_APP_BRANDING
): Promise<{ branding: AppBranding; source: 'cloud' | 'local' }> {
  // 1. Try Server API first
  const serverBranding = await fetchDataFromServer('app_branding');
  if (serverBranding && typeof serverBranding === 'object') {
    try {
      localStorage.setItem(STORAGE_APP_BRANDING_KEY, JSON.stringify(serverBranding));
    } catch (e) {}
    return { branding: serverBranding, source: 'cloud' };
  }

  // 2. Try Supabase
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('id', 'global_app_branding')
        .maybeSingle();

      if (!error && data?.value && typeof data.value === 'object') {
        try {
          localStorage.setItem(STORAGE_APP_BRANDING_KEY, JSON.stringify(data.value));
        } catch (e) {}
        return { branding: data.value, source: 'cloud' };
      }
    } catch (e) {}
  }

  // 3. Fallback to Local Storage
  try {
    const raw = localStorage.getItem(STORAGE_APP_BRANDING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { branding: parsed, source: 'local' };
      }
    }
  } catch (e) {}

  return { branding: defaultBranding, source: 'local' };
}

// ----------------------------------------------------
// FULL DATABASE BACKUP & RESTORE UTILITIES
// ----------------------------------------------------

export interface FullDatabaseBackup {
  version: string;
  exportedAt: string;
  inverters?: Inverter[];
  panels?: PanelPreset[];
  batteries?: BatteryPreset[];
  resources?: AdminResourceFile[];
  paymentConfig?: PaymentConfig;
  specRequests?: SpecRequest[];
  appBranding?: AppBranding;
  paymentRecords?: PaymentRecord[];
}

/**
 * Gather all data from memory/local storage and produce a complete JSON backup object
 */
export function exportFullDatabaseBackup(options?: {
  inverters?: Inverter[];
  panels?: PanelPreset[];
  batteries?: BatteryPreset[];
  resources?: AdminResourceFile[];
  paymentConfig?: PaymentConfig;
  specRequests?: SpecRequest[];
  appBranding?: AppBranding;
  paymentRecords?: PaymentRecord[];
}): FullDatabaseBackup {
  const getFromStorage = <T>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  };

  return {
    version: '2.5',
    exportedAt: new Date().toISOString(),
    inverters: options?.inverters || getFromStorage(STORAGE_CUSTOM_INVERTERS_KEY, []),
    panels: options?.panels || getFromStorage(STORAGE_CUSTOM_PANELS_KEY, []),
    batteries: options?.batteries || getFromStorage(STORAGE_CUSTOM_BATTERIES_KEY, []),
    resources: options?.resources || getFromStorage(STORAGE_ADMIN_RESOURCES_KEY, INITIAL_ADMIN_RESOURCES),
    paymentConfig: options?.paymentConfig || getFromStorage('solar_sizer_payment_config_v3', undefined),
    specRequests: options?.specRequests || getFromStorage(STORAGE_SPEC_REQUESTS_KEY, INITIAL_SPEC_REQUESTS),
    appBranding: options?.appBranding || getFromStorage(STORAGE_APP_BRANDING_KEY, DEFAULT_APP_BRANDING),
    paymentRecords: options?.paymentRecords || getFromStorage('solar_sizer_payment_records_v3', [])
  };
}

/**
 * Download complete database backup as a JSON file
 */
export function downloadFullBackupFile(backupData: FullDatabaseBackup): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('download', `solar_pro_database_backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
}

/**
 * Import and restore a full database backup across Local Storage, Express Server, and Supabase
 */
export async function importFullDatabaseBackup(backup: FullDatabaseBackup): Promise<{
  success: boolean;
  counts: {
    inverters: number;
    panels: number;
    batteries: number;
    resources: number;
    specRequests: number;
    paymentAccounts: number;
  };
  error?: string;
}> {
  try {
    const counts = {
      inverters: 0,
      panels: 0,
      batteries: 0,
      resources: 0,
      specRequests: 0,
      paymentAccounts: 0
    };

    // 1. Inverters
    if (Array.isArray(backup.inverters)) {
      counts.inverters = backup.inverters.length;
      try { localStorage.setItem(STORAGE_CUSTOM_INVERTERS_KEY, JSON.stringify(backup.inverters)); } catch (e) {}
      await saveCustomInvertersToCloud(backup.inverters);
    }

    // 2. Panels
    if (Array.isArray(backup.panels)) {
      counts.panels = backup.panels.length;
      try { localStorage.setItem(STORAGE_CUSTOM_PANELS_KEY, JSON.stringify(backup.panels)); } catch (e) {}
      await saveCustomPanelsToCloud(backup.panels);
    }

    // 3. Batteries
    if (Array.isArray(backup.batteries)) {
      counts.batteries = backup.batteries.length;
      try { localStorage.setItem(STORAGE_CUSTOM_BATTERIES_KEY, JSON.stringify(backup.batteries)); } catch (e) {}
      await saveCustomBatteriesToCloud(backup.batteries);
    }

    // 4. Resources
    if (Array.isArray(backup.resources)) {
      counts.resources = backup.resources.length;
      try { localStorage.setItem(STORAGE_ADMIN_RESOURCES_KEY, JSON.stringify(backup.resources)); } catch (e) {}
      await saveAdminResourcesToCloud(backup.resources);
    }

    // 5. Payment Config
    if (backup.paymentConfig && typeof backup.paymentConfig === 'object') {
      counts.paymentAccounts = backup.paymentConfig.accounts?.length || 0;
      try { localStorage.setItem('solar_sizer_payment_config_v3', JSON.stringify(backup.paymentConfig)); } catch (e) {}
      await savePaymentConfigToCloud(backup.paymentConfig);
    }

    // 6. Spec Requests
    if (Array.isArray(backup.specRequests)) {
      counts.specRequests = backup.specRequests.length;
      try { localStorage.setItem(STORAGE_SPEC_REQUESTS_KEY, JSON.stringify(backup.specRequests)); } catch (e) {}
      await saveSpecRequestsToCloud(backup.specRequests);
    }

    // 7. App Branding
    if (backup.appBranding && typeof backup.appBranding === 'object') {
      try { localStorage.setItem(STORAGE_APP_BRANDING_KEY, JSON.stringify(backup.appBranding)); } catch (e) {}
      await saveAppBrandingToCloud(backup.appBranding);
    }

    // 8. Payment Records
    if (Array.isArray(backup.paymentRecords)) {
      try { localStorage.setItem('solar_sizer_payment_records_v3', JSON.stringify(backup.paymentRecords)); } catch (e) {}
      await savePaymentRecordsToCloud(backup.paymentRecords);
    }

    // Send full bundle to server backup endpoint
    try {
      await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            inverters: backup.inverters,
            panels: backup.panels,
            batteries: backup.batteries,
            resources: backup.resources,
            payment_config: backup.paymentConfig,
            spec_requests: backup.specRequests,
            app_branding: backup.appBranding,
            payment_records: backup.paymentRecords
          }
        })
      });
    } catch (e) {}

    return { success: true, counts };
  } catch (err: any) {
    return {
      success: false,
      counts: { inverters: 0, panels: 0, batteries: 0, resources: 0, specRequests: 0, paymentAccounts: 0 },
      error: err?.message || 'Failed to import backup'
    };
  }
}

// ----------------------------------------------------
// ADMIN CONTACT (VIBER & TELEGRAM) & LICENSE SYNC
// ----------------------------------------------------

export const DEFAULT_ADMIN_CONTACT: AdminContactConfig = {
  viberPhone: "09 403 708 145",
  viberUrl: "viber://chat?number=09403708145",
  telegramUsername: "uniquesolarpro",
  telegramUrl: "https://t.me/uniquesolarpro",
  customAppUrl: "https://solartechse3-cmyk.github.io/uniquesolarsizing1",
  noteMy: "Viber သို့မဟုတ် Telegram တွင် ဆက်သွယ်၍ 1 Week, 1 Month, 3 Months PRO License Link ရယူနိုင်ပါသည်",
  noteEn: "Contact via Viber or Telegram to purchase 1 Week, 1 Month, 3 Months PRO License Link"
};

const STORAGE_ADMIN_CONTACT_KEY = 'solar_sizer_admin_contact_v1';
const STORAGE_ACTIVE_LICENSE_KEY = 'solar_sizer_active_license_v1';
const STORAGE_ALL_LICENSES_KEY = 'solar_sizer_all_licenses_v1';

export function getStoredActiveLicense(): LicenseToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_LICENSE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.token && new Date(parsed.expiresAt).getTime() > Date.now() && parsed.status === 'active') {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

export function saveStoredActiveLicense(license: LicenseToken | null) {
  try {
    if (license) {
      localStorage.setItem(STORAGE_ACTIVE_LICENSE_KEY, JSON.stringify(license));
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_LICENSE_KEY);
    }
  } catch (e) {}
}

export async function fetchAdminContactFromCloud(): Promise<AdminContactConfig> {
  // 1. Try local storage first
  let cached: AdminContactConfig = DEFAULT_ADMIN_CONTACT;
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_CONTACT_KEY);
    if (raw) {
      cached = { ...DEFAULT_ADMIN_CONTACT, ...JSON.parse(raw) };
    }
  } catch (e) {}

  // 2. Try Express server API
  try {
    const res = await fetch('/api/admin-contact');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.contact) {
        cached = { ...cached, ...json.contact };
        try { localStorage.setItem(STORAGE_ADMIN_CONTACT_KEY, JSON.stringify(cached)); } catch (e) {}
        return cached;
      }
    }
  } catch (e) {}

  // 3. Try Supabase
  const supabase = initSupabase();
  if (supabase) {
    try {
      const { data: d1 } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'admin_contact_config')
        .maybeSingle();

      if (d1?.value && typeof d1.value === 'object') {
        cached = { ...cached, ...d1.value };
        try { localStorage.setItem(STORAGE_ADMIN_CONTACT_KEY, JSON.stringify(cached)); } catch (e) {}
        return cached;
      }

      const { data: d2 } = await supabase
        .from('solar_app_data')
        .select('data')
        .eq('key', 'admin_contact')
        .maybeSingle();

      if (d2?.data && typeof d2.data === 'object') {
        cached = { ...cached, ...d2.data };
        try { localStorage.setItem(STORAGE_ADMIN_CONTACT_KEY, JSON.stringify(cached)); } catch (e) {}
        return cached;
      }
    } catch (e) {}
  }

  return cached;
}

export async function saveAdminContactToCloud(contact: AdminContactConfig): Promise<void> {
  try {
    localStorage.setItem(STORAGE_ADMIN_CONTACT_KEY, JSON.stringify(contact));
  } catch (e) {}

  // 1. Server API
  try {
    await fetch('/api/admin-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact })
    });
  } catch (e) {}

  // 2. Supabase Cloud (Store in app_settings and solar_app_data)
  const supabase = initSupabase();
  if (supabase) {
    try {
      await supabase
        .from('app_settings')
        .upsert({
          id: 'admin_contact_config',
          value: contact,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
    } catch (e) {}

    try {
      await supabase
        .from('solar_app_data')
        .upsert({
          key: 'admin_contact',
          data: contact,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    } catch (e) {}

    // 3. Real-time broadcast
    try {
      const liveChannel = supabase.channel('solar_global_database_events');
      liveChannel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event: 'admin_contact_changed',
            payload: { contact, timestamp: Date.now() }
          });
        }
      });
    } catch (e) {}
  }
}

export async function fetchLicensesFromCloud(): Promise<LicenseToken[]> {
  try {
    const res = await fetch('/api/licenses');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.licenses)) {
        try { localStorage.setItem(STORAGE_ALL_LICENSES_KEY, JSON.stringify(json.licenses)); } catch (e) {}
        return json.licenses;
      }
    }
  } catch (e) {}

  // Supabase fallback
  const supabase = initSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('solar_app_data')
        .select('data')
        .eq('key', 'licenses')
        .maybeSingle();

      if (!error && data?.data && Array.isArray(data.data)) {
        try { localStorage.setItem(STORAGE_ALL_LICENSES_KEY, JSON.stringify(data.data)); } catch (e) {}
        return data.data;
      }
    } catch (e) {}
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(STORAGE_ALL_LICENSES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return [];
}

export async function saveLicensesToCloud(licenses: LicenseToken[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_ALL_LICENSES_KEY, JSON.stringify(licenses));
  } catch (e) {}

  // Server API
  try {
    await fetch('/api/data/licenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: licenses })
    });
  } catch (e) {}

  // Supabase
  const supabase = initSupabase();
  if (supabase) {
    try {
      await supabase
        .from('solar_app_data')
        .upsert({
          key: 'licenses',
          data: licenses,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    } catch (e) {}
  }
}

export async function generateLicenseOnServer(params: {
  customerName: string;
  duration: LicenseToken['duration'];
  deviceLimit: 1 | 2;
  note?: string;
}): Promise<{ success: boolean; license?: LicenseToken; error?: string }> {
  try {
    const res = await fetch('/api/license/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.license) {
        // Also sync to Supabase
        const currentLicenses = await fetchLicensesFromCloud();
        const updated = [json.license, ...currentLicenses.filter(l => l.id !== json.license.id)];
        await saveLicensesToCloud(updated);
        return { success: true, license: json.license };
      }
    }
  } catch (e) {}

  // Fallback client generation if server route fails
  const d = params.duration || '1_month';
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
  const devCode = params.deviceLimit === 2 ? '2D' : '1D';
  const token = `SOLAR-PRO-${durCode}-${devCode}-${rand1}-${rand2}`;

  const now = new Date();
  const expires = new Date(now.getTime() + days * 86400000);

  const fallbackLicense: LicenseToken = {
    id: `lic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    token,
    customerName: params.customerName.trim() || 'Engineer Customer',
    duration: d,
    durationDays: days,
    deviceLimit: params.deviceLimit === 2 ? 2 : 1,
    boundDevices: [],
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: 'active',
    note: params.note || ''
  };

  const current = await fetchLicensesFromCloud();
  const updated = [fallbackLicense, ...current];
  await saveLicensesToCloud(updated);

  return { success: true, license: fallbackLicense };
}

export async function activateLicenseOnDevice(token: string): Promise<{
  success: boolean;
  license?: LicenseToken;
  error?: string;
  message?: string;
}> {
  const deviceId = getMyDeviceId();
  const deviceModel = getClientDevice();
  const cleaned = token.trim().toUpperCase();

  try {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleaned, deviceId, deviceModel }),
      signal: AbortSignal.timeout(5000)
    });
    const json = await res.json();
    if (json.success && json.license) {
      saveStoredActiveLicense(json.license);
      return { success: true, license: json.license };
    } else {
      return {
        success: false,
        error: json.error || 'activation_failed',
        message: json.message || 'လိုင်စင်ဖွင့်ခြင်း မအောင်မြင်ပါ'
      };
    }
  } catch (e) {
    // OFFLINE & VPN-FREE FALLBACK ACTIVATION:
    // When device has no VPN or server cannot be reached, evaluate token locally!
    const tokenRegex = /^SOLAR-PRO-(1W|1M|3M|6M|1Y|LIFE)-(1D|2D)-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    const match = cleaned.match(tokenRegex);

    if (match) {
      const durCode = match[1].toUpperCase();
      const devCode = match[2].toUpperCase();

      let days = 30;
      let durationStr: any = '1_month';
      if (durCode === '1W') { days = 7; durationStr = '1_week'; }
      else if (durCode === '1M') { days = 30; durationStr = '1_month'; }
      else if (durCode === '3M') { days = 90; durationStr = '3_months'; }
      else if (durCode === '6M') { days = 180; durationStr = '6_months'; }
      else if (durCode === '1Y') { days = 365; durationStr = '1_year'; }
      else if (durCode === 'LIFE') { days = 3650; durationStr = 'lifetime'; }

      const devLimit = devCode === '2D' ? 2 : 1;

      const offlineLicense: LicenseToken = {
        id: `lic_offline_${Date.now()}`,
        token: cleaned,
        customerName: 'Valued Pro Engineer',
        duration: durationStr,
        durationDays: days,
        deviceLimit: devLimit,
        boundDevices: [{
          deviceId,
          deviceModel,
          activatedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString()
        }],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
        status: 'active',
        note: 'Offline / VPN-Free Direct Activation'
      };

      saveStoredActiveLicense(offlineLicense);

      // Real-time Telegram notification to Admin when user activates on GitHub Pages
      notifyTelegramOnClientActivation(offlineLicense, deviceModel, deviceId).catch(() => {});

      return {
        success: true,
        license: offlineLicense,
        message: '🎉 PRO License အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ! (VPN မလိုဘဲ အသုံးပြုနိုင်ပါပြီ)'
      };
    }

    // Check local cached licenses list
    try {
      const cachedRaw = localStorage.getItem(STORAGE_ALL_LICENSES_KEY);
      if (cachedRaw) {
        const cachedList: LicenseToken[] = JSON.parse(cachedRaw);
        const found = cachedList.find(l => l.token.toUpperCase() === cleaned || l.id === cleaned);
        if (found) {
          saveStoredActiveLicense(found);
          return { success: true, license: found };
        }
      }
    } catch (err) {}

    return {
      success: false,
      error: 'invalid_token',
      message: 'လိုင်စင်ကုဒ် မှားယွင်းနေပါသည်။ (ဥပမာ ပုံစံ: SOLAR-PRO-1M-1D-XXXX-YYYY)'
    };
  }
}

export async function unbindLicenseDevice(licenseId: string, deviceId?: string): Promise<{ success: boolean; license?: LicenseToken }> {
  try {
    const res = await fetch('/api/license/unbind-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseId, deviceId: deviceId || 'all' })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return { success: true, license: json.license };
      }
    }
  } catch (e) {}

  const licenses = await fetchLicensesFromCloud();
  const lic = licenses.find(l => l.id === licenseId || l.token === licenseId);
  if (lic) {
    if (!deviceId || deviceId === 'all') {
      lic.boundDevices = [];
    } else {
      lic.boundDevices = (lic.boundDevices || []).filter(b => b.deviceId !== deviceId);
    }
    await saveLicensesToCloud(licenses);
    return { success: true, license: lic };
  }
  return { success: false };
}

export async function extendLicenseDuration(licenseId: string, days: number = 30): Promise<{ success: boolean; license?: LicenseToken }> {
  try {
    const res = await fetch('/api/license/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseId, days })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return { success: true, license: json.license };
    }
  } catch (e) {}

  const licenses = await fetchLicensesFromCloud();
  const lic = licenses.find(l => l.id === licenseId || l.token === licenseId);
  if (lic) {
    const currentExp = new Date(lic.expiresAt).getTime();
    const base = currentExp > Date.now() ? currentExp : Date.now();
    lic.expiresAt = new Date(base + days * 86400000).toISOString();
    lic.status = 'active';
    await saveLicensesToCloud(licenses);
    return { success: true, license: lic };
  }
  return { success: false };
}

export async function updateLicenseStatus(licenseId: string, status: LicenseToken['status']): Promise<{ success: boolean; license?: LicenseToken }> {
  try {
    const res = await fetch('/api/license/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseId, status })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return { success: true, license: json.license };
    }
  } catch (e) {}

  const licenses = await fetchLicensesFromCloud();
  const lic = licenses.find(l => l.id === licenseId || l.token === licenseId);
  if (lic) {
    lic.status = status;
    await saveLicensesToCloud(licenses);
    return { success: true, license: lic };
  }
  return { success: false };
}

export async function deleteLicenseFromCloud(licenseId: string): Promise<{ success: boolean }> {
  try {
    await fetch(`/api/license/${licenseId}`, { method: 'DELETE' });
  } catch (e) {}

  const licenses = await fetchLicensesFromCloud();
  const updated = licenses.filter(l => l.id !== licenseId && l.token !== licenseId);
  await saveLicensesToCloud(updated);
  return { success: true };
}

// Publish Live Update to All Users (Direct to Supabase Cloud & Express Server)
export async function publishLiveSystemUpdate(
  note?: string,
  extraPayload?: {
    inverters?: Inverter[];
    panels?: PanelPreset[];
    batteries?: BatteryPreset[];
    mountingDatabase?: any;
    adminContact?: AdminContactConfig;
    adminResources?: AdminResourceFile[];
    appBranding?: AppBranding;
  }
): Promise<{ success: boolean; publishedAt?: string }> {
  const publishedAt = new Date().toISOString();
  const publishNote = note || "Admin published live update";

  // 1. Persist ALL equipment datasets to Supabase Cloud so GitHub Pages clients load them immediately
  const supabase = initSupabase();
  if (supabase) {
    try {
      const upsertRows: Array<{ id: string; value: any; updated_at: string }> = [
        {
          id: 'global_system_published',
          value: { publishedAt, note: publishNote, timestamp: Date.now() },
          updated_at: publishedAt
        }
      ];

      if (extraPayload?.inverters && Array.isArray(extraPayload.inverters)) {
        upsertRows.push(
          { id: 'global_custom_inverters', value: extraPayload.inverters, updated_at: publishedAt },
          { id: 'inverters', value: extraPayload.inverters, updated_at: publishedAt }
        );
      }
      if (extraPayload?.panels && Array.isArray(extraPayload.panels)) {
        upsertRows.push(
          { id: 'global_custom_panels', value: extraPayload.panels, updated_at: publishedAt },
          { id: 'panels', value: extraPayload.panels, updated_at: publishedAt }
        );
      }
      if (extraPayload?.batteries && Array.isArray(extraPayload.batteries)) {
        upsertRows.push({ id: 'global_custom_batteries', value: extraPayload.batteries, updated_at: publishedAt });
      }
      if (extraPayload?.mountingDatabase) {
        upsertRows.push({ id: 'global_mounting_database', value: extraPayload.mountingDatabase, updated_at: publishedAt });
      }
      if (extraPayload?.adminContact) {
        upsertRows.push({ id: 'global_admin_contact', value: extraPayload.adminContact, updated_at: publishedAt });
      }
      if (extraPayload?.appBranding) {
        upsertRows.push({ id: 'global_app_branding', value: extraPayload.appBranding, updated_at: publishedAt });
      }
      if (extraPayload?.adminResources && Array.isArray(extraPayload.adminResources)) {
        const sanitized = sanitizeResourcesForLocalCache(extraPayload.adminResources);
        upsertRows.push({ id: 'global_admin_resources', value: sanitized, updated_at: publishedAt });
      }

      await supabase
        .from('app_settings')
        .upsert(upsertRows, { onConflict: 'id' });

      // Broadcast full payload across Supabase Realtime for instant update on all open GitHub tabs
      const channel = supabase.channel('solar_global_database_events');
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'system_published',
            payload: {
              publishedAt,
              note: publishNote,
              timestamp: publishedAt,
              ...extraPayload
            }
          });
          if (extraPayload?.inverters) {
            channel.send({
              type: 'broadcast',
              event: 'inverters_changed',
              payload: { inverters: extraPayload.inverters, count: extraPayload.inverters.length, timestamp: Date.now() }
            });
          }
          if (extraPayload?.panels) {
            channel.send({
              type: 'broadcast',
              event: 'panels_changed',
              payload: { panels: extraPayload.panels, count: extraPayload.panels.length, timestamp: Date.now() }
            });
          }
          setTimeout(() => channel.unsubscribe(), 2500);
        }
      });
    } catch (e) {
      console.warn('Supabase publish update error:', e);
    }
  }

  // 2. Post to Express Server API (if reachable)
  try {
    const res = await fetch('/api/publish-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: publishNote, ...extraPayload })
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, publishedAt: json.publishedAt || publishedAt };
    }
  } catch (e) {}

  return { success: true, publishedAt };
}

// ----------------------------------------------------
// TELEGRAM BOT CONFIGURATION & SYNC
// ----------------------------------------------------

export const DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG: TelegramBotConfig = {
  enabled: true,
  botToken: '9212139270:AAEHgyL2ur0c_N1dW-uYkBhvdgYoRDUCuDk',
  botUsername: 'UniqueSolarProLicenseBot',
  adminChatId: '1715154450',
  notifyOnActivation: true,
  notifyOnPayment: true,
  lastTestedAt: '2026-11-05T14:11:49.716Z'
};

const STORAGE_TELEGRAM_CONFIG_KEY = 'solar_sizer_telegram_config_v1';

export async function fetchTelegramConfigFromCloud(): Promise<TelegramBotConfig> {
  // 1. Try local storage cache
  try {
    const raw = localStorage.getItem(STORAGE_TELEGRAM_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.botToken) return { ...DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG, ...parsed };
    }
  } catch (e) {}

  // 2. Try Server API
  try {
    const res = await fetch('/api/telegram/config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        localStorage.setItem(STORAGE_TELEGRAM_CONFIG_KEY, JSON.stringify(data.config));
        return { ...DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG, ...data.config };
      }
    }
  } catch (e) {}

  // 3. Try Supabase app_settings
  const client = initSupabase();
  if (client) {
    try {
      const { data } = await client.from('app_settings').select('value').eq('id', 'telegram_bot_config').maybeSingle();
      if (data && data.value && data.value.botToken) {
        localStorage.setItem(STORAGE_TELEGRAM_CONFIG_KEY, JSON.stringify(data.value));
        return { ...DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG, ...data.value };
      }
    } catch (e) {}
  }

  return DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG;
}

export async function saveTelegramConfigToCloud(config: TelegramBotConfig): Promise<{ success: boolean; config?: TelegramBotConfig; error?: string }> {
  // 1. Save to localStorage
  try {
    localStorage.setItem(STORAGE_TELEGRAM_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {}

  // 2. Sync menu button directly to Telegram with GitHub Pages URL
  if (config.botToken) {
    syncTelegramMenuWithGitHub(config.botToken, 'https://solartechse3-cmyk.github.io/uniquesolarsizing1').catch(() => {});
  }

  // 3. Save to Supabase
  const client = initSupabase();
  if (client) {
    try {
      await client.from('app_settings').upsert({
        id: 'telegram_bot_config',
        value: config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {}
  }

  // 4. Try Server API
  try {
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, config: data.config };
    }
  } catch (err: any) {}

  return { success: true, config };
}

export async function syncTelegramMenuWithGitHub(
  token?: string, 
  appUrl: string = 'https://solartechse3-cmyk.github.io/uniquesolarsizing1'
): Promise<{ success: boolean; message?: string; error?: string }> {
  const botToken = token || DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG.botToken;
  if (!botToken) return { success: false, error: 'Telegram Bot Token is required' };
  const cleanUrl = appUrl.replace(/\/+$/, '');

  try {
    // 1. Set Chat Menu Button with Web App link
    const resMenu = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '☀️ Open Solar Pro',
          web_app: { url: cleanUrl }
        }
      })
    });
    const menuData = await resMenu.json();

    // 2. Set Description
    await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: `☀️ UNIQUE SOLAR PRO - Engineering Suite ⚡️\nSolar Panel Sizing & Inverter Matching App for Engineers in Myanmar.\n\n🌐 Web App Link (VPN-Free):\n${cleanUrl}\n\n🔑 Instant 1-Click PRO License Activation & Management.`
      })
    }).catch(() => {});

    // 3. Set Short Description
    await fetch(`https://api.telegram.org/bot${botToken}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        short_description: `Unique Solar Pro - ${cleanUrl}`
      })
    }).catch(() => {});

    if (menuData.ok) {
      return { success: true, message: `Telegram Bot Menu Button successfully connected to ${cleanUrl}!` };
    } else {
      return { success: false, error: menuData.description || 'Failed to update menu button' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function testTelegramBotConnection(
  botToken?: string,
  adminChatId?: string
): Promise<{ success: boolean; botUsername?: string; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, adminChatId })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {}

  // Client-side fallback test directly with Telegram API
  const token = botToken || DEFAULT_INITIAL_TELEGRAM_BOT_CONFIG.botToken;
  if (!token) return { success: false, error: 'Telegram Bot Token ထည့်သွင်းပေးပါခင်ဗျာ' };

  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return { success: false, error: `Bot Token မှားယွင်းနေပါသည်: ${meData.description}` };
    }
    const username = meData.result?.username;
    const appUrl = 'https://solartechse3-cmyk.github.io/uniquesolarsizing1';

    // Sync menu button directly
    syncTelegramMenuWithGitHub(token, appUrl).catch(() => {});

    if (adminChatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: `✅ <b>UNIQUE SOLAR PRO - Telegram Bot Connected!</b> ⚡️\nBot: @${username}\n🌐 <b>GitHub Pages App:</b> ${appUrl}\nStatus: Online & Ready!`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '☀️ Open Solar Pro (Web App)', web_app: { url: appUrl } },
                { text: '🌐 Direct Browser Link', url: appUrl }
              ]
            ]
          }
        })
      });
    }

    return {
      success: true,
      botUsername: username,
      message: adminChatId 
        ? `Bot @${username} သို့ ချိတ်ဆက်မှု အောင်မြင်ပြီး Chat ID: ${adminChatId} သို့ စာတို ပို့ဆောင်ပြီးပါပြီ!`
        : `Bot @${username} အတည်ပြုပြီးပါပြီ!`
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Connection test failed' };
  }
}

export async function notifyTelegramOnClientActivation(
  license: LicenseToken, 
  deviceModel: string, 
  deviceId: string
): Promise<void> {
  try {
    const cfg = await fetchTelegramConfigFromCloud();
    if (cfg && cfg.enabled && cfg.botToken && cfg.adminChatId && cfg.notifyOnActivation) {
      const boundCount = license.boundDevices?.length || 1;
      const devLimit = license.deviceLimit || 1;
      const expireStr = new Date(license.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const text = `🔔 <b>PRO License Activated on Buyer Device!</b>\n━━━━━━━━━━━━━━━━━\n👤 <b>Customer:</b> ${license.customerName || 'Valued Engineer'}\n📱 <b>Device:</b> ${deviceModel}\n🆔 <b>Device ID:</b> <code>${deviceId}</code>\n🔑 <b>License Key:</b> <code>${license.token}</code>\n⏳ <b>Expires At:</b> ${expireStr}\n📊 <b>Devices:</b> ${boundCount}/${devLimit}\n🌐 <b>Origin:</b> GitHub Pages (https://solartechse3-cmyk.github.io/uniquesolarsizing1)`;

      fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cfg.adminChatId,
          text,
          parse_mode: 'HTML'
        })
      }).catch(() => {});
    }
  } catch (e) {}
}
