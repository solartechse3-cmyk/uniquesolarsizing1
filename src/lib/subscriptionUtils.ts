import { useState, useEffect } from 'react';
import { SubscriptionDuration, DurationPackage, PaymentRecord } from '../types';

export type { SubscriptionDuration };

export const DEFAULT_DURATION_PACKAGES: DurationPackage[] = [
  {
    id: '1_week',
    months: 0.25,
    labelEn: '1 Week Access',
    labelMy: '၁ ပတ် သက်တမ်း',
    labelZh: '1周会员',
    price: 3000,
    discountPercent: 0
  },
  {
    id: '1_month',
    months: 1,
    labelEn: '1 Month Access',
    labelMy: '၁ လ သက်တမ်း',
    labelZh: '1个月会员',
    price: 10000,
    tagEn: 'Standard',
    tagMy: 'အခြေခံ',
    discountPercent: 0
  },
  {
    id: '3_months',
    months: 3,
    labelEn: '3 Months Access',
    labelMy: '၃ လ သက်တမ်း',
    labelZh: '3个月会员',
    price: 25000,
    tagEn: 'Popular',
    tagMy: 'လူကြိုက်များ',
    discountPercent: 17
  }
];

/**
 * Calculates future expiration date ISO string based on duration
 */
export function calculateExpirationDate(
  startDate: Date | string = new Date(),
  duration: SubscriptionDuration | number = '1_month',
  customDate?: string
): string {
  if (customDate) {
    return new Date(customDate).toISOString();
  }

  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const result = new Date(start.getTime());

  if (typeof duration === 'number') {
    result.setMonth(result.getMonth() + duration);
    return result.toISOString();
  }

  switch (duration) {
    case '1_week':
      result.setDate(result.getDate() + 7);
      break;
    case '1_month':
      result.setMonth(result.getMonth() + 1);
      break;
    case '3_months':
      result.setMonth(result.getMonth() + 3);
      break;
    case '6_months':
      result.setMonth(result.getMonth() + 6);
      break;
    case '1_year':
      result.setFullYear(result.getFullYear() + 1);
      break;
    case 'lifetime':
      result.setFullYear(result.getFullYear() + 100);
      break;
    default:
      result.setMonth(result.getMonth() + 1);
  }

  return result.toISOString();
}

/**
 * Calculates extended expiration date (stacks on top of existing active subscription or starts from now)
 */
export function calculateExtendedExpirationDate(
  currentExpiresAt?: string,
  duration: SubscriptionDuration | number = '1_month',
  customDate?: string
): string {
  if (customDate) return new Date(customDate).toISOString();

  let baseDate = new Date();
  if (currentExpiresAt) {
    const existingDate = new Date(currentExpiresAt);
    if (!isNaN(existingDate.getTime()) && existingDate.getTime() > Date.now()) {
      baseDate = existingDate;
    }
  }

  return calculateExpirationDate(baseDate, duration);
}

/**
 * Checks whether a payment record is approved and currently active (not expired)
 */
export function isSubscriptionActive(record: PaymentRecord | null | undefined): boolean {
  if (!record || record.status !== 'approved') return false;
  if (!record.expiresAt) return true; // Legacy records with no expiry treated as lifetime active
  
  const expiryTime = new Date(record.expiresAt).getTime();
  return expiryTime > Date.now();
}

/**
 * Checks whether an approved payment record has expired
 */
export function isSubscriptionExpired(record: PaymentRecord | null | undefined): boolean {
  if (!record || record.status !== 'approved') return false;
  if (!record.expiresAt) return false;
  
  const expiryTime = new Date(record.expiresAt).getTime();
  return expiryTime <= Date.now();
}

/**
 * Formats duration key into human readable text
 */
export function formatDurationLabel(
  duration: SubscriptionDuration | undefined,
  lang: 'en' | 'my' | 'zh' = 'my'
): string {
  if (!duration) return lang === 'my' ? '၁ လ သက်တမ်း' : '1 Month';

  switch (duration) {
    case '1_week':
      return lang === 'my' ? '၁ ပတ် သက်တမ်း' : lang === 'zh' ? '1周会员' : '1 Week Plan';
    case '1_month':
      return lang === 'my' ? '၁ လ သက်တမ်း' : lang === 'zh' ? '1个月会员' : '1 Month Plan';
    case '3_months':
      return lang === 'my' ? '၃ လ သက်တမ်း' : lang === 'zh' ? '3个月会员' : '3 Months Plan';
    case '6_months':
      return lang === 'my' ? '၆ လ သက်တမ်း' : lang === 'zh' ? '6个月会员' : '6 Months Plan';
    case '1_year':
      return lang === 'my' ? '၁ နှစ် သက်တမ်း' : lang === 'zh' ? '1年会员' : '1 Year Plan';
    case 'lifetime':
      return lang === 'my' ? 'တစ်သက်တာ သက်တမ်း' : lang === 'zh' ? '永久会员' : 'Lifetime Access';
    case 'custom':
      return lang === 'my' ? 'စိတ်ကြိုက် သက်တမ်း' : lang === 'zh' ? '自定义期限' : 'Custom Duration';
    default:
      return duration;
  }
}

/**
 * Formats full subscription date and time with localization
 */
export function formatSubscriptionExpiryDateTime(
  expiresAt?: string,
  lang: 'en' | 'my' | 'zh' = 'my'
): string {
  if (!expiresAt) {
    return lang === 'my' ? 'တစ်သက်တာ (Lifetime)' : lang === 'zh' ? '永久有效' : 'Lifetime Access';
  }

  try {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime())) return expiresAt;

    // Formatting date and time
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? (lang === 'my' ? 'ညနေ' : lang === 'zh' ? '下午' : 'PM') : (lang === 'my' ? 'မနက်' : lang === 'zh' ? '上午' : 'AM');
    const displayHours = hours % 12 || 12;

    if (lang === 'my') {
      return `${year}-${month}-${day} (${ampm} ${displayHours}:${minutes} နာရီ)`;
    } else if (lang === 'zh') {
      return `${year}年${month}月${day}日 ${ampm} ${displayHours}:${minutes}`;
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[d.getMonth()]} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`;
    }
  } catch (e) {
    return expiresAt;
  }
}

export interface RemainingSubscriptionInfo {
  isExpired: boolean;
  isNearExpiry: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  text: string;
  liveTimerText: string;
  fullText: string;
  badgeText: string;
  validUntilDateTime: string;
  percentRemaining: number;
  countdownParts: {
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
}

/**
 * Returns remaining days, hours, minutes, seconds and human friendly formatted string (Live decreasing)
 */
export function getRemainingSubscriptionTime(
  expiresAt?: string,
  lang: 'en' | 'my' | 'zh' = 'my'
): RemainingSubscriptionInfo {
  if (!expiresAt) {
    return {
      isExpired: false,
      isNearExpiry: false,
      days: 999,
      hours: 0,
      minutes: 0,
      seconds: 0,
      text: lang === 'my' ? 'တစ်သက်တာ' : 'Lifetime',
      liveTimerText: lang === 'my' ? 'တစ်သက်တာ သက်တမ်း' : 'Lifetime Access',
      fullText: lang === 'my' ? 'တစ်သက်တာ အသုံးပြုခွင့်' : 'Lifetime Access',
      badgeText: 'Lifetime',
      validUntilDateTime: lang === 'my' ? 'တစ်သက်တာ (Lifetime)' : 'Lifetime',
      percentRemaining: 100,
      countdownParts: {
        days: '∞',
        hours: '00',
        minutes: '00',
        seconds: '00'
      }
    };
  }

  const now = Date.now();
  const expiryTime = new Date(expiresAt).getTime();
  const diffMs = expiryTime - now;
  const validUntilDateTime = formatSubscriptionExpiryDateTime(expiresAt, lang);

  if (diffMs <= 0) {
    return {
      isExpired: true,
      isNearExpiry: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      text: lang === 'my' ? 'သက်တမ်းကုန်ဆုံး' : lang === 'zh' ? '已到期' : 'Expired',
      liveTimerText: lang === 'my' ? 'သက်တမ်း ကုန်ဆုံးပါပြီ' : 'Expired',
      fullText: lang === 'my' 
        ? `သက်တမ်း ကုန်ဆုံးသွားပါပြီ (${validUntilDateTime} တွင် ကုန်ဆုံးခဲ့သည်)` 
        : lang === 'zh' 
        ? `会员已到期（已于 ${validUntilDateTime} 到期）` 
        : `Subscription Expired (Ended on ${validUntilDateTime})`,
      badgeText: lang === 'my' ? 'သက်တမ်းကုန် (Free)' : 'Expired (Free)',
      validUntilDateTime,
      percentRemaining: 0,
      countdownParts: {
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00'
      }
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  const countdownParts = {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds)
  };

  let text = '';
  let liveTimerText = '';
  let badgeText = '';

  if (days > 0) {
    text = lang === 'my' 
      ? `${days} ရက် ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` 
      : lang === 'zh' 
      ? `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` 
      : `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    
    liveTimerText = lang === 'my'
      ? `${days} ရက် ${hours} နာရီ ${minutes} မိနစ် ${seconds} စက္ကန့်`
      : `${days}d ${hours}h ${minutes}m ${seconds}s`;

    badgeText = lang === 'my' ? `${days} ရက်ကျန်` : `${days}d left`;
  } else if (hours > 0) {
    text = lang === 'my' 
      ? `${hours} နာရီ ${pad(minutes)}:${pad(seconds)}` 
      : lang === 'zh' 
      ? `${hours}小时 ${pad(minutes)}:${pad(seconds)}` 
      : `${hours}h ${pad(minutes)}:${pad(seconds)}`;

    liveTimerText = lang === 'my'
      ? `${hours} နာရီ ${minutes} မိနစ် ${seconds} စက္ကန့်`
      : `${hours}h ${minutes}m ${seconds}s`;

    badgeText = lang === 'my' ? `${hours} နာရီကျန်` : `${hours}h left`;
  } else {
    text = lang === 'my' 
      ? `${minutes} မိနစ် ${pad(seconds)} စက္ကန့်` 
      : lang === 'zh' 
      ? `${minutes}分 ${pad(seconds)}秒` 
      : `${minutes}m ${pad(seconds)}s`;

    liveTimerText = text;
    badgeText = lang === 'my' ? `${minutes} မိနစ်ကျန်` : `${minutes}m left`;
  }

  const fullText = lang === 'my'
    ? `ကျန်ရှိသော သက်တမ်း: ${liveTimerText} (သက်တမ်းကုန်ဆုံးမည့် အချိန်: ${validUntilDateTime})`
    : lang === 'zh'
    ? `会员剩余有效时长: ${liveTimerText} (有效截止时间: ${validUntilDateTime})`
    : `Time Remaining: ${liveTimerText} (Valid until: ${validUntilDateTime})`;

  const isNearExpiry = days <= 2;

  return {
    isExpired: false,
    isNearExpiry,
    days,
    hours,
    minutes,
    seconds,
    text,
    liveTimerText,
    fullText,
    badgeText,
    validUntilDateTime,
    percentRemaining: Math.min(100, Math.max(5, Math.round((days / 30) * 100))),
    countdownParts
  };
}

/**
 * Custom React Hook for live real-time ticking decreasing countdown
 */
export function useSubscriptionCountdown(
  expiresAt?: string,
  lang: 'en' | 'my' | 'zh' = 'my'
): RemainingSubscriptionInfo {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      setTick(t => (t + 1) % 100000);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return getRemainingSubscriptionTime(expiresAt, lang);
}
