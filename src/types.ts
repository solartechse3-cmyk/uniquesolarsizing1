export interface Inverter {
  id: string;
  brand: string;
  model: string;
  kw: number;             // AC Output kW
  maxDcInputWatt: number; // Max DC Input Power (Watts)
  vmpMin: number;
  vmpMax: number;
  nominalVoltage: number;
  maxDcVoltage: number;
  mppt: number;
  stringPerMppt: string | number; // e.g. "1+1", "2+2", "2*10", or 2
  imp: string | number;           // e.g. "18+18", "39+30", "20*10", or 18
  isc: string | number;           // e.g. "27+27", "34+17", "30*10", or 27
}

export interface PanelPreset {
  id: string;
  name: string;
  voc: number;
  vmp: number;
  watt: number;
  imp: number;            // Panel Maximum Power Current (Amperes)
  isc: number;            // Panel Short Circuit Current (Amperes)
  width?: number;         // in meters, e.g. 1.134
  length?: number;        // in meters, e.g. 2.278
  thickness?: number;     // in mm, e.g. 30, 35
}

export interface BatteryPreset {
  id: string;
  brand: string;
  model: string;
  voltage: number;        // e.g. 51.2, 48, 24, 12, 200
  nominalVoltage?: number;// Alias for voltage
  capacityAh: number;     // e.g. 100, 200, 280
  energyKwh: number;      // e.g. 5.12, 10.24, 14.3
  capacityKwh?: number;   // Alias for energyKwh
  chemistry: 'lifepo4' | 'nmc' | 'gel_lead_acid' | string;
  type?: 'lithium' | 'gel' | 'lead_acid' | 'lifepo4' | 'nmc' | 'gel_lead_acid' | string; // Type / chemistry alias
  maxDischargeC?: number; // e.g. 0.5C, 1.0C
  maxDischargeCurrent?: number; // Discharge current in Amps
  maxChargeCurrent?: number;    // Charge current in Amps
  dodPercent?: number;    // e.g. 90%
}

export interface AppBranding {
  logoUrl?: string; // base64 data URL or external URL
  appName?: string; // e.g. "SOLAR PRO"
  appSubtitle?: string; // e.g. "Engineering Suite"
  appVersion?: string; // e.g. "v2.5"
  customAppUrl?: string; // e.g. "https://username.github.io/app" or custom domain for VPN-free access
  updatedAt?: string;
}

export type SupportedLanguage = 'en' | 'my' | 'zh';

export type SubscriptionDuration = '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime' | 'custom' | string;

export interface AdminContactConfig {
  viberPhone: string;
  viberUrl?: string;
  telegramUsername: string;
  telegramUrl?: string;
  customAppUrl?: string; // e.g. "https://username.github.io/app" or custom domain for VPN-free access
  noteMy?: string;
  noteEn?: string;
}

export interface TelegramBotConfig {
  enabled: boolean;
  botToken: string;
  botUsername?: string;
  adminChatId?: string;
  notifyOnActivation?: boolean;
  notifyOnPayment?: boolean;
  lastTestedAt?: string;
}

export interface BoundDevice {
  deviceId: string;
  deviceModel: string;
  activatedAt: string;
  lastSeenAt: string;
}

export interface LicenseToken {
  id: string;
  token: string; // e.g. "PRO-1M-1D-ABCD-1234"
  customerName: string; // e.g. "Ko Aung (Viber)"
  duration: '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime';
  durationDays: number;
  deviceLimit: 1 | 2;
  boundDevices: BoundDevice[];
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
  note?: string;
}

export interface DurationPackage {
  id: SubscriptionDuration;
  months: number;
  labelEn: string;
  labelMy: string;
  labelZh: string;
  price: number;
  tagEn?: string;
  tagMy?: string;
  discountPercent?: number;
}

export type PaymentMethod = 'kbzpay' | 'wavepay' | 'ayapay' | 'cbpay' | 'yoma' | 'uab' | 'bank_transfer' | 'custom' | string;

export type PaymentStatus = 'unpaid' | 'pending' | 'approved' | 'rejected';

export interface PaymentAccountItem {
  id: string;
  provider: string; // 'kbzpay' | 'wavepay' | 'cbpay' | 'ayapay' | 'yoma' | 'uab' | 'bank_transfer' | 'custom'
  payName: string; // Custom Name e.g. "KBZPay (Main)", "KBZPay (Office 2)", "WavePay Special"
  accountName: string; // Recipient Name e.g. "U Aung Myo Oo (Solar Tech)"
  accountNumber: string; // Account Number or Phone e.g. "09 798 123 456"
  qrImage?: string; // Base64 or Image URL
  note?: string;
  isActive: boolean;
  colorTheme?: 'blue' | 'yellow' | 'red' | 'purple' | 'emerald' | 'orange' | 'cyan' | 'slate' | 'pink';
}

export interface PaymentRecord {
  id: string;
  transactionDigits: string; // Last 6 digits
  method: string; // PaymentMethod or provider/account name
  accountId?: string; // ID of the specific payment account used
  accountPayName?: string; // Display name of the account used (e.g. "KBZPay (Main)")
  amount: number;
  currency: string;
  merchantName: string;
  merchantPhone: string;
  submittedAt: string; // ISO string
  approvedAt?: string;
  expiresAt?: string; // ISO string when subscription expires (1 month, 3 months, 6 months, 1 year)
  durationMonths?: number; // 1, 3, 6, 12 etc.
  planDuration?: SubscriptionDuration;
  planName?: string;
  status: PaymentStatus;
  slipImage?: string; // base64 or object URL
  customerName?: string;
  customerPhone?: string;
  sessionId?: string;
  device?: string;
  note?: string;
}

export interface PaymentConfig {
  merchantName: string;
  merchantPhone: string;
  amount: number;
  currency: string;
  planName: string;
  autoApproveMinutes: number; // 0 for manual admin approval
  adminPassword?: string; // Password required to enter Admin Mode (Default: Atha2608@)
  accounts: PaymentAccountItem[]; // Dynamic list of payment accounts
  durationsPricing?: {
    oneWeek?: number;
    oneMonth: number;
    threeMonths: number;
    sixMonths: number;
    oneYear: number;
  };
  // Legacy / fallback fields
  kpayQrImage?: string;
  waveQrImage?: string;
  cbQrImage?: string;
  ayaQrImage?: string;
  kbzNumber?: string;
  kbzName?: string;
  waveNumber?: string;
  waveName?: string;
  cbNumber?: string;
  cbName?: string;
  ayaNumber?: string;
  ayaName?: string;
}

export interface AdminResourceFile {
  id: string;
  title: string;
  description: string;
  category: 'datasheet' | 'diagram' | 'guide' | 'database_csv' | 'firmware';
  fileName: string;
  fileSize: string;
  fileType: string;
  fileData?: string; // base64 or data URL
  fileUrl?: string; // direct server download URL
  uploadedAt: string;
  uploadedBy: string;
  isPaidOnly: boolean;
  downloadsCount: number;
}

export interface SpecRequest {
  id: string;
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  brand: string;
  model: string;
  category: 'inverter' | 'panel' | 'battery' | 'charge_controller' | 'other';
  datasheetUrl?: string;
  specDetails: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'added' | 'declined';
  adminReply?: string;
  repliedAt?: string;
}

export interface UserPresence {
  id: string;
  sessionId: string;
  role: 'admin' | 'user' | 'paid_user';
  name?: string;
  device: string;
  activeTab?: string;
  licenseToken?: string;
  lastActive: string;
  startedAt: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export type ActiveNavTab = 'string_sizer' | 'mounting_calc' | 'dc_breaker_calc';

export type MountingLayoutMode = 'uniform' | 'custom_rows' | 'custom_cols' | 'matrix_2d';

export type MountingViewMode = 'blueprint' | 'real_glass' | 'structure_only';

export interface MountingPanelPreset {
  id: string;
  name: string;
  badge: string;
  watt: number;
  width: number;  // in meters e.g. 1.134
  length: number; // in meters e.g. 2.278
  thickness: number; // in mm e.g. 35
}

export interface MountingBOQItem {
  id: string;
  nameMy: string;
  nameEn: string;
  nameZh?: string;
  descriptionMy: string;
  descriptionEn?: string;
  descriptionZh?: string;
  specs: string;
  quantity: number;
  unitMy: string;
  unitEn?: string;
  unitZh?: string;
  unitPrice: number;
  totalPrice: number;
  category: 'rail' | 'clamp' | 'splice' | 'bracket' | 'grounding' | 'cable_clip' | 'other';
}

export interface MountingPanelItem {
  id: string;
  brand: string;
  model: string;
  watt: number;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  weightKg?: number;
  cellType?: string;
  voc?: number;
  vmp?: number;
  imp?: number;
  isc?: number;
  efficiency?: number;
  priceMmk?: number;
}

export interface RoofComponentItem {
  id: string;
  nameMy: string;
  nameEn: string;
  category: 'rail' | 'clamp' | 'bracket' | 'splice' | 'grounding' | 'fastener' | 'cable_clip' | 'other';
  specs: string;
  unit: string;
  unitPrice: number;
  notes?: string;
}

export interface GroundComponentItem {
  id: string;
  nameMy: string;
  nameEn: string;
  category: 'rafter' | 'column' | 'cross_anchor' | 'purlin' | 'tie_beam' | 'foundation' | 'clamp' | 'hardware' | 'other';
  specs: string;
  unit: string;
  unitPrice: number;
  material?: string;
  notes?: string;
}

export interface MountingDatabase {
  version: string;
  lastUpdated: string;
  publishedBy: string;
  isOnlineLive: boolean;
  panels: MountingPanelItem[];
  roofComponents: RoofComponentItem[];
  groundComponents: GroundComponentItem[];
}


