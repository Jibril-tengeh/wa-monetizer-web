export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  countryCode: string;
  countryName: string;
  flag: string;
  dialCode: string;
  rateFromGHS: number; // 1 GHS in this currency
  decimals: number;
  paymentChannels: ('mobile_money' | 'card' | 'bank')[];
  momoProviders?: { id: string; name: string }[];
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  GHS: {
    code: 'GHS',
    name: 'Cedi Ghanéen',
    symbol: 'GH₵',
    countryCode: 'GH',
    countryName: 'Ghana',
    flag: '🇬🇭',
    dialCode: '+233',
    rateFromGHS: 1.0,
    decimals: 2,
    paymentChannels: ['mobile_money', 'card'],
    momoProviders: [
      { id: 'mtn', name: 'MTN MoMo' },
      { id: 'vodafone', name: 'Telecel Cash (Vodafone)' },
      { id: 'airteltigo', name: 'AirtelTigo Money' }
    ]
  },
  XOF: {
    code: 'XOF',
    name: 'Franc CFA (UEMOA)',
    symbol: 'F.CFA',
    countryCode: 'CI',
    countryName: "Côte d'Ivoire",
    flag: '🇨🇮',
    dialCode: '+225',
    rateFromGHS: 42.0,
    decimals: 0,
    paymentChannels: ['mobile_money', 'card'],
    momoProviders: [
      { id: 'wave', name: 'Wave CI / SN' },
      { id: 'orange', name: 'Orange Money' },
      { id: 'mtn', name: 'MTN MoMo' },
      { id: 'moov', name: 'Moov Africa' }
    ]
  },
  XAF: {
    code: 'XAF',
    name: 'Franc CFA (CEMAC)',
    symbol: 'FCFA',
    countryCode: 'CM',
    countryName: 'Cameroun',
    flag: '🇨🇲',
    dialCode: '+237',
    rateFromGHS: 42.0,
    decimals: 0,
    paymentChannels: ['mobile_money', 'card'],
    momoProviders: [
      { id: 'mtn', name: 'MTN MoMo CM' },
      { id: 'orange', name: 'Orange Money CM' }
    ]
  },
  NGN: {
    code: 'NGN',
    name: 'Naira Nigérian',
    symbol: '₦',
    countryCode: 'NG',
    countryName: 'Nigeria',
    flag: '🇳🇬',
    dialCode: '+234',
    rateFromGHS: 105.0,
    decimals: 0,
    paymentChannels: ['mobile_money', 'card', 'bank'],
    momoProviders: [
      { id: 'opay', name: 'OPay' },
      { id: 'palmpay', name: 'PalmPay' },
      { id: 'bank', name: 'Virement Bancaire / USSD' }
    ]
  },
  KES: {
    code: 'KES',
    name: 'Shilling Kényan',
    symbol: 'KSh',
    countryCode: 'KE',
    countryName: 'Kenya',
    flag: '🇰🇪',
    dialCode: '+254',
    rateFromGHS: 8.8,
    decimals: 0,
    paymentChannels: ['mobile_money', 'card'],
    momoProviders: [
      { id: 'mpesa', name: 'Safaricom M-Pesa' },
      { id: 'airtel', name: 'Airtel Money' }
    ]
  },
  ZAR: {
    code: 'ZAR',
    name: 'Rand Sud-Africain',
    symbol: 'R',
    countryCode: 'ZA',
    countryName: 'Afrique du Sud',
    flag: '🇿🇦',
    dialCode: '+27',
    rateFromGHS: 1.25,
    decimals: 2,
    paymentChannels: ['card', 'bank'],
    momoProviders: []
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    countryCode: 'FR',
    countryName: 'France & Zone Euro',
    flag: '🇪🇺',
    dialCode: '+33',
    rateFromGHS: 0.062,
    decimals: 2,
    paymentChannels: ['card'],
    momoProviders: []
  },
  USD: {
    code: 'USD',
    name: 'Dollar US',
    symbol: '$',
    countryCode: 'US',
    countryName: 'États-Unis / International',
    flag: '🇺🇸',
    dialCode: '+1',
    rateFromGHS: 0.068,
    decimals: 2,
    paymentChannels: ['card'],
    momoProviders: []
  },
  GBP: {
    code: 'GBP',
    name: 'Livre Sterling',
    symbol: '£',
    countryCode: 'GB',
    countryName: 'Royaume-Uni',
    flag: '🇬🇧',
    dialCode: '+44',
    rateFromGHS: 0.053,
    decimals: 2,
    paymentChannels: ['card'],
    momoProviders: []
  },
  RWF: {
    code: 'RWF',
    name: 'Franc Rwandais',
    symbol: 'FRw',
    countryCode: 'RW',
    countryName: 'Rwanda',
    flag: '🇷🇼',
    dialCode: '+250',
    rateFromGHS: 92.0,
    decimals: 0,
    paymentChannels: ['mobile_money', 'card'],
    momoProviders: [
      { id: 'mtn', name: 'MTN Mobile Money RW' },
      { id: 'airtel', name: 'Airtel Money RW' }
    ]
  },
  CDF: {
    code: 'CDF',
    name: 'Franc Congolais',
    symbol: 'FC',
    countryCode: 'CD',
    countryName: 'RD Congo',
    flag: '🇨🇩',
    dialCode: '+243',
    rateFromGHS: 195.0,
    decimals: 0,
    paymentChannels: ['mobile_money', 'card'],
    momoProviders: [
      { id: 'mpesa', name: 'Vodacom M-Pesa' },
      { id: 'orange', name: 'Orange Money CD' },
      { id: 'airtel', name: 'Airtel Money CD' }
    ]
  },
  MAD: {
    code: 'MAD',
    name: 'Dirham Marocain',
    symbol: 'DH',
    countryCode: 'MA',
    countryName: 'Maroc',
    flag: '🇲🇦',
    dialCode: '+212',
    rateFromGHS: 0.68,
    decimals: 2,
    paymentChannels: ['card'],
    momoProviders: []
  }
};

/**
 * Mapping table from Country Code to default Currency Code
 */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  GH: 'GHS',
  CI: 'XOF',
  SN: 'XOF',
  BJ: 'XOF',
  TG: 'XOF',
  BF: 'XOF',
  ML: 'XOF',
  NE: 'XOF',
  GW: 'XOF',
  CM: 'XAF',
  GA: 'XAF',
  CG: 'XAF',
  TD: 'XAF',
  CF: 'XAF',
  GQ: 'XAF',
  NG: 'NGN',
  KE: 'KES',
  ZA: 'ZAR',
  RW: 'RWF',
  CD: 'CDF',
  MA: 'MAD',
  FR: 'EUR',
  BE: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  US: 'USD',
  CA: 'USD',
  GB: 'GBP'
};

/**
 * Timezone prefix to country code mapping for instant zero-latency client detection
 */
export const TIMEZONE_TO_COUNTRY: Record<string, { countryCode: string; currency: string; dialCode: string; countryName: string; flag: string }> = {
  'Africa/Accra': { countryCode: 'GH', currency: 'GHS', dialCode: '+233', countryName: 'Ghana', flag: '🇬🇭' },
  'Africa/Abidjan': { countryCode: 'CI', currency: 'XOF', dialCode: '+225', countryName: "Côte d'Ivoire", flag: '🇨🇮' },
  'Africa/Dakar': { countryCode: 'SN', currency: 'XOF', dialCode: '+221', countryName: 'Sénégal', flag: '🇸🇳' },
  'Africa/Lome': { countryCode: 'TG', currency: 'XOF', dialCode: '+228', countryName: 'Togo', flag: '🇹🇬' },
  'Africa/Porto-Novo': { countryCode: 'BJ', currency: 'XOF', dialCode: '+229', countryName: 'Bénin', flag: '🇧🇯' },
  'Africa/Ouagadougou': { countryCode: 'BF', currency: 'XOF', dialCode: '+226', countryName: 'Burkina Faso', flag: '🇧🇫' },
  'Africa/Bamako': { countryCode: 'ML', currency: 'XOF', dialCode: '+223', countryName: 'Mali', flag: '🇲🇱' },
  'Africa/Niamey': { countryCode: 'NE', currency: 'XOF', dialCode: '+227', countryName: 'Niger', flag: '🇳🇪' },
  'Africa/Douala': { countryCode: 'CM', currency: 'XAF', dialCode: '+237', countryName: 'Cameroun', flag: '🇨🇲' },
  'Africa/Libreville': { countryCode: 'GA', currency: 'XAF', dialCode: '+241', countryName: 'Gabon', flag: '🇬🇦' },
  'Africa/Brazzaville': { countryCode: 'CG', currency: 'XAF', dialCode: '+242', countryName: 'Congo', flag: '🇨🇬' },
  'Africa/Ndjamena': { countryCode: 'TD', currency: 'XAF', dialCode: '+235', countryName: 'Tchad', flag: '🇹🇩' },
  'Africa/Lagos': { countryCode: 'NG', currency: 'NGN', dialCode: '+234', countryName: 'Nigeria', flag: '🇳🇬' },
  'Africa/Nairobi': { countryCode: 'KE', currency: 'KES', dialCode: '+254', countryName: 'Kenya', flag: '🇰🇪' },
  'Africa/Johannesburg': { countryCode: 'ZA', currency: 'ZAR', dialCode: '+27', countryName: 'Afrique du Sud', flag: '🇿🇦' },
  'Africa/Kigali': { countryCode: 'RW', currency: 'RWF', dialCode: '+250', countryName: 'Rwanda', flag: '🇷🇼' },
  'Africa/Kinshasa': { countryCode: 'CD', currency: 'CDF', dialCode: '+243', countryName: 'RD Congo', flag: '🇨🇩' },
  'Africa/Lubumbashi': { countryCode: 'CD', currency: 'CDF', dialCode: '+243', countryName: 'RD Congo', flag: '🇨🇩' },
  'Africa/Casablanca': { countryCode: 'MA', currency: 'MAD', dialCode: '+212', countryName: 'Maroc', flag: '🇲🇦' },
  'Europe/Paris': { countryCode: 'FR', currency: 'EUR', dialCode: '+33', countryName: 'France', flag: '🇫🇷' },
  'Europe/Brussels': { countryCode: 'BE', currency: 'EUR', dialCode: '+32', countryName: 'Belgique', flag: '🇧🇪' },
  'Europe/London': { countryCode: 'GB', currency: 'GBP', dialCode: '+44', countryName: 'Royaume-Uni', flag: '🇬🇧' },
  'Europe/Berlin': { countryCode: 'DE', currency: 'EUR', dialCode: '+49', countryName: 'Allemagne', flag: '🇩🇪' },
  'Europe/Madrid': { countryCode: 'ES', currency: 'EUR', dialCode: '+34', countryName: 'Espagne', flag: '🇪🇸' },
  'Europe/Rome': { countryCode: 'IT', currency: 'EUR', dialCode: '+39', countryName: 'Italie', flag: '🇮🇹' },
  'America/New_York': { countryCode: 'US', currency: 'USD', dialCode: '+1', countryName: 'États-Unis', flag: '🇺🇸' },
  'America/Chicago': { countryCode: 'US', currency: 'USD', dialCode: '+1', countryName: 'États-Unis', flag: '🇺🇸' },
  'America/Los_Angeles': { countryCode: 'US', currency: 'USD', dialCode: '+1', countryName: 'États-Unis', flag: '🇺🇸' },
  'America/Toronto': { countryCode: 'CA', currency: 'USD', dialCode: '+1', countryName: 'Canada', flag: '🇨🇦' },
  'America/Montreal': { countryCode: 'CA', currency: 'USD', dialCode: '+1', countryName: 'Canada', flag: '🇨🇦' }
};

/**
 * Converts a base price in GHS to target currency with realistic consumer rounding
 */
export function convertFromGHS(amountGHS: number, targetCurrency: string): number {
  if (isNaN(amountGHS) || amountGHS <= 0) return 0;
  const config = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES.GHS;
  const raw = amountGHS * config.rateFromGHS;

  // Rounding rules for realistic pricing
  if (config.decimals === 0) {
    if (config.code === 'XOF' || config.code === 'XAF') {
      // Round to nearest 50 F.CFA
      return Math.max(100, Math.round(raw / 50) * 50);
    }
    if (config.code === 'NGN') {
      // Round to nearest 100 Naira
      return Math.max(100, Math.round(raw / 100) * 100);
    }
    if (config.code === 'KES') {
      // Round to nearest 10 KSh
      return Math.max(10, Math.round(raw / 10) * 10);
    }
    if (config.code === 'CDF' || config.code === 'RWF') {
      // Round to nearest 100
      return Math.max(100, Math.round(raw / 100) * 100);
    }
    return Math.round(raw);
  }

  // 2 decimal places (USD, EUR, GBP, ZAR, GHS)
  return Math.round(raw * 100) / 100;
}

/**
 * Universal Currency Formatter
 */
export function formatMoney(amount: number, currencyCode: string = 'GHS'): string {
  if (isNaN(amount)) return `0 ${currencyCode}`;
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.GHS;

  if (config.code === 'GHS') {
    return `GH₵ ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (config.code === 'XOF') {
    return `${Math.round(amount).toLocaleString('fr-FR')} F.CFA`;
  }
  if (config.code === 'XAF') {
    return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
  }
  if (config.code === 'NGN') {
    return `₦${Math.round(amount).toLocaleString('en-NG')}`;
  }
  if (config.code === 'KES') {
    return `${Math.round(amount).toLocaleString('en-KE')} KSh`;
  }
  if (config.code === 'ZAR') {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (config.code === 'EUR') {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }
  if (config.code === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (config.code === 'GBP') {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (config.code === 'CDF') {
    return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
  }
  if (config.code === 'RWF') {
    return `${Math.round(amount).toLocaleString('fr-FR')} FRw`;
  }
  if (config.code === 'MAD') {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
  }

  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })} ${config.symbol}`;
}

export interface DetectedGeoInfo {
  countryCode: string;
  countryName: string;
  currency: string;
  dialCode: string;
  flag: string;
  city?: string;
  source: 'stored' | 'network' | 'timezone' | 'default';
}

/**
 * Multi-layer client geo-detection:
 * 1. Stored user preference in localStorage (if any)
 * 2. Server `/api/geo/detect` network lookup (with strict 1.5s timeout)
 * 3. Client timezone heuristics (e.g. Africa/Abidjan -> CI/XOF, Africa/Lagos -> NG/NGN)
 * 4. Graceful default to Ghana (GHS)
 */
export async function detectUserGeoAndCurrency(): Promise<DetectedGeoInfo> {
  // 1. Check local storage preference
  try {
    const savedCurrency = localStorage.getItem('wtm_user_currency');
    if (savedCurrency && SUPPORTED_CURRENCIES[savedCurrency]) {
      const conf = SUPPORTED_CURRENCIES[savedCurrency];
      return {
        countryCode: conf.countryCode,
        countryName: conf.countryName,
        currency: conf.code,
        dialCode: conf.dialCode,
        flag: conf.flag,
        source: 'stored'
      };
    }
  } catch (e) {
    // ignore local storage error
  }

  // 2. Client Timezone lookup (instant 0ms)
  let tzInfo: DetectedGeoInfo | null = null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_COUNTRY[tz]) {
      const match = TIMEZONE_TO_COUNTRY[tz];
      tzInfo = {
        countryCode: match.countryCode,
        countryName: match.countryName,
        currency: match.currency,
        dialCode: match.dialCode,
        flag: match.flag,
        source: 'timezone'
      };
    }
  } catch (e) {
    // ignore
  }

  // 3. Try server API /api/geo/detect with fast timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch('/api/geo/detect', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.currency && SUPPORTED_CURRENCIES[data.currency]) {
        const conf = SUPPORTED_CURRENCIES[data.currency];
        return {
          countryCode: data.countryCode || conf.countryCode,
          countryName: data.countryName || conf.countryName,
          currency: conf.code,
          dialCode: data.dialCode || conf.dialCode,
          flag: conf.flag,
          city: data.city,
          source: 'network'
        };
      }
    }
  } catch (e) {
    // network timeout or offline
  }

  // 4. Return timezone detection if found
  if (tzInfo) {
    return tzInfo;
  }

  // 5. Default fallback: Ghana GHS
  const ghs = SUPPORTED_CURRENCIES.GHS;
  return {
    countryCode: ghs.countryCode,
    countryName: ghs.countryName,
    currency: ghs.code,
    dialCode: ghs.dialCode,
    flag: ghs.flag,
    source: 'default'
  };
}
