/**
 * WA Pay - Wave Mobile Money Connector (Zone XOF)
 * Covers: Senegal (SN), Côte d'Ivoire (CI)
 * Protocol: Official Wave Business Checkout API (v1)
 */

import crypto from 'node:crypto';
import { IWaPayConnector, WaPayConnectorInitiateResult, WaPayConnectorVerifyResult } from './base.ts';
import { 
  WaPayProviderId, 
  WaPayCurrency, 
  WaPayChannel, 
  WaPayTransaction, 
  ProviderIntegrationStatus 
} from '../types.ts';

export class WaveConnector implements IWaPayConnector {
  public readonly id: WaPayProviderId = 'wave';
  public readonly name = 'Wave Mobile Money (Sénégal & Côte d\'Ivoire - XOF)';
  public readonly supportedCurrencies: WaPayCurrency[] = ['XOF'];
  public readonly supportedCountries: string[] = ['CI', 'SN'];
  public readonly supportedChannels: WaPayChannel[] = ['mobile_money'];
  public readonly contractRequirement = 'Contrat marchand Wave Business (Wave Digital Finance SN / CI) avec API Key marchande et webhook secret.';

  private get apiKey(): string {
    return process.env.WAVE_API_KEY || '';
  }

  private get webhookSecret(): string {
    return process.env.WAVE_WEBHOOK_SECRET || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.startsWith('wave_'));
  }

  public getIntegrationStatus(): ProviderIntegrationStatus {
    return this.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED';
  }

  public async initiate(tx: WaPayTransaction): Promise<WaPayConnectorInitiateResult> {
    if (!this.isConfigured()) {
      throw new Error("Wave Business n'est pas configuré. Veuillez obtenir un compte marchand Wave et définir WAVE_API_KEY.");
    }

    const payload = {
      amount: String(Math.round(tx.pricing.chargedAmount)),
      currency: 'XOF',
      client_reference: tx.reference,
      success_url: `${process.env.APP_URL || 'https://wa-monetizer.com'}/#join?ref=${tx.reference}&status=success`,
      error_url: `${process.env.APP_URL || 'https://wa-monetizer.com'}/#join?ref=${tx.reference}&status=failed`,
      restrict_mobile_phone_number: tx.customer.phone.replace(/[^0-9+]/g, '')
    };

    const res = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error(data.message || "Échec de création de session Wave Checkout");
    }

    return {
      success: true,
      reference: tx.reference,
      providerReference: data.id,
      status: 'pending',
      checkoutUrl: data.wave_launch_url,
      promptInstructions: "Ouvrez votre application Wave pour confirmer le paiement en 1 clic.",
      gatewayResponse: "Session Wave initialisée"
    };
  }

  public async verify(reference: string, providerReference?: string): Promise<WaPayConnectorVerifyResult> {
    if (!this.isConfigured()) {
      throw new Error("Wave non configuré");
    }

    const sessionId = providerReference || reference;
    const res = await fetch(`https://api.wave.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    const isSuccess = data.payment_status === 'succeeded';

    return {
      verified: isSuccess,
      status: isSuccess ? 'verified' : (data.payment_status === 'processing' ? 'processing' : 'failed'),
      reference,
      providerReference: data.id,
      chargedAmount: Number(data.amount || 0),
      chargedCurrency: 'XOF',
      gatewayResponse: data.payment_status
    };
  }

  public validateWebhook(payload: any, signature?: string): boolean {
    if (!this.webhookSecret || !signature) return false;
    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const computed = hmac.update(JSON.stringify(payload)).digest('hex');
      return computed === signature;
    } catch {
      return false;
    }
  }
}
