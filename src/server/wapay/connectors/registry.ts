/**
 * WA Pay - Connector Registry & Smart Router
 * Manages provider registration, checks configuration and routes transactions
 * to the most appropriate compliant financial connector.
 */

import { IWaPayConnector } from './base.ts';
import { PaystackConnector } from './paystackConnector.ts';
import { HubtelConnector } from './hubtelConnector.ts';
import { WaveConnector } from './waveConnector.ts';
import { OrangeMoneyConnector } from './orangeMoneyConnector.ts';
import { MpesaDarajaConnector } from './mpesaConnector.ts';
import { SandboxConnector, sandboxConnectorInstance } from './sandboxConnector.ts';
import { 
  WaPayProviderId, 
  WaPayCurrency, 
  WaPayChannel, 
  WaPayPaymentMethod 
} from '../types.ts';

export class WaPayConnectorRegistry {
  private connectors = new Map<WaPayProviderId, IWaPayConnector>();

  constructor() {
    this.registerConnector(new PaystackConnector());
    this.registerConnector(new HubtelConnector());
    this.registerConnector(new WaveConnector());
    this.registerConnector(new OrangeMoneyConnector());
    this.registerConnector(new MpesaDarajaConnector());
    this.registerConnector(sandboxConnectorInstance);
  }

  public registerConnector(connector: IWaPayConnector): void {
    this.connectors.set(connector.id, connector);
  }

  public getConnector(id: WaPayProviderId): IWaPayConnector {
    return this.connectors.get(id) || sandboxConnectorInstance;
  }

  public getAllConnectors(): IWaPayConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Smart Router: Selects the optimal connector based on Country, Currency, Channel, and Live Configuration
   */
  public selectConnector(params: {
    country: string;
    currency: WaPayCurrency;
    channel: WaPayChannel;
    requestedProvider?: WaPayProviderId;
    isSandboxRequested?: boolean;
  }): IWaPayConnector {
    const { country, currency, channel, requestedProvider, isSandboxRequested } = params;

    // If sandbox mode is explicitly requested, return sandbox connector
    if (isSandboxRequested || requestedProvider === 'sandbox') {
      return sandboxConnectorInstance;
    }

    // If a specific provider was explicitly requested and configured
    if (requestedProvider) {
      const explicitConn = this.connectors.get(requestedProvider);
      if (explicitConn && explicitConn.isConfigured()) {
        return explicitConn;
      }
    }

    // 1. Ghana (GH - GHS)
    if (country === 'GH' || currency === 'GHS') {
      const hubtel = this.connectors.get('hubtel');
      const paystack = this.connectors.get('paystack');

      if (channel === 'mobile_money' && hubtel?.isConfigured()) {
        return hubtel;
      }
      if (paystack?.isConfigured()) {
        return paystack;
      }
    }

    // 2. Zone XOF (Senegal, Côte d'Ivoire)
    if (currency === 'XOF' || ['CI', 'SN'].includes(country)) {
      const wave = this.connectors.get('wave');
      const om = this.connectors.get('orange_money');

      if (wave?.isConfigured()) return wave;
      if (om?.isConfigured()) return om;
    }

    // 3. Zone XAF (Cameroon, Gabon, etc.)
    if (currency === 'XAF' || country === 'CM') {
      const om = this.connectors.get('orange_money');
      if (om?.isConfigured()) return om;
    }

    // 4. Kenya (KE - KES)
    if (country === 'KE' || currency === 'KES') {
      const mpesa = this.connectors.get('mpesa_daraja');
      if (mpesa?.isConfigured()) return mpesa;
    }

    // 5. Nigeria (NG - NGN) or International Card Payments
    const paystack = this.connectors.get('paystack');
    if (paystack?.isConfigured()) {
      return paystack;
    }

    // Safe fallback: Sandbox simulation with honest audit warning
    return sandboxConnectorInstance;
  }

  /**
   * Returns list of supported payment methods and operational readiness matrix
   */
  public getPaymentMethodsMatrix(): WaPayPaymentMethod[] {
    return [
      {
        id: 'momo_gh',
        name: 'Mobile Money Ghana (MTN, Telecel, AirtelTigo)',
        channel: 'mobile_money',
        currencies: ['GHS'],
        countries: ['GH'],
        providerId: this.connectors.get('hubtel')?.isConfigured() ? 'hubtel' : (this.connectors.get('paystack')?.isConfigured() ? 'paystack' : 'sandbox'),
        integrationStatus: (this.connectors.get('hubtel')?.isConfigured() || this.connectors.get('paystack')?.isConfigured()) ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED',
        contractRequirement: 'Compte marchand Hubtel Ghana ou Paystack Ghana vérifié avec MoMo activé.',
        operatorNetworks: [
          { id: 'mtn', name: 'MTN Mobile Money', country: 'GH' },
          { id: 'telecel', name: 'Telecel Cash (Vodafone)', country: 'GH' },
          { id: 'airteltigo', name: 'AirtelTigo Money', country: 'GH' }
        ]
      },
      {
        id: 'wave_xof',
        name: 'Wave Mobile Money (Sénégal & Côte d\'Ivoire)',
        channel: 'mobile_money',
        currencies: ['XOF'],
        countries: ['CI', 'SN'],
        providerId: this.connectors.get('wave')?.isConfigured() ? 'wave' : 'sandbox',
        integrationStatus: this.connectors.get('wave')?.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED',
        contractRequirement: 'Compte Entreprise Wave Business vérifié auprès de Wave Digital Finance (Dakar/Abidjan).',
        operatorNetworks: [
          { id: 'wave_ci', name: 'Wave Côte d\'Ivoire', country: 'CI' },
          { id: 'wave_sn', name: 'Wave Sénégal', country: 'SN' }
        ]
      },
      {
        id: 'orange_xof_xaf',
        name: 'Orange Money (Zone Franc CFA - XOF & XAF)',
        channel: 'mobile_money',
        currencies: ['XOF', 'XAF'],
        countries: ['CI', 'SN', 'CM', 'BF', 'ML'],
        providerId: this.connectors.get('orange_money')?.isConfigured() ? 'orange_money' : 'sandbox',
        integrationStatus: this.connectors.get('orange_money')?.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED',
        contractRequirement: 'Agrément Partenaire Orange Money Web Payment avec clés marchandes.',
        operatorNetworks: [
          { id: 'om_ci', name: 'Orange Money Côte d\'Ivoire', country: 'CI' },
          { id: 'om_sn', name: 'Orange Money Sénégal', country: 'SN' },
          { id: 'om_cm', name: 'Orange Money Cameroun', country: 'CM' }
        ]
      },
      {
        id: 'mpesa_ke',
        name: 'Safaricom M-Pesa (Kenya)',
        channel: 'mobile_money',
        currencies: ['KES'],
        countries: ['KE'],
        providerId: this.connectors.get('mpesa_daraja')?.isConfigured() ? 'mpesa_daraja' : 'sandbox',
        integrationStatus: this.connectors.get('mpesa_daraja')?.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED',
        contractRequirement: 'Compte Marchand Safaricom Daraja (Paybill ou Till Number au Kenya).',
        operatorNetworks: [
          { id: 'mpesa', name: 'Safaricom M-Pesa', country: 'KE' }
        ]
      },
      {
        id: 'cards_intl',
        name: 'Cartes Bancaires Internationales (Visa, Mastercard)',
        channel: 'card',
        currencies: ['GHS', 'NGN', 'KES', 'USD', 'EUR', 'ZAR'],
        countries: ['GH', 'NG', 'KE', 'CI', 'FR', 'US', 'ZA'],
        providerId: this.connectors.get('paystack')?.isConfigured() ? 'paystack' : 'sandbox',
        integrationStatus: this.connectors.get('paystack')?.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED',
        contractRequirement: 'Paystack Card Processing ou passerelle bancaire conforme PCI-DSS avec 3-D Secure.',
        operatorNetworks: [
          { id: 'visa', name: 'Visa', country: 'GLOBAL' },
          { id: 'mastercard', name: 'Mastercard', country: 'GLOBAL' }
        ]
      },
      {
        id: 'ngn_banks',
        name: 'Nigeria Mobile & Bank Transfer (OPay, PalmPay, USSD)',
        channel: 'bank_transfer',
        currencies: ['NGN'],
        countries: ['NG'],
        providerId: this.connectors.get('paystack')?.isConfigured() ? 'paystack' : 'sandbox',
        integrationStatus: this.connectors.get('paystack')?.isConfigured() ? 'LIVE_OPERATIONAL' : 'CONTRACT_REQUIRED',
        contractRequirement: 'Agrément CBN Nigeria / Compte marchand Paystack Nigeria ou Flutterwave.',
        operatorNetworks: [
          { id: 'opay', name: 'OPay', country: 'NG' },
          { id: 'palmpay', name: 'PalmPay', country: 'NG' },
          { id: 'bank_transfer', name: 'Virement NIBSS Instant', country: 'NG' }
        ]
      }
    ];
  }
}

export const connectorRegistryInstance = new WaPayConnectorRegistry();
