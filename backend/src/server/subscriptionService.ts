import { PaymentVerificationResult } from './paymentProviders/types.ts';

// Track processed payment references to enforce idempotency
const processedPaymentReferences = new Set<string>();

export interface SubscriptionActivationResult {
  success: boolean;
  isIdempotentRepeat: boolean;
  reference: string;
  startDate: string;
  expiresAt: string;
  memberStatus: 'active' | 'pending' | 'expired';
  instructions: string;
  whatsAppInviteUrl?: string;
  error?: string;
}

export class SubscriptionService {
  /**
   * Calculates precise expiration date based on start date and duration in days.
   * Time calculation is authoritative on the server.
   */
  public static calculateExpirationDate(startDate: Date, durationDays: number): Date {
    if (durationDays <= 0) {
      throw new Error("La durée de l'abonnement doit être supérieure à 0 jour");
    }
    const expires = new Date(startDate.getTime());
    expires.setDate(expires.getDate() + durationDays);
    return expires;
  }

  /**
   * Checks if an expiration date has passed.
   */
  public static isExpired(expiresAtString: string): boolean {
    const expiresAt = new Date(expiresAtString);
    return expiresAt.getTime() <= Date.now();
  }

  /**
   * Checks if an expiration date is within N days from now (default 3 days for renewal reminders).
   */
  public static isExpiringSoon(expiresAtString: string, daysThreshold: number = 3): boolean {
    const expiresAt = new Date(expiresAtString);
    const now = Date.now();
    const diffMs = expiresAt.getTime() - now;
    const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
    return diffMs > 0 && diffMs <= thresholdMs;
  }

  /**
   * Generates formatted WhatsApp access instructions compliant with official click-to-chat links.
   * Avoids claiming unverified automated bot scraping or private credential storage.
   */
  public static generateWhatsAppInviteMessage(
    groupName: string,
    instructions: string,
    inviteLink?: string,
    memberName?: string,
    currency: string = 'GHS'
  ): string {
    const greeting = memberName ? `Bonjour ${memberName} ! ` : 'Bonjour ! ';
    let msg = `${greeting}Votre abonnement au groupe WhatsApp "${groupName}" a été validé avec succès (${currency}).\n\n`;
    
    if (inviteLink) {
      msg += `👉 Lien officiel d'accès au groupe :\n${inviteLink}\n\n`;
    }

    if (instructions) {
      msg += `📋 Instructions de l'administrateur :\n${instructions}\n\n`;
    }

    msg += `Merci de respecter les règles du groupe. Bon échange !`;
    return msg;
  }

  /**
   * Formats a direct WhatsApp Click-to-Chat URL
   * e.g. https://wa.me/233XXXXXXXXX?text=...
   */
  public static generateWhatsAppDirectLink(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  /**
   * Idempotently checks if a payment has already been verified and activated.
   */
  public static isPaymentAlreadyProcessed(reference: string): boolean {
    return processedPaymentReferences.has(reference);
  }

  public static markPaymentAsProcessed(reference: string): void {
    processedPaymentReferences.add(reference);
  }

  /**
   * Verifies and prepares subscription lifecycle payload.
   */
  public static processSubscriptionActivation(
    verification: PaymentVerificationResult,
    planDurationDays: number,
    groupName: string,
    accessInstructions: string,
    inviteLink?: string
  ): SubscriptionActivationResult {
    // 1. Idempotency Check
    if (this.isPaymentAlreadyProcessed(verification.reference)) {
      return {
        success: true,
        isIdempotentRepeat: true,
        reference: verification.reference,
        startDate: new Date().toISOString(),
        expiresAt: this.calculateExpirationDate(new Date(), planDurationDays).toISOString(),
        memberStatus: 'active',
        instructions: accessInstructions,
        whatsAppInviteUrl: inviteLink
      };
    }

    // 2. Strict status check: never activate without verified status
    if (verification.status !== 'verified') {
      return {
        success: false,
        isIdempotentRepeat: false,
        reference: verification.reference,
        startDate: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        memberStatus: 'pending',
        instructions: '',
        error: `Paiement non vérifié auprès du fournisseur (Statut: ${verification.status})`
      };
    }

    // 3. Mark processed for idempotency
    this.markPaymentAsProcessed(verification.reference);

    const now = new Date();
    const expiresAt = this.calculateExpirationDate(now, planDurationDays);

    return {
      success: true,
      isIdempotentRepeat: false,
      reference: verification.reference,
      startDate: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      memberStatus: 'active',
      instructions: accessInstructions,
      whatsAppInviteUrl: inviteLink
    };
  }
}
