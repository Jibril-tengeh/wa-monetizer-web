/**
 * WA Pay - Safaricom M-Pesa Connector (Kenya - KES)
 * Protocol: Safaricom Daraja Lipa Na M-Pesa Online (STK Push)
 */

import { IWaPayConnector, WaPayConnectorInitiateResult, WaPayConnectorVerifyResult } from './base.ts';
import { 
  WaPayProviderId, 
  WaPayCurrency, 
  WaPayChannel, 
  WaPayTransaction, 
  ProviderIntegrationStatus 
} from '../types.ts';

export class MpesaDarajaConnector implements IWaPayConnector {
  public readonly id: WaPayProviderId = 'mpesa_daraja';
  public readonly name = 'Safaricom M-Pesa (Kenya - KES)';
  public readonly supportedCurrencies: WaPayCurrency[] = ['KES'];
  public readonly supportedCountries: string[] = ['KE'];
  public readonly supportedChannels: WaPayChannel[] = ['mobile_money'];
  public readonly contractRequirement = 'Contrat Safaricom Daraja Business (Paybill / Till Number Shortcode) avec Passkey et Consumer Key/Secret.';

  private get consumerKey(): string {
    return process.env.MPESA_CONSUMER_KEY || '';
  }

  private get consumerSecret(): string {
    return process.env.MPESA_CONSUMER_SECRET || '';
  }

  private get shortcode(): string {
    return process.env.MPESA_SHORTCODE || '';
  }

  private get passkey(): string {
    return process.env.MPESA_PASSKEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.consumerKey && this.consumerSecret && this.shortcode && this.passkey);
  }

  public getIntegrationStatus(): ProviderIntegrationStatus {
    return this.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED';
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    const res = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const data = await res.json();
    return data.access_token;
  }

  public async initiate(tx: WaPayTransaction): Promise<WaPayConnectorInitiateResult> {
    if (!this.isConfigured()) {
      throw new Error("Safaricom M-Pesa Daraja n'est pas configuré. Veuillez renseigner MPESA_CONSUMER_KEY, MPESA_SHORTCODE et MPESA_PASSKEY.");
    }

    const token = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');

    const cleanPhone = tx.customer.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('254') ? cleanPhone : `254${cleanPhone.replace(/^0+/, '')}`;

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(tx.pricing.chargedAmount),
      PartyA: formattedPhone,
      PartyB: this.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.APP_URL || 'https://wa-monetizer.com'}/api/v1/webhooks/mpesa`,
      AccountReference: tx.reference,
      TransactionDesc: `Abonnement WA Monetizer ${tx.customer.name}`
    };

    const res = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.ResponseCode !== '0') {
      throw new Error(data.ResponseDescription || "Échec de l'envoi STK Push M-Pesa");
    }

    return {
      success: true,
      reference: tx.reference,
      providerReference: data.CheckoutRequestID,
      status: 'pending',
      promptInstructions: "Un prompt STK Push M-Pesa a été envoyé sur votre téléphone kényan. Saisissez votre code PIN M-Pesa.",
      gatewayResponse: data.CustomerMessage
    };
  }

  public async verify(reference: string, providerReference?: string): Promise<WaPayConnectorVerifyResult> {
    if (!this.isConfigured()) {
      throw new Error("M-Pesa non configuré");
    }

    const token = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');

    const res = await fetch('https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: providerReference || reference
      })
    });

    const data = await res.json();
    const isPaid = data.ResultCode === '0';

    return {
      verified: isPaid,
      status: isPaid ? 'verified' : (data.ResultCode === '1032' ? 'cancelled' : 'failed'),
      reference,
      providerReference: providerReference || reference,
      chargedAmount: 0,
      chargedCurrency: 'KES',
      gatewayResponse: data.ResultDesc
    };
  }

  public validateWebhook(payload: any, signature?: string): boolean {
    if (!this.isConfigured()) return false;
    return payload?.Body?.stkCallback?.ResultCode === 0;
  }
}
