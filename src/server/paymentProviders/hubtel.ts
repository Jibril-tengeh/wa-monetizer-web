import crypto from 'node:crypto';
import { 
  PaymentProvider, 
  PaymentInitiationRequest, 
  PaymentInitiationResponse, 
  PaymentVerificationResult 
} from './types.ts';

export class HubtelProvider implements PaymentProvider {
  public readonly id = 'hubtel';
  public readonly name = 'Hubtel Ghana';

  private get clientId(): string {
    return process.env.HUBTEL_CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return process.env.HUBTEL_CLIENT_SECRET || '';
  }

  private get merchantAccountNumber(): string {
    return process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.merchantAccountNumber);
  }

  public async initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    if (!this.isConfigured()) {
      throw new Error("Hubtel n'est pas configuré. Veuillez définir HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET et HUBTEL_MERCHANT_ACCOUNT_NUMBER.");
    }

    const reference = `WAM_HUB_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const authHeader = 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const payload = {
      totalAmount: req.amount,
      description: `Abonnement WhatsApp - ${req.customerName}`,
      callbackUrl: req.callbackUrl,
      returnUrl: req.callbackUrl,
      merchantAccountNumber: this.merchantAccountNumber,
      cancellationUrl: req.callbackUrl,
      clientReference: reference
    };

    try {
      const response = await fetch(`https://api-checkout-v2.hubtel.com/v2/merchantaccount/merchants/${this.merchantAccountNumber}/postprocess`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.status >= 400 || data.responseCode !== '0000') {
        throw new Error(data.message || "Échec de l'initialisation du paiement Hubtel");
      }

      return {
        success: true,
        reference,
        checkoutUrl: data.data?.checkoutUrl,
        provider: 'hubtel',
        isSandbox: false,
        message: 'Transaction Hubtel initialisée avec succès'
      };
    } catch (error: any) {
      console.error('Hubtel initiation error:', error);
      throw new Error(`Erreur Hubtel: ${error.message}`);
    }
  }

  public async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    if (!this.isConfigured()) {
      throw new Error("Hubtel n'est pas configuré");
    }

    const authHeader = 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await fetch(`https://api-checkout-v2.hubtel.com/v2/merchantaccount/merchants/${this.merchantAccountNumber}/status?clientReference=${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: authHeader
        }
      });

      const data = await response.json();
      const isSuccess = data.data?.status === 'Success' || data.data?.status === 'Paid';

      return {
        verified: isSuccess,
        reference,
        amount: data.data?.amount || 0,
        currency: 'GHS',
        status: isSuccess ? 'verified' : (data.data?.status === 'Failed' ? 'failed' : 'pending'),
        channel: data.data?.paymentMethod === 'mobilemoney' ? 'mobile_money' : 'card',
        customerPhone: data.data?.customerPhoneNumber,
        isSandbox: false,
        gatewayResponse: data.data?.status
      };
    } catch (error: any) {
      console.error('Hubtel verification error:', error);
      throw new Error(`Erreur de vérification Hubtel: ${error.message}`);
    }
  }

  public validateWebhook(payload: any, signatureHeader?: string): boolean {
    // Hubtel webhook signature validation
    if (!this.clientSecret || !signatureHeader) return false;
    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hash = crypto.createHmac('sha256', this.clientSecret).update(bodyStr).digest('hex');
    return hash === signatureHeader;
  }
}
