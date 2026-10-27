import crypto from 'node:crypto';
import { 
  PaymentProvider, 
  PaymentInitiationRequest, 
  PaymentInitiationResponse, 
  PaymentVerificationResult 
} from './types.ts';

// In-memory sandbox transaction store for local/dev sandbox verification simulation
const sandboxTransactions = new Map<string, {
  reference: string;
  amount: number;
  currency: string;
  status: 'verified' | 'failed' | 'pending';
  channel: 'mobile_money' | 'card' | 'bank';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}>();

export class SandboxProvider implements PaymentProvider {
  public readonly id = 'sandbox';
  public readonly name = 'Mode Sandbox / Test Développeur';

  public isConfigured(): boolean {
    // Sandbox is always available as a safe test harness
    return true;
  }

  public async initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    const reference = `SANDBOX_MOCK_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    
    // Store in sandbox memory
    const currency = req.currency || 'GHS';
    sandboxTransactions.set(reference, {
      reference,
      amount: req.amount,
      currency,
      status: 'pending',
      channel: req.channel,
      customerName: req.customerName,
      customerPhone: req.customerPhone,
      customerEmail: req.customerEmail,
      createdAt: new Date().toISOString(),
      metadata: {
        adminId: req.adminId,
        groupId: req.groupId,
        planId: req.planId,
        momoNetwork: req.momoNetwork,
        country: req.country,
        originalAmountGHS: req.originalAmountGHS
      }
    });

    return {
      success: true,
      reference,
      checkoutUrl: `/join/checkout-sandbox?ref=${reference}&amount=${req.amount}`,
      provider: 'sandbox',
      isSandbox: true,
      message: 'TRANSACTION SANDBOX INITIALISÉE (Aucun prélèvement réel)',
      promptInstructions: 'Pour tester le parcours de paiement sans carte réelle, validez via le simulateur de webhook sandbox.'
    };
  }

  public async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    const tx = sandboxTransactions.get(reference);

    if (!tx) {
      return {
        verified: false,
        reference,
        amount: 0,
        currency: 'GHS',
        status: 'failed',
        channel: 'mobile_money',
        isSandbox: true,
        gatewayResponse: 'Référence sandbox introuvable'
      };
    }

    const isVerified = tx.status === 'verified';

    return {
      verified: isVerified,
      reference: tx.reference,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      channel: tx.channel,
      customerPhone: tx.customerPhone,
      customerEmail: tx.customerEmail,
      customerName: tx.customerName,
      isSandbox: true,
      gatewayResponse: `Sandbox State: ${tx.status}`,
      metadata: tx.metadata
    };
  }

  // Allow sandbox tests to transition the transaction state server-side
  public simulateStateChange(reference: string, newStatus: 'verified' | 'failed') {
    const tx = sandboxTransactions.get(reference);
    if (tx) {
      tx.status = newStatus;
      sandboxTransactions.set(reference, tx);
      return tx;
    }
    return null;
  }

  public validateWebhook(payload: any, signatureHeader?: string): boolean {
    // Sandbox uses a test secret header check
    return signatureHeader === 'sandbox_test_signature' || Boolean(payload && payload.sandboxSecret === 'sandbox_secret');
  }
}

export const sandboxInstance = new SandboxProvider();
