/**
 * WA Pay - Base Connector Interface
 * Standardized protocol for all financial gateway connectors (Paystack, Hubtel, Wave, Orange Money, Safaricom Daraja, Sandbox)
 */

import { 
  WaPayProviderId, 
  WaPayCurrency, 
  WaPayChannel, 
  WaPayTransaction, 
  WaPayTransactionStatus,
  ProviderIntegrationStatus
} from '../types.ts';

export interface WaPayConnectorInitiateResult {
  success: boolean;
  reference: string;
  providerReference?: string;
  status: WaPayTransactionStatus;
  checkoutUrl?: string;
  promptInstructions?: string;
  gatewayResponse?: string;
  metadata?: Record<string, any>;
}

export interface WaPayConnectorVerifyResult {
  verified: boolean;
  status: WaPayTransactionStatus;
  reference: string;
  providerReference?: string;
  chargedAmount: number;
  chargedCurrency: WaPayCurrency;
  gatewayResponse?: string;
  metadata?: Record<string, any>;
}

export interface IWaPayConnector {
  readonly id: WaPayProviderId;
  readonly name: string;
  readonly supportedCurrencies: WaPayCurrency[];
  readonly supportedCountries: string[];
  readonly supportedChannels: WaPayChannel[];
  readonly contractRequirement: string;
  
  /**
   * Current operational status of the integration
   */
  getIntegrationStatus(): ProviderIntegrationStatus;

  /**
   * Check if live production keys/tokens are configured on the server
   */
  isConfigured(): boolean;

  /**
   * Initiate payment with provider
   */
  initiate(tx: WaPayTransaction): Promise<WaPayConnectorInitiateResult>;

  /**
   * Authoritatively verify payment directly with provider API
   */
  verify(reference: string, providerReference?: string): Promise<WaPayConnectorVerifyResult>;

  /**
   * Cryptographically validate webhook authenticity (HMAC-SHA512 / SHA256 / RSA)
   */
  validateWebhook(payload: any, signature?: string): boolean;
}
