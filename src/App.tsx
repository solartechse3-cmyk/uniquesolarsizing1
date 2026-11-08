import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon,
  Cpu, 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Settings, 
  Layers, 
  Globe, 
  HelpCircle, 
  Check, 
  ChevronRight, 
  Plus, 
  Upload, 
  Trash2, 
  Copy, 
  Download, 
  ShieldCheck, 
  SlidersHorizontal,
  Edit2,
  Edit3,
  RotateCcw,
  DollarSign,
  Clock,
  Lock,
  Unlock,
  Shield,
  FileText,
  Sparkles,
  ArrowRight,
  FolderDown,
  MessageSquare,
  Users,
  Database,
  Radio,
  LayoutGrid,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Inverter, 
  PanelPreset, 
  PaymentConfig, 
  PaymentAccountItem, 
  PaymentRecord, 
  PaymentStatus, 
  PaymentMethod,
  AdminResourceFile,
  SpecRequest,
  UserPresence,
  SupabaseConfig,
  ActiveNavTab,
  BatteryPreset,
  SupportedLanguage,
  AppBranding,
  MountingDatabase,
  AdminContactConfig,
  LicenseToken
} from './types';
import { DEFAULT_BATTERY_PRESETS } from './data/batteryPresets';
import { DEFAULT_INVERTER_DATABASE } from './data/inverterDatabase';
import { DEFAULT_PANEL_PRESETS } from './data/panelPresets';
import { ViberTelegramPurchaseBanner } from './components/ViberTelegramPurchaseBanner';
import { LicenseActivationModal } from './components/LicenseActivationModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { ResourcesVaultModal } from './components/ResourcesVaultModal';
import { SpecRequestSentboxModal } from './components/SpecRequestSentboxModal';
import { SidebarNavigation } from './components/SidebarNavigation';
import { ActiveUsersModal } from './components/ActiveUsersModal';
import { SolarMountingCalculator } from './components/SolarMountingCalculator';
import { DCBreakerCalculator } from './components/DCBreakerCalculator';
import { MountingCalculatorPaywallGate } from './components/MountingCalculatorPaywallGate';
import { MountingDatabaseModal } from './components/MountingDatabaseModal';
import {
  getInitialMountingDatabase,
  fetchMountingDatabaseFromCloud,
  subscribeToMountingDatabaseUpdates
} from './lib/mountingDatabaseSync';
import { 
  INITIAL_ADMIN_RESOURCES, 
  INITIAL_SPEC_REQUESTS, 
  getSupabaseCredentials, 
  initSupabase, 
  isSupabaseConnected,
  getClientDevice,
  getMyDeviceId,
  getMySessionId,
  setupRealtimePresence,
  savePaymentConfigToCloud,
  fetchPaymentConfigFromCloud,
  saveCustomInvertersToCloud,
  fetchCustomInvertersFromCloud,
  saveCustomPanelsToCloud,
  fetchCustomPanelsFromCloud,
  saveCustomBatteriesToCloud,
  fetchCustomBatteriesFromCloud,
  saveAdminResourcesToCloud,
  fetchAdminResourcesFromCloud,
  sanitizeResourcesForLocalCache,
  saveSpecRequestsToCloud,
  fetchSpecRequestsFromCloud,
  savePaymentRecordsToCloud,
  fetchPaymentRecordsFromCloud,
  syncAllDatabaseToCloud,
  subscribeToGlobalDatabaseUpdates,
  fetchAllServerData,
  saveAppBrandingToCloud,
  fetchAppBrandingFromCloud,
  DEFAULT_APP_BRANDING,
  DEFAULT_ADMIN_CONTACT,
  fetchAdminContactFromCloud,
  saveAdminContactToCloud,
  fetchLicensesFromCloud,
  saveLicensesToCloud,
  generateLicenseOnServer,
  activateLicenseOnDevice,
  unbindLicenseDevice,
  extendLicenseDuration,
  updateLicenseStatus,
  deleteLicenseFromCloud,
  publishLiveSystemUpdate,
  getStoredActiveLicense,
  saveStoredActiveLicense
} from './lib/supabase';
import { parseSolarPanelsFile, parseInvertersFile } from './lib/spreadsheetParser';
import { 
  isSubscriptionActive, 
  isSubscriptionExpired, 
  getRemainingSubscriptionTime, 
  formatDurationLabel, 
  calculateExtendedExpirationDate,
  SubscriptionDuration 
} from './lib/subscriptionUtils';
import { appendPaymentRecordToSheet, appendLicenseRecordToSheet } from './lib/googleSheetsService';



// Translations Dictionary with new features
const TRANSLATIONS = {
  en: {
    title: "Solar Panel String Sizer",
    subtitle: "Determine the safe, optimal, and limits of solar panels per string matching your inverter specs.",
    languageBtn: "မြန်မာဘာသာ",
    inverterSection: "1. Inverter Specifications",
    selectInverter: "Inverter Template",
    customInverter: "Custom Inverter (Manual Input)",
    brand: "Brand Name",
    model: "Model Name",
    capacityKw: "AC Capacity (kW)",
    maxDcInputWatt: "Max DC Input Power (W)",
    mpptCount: "MPPT Channels",
    stringsPerMppt: "Strings per MPPT",
    maxDcVoltage: "Max DC Input Voltage",
    mpptRange: "MPPT Vmp Range",
    nominalVoltage: "Nominal Input Voltage",
    panelSection: "2. Solar Panel Specifications",
    selectPanel: "Solar Panel Template",
    customPanel: "Custom Panel (Manual Input)",
    panelName: "Panel Name",
    panelVoc: "Open Circuit Voltage (Voc)",
    panelVmp: "Max Power Voltage (Vmp)",
    panelWatt: "Panel Power (Watts)",
    panelWattOptional: "Required for watt calculations",
    calculateBtn: "Calculate Sizing",
    resultsSection: "Sizing Results (Per String)",
    maxLabel: "Absolute Max per String",
    maxDesc: "Physical limit to prevent over-voltage damage",
    minLabel: "Absolute Min per String",
    minDesc: "Physical minimum to reach start-up Vmp voltage",
    recLabel: "Recommended Design",
    recDesc: "Your custom safety-buffered target string count",
    maxWattPanelsLabel: "Max Total System Panels (By Wattage Limit)",
    maxWattPanelsDesc: "Calculated as Max DC Input Power divided by selected Panel Wattage",
    safetyReportTitle: "String Safety Analysis",
    tempDisclaimer: "Note: Panel voltage shifts with temperature. Warm panels generate lower Vmp; freezing weather increases Voc.",
    estVoltages: "String Voltage Estimations",
    recStringVoc: "Design String Voc",
    recStringVmp: "Design String Vmp",
    recStringPower: "Design String Power",
    stringWiringDiagram: "String Series Connection Layout",
    seriesLayout: "Solar panels series connection into inverter",
    totalArrayPower: "Total Array Sizing Summary",
    panelsTotalCount: "Total Panels",
    stringsTotalCount: "Total Strings",
    totalMaxPower: "Total DC Solar Capacity",
    inverterCapMatched: "Inverter Capacity Match",
    vocHigherVmp: "Voc must be greater than Vmp voltage.",
    fillVocVmp: "Please enter positive numbers for Panel Voc and Panel Vmp.",
    statusOptimal: "Optimal operating voltage",
    statusHighVoc: "Danger: Cold weather Voc could damage the inverter!",
    statusLowVmp: "Warning: String voltage drops close to MPPT limit in heat.",
    statusSafe: "Operating voltages reside safely inside MPPT boundaries with safety buffers.",
    statusTitleSafe: "System Design Safe & Secure",
    statusTitleWarning: "Marginal Voltage Warning",
    statusTitleDanger: "Over-voltage Violation Danger",
    panelsPlural: "Panels",
    custom: "Custom / ကိုယ်တိုင်ထည့်သွင်းမှု",
    tooltipVoc: "Open Circuit Voltage: The maximum voltage the panel produces with no load. Crucial for calculating safe maximum panel count to avoid blowing the inverter's capacitors.",
    tooltipVmp: "Maximum Power Voltage: The voltage at which the panel operates when producing peak power under standard conditions.",
    tooltipNominal: "The voltage target where the inverter works at its peak thermodynamic power conversion efficiency. Keeping string Vmp close to this yields maximum power generation.",
    tooltipMpptRange: "The minimum and maximum DC voltage boundaries in which the inverter's tracker can optimize the solar string power output.",
    
    // New Translations for Add Inverters & Safety Margins
    addInverterHeader: "Manage Inverters Database",
    addPanelHeader: "Manage Solar Panels Database",
    csvImportTab: "CSV File Upload",
    manualAddTab: "Manual Form Entry",
    templatesListTab: "Saved Databases",
    csvSuccess: "Successfully imported data from CSV!",
    csvError: "Error parsing CSV file. Check formatting and headers.",
    manualInverterSuccess: "Inverter template saved to list!",
    manualPanelSuccess: "Solar Panel template saved to list!",
    deleteConfirm: "Are you sure you want to delete this custom template?",
    noCustomInverters: "No custom templates added yet.",
    noCustomPanels: "No custom panel templates added yet.",
    saveBtn: "Save Template",
    safetyBufferSection: "3. Sizing Safety Buffer Settings",
    minBufferLabel: "Minimum Panel Buffer",
    minBufferDesc: "Add extra panels above the absolute minimum to ensure the string starts up reliably in weak sunlight or high ambient temperatures (recommended: +1 panel).",
    maxBufferLabel: "Maximum Panel safety threshold",
    maxBufferDesc: "Subtract panels below the absolute maximum limit to prevent high Voc from burning the inverter during sudden freezing weather conditions (recommended: -1 panel).",
    warningShort: "Warning",
    noBuffer: "No safety buffer",
    onePanelBuffer: "+1 Panel comfort",
    twoPanelBuffer: "+2 Panels extra safe",
    onePanelMaxBuffer: "-1 Panel threshold margin",
    twoPanelMaxBuffer: "-2 Panels high cold margin",
    activeBufferTitle: "Design Preferences Applied",
    absoluteLimits: "Absolute Hardware Limits",
    safeLimits: "Your Recommended Safe Range",
    exportInverterCsvBtn: "Download Inverter Database (CSV)",
    exportPanelCsvBtn: "Download Panel Database (CSV)",
    invertersImportZone: "Inverters Import/Export Zone",
    panelsImportZone: "Solar Panels Import/Export Zone",
    sampleCsvBtn: "Copy Sample CSV",
    dropZoneLabel: "Drag and drop CSV file here or click to choose file",
    inverterCsvHeaders: "Required CSV Headers for Inverters:\nbrand, model, kw, maxDcInputWatt, vmpMin, vmpMax, nominalVoltage, maxDcVoltage, mppt, stringPerMppt, imp, isc",
    panelCsvHeaders: "Required CSV Headers for Solar Panels:\nname, voc, vmp, watt, imp, isc",
    simpleWiringPanel: "Panel",
    simpleWiringInverter: "Inverter Input",
    posLead: "Positive String (+) Lead",
    negLead: "Negative String (-) Lead",
    stringVoltage: "String Operating Vmp",
    inverterImp: "Max MPPT Input Current (Imp)",
    inverterIsc: "Max MPPT Short Circuit Current (Isc)",
    panelImp: "Max Power Current (Imp)",
    panelIsc: "Short Circuit Current (Isc)",
    tooltipInverterImp: "Inverter Maximum MPPT input current: The maximum operating current the inverter's MPPT tracker can handle.",
    tooltipInverterIsc: "Inverter Maximum MPPT short circuit current: The maximum safety current limit the inverter can withstand under short circuit conditions.",
    tooltipPanelImp: "Solar Panel Max Power Current: The current produced by the panel when operating at peak power.",
    tooltipPanelIsc: "Solar Panel Short Circuit Current: The maximum current the panel produces when short circuited. Essential for current capacity matching.",
    statusHighIsc: "Danger: Solar panel Short Circuit Current (Isc) of {panelIsc}A exceeds the Inverter's maximum allowed Isc limit of {inverterIsc}A! This will cause catastrophic inverter damage.",
    statusHighImp: "Current Clipped: Solar panel operating current (Imp) of {panelImp}A is higher than the Inverter's maximum MPPT Imp limit of {inverterImp}A. The inverter will clip/limit the current, slightly capping maximum generation capacity in peak sun.",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    calcDetailHeader: "Formula & Step-by-Step Sizing Details",
    calcDetailDesc: "See exactly how the solar string size is calculated based on physics, inverter thresholds, and your safety margins.",
    formulaTarget: "1. Formula for Nominal (Ideal) panels per string:",
    formulaMin: "2. Formula for Absolute Minimum panels (to startup MPPT):",
    formulaMax: "3. Formula for Absolute Maximum panels (to avoid over-voltage):",
    formulaSafeRange: "4. Your Preferred Safe Range (with safety buffers):",
    formulaConclusion: "5. Sizing Recommendation Decision:",
    payToUnlock: "Submit Payment Slip",
    proActive: "PRO Activated",
    viewReceipt: "Payment Receipt",
    pendingReview: "Under Review",
    adminPanel: "Admin Panel",
    lockedNotice: "Solar Calculator requires payment slip verification. Click to submit transaction digits or unlock with demo.",
    modePresets: "Database Presets",
    modeManual: "Manual Input",
    addNewModel: "Add Inverter",
    addNewPanel: "Add Panel",
    loadSampleSpecs: "Sample Specs",
    backToPresets: "Back to Presets",
    saveToPresetsList: "Save to Presets Library",
    applyDirectly: "Apply to Sizing",
    customInverterTitle: "Custom Inverter (Manual Input)",
    customPanelTitle: "Custom Solar Panel (Manual Input)",
    editingPreset: "Editing Preset"
  },
  my: {
    title: "ဆိုလာပြား အရေအတွက် တွက်ချက်စက်",
    subtitle: "သင့်အင်ဗာတာ၏ MPPT သတ်မှတ်ချက်များနှင့် အကိုက်ညီဆုံးဖြစ်မည့် ဆိုလာပြားအရေအတွက် အစီအစဉ် (String Sizing) ကို စနစ်တကျ တွက်ချက်ပါ။",
    languageBtn: "English",
    inverterSection: "၁။ အင်ဗာတာ သတ်မှတ်ချက်များ",
    selectInverter: "အင်ဗာတာ အမျိုးအစား ရွေးချယ်ပါ",
    customInverter: "ကိုယ်တိုင် အချက်အလက်ထည့်သွင်းမည် (Custom Form)",
    brand: "အင်ဗာတာ တံဆိပ်",
    model: "မော်ဒယ် အမည်",
    capacityKw: "အေစီ စွမ်းရည် (kW)",
    maxDcInputWatt: "အများဆုံး လက်ခံနိုင်သော DC စွမ်းအား (W)",
    mpptCount: "MPPT လိုင်းအရေအတွက်",
    stringsPerMppt: "MPPT တစ်ခုလျှင် စတြင်း (String)",
    maxDcVoltage: "အများဆုံး DC ဗို့အား လက်ခံနိုင်မှု",
    mpptRange: "MPPT အလုပ်လုပ်မည့် ဗို့အားအကွာအဝေး",
    nominalVoltage: "ပုံမှန် အလုပ်လုပ်မည့် ဗို့အား (Nominal)",
    panelSection: "၂။ ဆိုလာပြား သတ်မှတ်ချက်များ",
    selectPanel: "ဆိုလာပြား အမျိုးအစား ရွေးချယ်ပါ",
    customPanel: "ကိုယ်တိုင် အချက်အလက်ထည့်သွင်းမည် (Custom Form)",
    panelName: "ဆိုလာပြားအမည်",
    panelVoc: "ဆိုလာပြား ဖွင့်လှစ်ပတ်လမ်းဗို့ (Voc)",
    panelVmp: "ဆိုလာပြား အမြင့်ဆုံးစွမ်းဆောင်ရည်ဗို့ (Vmp)",
    panelWatt: "ဆိုလာပြား ဝပ်အား (Wattage)",
    panelWattOptional: "ဝပ်အားဖြင့် တွက်ချက်မှုများအတွက် လိုအပ်ပါသည်",
    calculateBtn: "အချိုးအစား တွက်ချက်မည်",
    resultsSection: "တွက်ချက်မှု ရလဒ်များ (တစ်စတြင်းစာ)",
    maxLabel: "တစ်စတြင်းအတွက် အများဆုံးအကန့်အသတ်",
    maxDesc: "ဗို့အားလွန်ကဲ၍ အင်ဗာတာမလောင်စေရန် ဤအရေအတွက်ထက် လုံးဝမကျော်ရပါ",
    minLabel: "တစ်စတြင်းအတွက် အနည်းဆုံးအကန့်အသတ်",
    minDesc: "အင်ဗာတာ စတင်အလုပ်လုပ်ရန်နှင့် တည်ငြိမ်ရန် အနည်းဆုံး လိုအပ်သောအရေအတွက်",
    recLabel: "သင့်ဒီဇိုင်းအတွက် အသင့်တော်ဆုံးအရေအတွက်",
    recDesc: "သင်သတ်မှတ်ထားသော Safety Buffer များထည့်သွင်းတွက်ချက်ထားသည့် အချိုးအစား",
    maxWattPanelsLabel: "အင်ဗာတာ ဝပ်အားအကန့်အသတ်အရ အများဆုံးပြားအရေအတွက်",
    maxWattPanelsDesc: "အင်ဗာတာ၏ အများဆုံး DC စွမ်းအား (W) ကို ဆိုလာပြား၏ ဝပ်အားဖြင့် စား၍တွက်ချက်ထားပါသည် (တစ်စနစ်လုံးစာ)",
    safetyReportTitle: "စနစ်၏ ဘေးကင်းလုံခြုံမှု စိစစ်ချက်",
    tempDisclaimer: "သတိပြုရန်- အပူချိန်တက်လာပါက ဆိုလာပြား Vmp ကျဆင်းနိုင်ပြီး အေးလွန်းပါက Voc ပိုမိုမြင့်တက်လာနိုင်သည်။",
    estVoltages: "စတြင်း (String) ၏ ခန့်မှန်းဗို့အားများ",
    recStringVoc: "ဒီဇိုင်းထုတ်ထားသော စုစုပေါင်း Voc",
    recStringVmp: "ဒီဇိုင်းထုတ်ထားသော စုစုပေါင်း Vmp",
    recStringPower: "စတြင်းတစ်ခု၏ ထွက်ရှိနိုင်စွမ်းအား",
    stringWiringDiagram: "ဆိုလာပြားများ စီးရီး (Series) ချိတ်ဆက်မှုပုံစံ",
    seriesLayout: "ဆိုလာပြားများကို စီးရီးအစီအစဉ်အတိုင်း အင်ဗာတာသို့ ချိတ်ဆက်ခြင်း",
    totalArrayPower: "စနစ်တစ်ခုလုံး၏ ခြုံငုံသုံးသပ်ချက်",
    panelsTotalCount: "ဆိုလာပြား စုစုပေါင်း",
    stringsTotalCount: "စတြင်း (String) စုစုပေါင်း",
    totalMaxPower: "ဆိုလာပြား စုစုပေါင်း စွမ်းအား (DC)",
    inverterCapMatched: "အင်ဗာတာနှင့် စွမ်းအားကိုက်ညီမှု",
    vocHigherVmp: "Voc ဗို့အားသည် Vmp ထက် ပိုများရပါမည်။",
    fillVocVmp: "ဆိုလာပြား၏ Voc နှင့် Vmp ဗို့အားများကို သုညထက်ကြီးသော ကိန်းဂဏန်းများ ထည့်သွင်းပေးပါ။",
    statusOptimal: "အသင့်တော်ဆုံး ဘေးကင်းဗို့အားအတွင်း တပ်ဆင်ထားပါသည်",
    statusHighVoc: "အန္တရာယ်- ရာသီဥတုအလွန်အေးပါက တွက်ချက်ထားသော Voc သည် အင်ဗာတာကို ပျက်စီးစေနိုင်သည်!",
    statusLowVmp: "သတိပေးချက်- နေပူပြင်းချိန်တွင် ဗို့အားကျဆင်းမှုကြောင့် MPPT limit အောက် ကျဆင်းနိုင်သည်!",
    statusSafe: "Operating voltage များအားလုံး MPPT ဘေးကင်းလုံခြုံမှုအတိုင်းအတာအတွင်း အပြည့်အဝရှိနေပါသည်။",
    statusTitleSafe: "ဒီဇိုင်း စနစ်တကျ ရှိပြီး ဘေးကင်းပါသည်",
    statusTitleWarning: "သတိပြုရန် အချိုးအစားဖြစ်နေသည်",
    statusTitleDanger: "ဗို့အားလွန်ကဲ၍ အန္တရာယ်ရှိနေသည်",
    panelsPlural: "ချပ် / ပြား",
    custom: "Custom / ကိုယ်တိုင်ထည့်သွင်းမှု",
    tooltipVoc: "Open Circuit Voltage (Voc): ဆိုလာပြားတွင် ဝန် (load) မချိတ်ဘဲ တိုင်းတာရရှိသော အမြင့်ဆုံးဗို့အား။ အေးသောရာသီတွင် ဤဗို့အား မြင့်တက်တတ်သဖြင့် အင်ဗာတာမလောင်စေရန် အများဆုံးဆိုလာပြားအရေအတွက်ကို တွက်ရာတွင် သုံးသည်။",
    tooltipVmp: "Maximum Power Voltage (Vmp): ဆိုလာပြား အလုပ်လုပ်ပြီး အမြင့်ဆုံးစွမ်းအင်ထုတ်ပေးနေစဉ် ရှိမည့် ဗို့အား။",
    tooltipNominal: "Nominal Operating Voltage: အင်ဗာတာ၏ အမြင့်ဆုံးထိရောက်မှုဖြင့် အလုပ်လုပ်နိုင်သော စံဗို့အား။ ဆိုလာစတြင်းတစ်ခုလုံး၏ Vmp ကို ဤဗို့အားနားတွင်ရှိအောင်ထားခြင်းဖြင့် အကောင်းဆုံးစွမ်းအင် ရစေသည်။",
    tooltipMpptRange: "MPPT Tracker မှ ဆိုလာပြားများမှ စွမ်းအင်ကို အကောင်းဆုံး ဆွဲထုတ်ပေးနိုင်မည့် အနိမ့်ဆုံးနှင့် အမြင့်ဆုံး ဗို့အားအကွာအဝေး။",
    
    // Myanmar translations for add inverters & Safety margins
    addInverterHeader: "အင်ဗာတာ ဒေတာဘေ့စ် စီမံခန့်ခွဲရန်",
    addPanelHeader: "ဆိုလာပြား ဒေတာဘေ့စ် စီမံခန့်ခွဲရန်",
    csvImportTab: "CSV ဖိုင်ဖြင့် တင်သွင်းရန်",
    manualAddTab: "ကိုယ်တိုင် ဖြည့်စွက်ရန်",
    templatesListTab: "သိမ်းဆည်းထားသော စာရင်းများ",
    csvSuccess: "အချက်အလက်များကို CSV ဖိုင်မှ အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ။",
    csvError: "CSV ဖိုင်ဖတ်ရာတွင် အမှားအယွင်းရှိသည်။ format ခေါင်းစဉ်ကိုက်ညီမှု ရှိမရှိ စစ်ဆေးပါ။",
    manualInverterSuccess: "အင်ဗာတာအချက်အလက်ကို တမ်းပလိတ်များထဲသို့ သိမ်းဆည်းလိုက်ပါပြီ။",
    manualPanelSuccess: "ဆိုလာပြားအချက်အလက်ကို တမ်းပလိတ်များထဲသို့ သိမ်းဆည်းလိုက်ပါပြီ။",
    deleteConfirm: "ဤတမ်းပလိတ်ကို ဖျက်ရန် သေချာပါသလား။",
    noCustomInverters: "ကိုယ်တိုင်ထည့်ထားသော အင်ဗာတာ မရှိသေးပါ။",
    noCustomPanels: "ကိုယ်တိုင်ထည့်ထားသော ဆိုလာပြား မရှိသေးပါ။",
    saveBtn: "တမ်းပလိတ်အဖြစ် သိမ်းမည်",
    safetyBufferSection: "၃။ ဆိုလာပြားအရေအတွက် ဘေးကင်းလုံခြုံရေး ဘတ်ဖာ (Buffer)",
    minBufferLabel: "အနည်းဆုံးဗို့အထက် ပိုထည့်မည့် ဆိုလာပြားအရေအတွက် (+Min Buffer)",
    minBufferDesc: "အုံ့မှိုင်းချိန် သို့မဟုတ် ပူပြင်းချိန်တွင် ဗို့အားမကျဘဲ အင်ဗာတာ စနစ်တကျ အလုပ်လုပ်ရန် အနည်းဆုံးလိုအပ်ချက်ထက် ပိုမိုတပ်ဆင်မည့် ဆိုလာပြားအရေအတွက် (အကြံပြုချက်: +၁ ပြား ပိုထည့်ရန်)",
    maxBufferLabel: "အများဆုံးဗို့အောက် လျှော့ထည့်မည့် ဆိုလာပြားအရေအတွက် (-Max Buffer)",
    maxBufferDesc: "ရာသီဥတုအလွန်အေးပြီး နှင်းကျချိန်တွင် Voc ဗို့အားကျော်လွန်ပြီး အင်ဗာတာမလောင်စေရန် အမြင့်ဆုံးလက်ခံနိုင်မှုအောက် လျှော့ချတပ်ဆင်မည့် ဆိုလာပြားအရေအတွက် (အကြံပြုချက်: -၁ ပြား လျှော့ထည့်ရန်)",
    warningShort: "သတိပေးချက်",
    noBuffer: "ဘတ်ဖာ မသုံးပါ (No Buffer)",
    onePanelBuffer: "+၁ ပြား ပိုတပ်ဆင်မည် (ပိုမိုတည်ငြိမ်စေရန်)",
    twoPanelBuffer: "+၂ ပြား ပိုတပ်ဆင်မည် (အလွန်တည်ငြိမ်စေရန်)",
    onePanelMaxBuffer: "-၁ ပြား လျှော့တပ်ဆင်မည် (ဗို့အားကျော်ခြင်းမှ ကာကွယ်ရန်)",
    twoPanelMaxBuffer: "-၂ ပြား လျှော့တပ်ဆင်မည် (အထူးဘေးကင်းလုံခြုံစေရန်)",
    activeBufferTitle: "ဘေးကင်းလုံခြုံရေး ဘတ်ဖာများ သတ်မှတ်ထားမှု",
    absoluteLimits: "စက်ပစ္စည်း၏ အကန့်အသတ်အစစ်အမှန်",
    safeLimits: "ဘတ်ဖာထည့်ပြီးနောက် အသင့်တော်ဆုံးအကွာအဝေး",
    exportInverterCsvBtn: "အင်ဗာတာ စာရင်းအား CSV ဖြင့် ဒေါင်းလုဒ်လုပ်ရန်",
    exportPanelCsvBtn: "ဆိုလာပြား စာရင်းအား CSV ဖြင့် ဒေါင်းလုဒ်လုပ်ရန်",
    invertersImportZone: "အင်ဗာတာ တင်သွင်းမှုနှင့် ထုတ်ယူမှုဇုန်",
    panelsImportZone: "ဆိုလာပြား တင်သွင်းမှုနှင့် ထုတ်ယူမှုဇုန်",
    sampleCsvBtn: "နမူနာ CSV ကူးယူရန်",
    dropZoneLabel: "ဤနေရာတွင် CSV ဖိုင်ကို ဆွဲထည့်ပါ သို့မဟုတ် ကလစ်နှိပ်၍ ရွေးချယ်ပါ",
    inverterCsvHeaders: "လိုအပ်သော အင်ဗာတာ CSV ခေါင်းစဉ်ပုံစံများ:\nbrand, model, kw, maxDcInputWatt, vmpMin, vmpMax, nominalVoltage, maxDcVoltage, mppt, stringPerMppt, imp, isc",
    panelCsvHeaders: "လိုအပ်သော ဆိုလာပြား CSV ခေါင်းစဉ်ပုံစံများ:\nname, voc, vmp, watt, imp, isc",
    simpleWiringPanel: "ဆိုလာပြား",
    simpleWiringInverter: "အင်ဗာတာ အဝင်ပေါက်",
    posLead: "အပေါင်းကြိုး လမ်းကြောင်း (+)",
    negLead: "အနှုတ်ကြိုး လမ်းကြောင်း (-)",
    stringVoltage: "စတြင်း၏ အလုပ်လုပ် ဗို့အား (Vmp)",
    inverterImp: "အမြင့်ဆုံး အဝင်လျှပ်စီးကြောင်း (Imp)",
    inverterIsc: "အမြင့်ဆုံး ဆော့ကစ်လျှပ်စီးကြောင်း (Isc)",
    panelImp: "အမြင့်ဆုံး စွမ်းဆောင်ရည်လျှပ်စီး (Imp)",
    panelIsc: "ဆော့ကစ်လျှပ်စီးကြောင်း (Isc)",
    tooltipInverterImp: "အင်ဗာတာ MPPT က ဘေးကင်းစွာ လက်ခံမည့် အမြင့်ဆုံး အလုပ်လုပ်လျှပ်စီးကြောင်း (Amperes) ဖြစ်သည်။",
    tooltipInverterIsc: "အင်ဗာတာ MPPT က အန္တရာယ်ကင်းစွာ ခံနိုင်ရည်ရှိမည့် အမြင့်ဆုံး ဆော့ကစ်လျှပ်စီးကြောင်း ကန့်သတ်ချက် (Amperes) ဖြစ်သည်။",
    tooltipPanelImp: "ဆိုလာပြား အကောင်းဆုံးအလုပ်လုပ်နေချိန် ထွက်ရှိမည့် အမြင့်ဆုံးလျှပ်စီးကြောင်း (Amperes) ဖြစ်သည်။",
    tooltipPanelIsc: "ဆိုလာပြား ဆော့ကစ်ပတ်လမ်းဖြစ်စဉ် ထွက်ရှိလာမည့် အမြင့်ဆုံး လျှပ်စီးကြောင်း ဖြစ်သည်။ အင်ဗာတာမလောင်စေရန် နှိုင်းယှဉ်စစ်ဆေးရန် လိုအပ်သည်။",
    statusHighIsc: "အန္တရာယ်- ဆိုလာပြား၏ Isc လျှပ်စီးကြောင်း ({panelIsc}A) သည် အင်ဗာတာ၏ အမြင့်ဆုံးခံနိုင်ရည် ({inverterIsc}A) ထက် ကျော်လွန်နေသဖြင့် MPPT လောင်ကျွမ်းပျက်စီးစေနိုင်သည်!",
    statusHighImp: "လျှပ်စီးအလိုအလျောက်ညှပ်ယူမည်- ဆိုလာပြား၏ Imp လျှပ်စီး ({panelImp}A) သည် အင်ဗာတာ၏ အမြင့်ဆုံးသတ်မှတ်ချက် ({inverterImp}A) ထက် ကျော်လွန်နေသဖြင့် အင်ဗာတာမှ လျှပ်စီးကို အလိုအလျောက် ညှပ်ယူ (clip) အလုပ်လုပ်ပါမည်။",
    themeLight: "Light Theme",
    themeDark: "Dark Theme",
    calcDetailHeader: "တွက်ချက်မှု အဆင့်ဆင့် ဖော်မြူလာနှင့် အသေးစိတ် ရှင်းလင်းချက်",
    calcDetailDesc: "အင်ဗာတာ၏ လျှပ်စစ်ဗို့အား သတ်မှတ်ချက်များ၊ ဆိုလာပြား အချက်အလက်များနှင့် သင်ရွေးချယ်ထားသော ဘေးကင်းရေး ဘတ်ဖာများအပေါ် အခြေခံ၍ စနစ်တကျ တွက်ချက်ထားပုံကို ဖော်မြူလာများဖြင့် လေ့လာပါ။",
    formulaTarget: "၁။ အကောင်းဆုံး စွမ်းဆောင်ရည်အတွက် ပစ်မှတ်အရေအတွက် တွက်နည်း (Nominal Target):",
    formulaMin: "၂။ အင်ဗာတာ စတင်အလုပ်လုပ်ရန် အနည်းဆုံးလိုအပ်သော အရေအတွက် (Absolute Minimum):",
    formulaMax: "၃။ အင်ဗာတာမလောင်စေရန် အများဆုံး တပ်ဆင်နိုင်သော အရေအတွက် (Absolute Maximum):",
    formulaSafeRange: "၄။ သင်ရွေးချယ်ထားသော ဘေးကင်းဇုန် အကွာအဝေး (Safety Buffered Range):",
    formulaConclusion: "၅။ စနစ်တကျ အကြံပြုချက် ဆုံးဖြတ်ပုံအကျဉ်းချုပ်:",
    payToUnlock: "ငွေလွှဲပြေစာ ပေးပို့မည်",
    proActive: "PRO အတည်ပြုပြီး",
    viewReceipt: "ငွေလွှဲပြေစာ ကြည့်မည်",
    pendingReview: "စစ်ဆေးဆဲ (Pending)",
    adminPanel: "Admin စီမံခန့်ခွဲမှု",
    lockedNotice: "စနစ်အသုံးပြုရန် ငွေလွှဲပြေစာ ပေးပို့အတည်ပြုချက် လိုအပ်ပါသည်။",
    modePresets: "Presets စာရင်းမှ ရွေးမည်",
    modeManual: "Manual Input (စိတ်ကြိုက်)",
    addNewModel: "အင်ဗာတာ အသစ်ထည့်မည်",
    addNewPanel: "ဆိုလာပြား အသစ်ထည့်မည်",
    loadSampleSpecs: "နမူနာ ဖြည့်ရန်",
    backToPresets: "စာရင်းသို့ ပြန်သွားရန်",
    saveToPresetsList: "Presets စာရင်းထဲ သိမ်းမည်",
    applyDirectly: "တိုက်ရိုက်တွက်ချက်မည်",
    customInverterTitle: "စိတ်ကြိုက် အင်ဗာတာ ထည့်သွင်းခြင်း",
    customPanelTitle: "စိတ်ကြိုက် ဆိုလာပြား ထည့်သွင်းခြင်း",
    editingPreset: "ပြင်ဆင်နေသည့် တမ်းပလိတ်"
  },
  zh: {
    title: "光伏组件串联配比计算器",
    subtitle: "根据逆变器 MPPT 与电气耐受参数，精准计算光伏组串的最佳配比、物理安全上限与启动下限。",
    languageBtn: "中文",
    inverterSection: "1. 逆变器电气参数 (Inverter Specs)",
    selectInverter: "选择逆变器预设模板",
    customInverter: "自定义逆变器参数 (手动输入)",
    brand: "逆变器品牌",
    model: "型号名称",
    capacityKw: "额定交流功率 (kW)",
    maxDcInputWatt: "最大直流输入功率 (W)",
    mpptCount: "MPPT 跟踪通道数",
    stringsPerMppt: "每路 MPPT 组串接入数",
    maxDcVoltage: "最大直流输入电压 (Max DC Voc)",
    mpptRange: "MPPT 工作电压范围 (Vmp)",
    nominalVoltage: "额定工作电压 (Nominal)",
    panelSection: "2. 光伏组件电气参数 (Solar Panel Specs)",
    selectPanel: "选择光伏组件预设模板",
    customPanel: "自定义光伏组件 (手动输入)",
    panelName: "光伏组件名称/型号",
    panelVoc: "组件开路电压 (Voc)",
    panelVmp: "最大工作点电压 (Vmp)",
    panelWatt: "组件额定功率 (Watts)",
    panelWattOptional: "用于系统总容量与容配比计算",
    calculateBtn: "开始匹配计算",
    resultsSection: "配比计算结果 (单路组串)",
    maxLabel: "单串物理上限 (Max Panels)",
    maxDesc: "防止低温极端天气高开路电压击穿逆变器的硬件物理极限",
    minLabel: "单串物理下限 (Min Panels)",
    minDesc: "确保逆变器在酷暑高温及弱光下稳定启动跟踪的最低组件数量",
    recLabel: "推荐设计数量 (Recommended)",
    recDesc: "综合安全裕度与最佳逆变转换效率的推荐设计数量",
    maxWattPanelsLabel: "整机最大允许组件总数 (功率限制)",
    maxWattPanelsDesc: "根据逆变器最大直流功率除以单块组件功率推算 (全系统)",
    safetyReportTitle: "组串电气安全与匹配深度分析",
    tempDisclaimer: "注意：光伏组件电压受温度影响显著。炎热天气下 Vmp 电压下降；极端严寒低温下 Voc 电压会大幅上升。",
    estVoltages: "组串工作电气参数预估",
    recStringVoc: "设计组串开路电压 (Voc)",
    recStringVmp: "设计组串工作电压 (Vmp)",
    recStringPower: "单路组串额定装机功率",
    stringWiringDiagram: "光伏组件串联接线拓扑图",
    seriesLayout: "光伏组件串联接入逆变器直流端子",
    totalArrayPower: "全系统装机容量汇总",
    panelsTotalCount: "光伏组件总数",
    stringsTotalCount: "组串总路数 (Strings)",
    totalMaxPower: "直流装机总容量 (DC Capacity)",
    inverterCapMatched: "逆变器容配比 (DC/AC Match)",
    vocHigherVmp: "组件开路电压 (Voc) 必须大于工作电压 (Vmp)。",
    fillVocVmp: "请输入大于 0 的有效 Voc 与 Vmp 电压值。",
    statusOptimal: "工作电压处于最佳转换效率区间",
    statusHighVoc: "危险：极端低温下组串 Voc 超出逆变器最大耐压！",
    statusLowVmp: "警告：高温天气下工作电压可能接近或低于 MPPT 下限！",
    statusSafe: "组串工作电压完全处于 MPPT 最佳安全工作范围与裕度内。",
    statusTitleSafe: "系统设计安全合规",
    statusTitleWarning: "电压边界预警",
    statusTitleDanger: "超压击穿危险",
    panelsPlural: "块 / 片",
    custom: "自定义输入 / Custom",
    tooltipVoc: "开路电压 (Voc)：组件在空载状态下的最高端电压。在寒冷低温气候下该电压会升高，必须严格控制在逆变器最大直流耐压范围内以防硬件损坏。",
    tooltipVmp: "最大工作点电压 (Vmp)：组件在标准测试条件下输出最大峰值功率时的额定工作电压。",
    tooltipNominal: "额定工作电压 (Nominal)：逆变器内部电路达到最高转换效率的目标电压。组串 Vmp 越接近此值，综合发电效率越高。",
    tooltipMpptRange: "逆变器 MPPT 跟踪器能够稳定调节并发挥组件最大发电效能的直流工作电压窗口。",
    addInverterHeader: "逆变器设备数据库管理",
    addPanelHeader: "光伏组件数据库管理",
    csvImportTab: "CSV 批量导入",
    manualAddTab: "手动表单录入",
    templatesListTab: "已保存设备库",
    csvSuccess: "已成功从 CSV 导入设备数据！",
    csvError: "CSV 解析失败，请检查文件格式与表头名称。",
    manualInverterSuccess: "已成功保存逆变器模板至数据库！",
    manualPanelSuccess: "已成功保存光伏组件模板至数据库！",
    deleteConfirm: "确定要删除该设备模板吗？",
    noCustomInverters: "暂无自定义逆变器模板。",
    noCustomPanels: "暂无自定义光伏组件模板。",
    saveBtn: "保存模板",
    safetyBufferSection: "3. 配比安全裕度设置 (Safety Buffers)",
    minBufferLabel: "下限启动安全缓冲 (+Min Buffer)",
    minBufferDesc: "在物理最低启动块数基础上增加组件，确保高温暴晒或弱光阴天时稳定启动 (推荐: +1 块)。",
    maxBufferLabel: "上限超压保护裕度 (-Max Buffer)",
    maxBufferDesc: "在物理极限最高块数基础上下调，防止寒冬清晨低温开路电压击穿逆变器 (推荐: -1 块)。",
    warningShort: "警告",
    noBuffer: "无缓冲裕度 (极限)",
    onePanelBuffer: "+1 块组件缓冲 (推荐安全)",
    twoPanelBuffer: "+2 块组件缓冲 (超高稳定性)",
    onePanelMaxBuffer: "-1 块耐压裕度 (推荐防击穿)",
    twoPanelMaxBuffer: "-2 块高寒裕度 (极寒地区防冻)",
    activeBufferTitle: "已生效的设计安全裕度",
    absoluteLimits: "设备硬件绝对极限",
    safeLimits: "推荐安全设计范围",
    exportInverterCsvBtn: "导出逆变器数据库 (CSV)",
    exportPanelCsvBtn: "导出光伏组件数据库 (CSV)",
    invertersImportZone: "逆变器导入与导出",
    panelsImportZone: "光伏组件导入与导出",
    sampleCsvBtn: "复制 CSV 范例模板",
    dropZoneLabel: "拖拽 CSV 文件至此处，或点击浏览选择文件",
    inverterCsvHeaders: "逆变器 CSV 所需表头格式：\nbrand, model, kw, maxDcInputWatt, vmpMin, vmpMax, nominalVoltage, maxDcVoltage, mppt, stringPerMppt, imp, isc",
    panelCsvHeaders: "光伏组件 CSV 所需表头格式：\nname, voc, vmp, watt, imp, isc",
    simpleWiringPanel: "光伏组件",
    simpleWiringInverter: "逆变器直流输入",
    posLead: "组串正极接线 (+)",
    negLead: "组串负极接线 (-)",
    stringVoltage: "组串工作电压 (Vmp)",
    inverterImp: "逆变器最大 MPPT 工作电流 (Imp)",
    inverterIsc: "逆变器最大短路电流耐受 (Isc)",
    panelImp: "组件最大工作电流 (Imp)",
    panelIsc: "组件短路电流 (Isc)",
    tooltipInverterImp: "逆变器 MPPT 跟踪通道所能处理的最大连续工作电流 (Amperes)。",
    tooltipInverterIsc: "逆变器 MPPT 端口能够安全承受的最大短路电流上限 (Amperes)。",
    tooltipPanelImp: "光伏组件在最大功率点时输出的额定电流 (Amperes)。",
    tooltipPanelIsc: "光伏组件在短路状态下输出的极限电流 (Amperes)，用于电流匹配校验。",
    statusHighIsc: "严重危险：组件短路电流 ({panelIsc}A) 超出逆变器允许的最大 Isc 上限 ({inverterIsc}A)！这可能导致逆变器 MPPT 硬件烧毁！",
    statusHighImp: "电流限制削峰：组件工作电流 ({panelImp}A) 超过逆变器 MPPT 最大工作电流 ({inverterImp}A)。逆变器将自动削峰限流工作。",
    themeLight: "浅色模式 (Light)",
    themeDark: "深色模式 (Dark)",
    calcDetailHeader: "计算步骤、物理公式与详细推导",
    calcDetailDesc: "查看基于电气物理原理、逆变器规格阈值以及您选择的安全裕度所推导的完整计算流程。",
    formulaTarget: "1. 最佳额定效率组串目标数量推导 (Nominal Target):",
    formulaMin: "2. 逆变器 MPPT 启动所需绝对最低数量 (Absolute Minimum):",
    formulaMax: "3. 防止逆变器超压击穿绝对最高数量 (Absolute Maximum):",
    formulaSafeRange: "4. 结合安全裕度的推荐配比区间 (Safety Buffered Range):",
    formulaConclusion: "5. 系统配比决策结论:",
    payToUnlock: "提交付款凭证",
    proActive: "PRO 会员已激活",
    viewReceipt: "查看付款凭据",
    pendingReview: "凭据审核中 (Pending)",
    adminPanel: "管理员控制台",
    lockedNotice: "专业光伏计算系统需验证付款凭证。点击提交交易凭据或查看演示。",
    modePresets: "数据库预设",
    modeManual: "手动自定义输入",
    addNewModel: "新增逆变器",
    addNewPanel: "新增太阳能板",
    loadSampleSpecs: "载入标准示例",
    backToPresets: "返回预设列表",
    saveToPresetsList: "保存到预设库",
    applyDirectly: "直接用于计算",
    customInverterTitle: "自定义逆变器规格 (手动录入)",
    customPanelTitle: "自定义太阳能板规格 (手动录入)",
    editingPreset: "正在编辑预设模板"
  }
};

export default function App() {
  // Localization state with persistence
  const [lang, setLang] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('solar_sizer_lang_v2');
    if (saved === 'en' || saved === 'my' || saved === 'zh') return saved;
    return 'my';
  });
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const handleSetLang = (newLang: SupportedLanguage | ((prev: SupportedLanguage) => SupportedLanguage)) => {
    setLang(prev => {
      const nextLang = typeof newLang === 'function' ? newLang(prev) : newLang;
      try {
        localStorage.setItem('solar_sizer_lang_v2', nextLang);
      } catch (e) {}
      return nextLang;
    });
  };

  // Theme state with HTML document sync
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('solar_sizer_theme_v4');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('solar_sizer_theme_v4', nextTheme);
  };

  // Dynamic design tokens for Light/Dark themes with high contrast
  const sBg = theme === 'dark' ? 'bg-[#0b101b] text-slate-100' : 'bg-[#f1f5f9] text-slate-900';
  const sCard = theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-2xl backdrop-blur-md' : 'bg-white border-slate-200/90 text-slate-900 shadow-sm backdrop-blur-md';
  const sSubCard = theme === 'dark' ? 'bg-slate-950/70 border-slate-800/80 text-slate-100' : 'bg-slate-50 border-slate-200/90 text-slate-800';
  const sTextTitle = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const sTextMuted = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
  const sBorder = theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200';
  const sHeader = theme === 'dark' ? 'border-slate-800/90 bg-slate-950/95 shadow-lg' : 'border-slate-200/90 bg-white/95 shadow-sm';
  const sSelect = theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 shadow-sm';
  const sInput = theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 shadow-sm';
  const sTabActive = theme === 'dark' ? 'bg-slate-800 text-amber-400 border-amber-500/50 shadow-inner' : 'bg-amber-500/15 text-amber-900 border-amber-500/50 shadow-inner font-bold';
  const sTabInactive = theme === 'dark' ? 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50' : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/70';

  // High contrast accent tokens for crisp readability in both dark and light modes
  const sAmber = theme === 'dark' ? 'text-amber-400' : 'text-amber-700';
  const sEmerald = theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700';
  const sRose = theme === 'dark' ? 'text-rose-400' : 'text-rose-700';
  const sBlue = theme === 'dark' ? 'text-blue-400' : 'text-blue-700';
  const sIndigo = theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700';

  // Helper to ensure inverters have guaranteed unique IDs across state & rendering
  const ensureUniqueInverterIds = (list: Inverter[]): Inverter[] => {
    const seenIds = new Set<string>();
    return list.map((inv, idx) => {
      let id = inv.id;
      if (!id || seenIds.has(id)) {
        const base = (inv.brand || 'inv').toLowerCase().replace(/[^a-z0-9]/g, '_');
        id = `inv_${base}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      }
      seenIds.add(id);
      return { ...inv, id };
    });
  };

  // Helper to ensure solar panels have guaranteed unique IDs across state & rendering
  const ensureUniquePanelIds = (list: PanelPreset[]): PanelPreset[] => {
    if (!Array.isArray(list)) return [];
    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();
    const result: PanelPreset[] = [];

    list.forEach((p, idx) => {
      if (!p) return;
      // Deduplicate exact duplicate items (same name + watt + voc)
      const sig = `${p.name || ''}_${p.watt || 0}_${p.voc || 0}`.toLowerCase().trim();
      if (seenSignatures.has(sig) && p.id && seenIds.has(p.id)) {
        return; // skip duplicate clone
      }
      seenSignatures.add(sig);

      let id = p.id;
      if (!id || seenIds.has(id)) {
        const base = (p.name || 'panel').toLowerCase().replace(/[^a-z0-9]/g, '_');
        id = `panel_${base}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      }
      seenIds.add(id);
      result.push({ ...p, id });
    });

    return result;
  };

  // Load custom saved inverters from localStorage / defaults
  const [customInverters, setCustomInverters] = useState<Inverter[]>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_custom_inverters_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const isOldDefaultOnly = parsed.some(i => i.id === 'inv_deye_5k_sg04') && !parsed.some(i => i.model?.includes('SUN-6K-SG03') || i.model?.includes('S6EH1P6K'));
          if (!isOldDefaultOnly) {
            const sanitized = ensureUniqueInverterIds(parsed);
            try { localStorage.setItem('solar_sizer_custom_inverters_v3', JSON.stringify(sanitized)); } catch (e) {}
            return sanitized;
          }
        }
      }
      return DEFAULT_INVERTER_DATABASE;
    } catch (e) {
      return DEFAULT_INVERTER_DATABASE;
    }
  });

  // Load custom saved panels from localStorage / defaults
  const [customPanels, setCustomPanels] = useState<PanelPreset[]>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_custom_panels_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If saved only has the old 585W default list and none of the new 5 models, auto-upgrade to DEFAULT_PANEL_PRESETS
          const isOldDefaultOnly = parsed.some(p => p.id === 'panel_jinko_585_tiger_neo' || p.name?.includes('585W')) && !parsed.some(p => p.name?.includes('615W') || p.name?.includes('SharkTopSun'));
          if (!isOldDefaultOnly) {
            const sanitized = ensureUniquePanelIds(parsed);
            try { localStorage.setItem('solar_sizer_custom_panels_v3', JSON.stringify(sanitized)); } catch (e) {}
            return sanitized;
          }
        }
      }
      return DEFAULT_PANEL_PRESETS;
    } catch (e) {
      return DEFAULT_PANEL_PRESETS;
    }
  });

  // Load custom saved batteries from localStorage / defaults
  const [customBatteries, setCustomBatteries] = useState<BatteryPreset[]>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_custom_batteries_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_BATTERY_PRESETS;
  });

  const handleUpdateCustomBatteries = async (batteries: BatteryPreset[]) => {
    setCustomBatteries(batteries);
    try {
      localStorage.setItem('solar_sizer_custom_batteries_v1', JSON.stringify(batteries));
    } catch (e) {}
    await saveCustomBatteriesToCloud(batteries);
  };

  // Active Selection states
  const [selectedInverterId, setSelectedInverterId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_custom_inverters_v3');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list) && list.length > 0) {
          return list[0].id;
        }
      }
    } catch (e) {}
    return 'custom';
  });

  const [selectedPanelId, setSelectedPanelId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_custom_panels_v3');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list) && list.length > 0) {
          const isOldDefaultOnly = list.some((p: any) => p.id === 'panel_jinko_585_tiger_neo' || p.name?.includes('585W')) && !list.some((p: any) => p.name?.includes('615W') || p.name?.includes('SharkTopSun'));
          if (!isOldDefaultOnly) {
            return list[0].id;
          }
        }
      }
    } catch (e) {}
    return DEFAULT_PANEL_PRESETS[0]?.id || 'custom';
  });

  // Custom current manual inverter inputs form state
  const [customInverterData, setCustomInverterData] = useState<Inverter>({
    id: "custom_inv",
    brand: "Custom",
    model: "Sizer-1000",
    kw: 5,
    maxDcInputWatt: 6500,
    vmpMin: 120,
    vmpMax: 450,
    nominalVoltage: 360,
    maxDcVoltage: 500,
    mppt: 2,
    stringPerMppt: 1,
    imp: 13.5,
    isc: 14.5
  });

  // Custom current manual panel inputs form state
  const [customPanelForm, setCustomPanelForm] = useState<PanelPreset>({
    id: "custom_panel",
    name: "Custom Panel",
    voc: 49.5,
    vmp: 41.5,
    watt: 550,
    imp: 13.11,
    isc: 13.94
  });

  // Track the ID of the template being edited (if it's a custom saved one)
  const [editingInverterId, setEditingInverterId] = useState<string | null>(null);
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);

  // Safety buffer states (Defaults: +1 Min, -1 Max)
  const [minBuffer, setMinBuffer] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_min_buffer_v3');
      return saved !== null ? parseInt(saved, 10) || 1 : 1;
    } catch (e) {
      return 1;
    }
  });
  const [maxBuffer, setMaxBuffer] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_max_buffer_v3');
      return saved !== null ? parseInt(saved, 10) || 1 : 1;
    } catch (e) {
      return 1;
    }
  });

  // Sync safety buffers to local storage
  useEffect(() => {
    try {
      localStorage.setItem('solar_sizer_min_buffer_v3', minBuffer.toString());
    } catch (e) {}
  }, [minBuffer]);

  useEffect(() => {
    try {
      localStorage.setItem('solar_sizer_max_buffer_v3', maxBuffer.toString());
    } catch (e) {}
  }, [maxBuffer]);

  // Payment Gatekeeper & Verification States
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(() => {
    const defaultAccounts: PaymentAccountItem[] = [
      {
        id: 'acc_kbzpay_1',
        provider: 'kbzpay',
        payName: 'KBZPay (KPay)',
        accountName: 'U Aung Myo Oo (Solar Tech)',
        accountNumber: '09 798 123 456',
        isActive: true,
        colorTheme: 'blue'
      }
    ];

    const defaultConfig: PaymentConfig = {
      merchantName: "Solar Tech Myanmar",
      merchantPhone: "09 798 123 456",
      amount: 10000,
      currency: "MMK",
      planName: "Solar String Sizer Pro (Lifetime)",
      autoApproveMinutes: 0,
      adminPassword: "Atha2608@",
      accounts: defaultAccounts,
      kbzNumber: "09 798 123 456",
      kbzName: "U Aung Myo Oo (Solar Tech)",
      waveNumber: "",
      waveName: "",
      cbNumber: "",
      cbName: "",
      ayaNumber: "",
      ayaName: ""
    };
    try {
      const saved = localStorage.getItem('solar_sizer_payment_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const configToReturn = { 
            ...defaultConfig, 
            ...parsed,
            accounts: Array.isArray(parsed.accounts) ? parsed.accounts : defaultAccounts
          };
          if (!configToReturn.adminPassword || configToReturn.adminPassword === 'admin123') {
            configToReturn.adminPassword = 'Atha2608@';
          }
          return configToReturn;
        }
      }
    } catch (e) {}
    return defaultConfig;
  });

  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_payment_records_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [currentPaymentRecord, setCurrentPaymentRecord] = useState<PaymentRecord | null>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_current_record_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return null;
  });

  // Admin Contact Information (Viber / Telegram)
  const [adminContact, setAdminContact] = useState<AdminContactConfig>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_admin_contact_v1') || localStorage.getItem('solar_admin_contact_config_v1');
      if (saved) return { ...DEFAULT_ADMIN_CONTACT, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_ADMIN_CONTACT;
  });

  // Active License & License Management
  const [activeLicense, setActiveLicense] = useState<LicenseToken | null>(() => getStoredActiveLicense());
  const [allLicenses, setAllLicenses] = useState<LicenseToken[]>([]);
  const [showLicenseModal, setShowLicenseModal] = useState<boolean>(false);

  const [isPaywallLocked, setIsPaywallLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_paywall_locked_v2');
      return saved !== null ? saved === 'true' : true; // Default locked: requires license
    } catch (e) {
      return true;
    }
  });

  // Paid user status: verified active license, approved payment record, or admin login
  const isLicenseActive = Boolean(
    activeLicense && 
    activeLicense.status === 'active' && 
    new Date(activeLicense.expiresAt).getTime() > Date.now()
  );

  const isLicenseExpired = Boolean(
    activeLicense && 
    (activeLicense.status === 'expired' || new Date(activeLicense.expiresAt).getTime() <= Date.now())
  );

  const isApprovedAndActive = Boolean(
    currentPaymentRecord && 
    currentPaymentRecord.status === 'approved' && 
    !isSubscriptionExpired(currentPaymentRecord)
  );

  const isAdminAuthenticated = Boolean(
    typeof window !== 'undefined' && sessionStorage.getItem('solar_sizer_admin_auth') === 'true'
  );

  // When expired, strictly locked (prompt to buy new key).
  // When locked (default): requires active license or approved payment record.
  // When unlocked by admin: open access unless personally expired.
  const isPaidUser = isAdminAuthenticated || (!isLicenseExpired && (isLicenseActive || isApprovedAndActive || !isPaywallLocked));

  // Auto-detect when active license or subscription expires
  useEffect(() => {
    const checkExpiration = () => {
      if (activeLicense) {
        const isExp = activeLicense.status === 'expired' || new Date(activeLicense.expiresAt).getTime() <= Date.now();
        if (isExp && activeLicense.status === 'active') {
          setActiveLicense(prev => prev ? { ...prev, status: 'expired' } : null);
          saveStoredActiveLicense({ ...activeLicense, status: 'expired' });
          setStatusMsg({
            text: lang === 'my' 
              ? '⚠️ သင့် PRO လိုင်စင် သက်တမ်းကုန်ဆုံးသွားပါပြီ။ ဆက်လက်အသုံးပြုလိုပါက License Key အသစ် ထပ်မံဝယ်ယူပေးပါခင်ဗျာ။' 
              : '⚠️ Your PRO license has expired. Please purchase a new license key to continue.',
            type: 'error'
          });
        }
      } else if (currentPaymentRecord && currentPaymentRecord.status === 'approved') {
        if (isSubscriptionExpired(currentPaymentRecord)) {
          setStatusMsg({
            text: lang === 'my' 
              ? '⚠️ သင့် PRO အသုံးပြုခွင့် သက်တမ်းကုန်ဆုံးသွားပါပြီ။ ဆက်လက်အသုံးပြုလိုပါက သက်တမ်းတိုးနိုင်ပါသည်။' 
              : '⚠️ Your PRO subscription has expired. Please renew to continue accessing premium features.',
            type: 'error'
          });
        }
      }
    };

    const interval = setInterval(checkExpiration, 10000);
    return () => clearInterval(interval);
  }, [activeLicense, currentPaymentRecord, lang]);

  // When custom inverters are loaded from Cloud / Admin, auto-select the first one ONLY IF user is a paid subscriber
  useEffect(() => {
    if (isPaidUser && customInverters.length > 0) {
      setSelectedInverterId(prev => {
        if (prev === 'custom' || !customInverters.some(i => i.id === prev)) {
          return customInverters[0].id;
        }
        return prev;
      });
    } else if (!isPaidUser) {
      setSelectedInverterId('custom');
    }
  }, [customInverters, isPaidUser]);

  // When custom solar panels are loaded from Cloud / Admin, auto-select the first one ONLY IF user is a paid subscriber
  useEffect(() => {
    if (isPaidUser && customPanels.length > 0) {
      setSelectedPanelId(prev => {
        if (prev === 'custom' || !customPanels.some(p => p.id === prev)) {
          return customPanels[0].id;
        }
        return prev;
      });
    } else if (!isPaidUser) {
      setSelectedPanelId('custom');
    }
  }, [customPanels, isPaidUser]);

  // Modal display toggles
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showResourcesModal, setShowResourcesModal] = useState<boolean>(false);
  const [showSpecRequestModal, setShowSpecRequestModal] = useState<boolean>(false);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState<boolean>(false);
  const [showMountingDbModal, setShowMountingDbModal] = useState<boolean>(false);
  const [mountingDatabase, setMountingDatabase] = useState<MountingDatabase>(() => getInitialMountingDatabase());

  // Admin Resource Files State
  const [adminResources, setAdminResources] = useState<AdminResourceFile[]>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_admin_resources_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_ADMIN_RESOURCES;
  });

  // Spec Requests State
  const [specRequests, setSpecRequests] = useState<SpecRequest[]>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_spec_requests_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_SPEC_REQUESTS;
  });

  // App Branding & Custom Logo State (Real-time Synced across all users)
  const [appBranding, setAppBranding] = useState<AppBranding>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_app_branding_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...DEFAULT_APP_BRANDING, ...parsed };
      }
    } catch (e) {}
    return DEFAULT_APP_BRANDING;
  });

  // Active Navigation Tab Menu State
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState<boolean>(false);
  const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>(() => {
    try {
      const saved = localStorage.getItem('solar_sizer_active_nav_tab');
      if (saved === 'mounting_calc' || saved === 'dc_breaker_calc') return saved;
    } catch (e) {}
    return 'string_sizer';
  });

  const handleSelectNavTab = (tab: ActiveNavTab) => {
    setActiveNavTab(tab);
    try {
      localStorage.setItem('solar_sizer_active_nav_tab', tab);
    } catch (e) {}
  };

  // Supabase Configuration State
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const creds = getSupabaseCredentials();
    return {
      url: creds.url,
      anonKey: creds.anonKey,
      isConnected: Boolean(creds.url && creds.anonKey)
    };
  });

  // Initial server & cloud fetch for Payment Config, Site Surveys, Load Calculations, Inverters, Panels, Resources, Payment Records & Realtime Sync
  useEffect(() => {
    let isMounted = true;
    
    // Fast single batch fetch from Express backend server
    fetchAllServerData().then(async allData => {
      if (!isMounted || !allData) return;
      if (allData.inverters && Array.isArray(allData.inverters) && allData.inverters.length > 0) {
        setCustomInverters(allData.inverters);
      } else {
        // Self-heal: If server is empty/fresh after publishing, push local storage to server
        try {
          const localInv = localStorage.getItem('solar_sizer_custom_inverters_v3');
          if (localInv) {
            const parsed = JSON.parse(localInv);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCustomInverters(parsed);
              saveCustomInvertersToCloud(parsed);
            }
          }
        } catch (e) {}
      }

      if (allData.panels && Array.isArray(allData.panels) && allData.panels.length > 0) {
        setCustomPanels(ensureUniquePanelIds(allData.panels));
      } else {
        // Self-heal panels
        try {
          const localPnl = localStorage.getItem('solar_sizer_custom_panels_v3');
          if (localPnl) {
            const parsed = JSON.parse(localPnl);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sanitized = ensureUniquePanelIds(parsed);
              setCustomPanels(sanitized);
              saveCustomPanelsToCloud(sanitized);
            }
          }
        } catch (e) {}
      }

      if (allData.batteries && Array.isArray(allData.batteries) && allData.batteries.length > 0) {
        setCustomBatteries(allData.batteries);
      } else {
        // Self-heal batteries
        try {
          const localBat = localStorage.getItem('solar_sizer_custom_batteries_v1');
          if (localBat) {
            const parsed = JSON.parse(localBat);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCustomBatteries(parsed);
              saveCustomBatteriesToCloud(parsed);
            }
          }
        } catch (e) {}
      }

      if (allData.resources && Array.isArray(allData.resources) && allData.resources.length > 0) {
        setAdminResources(allData.resources);
      }
      if (allData.spec_requests && Array.isArray(allData.spec_requests) && allData.spec_requests.length > 0) {
        setSpecRequests(allData.spec_requests);
      }
      if (allData.mounting_database && typeof allData.mounting_database === 'object' && Array.isArray(allData.mounting_database.panels)) {
        setMountingDatabase(allData.mounting_database);
      }
      if (allData.payment_config && typeof allData.payment_config === 'object' && Array.isArray(allData.payment_config.accounts)) {
        setPaymentConfig(allData.payment_config);
      } else {
        // Self-heal payment config
        try {
          const localPay = localStorage.getItem('solar_sizer_payment_config_v3');
          if (localPay) {
            const parsed = JSON.parse(localPay);
            if (parsed && Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
              setPaymentConfig(parsed);
              savePaymentConfigToCloud(parsed);
            }
          }
        } catch (e) {}
      }

      if (allData.app_branding && typeof allData.app_branding === 'object') {
        setAppBranding(allData.app_branding);
      } else {
        // Self-heal app branding
        try {
          const localBrand = localStorage.getItem('solar_sizer_app_branding_v1');
          if (localBrand) {
            const parsed = JSON.parse(localBrand);
            if (parsed && typeof parsed === 'object') {
              setAppBranding(parsed);
              saveAppBrandingToCloud(parsed);
            }
          }
        } catch (e) {}
      }

      if (allData.payment_records && Array.isArray(allData.payment_records)) {
        setPaymentRecords(allData.payment_records);
        const mySessionId = getMySessionId();
        const matched = allData.payment_records.find(r => 
          (r.sessionId && r.sessionId === mySessionId) ||
          (currentPaymentRecord && r.id === currentPaymentRecord.id) ||
          (currentPaymentRecord && r.transactionDigits === currentPaymentRecord.transactionDigits)
        );
        if (matched) {
          setCurrentPaymentRecord(matched);
          if (matched.status === 'approved') {
            setIsPaywallLocked(false);
            setShowLicenseModal(false);
          }
        }
      }
    }).catch(() => {});

    // Fetch payment config from cloud
    fetchPaymentConfigFromCloud(paymentConfig).then(res => {
      if (isMounted && res && res.config && Array.isArray(res.config.accounts)) {
        setPaymentConfig(res.config);
      }
    }).catch(() => {});

    // Fetch payment records from cloud
    fetchPaymentRecordsFromCloud().then(payRes => {
      if (isMounted && payRes && Array.isArray(payRes.records)) {
        setPaymentRecords(payRes.records);
        const mySessionId = getMySessionId();
        const matched = payRes.records.find(r => 
          (r.sessionId && r.sessionId === mySessionId) ||
          (currentPaymentRecord && r.id === currentPaymentRecord.id) ||
          (currentPaymentRecord && r.transactionDigits === currentPaymentRecord.transactionDigits)
        );
        if (matched) {
          setCurrentPaymentRecord(matched);
          if (matched.status === 'approved') {
            setIsPaywallLocked(false);
            setShowLicenseModal(false);
          }
        }
      }
    }).catch(() => {});

    // Fetch inverters from cloud (so all users have access to admin-uploaded CSV)
    fetchCustomInvertersFromCloud().then(invRes => {
      if (isMounted && invRes && Array.isArray(invRes.inverters) && invRes.inverters.length > 0) {
        setCustomInverters(invRes.inverters);
      }
    }).catch(() => {});

    // Fetch solar panels from cloud (so all users have access to admin-uploaded CSV)
    fetchCustomPanelsFromCloud().then(pnlRes => {
      if (isMounted && pnlRes && Array.isArray(pnlRes.panels) && pnlRes.panels.length > 0) {
        setCustomPanels(ensureUniquePanelIds(pnlRes.panels));
      }
    }).catch(() => {});

    // Fetch batteries from cloud (so all users have access to admin-uploaded database)
    fetchCustomBatteriesFromCloud().then(batRes => {
      if (isMounted && batRes && Array.isArray(batRes.batteries) && batRes.batteries.length > 0) {
        setCustomBatteries(batRes.batteries);
      }
    }).catch(() => {});

    // Fetch admin resource files from cloud (so all users have access to admin-uploaded datasheets, diagrams, guides, etc.)
    fetchAdminResourcesFromCloud().then(resRes => {
      if (isMounted && resRes && Array.isArray(resRes.resources) && resRes.resources.length > 0) {
        setAdminResources(resRes.resources);
      }
    }).catch(() => {});

    // Fetch spec requests from cloud
    fetchSpecRequestsFromCloud().then(specRes => {
      if (isMounted && specRes && Array.isArray(specRes.requests) && specRes.requests.length > 0) {
        setSpecRequests(specRes.requests);
      }
    }).catch(() => {});

    // Fetch app branding & logo from cloud (so all users have the latest admin-set logo instantly)
    fetchAppBrandingFromCloud().then(brandRes => {
      if (isMounted && brandRes && brandRes.branding) {
        setAppBranding(brandRes.branding);
      }
    }).catch(() => {});

    // Fetch mounting database from server / cloud
    fetchMountingDatabaseFromCloud().then(mountRes => {
      if (isMounted && mountRes && mountRes.db && Array.isArray(mountRes.db.panels) && mountRes.db.panels.length > 0) {
        setMountingDatabase(mountRes.db);
      }
    }).catch(() => {});

    // Fetch Admin Contact (Viber / Telegram)
    fetchAdminContactFromCloud().then(contactRes => {
      if (isMounted && contactRes) {
        setAdminContact(contactRes);
      }
    }).catch(() => {});

    // Fetch Licenses
    fetchLicensesFromCloud().then(licRes => {
      if (isMounted && Array.isArray(licRes)) {
        setAllLicenses(licRes);
      }
    }).catch(() => {});

    // Auto-detect ?license=... link in URL for 1-click activation from Viber/Telegram link
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlLicense = searchParams.get('license');
      if (urlLicense && urlLicense.trim()) {
        const cleanToken = urlLicense.trim();
        activateLicenseOnDevice(cleanToken).then(res => {
          if (res.success && res.license) {
            setActiveLicense(res.license);
            setIsPaywallLocked(false);
            setShowLicenseModal(false);
            try {
              appendLicenseRecordToSheet(res.license, window.location.origin).catch(() => {});
            } catch (e) {}
            setStatusMsg({
              text: lang === 'my' 
                ? `🎉 PRO Package အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ! (${res.license.customerName || 'User'})` 
                : `🎉 PRO Package activated successfully!`,
              type: 'success'
            });
            setTimeout(() => setStatusMsg(null), 5000);
          } else {
            setStatusMsg({
              text: res.error || (lang === 'my' ? '⚠️ လိုင်စင်ကုဒ် မှားယွင်းနေပါသည် သို့မဟုတ် စက်အရေအတွက် ပြည့်သွားပါပြီ' : '⚠️ Invalid license or device limit reached'),
              type: 'error'
            });
            setTimeout(() => setStatusMsg(null), 6000);
          }
        });
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('license');
        window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search);
      }
    } catch (e) {}

    // Realtime subscription for live mounting database broadcasts
    const unsubMounting = subscribeToMountingDatabaseUpdates((newDb) => {
      if (isMounted && newDb && Array.isArray(newDb.panels)) {
        setMountingDatabase(newDb);
      }
    });

    // Realtime subscription for cross-tab and cross-device live updates
    const unsubscribe = subscribeToGlobalDatabaseUpdates({
      onAppBrandingUpdate: (updatedBranding) => {
        if (isMounted && updatedBranding) {
          setAppBranding(updatedBranding);
          try {
            localStorage.setItem('solar_sizer_app_branding_v1', JSON.stringify(updatedBranding));
          } catch (e) {}
        }
      },
      onInvertersUpdate: (updatedInverters) => {
        if (isMounted && Array.isArray(updatedInverters)) {
          setCustomInverters(updatedInverters);
          try {
            localStorage.setItem('solar_sizer_custom_inverters_v3', JSON.stringify(updatedInverters));
          } catch (e) {}
        }
      },
      onPanelsUpdate: (updatedPanels) => {
        if (isMounted && Array.isArray(updatedPanels)) {
          const sanitized = ensureUniquePanelIds(updatedPanels);
          setCustomPanels(sanitized);
          try {
            localStorage.setItem('solar_sizer_custom_panels_v3', JSON.stringify(sanitized));
          } catch (e) {}
        }
      },
      onBatteriesUpdate: (updatedBatteries) => {
        if (isMounted && Array.isArray(updatedBatteries)) {
          setCustomBatteries(updatedBatteries);
          try {
            localStorage.setItem('solar_sizer_custom_batteries_v1', JSON.stringify(updatedBatteries));
          } catch (e) {}
        }
      },
      onResourcesUpdate: (updatedResources) => {
        if (isMounted && Array.isArray(updatedResources)) {
          setAdminResources(updatedResources);
          try {
            localStorage.setItem('solar_sizer_admin_resources_v3', JSON.stringify(updatedResources));
          } catch (e) {}
        }
      },
      onSpecRequestsUpdate: (updatedRequests) => {
        if (isMounted && Array.isArray(updatedRequests)) {
          setSpecRequests(updatedRequests);
          try {
            localStorage.setItem('solar_sizer_spec_requests_v3', JSON.stringify(updatedRequests));
          } catch (e) {}
        }
      },
      onPaymentConfigUpdate: (updatedConfig) => {
        if (isMounted && updatedConfig && Array.isArray(updatedConfig.accounts)) {
          setPaymentConfig(updatedConfig);
        }
      },
      onLicensesUpdate: (licenses) => {
        if (isMounted && Array.isArray(licenses)) {
          setAllLicenses(licenses);
          const currentToken = getStoredActiveLicense()?.token;
          if (currentToken) {
            const matched = licenses.find(l => l.token === currentToken);
            if (matched) {
              if (matched.status !== 'active') {
                setActiveLicense(null);
                saveStoredActiveLicense(null);
                setIsPaywallLocked(true);
                setStatusMsg({
                  text: lang === 'my' ? '⚠️ သင့် PRO လိုင်စင်ကို Admin မှ ရုပ်သိမ်းလိုက်ပါသည်' : '⚠️ Your license has been revoked',
                  type: 'error'
                });
                setTimeout(() => setStatusMsg(null), 5000);
              } else {
                setActiveLicense(matched);
                saveStoredActiveLicense(matched);
              }
            }
          }
        }
      },
      onAdminContactUpdate: (contact) => {
        if (isMounted && contact) {
          setAdminContact(contact);
        }
      },
      onSystemPublished: (payload) => {
        if (!isMounted) return;
        if (payload.inverters && Array.isArray(payload.inverters)) setCustomInverters(payload.inverters);
        if (payload.panels && Array.isArray(payload.panels)) setCustomPanels(ensureUniquePanelIds(payload.panels));
        if (payload.batteries && Array.isArray(payload.batteries)) setCustomBatteries(payload.batteries);
        if (payload.mountingDatabase) setMountingDatabase(payload.mountingDatabase);
        if (payload.adminContact) setAdminContact(payload.adminContact);
        setStatusMsg({
          text: lang === 'my' 
            ? '🚀 Admin မှ စနစ်နှင့် ဒေတာများကို တိုက်ရိုက် ထုတ်ဝေလိုက်ပါပြီ! (Live Update Received)' 
            : '🚀 Admin published a live system update!',
          type: 'success'
        });
        setTimeout(() => setStatusMsg(null), 5000);
      },
      onPaymentRecordsUpdate: (updatedRecords) => {
        if (isMounted && Array.isArray(updatedRecords)) {
          setPaymentRecords(updatedRecords);
          try {
            localStorage.setItem('solar_sizer_payment_records_v2', JSON.stringify(updatedRecords));
          } catch (e) {}

          // Check if my payment record is approved by admin!
          setCurrentPaymentRecord(prev => {
            const mySessionId = getMySessionId();
            const matched = updatedRecords.find(r => 
              (prev && r.id === prev.id) || 
              (prev && r.transactionDigits === prev.transactionDigits) ||
              (r.sessionId && r.sessionId === mySessionId)
            );
            if (matched) {
              if (matched.status === 'approved' && (!prev || prev.status !== 'approved')) {
                setIsPaywallLocked(false);
                setStatusMsg({
                  text: lang === 'my' 
                    ? "🎉 Admin မှ ငွေပေးချေမှုကို အတည်ပြုပေးလိုက်ပါပြီ! Paid User အဖြစ် Pro Features နှင့် Admin Data အားလုံး အသုံးပြုနိုင်ပါပြီ။" 
                    : "🎉 Payment verified & approved by Admin! Full Pro access and Admin Database unlocked!",
                  type: 'success'
                });
                setTimeout(() => setStatusMsg(null), 6000);
              }
              return matched;
            }
            return prev;
          });
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      unsubMounting();
    };
  }, []);

  // Sync Payment Config to Cloud whenever updated
  const handleUpdatePaymentConfig = async (newConfig: PaymentConfig) => {
    setPaymentConfig(newConfig);
    try {
      localStorage.setItem('solar_sizer_payment_config_v2', JSON.stringify(newConfig));
    } catch (e) {}
    await savePaymentConfigToCloud(newConfig);
  };

  // Sync App Branding to Cloud & All Connected Users whenever updated by Admin
  const handleUpdateAppBranding = async (newBranding: AppBranding) => {
    setAppBranding(newBranding);
    try {
      localStorage.setItem('solar_sizer_app_branding_v1', JSON.stringify(newBranding));
    } catch (e) {}
    await saveAppBrandingToCloud(newBranding);
  };

  // Realtime Live Presences state - ONLY genuine real active sessions (NO sample/mock data)
  const [activePresences, setActivePresences] = useState<UserPresence[]>(() => {
    const isApproved = currentPaymentRecord?.status === 'approved';
    let isAdminAuth = false;
    try {
      isAdminAuth = sessionStorage.getItem('solar_sizer_admin_auth') === 'true';
    } catch (e) {}

    const role: UserPresence['role'] = isAdminAuth ? 'admin' : (isApproved ? 'paid_user' : 'user');
    const myDevice = getClientDevice();
    const mySessionId = getMySessionId();
    
    const myName = isAdminAuth 
      ? `Solar Admin (${myDevice})` 
      : (isApproved ? (currentPaymentRecord?.customerName ? `${currentPaymentRecord.customerName} (Pro)` : `Pro User (${myDevice})`) : `Solar User (${myDevice})`);

    return [
      {
        id: `pres_${mySessionId}`,
        sessionId: mySessionId,
        role: role,
        name: myName,
        device: myDevice,
        lastActive: new Date().toISOString(),
        startedAt: new Date().toISOString()
      }
    ];
  });

  // Supabase Realtime Presence & Live Multi-Tab Traffic Connection
  useEffect(() => {
    const isApproved = currentPaymentRecord?.status === 'approved';
    let isAdminAuth = false;
    try {
      isAdminAuth = sessionStorage.getItem('solar_sizer_admin_auth') === 'true';
    } catch (e) {}

    const role: UserPresence['role'] = isAdminAuth ? 'admin' : (isApproved ? 'paid_user' : 'user');
    const myDevice = getClientDevice();
    const mySessionId = getMySessionId();

    const myName = isAdminAuth 
      ? `Solar Admin (${myDevice})` 
      : (isApproved ? (currentPaymentRecord?.customerName ? `${currentPaymentRecord.customerName} (Pro)` : `Pro User (${myDevice})`) : `Solar User (${myDevice})`);

    const myPresence: UserPresence = {
      id: `pres_${mySessionId}`,
      sessionId: mySessionId,
      role,
      name: myName,
      device: myDevice,
      lastActive: new Date().toISOString(),
      startedAt: new Date().toISOString()
    };

    // Connect to Realtime Mesh / Supabase Presence Channel
    const unsubPresence = setupRealtimePresence(myPresence, (liveUsers) => {
      if (Array.isArray(liveUsers) && liveUsers.length > 0) {
        setActivePresences(liveUsers);
      }
    });

    return () => {
      unsubPresence();
    };
  }, [currentPaymentRecord, supabaseConfig, showAdminModal]);

  // Sync resources to localStorage safely (stripped of heavy base64 to avoid quota error)
  useEffect(() => {
    try {
      localStorage.setItem('solar_sizer_admin_resources_v3', JSON.stringify(sanitizeResourcesForLocalCache(adminResources)));
    } catch (e) {}
  }, [adminResources]);

  // Sync spec requests to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('solar_sizer_spec_requests_v3', JSON.stringify(specRequests));
    } catch (e) {}
  }, [specRequests]);

  // Sync payments to localStorage
  useEffect(() => {
    localStorage.setItem('solar_sizer_payment_config_v2', JSON.stringify(paymentConfig));
  }, [paymentConfig]);

  useEffect(() => {
    localStorage.setItem('solar_sizer_payment_records_v2', JSON.stringify(paymentRecords));
  }, [paymentRecords]);

  useEffect(() => {
    if (currentPaymentRecord) {
      localStorage.setItem('solar_sizer_current_record_v2', JSON.stringify(currentPaymentRecord));
    } else {
      localStorage.removeItem('solar_sizer_current_record_v2');
    }
  }, [currentPaymentRecord]);

  useEffect(() => {
    localStorage.setItem('solar_sizer_paywall_locked_v2', isPaywallLocked.toString());
  }, [isPaywallLocked]);

  // Admin Resource Handlers
  const handleAddResource = async (resource: Omit<AdminResourceFile, 'id' | 'uploadedAt' | 'downloadsCount'>) => {
    const newRes: AdminResourceFile = {
      ...resource,
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      uploadedAt: new Date().toISOString(),
      downloadsCount: 0
    };
    const updated = [newRes, ...adminResources];
    setAdminResources(updated);
    try {
      localStorage.setItem('solar_sizer_admin_resources_v3', JSON.stringify(updated));
    } catch (e) {}
    const syncRes = await saveAdminResourcesToCloud(updated);
    setStatusMsg({
      text: lang === 'my' 
        ? (syncRes.source === 'cloud' ? "အင်ဂျင်နီယာဖိုင်အသစ် အောင်မြင်စွာ တင်ပြီး အသုံးပြုသူအားလုံးစီသို့ Real-time ဖြန့်ဝေပြီးပါပြီ!" : "အင်ဂျင်နီယာဖိုင်အသစ် သိမ်းဆည်းပြီးပါပြီ!")
        : "Resource file successfully published & synced live to all online users!",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleDeleteResource = async (id: string) => {
    const updated = adminResources.filter(r => r.id !== id);
    setAdminResources(updated);
    try {
      localStorage.setItem('solar_sizer_admin_resources_v3', JSON.stringify(updated));
    } catch (e) {}
    await saveAdminResourcesToCloud(updated);
    setStatusMsg({
      text: lang === 'my' ? "ဖိုင်ကို ဖျက်သိမ်းပြီး Cloud တွင် အဆင့်မြှင့်တင်လိုက်ပါပြီ" : "Resource removed and synced across cloud.",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Spec Request Handlers
  const handleSubmitSpecRequest = async (request: Omit<SpecRequest, 'id' | 'submittedAt' | 'status'>) => {
    const newReq: SpecRequest = {
      ...request,
      id: `spec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    const updated = [newReq, ...specRequests];
    setSpecRequests(updated);
    try {
      localStorage.setItem('solar_sizer_spec_requests_v3', JSON.stringify(updated));
    } catch (e) {}
    await saveSpecRequestsToCloud(updated);
    setStatusMsg({
      text: lang === 'my' ? "Brand / Model တောင်းဆိုချက်ကို Admin ထံ တိုက်ရိုက် ပေးပို့လိုက်ပါပြီ။" : "Spec request sent live to admin!",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleUpdateSpecRequestStatus = async (requestId: string, status: SpecRequest['status'], adminReply?: string) => {
    const updated = specRequests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status,
          adminReply: adminReply !== undefined ? adminReply : r.adminReply,
          repliedAt: adminReply ? new Date().toISOString() : r.repliedAt
        };
      }
      return r;
    });
    setSpecRequests(updated);
    try {
      localStorage.setItem('solar_sizer_spec_requests_v3', JSON.stringify(updated));
    } catch (e) {}
    await saveSpecRequestsToCloud(updated);
    setStatusMsg({
      text: lang === 'my' ? "Spec တောင်းဆိုချက် အခြေအနေနှင့် တုံ့ပြန်ချက် သိမ်းဆည်းပြီးပါပြီ" : "Spec request status & reply updated live!",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleDeleteSpecRequest = async (requestId: string) => {
    const updated = specRequests.filter(r => r.id !== requestId);
    setSpecRequests(updated);
    try {
      localStorage.setItem('solar_sizer_spec_requests_v3', JSON.stringify(updated));
    } catch (e) {}
    await saveSpecRequestsToCloud(updated);
  };

  const handleUpdateSupabaseConfig = (cfg: SupabaseConfig) => {
    setSupabaseConfig(cfg);
    try {
      localStorage.setItem('solar_sizer_supabase_config', JSON.stringify({
        url: cfg.url,
        anonKey: cfg.anonKey
      }));
    } catch (e) {}

    // Persist to Express backend and .env
    fetch('/api/supabase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cfg.url, anonKey: cfg.anonKey })
    }).catch(() => {});

    setStatusMsg({
      text: cfg.isConnected ? "Supabase Cloud Database ချိတ်ဆက်ပြီးပါပြီ!" : "Supabase ဆက်တင် သိမ်းဆည်းပြီးပါပြီ",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Payment Actions
  const handlePaymentSubmit = async (data: Omit<PaymentRecord, 'id' | 'submittedAt' | 'status'>) => {
    const newRecord: PaymentRecord = {
      ...data,
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sessionId: getMySessionId(),
      device: getClientDevice(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    const updated = [newRecord, ...paymentRecords.filter(r => r.id !== newRecord.id)];
    setPaymentRecords(updated);
    setCurrentPaymentRecord(newRecord);
    try {
      localStorage.setItem('solar_sizer_payment_records_v2', JSON.stringify(updated));
      localStorage.setItem('solar_sizer_current_record_v2', JSON.stringify(newRecord));
      localStorage.setItem('solar_sizer_paywall_locked_v2', 'true');
    } catch (e) {}

    await savePaymentRecordsToCloud(updated);

    setStatusMsg({
      text: lang === 'my' ? "ငွေလွှဲပြေစာ ပေးပို့ပြီးပါပြီ။ Admin မှ စိစစ်အတည်ပြုဆဲ ဖြစ်ပါသည်" : "Payment slip submitted. Verifying transaction with Admin...",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleCreateTestPayment = async () => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const testRecord: PaymentRecord = {
      id: `pay_${Date.now()}_test`,
      transactionDigits: randomDigits,
      method: 'KBZPay (KPay)',
      amount: paymentConfig?.amount || 10000,
      currency: 'MMK',
      merchantName: paymentConfig?.merchantName || 'U Aung Myo Oo (Solar Tech)',
      merchantPhone: paymentConfig?.merchantPhone || '09 798 123 456',
      submittedAt: new Date().toISOString(),
      planDuration: '1_month',
      planName: '1 Month Standard Plan',
      status: 'pending',
      customerName: 'Ko Kyaw (Solar Tech Test)',
      customerPhone: '09 450 123 456',
      device: getClientDevice(),
      sessionId: getMySessionId(),
      note: 'Sample test transaction for Google Sheet & Approval testing'
    };

    const updated = [testRecord, ...paymentRecords];
    setPaymentRecords(updated);
    try {
      localStorage.setItem('solar_sizer_payment_records_v2', JSON.stringify(updated));
    } catch (e) {}
    await savePaymentRecordsToCloud(updated);

    setStatusMsg({
      text: lang === 'my' 
        ? `စမ်းသပ်ငွေလွှဲ #${randomDigits} ကို ထည့်သွင်းလိုက်ပါပြီ! "Approve (အတည်ပြုမည်)" နှိပ်၍ စမ်းသပ်ကြည့်နိုင်ပါသည်` 
        : `Sample transaction #${randomDigits} created! Click "Approve" to test Google Sheet auto-sync`,
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleApproveRecord = async (recordId: string) => {
    const now = new Date().toISOString();
    const targetRecord = paymentRecords.find(r => r.id === recordId);
    const planDuration: SubscriptionDuration = targetRecord?.planDuration || '1_month';
    const computedExpiry = targetRecord?.expiresAt || calculateExtendedExpirationDate(
      currentPaymentRecord?.id !== recordId ? currentPaymentRecord?.expiresAt : undefined,
      planDuration
    );

    const updated = paymentRecords.map(r => r.id === recordId ? { 
      ...r, 
      status: 'approved' as PaymentStatus, 
      approvedAt: now,
      expiresAt: r.expiresAt || computedExpiry
    } : r);
    setPaymentRecords(updated);

    const approvedTarget = updated.find(r => r.id === recordId);
    if (currentPaymentRecord && (currentPaymentRecord.id === recordId || currentPaymentRecord.sessionId === targetRecord?.sessionId)) {
      const approvedRec = { 
        ...(approvedTarget || currentPaymentRecord), 
        status: 'approved' as PaymentStatus, 
        approvedAt: now,
        expiresAt: approvedTarget?.expiresAt || computedExpiry
      };
      setCurrentPaymentRecord(approvedRec);
      setIsPaywallLocked(false);
      try {
        localStorage.setItem('solar_sizer_current_record_v2', JSON.stringify(approvedRec));
        localStorage.setItem('solar_sizer_paywall_locked_v2', 'false');
      } catch (e) {}
    } else if (!currentPaymentRecord && targetRecord) {
      const rec = { ...targetRecord, status: 'approved' as PaymentStatus, approvedAt: now, expiresAt: computedExpiry };
      setCurrentPaymentRecord(rec);
      setIsPaywallLocked(false);
      try {
        localStorage.setItem('solar_sizer_current_record_v2', JSON.stringify(rec));
        localStorage.setItem('solar_sizer_paywall_locked_v2', 'false');
      } catch (e) {}
    }

    try {
      localStorage.setItem('solar_sizer_payment_records_v2', JSON.stringify(updated));
    } catch (e) {}

    await savePaymentRecordsToCloud(updated);

    // 🌟 Auto-Sync to Google Sheet (KPay/WavePay Transaction Logging)
    const recToSync: PaymentRecord = (approvedTarget || {
      ...(targetRecord || {}),
      id: recordId,
      status: 'approved' as PaymentStatus,
      approvedAt: now,
      expiresAt: computedExpiry
    }) as PaymentRecord;

    appendPaymentRecordToSheet(recToSync).then(res => {
      if (res.success && res.spreadsheetUrl) {
        setStatusMsg({
          text: lang === 'my' 
            ? `User ၏ ငွေပေးချေမှုကို အတည်ပြုပြီး Google Sheet ထဲတွင် အလိုအလျောက် မှတ်တမ်းတင်ပြီးပါပြီ! (#${recToSync.transactionDigits})` 
            : `Payment approved & logged to Google Sheet (#${recToSync.transactionDigits})!`,
          type: 'success'
        });
      }
    }).catch(err => {
      console.warn('Auto-append to Google Sheet skipped or failed:', err);
    });

    setStatusMsg({
      text: lang === 'my' ? "User ၏ ငွေပေးချေမှုကို အောင်မြင်စွာ အတည်ပြုလိုက်ပါပြီ (Paid User အဖြစ် ပြောင်းလဲသွားပါပြီ)!" : "Payment successfully verified & approved! Paid status active.",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleRejectRecord = async (recordId: string) => {
    const updated = paymentRecords.map(r => r.id === recordId ? { ...r, status: 'rejected' as PaymentStatus } : r);
    setPaymentRecords(updated);
    if (currentPaymentRecord && currentPaymentRecord.id === recordId) {
      const rejectedRec = { ...currentPaymentRecord, status: 'rejected' as PaymentStatus };
      setCurrentPaymentRecord(rejectedRec);
      try {
        localStorage.setItem('solar_sizer_current_record_v2', JSON.stringify(rejectedRec));
      } catch (e) {}
    }
    try {
      localStorage.setItem('solar_sizer_payment_records_v2', JSON.stringify(updated));
    } catch (e) {}

    await savePaymentRecordsToCloud(updated);

    setStatusMsg({
      text: lang === 'my' ? "ငွေလွှဲပြေစာကို ငြင်းပယ်ထားပါသည်" : "Payment slip rejected.",
      type: 'error'
    });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleDeleteRecord = async (recordId: string) => {
    const updated = paymentRecords.filter(r => r.id !== recordId);
    setPaymentRecords(updated);
    if (currentPaymentRecord && currentPaymentRecord.id === recordId) {
      setCurrentPaymentRecord(null);
      try {
        localStorage.removeItem('solar_sizer_current_record_v2');
      } catch (e) {}
    }
    try {
      localStorage.setItem('solar_sizer_payment_records_v2', JSON.stringify(updated));
    } catch (e) {}
    await savePaymentRecordsToCloud(updated);
  };

  const handleAdminApproveCurrent = async () => {
    if (currentPaymentRecord) {
      await handleApproveRecord(currentPaymentRecord.id);
    } else {
      const now = new Date().toISOString();
      const demoRecord: PaymentRecord = {
        id: `pay_demo_${Date.now()}`,
        transactionDigits: "543210",
        method: "kbzpay",
        amount: 25000,
        currency: paymentConfig.currency,
        merchantName: paymentConfig.merchantName,
        merchantPhone: paymentConfig.kbzNumber || paymentConfig.merchantPhone,
        submittedAt: now,
        approvedAt: now,
        status: "approved",
        planDuration: '3_months',
        durationMonths: 3,
        planName: `${paymentConfig.planName} (၃ လ သက်တမ်း)`,
        expiresAt: calculateExtendedExpirationDate(undefined, '3_months'),
        sessionId: getMySessionId(),
        device: getClientDevice()
      };
      const updated = [demoRecord, ...paymentRecords];
      setPaymentRecords(updated);
      setCurrentPaymentRecord(demoRecord);
      setIsPaywallLocked(false);
      try {
        localStorage.setItem('solar_sizer_payment_records_v2', JSON.stringify(updated));
        localStorage.setItem('solar_sizer_current_record_v2', JSON.stringify(demoRecord));
        localStorage.setItem('solar_sizer_paywall_locked_v2', 'false');
      } catch (e) {}
      await savePaymentRecordsToCloud(updated);
      setStatusMsg({
        text: lang === 'my' ? "၃ လ သက်တမ်း စမ်းသပ်မှု အတည်ပြုပြီး App အား ဖွင့်ပေးလိုက်ပါပြီ!" : "3-Month Demo approved & App unlocked!",
        type: 'success'
      });
      setTimeout(() => setStatusMsg(null), 5000);
    }
    setShowLicenseModal(false);
  };

  const handleResetPayment = () => {
    setCurrentPaymentRecord(null);
    setIsPaywallLocked(true);
    setShowLicenseModal(true);
    try {
      localStorage.removeItem('solar_sizer_current_record_v2');
      localStorage.setItem('solar_sizer_paywall_locked_v2', 'true');
    } catch (e) {}
  };

  const handleResetAllPayments = async () => {
    setPaymentRecords([]);
    setCurrentPaymentRecord(null);
    setIsPaywallLocked(true);
    try {
      localStorage.removeItem('solar_sizer_payment_records_v2');
      localStorage.removeItem('solar_sizer_current_record_v2');
      localStorage.setItem('solar_sizer_paywall_locked_v2', 'true');
    } catch (e) {}
    await savePaymentRecordsToCloud([]);
    setStatusMsg({
      text: lang === 'my' ? "ငွေလွှဲမှတ်တမ်းများ အားလုံး ရှင်းလင်းပြီးပါပြီ" : "All transaction records reset",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // License Activation & Management Handlers
  const handleActivateLicense = async (token: string): Promise<{ success: boolean; message?: string }> => {
    const res = await activateLicenseOnDevice(token);
    if (res.success && res.license) {
      setActiveLicense(res.license);
      setIsPaywallLocked(false);
      try {
        appendLicenseRecordToSheet(res.license, window.location.origin).catch(() => {});
      } catch (e) {}
      setStatusMsg({
        text: lang === 'my' 
          ? `🎉 PRO Package အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ! (${res.license.duration})` 
          : `🎉 PRO Package activated successfully!`,
        type: 'success'
      });
      setTimeout(() => setStatusMsg(null), 5000);
      return { success: true };
    }
    return { success: false, message: res.error || 'Activation failed' };
  };

  const handleDeactivateLicense = () => {
    setActiveLicense(null);
    saveStoredActiveLicense(null);
    setIsPaywallLocked(true);
    setStatusMsg({
      text: lang === 'my' ? 'လိုင်စင် အသုံးပြုခွင့်ကို ပိတ်သိမ်းလိုက်ပါပြီ' : 'License deactivated',
      type: 'info'
    });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleGenerateLicense = async (params: { 
    customerName: string; 
    duration: LicenseToken['duration']; 
    deviceLimit: 1 | 2; 
    note?: string 
  }) => {
    const res = await generateLicenseOnServer(params);
    if (res.success && res.license) {
      setAllLicenses(prev => [res.license!, ...prev.filter(l => l.id !== res.license!.id)]);
    }
    return res;
  };

  const handleUnbindLicenseDevice = async (licenseId: string, deviceId?: string) => {
    await unbindLicenseDevice(licenseId, deviceId);
    const updated = await fetchLicensesFromCloud();
    setAllLicenses(updated);
  };

  const handleExtendLicense = async (licenseId: string, days: number) => {
    await extendLicenseDuration(licenseId, days);
    const updated = await fetchLicensesFromCloud();
    setAllLicenses(updated);
  };

  const handleUpdateLicenseStatus = async (licenseId: string, status: LicenseToken['status']) => {
    await updateLicenseStatus(licenseId, status);
    const updated = await fetchLicensesFromCloud();
    setAllLicenses(updated);
  };

  const handleDeleteLicense = async (licenseId: string) => {
    await deleteLicenseFromCloud(licenseId);
    setAllLicenses(prev => prev.filter(l => l.id !== licenseId));
  };

  const handleUpdateAdminContact = async (newContact: AdminContactConfig) => {
    setAdminContact(newContact);
    try {
      localStorage.setItem('solar_sizer_admin_contact_v1', JSON.stringify(newContact));
      localStorage.setItem('solar_admin_contact_config_v1', JSON.stringify(newContact));
    } catch (e) {}
    await saveAdminContactToCloud(newContact);
  };

  const handlePublishLiveUpdate = async (note?: string) => {
    const res = await publishLiveSystemUpdate(note);
    return res;
  };

  const handleRefreshLicenses = async () => {
    const updated = await fetchLicensesFromCloud();
    setAllLicenses(updated);
  };

  // Collapsible state for step-by-step formula block
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(true);

  // Custom stored items for inverters (default ones are removed)
  const allInverters = customInverters;
  const allPanels = customPanels;

  // Current Active Inverter Specifications
  const getActiveInverter = (): Inverter => {
    if (!isPaidUser || selectedInverterId === 'custom') {
      return customInverterData;
    }
    const found = allInverters.find(inv => inv.id === selectedInverterId);
    return found || allInverters[0] || customInverterData;
  };

  const activeInverter = getActiveInverter();

  // Current Active Solar Panel Specifications
  const getActivePanel = (): PanelPreset => {
    if (!isPaidUser || selectedPanelId === 'custom') {
      return customPanelForm;
    }
    const found = allPanels.find(p => p.id === selectedPanelId);
    return found || allPanels[0] || customPanelForm;
  };

  const panel = getActivePanel();

  // Calculations states
  const [maxPv, setMaxPv] = useState(0);
  const [minPv, setMinPv] = useState(0);
  const [recommendPv, setRecommendPv] = useState(0);
  const [maxWattPanels, setMaxWattPanels] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Trigger calculations
  const runCalculation = () => {
    const { voc, vmp, watt } = panel;

    if (voc <= 0 || vmp <= 0) {
      setErrorText(TRANSLATIONS[lang].fillVocVmp);
      setMaxPv(0);
      setMinPv(0);
      setRecommendPv(0);
      setMaxWattPanels(0);
      return;
    }

    if (voc <= vmp) {
      setErrorText(TRANSLATIONS[lang].vocHigherVmp);
      setMaxPv(0);
      setMinPv(0);
      setRecommendPv(0);
      setMaxWattPanels(0);
      return;
    }

    setErrorText(null);

    // Absolute Max PV based on Voltage limit: Inverter MPPT Vmp Max divided by Panel Vmp (Floored to be safe)
    const calcMax = vmp > 0 ? Math.floor(activeInverter.vmpMax / vmp) : 0;
    setMaxPv(calcMax > 0 ? calcMax : 0);

    // Absolute Min PV based on Voltage: Inverter Min MPPT Vmp divided by Panel Vmp (Ceiled to reach threshold)
    const calcMin = vmp > 0 ? Math.ceil(activeInverter.vmpMin / vmp) : 0;
    setMinPv(calcMin > 0 ? calcMin : 0);

    // Recommended PV: Target Inverter Nominal voltage, then clamp strictly within buffered bounds!
    let calcRec = Math.round(activeInverter.nominalVoltage / vmp);
    
    // Buffered safety limits calculations
    const prefMin = calcMin + minBuffer; // Add extra min panels (e.g. +1)
    const prefMax = calcMax - maxBuffer; // Keep offset below absolute maximum (e.g. -1)
    
    // Sizing design clamping inside preferred safety boundaries
    if (calcRec < prefMin) calcRec = prefMin;
    if (calcRec > prefMax) calcRec = prefMax;
    
    // Double sanity-check clamp against physical absolute limits
    if (calcRec > calcMax) calcRec = calcMax;
    if (calcRec < calcMin) calcRec = calcMin;
    
    setRecommendPv(calcRec > 0 ? calcRec : 0);

    // Max number of panels based on Inverter Max Input DC Power (maxDcInputWatt / panel.watt)
    if (watt > 0 && activeInverter.maxDcInputWatt > 0) {
      const calcMaxWattPanels = Math.floor(activeInverter.maxDcInputWatt / watt);
      setMaxWattPanels(calcMaxWattPanels > 0 ? calcMaxWattPanels : 0);
    } else {
      setMaxWattPanels(0);
    }
  };

  // Recalculate whenever inputs, template changes or offsets change
  useEffect(() => {
    runCalculation();
  }, [selectedInverterId, customInverterData, selectedPanelId, customPanelForm, minBuffer, maxBuffer, lang]);

  // Helper to extract numeric current value (Amperes) from formats like "18+18", "26+13", "20*10", or 18
  const parseCurrentValue = (val: string | number | undefined, defaultVal: number = 13.5): number => {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    const str = String(val).trim();
    if (!str) return defaultVal;

    if (str.includes('*')) {
      const parts = str.split('*').map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
      if (parts.length > 0) return parts[0];
    }

    if (str.includes('+')) {
      const parts = str.split('+').map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
      if (parts.length > 0) return Math.max(...parts);
    }

    const num = parseFloat(str);
    return isNaN(num) ? defaultVal : num;
  };

  // Dynamic Safety status analyzer taking safety buffer offsets and current matching into account
  const analyzeSafety = () => {
    if (recommendPv === 0) return { status: 'none', message: '', title: '', color: 'gray' };

    const pIsc = panel.isc || 13.94;
    const pImp = panel.imp || 13.11;
    const invIscNum = parseCurrentValue(activeInverter.isc, 14.5);
    const invImpNum = parseCurrentValue(activeInverter.imp, 13.5);

    // 1. Check severe Short Circuit Current (Isc) Overload Danger
    if (pIsc > invIscNum) {
      return {
        status: 'danger',
        title: t.statusTitleDanger,
        message: t.statusHighIsc.replace('{panelIsc}', pIsc.toString()).replace('{inverterIsc}', String(activeInverter.isc || 14.5)),
        color: 'rose'
      };
    }

    const recVocTotal = recommendPv * panel.voc;
    const recVmpTotal = recommendPv * panel.vmp;

    // Safety factor: Cold weather open circuit voltage simulation (+8% voltage swell)
    const coldWeatherVoc = recVocTotal * 1.08; 

    // 2. Check Over-voltage Violation Danger
    if (coldWeatherVoc >= activeInverter.maxDcVoltage) {
      return {
        status: 'danger',
        title: t.statusTitleDanger,
        message: t.statusHighVoc,
        color: 'rose'
      };
    }

    // 3. Check Operating Current Clipping Warning
    if (pImp > invImpNum) {
      return {
        status: 'warning',
        title: t.statusTitleWarning,
        message: t.statusHighImp.replace('{panelImp}', pImp.toString()).replace('{inverterImp}', String(activeInverter.imp || 13.5)),
        color: 'amber'
      };
    }

    // 4. Check Warm summer operating voltage simulation (-10% voltage drop)
    if (recVmpTotal * 0.9 <= activeInverter.vmpMin) {
      return {
        status: 'warning',
        title: t.statusTitleWarning,
        message: t.statusLowVmp,
        color: 'amber'
      };
    }

    // 5. System Design Safe
    return {
      status: 'safe',
      title: t.statusTitleSafe,
      message: t.statusSafe,
      color: 'emerald'
    };
  };

  const safetyInfo = analyzeSafety();

  // Helper to handle custom inverter form values
  const handleCustomInverterChange = (key: keyof Inverter, val: string) => {
    if (key === 'stringPerMppt' || key === 'imp' || key === 'isc' || key === 'brand' || key === 'model' || key === 'id') {
      setCustomInverterData(prev => ({
        ...prev,
        [key]: val
      }));
      return;
    }
    const num = parseFloat(val);
    setCustomInverterData(prev => ({
      ...prev,
      [key]: isNaN(num) ? val : num
    }));
  };

  // Helper to handle custom panel form values
  const handleCustomPanelFormChange = (key: keyof PanelPreset, val: string) => {
    const num = parseFloat(val);
    setCustomPanelForm(prev => ({
      ...prev,
      [key]: isNaN(num) ? val : num
    }));
  };

  // Helper to edit inverter specifications
  const handleEditInverterSpec = (inv: Inverter) => {
    setCustomInverterData({
      ...inv,
      id: "custom_inv"
    });
    const isCustom = customInverters.some(ci => ci.id === inv.id);
    if (isCustom) {
      setEditingInverterId(inv.id);
    } else {
      setEditingInverterId(null);
    }
    setSelectedInverterId('custom');
  };

  // Helper to edit panel specifications
  const handleEditPanelSpec = (p: PanelPreset) => {
    setCustomPanelForm({
      ...p,
      id: "custom_panel"
    });
    const isCustom = customPanels.some(cp => cp.id === p.id);
    if (isCustom) {
      setEditingPanelId(p.id);
    } else {
      setEditingPanelId(null);
    }
    setSelectedPanelId('custom');
  };

  // Helper to add new blank inverter
  const handleAddNewInverter = () => {
    setEditingInverterId(null);
    setCustomInverterData({
      id: "custom_inv",
      brand: "",
      model: "",
      kw: 6,
      maxDcInputWatt: 8000,
      vmpMin: 120,
      vmpMax: 500,
      nominalVoltage: 360,
      maxDcVoltage: 550,
      mppt: 2,
      stringPerMppt: 1,
      imp: 15,
      isc: 16
    });
    setSelectedInverterId('custom');
  };

  // Helper to load sample inverter specs
  const handleLoadSampleInverter = () => {
    setCustomInverterData({
      id: "custom_inv",
      brand: "Custom",
      model: "Sample 6kW Hybrid",
      kw: 6,
      maxDcInputWatt: 8000,
      vmpMin: 120,
      vmpMax: 500,
      nominalVoltage: 360,
      maxDcVoltage: 550,
      mppt: 2,
      stringPerMppt: 1,
      imp: 15,
      isc: 16
    });
    setSelectedInverterId('custom');
    setStatusMsg({
      text: lang === 'my' ? "နမူနာ 6kW အင်ဗာတာ အချက်အလက်များ ဖြည့်သွင်းပြီးပါပြီ" : "Sample 6kW Inverter specifications loaded",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Helper to add new blank panel
  const handleAddNewPanel = () => {
    setEditingPanelId(null);
    setCustomPanelForm({
      id: "custom_panel",
      name: "",
      voc: 50.4,
      vmp: 42.1,
      watt: 580,
      imp: 13.78,
      isc: 14.65
    });
    setSelectedPanelId('custom');
  };

  // Helper to load sample panel specs
  const handleLoadSamplePanel = () => {
    setCustomPanelForm({
      id: "custom_panel",
      name: "Custom 585W N-Type TOPCon",
      voc: 51.2,
      vmp: 42.8,
      watt: 585,
      imp: 13.67,
      isc: 14.52
    });
    setSelectedPanelId('custom');
    setStatusMsg({
      text: lang === 'my' ? "နမူနာ 585W TOPCon ဆိုလာပြား အချက်အလက်များ ဖြည့်သွင်းပြီးပါပြီ" : "Sample 585W TOPCon panel specifications loaded",
      type: 'success'
    });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // CSV Import parser helper for Inverters
  const fileInputInverterRef = useRef<HTMLInputElement>(null);
  const fileInputPanelRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Quote-aware CSV line splitter supporting dynamic delimiters
  const splitCsvLine = (line: string, delimiter: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map(v => v.trim().replace(/^"|"$/g, ''));
  };

  const handleInverterCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawImportedList = await parseInvertersFile(file);
      if (rawImportedList.length === 0) throw new Error("No valid rows parsed");
      const importedList = ensureUniqueInverterIds(rawImportedList);

      // Overwrite existing custom inverters completely and push to Cloud
      setCustomInverters(importedList);
      try {
        localStorage.setItem('solar_sizer_custom_inverters_v3', JSON.stringify(importedList));
      } catch (e) {}
      await saveCustomInvertersToCloud(importedList);

      if (importedList.length > 0) {
        setSelectedInverterId(importedList[0].id); // Auto-select the first imported inverter
      }

      setStatusMsg({ 
        text: lang === 'my' ? `အရင် data များကို ရှင်းလင်းပြီး အင်ဗာတာအသစ် ${importedList.length} ခု (Excel / CSV မှ) Cloud နှင့် စက်ထဲ အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ!` : `Replaced existing database with ${importedList.length} new inverters (Synced to Cloud)!`, 
        type: 'success' 
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ 
        text: lang === 'my' ? `ဖိုင်ဖတ်ရှုရာတွင် အမှားဖြစ်နေပါသည်: ${err?.message || 'Invalid format'}` : `Error parsing file: ${err?.message || 'Invalid format'}`, 
        type: 'error' 
      });
      setTimeout(() => setStatusMsg(null), 5000);
    }
    if (fileInputInverterRef.current) fileInputInverterRef.current.value = '';
  };

  // Excel & CSV Import parser helper for Solar Panels
  const handlePanelCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawImportedList = await parseSolarPanelsFile(file);
      if (rawImportedList.length === 0) throw new Error("No valid panels parsed");
      const importedList = ensureUniquePanelIds(rawImportedList);

      // Overwrite existing custom panels completely and push to Cloud
      setCustomPanels(importedList);
      try {
        localStorage.setItem('solar_sizer_custom_panels_v3', JSON.stringify(importedList));
      } catch (e) {}
      await saveCustomPanelsToCloud(importedList);

      if (importedList.length > 0) {
        setSelectedPanelId(importedList[0].id); // Auto-select the first imported panel
      }

      setStatusMsg({ 
        text: lang === 'my' ? `အရင် data များကို ရှင်းလင်းပြီး ဆိုလာပြားအသစ် ${importedList.length} ခု (Excel / CSV မှ Watt အချက်အလက်များအပါအဝင်) Cloud နှင့် စက်ထဲ အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ!` : `Replaced existing database with ${importedList.length} new panels with verified Watts (Synced to Cloud)!`, 
        type: 'success' 
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ 
        text: lang === 'my' ? `ဖိုင်ဖတ်ရှုရာတွင် အမှားဖြစ်နေပါသည်: ${err?.message || 'Invalid format'}` : `Error parsing file: ${err?.message || 'Invalid format'}`, 
        type: 'error' 
      });
      setTimeout(() => setStatusMsg(null), 5000);
    }
    if (fileInputPanelRef.current) fileInputPanelRef.current.value = '';
  };

  // Save manual custom inverter form to Persistent Templates
  const handleSaveManualInverter = async () => {
    if (!isPaidUser) {
      setShowLicenseModal(true);
      setStatusMsg({
        text: lang === 'my' ? "စိတ်ကြိုက် Inverter Presets များကို ဒေတာဘေ့စ်တွင် သိမ်းဆည်းရန် PRO အကောင့် လိုအပ်ပါသည်" : "Saving Custom Inverters to preset library requires PRO account",
        type: 'error'
      });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    let finalInverterData = { ...customInverterData };
    if (typeof finalInverterData.nominalVoltage === 'number' && typeof finalInverterData.maxDcVoltage === 'number') {
      if (finalInverterData.nominalVoltage > finalInverterData.maxDcVoltage) {
        const temp = finalInverterData.nominalVoltage;
        finalInverterData.nominalVoltage = finalInverterData.maxDcVoltage;
        finalInverterData.maxDcVoltage = temp;
        setCustomInverterData(finalInverterData);
      }
    }

    const existingIndex = editingInverterId 
      ? customInverters.findIndex(inv => inv.id === editingInverterId)
      : customInverters.findIndex(inv => 
          inv.brand.trim().toLowerCase() === finalInverterData.brand.trim().toLowerCase() &&
          inv.model.trim().toLowerCase() === finalInverterData.model.trim().toLowerCase()
        );

    let newList: Inverter[];
    let targetId: string;

    if (existingIndex !== -1) {
      // Overwrite/Replace existing
      targetId = customInverters[existingIndex].id;
      newList = [...customInverters];
      newList[existingIndex] = {
        ...finalInverterData,
        id: targetId
      };
    } else {
      // Create a new one
      targetId = `custom_save_inv_${Date.now()}`;
      newList = [...customInverters, {
        ...finalInverterData,
        id: targetId
      }];
    }

    setCustomInverters(newList);
    try {
      localStorage.setItem('solar_sizer_custom_inverters_v3', JSON.stringify(newList));
    } catch (e) {}
    await saveCustomInvertersToCloud(newList);
    setSelectedInverterId(targetId);
    setEditingInverterId(null);
    setStatusMsg({ text: t.manualInverterSuccess, type: 'success' });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Save manual custom panel form to Persistent Templates
  const handleSaveManualPanel = async () => {
    if (!isPaidUser) {
      setShowLicenseModal(true);
      setStatusMsg({
        text: lang === 'my' ? "စိတ်ကြိုက် ဆိုလာပြား Presets များကို ဒေတာဘေ့စ်တွင် သိမ်းဆည်းရန် PRO အကောင့် လိုအပ်ပါသည်" : "Saving Custom Solar Panels to preset library requires PRO account",
        type: 'error'
      });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    const existingIndex = editingPanelId
      ? customPanels.findIndex(p => p.id === editingPanelId)
      : customPanels.findIndex(p => 
          p.name.trim().toLowerCase() === customPanelForm.name.trim().toLowerCase()
        );

    let newList: PanelPreset[];
    let targetId: string;

    if (existingIndex !== -1) {
      // Overwrite/Replace existing
      targetId = customPanels[existingIndex].id;
      newList = [...customPanels];
      newList[existingIndex] = {
        ...customPanelForm,
        id: targetId
      };
    } else {
      // Create a new one
      targetId = `custom_save_panel_${Date.now()}`;
      newList = [...customPanels, {
        ...customPanelForm,
        id: targetId
      }];
    }

    setCustomPanels(newList);
    try {
      localStorage.setItem('solar_sizer_custom_panels_v3', JSON.stringify(newList));
    } catch (e) {}
    await saveCustomPanelsToCloud(newList);
    setSelectedPanelId(targetId);
    setEditingPanelId(null);
    setStatusMsg({ text: t.manualPanelSuccess, type: 'success' });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Delete custom inverter template
  const handleDeleteCustomInverter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(t.deleteConfirm) : true;
      if (confirmed) {
        const newList = customInverters.filter(inv => inv.id !== id);
        setCustomInverters(newList);
        try {
          localStorage.setItem('solar_sizer_custom_inverters_v3', JSON.stringify(newList));
        } catch (err) {}
        await saveCustomInvertersToCloud(newList);
        if (selectedInverterId === id) {
          if (newList.length > 0) {
            setSelectedInverterId(newList[0].id);
          } else {
            setSelectedInverterId('custom'); // fallback to custom form
          }
        }
      }
    } catch (err) {}
  };

  // Delete custom panel template
  const handleDeleteCustomPanel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(t.deleteConfirm) : true;
      if (confirmed) {
        const newList = customPanels.filter(p => p.id !== id);
        setCustomPanels(newList);
        try {
          localStorage.setItem('solar_sizer_custom_panels_v3', JSON.stringify(newList));
        } catch (err) {}
        await saveCustomPanelsToCloud(newList);
        if (selectedPanelId === id) {
          if (newList.length > 0) {
            setSelectedPanelId(newList[0].id);
          } else {
            setSelectedPanelId('custom'); // fallback to custom form
          }
        }
      }
    } catch (err) {}
  };

  // Dedicated handlers for AdminPanelModal callbacks that also update cloud
  const handleUpdateCustomInverters = async (inverters: Inverter[]) => {
    setCustomInverters(inverters);
    try {
      localStorage.setItem('solar_sizer_custom_inverters_v3', JSON.stringify(inverters));
    } catch (e) {}
    await saveCustomInvertersToCloud(inverters);
  };

  const handleUpdateCustomPanels = async (panels: PanelPreset[]) => {
    const sanitized = ensureUniquePanelIds(panels);
    setCustomPanels(sanitized);
    try {
      localStorage.setItem('solar_sizer_custom_panels_v3', JSON.stringify(sanitized));
    } catch (e) {}
    await saveCustomPanelsToCloud(sanitized);
  };

  // Export/Download current list of inverters to CSV file
  const handleExportInvertersCsv = () => {
    try {
      const headers = "brand,model,kw,maxDcInputWatt,vmpMin,vmpMax,nominalVoltage,maxDcVoltage,mppt,stringPerMppt,imp,isc\n";
      const rows = allInverters.map(inv => 
        `"${inv.brand}","${inv.model}",${inv.kw},${inv.maxDcInputWatt},${inv.vmpMin},${inv.vmpMax},${inv.nominalVoltage},${inv.maxDcVoltage},${inv.mppt},"${inv.stringPerMppt}","${inv.imp || 13.5}","${inv.isc || 14.5}"`
      ).join("\n");

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `solar_inverter_database_${lang}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {}
  };

  // Export/Download current list of panels to CSV file
  const handleExportPanelsCsv = () => {
    try {
      const headers = "name,voc,vmp,watt,imp,isc\n";
      const rows = allPanels.map(p => 
        `"${p.name}",${p.voc},${p.vmp},${p.watt},${p.imp || 13.11},${p.isc || 13.94}`
      ).join("\n");

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `solar_panel_database_${lang}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {}
  };

  // Quick Copy Sample data
  const sampleInverterCsvText = `brand,model,kw,maxDcInputWatt,vmpMin,vmpMax,nominalVoltage,maxDcVoltage,mppt,stringPerMppt,imp,isc
Deye,SUN-5K-SG03LP1,5,6500,120,430,360,500,2,1+1,18+18,27+27
Growatt,MOD-10KTL3-X,10,13000,140,1000,580,1100,2,2+2,26+26,34+34
Solis,S5-GR3P15K,15,19500,160,1000,600,1100,2,2+2,32+32,40+40`;

  const samplePanelCsvText = `name,voc,vmp,watt,imp,isc
Jinko Tiger Pro 550W,49.62,41.96,550,13.11,13.94
Longi Hi-MO 6 440W,52.06,43.6,440,10.09,10.74
Trina Vertex S+ 430W,51.4,43.2,430,9.96,10.59`;

  const [copiedInverter, setCopiedInverter] = useState(false);
  const [copiedPanel, setCopiedPanel] = useState(false);

  const copySampleInverterCsv = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(sampleInverterCsvText).catch(() => {});
      }
    } catch (err) {}
    setCopiedInverter(true);
    setTimeout(() => setCopiedInverter(false), 2000);
  };

  const copySamplePanelCsv = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(samplePanelCsvText).catch(() => {});
      }
    } catch (err) {}
    setCopiedPanel(true);
    setTimeout(() => setCopiedPanel(false), 2000);
  };

  return (
    <div className={`min-h-screen ${theme} ${sBg} flex font-sans antialiased selection:bg-blue-500/30 selection:text-blue-200 transition-colors duration-300 relative`}>
      
      {/* Background Solar Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      {theme === 'dark' && <div className="fixed bottom-10 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />}

      {/* Left Sidebar Navigation Component matching reference UI */}
      <SidebarNavigation
        activeTab={activeNavTab}
        onSelectTab={(tab) => handleSelectNavTab(tab)}
        onOpenDocuments={() => setShowResourcesModal(true)}
        onOpenSpecRequests={() => setShowSpecRequestModal(true)}
        onOpenPayment={() => setShowLicenseModal(true)}
        onOpenSettings={() => setShowAdminModal(true)}
        onOpenActiveUsers={() => setShowActiveUsersModal(true)}
        onOpenMountingDb={() => setShowMountingDbModal(true)}
        lang={lang}
        setLang={handleSetLang}
        theme={theme}
        toggleTheme={toggleTheme}
        currentPaymentRecord={currentPaymentRecord}
        activeLicense={activeLicense}
        adminContact={adminContact}
        activePresences={activePresences}
        resourceCount={adminResources.length}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
        appBranding={appBranding}
      />

      {/* Right Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Header Bar */}
        <header className={`border-b ${sHeader} backdrop-blur-md sticky top-0 z-20 transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
            {/* Left: Mobile Drawer Trigger + Active Tab & Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
              <button
                onClick={() => setIsOpenMobileSidebar(true)}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white lg:hidden cursor-pointer border border-slate-700/60 transition-all shrink-0 active:scale-95"
                aria-label="Open Sidebar Menu"
                id="open-mobile-sidebar-btn"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`text-[9px] sm:text-xs uppercase font-mono font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${
                    activeNavTab === 'dc_breaker_calc'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      : activeNavTab === 'ground_mount_calc'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : activeNavTab === 'mounting_calc'
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  }`}>
                    {activeNavTab === 'dc_breaker_calc' ? 'DC PROTECTION CALC' : activeNavTab === 'ground_mount_calc' ? 'GROUND MOUNT 3D' : activeNavTab === 'mounting_calc' ? 'MOUNTING CALC' : 'STRING SIZER'}
                  </span>
                  <span className="hidden md:inline text-xs text-slate-400 font-mono">v3.2 PRO</span>
                </div>
                <h1 className={`text-xs sm:text-base lg:text-lg font-bold tracking-tight ${sTextTitle} truncate`}>
                  {activeNavTab === 'dc_breaker_calc'
                    ? (lang === 'my' ? 'Solar DC Breaker & အကာအကွယ် စနစ် တွက်ချက်စက် (Fuse, MCB, Isolator, SPD)' : lang === 'zh' ? 'Solar DC Breaker & Protection Calculator' : 'Solar DC Breaker & Protection Calculator')
                    : activeNavTab === 'ground_mount_calc'
                    ? (lang === 'my' ? 'Solar Mounting Calculator Ground Mount (3D ပုံစံ)' : lang === 'zh' ? 'Solar Mounting Calculator Ground Mount (3D)' : 'Solar Mounting Calculator Ground Mount')
                    : activeNavTab === 'mounting_calc' 
                    ? (lang === 'my' ? 'Solar Mounting Calculator (ခေါင်မိုး/အမိုး တပ်ဆင်ရေး)' : lang === 'zh' ? 'Solar Mounting Calculator (屋顶支架与BOQ)' : 'Solar Mounting Calculator (Roof Mount)')
                    : t.title}
                </h1>
              </div>
            </div>

            {/* Right: Actions & Status Controls */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Live Active Users Indicator Button */}
              <button
                onClick={() => setShowActiveUsersModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm group shrink-0"
                title={lang === 'my' ? 'လက်ရှိ အသုံးပြုနေသူများ အသေးစိတ်ကြည့်ရန်' : lang === 'zh' ? '查看当前在线用户与设备' : 'Live Active Users & Connected Devices'}
                id="header-active-users-btn"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden md:inline text-slate-300 group-hover:text-white transition-colors">
                  {lang === 'my' ? 'သုံးနေသူ' : lang === 'zh' ? '在线' : 'Online'}
                </span>
                <span className="font-mono font-black text-emerald-400 bg-emerald-500/20 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-[11px]">
                  {Math.max(activePresences.length, 1)}
                </span>
              </button>

              {/* License Status / Activation Button */}
              {isLicenseActive && activeLicense ? (
                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
                  title={`Active PRO License: ${activeLicense.customerName || 'User'}`}
                  id="view-license-btn"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="hidden md:inline font-mono font-bold">
                    {activeLicense.duration.toUpperCase().replace('_', ' ')} PRO
                  </span>
                  <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    {Math.max(0, Math.ceil((new Date(activeLicense.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d left
                  </span>
                </button>
              ) : activeLicense && new Date(activeLicense.expiresAt).getTime() <= Date.now() ? (
                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shrink-0"
                  title={lang === 'my' ? 'PRO သက်တမ်း ကုန်ဆုံးသွားပါပြီ။ သက်တမ်းတိုးရန် နှိပ်ပါ' : 'PRO Expired. Click to Renew'}
                  id="expired-renew-btn"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'သက်တမ်းကုန်' : 'EXPIRED'}</span>
                  <span className="text-[9px] sm:text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                    {lang === 'my' ? 'ထပ်ဝယ်မည်' : 'RENEW'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/20 shrink-0"
                  title={lang === 'my' ? 'PRO လိုင်စင် ဝယ်ယူ / ထည့်သွင်းရန်' : 'Activate PRO License'}
                  id="open-license-btn"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'PRO ဝယ်ယူ/ဖွင့်ရန်' : 'Activate PRO'}</span>
                  <span className="sm:hidden text-[10px] font-extrabold">PRO</span>
                </button>
              )}

              {/* Admin Management Button */}
              <button
                onClick={() => setShowAdminModal(true)}
                className={`p-1.5 sm:p-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white' 
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                } transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm`}
                title={t.adminPanel}
                id="admin-panel-btn"
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
              </button>

              {/* Theme Toggle Button (Desktop & Tablet) */}
              <button
                onClick={toggleTheme}
                className={`hidden sm:flex p-1.5 sm:p-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'} hover:text-white transition-all cursor-pointer items-center justify-center shrink-0`}
                title={theme === 'dark' ? t.themeLight : t.themeDark}
                id="theme-toggle-btn"
              >
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                )}
              </button>

              {/* 3-Way Language Switcher */}
              <button 
                onClick={() => handleSetLang(l => l === 'en' ? 'my' : l === 'my' ? 'zh' : 'en')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs font-bold tracking-wide transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300 hover:text-amber-200' 
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 hover:text-amber-700'
                } cursor-pointer shrink-0 shadow-sm`}
                title="Switch Language (မြန်မာ / 中文 / English)"
                id="language-toggle-btn"
              >
                <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="hidden sm:inline">{lang === 'my' ? '🇲🇲 မြန်မာ' : lang === 'zh' ? '🇨🇳 中文' : '🇬🇧 ENG'}</span>
                <span className="sm:hidden text-[10px]">{lang === 'my' ? 'MY' : lang === 'zh' ? 'ZH' : 'EN'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Viber & Telegram Direct Purchase & Activation Banner at start of page */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2 w-full">
          <ViberTelegramPurchaseBanner
            adminContact={adminContact}
            activeLicense={activeLicense}
            lang={lang}
            theme={theme}
            onActivateToken={handleActivateLicense}
            onOpenAdminModal={() => setShowAdminModal(true)}
            onOpenActivationModal={() => setShowLicenseModal(true)}
          />
        </div>

        {/* Solar Panel String Sizer (Formulas 100% untouched) vs Solar Mounting Calculator */}
        {activeNavTab === 'string_sizer' ? (
          !isPaidUser ? (
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-5 w-full max-w-full min-w-0 overflow-hidden">
              <MountingCalculatorPaywallGate
                activeTab="string_sizer"
                lang={lang}
                theme={theme}
                adminContact={adminContact}
                activeLicense={activeLicense}
                onOpenActivation={() => setShowLicenseModal(true)}
                onActivateToken={handleActivateLicense}
              />
            </div>
          ) : (
          <>
          {/* Hero section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
            <div className={`bg-gradient-to-r ${theme === 'dark' ? 'from-slate-950 to-slate-900 border-slate-800 shadow-xl' : 'from-amber-500/10 to-yellow-500/5 border-amber-500/20 shadow-sm'} border rounded-2xl p-6 sm:p-8 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Sun className="w-48 h-48 text-amber-500" />
              </div>
              <div className="relative z-10 max-w-3xl">
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-500/10 text-amber-800 border-amber-500/20'} text-xs font-medium border mb-3`}>
                  <Zap className="w-3 h-3" />
                  <span>Advanced Solar String safety threshold builder with Wattage Sizing</span>
                </div>
                <h2 className={`text-2xl sm:text-3xl font-extrabold ${sTextTitle} tracking-tight`}>{t.title}</h2>
                <p className={`mt-2 text-sm sm:text-base ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} leading-relaxed max-w-2xl`}>
                  {t.subtitle}
                </p>
              </div>
            </div>
          </div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {statusMsg && (
          <div className="fixed bottom-5 right-5 z-50">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={`p-4 rounded-xl shadow-2xl flex items-center gap-3 border ${
                statusMsg.type === 'success' 
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-sm font-semibold">{statusMsg.text}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Columns - Form Inputs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Inverter Specification */}
          <section className={`${sCard} border ${sBorder} rounded-2xl p-5 sm:p-6 shadow-md transition-all`}>
            <div className={`flex items-center justify-between gap-2.5 mb-4 pb-3 border-b ${sBorder}`}>
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-amber-500" />
                <h3 className={`text-base font-bold ${sTextTitle} tracking-wide`}>{t.inverterSection}</h3>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                selectedInverterId === 'custom' 
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {selectedInverterId === 'custom' ? (lang === 'my' ? "Manual Mode" : "Manual Input") : "Preset Mode"}
              </span>
            </div>

            {/* Inverter Mode Switcher Tabs */}
            <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl mb-4 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  if (!isPaidUser) {
                    setShowLicenseModal(true);
                    return;
                  }
                  if (selectedInverterId === 'custom') {
                    if (customInverters.length > 0) {
                      setSelectedInverterId(customInverters[0].id);
                    }
                  }
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedInverterId !== 'custom'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : `${sTextMuted} hover:text-slate-200`
                }`}
              >
                {!isPaidUser ? <Lock className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
                <span>{t.modePresets}</span>
                {!isPaidUser && <span className="text-[10px] uppercase font-mono px-1 rounded bg-black/20">PRO</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedInverterId('custom');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedInverterId === 'custom'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : `${sTextMuted} hover:text-slate-200`
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t.modeManual}</span>
              </button>
            </div>

            {/* Inverter Preset Selector or Manual Form */}
            <div className="space-y-4">
              {selectedInverterId !== 'custom' ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-semibold ${sTextMuted} uppercase tracking-wider`}>{t.selectInverter}</label>
                      <button
                        type="button"
                        onClick={handleAddNewInverter}
                        className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.addNewModel}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <select 
                        value={selectedInverterId}
                        onChange={(e) => {
                          if (e.target.value === 'locked_pro') {
                            setShowLicenseModal(true);
                            return;
                          }
                          setSelectedInverterId(e.target.value);
                          if (e.target.value !== 'custom') {
                            setEditingInverterId(null);
                          }
                        }}
                        className={`w-full ${sSelect} border ${sBorder} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none cursor-pointer`}
                        id="inverter-select"
                      >
                        {customInverters.length > 0 && (
                          <optgroup label={lang === 'my' ? "အင်ဗာတာ စာရင်းများ" : lang === 'zh' ? "逆变器预设数据库" : "Inverter Database"}>
                            {customInverters.map((inv, idx) => (
                              <option key={`inv_opt_${inv.id}_${idx}`} value={inv.id}>
                                {inv.brand} - {inv.model} ({inv.kw}kW)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="custom">✏️ {t.customInverter}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Inverter Specs Display */}
                  <div className={`${sSubCard} rounded-xl p-4 border ${sBorder} space-y-3`}>
                    <div className={`flex items-center justify-between text-xs pb-1.5 border-b ${sBorder}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{activeInverter.brand} &middot; {activeInverter.model}</span>
                        {customInverters.some(ci => ci.id === activeInverter.id) && (
                          <button 
                            onClick={(e) => handleDeleteCustomInverter(activeInverter.id, e)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Delete template"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded ${theme === 'dark' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-amber-800 bg-amber-100 border border-amber-200'}`}>{activeInverter.kw} kW Inverter</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className={`${sTextMuted} block mb-0.5`}>{t.mpptCount}</span>
                        <span className={`font-semibold ${sTextTitle} text-sm`}>{activeInverter.mppt} MPPTs</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5`}>{t.stringsPerMppt}</span>
                        <span className={`font-semibold ${sTextTitle} text-sm font-mono`}>
                          {String(activeInverter.stringPerMppt)}
                          {!String(activeInverter.stringPerMppt).includes('+') && !String(activeInverter.stringPerMppt).includes('*') ? ' String(s)' : ''}
                        </span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5 flex items-center gap-1`}>
                          {t.maxDcVoltage}
                          <Tooltip text={t.tooltipVoc} />
                        </span>
                        <span className={`font-semibold ${sRose} text-sm font-mono`}>{activeInverter.maxDcVoltage} V</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5 flex items-center gap-1`}>
                          Rated Input Voltage (Nominal)
                          <Tooltip text={t.tooltipNominal} />
                        </span>
                        <span className={`font-semibold ${sEmerald} text-sm font-mono`}>{activeInverter.nominalVoltage} V</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5`}>Vmp Min Voltage</span>
                        <span className={`font-semibold ${sAmber} text-sm font-mono`}>{activeInverter.vmpMin} V</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5`}>Vmp Max Voltage</span>
                        <span className={`font-semibold ${sAmber} text-sm font-mono`}>{activeInverter.vmpMax} V</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5 flex items-center gap-1`}>
                          {t.inverterImp}
                          <Tooltip text={t.tooltipInverterImp} />
                        </span>
                        <span className={`font-semibold ${sAmber} text-sm font-mono`}>{String(activeInverter.imp || 13.5)} A</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5 flex items-center gap-1`}>
                          {t.inverterIsc}
                          <Tooltip text={t.tooltipInverterIsc} />
                        </span>
                        <span className={`font-semibold ${sRose} text-sm font-mono`}>{String(activeInverter.isc || 14.5)} A</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`${sTextMuted} block mb-0.5`}>{t.maxDcInputWatt}</span>
                        <span className={`font-semibold ${sAmber} text-sm font-mono`}>{activeInverter.maxDcInputWatt.toLocaleString()} W</span>
                      </div>
                    </div>
                    <div className={`pt-2 border-t ${sBorder}`}>
                      <span className={`${sTextMuted} text-xs block mb-1 flex items-center gap-1`}>
                        {t.mpptRange}
                        <Tooltip text={t.tooltipMpptRange} />
                      </span>
                      <div className={`flex justify-between items-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'} px-3 py-1.5 rounded-lg border ${sBorder}`}>
                        <span className={`font-mono text-xs ${sTextTitle}`}>{activeInverter.vmpMin} V</span>
                        <div className={`flex-1 mx-3 h-1 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'} rounded relative`}>
                          <div className="absolute inset-y-0 left-1/4 right-1/6 bg-amber-500/30 rounded" />
                        </div>
                        <span className={`font-mono text-xs ${sTextTitle}`}>{activeInverter.vmpMax} V</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button 
                        type="button"
                        onClick={() => handleEditInverterSpec(activeInverter)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border ${theme === 'dark' ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'} text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{lang === 'my' ? "အချက်အလက်များကို ပြင်ဆင်ရန်" : "Edit Specification"}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={handleAddNewInverter}
                        className={`px-3 flex items-center justify-center gap-1 rounded-xl border ${theme === 'dark' ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'} text-xs font-bold transition-all duration-200 cursor-pointer`}
                        title={t.addNewModel}
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">{t.addNewModel}</span>
                      </button>
                      {customInverters.some(ci => ci.id === activeInverter.id) && (
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteCustomInverter(activeInverter.id, e)}
                          className="px-3 flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-500 text-xs font-semibold transition-all duration-200 cursor-pointer"
                          title={lang === 'my' ? "ဖျက်မည်" : "Delete"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Custom Inverter Input fields */
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 ${sSubCard} border ${sBorder} rounded-xl space-y-3.5`}
                >
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <Edit3 className="w-4 h-4" />
                      <span>
                        {editingInverterId 
                          ? `${t.editingPreset}: ${customInverterData.brand} ${customInverterData.model}` 
                          : t.customInverterTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadSampleInverter}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-all cursor-pointer"
                        title="Load 6kW sample"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t.loadSampleSpecs}</span>
                      </button>
                      {customInverters.length > 0 && (
                        <button 
                          type="button"
                          onClick={() => {
                            if (editingInverterId) {
                              setSelectedInverterId(editingInverterId);
                              setEditingInverterId(null);
                            } else if (customInverters.length > 0) {
                              setSelectedInverterId(customInverters[0].id);
                            }
                          }}
                          className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          {t.backToPresets}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>{t.brand}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Deye, Solis, Growatt"
                        value={customInverterData.brand} 
                        onChange={(e) => handleCustomInverterChange('brand', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-brand-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>{t.model}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. SUN-6K-SG05LP1"
                        value={customInverterData.model} 
                        onChange={(e) => handleCustomInverterChange('model', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-model-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>{t.capacityKw}</label>
                      <input 
                        type="number" 
                        value={customInverterData.kw} 
                        onChange={(e) => handleCustomInverterChange('kw', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-kw-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>{t.maxDcVoltage}</label>
                      <input 
                        type="number" 
                        value={customInverterData.maxDcVoltage} 
                        onChange={(e) => handleCustomInverterChange('maxDcVoltage', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1`}
                        id="custom-maxdc-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>{t.maxDcInputWatt}</label>
                      <input 
                        type="number" 
                        value={customInverterData.maxDcInputWatt} 
                        onChange={(e) => handleCustomInverterChange('maxDcInputWatt', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1`}
                        id="custom-maxdcinputwatt-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>Vmp Min (V)</label>
                      <input 
                        type="number" 
                        value={customInverterData.vmpMin} 
                        onChange={(e) => handleCustomInverterChange('vmpMin', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-vmpmin-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>Vmp Max (V)</label>
                      <input 
                        type="number" 
                        value={customInverterData.vmpMax} 
                        onChange={(e) => handleCustomInverterChange('vmpMax', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-vmpmax-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>Nominal (V)</label>
                      <input 
                        type="number" 
                        value={customInverterData.nominalVoltage} 
                        onChange={(e) => handleCustomInverterChange('nominalVoltage', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1`}
                        id="custom-nominal-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>MPPT Imp (A)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 18+18, 26, 20*10"
                        value={customInverterData.imp || ""} 
                        onChange={(e) => handleCustomInverterChange('imp', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-1`}
                        id="custom-imp-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>MPPT Isc (A)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 27+27, 34, 30*10"
                        value={customInverterData.isc || ""} 
                        onChange={(e) => handleCustomInverterChange('isc', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-1`}
                        id="custom-isc-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>{t.mpptCount}</label>
                      <input 
                        type="number" 
                        value={customInverterData.mppt} 
                        onChange={(e) => handleCustomInverterChange('mppt', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-mppt-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>{t.stringsPerMppt}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1+1, 2+2, 2*10"
                        value={customInverterData.stringPerMppt} 
                        onChange={(e) => handleCustomInverterChange('stringPerMppt', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1`}
                        id="custom-stringper-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveManualInverter}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t.saveToPresetsList}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        runCalculation();
                        setStatusMsg({
                          text: lang === 'my' ? "Manual Inverter အချက်အလက်များဖြင့် တွက်ချက်ပြီးပါပြီ" : "Applied manual inverter parameters to calculations",
                          type: 'success'
                        });
                        setTimeout(() => setStatusMsg(null), 3000);
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{t.applyDirectly}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          {/* Section 2: Solar Panel Specification */}
          <section className={`${sCard} border ${sBorder} rounded-2xl p-5 sm:p-6 shadow-md transition-all`}>
            <div className={`flex items-center justify-between gap-2.5 mb-4 pb-3 border-b ${sBorder}`}>
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-amber-500" />
                <h3 className={`text-base font-bold ${sTextTitle} tracking-wide`}>{t.panelSection}</h3>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                selectedPanelId === 'custom' 
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {selectedPanelId === 'custom' ? (lang === 'my' ? "Manual Mode" : "Manual Input") : "Preset Mode"}
              </span>
            </div>

            {/* Solar Panel Mode Switcher Tabs */}
            <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl mb-4 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  if (!isPaidUser) {
                    setShowLicenseModal(true);
                    return;
                  }
                  if (selectedPanelId === 'custom') {
                    if (customPanels.length > 0) {
                      setSelectedPanelId(customPanels[0].id);
                    }
                  }
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPanelId !== 'custom'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : `${sTextMuted} hover:text-slate-200`
                }`}
              >
                {!isPaidUser ? <Lock className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
                <span>{t.modePresets}</span>
                {!isPaidUser && <span className="text-[10px] uppercase font-mono px-1 rounded bg-black/20">PRO</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPanelId('custom');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPanelId === 'custom'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : `${sTextMuted} hover:text-slate-200`
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t.modeManual}</span>
              </button>
            </div>

            <div className="space-y-4">
              {selectedPanelId !== 'custom' ? (
                <>
                  {/* Preset Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-semibold ${sTextMuted} uppercase tracking-wider`}>{t.selectPanel}</label>
                      <button
                        type="button"
                        onClick={handleAddNewPanel}
                        className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.addNewPanel}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <select 
                        value={selectedPanelId}
                        onChange={(e) => {
                          if (e.target.value === 'locked_pro') {
                            setShowLicenseModal(true);
                            return;
                          }
                          setSelectedPanelId(e.target.value);
                          if (e.target.value !== 'custom') {
                            setEditingPanelId(null);
                          }
                        }}
                        className={`w-full ${sSelect} border ${sBorder} rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none cursor-pointer`}
                        id="panel-preset-select"
                      >
                        {customPanels.length > 0 && (
                          <optgroup label={lang === 'my' ? "ဆိုလာပြား စာရင်းများ" : lang === 'zh' ? "太阳能板预设数据库" : "Solar Panel Database"}>
                            {customPanels.map((p, idx) => (
                              <option key={`panel_opt_${p.id}_${idx}`} value={p.id}>
                                {p.name} ({p.watt}W)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="custom">✏️ {t.customPanel}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Panel Details Display */}
                  <div className={`p-4 ${sSubCard} border ${sBorder} rounded-xl space-y-3`}>
                    <div className={`flex items-center justify-between pb-1.5 border-b ${sBorder} text-xs`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{panel.name}</span>
                        {customPanels.some(cp => cp.id === panel.id) && (
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteCustomPanel(panel.id, e)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Delete template"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded ${theme === 'dark' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-amber-800 bg-amber-100 border border-amber-200'}`}>{panel.watt} W</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className={`${sTextMuted} block mb-0.5`}>{t.panelVoc}</span>
                        <span className={`font-semibold ${sTextTitle} text-sm font-mono`}>{panel.voc} V</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5`}>{t.panelVmp}</span>
                        <span className={`font-semibold ${sTextTitle} text-sm font-mono`}>{panel.vmp} V</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5 flex items-center gap-1`}>
                          {t.panelImp}
                          <Tooltip text={t.tooltipPanelImp} />
                        </span>
                        <span className={`font-semibold ${sAmber} text-sm font-mono`}>{panel.imp || 13.11} A</span>
                      </div>
                      <div>
                        <span className={`${sTextMuted} block mb-0.5 flex items-center gap-1`}>
                          {t.panelIsc}
                          <Tooltip text={t.tooltipPanelIsc} />
                        </span>
                        <span className={`font-semibold ${sRose} text-sm font-mono`}>{panel.isc || 13.94} A</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button 
                        type="button"
                        onClick={() => handleEditPanelSpec(panel)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border ${theme === 'dark' ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'} text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{lang === 'my' ? "အချက်အလက်များကို ပြင်ဆင်ရန်" : "Edit Specification"}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={handleAddNewPanel}
                        className={`px-3 flex items-center justify-center gap-1 rounded-xl border ${theme === 'dark' ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'} text-xs font-bold transition-all duration-200 cursor-pointer`}
                        title={t.addNewPanel}
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">{t.addNewPanel}</span>
                      </button>
                      {customPanels.some(cp => cp.id === panel.id) && (
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteCustomPanel(panel.id, e)}
                          className="px-3 flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-500 text-xs font-semibold transition-all duration-200 cursor-pointer"
                          title={lang === 'my' ? "ဖျက်မည်" : "Delete"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Custom Solar Panel manual inputs form */
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 ${sSubCard} border ${sBorder} rounded-xl space-y-3.5`}
                >
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <Edit3 className="w-4 h-4" />
                      <span>
                        {editingPanelId 
                          ? `${t.editingPreset}: ${customPanelForm.name}` 
                          : t.customPanelTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadSamplePanel}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-all cursor-pointer"
                        title="Load 585W sample"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t.loadSampleSpecs}</span>
                      </button>
                      {customPanels.length > 0 && (
                        <button 
                          type="button"
                          onClick={() => {
                            if (editingPanelId) {
                              setSelectedPanelId(editingPanelId);
                              setEditingPanelId(null);
                            } else if (customPanels.length > 0) {
                              setSelectedPanelId(customPanels[0].id);
                            }
                          }}
                          className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          {t.backToPresets}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>{t.panelName}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Jinko Tiger Neo 585W N-Type"
                      value={customPanelForm.name} 
                      onChange={(e) => handleCustomPanelFormChange('name', e.target.value)}
                      className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                      id="custom-panel-name-input"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>Voc (V)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={customPanelForm.voc} 
                        onChange={(e) => handleCustomPanelFormChange('voc', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-panel-voc-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>Vmp (V)</label>
                      <input 
                        type="number"
                        step="0.01" 
                        value={customPanelForm.vmp} 
                        onChange={(e) => handleCustomPanelFormChange('vmp', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-panel-vmp-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>Watt (W)</label>
                      <input 
                        type="number" 
                        value={customPanelForm.watt} 
                        onChange={(e) => handleCustomPanelFormChange('watt', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1`}
                        id="custom-panel-watt-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>Panel Imp (A)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={customPanelForm.imp || ""} 
                        onChange={(e) => handleCustomPanelFormChange('imp', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1`}
                        id="custom-panel-imp-input"
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold ${sTextMuted} uppercase tracking-wider mb-1`}>Panel Isc (A)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={customPanelForm.isc || ""} 
                        onChange={(e) => handleCustomPanelFormChange('isc', e.target.value)}
                        className={`w-full ${sInput} rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1`}
                        id="custom-panel-isc-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveManualPanel}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t.saveToPresetsList}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        runCalculation();
                        setStatusMsg({
                          text: lang === 'my' ? "Manual Panel အချက်အလက်များဖြင့် တွက်ချက်ပြီးပါပြီ" : "Applied manual panel parameters to calculations",
                          type: 'success'
                        });
                        setTimeout(() => setStatusMsg(null), 3000);
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{t.applyDirectly}</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Force Recalculate button styled elegantly */}
              <button
                type="button"
                onClick={runCalculation}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-amber-500/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                id="calculate-btn"
              >
                <Sun className="w-4.5 h-4.5 animate-spin-slow" />
                <span>{t.calculateBtn}</span>
              </button>
            </div>
          </section>

          {/* Section 3: Safety Buffers Configuration */}
          <section className={`${sCard} border ${sBorder} rounded-2xl p-6 shadow-md transition-all`}>
            <div className={`flex items-center gap-2.5 mb-5 pb-3 border-b ${sBorder}`}>
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <h3 className={`text-base font-bold ${sTextTitle} tracking-wide`}>{t.safetyBufferSection}</h3>
            </div>

            <div className="space-y-5">
              {/* Minimum Buffer selector */}
              <div>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <label className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-wider`}>{t.minBufferLabel}</label>
                  <span className="text-xs font-semibold text-amber-500 font-mono">+{minBuffer} {t.panelsPlural}</span>
                </div>
                <p className={`text-[11px] ${sTextMuted} leading-normal mb-2.5`}>{t.minBufferDesc}</p>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setMinBuffer(0)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      minBuffer === 0 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow' 
                        : theme === 'dark' 
                          ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700' 
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                    }`}
                  >
                    {t.noBuffer}
                  </button>
                  <button 
                    onClick={() => setMinBuffer(1)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      minBuffer === 1 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow' 
                        : theme === 'dark' 
                          ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700' 
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                    }`}
                  >
                    {t.onePanelBuffer}
                  </button>
                  <button 
                    onClick={() => setMinBuffer(2)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      minBuffer === 2 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow' 
                        : theme === 'dark' 
                          ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700' 
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                    }`}
                  >
                    {t.twoPanelBuffer}
                  </button>
                </div>
              </div>

              {/* Maximum safety limit buffer selector */}
              <div>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <label className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-wider`}>{t.maxBufferLabel}</label>
                  <span className="text-xs font-semibold text-rose-500 font-mono">-{maxBuffer} {t.panelsPlural}</span>
                </div>
                <p className={`text-[11px] ${sTextMuted} leading-normal mb-2.5`}>{t.maxBufferDesc}</p>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setMaxBuffer(0)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      maxBuffer === 0 
                        ? 'bg-rose-500 text-white border-rose-400 shadow' 
                        : theme === 'dark' 
                          ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700' 
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                    }`}
                  >
                    {t.noBuffer}
                  </button>
                  <button 
                    onClick={() => setMaxBuffer(1)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      maxBuffer === 1 
                        ? 'bg-rose-500 text-white border-rose-400 shadow' 
                        : theme === 'dark' 
                          ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700' 
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                    }`}
                  >
                    {t.onePanelMaxBuffer}
                  </button>
                  <button 
                    onClick={() => setMaxBuffer(2)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      maxBuffer === 2 
                        ? 'bg-rose-500 text-white border-rose-400 shadow' 
                        : theme === 'dark' 
                          ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700' 
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                    }`}
                  >
                    {t.twoPanelMaxBuffer}
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Right Columns - Results & Interactive wireframes */}
        <div className="lg:col-span-7 space-y-6">

          {/* Validation Errors */}
          {errorText && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-start gap-3 shadow-md"
              id="calc-error-card"
            >
              <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="text-sm font-semibold">{t.warningShort}</p>
                <p className="text-xs text-rose-300/90 mt-0.5 font-medium">{errorText}</p>
              </div>
            </motion.div>
          )}

          {/* Sizing outputs */}
          <div className={`${sCard} border ${sBorder} rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <TrendingUp className="w-32 h-32 text-amber-500" />
            </div>

            <div className={`flex items-center gap-2.5 mb-6 pb-3 border-b ${sBorder}`}>
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <h3 className={`text-base font-bold ${sTextTitle} tracking-wide`}>{t.resultsSection}</h3>
            </div>

            {/* Results Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Max Sizing */}
              <div className={`${sSubCard} border ${sBorder} rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-500 relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/5 group-hover:bg-rose-500/10 rounded-bl-full transition-colors duration-300" />
                <div>
                  <h4 className={`${sTextMuted} text-xs font-bold uppercase tracking-wider mb-1`}>{t.maxLabel}</h4>
                  <p className={`${sTextMuted} text-[11px] leading-tight mb-4`}>{t.maxDesc}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold ${sRose} font-mono`} id="result-max-pv">{maxPv}</span>
                  <span className={`text-xs ${sTextMuted} font-semibold`}>{t.panelsPlural}</span>
                </div>
              </div>

              {/* Min Sizing */}
              <div className={`${sSubCard} border ${sBorder} rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-500 relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 group-hover:bg-amber-500/10 rounded-bl-full transition-colors duration-300" />
                <div>
                  <h4 className={`${sTextMuted} text-xs font-bold uppercase tracking-wider mb-1`}>{t.minLabel}</h4>
                  <p className={`${sTextMuted} text-[11px] leading-tight mb-4`}>{t.minDesc}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'} font-mono`} id="result-min-pv">{minPv}</span>
                  <span className={`text-xs ${sTextMuted} font-semibold`}>{t.panelsPlural}</span>
                </div>
              </div>

              {/* Recommended Sizing with safety buffer clamping */}
              <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-500/30' : 'bg-emerald-50 border-2 border-emerald-500/40'} rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-emerald-500/50 relative overflow-hidden group shadow-lg`}>
                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-bl-full" />
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-100 border border-emerald-300 text-emerald-800'} text-[9px] font-bold uppercase mb-2`}>
                    <Check className="w-2.5 h-2.5" />
                    <span>Optimized</span>
                  </div>
                  <h4 className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'} text-xs font-bold uppercase tracking-wider mb-1`}>{t.recLabel}</h4>
                  <p className={`${sTextMuted} text-[11px] leading-tight mb-4`}>{t.recDesc}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${sEmerald} font-mono`} id="result-rec-pv">{recommendPv}</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} font-bold`}>{t.panelsPlural}</span>
                </div>
              </div>

            </div>

            {/* Inverter Max DC Input Power Watt limit divider sizing */}
            {activeInverter.maxDcInputWatt > 0 && panel.watt > 0 && (
              <div className={`mt-4 p-4 ${sSubCard} border ${sBorder} rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                <div className="space-y-1">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'} text-[10px] font-extrabold uppercase`}>
                    <Zap className="w-3 h-3" />
                    <span>Wattage Boundary</span>
                  </span>
                  <h4 className={`${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} text-xs font-bold uppercase tracking-wider`}>{t.maxWattPanelsLabel}</h4>
                  <p className={`${sTextMuted} text-[11px] max-w-md`}>{t.maxWattPanelsDesc}</p>
                </div>
                <div className={`${theme === 'dark' ? 'bg-slate-950' : 'bg-white'} border ${sBorder} rounded-xl px-4 py-3 flex items-baseline gap-1.5 shrink-0 shadow-sm`}>
                  <span className={`text-3xl font-black ${sIndigo} font-mono`}>{maxWattPanels}</span>
                  <span className={`text-xs ${sTextMuted} font-semibold`}>{t.panelsPlural}</span>
                </div>
              </div>
            )}

            {/* Total Target power and specifications metrics */}
            {recommendPv > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-6 p-4 ${sSubCard} border ${sBorder} rounded-2xl`}
              >
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'} text-center`}>
                  <div className="pt-3 md:pt-0">
                    <span className={`text-[11px] uppercase tracking-wider ${sTextMuted} font-bold block mb-1`}>{t.recStringPower}</span>
                    <span className={`text-base font-extrabold ${sTextTitle} font-mono`}>
                      {((recommendPv * panel.watt) / 1000).toFixed(2)} kW
                    </span>
                  </div>
                  <div className="pt-3 md:pt-0 md:pl-4">
                    <span className={`text-[11px] uppercase tracking-wider ${sTextMuted} font-bold block mb-1`}>{t.recStringVmp}</span>
                    <span className={`text-base font-extrabold ${sTextTitle} font-mono`}>
                      {(recommendPv * panel.vmp).toFixed(1)} V
                    </span>
                  </div>
                  <div className="pt-3 md:pt-0 md:pl-4">
                    <span className={`text-[11px] uppercase tracking-wider ${sTextMuted} font-bold block mb-1`}>{t.recStringVoc}</span>
                    <span className={`text-base font-extrabold ${sRose} font-mono`}>
                      {(recommendPv * panel.voc).toFixed(1)} V
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Disclaimer */}
            <div className={`mt-5 flex items-start gap-2.5 text-[11px] ${sTextMuted} leading-relaxed ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-100'} p-3 rounded-xl border ${sBorder}`}>
              <Info className="w-4 h-4 shrink-0 text-amber-500/70" />
              <span>{t.tempDisclaimer}</span>
            </div>
          </div>

          {/* Interactive String Series Connection Diagram (Simple Visually) */}
          {recommendPv > 0 && (
            <div className={`${sCard} border ${sBorder} rounded-2xl p-6 shadow-md`}>
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 pb-3 border-b ${sBorder}`}>
                <div className="flex items-center gap-2.5">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <h3 className={`text-base font-bold ${sTextTitle} tracking-wide`}>{t.stringWiringDiagram}</h3>
                </div>
                <span className={`text-[11px] font-mono ${theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'} border ${sBorder} px-2 py-1 rounded-md`}>
                  {recommendPv} {t.panelsPlural} (Series Chain)
                </span>
              </div>

              {/* Simplified & Clean series wiring schema */}
              <div className={`${sSubCard} border ${sBorder} rounded-xl p-5 space-y-6`}>
                
                {/* Visual String chain loop */}
                <div className="w-full overflow-x-auto pb-4 pt-4 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-amber-500/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                  <div className="flex items-center gap-1.5 min-w-max px-4 justify-start md:justify-center">
                    
                    {/* Simplified positive feed-in endpoint */}
                    <div className="flex items-center shrink-0">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <div className="h-0.5 w-6 bg-rose-500 relative">
                        <span className="absolute -top-4 left-0 text-[8px] font-bold text-rose-500 font-mono tracking-wider">RED (+)</span>
                      </div>
                    </div>

                    {/* Compact Solar panels loop representation */}
                    {Array.from({ length: Math.min(8, recommendPv) }).map((_, idx) => (
                      <React.Fragment key={idx}>
                        <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-white'} border ${theme === 'dark' ? 'border-amber-500/40' : 'border-amber-400'} rounded-lg p-2 flex flex-col items-center justify-between shadow w-14 h-16 shrink-0 relative`}>
                          <span className="text-[9px] font-bold text-amber-500 font-mono">#{idx+1}</span>
                          <div className="w-6 h-4 bg-amber-500/10 rounded flex items-center justify-center border border-amber-500/10">
                            <Sun className="w-2.5 h-2.5 text-amber-400" />
                          </div>
                          <span className={`text-[8px] ${sTextMuted} font-mono`}>{panel.vmp}V</span>
                        </div>
                        {idx < Math.min(8, recommendPv) - 1 && (
                          <div className="h-0.5 w-3 bg-amber-500/50 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}

                    {recommendPv > 8 && (
                      <>
                        <div className="h-0.5 w-3 bg-amber-500/50 shrink-0" />
                        <div className={`flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'} border rounded-lg w-12 h-16 shrink-0`}>
                          <span className={`text-xs ${sTextMuted} font-bold`}>+{recommendPv - 8} ...</span>
                        </div>
                      </>
                    )}

                    {/* Negative feed-in endpoint */}
                    <div className="flex items-center shrink-0">
                      <div className="h-0.5 w-6 bg-blue-500 relative">
                        <span className="absolute -top-4 right-0 text-[8px] font-bold text-blue-400 font-mono tracking-wider">NEG (-)</span>
                      </div>
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                    </div>

                  </div>
                </div>

                {/* Simplified visual legend / metadata label */}
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t ${sBorder} text-center text-xs`}>
                  <div className={`p-2 ${theme === 'dark' ? 'bg-slate-950/40' : 'bg-white'} rounded-lg border ${sBorder}`}>
                    <span className={`block text-[9px] ${sTextMuted} uppercase tracking-wider`}>{t.simpleWiringPanel}</span>
                    <span className={`font-bold ${sTextTitle} font-mono`}>{panel.watt}W</span>
                  </div>
                  <div className={`p-2 ${theme === 'dark' ? 'bg-slate-950/40' : 'bg-white'} rounded-lg border ${sBorder}`}>
                    <span className={`block text-[9px] ${sTextMuted} uppercase tracking-wider`}>{t.stringVoltage}</span>
                    <span className="font-bold text-emerald-500 font-mono">{(recommendPv * panel.vmp).toFixed(0)} V</span>
                  </div>
                  <div className={`p-2 ${theme === 'dark' ? 'bg-slate-950/40' : 'bg-white'} rounded-lg border ${sBorder}`}>
                    <span className={`block text-[9px] ${sTextMuted} uppercase tracking-wider`}>Total Voc</span>
                    <span className="font-bold text-rose-500 font-mono">{(recommendPv * panel.voc).toFixed(0)} V</span>
                  </div>
                  <div className={`p-2 ${theme === 'dark' ? 'bg-slate-950/40' : 'bg-white'} rounded-lg border ${sBorder}`}>
                    <span className={`block text-[9px] ${sTextMuted} uppercase tracking-wider`}>{t.simpleWiringInverter}</span>
                    <span className="font-bold text-indigo-500 font-mono">{activeInverter.brand}</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Sizing Security Report & Buffers status */}
          <div className={`${sCard} border rounded-2xl p-6 shadow-md transition-colors duration-500 ${
            safetyInfo.status === 'safe' 
              ? theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/[0.01]' : 'border-emerald-500/30 bg-emerald-500/[0.03]' :
            safetyInfo.status === 'warning' 
              ? theme === 'dark' ? 'border-amber-500/20 bg-amber-500/[0.01]' : 'border-amber-500/30 bg-amber-500/[0.03]' :
            safetyInfo.status === 'danger' 
              ? theme === 'dark' ? 'border-rose-500/20 bg-rose-500/[0.01]' : 'border-rose-500/30 bg-rose-500/[0.03]' : 
            `${sBorder}`
          }`}>
            <div className={`flex items-center gap-2.5 mb-4 pb-3 border-b ${sBorder}`}>
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <h3 className={`text-base font-bold ${sTextTitle} tracking-wide`}>{t.safetyReportTitle}</h3>
            </div>

            {recommendPv > 0 ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    safetyInfo.status === 'safe' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    safetyInfo.status === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {safetyInfo.status === 'safe' ? (
                      <CheckCircle2 className="w-5 h-5 animate-pulse" />
                    ) : safetyInfo.status === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    ) : (
                      <XCircle className="w-5 h-5 animate-ping" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${sTextTitle} leading-tight`}>{safetyInfo.title}</h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} mt-1 leading-relaxed`}>{safetyInfo.message}</p>
                  </div>
                </div>

                {/* Sizing range spectrum comparison bar */}
                <div className={`pt-3 border-t ${sBorder} space-y-4`}>
                  <div className="text-xs space-y-2">
                    <div className={`flex justify-between items-center text-[10px] font-semibold ${sTextMuted} uppercase tracking-wider`}>
                      <span>{t.absoluteLimits}</span>
                      <span className={`font-mono ${sTextTitle}`}>{minPv} - {maxPv} {t.panelsPlural}</span>
                    </div>
                    <div className={`h-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'} rounded-full relative overflow-hidden border`}>
                      {/* Active Safe target indicator */}
                      <div 
                        className="absolute h-full bg-emerald-500 transition-all duration-500"
                        style={{
                          left: `${((minPv + minBuffer) / (maxPv || 1)) * 100}%`,
                          right: `${100 - (((maxPv - maxBuffer) / (maxPv || 1)) * 100)}%`
                        }}
                      />
                      <div 
                        className={`absolute h-4 w-1 ${theme === 'dark' ? 'bg-white' : 'bg-slate-800'} top-1/2 -translate-y-1/2 shadow-lg rounded`}
                        style={{ left: `${(recommendPv / (maxPv || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className={`grid grid-cols-2 gap-3 text-[11px] ${sTextMuted} ${theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-50'} p-3 rounded-xl border ${sBorder}`}>
                    <div>
                      <span className={`block font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} mb-0.5`}>{t.safeLimits}</span>
                      <span className="font-mono text-emerald-500 font-bold">{minPv + minBuffer} to {maxPv - maxBuffer} {t.panelsPlural}</span>
                    </div>
                    <div>
                      <span className={`block font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} mb-0.5`}>{t.activeBufferTitle}</span>
                      <span className="font-mono text-amber-500 font-bold">Min: +{minBuffer} / Max: -{maxBuffer}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Sizing Step-by-Step Formula & Calculation Details */}
          {recommendPv > 0 && (
            <div className={`${sCard} border ${sBorder} rounded-2xl p-6 shadow-md transition-all duration-300`}>
              <button 
                onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                className="w-full flex items-center justify-between gap-2 text-left focus:outline-none cursor-pointer"
                id="toggle-formula-details-btn"
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className={`text-base font-bold ${sTextTitle} tracking-wide`}>{t.calcDetailHeader}</h3>
                    <p className={`text-[11px] ${sTextMuted}`}>{t.calcDetailDesc}</p>
                  </div>
                </div>
                <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-slate-900/80 border border-slate-800' : 'bg-slate-100 border border-slate-200'} transition-transform duration-350 ${showFormulaDetails ? 'rotate-180' : ''}`}>
                  <ChevronRight className="w-4 h-4 rotate-90 text-amber-500" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {showFormulaDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5 mt-4 border-t border-dashed border-slate-700/30 space-y-4">
                      
                      {/* Formula 1: Target (Nominal) */}
                      <div className={`${sSubCard} p-3.5 rounded-xl border ${sBorder} space-y-1.5`}>
                        <h4 className={`text-xs font-bold ${sAmber} flex items-center gap-1`}>
                          <span>{t.formulaTarget}</span>
                        </h4>
                        <div className={`text-center py-2 ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-100/90 border-slate-200'} rounded-lg border my-1 font-mono text-xs ${sEmerald} font-bold`}>
                          Nominal Target = Inverter Nominal V ÷ Panel Vmp
                        </div>
                        <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>• Inverter Nominal Voltage:</span>
                            <span className={`font-mono ${sAmber} font-bold`}>{activeInverter.nominalVoltage}V</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>• Panel Operating Vmp:</span>
                            <span className={`font-mono ${sAmber} font-bold`}>{panel.vmp}V</span>
                          </div>
                          <div className={`flex justify-between pt-1 border-t ${sBorder}`}>
                            <span className={`font-semibold ${sTextTitle}`}>Raw Value:</span>
                            <span className={`font-mono ${sTextTitle}`}>{activeInverter.nominalVoltage}V ÷ {panel.vmp}V = <span className={`${sEmerald} font-bold`}>{(activeInverter.nominalVoltage / panel.vmp).toFixed(2)} panels</span></span>
                          </div>
                          <div className="flex justify-between">
                            <span className={`font-semibold ${sTextTitle}`}>Rounded Integer:</span>
                            <span className={`font-mono ${sEmerald} font-bold`}>{Math.round(activeInverter.nominalVoltage / panel.vmp)} panels</span>
                          </div>
                        </div>
                      </div>

                      {/* Formula 2: Absolute Minimum */}
                      <div className={`${sSubCard} p-3.5 rounded-xl border ${sBorder} space-y-1.5`}>
                        <h4 className={`text-xs font-bold ${sAmber}`}>
                          {t.formulaMin}
                        </h4>
                        <div className={`text-center py-2 ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-100/90 border-slate-200'} rounded-lg border my-1 font-mono text-xs ${sBlue} font-bold`}>
                          Min Panels = Math.ceil(MPPT Min V ÷ Panel Vmp)
                        </div>
                        <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>• MPPT Minimum Voltage Limit:</span>
                            <span className={`font-mono ${sBlue} font-bold`}>{activeInverter.vmpMin}V</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>• Panel Operating Vmp:</span>
                            <span className={`font-mono ${sBlue} font-bold`}>{panel.vmp}V</span>
                          </div>
                          <div className={`flex justify-between pt-1 border-t ${sBorder}`}>
                            <span className={`font-semibold ${sTextTitle}`}>Calculated Limit:</span>
                            <span className={`font-mono ${sBlue} font-bold`}>Math.ceil({activeInverter.vmpMin}V ÷ {panel.vmp}V) = {minPv} panels</span>
                          </div>
                        </div>
                      </div>

                      {/* Formula 3: Absolute Maximum */}
                      <div className={`${sSubCard} p-3.5 rounded-xl border ${sBorder} space-y-1.5`}>
                        <h4 className={`text-xs font-bold ${sAmber}`}>
                          {t.formulaMax}
                        </h4>
                        <div className={`text-center py-2 ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-100/90 border-slate-200'} rounded-lg border my-1 font-mono text-xs ${sRose} font-bold`}>
                          Max Panels = Math.floor(MPPT Max V ÷ Panel Vmp)
                        </div>
                        <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>• MPPT Maximum Voltage Limit:</span>
                            <span className={`font-mono ${sRose} font-bold`}>{activeInverter.vmpMax}V</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>• Panel Operating Vmp:</span>
                            <span className={`font-mono ${sRose} font-bold`}>{panel.vmp}V</span>
                          </div>
                          <div className={`flex justify-between pt-1 border-t ${sBorder}`}>
                            <span className={`font-semibold ${sTextTitle}`}>Calculated Limit:</span>
                            <span className={`font-mono ${sRose} font-bold`}>Math.floor({activeInverter.vmpMax}V ÷ {panel.vmp}V) = {maxPv} panels</span>
                          </div>
                        </div>
                      </div>

                      {/* Formula 4: Safety Buffers */}
                      <div className={`${sSubCard} p-3.5 rounded-xl border ${sBorder} space-y-1.5`}>
                        <h4 className={`text-xs font-bold ${sAmber}`}>
                          {t.formulaSafeRange}
                        </h4>
                        <div className={`text-center py-2 ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-100/90 border-slate-200'} rounded-lg border my-1 font-mono text-xs ${sAmber} font-bold`}>
                          Safe Range = [Min Limit + Min Buffer] to [Max Limit - Max Buffer]
                        </div>
                        <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>• Preferred Safety Minimum:</span>
                            <span className={`font-mono ${sAmber} font-bold`}>{minPv} + {minBuffer} = {minPv + minBuffer} panels</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>• Preferred Safety Maximum:</span>
                            <span className={`font-mono ${sAmber} font-bold`}>{maxPv} - {maxBuffer} = {maxPv - maxBuffer} panels</span>
                          </div>
                          <div className={`flex justify-between pt-1 border-t ${sBorder}`}>
                            <span className={`font-semibold ${sTextTitle}`}>Resulting Safety Envelope:</span>
                            <span className={`font-mono ${sEmerald} font-bold`}>{minPv + minBuffer} to {maxPv - maxBuffer} panels</span>
                          </div>
                        </div>
                      </div>

                      {/* Formula 5: Sizing Recommendation Decision */}
                      <div className={`${theme === 'dark' ? 'bg-amber-950/15 border-amber-500/25' : 'bg-amber-50/80 border-amber-300'} p-3.5 rounded-xl border space-y-1.5`}>
                        <h4 className={`text-xs font-bold ${sAmber}`}>
                          {t.formulaConclusion}
                        </h4>
                        <div className="text-xs space-y-2 text-slate-800 dark:text-slate-300">
                          <p className="leading-relaxed">
                            {lang === 'my' ? (
                              <>
                                အင်ဗာတာ၏ ပစ်မှတ်ဗို့အားအရ အကောင်းဆုံးမှာ <span className={`font-bold ${sAmber} font-mono`}>{Math.round(activeInverter.nominalVoltage / panel.vmp)} ချပ်</span> ဖြစ်ပါသည်။ ၎င်းကို သင်သတ်မှတ်ထားသော ဘေးကင်းဇုန် အကွာအဝေး <span className={`font-bold ${sEmerald} font-mono`}>[{minPv + minBuffer} မှ {maxPv - maxBuffer}]</span> နှင့် တိုက်ဆိုင်ညှိနှိုင်းရာတွင်:
                              </>
                            ) : (
                              <>
                                Starting with the ideal nominal target of <span className={`font-bold ${sAmber} font-mono`}>{Math.round(activeInverter.nominalVoltage / panel.vmp)} panels</span>, we apply a security clamp to keep the chain within your preferred safety zone of <span className={`font-bold ${sEmerald} font-mono`}>[{minPv + minBuffer} to {maxPv - maxBuffer}]</span>:
                              </>
                            )}
                          </p>
                          <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'} border font-mono text-[11px] ${sAmber} space-y-1 shadow-sm`}>
                            <div>Ideal Target: {Math.round(activeInverter.nominalVoltage / panel.vmp)} panels</div>
                            <div>Preferred Min: {minPv + minBuffer} | Preferred Max: {maxPv - maxBuffer}</div>
                            <div className={`pt-1.5 border-t ${theme === 'dark' ? 'border-slate-800/60' : 'border-slate-100'} ${sEmerald} font-bold flex justify-between items-center text-xs`}>
                              <span>Final Recommendation:</span>
                              <span className="text-sm">{recommendPv} panels</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Clean Engineering Footer Note */}
          <div className="pt-2 pb-1 text-center text-xs text-slate-500">
            <span>Solar String & MPPT Sizer Pro © 2026 • Professional Engineering Tool</span>
          </div>

        </div>

      </main>
      </>
          )
        ) : (
          <>
            {/* Mounting & Protection Calculator Sub-Navigation Tab Bar */}
            {(activeNavTab === 'mounting_calc' || activeNavTab === 'dc_breaker_calc') && (
              <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pt-4 pb-0 w-full min-w-0">
                <div className={`p-1.5 sm:p-2 rounded-2xl border flex items-center gap-2 overflow-x-auto ${
                  theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <button
                    type="button"
                    onClick={() => handleSelectNavTab('mounting_calc')}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                      activeNavTab === 'mounting_calc'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40'
                        : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {!isPaidUser ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <LayoutGrid className="w-4 h-4 text-blue-400" />}
                    <span>{lang === 'my' ? 'Solar Mounting Calculator (ခေါင်မိုး/အမိုး)' : lang === 'zh' ? 'Solar Mounting Calculator (屋顶支架)' : 'Solar Mounting Calculator (Roof Mount)'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${!isPaidUser ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-200'}`}>
                      {!isPaidUser ? 'PRO' : 'BOQ'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectNavTab('dc_breaker_calc')}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                      activeNavTab === 'dc_breaker_calc'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400/40'
                        : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {!isPaidUser ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Zap className="w-4 h-4 text-amber-300" />}
                    <span>{lang === 'my' ? 'DC Breaker & အကာအကွယ် စနစ် (Fuse, MCB, SPD)' : lang === 'zh' ? '直流断路器与保护计算器' : 'DC Breaker & Protection (Fuse, MCB, SPD)'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${!isPaidUser ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-500/30 text-amber-200 font-black'}`}>
                      {!isPaidUser ? 'PRO' : 'DC PRO'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {!isPaidUser ? (
              <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-5 w-full max-w-full min-w-0 overflow-hidden">
                <MountingCalculatorPaywallGate
                  activeTab={activeNavTab as 'mounting_calc' | 'dc_breaker_calc'}
                  lang={lang}
                  theme={theme}
                  adminContact={adminContact}
                  activeLicense={activeLicense}
                  onOpenActivation={() => setShowLicenseModal(true)}
                  onActivateToken={handleActivateLicense}
                />
              </div>
            ) : activeNavTab === 'mounting_calc' ? (
              <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-5 w-full max-w-full min-w-0 overflow-hidden">
                <SolarMountingCalculator
                  lang={lang}
                  theme={theme}
                  customPanels={customPanels}
                  onUpdateCustomPanels={async (newPanels) => {
                    const sanitized = ensureUniquePanelIds(newPanels);
                    setCustomPanels(sanitized);
                    try {
                      localStorage.setItem('solar_sizer_custom_panels_v3', JSON.stringify(sanitized));
                    } catch (e) {}
                    await saveCustomPanelsToCloud(sanitized);
                  }}
                  onShowToast={(msg) => {
                    setStatusMsg(msg);
                    setTimeout(() => setStatusMsg(null), 3500);
                  }}
                  mountingDatabase={mountingDatabase}
                  onOpenMountingDbModal={() => setShowMountingDbModal(true)}
                />
              </div>
            ) : activeNavTab === 'dc_breaker_calc' ? (
              <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-5 w-full max-w-full min-w-0 overflow-hidden">
                <DCBreakerCalculator
                  lang={lang}
                  theme={theme}
                  customPanels={customPanels}
                  onShowToast={(msg) => {
                    setStatusMsg(msg);
                    setTimeout(() => setStatusMsg(null), 3500);
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* License Activation Modal (Code Entry & Direct Viber / Telegram Purchase) */}
      <LicenseActivationModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        lang={lang}
        theme={theme}
        adminContact={adminContact}
        activeLicense={activeLicense}
        onActivateLicense={handleActivateLicense}
        onDeactivateLicense={handleDeactivateLicense}
        onOpenAdmin={() => {
          setShowLicenseModal(false);
          setShowAdminModal(true);
        }}
      />

      {/* Admin Resources Vault Modal (For Paid Users & Admin) */}
      <ResourcesVaultModal
        isOpen={showResourcesModal}
        onClose={() => setShowResourcesModal(false)}
        lang={lang}
        theme={theme}
        isPaidUser={isPaidUser}
        isAdmin={(() => {
          try {
            return sessionStorage.getItem('solar_sizer_admin_auth') === 'true';
          } catch (e) {
            return false;
          }
        })()}
        resources={adminResources}
        onAddResource={handleAddResource}
        onDeleteResource={handleDeleteResource}
        onOpenPayment={() => {
          setShowResourcesModal(false);
          setShowLicenseModal(true);
        }}
      />

      {/* Brand & Specification Request Sentbox Modal (For Users) */}
      <SpecRequestSentboxModal
        isOpen={showSpecRequestModal}
        onClose={() => setShowSpecRequestModal(false)}
        lang={lang}
        theme={theme}
        requests={specRequests}
        onSubmitRequest={handleSubmitSpecRequest}
        isAdmin={false}
        adminPassword={paymentConfig?.adminPassword || 'Atha2608@'}
        isPaidUser={isPaidUser}
        onOpenPayment={() => {
          setShowSpecRequestModal(false);
          setShowLicenseModal(true);
        }}
      />

      {/* Admin Verification & Management Panel */}
      <AdminPanelModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        lang={lang}
        theme={theme}
        adminContact={adminContact}
        onUpdateAdminContact={handleUpdateAdminContact}
        licenses={allLicenses}
        onRefreshLicenses={handleRefreshLicenses}
        onGenerateLicense={handleGenerateLicense}
        onUnbindLicenseDevice={handleUnbindLicenseDevice}
        onExtendLicense={handleExtendLicense}
        onUpdateLicenseStatus={handleUpdateLicenseStatus}
        onDeleteLicense={handleDeleteLicense}
        onPublishLiveUpdate={handlePublishLiveUpdate}
        isLocked={isPaywallLocked}
        onToggleLock={(locked) => setIsPaywallLocked(locked)}
        resources={adminResources}
        onAddResource={handleAddResource}
        onDeleteResource={handleDeleteResource}
        specRequests={specRequests}
        onUpdateSpecRequestStatus={handleUpdateSpecRequestStatus}
        onDeleteSpecRequest={handleDeleteSpecRequest}
        activePresences={activePresences}
        supabaseConfig={supabaseConfig}
        onUpdateSupabaseConfig={handleUpdateSupabaseConfig}
        customInverters={customInverters}
        onUpdateCustomInverters={handleUpdateCustomInverters}
        customPanels={customPanels}
        onUpdateCustomPanels={handleUpdateCustomPanels}
        customBatteries={customBatteries}
        onUpdateCustomBatteries={handleUpdateCustomBatteries}
        appBranding={appBranding}
        onUpdateAppBranding={handleUpdateAppBranding}
        onShowToast={(msg) => {
          setStatusMsg(msg);
          setTimeout(() => setStatusMsg(null), 4000);
        }}
        onOpenMountingDatabase={() => {
          setShowAdminModal(false);
          setShowMountingDbModal(true);
        }}
      />

      {/* Solar Mounting Database Suite (Roof & Ground Mount) */}
      <MountingDatabaseModal
        isOpen={showMountingDbModal}
        onClose={() => setShowMountingDbModal(false)}
        lang={lang}
        theme={theme}
        database={mountingDatabase}
        onUpdateDatabase={(updatedDb) => {
          setMountingDatabase(updatedDb);
        }}
        onShowToast={(msg) => {
          setStatusMsg(msg);
          setTimeout(() => setStatusMsg(null), 3500);
        }}
        defaultAdminPassword={paymentConfig?.adminPassword || 'Atha2608@'}
      />

      {/* Live Active Users & Connected Devices Modal */}
      <ActiveUsersModal
        isOpen={showActiveUsersModal}
        onClose={() => setShowActiveUsersModal(false)}
        activePresences={activePresences}
        lang={lang}
        theme={theme}
        currentSessionId={getMySessionId()}
      />
    </div>
  );
}

// Minimalist Tooltip helper component
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <HelpCircle className="w-3 h-3 text-slate-500 hover:text-amber-400 cursor-pointer transition-colors" />
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 w-48 p-2 text-[10px] bg-slate-900 text-slate-100 border border-slate-800 rounded-lg shadow-xl pointer-events-none text-left leading-normal"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
