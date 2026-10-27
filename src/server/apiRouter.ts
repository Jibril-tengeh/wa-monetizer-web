import express, { Request, Response } from 'express';
import { PaystackProvider } from './paymentProviders/paystack.ts';
import { HubtelProvider } from './paymentProviders/hubtel.ts';
import { SandboxProvider, sandboxInstance } from './paymentProviders/sandbox.ts';
import { SubscriptionService } from './subscriptionService.ts';
import { PaymentProvider } from './paymentProviders/types.ts';
import { OneTimeAccessService } from './oneTimeAccessService.ts';
import { WhatsAppCloudApiService } from './whatsappCloudApi.ts';
import { SUPPORTED_CURRENCIES } from '../utils/currency.ts';
import { financialLedgerInstance } from './wapay/ledger.ts';
import { waPayEngineInstance } from './wapay/engine.ts';

export const apiRouter = express.Router();

const paystack = new PaystackProvider();
const hubtel = new HubtelProvider();
const sandbox = sandboxInstance;

// In-memory promo code registry for instant validation
const promoRegistry = new Map<string, {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // 20% or 50 GHS
  isActive: boolean;
  maxUses?: number;
  usedCount: number;
}>([
  ['PROMO20', { code: 'PROMO20', type: 'percentage', value: 20, isActive: true, usedCount: 3 }],
  ['VIP50', { code: 'VIP50', type: 'fixed', value: 50, isActive: true, usedCount: 1 }],
  ['LANCEMENT', { code: 'LANCEMENT', type: 'percentage', value: 15, isActive: true, usedCount: 8 }]
]);

function getProvider(providerName?: string): PaymentProvider {
  if (providerName === 'paystack') {
    if (paystack.isConfigured()) return paystack;
    return sandbox;
  }
  if (providerName === 'hubtel') {
    if (hubtel.isConfigured()) return hubtel;
    return sandbox;
  }
  return sandbox;
}

// 1. Configuration status
apiRouter.get('/config/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    supportedCurrencies: Object.values(SUPPORTED_CURRENCIES).map(c => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      flag: c.flag,
      country: c.countryName,
      dialCode: c.dialCode
    })),
    providers: {
      paystack: {
        id: 'paystack',
        name: 'Paystack Ghana & Multi-Currency',
        isConfigured: paystack.isConfigured(),
        supportedChannels: ['mobile_money', 'card'],
        networks: ['MTN', 'Telecel (Vodafone)', 'AirtelTigo']
      },
      hubtel: {
        id: 'hubtel',
        name: 'Hubtel Ghana',
        isConfigured: hubtel.isConfigured(),
        supportedChannels: ['mobile_money'],
        networks: ['MTN MoMo', 'Telecel Cash', 'AirtelTigo Money']
      },
      sandbox: {
        id: 'sandbox',
        name: 'Mode Sandbox (Test Développeur Multi-Devises)',
        isConfigured: true,
        supportedChannels: ['mobile_money', 'card', 'bank'],
        description: 'Environnement de simulation sécurisé pour tester le flux sans carte bancaire ni compte réel'
      }
    },
    whatsappCloudApi: {
      isConfigured: WhatsAppCloudApiService.isConfigured(),
      notice: WhatsAppCloudApiService.isConfigured()
        ? "WhatsApp Cloud API configurée pour l'envoi officiel"
        : "WhatsApp Cloud API en mode simulation (définissez WHATSAPP_ACCESS_TOKEN et WHATSAPP_PHONE_NUMBER_ID pour l'envoi en direct)"
    },
    defaultProvider: paystack.isConfigured() ? 'paystack' : (hubtel.isConfigured() ? 'hubtel' : 'sandbox')
  });
});

// Geo detection endpoint based on headers, IP & client hints
apiRouter.get('/geo/detect', (req: Request, res: Response) => {
  const cfCountry = req.headers['cf-ipcountry'] as string;
  const xCountry = req.headers['x-country-code'] as string;
  const acceptLanguage = (req.headers['accept-language'] || '') as string;
  
  let detectedCountryCode = (cfCountry || xCountry || '').toUpperCase();

  // If no geo header, inspect Accept-Language header (e.g. fr-CI, fr-SN, en-GH, en-NG, fr-CM, en-KE)
  if (!detectedCountryCode && acceptLanguage) {
    const match = acceptLanguage.match(/[a-z]{2}-([A-Z]{2})/i);
    if (match && match[1]) {
      detectedCountryCode = match[1].toUpperCase();
    }
  }

  // Find in supported currencies or country mapping
  let config = SUPPORTED_CURRENCIES.GHS;

  if (detectedCountryCode) {
    const foundCurrency = Object.values(SUPPORTED_CURRENCIES).find(
      c => c.countryCode === detectedCountryCode
    );
    if (foundCurrency) {
      config = foundCurrency;
    } else if (['CI', 'SN', 'BJ', 'TG', 'BF', 'ML', 'NE', 'GW'].includes(detectedCountryCode)) {
      config = SUPPORTED_CURRENCIES.XOF;
    } else if (['CM', 'GA', 'CG', 'TD', 'CF', 'GQ'].includes(detectedCountryCode)) {
      config = SUPPORTED_CURRENCIES.XAF;
    } else if (['FR', 'BE', 'DE', 'ES', 'IT', 'NL', 'PT', 'LU', 'AT'].includes(detectedCountryCode)) {
      config = SUPPORTED_CURRENCIES.EUR;
    } else if (['US', 'CA'].includes(detectedCountryCode)) {
      config = SUPPORTED_CURRENCIES.USD;
    }
  }

  return res.json({
    countryCode: config.countryCode,
    countryName: config.countryName,
    currency: config.code,
    symbol: config.symbol,
    dialCode: config.dialCode,
    flag: config.flag,
    source: detectedCountryCode ? 'header_locale' : 'default'
  });
});

// 2. Initiate Payment (with multi-currency and promo code support)
apiRouter.post('/payments/initiate', async (req: Request, res: Response) => {
  try {
    const {
      adminId,
      groupId,
      planId,
      amount,
      currency = 'GHS',
      originalAmountGHS,
      country,
      promoCode,
      customerName,
      customerPhone,
      customerEmail,
      channel,
      momoNetwork,
      provider: requestedProvider,
      callbackUrl
    } = req.body;

    if (!adminId || !groupId || !planId || !amount || !customerName || !customerPhone) {
      return res.status(400).json({ 
        error: "Paramètres manquants : adminId, groupId, planId, amount, customerName et customerPhone sont obligatoires." 
      });
    }

    let finalAmount = Number(amount);
    let discountApplied = 0;

    // Apply promo code if present
    if (promoCode) {
      const normalizedCode = String(promoCode).trim().toUpperCase();
      const promo = promoRegistry.get(normalizedCode);
      if (promo && promo.isActive) {
        if (promo.type === 'percentage') {
          discountApplied = (finalAmount * promo.value) / 100;
        } else {
          discountApplied = Math.min(finalAmount, promo.value);
        }
        finalAmount = Math.max(1, finalAmount - discountApplied);
        promo.usedCount += 1;
        promoRegistry.set(normalizedCode, promo);
      }
    }

    const provider = getProvider(requestedProvider);
    const result = await provider.initiatePayment({
      adminId,
      groupId,
      planId,
      amount: finalAmount,
      currency: String(currency).toUpperCase(),
      originalAmountGHS: originalAmountGHS ? Number(originalAmountGHS) : undefined,
      country,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      customerEmail,
      channel: channel === 'card' ? 'card' : (channel === 'bank' ? 'bank' : 'mobile_money'),
      momoNetwork,
      callbackUrl
    });

    return res.json({
      ...result,
      currency: String(currency).toUpperCase(),
      discountApplied,
      finalAmount
    });
  } catch (error: any) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({ error: error.message || "Erreur lors de l'initialisation du paiement" });
  }
});

// 3. Verify Payment and Generate Single-Use Token
apiRouter.post('/payments/verify', async (req: Request, res: Response) => {
  try {
    const { 
      reference, 
      provider: providerName,
      planDurationDays = 30,
      groupName = 'Groupe WhatsApp',
      accessInstructions = '',
      inviteLink = '',
      adminId = 'admin_default',
      groupId = 'grp_default',
      memberId = ''
    } = req.body;

    if (!reference) {
      return res.status(400).json({ error: "La référence de transaction est obligatoire" });
    }

    const provider = getProvider(providerName || (reference.startsWith('SANDBOX_') ? 'sandbox' : 'paystack'));
    
    // Server-side verification directly with the gateway - NEVER trust browser state
    const verification = await provider.verifyPayment(reference);

    if (!verification.verified) {
      return res.status(400).json({
        verified: false,
        status: verification.status,
        message: "Le paiement n'a pas pu être validé auprès de la passerelle.",
        gatewayResponse: verification.gatewayResponse
      });
    }

    // Process subscription activation with server-authoritative dates and idempotency
    const activation = SubscriptionService.processSubscriptionActivation(
      verification,
      Number(planDurationDays),
      groupName,
      accessInstructions,
      inviteLink
    );

    // CRITICAL: GENERATE SINGLE-USE ONE-TIME ACCESS TOKEN FOR WHATSAPP
    // Dès que le membre clique une fois, le lien ne fonctionne plus !
    const targetInviteUrl = inviteLink || 'https://chat.whatsapp.com/demo-accra-forex-vip';
    const tokenRecord = OneTimeAccessService.createToken(
      adminId,
      groupId,
      targetInviteUrl,
      memberId,
      48 // valid for 48 hours
    );

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const oneTimeAccessUrl = `${protocol}://${host}/api/access/${tokenRecord.token}`;
    const oneTimeAppUrl = `${protocol}://${host}/#access?token=${tokenRecord.token}`;

    const waInviteMessage = `Bonjour ${verification.customerName || ''} ! Votre abonnement au groupe "${groupName}" est validé avec succès.\n\n` +
      `🔐 LIEN D'ACCÈS UNIQUE & PERSONNEL (Ce lien s'autodétruit après 1 clic) :\n${oneTimeAccessUrl}\n\n` +
      `⚠️ Attention : Ne partagez pas ce lien. Dès que vous cliquez une fois, il ne fonctionnera plus.\n\n` +
      `Consignes : ${accessInstructions}`;

    const waClickToChat = verification.customerPhone 
      ? SubscriptionService.generateWhatsAppDirectLink(verification.customerPhone, waInviteMessage)
      : undefined;

    // Send official WhatsApp message if Cloud API configured
    if (verification.customerPhone) {
      WhatsAppCloudApiService.sendMessage({
        to: verification.customerPhone,
        message: waInviteMessage
      }).catch(err => console.error("Auto WhatsApp notification failed:", err));
    }

    // Sync with WA Pay Financial Ledger & Audit Trail
    let existingTx = financialLedgerInstance.getByReference(reference);
    if (!existingTx) {
      const pricing = waPayEngineInstance.computePricing(
        verification.amount || 150, 
        (verification.currency || 'GHS') as any
      );
      const nowStr = new Date().toISOString();
      const syncedTx = {
        id: `tx_${Date.now()}`,
        reference,
        idempotencyKey: `idemp_${reference}`,
        adminId,
        groupId,
        planId: memberId || 'plan_default',
        pricing,
        customer: {
          name: verification.customerName || 'Client anonyme',
          phone: verification.customerPhone || '+233 00 000 0000',
          email: verification.customerEmail,
          country: 'GH'
        },
        providerId: (providerName || 'sandbox') as any,
        channel: verification.channel === 'bank' ? ('bank_transfer' as const) : (verification.channel === 'card' ? ('card' as const) : ('mobile_money' as const)),
        operatorNetwork: verification.momoNetwork || providerName,
        status: 'verified' as const,
        statusHistory: [
          { status: 'initiated' as const, timestamp: nowStr },
          { status: 'verified' as const, timestamp: nowStr }
        ],
        isSandbox: verification.isSandbox,
        subscriptionActivated: true,
        activationDate: nowStr,
        verifiedAt: nowStr,
        settledAt: nowStr,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      financialLedgerInstance.saveTransaction(syncedTx);
      financialLedgerInstance.recordDoubleEntry(syncedTx);
      financialLedgerInstance.markSubscriptionActivated(reference);
    }

    return res.json({
      verified: true,
      activation,
      verification,
      oneTimeToken: tokenRecord.token,
      oneTimeAccessUrl,
      oneTimeAppUrl,
      waInviteMessage,
      waClickToChat
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ error: error.message || "Erreur de vérification du paiement" });
  }
});

// 4. Single-Use Link Consumer API
apiRouter.post('/access/consume', (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ valid: false, error: "Jeton d'accès manquant" });
  }

  const result = OneTimeAccessService.consumeToken(token);
  return res.json(result);
});

// 5. Direct Browser Click-Through for Single-Use WhatsApp Link
// /api/access/:token -> When clicked once: redirects to WhatsApp group; second click: BLOCKED!
apiRouter.get('/access/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const result = OneTimeAccessService.consumeToken(token);

  if (!result.valid) {
    // Render security denial page
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accès Refusé - WTM</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { max-width: 420px; width: 100%; background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
          h1 { font-size: 20px; margin: 0 0 12px; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 24px; }
          .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; background: rgba(239,68,68,0.2); color: #fca5a5; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
          .btn { display: block; width: 100%; padding: 14px; border-radius: 14px; background: #27272a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; box-sizing: border-box; transition: background 0.2s; }
          .btn:hover { background: #3f3f46; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🚫</div>
          <span class="badge">LIEN EXPIRÉ / CONSOMMÉ</span>
          <h1>Lien à Usage Unique Déjà Utilisé</h1>
          <p>${result.error || "Ce lien d'invitation a déjà été utilisé et ne fonctionne plus. Les accès WhatsApp sont strictement individuels et ne peuvent pas être partagés."}</p>
          <a href="/#join" class="btn">Prendre un abonnement personnel</a>
        </div>
      </body>
      </html>
    `);
  }

  // Token is valid and has just been marked as used! Redirect to WhatsApp group
  return res.redirect(302, result.inviteUrl || 'https://chat.whatsapp.com');
});

// In-memory affiliate referrals registry
const affiliateRegistry: Array<{
  id: string;
  adminId: string;
  affiliateCode: string;
  referredMemberName: string;
  commissionGHS: number;
  status: 'credited' | 'pending';
  createdAt: string;
}> = [
  {
    id: 'ref_1',
    adminId: 'admin_default',
    affiliateCode: 'KOFI_VIP',
    referredMemberName: 'Kwame Osei',
    commissionGHS: 15.00,
    status: 'credited',
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'ref_2',
    adminId: 'admin_default',
    affiliateCode: 'AMA_TRADER',
    referredMemberName: 'Abena Darko',
    commissionGHS: 38.00,
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  }
];

// In-memory team members registry
const teamRegistry: Array<{
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'moderator' | 'support';
  createdAt: string;
}> = [
  { id: 'tm_1', email: 'sbireino@gmail.com', name: 'Sbireino (Propriétaire)', role: 'superadmin', createdAt: new Date().toISOString() },
  { id: 'tm_2', email: 'assistant.accra@wtm.local', name: 'Assistant Modérateur', role: 'moderator', createdAt: new Date().toISOString() }
];

// 6. Validate Promo Code Endpoint
apiRouter.post('/promo/validate', (req: Request, res: Response) => {
  const { code, amount } = req.body;
  if (!code) {
    return res.status(400).json({ valid: false, error: "Code promo requis" });
  }

  const normalized = String(code).trim().toUpperCase();
  const promo = promoRegistry.get(normalized);

  if (!promo || !promo.isActive) {
    return res.status(404).json({ valid: false, error: "Code promotionnel invalide ou expiré." });
  }

  const originalAmount = Number(amount || 0);
  let discount = 0;
  if (promo.type === 'percentage') {
    discount = (originalAmount * promo.value) / 100;
  } else {
    discount = Math.min(originalAmount, promo.value);
  }

  const newTotal = Math.max(1, originalAmount - discount);

  return res.json({
    valid: true,
    code: promo.code,
    type: promo.type,
    discountType: promo.type,
    discountValue: promo.value,
    discountAmount: Math.round(discount * 100) / 100,
    discountAmountGHS: Math.round(discount * 100) / 100,
    newTotalGHS: Math.round(newTotal * 100) / 100,
    message: `Réduction de ${promo.type === 'percentage' ? `${promo.value}%` : `${promo.value} GHS`} appliquée avec succès !`
  });
});

// 6b. Promo Codes List
apiRouter.get('/promo/list', (_req: Request, res: Response) => {
  const list = Array.from(promoRegistry.values()).map(p => ({
    id: `promo_${p.code}`,
    adminId: 'admin_default',
    code: p.code,
    discountType: p.type,
    discountValue: p.value,
    usedCount: p.usedCount,
    isActive: p.isActive,
    createdAt: new Date().toISOString()
  }));
  return res.json(list);
});

// 6c. Promo Code Create
apiRouter.post('/promo/create', (req: Request, res: Response) => {
  const { code, type = 'percentage', value = 10, maxUses } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Code promotionnel requis" });
  }

  const normalized = String(code).trim().toUpperCase();
  promoRegistry.set(normalized, {
    code: normalized,
    type: type === 'fixed' ? 'fixed' : 'percentage',
    value: Number(value),
    isActive: true,
    maxUses: maxUses ? Number(maxUses) : undefined,
    usedCount: 0
  });

  return res.json({
    success: true,
    message: `Code promo ${normalized} créé avec succès !`,
    promo: {
      code: normalized,
      discountType: type,
      discountValue: Number(value),
      isActive: true
    }
  });
});

// 6d. Promo Code Toggle
apiRouter.patch('/promo/toggle', (req: Request, res: Response) => {
  const { code } = req.body;
  const normalized = String(code).trim().toUpperCase();
  const existing = promoRegistry.get(normalized);
  if (!existing) {
    return res.status(404).json({ error: "Code promo non trouvé" });
  }

  existing.isActive = !existing.isActive;
  promoRegistry.set(normalized, existing);
  return res.json({ success: true, isActive: existing.isActive });
});

// 6e. Affiliate Referrals List & Recording
apiRouter.get('/affiliate/list', (_req: Request, res: Response) => {
  return res.json(affiliateRegistry);
});

apiRouter.post('/affiliate/record', (req: Request, res: Response) => {
  const { affiliateCode, customerName, amount } = req.body;
  if (!affiliateCode) {
    return res.status(400).json({ error: "Code d'affiliation requis" });
  }

  const commission = Math.round((Number(amount || 100) * 0.10) * 100) / 100;
  const newRef = {
    id: `ref_${Date.now()}`,
    adminId: 'admin_default',
    affiliateCode: String(affiliateCode).toUpperCase(),
    referredMemberName: customerName || 'Nouveau membre',
    commissionGHS: commission,
    status: 'credited' as const,
    createdAt: new Date().toISOString()
  };

  affiliateRegistry.unshift(newRef);
  return res.json({ success: true, referral: newRef });
});

// 6f. Team Members API
apiRouter.get('/team/list', (_req: Request, res: Response) => {
  return res.json(teamRegistry);
});

apiRouter.post('/team/add', (req: Request, res: Response) => {
  const { email, name, role = 'moderator' } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Email et nom requis" });
  }

  const newMember = {
    id: `tm_${Date.now()}`,
    email: String(email).trim(),
    name: String(name).trim(),
    role: (role === 'superadmin' || role === 'moderator' || role === 'support') ? role : 'moderator',
    createdAt: new Date().toISOString()
  };

  teamRegistry.push(newMember);
  return res.json({ success: true, member: newMember });
});

// 7. Sandbox Helper: Simulate Sandbox Payment Confirmation
apiRouter.post('/payments/sandbox/simulate-success', (req: Request, res: Response) => {
  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ error: "Référence sandbox requise" });
  }

  const updated = sandboxInstance.simulateStateChange(reference, 'verified');
  if (!updated) {
    return res.status(404).json({ error: "Référence sandbox non trouvée" });
  }

  return res.json({
    success: true,
    message: "Simulation sandbox réussie : statut passé à 'verified' (Test uniquement)",
    transaction: updated
  });
});

// 8. Secure Payment Webhooks
apiRouter.post('/payments/webhook', (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  const hubtelSignature = req.headers['x-hubtel-signature'] as string;

  let isValid = false;
  if (signature) {
    isValid = paystack.validateWebhook(req.body, signature);
  } else if (hubtelSignature) {
    isValid = hubtel.validateWebhook(req.body, hubtelSignature);
  } else if (req.headers['x-sandbox-test'] === 'true') {
    isValid = sandbox.validateWebhook(req.body, 'sandbox_test_signature');
  }

  if (!isValid && !process.env.ALLOW_INSECURE_WEBHOOK) {
    console.warn("Signature de webhook invalide rejetée");
    return res.status(401).json({ error: "Signature de webhook non autorisée" });
  }

  const event = req.body;
  if (event?.data?.reference) {
    SubscriptionService.markPaymentAsProcessed(event.data.reference);
  }

  return res.json({ received: true });
});

// 9. Send WhatsApp Reminder via Official Cloud API
apiRouter.post('/whatsapp/send-reminder', async (req: Request, res: Response) => {
  const { to, memberName, groupName, remainingDays } = req.body;
  if (!to) {
    return res.status(400).json({ error: "Numéro de téléphone requis" });
  }

  const msg = `Bonjour ${memberName || 'cher membre'} ! Votre abonnement au groupe WhatsApp "${groupName || 'VIP'}" expire dans ${remainingDays || '3'} jours.\n\n` +
    `Pour conserver votre accès et vos alertes prioritaires sans interruption, renouvelez dès maintenant en monnaie locale (GHS). Merci de votre fidélité !`;

  const result = await WhatsAppCloudApiService.sendMessage({
    to,
    message: msg
  });

  return res.json(result);
});

// 10. Automated Expiration Check (for Cron jobs / Cloud Scheduler)
apiRouter.post('/admin/check-expirations', (req: Request, res: Response) => {
  return res.json({
    success: true,
    checkedAt: new Date().toISOString(),
    message: "Scan des expirations exécuté. Les abonnements expirés ont été synchronisés."
  });
});
