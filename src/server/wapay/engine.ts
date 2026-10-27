/**
 * WA Pay - Central FinTech Engine
 * Autonomous payment engine: lifecycle coordination, multi-currency ledger,
 * idempotency protection, provider routing, and subscription activation.
 */

import crypto from 'node:crypto';
import { 
  WaPayTransaction, 
  WaPayInitiateRequest, 
  WaPayInitiateResponse, 
  WaPayVerifyResponse, 
  WaPayRefundRequest, 
  WaPayCurrency,
  WaPayPricingBreakdown,
  WaPayProviderId
} from './types.ts';
import { financialLedgerInstance } from './ledger.ts';
import { connectorRegistryInstance } from './connectors/registry.ts';
import { OneTimeAccessService } from '../oneTimeAccessService.ts';
import { SubscriptionService } from '../subscriptionService.ts';
import { WhatsAppCloudApiService } from '../whatsappCloudApi.ts';
import { FraudProtectionService } from '../fraudProtectionService.ts';
import { SUPPORTED_CURRENCIES } from '../../utils/currency.ts';

export class WaPayEngine {
  private ledger = financialLedgerInstance;
  private registry = connectorRegistryInstance;

  /**
   * Verified exchange rates relative to Ghana Cedi (1 GHS = X in target currency)
   */
  private getExchangeRate(targetCurrency: WaPayCurrency): number {
    const config = SUPPORTED_CURRENCIES[targetCurrency];
    if (config?.rateFromGHS) {
      return config.rateFromGHS;
    }
    switch (targetCurrency) {
      case 'GHS': return 1.0;
      case 'XOF': return 42.0;
      case 'XAF': return 42.0;
      case 'NGN': return 105.0;
      case 'KES': return 8.8;
      case 'USD': return 0.075;
      case 'EUR': return 0.068;
      case 'ZAR': return 1.35;
      default: return 1.0;
    }
  }

  /**
   * Computes authoritative multi-currency breakdown and fee reconciliation
   */
  public computePricing(amountGHS: number, targetCurrency: WaPayCurrency = 'GHS'): WaPayPricingBreakdown {
    const baseGHS = Math.max(1, Number(amountGHS));
    const rate = this.getExchangeRate(targetCurrency);
    const charged = targetCurrency === 'GHS' || targetCurrency === 'USD' || targetCurrency === 'EUR'
      ? Math.round((baseGHS * rate) * 100) / 100
      : Math.round(baseGHS * rate);

    // Operator network fee: approx 1.5%
    const operatorFee = Math.round((baseGHS * 0.015) * 100) / 100;
    // WA Pay platform commission: 1.0%
    const platformFee = Math.round((baseGHS * 0.010) * 100) / 100;
    // Net merchant settlement in GHS
    const netGHS = Math.round((baseGHS - operatorFee - platformFee) * 100) / 100;

    return {
      displayAmount: baseGHS,
      displayCurrency: 'GHS',
      chargedAmount: charged,
      chargedCurrency: targetCurrency,
      exchangeRate: rate,
      operatorFeeEstimated: operatorFee,
      platformFee,
      netSettlementAmountGHS: netGHS,
      settlementCurrency: 'GHS'
    };
  }

  /**
   * Generate a tamper-proof unique transaction reference
   */
  private generateReference(providerId: WaPayProviderId): string {
    const prefix = providerId.toUpperCase().slice(0, 3);
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `WAPAY_${prefix}_${ts}_${rand}`;
  }

  /**
   * 1. INITIATE PAYMENT: Validates parameters, prevents duplicates, computes pricing, routes to connector
   */
  public async initiatePayment(req: WaPayInitiateRequest): Promise<WaPayInitiateResponse> {
    if (!req.adminId || !req.groupId || !req.planId || !req.amount || !req.customerName || !req.customerPhone) {
      throw new Error("Paramètres requis manquants : adminId, groupId, planId, amount, customerName et customerPhone sont obligatoires.");
    }

    // Anti-Fraud Velocity & Rate Limiting Check
    const fraudCheck = FraudProtectionService.evaluatePaymentRisk(req.customerPhone);
    if (!fraudCheck.allowed) {
      throw new Error(fraudCheck.reason || "Paiement temporairement suspendu par la sécurité anti-fraude.");
    }

    // Idempotency check: if client provided an idempotency key, return existing transaction if found
    const idempotencyKey = req.idempotencyKey || `idemp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const existingTx = this.ledger.getByIdempotencyKey(idempotencyKey);
    if (existingTx) {
      return {
        success: true,
        reference: existingTx.reference,
        idempotencyKey: existingTx.idempotencyKey,
        status: existingTx.status,
        provider: existingTx.providerId,
        pricing: existingTx.pricing,
        checkoutUrl: existingTx.checkoutUrl,
        promptInstructions: existingTx.promptInstructions,
        isSandbox: existingTx.isSandbox,
        message: "Transaction existante récupérée par clé d'idempotence"
      };
    }

    const targetCurr: WaPayCurrency = (req.targetCurrency || req.displayCurrency || 'GHS').toUpperCase() as WaPayCurrency;
    const pricing = this.computePricing(req.amount, targetCurr);

    // Select connector based on country, currency, channel, and provider configuration
    const connector = this.registry.selectConnector({
      country: req.country || 'GH',
      currency: targetCurr,
      channel: req.channel,
      requestedProvider: undefined,
      isSandboxRequested: false
    });

    const reference = this.generateReference(connector.id);
    const now = new Date().toISOString();

    // Recurring calculation if enabled
    const isRecurring = Boolean(req.isRecurring);
    const recurringInterval = req.recurringInterval || 'monthly';
    let nextBillingDate: string | undefined = undefined;
    if (isRecurring) {
      const days = recurringInterval === 'annual' ? 365 : recurringInterval === 'quarterly' ? 90 : 30;
      nextBillingDate = new Date(Date.now() + days * 86400000).toISOString();
    }

    // Split-Payment configuration if merchant has subaccount
    const subAccountCode = req.splitSubAccountCode || this.ledger.getSplitSubAccount(req.adminId);
    const splitPayment = subAccountCode ? {
      enabled: true,
      subAccountCode,
      merchantShareGHS: pricing.netSettlementAmountGHS,
      platformShareGHS: pricing.platformFee
    } : undefined;

    const tx: WaPayTransaction = {
      id: `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      reference,
      idempotencyKey,
      adminId: req.adminId,
      groupId: req.groupId,
      planId: req.planId,
      pricing,
      customer: {
        name: req.customerName.trim(),
        phone: req.customerPhone.trim(),
        email: req.customerEmail?.trim(),
        country: (req.country || 'GH').toUpperCase()
      },
      providerId: connector.id,
      channel: req.channel,
      operatorNetwork: req.operatorNetwork,
      status: 'initiated',
      statusHistory: [{ status: 'initiated', timestamp: now }],
      isSandbox: connector.id === 'sandbox',
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      recurringToken: isRecurring ? `tok_rec_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}` : undefined,
      nextBillingDate,
      splitPayment,
      subscriptionActivated: false,
      createdAt: now,
      updatedAt: now
    };

    // Save initial transaction state
    this.ledger.saveTransaction(tx);

    try {
      // Execute payment initiation on the selected connector
      const initResult = await connector.initiate(tx);

      tx.status = initResult.status;
      tx.providerReference = initResult.providerReference;
      tx.checkoutUrl = initResult.checkoutUrl;
      tx.promptInstructions = initResult.promptInstructions;
      tx.gatewayResponse = initResult.gatewayResponse;
      tx.statusHistory.push({ status: initResult.status, timestamp: new Date().toISOString() });

      this.ledger.saveTransaction(tx);

      return {
        success: true,
        reference: tx.reference,
        idempotencyKey: tx.idempotencyKey,
        status: tx.status,
        provider: tx.providerId,
        pricing: tx.pricing,
        checkoutUrl: tx.checkoutUrl,
        promptInstructions: tx.promptInstructions,
        isSandbox: tx.isSandbox,
        message: "Demande de paiement SBI Pay créée avec succès"
      };
    } catch (err: any) {
      tx.status = 'failed';
      tx.gatewayResponse = err.message;
      tx.statusHistory.push({ status: 'failed', timestamp: new Date().toISOString(), reason: err.message });
      this.ledger.saveTransaction(tx);
      throw err;
    }
  }

  /**
   * 2. VERIFY PAYMENT: Authoritatively verifies gateway confirmation, enforces single activation, records ledger
   */
  public async verifyPayment(
    reference: string, 
    context?: {
      planDurationDays?: number;
      groupName?: string;
      accessInstructions?: string;
      inviteLink?: string;
      host?: string;
    }
  ): Promise<WaPayVerifyResponse> {
    if (!reference) {
      throw new Error("La référence de transaction est obligatoire");
    }

    const tx = this.ledger.getByReference(reference);
    if (!tx) {
      throw new Error(`Transaction SBI Pay non trouvée pour la référence: ${reference}`);
    }

    // If already verified, return cached state with activation details without duplicate debit
    if (tx.status === 'verified') {
      const alreadyActivated = this.ledger.isSubscriptionAlreadyActivated(reference);
      return {
        verified: true,
        status: 'verified',
        reference: tx.reference,
        transaction: tx,
        activation: {
          startDate: tx.activationDate || tx.createdAt,
          expiresAt: new Date(new Date(tx.activationDate || tx.createdAt).getTime() + 30 * 86400000).toISOString(),
          waInviteMessage: "Votre abonnement est actif et déjà validé.",
          alreadyActivated
        },
        message: "Transaction déjà vérifiée avec succès."
      };
    }

    const connector = this.registry.getConnector(tx.providerId);
    const verifyResult = await connector.verify(tx.reference, tx.providerReference);

    tx.gatewayResponse = verifyResult.gatewayResponse;
    tx.status = verifyResult.status;
    tx.statusHistory.push({ status: verifyResult.status, timestamp: new Date().toISOString() });

    if (!verifyResult.verified) {
      FraudProtectionService.recordPaymentFailure(tx.customer.phone);
      this.ledger.saveTransaction(tx);
      return {
        verified: false,
        status: tx.status,
        reference: tx.reference,
        transaction: tx,
        message: "Paiement non confirmé par l'opérateur ou la passerelle de paiement."
      };
    }

    // Payment is legitimately confirmed!
    FraudProtectionService.recordPaymentSuccess(tx.customer.phone);
    const verifiedAt = new Date().toISOString();
    tx.status = 'verified';
    tx.verifiedAt = verifiedAt;
    tx.settledAt = verifiedAt;

    // Record double-entry entries in financial ledger
    this.ledger.recordDoubleEntry(tx);

    // Enforce SINGLE subscription activation (Double-spend protection)
    let activationData: any = undefined;
    if (!this.ledger.isSubscriptionAlreadyActivated(reference)) {
      this.ledger.markSubscriptionActivated(reference);
      tx.subscriptionActivated = true;
      tx.activationDate = verifiedAt;

      const duration = context?.planDurationDays || 30;
      const groupName = context?.groupName || 'Groupe VIP WA Monetizer';
      const instructions = context?.accessInstructions || '';
      const inviteUrl = context?.inviteLink || 'https://chat.whatsapp.com/demo-vip';

      // Generate Single-Use Token for WhatsApp access
      const tokenRecord = OneTimeAccessService.createToken(
        tx.adminId,
        tx.groupId,
        inviteUrl,
        tx.memberId || '',
        48 // valid for 48 hours
      );

      tx.oneTimeAccessToken = tokenRecord.token;

      const host = context?.host || 'localhost:3000';
      const oneTimeAccessUrl = `https://${host}/api/access/${tokenRecord.token}`;

      const waInviteMessage = `Bonjour ${tx.customer.name} ! Votre abonnement SBI Pay pour le groupe "${groupName}" est validé (${tx.pricing.chargedAmount} ${tx.pricing.chargedCurrency}).\n\n` +
        `🔐 LIEN D'ACCÈS PERSONNEL & UNIQUE (S'autodétruit après 1 clic) :\n${oneTimeAccessUrl}\n\n` +
        `⚠️ Ne partagez jamais ce lien. Dès que vous cliquez une fois, il ne fonctionnera plus.\n\n` +
        `Consignes de l'administrateur : ${instructions}`;

      activationData = {
        startDate: verifiedAt,
        expiresAt: new Date(Date.now() + duration * 86400000).toISOString(),
        oneTimeAccessUrl,
        waInviteMessage,
        alreadyActivated: false
      };

      // Send WhatsApp confirmation if customer phone provided and Cloud API configured
      if (tx.customer.phone) {
        WhatsAppCloudApiService.sendMessage({
          to: tx.customer.phone,
          message: waInviteMessage
        }).catch(err => console.error("WhatsApp Cloud notification notice:", err));
      }
    }

    this.ledger.saveTransaction(tx);

    return {
      verified: true,
      status: 'verified',
      reference: tx.reference,
      transaction: tx,
      activation: activationData,
      message: "Paiement SBI Pay vérifié et abonnement activé avec succès !"
    };
  }

  /**
   * 3. PROCESS WEBHOOK: Handles real-time gateway notifications with signature validation
   */
  public async handleWebhook(providerId: WaPayProviderId, payload: any, signature?: string): Promise<{ received: boolean; reference?: string }> {
    const connector = this.registry.getConnector(providerId);

    // Validate signature
    const isValid = connector.validateWebhook(payload, signature);
    if (!isValid && !process.env.ALLOW_INSECURE_WEBHOOK) {
      throw new Error(`Signature de webhook invalide pour le prestataire ${providerId}`);
    }

    // Extract reference
    let reference = '';
    if (providerId === 'paystack') {
      reference = payload?.data?.reference || '';
    } else if (providerId === 'hubtel') {
      reference = payload?.Data?.ClientReference || payload?.clientReference || '';
    } else if (providerId === 'wave') {
      reference = payload?.data?.client_reference || '';
    } else if (providerId === 'orange_money') {
      reference = payload?.order_id || '';
    } else if (providerId === 'mpesa_daraja') {
      reference = payload?.Body?.stkCallback?.AccountReference || '';
    } else {
      reference = payload?.reference || '';
    }

    if (reference) {
      await this.verifyPayment(reference);
    }

    return { received: true, reference };
  }

  /**
   * 4. PROCESS REFUND: Handles verified transaction refund and updates ledger
   */
  public processRefund(req: WaPayRefundRequest): WaPayTransaction {
    if (!req.reference || !req.reason) {
      throw new Error("Référence et motif de remboursement obligatoires");
    }
    const refundedTx = this.ledger.recordRefund(req.reference, req.reason);
    if (!refundedTx) {
      throw new Error(`Transaction ${req.reference} introuvable pour remboursement`);
    }
    return refundedTx;
  }

  /**
   * 5. REPORTING: Financial Settlement & Volume Reports
   */
  public getSettlementSummary() {
    return this.ledger.getSettlementSummary();
  }

  public listTransactions(filter?: any) {
    return this.ledger.listTransactions(filter);
  }

  public getTransaction(reference: string) {
    return this.ledger.getByReference(reference);
  }

  public getPaymentMethods() {
    return this.registry.getPaymentMethodsMatrix();
  }

  public getAllConnectors() {
    return this.registry.getAllConnectors().map(c => ({
      id: c.id,
      name: c.name,
      status: c.getIntegrationStatus(),
      isConfigured: c.isConfigured(),
      currencies: c.supportedCurrencies,
      countries: c.supportedCountries,
      channels: c.supportedChannels,
      contractRequirement: c.contractRequirement
    }));
  }

  /**
   * 6. PAYOUTS & WITHDRAWALS: Balance, destination accounts, and transfer requests
   */
  public getBalanceSummary(adminId: string = 'admin_default') {
    return this.ledger.getBalanceSummary(adminId);
  }

  public requestPayout(params: {
    adminId: string;
    amount: number;
    destination?: any;
  }) {
    return this.ledger.requestPayout(params);
  }

  public listPayouts(adminId?: string) {
    return this.ledger.listPayouts(adminId);
  }

  public getPayoutDestination(adminId: string) {
    return this.ledger.getPayoutDestination(adminId);
  }

  public setPayoutDestination(adminId: string, dest: any) {
    return this.ledger.setPayoutDestination(adminId, dest);
  }

  public setSplitSubAccount(adminId: string, subAccountCode: string) {
    return this.ledger.setSplitSubAccount(adminId, subAccountCode);
  }

  public getSplitSubAccount(adminId: string) {
    return this.ledger.getSplitSubAccount(adminId);
  }
}

export const waPayEngineInstance = new WaPayEngine();
