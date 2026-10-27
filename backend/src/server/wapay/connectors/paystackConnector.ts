/**
 * WA Pay - Paystack Connector
 * Covers: Ghana (GHS), Nigeria (NGN), Kenya (KES), South Africa (ZAR), International Cards (Visa / Mastercard)
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

export class PaystackConnector implements IWaPayConnector {
  public readonly id: WaPayProviderId = 'paystack';
  public readonly name = 'Paystack Multi-Country (Ghana, Nigeria, Kenya, Cards)';
  public readonly supportedCurrencies: WaPayCurrency[] = ['GHS', 'NGN', 'KES', 'ZAR', 'USD'];
  public readonly supportedCountries: string[] = ['GH', 'NG', 'KE', 'ZA', 'CI'];
  public readonly supportedChannels: WaPayChannel[] = ['mobile_money', 'card', 'bank_transfer', 'ussd'];
  public readonly contractRequirement = 'Compte marchand Paystack vérifié (KYB au Ghana/Nigeria ou Stripe Atlas international).';

  private get secretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.secretKey && this.secretKey.startsWith('sk_'));
  }

  public getIntegrationStatus(): ProviderIntegrationStatus {
    return this.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED';
  }

  public async initiate(tx: WaPayTransaction): Promise<WaPayConnectorInitiateResult> {
    if (!this.isConfigured()) {
      throw new Error("Paystack n'est pas configuré avec des clés réelles. Veuillez renseigner PAYSTACK_SECRET_KEY.");
    }

    // Paystack amounts in smallest unit (kobo for NGN, pesewas for GHS, cents for USD/ZAR)
    const amountInSmallestUnit = Math.round(tx.pricing.chargedAmount * 100);

    const payload = {
      email: tx.customer.email || `${tx.customer.phone.replace(/[^0-9]/g, '')}@wapay.local`,
      amount: amountInSmallestUnit,
      currency: tx.pricing.chargedCurrency,
      reference: tx.reference,
      channels: tx.channel === 'mobile_money' ? ['mobile_money'] : (tx.channel === 'card' ? ['card'] : ['bank', 'ussd']),
      metadata: {
        waPayRef: tx.reference,
        adminId: tx.adminId,
        groupId: tx.groupId,
        planId: tx.planId,
        customerName: tx.customer.name,
        customerPhone: tx.customer.phone,
        operatorNetwork: tx.operatorNetwork
      }
    };

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.status) {
      throw new Error(data.message || "Échec de l'initialisation Paystack");
    }

    return {
      success: true,
      reference: tx.reference,
      providerReference: data.data?.reference,
      status: 'pending',
      checkoutUrl: data.data?.authorization_url,
      gatewayResponse: data.message
    };
  }

  public async verify(reference: string): Promise<WaPayConnectorVerifyResult> {
    if (!this.isConfigured()) {
      throw new Error("Paystack non configuré");
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    const isSuccess = data.status && data.data?.status === 'success';

    return {
      verified: Boolean(isSuccess),
      status: isSuccess ? 'verified' : (data.data?.status === 'abandoned' ? 'cancelled' : 'failed'),
      reference,
      providerReference: data.data?.id ? String(data.data.id) : undefined,
      chargedAmount: data.data?.amount ? data.data.amount / 100 : 0,
      chargedCurrency: (data.data?.currency || 'GHS').toUpperCase() as WaPayCurrency,
      gatewayResponse: data.data?.gateway_response || data.message,
      metadata: data.data?.metadata
    };
  }

  public validateWebhook(payload: any, signature?: string): boolean {
    if (!this.isConfigured() || !signature) return false;
    try {
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      return hash === signature;
    } catch {
      return false;
    }
  }
}
