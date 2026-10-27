export interface FraudCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type KycDocumentType = 'id_card' | 'passport' | 'voter_id' | 'driving_license' | 'ghana_card';

export interface KycVerificationRequest {
  adminId: string;
  documentType: KycDocumentType | string;
  documentNumber: string;
  fullName: string;
  country: string;
  frontImage?: string;
  backImage?: string;
  selfieImage?: string; // Photo selfie de l'utilisateur tenant la carte
}

export interface KycProfile {
  adminId: string;
  isVerified: boolean;
  documentType?: string;
  documentNumberMasked?: string;
  fullName?: string;
  country?: string;
  hasFrontDoc?: boolean;
  hasBackDoc?: boolean;
  hasSelfieProof?: boolean;
  verifiedAt?: string;
  status?: 'verified' | 'pending' | 'unverified';
}

// In-memory fraud tracker
interface AttemptRecord {
  timestamps: number[];
  failuresCount: number;
}

const phoneAttempts = new Map<string, AttemptRecord>();
const ipAttempts = new Map<string, AttemptRecord>();
const kycProfiles = new Map<string, KycProfile>([
  ['admin_default', {
    adminId: 'admin_default',
    isVerified: true,
    documentType: 'ghana_card',
    documentNumberMasked: 'GHA-72948****-1',
    fullName: 'Kwame Mensah',
    country: 'GH',
    verifiedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  }]
]);

export class FraudProtectionService {
  // Max failures within 15 minutes before temporary cool-off
  private static readonly MAX_FAILURES = 3;
  private static readonly WINDOW_MS = 15 * 60 * 1000;
  // Threshold above which KYC is mandatory for payouts
  public static readonly KYC_THRESHOLD_GHS = 500.0;

  /**
   * Evaluates incoming payment checkout risk before triggering gateway call
   */
  public static evaluatePaymentRisk(phone: string, ip?: string): FraudCheckResult {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const now = Date.now();

    // Check phone history
    const record = phoneAttempts.get(cleanPhone);
    if (record) {
      // Filter timestamps within window
      record.timestamps = record.timestamps.filter(t => now - t < this.WINDOW_MS);
      if (record.failuresCount >= this.MAX_FAILURES) {
        const oldestFailure = record.timestamps[0] || now;
        const remainingSec = Math.max(10, Math.ceil((this.WINDOW_MS - (now - oldestFailure)) / 1000));
        return {
          allowed: false,
          reason: `Nombre excessif d'échecs de paiement pour ce numéro (${cleanPhone}). Par mesure de sécurité anti-fraude, réessayez dans ${remainingSec} secondes.`,
          retryAfterSeconds: remainingSec,
          riskScore: 'HIGH'
        };
      }
    }

    // IP velocity check (optional)
    if (ip && ip !== '127.0.0.1' && ip !== 'localhost') {
      const ipRecord = ipAttempts.get(ip);
      if (ipRecord && ipRecord.failuresCount > 6) {
        return {
          allowed: false,
          reason: "Trop de requêtes suspectes depuis cette connexion. Veuillez patienter.",
          riskScore: 'HIGH'
        };
      }
    }

    return {
      allowed: true,
      riskScore: 'LOW'
    };
  }

  /**
   * Records a payment failure to prevent carding or USSD brute-force attacks
   */
  public static recordPaymentFailure(phone: string, ip?: string): void {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const now = Date.now();

    const record = phoneAttempts.get(cleanPhone) || { timestamps: [], failuresCount: 0 };
    record.timestamps.push(now);
    record.failuresCount += 1;
    phoneAttempts.set(cleanPhone, record);

    if (ip) {
      const ipRecord = ipAttempts.get(ip) || { timestamps: [], failuresCount: 0 };
      ipRecord.timestamps.push(now);
      ipRecord.failuresCount += 1;
      ipAttempts.set(ip, ipRecord);
    }
  }

  /**
   * Resets failures after a successful transaction
   */
  public static recordPaymentSuccess(phone: string): void {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    phoneAttempts.delete(cleanPhone);
  }

  /**
   * Evaluates Payout KYC requirements
   */
  public static evaluatePayoutKyc(adminId: string, amountGHS: number): {
    required: boolean;
    isVerified: boolean;
    reason?: string;
  } {
    const profile = kycProfiles.get(adminId);
    const isVerified = Boolean(profile?.isVerified);

    if (amountGHS > this.KYC_THRESHOLD_GHS && !isVerified) {
      return {
        required: true,
        isVerified: false,
        reason: `Pour tout retrait supérieur à ${this.KYC_THRESHOLD_GHS} GH₵, la réglementation financière exige la vérification préalable de votre pièce d'identité (Ghana Card / CNI / Passeport).`
      };
    }

    return {
      required: amountGHS > this.KYC_THRESHOLD_GHS,
      isVerified: true
    };
  }

  /**
   * Get KYC profile
   */
  public static getKycProfile(adminId: string): KycProfile {
    return kycProfiles.get(adminId) || {
      adminId,
      isVerified: false
    };
  }

  /**
   * Submit / update KYC verification
   */
  public static submitKyc(request: KycVerificationRequest): KycProfile {
    const masked = request.documentNumber.length > 5 
      ? `${request.documentNumber.substring(0, 3)}****${request.documentNumber.slice(-2)}`
      : '***';

    const profile: KycProfile = {
      adminId: request.adminId,
      isVerified: true,
      status: 'verified',
      documentType: request.documentType,
      documentNumberMasked: masked,
      fullName: request.fullName,
      country: request.country,
      hasFrontDoc: Boolean(request.frontImage),
      hasBackDoc: Boolean(request.backImage),
      hasSelfieProof: Boolean(request.selfieImage),
      verifiedAt: new Date().toISOString()
    };

    kycProfiles.set(request.adminId, profile);
    return profile;
  }
}
