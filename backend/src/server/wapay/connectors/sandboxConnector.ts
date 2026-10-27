/**
 * WA Pay - High-Fidelity Sandbox Simulator Connector
 * Safe developer & demo environment with realistic Mobile Money USSD prompts,
 * multi-currency ledger recording, and deterministic testing.
 */

import { IWaPayConnector, WaPayConnectorInitiateResult, WaPayConnectorVerifyResult } from './base.ts';
import { 
  WaPayProviderId, 
  WaPayCurrency, 
  WaPayChannel, 
  WaPayTransaction, 
  WaPayTransactionStatus,
  ProviderIntegrationStatus 
} from '../types.ts';

export class SandboxConnector implements IWaPayConnector {
  public readonly id: WaPayProviderId = 'sandbox';
  public readonly name = 'WA Pay FinTech Sandbox (Simulateur Sécurisé Multi-Réseaux)';
  public readonly supportedCurrencies: WaPayCurrency[] = ['GHS', 'XOF', 'XAF', 'NGN', 'KES', 'EUR', 'USD', 'ZAR'];
  public readonly supportedCountries: string[] = ['GH', 'CI', 'SN', 'CM', 'NG', 'KE', 'FR', 'US', 'ZA'];
  public readonly supportedChannels: WaPayChannel[] = ['mobile_money', 'card', 'bank_transfer', 'ussd'];
  public readonly contractRequirement = 'Aucun contrat requis. Environnement de bac à sable sécurisé pour tests d\'intégration et démonstrations.';

  // In-memory simulation states
  private simulatedStates = new Map<string, WaPayTransactionStatus>();

  public isConfigured(): boolean {
    return true; // Always available for developer testing
  }

  public getIntegrationStatus(): ProviderIntegrationStatus {
    return 'SANDBOX_ACTIVE';
  }

  public async initiate(tx: WaPayTransaction): Promise<WaPayConnectorInitiateResult> {
    const cleanPhone = tx.customer.phone.replace(/[^0-9]/g, '');

    // Deterministic test scenarios based on phone number
    let initialStatus: WaPayTransactionStatus = 'pending';
    if (cleanPhone.endsWith('0000')) {
      initialStatus = 'failed';
    }

    this.simulatedStates.set(tx.reference, initialStatus);

    let promptInstructions = `[SANDBOX] Simulation ${tx.operatorNetwork || tx.channel} : validez le prompt test sur votre téléphone.`;
    if (tx.channel === 'mobile_money') {
      promptInstructions = `[SIMULATION SANDBOX] Un prompt Mobile Money fictif (${tx.operatorNetwork || 'MoMo'}) de ${tx.pricing.chargedAmount} ${tx.pricing.chargedCurrency} a été généré pour ${tx.customer.name}. Cliquez sur "Simuler la confirmation" pour tester la validation serveur et l'activation d'abonnement.`;
    } else if (tx.channel === 'card') {
      promptInstructions = `[SIMULATION SANDBOX] Paiement Carte 3D-Secure fictif de ${tx.pricing.chargedAmount} ${tx.pricing.chargedCurrency}.`;
    }

    return {
      success: true,
      reference: tx.reference,
      providerReference: `SND_GW_${Date.now()}`,
      status: initialStatus,
      checkoutUrl: `/checkout/sandbox?ref=${tx.reference}`,
      promptInstructions,
      gatewayResponse: "Transaction sandbox initialisée avec succès (Test Développeur)"
    };
  }

  public async verify(reference: string): Promise<WaPayConnectorVerifyResult> {
    const status = this.simulatedStates.get(reference) || 'pending';
    const isVerified = status === 'verified';

    return {
      verified: isVerified,
      status,
      reference,
      providerReference: `SND_VERIF_${reference}`,
      chargedAmount: 0,
      chargedCurrency: 'GHS',
      gatewayResponse: isVerified 
        ? "Transaction validée en environnement de test Sandbox" 
        : "Paiement sandbox en attente de validation ou échoué"
    };
  }

  /**
   * Helper for tests & interactive UI: force state transition
   */
  public simulateStateChange(reference: string, newStatus: WaPayTransactionStatus): boolean {
    this.simulatedStates.set(reference, newStatus);
    return true;
  }

  public validateWebhook(payload: any, signature?: string): boolean {
    return signature === 'sandbox_secret' || payload?.isSandbox === true;
  }
}

export const sandboxConnectorInstance = new SandboxConnector();
