import crypto from 'node:crypto';

export interface OneTimeTokenRecord {
  token: string;
  adminId: string;
  groupId: string;
  memberId?: string;
  inviteUrl: string;
  isUsed: boolean;
  usedAt?: string;
  expiresAt: string;
  createdAt: string;
}

// In-memory token storage (also backed by database in Firestore)
const tokenStore = new Map<string, OneTimeTokenRecord>();

export class OneTimeAccessService {
  /**
   * Generates a single-use token that self-destructs upon first click.
   */
  public static createToken(
    adminId: string,
    groupId: string,
    inviteUrl: string,
    memberId?: string,
    validityHours = 48
  ): OneTimeTokenRecord {
    const token = `otp_${crypto.randomBytes(16).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + validityHours * 3600 * 1000);

    const record: OneTimeTokenRecord = {
      token,
      adminId,
      groupId,
      memberId,
      inviteUrl,
      isUsed: false,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString()
    };

    tokenStore.set(token, record);
    return record;
  }

  /**
   * Consumes the single-use token.
   * If already used, strictly refuses access!
   */
  public static consumeToken(token: string): {
    valid: boolean;
    inviteUrl?: string;
    error?: string;
    usedAt?: string;
  } {
    const record = tokenStore.get(token);

    if (!record) {
      return {
        valid: false,
        error: "Ce lien d'accès est invalide ou n'existe pas."
      };
    }

    if (record.isUsed) {
      return {
        valid: false,
        error: "Ce lien à usage unique a DÉJÀ ÉTÉ UTILISÉ et ne fonctionne plus. Les invitations sont strictement personnelles et ne peuvent être partagées.",
        usedAt: record.usedAt
      };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return {
        valid: false,
        error: "Ce lien d'invitation a expiré (délai dépassé)."
      };
    }

    // CONSUME THE TOKEN IMMEDIATELY: Mark as used
    record.isUsed = true;
    record.usedAt = new Date().toISOString();
    tokenStore.set(token, record);

    return {
      valid: true,
      inviteUrl: record.inviteUrl
    };
  }

  public static getTokenInfo(token: string): OneTimeTokenRecord | undefined {
    return tokenStore.get(token);
  }
}
