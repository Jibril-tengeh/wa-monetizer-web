/**
 * WA Pay - Hubtel Ghana Connector
 * Direct aggregator for MTN MoMo Ghana, Telecel Cash (Vodafone), and AirtelTigo Money
 */

import { IWaPayConnector, WaPayConnectorInitiateResult, WaPayConnectorVerifyResult } from './base.ts';
import { 
  WaPayProviderId, 
  WaPayCurrency, 
  WaPayChannel, 
  WaPayTransaction, 
  ProviderIntegrationStatus 
} from '../types.ts';

export class HubtelConnector implements IWaPayConnector {
  public readonly id: WaPayProviderId = 'hubtel';
  public readonly name = 'Hubtel Ghana (Direct MoMo MTN / Telecel / AirtelTigo)';
  public readonly supportedCurrencies: WaPayCurrency[] = ['GHS'];
  public readonly supportedCountries: string[] = ['GH'];
  public readonly supportedChannels: WaPayChannel[] = ['mobile_money'];
  public readonly contractRequirement = 'Contrat marchand Hubtel Ghana avec Merchant Account ID, Client ID et Client Secret officiels.';

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

  public getIntegrationStatus(): ProviderIntegrationStatus {
    return this.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED';
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
  }

  public async initiate(tx: WaPayTransaction): Promise<WaPayConnectorInitiateResult> {
    if (!this.isConfigured()) {
      throw new Error("Hubtel Ghana n'est pas configuré. Veuillez renseigner HUBTEL_CLIENT_ID et HUBTEL_CLIENT_SECRET.");
    }

    const payload = {
      totalAmount: tx.pricing.chargedAmount,
      description: `Abonnement WA Monetizer - ${tx.customer.name}`,
      callbackUrl: `${process.env.APP_URL || 'https://wa-monetizer.com'}/api/v1/webhooks/hubtel`,
      returnUrl: `${process.env.APP_URL || 'https://wa-monetizer.com'}/#join`,
      merchantAccountNumber: this.merchantAccountNumber,
      cancellationUrl: `${process.env.APP_URL || 'https://wa-monetizer.com'}/#join`,
      clientReference: tx.reference
    };

    const res = await fetch(`https://api-onlinecheckout.hubtel.com/v2/merchantaccount/merchants/${this.merchantAccountNumber}/postprocess`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status !== 'Success' && data.responseCode !== '0000') {
      throw new Error(data.message || "Échec de l'initialisation Hubtel Ghana");
    }

    return {
      success: true,
      reference: tx.reference,
      providerReference: data.data?.checkoutId || data.data?.transactionId,
      status: 'pending',
      checkoutUrl: data.data?.checkoutUrl,
      promptInstructions: "Un prompt USSD va s'afficher sur votre téléphone ghanéen. Composez votre code secret MoMo.",
      gatewayResponse: data.message
    };
  }

  public async verify(reference: string, providerReference?: string): Promise<WaPayConnectorVerifyResult> {
    if (!this.isConfigured()) {
      throw new Error("Hubtel non configuré");
    }

    const checkId = providerReference || reference;
    const res = await fetch(`https://api-onlinecheckout.hubtel.com/v2/merchantaccount/merchants/${this.merchantAccountNumber}/status/check?invoiceToken=${encodeURIComponent(checkId)}`, {
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    const isPaid = data.data?.status === 'Paid' || data.responseCode === '0000';

    return {
      verified: isPaid,
      status: isPaid ? 'verified' : (data.data?.status === 'Pending' ? 'pending' : 'failed'),
      reference,
      providerReference: data.data?.transactionId,
      chargedAmount: data.data?.amount || 0,
      chargedCurrency: 'GHS',
      gatewayResponse: data.message
    };
  }

  public validateWebhook(payload: any, signature?: string): boolean {
    if (!this.isConfigured()) return false;
    // Hubtel sends webhook with Basic auth or signature header
    return signature === this.clientSecret || payload?.ResponseCode === '0000';
  }
}
