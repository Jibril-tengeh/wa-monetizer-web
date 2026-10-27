/**
 * WA Pay - Orange Money Connector (Zone XOF & XAF)
 * Covers: Côte d'Ivoire, Sénégal, Cameroun, Mali, Burkina Faso
 * Protocol: Orange Money Web Payment API
 */

import { IWaPayConnector, WaPayConnectorInitiateResult, WaPayConnectorVerifyResult } from './base.ts';
import { 
  WaPayProviderId, 
  WaPayCurrency, 
  WaPayChannel, 
  WaPayTransaction, 
  ProviderIntegrationStatus 
} from '../types.ts';

export class OrangeMoneyConnector implements IWaPayConnector {
  public readonly id: WaPayProviderId = 'orange_money';
  public readonly name = 'Orange Money (Zone XOF & XAF - UEMOA / CEMAC)';
  public readonly supportedCurrencies: WaPayCurrency[] = ['XOF', 'XAF'];
  public readonly supportedCountries: string[] = ['CI', 'SN', 'CM', 'BF', 'ML'];
  public readonly supportedChannels: WaPayChannel[] = ['mobile_money'];
  public readonly contractRequirement = 'Contrat Partenaire Orange Money Developer avec Merchant Key, Client ID & Client Secret officiels.';

  private get authHeader(): string {
    const id = process.env.ORANGE_MONEY_CLIENT_ID || '';
    const secret = process.env.ORANGE_MONEY_CLIENT_SECRET || '';
    if (!id || !secret) return '';
    return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
  }

  private get merchantKey(): string {
    return process.env.ORANGE_MONEY_MERCHANT_KEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.authHeader && this.merchantKey);
  }

  public getIntegrationStatus(): ProviderIntegrationStatus {
    return this.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED';
  }

  public async initiate(tx: WaPayTransaction): Promise<WaPayConnectorInitiateResult> {
    if (!this.isConfigured()) {
      throw new Error("Orange Money Web Payment n'est pas configuré. Veuillez renseigner ORANGE_MONEY_CLIENT_ID et ORANGE_MONEY_MERCHANT_KEY.");
    }

    const payload = {
      merchant_key: this.merchantKey,
      currency: tx.pricing.chargedCurrency,
      order_id: tx.reference,
      amount: Math.round(tx.pricing.chargedAmount),
      return_url: `${process.env.APP_URL || 'https://wa-monetizer.com'}/#join`,
      cancel_url: `${process.env.APP_URL || 'https://wa-monetizer.com'}/#join`,
      notif_url: `${process.env.APP_URL || 'https://wa-monetizer.com'}/api/v1/webhooks/orange_money`,
      reference: `WAM_${tx.groupId}`
    };

    const res = await fetch('https://api.orange.com/orange-money-webpay/dev/v1/webpayment', {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.payment_url) {
      throw new Error(data.message || "Échec d'initialisation Orange Money Web Payment");
    }

    return {
      success: true,
      reference: tx.reference,
      providerReference: data.pay_token,
      status: 'pending',
      checkoutUrl: data.payment_url,
      promptInstructions: "Validez la demande Orange Money reçue par SMS ou composez le code USSD dédié (#144# ou #150#).",
      gatewayResponse: data.message
    };
  }

  public async verify(reference: string, providerReference?: string): Promise<WaPayConnectorVerifyResult> {
    if (!this.isConfigured()) {
      throw new Error("Orange Money non configuré");
    }

    const payToken = providerReference || reference;
    const res = await fetch(`https://api.orange.com/orange-money-webpay/dev/v1/transactionstatus`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: reference,
        amount: 0,
        pay_token: payToken
      })
    });

    const data = await res.json();
    const isSuccess = data.status === 'SUCCESS';

    return {
      verified: isSuccess,
      status: isSuccess ? 'verified' : (data.status === 'PENDING' ? 'pending' : 'failed'),
      reference,
      providerReference: data.txnid,
      chargedAmount: data.amount || 0,
      chargedCurrency: (data.currency || 'XOF') as WaPayCurrency,
      gatewayResponse: data.status
    };
  }

  public validateWebhook(payload: any, signature?: string): boolean {
    if (!this.isConfigured()) return false;
    return payload?.status === 'SUCCESS';
  }
}
