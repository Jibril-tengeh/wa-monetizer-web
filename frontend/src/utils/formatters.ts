import { formatMoney } from './currency.ts';

export { formatMoney };

/**
 * Format currency in Ghanaian Cedi (GHS)
 * Example: formatGHS(150) -> "GH₵ 150.00"
 */
export function formatGHS(amount: number): string {
  return formatMoney(amount, 'GHS');
}

/**
 * Format Date in French locale
 * Example: formatDateFR("2026-10-24T12:00:00Z") -> "24 oct. 2026"
 */
export function formatDateFR(dateString?: string, includeTime = false): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    
    if (includeTime) {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Returns human-friendly remaining days in French
 */
export function formatRemainingDays(expiresAt?: string): { text: string; isExpired: boolean; isWarning: boolean } {
  if (!expiresAt) return { text: 'Date indéfinie', isExpired: false, isWarning: false };
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = exp - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) {
    const pastDays = Math.abs(diffDays);
    return {
      text: pastDays === 0 ? "Expiré aujourd'hui" : `Expiré depuis ${pastDays} j`,
      isExpired: true,
      isWarning: false
    };
  }

  if (diffDays <= 3) {
    return {
      text: diffDays === 1 ? 'Expire demain' : `Expire dans ${diffDays} j`,
      isExpired: false,
      isWarning: true
    };
  }

  return {
    text: `Reste ${diffDays} j`,
    isExpired: false,
    isWarning: false
  };
}

/**
 * Cleans phone number for international WhatsApp link
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}
