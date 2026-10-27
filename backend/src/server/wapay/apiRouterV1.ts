/**
 * WA Pay - Unified REST API (v1)
 * Versioned, secure financial endpoints with server-side validation,
 * idempotency enforcement, and webhook authentication.
 */

import express, { Request, Response } from 'express';
import { waPayEngineInstance } from './engine.ts';
import { WaPayProviderId } from './types.ts';
import { FraudProtectionService } from '../fraudProtectionService.ts';
import { SubscriptionLifecycleService } from '../subscriptionLifecycleService.ts';

export const apiRouterV1 = express.Router();
const engine = waPayEngineInstance;

/**
 * POST /api/v1/payments
 * Initiate a new payment transaction with idempotency protection
 */
apiRouterV1.post('/payments', async (req: Request, res: Response) => {
  try {
    const idempotencyHeader = req.headers['idempotency-key'] as string;
    const body = req.body;

    const result = await engine.initiatePayment({
      ...body,
      idempotencyKey: idempotencyHeader || body.idempotencyKey
    });

    return res.status(201).json(result);
  } catch (err: any) {
    console.error('WA Pay Initiate Error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || "Erreur lors de l'initiation du paiement"
    });
  }
});

/**
 * GET /api/v1/payments/:id
 * Retrieve transaction status and verification details
 */
apiRouterV1.get('/payments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const tx = engine.getTransaction(id);

  if (!tx) {
    return res.status(404).json({ error: "Transaction introuvable" });
  }

  return res.json({
    reference: tx.reference,
    status: tx.status,
    pricing: tx.pricing,
    customer: tx.customer,
    channel: tx.channel,
    operatorNetwork: tx.operatorNetwork,
    provider: tx.providerId,
    subscriptionActivated: tx.subscriptionActivated,
    createdAt: tx.createdAt,
    verifiedAt: tx.verifiedAt
  });
});

/**
 * POST /api/v1/payments/verify
 * Authoritative payment verification directly with gateway
 */
apiRouterV1.post('/payments/verify', async (req: Request, res: Response) => {
  try {
    const { 
      reference, 
      planDurationDays, 
      groupName, 
      accessInstructions, 
      inviteLink 
    } = req.body;

    if (!reference) {
      return res.status(400).json({ error: "Référence de transaction requise" });
    }

    const host = req.get('host') || 'localhost:3000';
    const result = await engine.verifyPayment(reference, {
      planDurationDays: planDurationDays ? Number(planDurationDays) : undefined,
      groupName,
      accessInstructions,
      inviteLink,
      host
    });

    return res.json(result);
  } catch (err: any) {
    console.error('WA Pay Verify Error:', err);
    return res.status(400).json({
      verified: false,
      error: err.message || "Erreur lors de la vérification du paiement"
    });
  }
});

/**
 * GET /api/v1/payment-methods
 * Query available payment methods by country, currency, or operator
 */
apiRouterV1.get('/payment-methods', (req: Request, res: Response) => {
  const country = (req.query.country as string)?.toUpperCase();
  const currency = (req.query.currency as string)?.toUpperCase();

  let methods = engine.getPaymentMethods();

  if (country) {
    methods = methods.filter(m => m.countries.includes(country) || m.countries.includes('GLOBAL'));
  }
  if (currency) {
    methods = methods.filter(m => m.currencies.includes(currency as any));
  }

  return res.json({
    total: methods.length,
    methods
  });
});

/**
 * GET /api/v1/providers/status
 * Return live configuration status and contract requirements matrix
 */
apiRouterV1.get('/providers/status', (_req: Request, res: Response) => {
  const connectors = engine.getAllConnectors();
  return res.json({
    engine: 'WA Pay Multi-Country African FinTech Engine',
    version: '1.0.0',
    connectors
  });
});

/**
 * GET /api/v1/transactions
 * Retrieve financial transactions with filters for auditing
 */
apiRouterV1.get('/transactions', (req: Request, res: Response) => {
  const { status, currency, country, provider, search, limit } = req.query;

  const transactions = engine.listTransactions({
    status: status as string,
    currency: currency as string,
    country: country as string,
    provider: provider as string,
    search: search as string,
    limit: limit ? Number(limit) : undefined
  });

  return res.json({
    count: transactions.length,
    transactions
  });
});

/**
 * GET /api/v1/settlements
 * Financial settlement report (gross volume, net settlement, fee analysis)
 */
apiRouterV1.get('/settlements', (_req: Request, res: Response) => {
  const summary = engine.getSettlementSummary();
  return res.json(summary);
});

/**
 * POST /api/v1/refunds
 * Process authorized refund and record ledger debit
 */
apiRouterV1.post('/refunds', (req: Request, res: Response) => {
  try {
    const { reference, reason, adminId } = req.body;
    if (!reference || !reason) {
      return res.status(400).json({ error: "Référence et motif requis pour le remboursement" });
    }

    const refunded = engine.processRefund({
      reference,
      reason,
      adminId: adminId || 'admin_default'
    });

    return res.json({
      success: true,
      message: "Remboursement enregistré avec succès dans le registre financier",
      transaction: refunded
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Erreur de remboursement" });
  }
});

/**
 * POST /api/v1/webhooks/:provider
 * Receive authenticated webhook notification from partner gateways
 */
apiRouterV1.post('/webhooks/:provider', async (req: Request, res: Response) => {
  const provider = req.params.provider as WaPayProviderId;
  const signature = 
    (req.headers['x-paystack-signature'] as string) ||
    (req.headers['x-hubtel-signature'] as string) ||
    (req.headers['wave-signature'] as string) ||
    (req.headers['x-signature'] as string);

  try {
    const result = await engine.handleWebhook(provider, req.body, signature);
    return res.json(result);
  } catch (err: any) {
    console.warn(`Webhook error for ${provider}:`, err.message);
    return res.status(401).json({ error: err.message || "Webhook invalide" });
  }
});

/**
 * POST /api/v1/sandbox/simulate-success
 * Developer / Test helper: simulate gateway confirmation in Sandbox
 */
apiRouterV1.post('/sandbox/simulate-success', async (req: Request, res: Response) => {
  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ error: "Référence requise" });
  }

  const tx = engine.getTransaction(reference);
  if (!tx) {
    return res.status(404).json({ error: "Transaction non trouvée" });
  }

  // Set sandbox connector state
  const { sandboxConnectorInstance } = await import('./connectors/sandboxConnector.ts');
  sandboxConnectorInstance.simulateStateChange(reference, 'verified');

  // Verify authoritatively
  const verifyResult = await engine.verifyPayment(reference);

  return res.json({
    success: true,
    message: "Simulation de paiement sandbox confirmée avec succès.",
    verification: verifyResult
  });
});

/**
 * GET /api/v1/payouts/balance
 * Returns real-time available withdrawal balance, net earned, and destination account
 */
apiRouterV1.get('/payouts/balance', (req: Request, res: Response) => {
  const adminId = (req.query.adminId as string) || 'admin_default';
  const balance = engine.getBalanceSummary(adminId);
  return res.json(balance);
});

/**
 * GET /api/v1/payouts
 * Retrieve payout withdrawal history for the admin
 */
apiRouterV1.get('/payouts', (req: Request, res: Response) => {
  const adminId = (req.query.adminId as string) || 'admin_default';
  const payouts = engine.listPayouts(adminId);
  return res.json({
    count: payouts.length,
    payouts
  });
});

/**
 * POST /api/v1/payouts/request
 * Request a withdrawal from the available balance to Mobile Money or Bank
 */
apiRouterV1.post('/payouts/request', (req: Request, res: Response) => {
  try {
    const { adminId = 'admin_default', amount, destination } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Montant de retrait obligatoire" });
    }

    const payout = engine.requestPayout({
      adminId,
      amount: Number(amount),
      destination
    });

    return res.status(201).json({
      success: true,
      message: `Retrait de ${payout.amount} GH₵ initié avec succès vers ${payout.destination.channel === 'mobile_money' ? payout.destination.momoProvider?.toUpperCase() : payout.destination.bankName}`,
      payout,
      newBalance: engine.getBalanceSummary(adminId)
    });
  } catch (err: any) {
    console.error("Payout Request Error:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message || "Erreur lors de la demande de retrait"
    });
  }
});

/**
 * POST /api/v1/payouts/destination
 * Configure default beneficiary payout account (Mobile Money / Bank)
 */
apiRouterV1.post('/payouts/destination', (req: Request, res: Response) => {
  try {
    const { adminId = 'admin_default', destination } = req.body;
    if (!destination || !destination.accountName) {
      return res.status(400).json({ error: "Informations de compte bénéficiaire incomplètes" });
    }

    const saved = engine.setPayoutDestination(adminId, destination);
    return res.json({
      success: true,
      message: "Coordonnées de retrait enregistrées avec succès.",
      destination: saved
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Erreur de configuration" });
  }
});

/**
 * POST /api/v1/lifecycle/run-check
 * Trigger predictive automated WhatsApp renewal reminders (Drip J-3 / J-1 / J-0) and expirations
 */
apiRouterV1.post('/lifecycle/run-check', async (req: Request, res: Response) => {
  try {
    const { members = [], groups = [], plans = [], baseUrl } = req.body;
    const origin = baseUrl || `${req.protocol}://${req.get('host')}`;
    const result = await SubscriptionLifecycleService.executeAutomatedScan(members, groups, plans, origin);
    return res.json({
      success: true,
      message: `Scan exécuté : ${result.expiredCount} expiré(s), ${result.expiringIn24hCount} à J-1, ${result.expiringIn3DaysCount} à J-3. ${result.alertsGenerated.length} relance(s) WhatsApp envoyée(s).`,
      result
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Erreur lors du scan du cycle de vie" });
  }
});

/**
 * POST /api/v1/lifecycle/revoke-member
 * Manually revoke an expired member and dispatch official WhatsApp notification
 */
apiRouterV1.post('/lifecycle/revoke-member', async (req: Request, res: Response) => {
  try {
    const { member, groupName = 'Groupe VIP', baseUrl } = req.body;
    if (!member || !member.id) {
      return res.status(400).json({ error: "Données de membre requises" });
    }
    const origin = baseUrl || `${req.protocol}://${req.get('host')}`;
    const alert = await SubscriptionLifecycleService.revokeAndNotifyMember(member, groupName, origin);
    return res.json({
      success: true,
      message: `Accès révoqué et notification WhatsApp envoyée à ${member.displayName}`,
      alert
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Erreur de révocation" });
  }
});

/**
 * GET /api/v1/lifecycle/alerts
 * Get historical WhatsApp renewal & expiration notifications
 */
apiRouterV1.get('/lifecycle/alerts', (req: Request, res: Response) => {
  const adminId = (req.query.adminId as string) || 'admin_default';
  const alerts = SubscriptionLifecycleService.getAlertHistory(adminId);
  return res.json({ count: alerts.length, alerts });
});

/**
 * GET /api/v1/kyc/status
 * Get merchant progressive KYC verification status
 */
apiRouterV1.get('/kyc/status', (req: Request, res: Response) => {
  const adminId = (req.query.adminId as string) || 'admin_default';
  const profile = FraudProtectionService.getKycProfile(adminId);
  return res.json({ profile, thresholdGHS: FraudProtectionService.KYC_THRESHOLD_GHS });
});

/**
 * POST /api/v1/kyc/submit
 * Submit identity document for light KYC verification
 */
apiRouterV1.post('/kyc/submit', (req: Request, res: Response) => {
  try {
    const { 
      adminId = 'admin_default', 
      documentType, 
      documentNumber, 
      fullName, 
      country = 'GH',
      frontImage,
      backImage,
      selfieImage
    } = req.body;
    if (!documentNumber || !fullName) {
      return res.status(400).json({ error: "Numéro de document et nom complet obligatoires" });
    }
    const updated = FraudProtectionService.submitKyc({
      adminId,
      documentType: documentType || 'id_card',
      documentNumber,
      fullName,
      country,
      frontImage,
      backImage,
      selfieImage
    });
    return res.json({
      success: true,
      message: "Dossier KYC et selfie de conformité enregistrés et validés. Retraits illimités débloqués.",
      profile: updated
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Erreur de vérification KYC" });
  }
});

/**
 * GET /api/v1/merchants/split-config
 * Get merchant split-payment subaccount configuration
 */
apiRouterV1.get('/merchants/split-config', (req: Request, res: Response) => {
  const adminId = (req.query.adminId as string) || 'admin_default';
  const subAccountCode = engine.getSplitSubAccount(adminId);
  return res.json({
    adminId,
    enabled: Boolean(subAccountCode),
    subAccountCode: subAccountCode || '',
    merchantSharePercent: 98,
    platformSharePercent: 2
  });
});

/**
 * POST /api/v1/merchants/split-config
 * Configure merchant split-payment subaccount code
 */
apiRouterV1.post('/merchants/split-config', (req: Request, res: Response) => {
  try {
    const { adminId = 'admin_default', subAccountCode } = req.body;
    if (!subAccountCode) {
      return res.status(400).json({ error: "Code de sous-compte Paystack / Hubtel requis" });
    }
    engine.setSplitSubAccount(adminId, subAccountCode.trim());
    return res.json({
      success: true,
      message: "Sous-compte de split-payment configuré. Les fonds seront ventilés à 98% directement chez l'opérateur.",
      subAccountCode: subAccountCode.trim()
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Erreur de configuration split" });
  }
});

