import { PaymentRecord, LicenseToken } from '../types';

// LocalStorage Keys for Google Sheet & Webhook Sync Configuration
const STORAGE_WEBHOOK_URL_KEY = 'solar_pro_google_sheet_webhook_url';
const STORAGE_SPREADSHEET_URL_KEY = 'solar_pro_google_sheet_url';
const STORAGE_SPREADSHEET_NAME_KEY = 'solar_pro_google_sheet_name';
const STORAGE_AUTO_SYNC_KEY = 'solar_pro_google_sheet_auto_sync';

export interface GoogleSheetConfig {
  webhookUrl: string | null;
  spreadsheetUrl: string | null;
  spreadsheetName: string | null;
  autoSyncOnApproval: boolean;
}

/**
 * Standard 1-click Google Apps Script template for Google Sheet
 * Supports DUAL TABS:
 * 1. "PRO Licenses" - Buyer license keys, links, allowed devices, expiry & activations
 * 2. "Payments" - Payment receipts, slips, transaction digits, & approvals
 * Free, permanent, zero popups, zero Firebase dependency!
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    if (data.action === "test") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Connected to " + ss.getName() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Determine target sheet tab based on action
    var isLicense = data.action === "append_license" || data.action === "sync_licenses" || data.sheetName === "PRO Licenses";
    var sheetName = isLicense ? "PRO Licenses" : "Payments";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Auto-create Header if sheet is empty
    if (sheet.getLastRow() === 0) {
      if (isLicense) {
        sheet.appendRow([
          "No.",
          "Created Date & Time",
          "Customer Name / Phone",
          "Package Duration",
          "Allowed Devices",
          "License Key / Token",
          "One-Click Activation Link",
          "Status",
          "Expiration Date",
          "Bound / Activated Devices",
          "Last Seen Date",
          "Admin Note"
        ]);
        sheet.getRange(1, 1, 1, 12).setBackground("#DBEAFE").setFontWeight("bold").setFontColor("#1E3A8A");
        sheet.setFrozenRows(1);
      } else {
        sheet.appendRow([
          "No.",
          "Submitted Date & Time",
          "Approval Date & Time",
          "Customer Name",
          "Customer Phone",
          "Payment Method (KPay / Wave)",
          "Transaction ID (Last 6 Digits)",
          "Plan Duration",
          "Amount (MMK)",
          "Status",
          "Merchant Account",
          "Customer Device",
          "Note / Slip"
        ]);
        sheet.getRange(1, 1, 1, 13).setBackground("#FDE68A").setFontWeight("bold").setFontColor("#78350F");
        sheet.setFrozenRows(1);
      }
    }

    if (data.values) {
      sheet.appendRow(data.values);
    } else if (data.rows && Array.isArray(data.rows)) {
      data.rows.forEach(function(row) {
        sheet.appendRow(row);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", sheet: sheetName, rowCount: sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

/**
 * Get stored Google Sheet & Webhook configuration
 */
export const getStoredSheetConfig = (): GoogleSheetConfig => {
  try {
    return {
      webhookUrl: localStorage.getItem(STORAGE_WEBHOOK_URL_KEY),
      spreadsheetUrl: localStorage.getItem(STORAGE_SPREADSHEET_URL_KEY),
      spreadsheetName: localStorage.getItem(STORAGE_SPREADSHEET_NAME_KEY) || 'Solar Pro - Customer Payment Records',
      autoSyncOnApproval: localStorage.getItem(STORAGE_AUTO_SYNC_KEY) !== 'false'
    };
  } catch (e) {
    return { webhookUrl: null, spreadsheetUrl: null, spreadsheetName: null, autoSyncOnApproval: true };
  }
};

/**
 * Save Google Sheet configuration
 */
export const saveStoredSheetConfig = (config: Partial<GoogleSheetConfig>) => {
  try {
    if (config.webhookUrl !== undefined) {
      if (config.webhookUrl) localStorage.setItem(STORAGE_WEBHOOK_URL_KEY, config.webhookUrl);
      else localStorage.removeItem(STORAGE_WEBHOOK_URL_KEY);
    }
    if (config.spreadsheetUrl !== undefined) {
      if (config.spreadsheetUrl) localStorage.setItem(STORAGE_SPREADSHEET_URL_KEY, config.spreadsheetUrl);
      else localStorage.removeItem(STORAGE_SPREADSHEET_URL_KEY);
    }
    if (config.spreadsheetName !== undefined) {
      if (config.spreadsheetName) localStorage.setItem(STORAGE_SPREADSHEET_NAME_KEY, config.spreadsheetName);
      else localStorage.removeItem(STORAGE_SPREADSHEET_NAME_KEY);
    }
    if (config.autoSyncOnApproval !== undefined) {
      localStorage.setItem(STORAGE_AUTO_SYNC_KEY, config.autoSyncOnApproval ? 'true' : 'false');
    }

    // Sync to backend server so Telegram Bot can auto-post to Google Sheet as well
    fetch('/api/sheet-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: config.webhookUrl !== undefined ? config.webhookUrl : localStorage.getItem(STORAGE_WEBHOOK_URL_KEY) || '',
        spreadsheetUrl: config.spreadsheetUrl !== undefined ? config.spreadsheetUrl : localStorage.getItem(STORAGE_SPREADSHEET_URL_KEY) || '',
        spreadsheetName: config.spreadsheetName !== undefined ? config.spreadsheetName : localStorage.getItem(STORAGE_SPREADSHEET_NAME_KEY) || '',
        autoSyncOnApproval: config.autoSyncOnApproval !== undefined ? config.autoSyncOnApproval : true
      })
    }).catch(() => {});
  } catch (e) {
    console.error('Failed to save sheet config', e);
  }
};

/**
 * Format a PaymentRecord into a clean Google Sheet Row
 */
export const formatPaymentRecordRow = (record: PaymentRecord, index?: number): (string | number)[] => {
  const submitDateStr = record.submittedAt 
    ? new Date(record.submittedAt).toLocaleString('en-US', { hour12: true })
    : '';
  const approveDateStr = record.approvedAt 
    ? new Date(record.approvedAt).toLocaleString('en-US', { hour12: true })
    : 'Pending Approval';

  const methodDisplay = record.method?.toLowerCase().includes('wave')
    ? 'WavePay'
    : record.method?.toLowerCase().includes('kpay') || record.method?.toLowerCase().includes('kbz')
    ? 'KBZPay (KPay)'
    : record.method || 'KPay';

  return [
    index !== undefined ? index + 1 : `#${record.id.slice(-5).toUpperCase()}`,
    submitDateStr,
    approveDateStr,
    record.customerName || 'N/A',
    record.customerPhone || 'N/A',
    methodDisplay,
    record.transactionDigits ? `'#${record.transactionDigits}` : 'N/A',
    record.planName || (record.planDuration ? record.planDuration.replace('_', ' ').toUpperCase() : '1 Month'),
    record.amount,
    (record.status || 'pending').toUpperCase(),
    record.accountPayName || (record.merchantName ? `${record.merchantName} (${record.merchantPhone})` : 'Merchant Account'),
    record.device || 'Web Browser',
    record.slipImage ? 'Attached Slip [Image]' : (record.note || '')
  ];
};

/**
 * Append a Payment Record directly to the user's Google Sheet via Webhook
 * Called automatically when Admin accepts/approves a customer payment!
 */
export const appendPaymentRecordToSheet = async (
  record: PaymentRecord
): Promise<{ success: boolean; spreadsheetUrl?: string; error?: string }> => {
  const config = getStoredSheetConfig();
  
  if (!config.webhookUrl) {
    // Webhook not configured yet; return gracefully
    return {
      success: false,
      error: 'Google Sheet Webhook URL မထည့်ရသေးပါ။ Admin Panel > Payments တွင် Webhook URL ထည့်သွင်းပေးပါခင်ဗျာ။'
    };
  }

  try {
    const row = formatPaymentRecordRow(record);
    const payload = {
      action: 'append_payment',
      record: {
        id: record.id,
        transactionDigits: record.transactionDigits,
        method: record.method,
        customerName: record.customerName,
        customerPhone: record.customerPhone,
        amount: record.amount,
        submittedAt: record.submittedAt,
        approvedAt: record.approvedAt,
        status: record.status
      },
      values: row
    };

    // Google Apps Script requires mode: 'no-cors' from browser to avoid CORS redirect rejection
    await fetch(config.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      spreadsheetUrl: config.spreadsheetUrl || undefined
    };
  } catch (err: any) {
    console.error('Error posting to Google Sheet Webhook:', err);
    return {
      success: false,
      error: err?.message || 'Failed to send to Google Sheet'
    };
  }
};

/**
 * Sync All Existing Payment Records to Google Sheet via Webhook
 */
export const syncAllRecordsToGoogleSheet = async (
  records: PaymentRecord[]
): Promise<{ success: boolean; syncedCount: number; spreadsheetUrl?: string; error?: string }> => {
  const config = getStoredSheetConfig();

  if (!config.webhookUrl) {
    throw new Error('Google Sheet Webhook URL မထည့်ရသေးပါ။ ကျေးဇူးပြု၍ Webhook URL အရင်ထည့်သွင်းပေးပါ။');
  }

  if (!records || records.length === 0) {
    return {
      success: true,
      syncedCount: 0,
      spreadsheetUrl: config.spreadsheetUrl || undefined
    };
  }

  try {
    const rows = records.map((rec, idx) => formatPaymentRecordRow(rec, idx));
    const payload = {
      action: 'batch_append',
      rows
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      syncedCount: records.length,
      spreadsheetUrl: config.spreadsheetUrl || undefined
    };
  } catch (err: any) {
    console.error('Failed to sync all records to Google Sheet:', err);
    return {
      success: false,
      syncedCount: 0,
      error: err?.message || 'Failed to sync'
    };
  }
};

/**
 * Test Google Sheet Webhook Connection
 */
export const testGoogleSheetWebhook = async (webhookUrl: string): Promise<boolean> => {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' })
    });
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Export Payment Records directly as CSV for Google Sheets
 */
export const exportPaymentRecordsAsCSV = (records: PaymentRecord[]) => {
  const headers = [
    'No',
    'Submitted Date & Time',
    'Approval Date & Time',
    'Customer Name',
    'Customer Phone',
    'Payment Method',
    'Transaction ID',
    'Plan Duration',
    'Amount (MMK)',
    'Status',
    'Merchant Account',
    'Device',
    'Note'
  ];

  const rows = records.map((r, i) => {
    const row = formatPaymentRecordRow(r, i);
    return row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SolarPro_Payment_Records_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Format Duration string into human-readable text
 */
export const formatDurationText = (duration: string | undefined): string => {
  switch (duration) {
    case '1_week':
      return '1 Week (7 Days)';
    case '1_month':
      return '1 Month (30 Days)';
    case '3_months':
      return '3 Months (90 Days)';
    case '6_months':
      return '6 Months (180 Days)';
    case '1_year':
      return '1 Year (365 Days)';
    case 'lifetime':
      return 'Lifetime (10 Years)';
    default:
      return duration ? duration.replace(/_/g, ' ').toUpperCase() : '1 Month (30 Days)';
  }
};

/**
 * Format a LicenseToken into a Google Sheet Row for the "PRO Licenses" tab
 * Columns:
 * 1. No.
 * 2. Created Date & Time
 * 3. Customer Name / Phone
 * 4. Package Duration
 * 5. Allowed Devices
 * 6. License Key / Token
 * 7. One-Click Activation Link
 * 8. Status
 * 9. Expiration Date
 * 10. Bound / Activated Devices
 * 11. Last Seen Date
 * 12. Admin Note
 */
export const formatLicenseRecordRow = (
  license: LicenseToken,
  index?: number,
  appUrl?: string
): (string | number)[] => {
  const createdDateStr = license.createdAt
    ? new Date(license.createdAt).toLocaleString('en-US', { hour12: true })
    : '';

  const expiresDateStr = license.expiresAt
    ? new Date(license.expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'No Expiry';

  const baseUrl = appUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const activationLink = `${baseUrl}/?license=${license.token}`;

  const boundDevicesList = Array.isArray(license.boundDevices) && license.boundDevices.length > 0
    ? license.boundDevices
        .map(
          (d) =>
            `${d.deviceModel || 'Device'} (${d.deviceId.slice(0, 8)}) - ${
              d.activatedAt ? new Date(d.activatedAt).toLocaleDateString() : 'Active'
            }`
        )
        .join('; ')
    : 'Not Activated Yet (Pending)';

  const lastSeenStr = Array.isArray(license.boundDevices) && license.boundDevices.length > 0
    ? license.boundDevices
        .map((d) => d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : '')
        .filter(Boolean)
        .join(', ') || 'N/A'
    : 'Never';

  const statusLabel =
    license.status === 'revoked'
      ? 'REVOKED (ပိတ်ထားသည်)'
      : license.status === 'expired' || new Date(license.expiresAt).getTime() < Date.now()
      ? 'EXPIRED (သက်တမ်းကုန်)'
      : license.boundDevices && license.boundDevices.length > 0
      ? `ACTIVE (${license.boundDevices.length}/${license.deviceLimit} Device Activated)`
      : 'ACTIVE (Pending Activation)';

  return [
    index !== undefined ? index + 1 : `#${license.token.slice(-6)}`,
    createdDateStr,
    license.customerName || 'N/A',
    formatDurationText(license.duration),
    license.deviceLimit === 2 ? '2 Devices (စက် ၂ လုံး)' : '1 Device (စက် ၁ လုံး)',
    `'${license.token}`,
    activationLink,
    statusLabel,
    expiresDateStr,
    boundDevicesList,
    lastSeenStr,
    license.note || ''
  ];
};

/**
 * Append a Buyer License Record directly to Google Sheet via Webhook
 * Triggered automatically upon generating or activating a PRO license!
 */
export const appendLicenseRecordToSheet = async (
  license: LicenseToken,
  appUrl?: string
): Promise<{ success: boolean; spreadsheetUrl?: string; error?: string }> => {
  const config = getStoredSheetConfig();

  if (!config.webhookUrl) {
    return {
      success: false,
      error: 'Google Sheet Webhook URL မထည့်ရသေးပါ။ Settings > Google Sheet တွင် Webhook URL ထည့်သွင်းပေးပါခင်ဗျာ။'
    };
  }

  try {
    const row = formatLicenseRecordRow(license, undefined, appUrl);
    const payload = {
      action: 'append_license',
      sheetName: 'PRO Licenses',
      license: {
        token: license.token,
        customerName: license.customerName,
        duration: license.duration,
        deviceLimit: license.deviceLimit,
        createdAt: license.createdAt,
        expiresAt: license.expiresAt,
        status: license.status,
        boundDevicesCount: license.boundDevices?.length || 0
      },
      values: row
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      spreadsheetUrl: config.spreadsheetUrl || undefined
    };
  } catch (err: any) {
    console.error('Error posting license to Google Sheet:', err);
    return {
      success: false,
      error: err?.message || 'Failed to post license to Google Sheet'
    };
  }
};

/**
 * Sync All Existing Buyer Licenses to Google Sheet via Webhook
 */
export const syncAllLicensesToGoogleSheet = async (
  licenses: LicenseToken[],
  appUrl?: string
): Promise<{ success: boolean; syncedCount: number; spreadsheetUrl?: string; error?: string }> => {
  const config = getStoredSheetConfig();

  if (!config.webhookUrl) {
    throw new Error('Google Sheet Webhook URL မထည့်ရသေးပါ။ ကျေးဇူးပြု၍ Settings တွင် Webhook URL အရင်ထည့်သွင်းပေးပါ။');
  }

  if (!licenses || licenses.length === 0) {
    return {
      success: true,
      syncedCount: 0,
      spreadsheetUrl: config.spreadsheetUrl || undefined
    };
  }

  try {
    const rows = licenses.map((lic, idx) => formatLicenseRecordRow(lic, idx, appUrl));
    const payload = {
      action: 'sync_licenses',
      sheetName: 'PRO Licenses',
      rows
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      syncedCount: licenses.length,
      spreadsheetUrl: config.spreadsheetUrl || undefined
    };
  } catch (err: any) {
    console.error('Failed to sync all licenses to Google Sheet:', err);
    return {
      success: false,
      syncedCount: 0,
      error: err?.message || 'Failed to sync licenses'
    };
  }
};

/**
 * Export PRO Buyer Licenses directly as CSV for Google Sheets or Excel
 */
export const exportLicensesAsCSV = (licenses: LicenseToken[], appUrl?: string) => {
  const headers = [
    'No',
    'Created Date & Time',
    'Customer Name / Phone',
    'Package Duration',
    'Allowed Devices',
    'License Key / Token',
    'One-Click Activation Link',
    'Status',
    'Expiration Date',
    'Bound / Activated Devices',
    'Last Seen Date',
    'Admin Note'
  ];

  const rows = licenses.map((lic, i) => {
    const row = formatLicenseRecordRow(lic, i, appUrl);
    return row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SolarPro_Buyer_Licenses_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

