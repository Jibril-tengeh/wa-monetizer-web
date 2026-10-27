import crypto from 'node:crypto';
import { 
  PaymentProvider, 
  PaymentInitiationRequest, 
  PaymentInitiationResponse, 
  PaymentVerificationResult 
} from './types.ts';

export class PaystackProvider implements PaymentProvider {
  public readonly id = 'paystack';
  public readonly name = 'Paystack Ghana';

  private get secretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.secretKey && this.secretKey.startsWith('sk_'));
  }

  public async initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    if (!this.isConfigured()) {
      throw new Error("Paystack n'est pas configuré. Veuillez définir PAYSTACK_SECRET_KEY dans les variables d'environnement.");
    }

    const reference = `WAM_PST_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    // Paystack amounts in GHS are in pesewas (1 GHS = 100 pesewas)
    const amountInPesewas = Math.round(req.amount * 100);

    const payload = {
      email: req.customerEmail || `${req.customerPhone.replace(/[^0-9]/g, '')}@wa-monetizer.local`,
      amount: amountInPesewas,
      currency: 'GHS',
      reference,
      channels: req.channel === 'mobile_money' ? ['mobile_money'] : ['card'],
      callback_url: req.callbackUrl,
      metadata: {
        adminId: req.adminId,
        groupId: req.groupId,
        planId: req.planId,
        customerName: req.customerName,
        customerPhone: req.customerPhone,
        momoNetwork: req.momoNetwork
      }
    };

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!data.status) {
        throw new Error(data.message || "Échec de l'initialisation du paiement Paystack");
      }

      return {
        success: true,
        reference,
        checkoutUrl: data.data.authorization_url,
        provider: 'paystack',
        isSandbox: false,
        message: 'Transaction Paystack initialisée avec succès'
      };
    } catch (error: any) {
      console.error('Paystack initiation error:', error);
      throw new Error(`Erreur Paystack: ${error.message}`);
    }
  }

  public async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    if (!this.isConfigured()) {
      throw new Error("Paystack n'est pas configuré");
    }

    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`
        }
      });

      const data = await response.json();
      if (!data.status || !data.data) {
        return {
          verified: false,
          reference,
          amount: 0,
          currency: 'GHS',
          status: 'failed',
          channel: 'card',
          isSandbox: false,
          gatewayResponse: data.message || 'Transaction non trouvée'
        };
      }

      const tx = data.data;
      const isSuccess = tx.status === 'success';

      return {
        verified: isSuccess,
        reference: tx.reference,
        amount: tx.amount / 100,
        currency: tx.currency,
        status: isSuccess ? 'verified' : (tx.status === 'abandoned' ? 'failed' : 'pending'),
        channel: tx.channel === 'mobile_money' ? 'mobile_money' : 'card',
        customerPhone: tx.metadata?.customerPhone || tx.customer?.phone,
        customerEmail: tx.customer?.email,
        customerName: tx.metadata?.customerName,
        isSandbox: false,
        gatewayResponse: tx.gateway_response,
        metadata: tx.metadata
      };
    } catch (error: any) {
      console.error('Paystack verification error:', error);
      throw new Error(`Erreur de vérification Paystack: ${error.message}`);
    }
  }

  public validateWebhook(payload: any, signatureHeader?: string): boolean {
    if (!this.secretKey || !signatureHeader) return false;
    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hash = crypto.createHmac('sha512', this.secretKey).update(bodyStr).digest('hex');
    return hash === signatureHeader;
  }
}
