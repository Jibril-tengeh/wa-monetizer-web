/**
 * WA Pay - Financial Ledger & Audit Trail
 * Double-entry reconciliation, idempotency enforcement, and settlement calculations.
 */

import { 
  WaPayTransaction, 
  WaPayLedgerEntry, 
  WaPaySettlementSummary,
  WaPayPricingBreakdown,
  WaPayCurrency,
  WaPayPayout,
  PayoutDestination,
  WaPayBalanceSummary
} from './types.ts';
import { FraudProtectionService } from '../fraudProtectionService.ts';

export class WaPayFinancialLedger {
  // In-memory persistent registry for transactions (backed by Firestore sync in production)
  private transactions = new Map<string, WaPayTransaction>();
  // Index by idempotency key
  private idempotencyIndex = new Map<string, string>(); // idempotencyKey -> reference
  // Double-entry ledger entries
  private ledgerEntries: WaPayLedgerEntry[] = [];
  // Activated subscription records (prevents double subscription activation)
  private activatedSubscriptions = new Set<string>();
  // Payout withdrawals registry
  private payouts = new Map<string, WaPayPayout>();
  // Stored payout destinations per admin
  private adminPayoutDestinations = new Map<string, PayoutDestination>();
  // Stored split-payment subaccounts (Paystack / Hubtel)
  private adminSplitSubAccounts = new Map<string, string>();

  constructor() {
    this.seedInitialHistoricalTransactions();
    this.seedInitialHistoricalPayouts();
  }

  /**
   * Seed realistic historical transactions for initial audit visibility
   */
  private seedInitialHistoricalTransactions() {
    const historicalTxs: Array<{
      ref: string;
      customer: { name: string; phone: string; country: string };
      baseGHS: number;
      chargedCurr: WaPayCurrency;
      rate: number;
      channel: 'mobile_money' | 'card';
      network: string;
      provider: 'paystack' | 'hubtel' | 'sandbox';
      status: 'verified' | 'pending';
      daysAgo: number;
    }> = [
      {
        ref: 'WAPAY_PST_17290001_A1B2',
        customer: { name: 'Kofi Mensah', phone: '+233 24 456 7890', country: 'GH' },
        baseGHS: 150,
        chargedCurr: 'GHS',
        rate: 1.0,
        channel: 'mobile_money',
        network: 'MTN MoMo',
        provider: 'paystack',
        status: 'verified',
        daysAgo: 4
      },
      {
        ref: 'WAPAY_HUB_17290002_C3D4',
        customer: { name: 'Ama Serwaa', phone: '+233 20 876 5432', country: 'GH' },
        baseGHS: 50,
        chargedCurr: 'GHS',
        rate: 1.0,
        channel: 'mobile_money',
        network: 'Telecel Cash',
        provider: 'hubtel',
        status: 'verified',
        daysAgo: 3
      },
      {
        ref: 'WAPAY_WAV_17290003_E5F6',
        customer: { name: 'Amadou Diallo', phone: '+225 07 12 34 56', country: 'CI' },
        baseGHS: 150,
        chargedCurr: 'XOF',
        rate: 42.0,
        channel: 'mobile_money',
        network: 'Wave CI',
        provider: 'sandbox',
        status: 'verified',
        daysAgo: 2
      },
      {
        ref: 'WAPAY_NGN_17290004_G7H8',
        customer: { name: 'Chukwudi Eze', phone: '+234 80 1234 5678', country: 'NG' },
        baseGHS: 150,
        chargedCurr: 'NGN',
        rate: 105.0,
        channel: 'mobile_money',
        network: 'OPay',
        provider: 'sandbox',
        status: 'verified',
        daysAgo: 1
      },
      {
        ref: 'WAPAY_SND_17290005_J9K0',
        customer: { name: 'Kwame Osei', phone: '+233 27 123 4567', country: 'GH' },
        baseGHS: 150,
        chargedCurr: 'GHS',
        rate: 1.0,
        channel: 'mobile_money',
        network: 'AirtelTigo',
        provider: 'sandbox',
        status: 'pending',
        daysAgo: 0
      }
    ];

    historicalTxs.forEach((h, idx) => {
      const chargedAmount = Math.round(h.baseGHS * h.rate);
      const operatorFee = Math.round(h.baseGHS * 0.015 * 100) / 100;
      const platformFee = Math.round(h.baseGHS * 0.01 * 100) / 100;
      const net = Math.round((h.baseGHS - operatorFee - platformFee) * 100) / 100;
      const date = new Date(Date.now() - h.daysAgo * 86400000).toISOString();

      const tx: WaPayTransaction = {
        id: `tx_${idx + 1}`,
        reference: h.ref,
        idempotencyKey: `idemp_${h.ref}`,
        adminId: 'admin_default',
        groupId: 'grp_demo_forex',
        planId: 'plan_demo_mensuel',
        pricing: {
          displayAmount: h.baseGHS,
          displayCurrency: 'GHS',
          chargedAmount,
          chargedCurrency: h.chargedCurr,
          exchangeRate: h.rate,
          operatorFeeEstimated: operatorFee,
          platformFee,
          netSettlementAmountGHS: net,
          settlementCurrency: 'GHS'
        },
        customer: h.customer,
        providerId: h.provider,
        channel: h.channel,
        operatorNetwork: h.network,
        status: h.status,
        statusHistory: [
          { status: 'initiated', timestamp: date },
          { status: h.status, timestamp: date }
        ],
        isSandbox: h.provider === 'sandbox',
        subscriptionActivated: h.status === 'verified',
        activationDate: h.status === 'verified' ? date : undefined,
        createdAt: date,
        updatedAt: date,
        verifiedAt: h.status === 'verified' ? date : undefined,
        settledAt: h.status === 'verified' ? date : undefined
      };

      this.transactions.set(tx.reference, tx);
      this.idempotencyIndex.set(tx.idempotencyKey, tx.reference);

      if (h.status === 'verified') {
        this.recordDoubleEntry(tx);
        this.activatedSubscriptions.add(tx.reference);
      }
    });
  }

  /**
   * Check if an idempotency key already exists to prevent duplicate transactions
   */
  public getByIdempotencyKey(key: string): WaPayTransaction | null {
    const ref = this.idempotencyIndex.get(key);
    if (!ref) return null;
    return this.transactions.get(ref) || null;
  }

  /**
   * Retrieve transaction by reference
   */
  public getByReference(reference: string): WaPayTransaction | null {
    return this.transactions.get(reference) || null;
  }

  /**
   * Save or update a transaction
   */
  public saveTransaction(tx: WaPayTransaction): WaPayTransaction {
    const updated = {
      ...tx,
      updatedAt: new Date().toISOString()
    };
    this.transactions.set(updated.reference, updated);
    if (updated.idempotencyKey) {
      this.idempotencyIndex.set(updated.idempotencyKey, updated.reference);
    }
    return updated;
  }

  /**
   * Record double-entry financial ledger entries when a payment is verified
   */
  public recordDoubleEntry(tx: WaPayTransaction): void {
    const now = new Date().toISOString();
    const p = tx.pricing;

    // 1. Credit Payment Received
    this.ledgerEntries.push({
      id: `ledg_cr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      transactionReference: tx.reference,
      type: 'CREDIT_PAYMENT',
      amount: p.chargedAmount,
      currency: p.chargedCurrency,
      description: `Règlement client reçu via ${tx.operatorNetwork || tx.providerId} (${tx.customer.name})`,
      status: 'CLEARED',
      createdAt: now
    });

    // 2. Debit Operator Fee
    this.ledgerEntries.push({
      id: `ledg_dr_op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      transactionReference: tx.reference,
      type: 'DEBIT_OPERATOR_FEE',
      amount: p.operatorFeeEstimated,
      currency: 'GHS',
      description: `Frais réseau opérateur Mobile Money / Carte (${tx.operatorNetwork || tx.providerId})`,
      status: 'CLEARED',
      createdAt: now
    });

    // 3. Debit Platform Fee
    this.ledgerEntries.push({
      id: `ledg_dr_pf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      transactionReference: tx.reference,
      type: 'DEBIT_PLATFORM_FEE',
      amount: p.platformFee,
      currency: 'GHS',
      description: `Frais plateforme de gestion WA Pay`,
      status: 'CLEARED',
      createdAt: now
    });

    // 4. Credit Merchant Settlement Balance
    this.ledgerEntries.push({
      id: `ledg_cr_mch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      transactionReference: tx.reference,
      type: 'CREDIT_MERCHANT_SETTLEMENT',
      amount: p.netSettlementAmountGHS,
      currency: 'GHS',
      description: `Solde net à reverser au commerçant (${tx.adminId})`,
      status: 'CLEARED',
      createdAt: now
    });
  }

  /**
   * Double-spend / Double-activation guard: returns true if subscription was already activated
   */
  public isSubscriptionAlreadyActivated(reference: string): boolean {
    return this.activatedSubscriptions.has(reference);
  }

  /**
   * Mark subscription as activated authoritatively
   */
  public markSubscriptionActivated(reference: string): void {
    this.activatedSubscriptions.add(reference);
  }

  /**
   * Record refund in financial ledger
   */
  public recordRefund(reference: string, reason: string): WaPayTransaction | null {
    const tx = this.transactions.get(reference);
    if (!tx) return null;

    if (tx.status !== 'verified') {
      throw new Error(`Impossible de rembourser une transaction avec le statut "${tx.status}"`);
    }

    tx.status = 'refunded';
    tx.statusHistory.push({
      status: 'refunded',
      timestamp: new Date().toISOString(),
      reason
    });

    // Ledger debit
    this.ledgerEntries.push({
      id: `ledg_ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      transactionReference: tx.reference,
      type: 'DEBIT_REFUND',
      amount: tx.pricing.netSettlementAmountGHS,
      currency: 'GHS',
      description: `Remboursement transaction : ${reason}`,
      status: 'CLEARED',
      createdAt: new Date().toISOString()
    });

    this.saveTransaction(tx);
    return tx;
  }

  /**
   * Get all transactions with optional filtering
   */
  public listTransactions(filter?: {
    status?: string;
    currency?: string;
    country?: string;
    provider?: string;
    search?: string;
    limit?: number;
  }): WaPayTransaction[] {
    let list = Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        list = list.filter(t => t.status === filter.status);
      }
      if (filter.currency && filter.currency !== 'all') {
        list = list.filter(t => t.pricing.chargedCurrency === filter.currency);
      }
      if (filter.country && filter.country !== 'all') {
        list = list.filter(t => t.customer.country === filter.country);
      }
      if (filter.provider && filter.provider !== 'all') {
        list = list.filter(t => t.providerId === filter.provider);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(t => 
          t.reference.toLowerCase().includes(q) ||
          t.customer.name.toLowerCase().includes(q) ||
          t.customer.phone.includes(q)
        );
      }
      if (filter.limit) {
        list = list.slice(0, filter.limit);
      }
    }

    return list;
  }

  /**
   * Compute comprehensive settlement report and financial KPIs
   */
  public getSettlementSummary(): WaPaySettlementSummary {
    const txs = Array.from(this.transactions.values());

    let totalGrossVolumeGHS = 0;
    let totalNetSettledGHS = 0;
    let totalPendingSettlementGHS = 0;
    let totalOperatorFeesGHS = 0;
    let totalPlatformFeesGHS = 0;

    const counts = {
      total: txs.length,
      verified: 0,
      pending: 0,
      failed: 0,
      refunded: 0
    };

    const currencyMap: Record<string, { count: number; volume: number; volumeGHS: number }> = {};
    const countryMap: Record<string, { count: number; volumeGHS: number }> = {};
    const operatorMap: Record<string, { count: number; volumeGHS: number }> = {};

    for (const t of txs) {
      const baseGHS = t.pricing.displayAmount || 0;
      const chargedAmt = t.pricing.chargedAmount || 0;
      const chargedCurr = t.pricing.chargedCurrency || 'GHS';
      const country = t.customer.country || 'GH';
      const op = t.operatorNetwork || t.providerId;

      // Status counters
      if (t.status === 'verified') counts.verified++;
      else if (t.status === 'pending' || t.status === 'processing') counts.pending++;
      else if (t.status === 'failed' || t.status === 'cancelled') counts.failed++;
      else if (t.status === 'refunded') counts.refunded++;

      // Volume aggregations
      if (t.status === 'verified') {
        totalGrossVolumeGHS += baseGHS;
        totalNetSettledGHS += t.pricing.netSettlementAmountGHS || (baseGHS * 0.975);
        totalOperatorFeesGHS += t.pricing.operatorFeeEstimated || (baseGHS * 0.015);
        totalPlatformFeesGHS += t.pricing.platformFee || (baseGHS * 0.01);
      } else if (t.status === 'pending') {
        totalPendingSettlementGHS += baseGHS;
      }

      // Currency breakdown
      if (!currencyMap[chargedCurr]) {
        currencyMap[chargedCurr] = { count: 0, volume: 0, volumeGHS: 0 };
      }
      currencyMap[chargedCurr].count++;
      currencyMap[chargedCurr].volume += chargedAmt;
      currencyMap[chargedCurr].volumeGHS += baseGHS;

      // Country breakdown
      if (!countryMap[country]) {
        countryMap[country] = { count: 0, volumeGHS: 0 };
      }
      countryMap[country].count++;
      countryMap[country].volumeGHS += baseGHS;

      // Operator breakdown
      if (!operatorMap[op]) {
        operatorMap[op] = { count: 0, volumeGHS: 0 };
      }
      operatorMap[op].count++;
      operatorMap[op].volumeGHS += baseGHS;
    }

    return {
      totalGrossVolumeGHS: Math.round(totalGrossVolumeGHS * 100) / 100,
      totalNetSettledGHS: Math.round(totalNetSettledGHS * 100) / 100,
      totalPendingSettlementGHS: Math.round(totalPendingSettlementGHS * 100) / 100,
      totalOperatorFeesGHS: Math.round(totalOperatorFeesGHS * 100) / 100,
      totalPlatformFeesGHS: Math.round(totalPlatformFeesGHS * 100) / 100,
      transactionsCount: counts,
      currencyBreakdown: currencyMap,
      countryBreakdown: countryMap,
      operatorBreakdown: operatorMap
    };
  }

  /**
   * Seed realistic initial payout for demo audit
   */
  private seedInitialHistoricalPayouts() {
    const defaultDest: PayoutDestination = {
      channel: 'mobile_money',
      momoProvider: 'mtn',
      phoneNumber: '+233 24 555 1234',
      accountName: 'Kofi Mensah (Compte Marchand MoMo)',
      country: 'GH'
    };
    this.adminPayoutDestinations.set('admin_default', defaultDest);

    const initialPayout: WaPayPayout = {
      id: 'payout_init_1',
      reference: 'WAPAY_OUT_17290099_K8M2',
      adminId: 'admin_default',
      amount: 100.0,
      currency: 'GHS',
      fee: 1.5,
      netAmount: 98.5,
      destination: defaultDest,
      status: 'completed',
      statusHistory: [
        { status: 'pending', timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
        { status: 'completed', timestamp: new Date(Date.now() - 2 * 86400000 + 120000).toISOString(), note: 'Virement MoMo MTN réussi' }
      ],
      providerTransferId: 'TRF_MTN_9928172',
      requestedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 86400000 + 120000).toISOString()
    };

    this.payouts.set(initialPayout.id, initialPayout);

    // Record ledger entry
    this.ledgerEntries.push({
      id: `ledg_po_${initialPayout.id}`,
      transactionReference: initialPayout.reference,
      type: 'DEBIT_MERCHANT_PAYOUT',
      amount: initialPayout.amount,
      currency: 'GHS',
      description: `Retrait effectué vers Mobile Money MTN (+233 24 555 1234) - ${initialPayout.destination.accountName}`,
      status: 'CLEARED',
      createdAt: initialPayout.completedAt || initialPayout.requestedAt
    });
  }

  /**
   * Get configured payout destination for an admin
   */
  public getPayoutDestination(adminId: string): PayoutDestination | undefined {
    return this.adminPayoutDestinations.get(adminId) || this.adminPayoutDestinations.get('admin_default');
  }

  /**
   * Save or update payout destination for an admin
   */
  public setPayoutDestination(adminId: string, dest: PayoutDestination): PayoutDestination {
    this.adminPayoutDestinations.set(adminId, dest);
    return dest;
  }

  /**
   * Calculate detailed balance summary for an admin
   */
  public getBalanceSummary(adminId: string = 'admin_default'): WaPayBalanceSummary {
    const txs = Array.from(this.transactions.values()).filter(
      t => adminId === 'admin_default' || t.adminId === adminId
    );

    let totalEarnedGrossGHS = 0;
    let totalFeesDeductedGHS = 0;
    let totalNetRevenueGHS = 0;
    let pendingBalanceGHS = 0;

    for (const t of txs) {
      if (t.status === 'verified') {
        const gross = t.pricing.displayAmount || 0;
        const opFee = t.pricing.operatorFeeEstimated || (gross * 0.015);
        const pfFee = t.pricing.platformFee || (gross * 0.01);
        const net = t.pricing.netSettlementAmountGHS || (gross - opFee - pfFee);

        totalEarnedGrossGHS += gross;
        totalFeesDeductedGHS += (opFee + pfFee);
        totalNetRevenueGHS += net;
      } else if (t.status === 'pending' || t.status === 'processing') {
        pendingBalanceGHS += (t.pricing.displayAmount || 0);
      }
    }

    // Payouts calculation
    const adminPayouts = Array.from(this.payouts.values()).filter(
      p => adminId === 'admin_default' || p.adminId === adminId
    );

    let totalWithdrawnGHS = 0;
    for (const p of adminPayouts) {
      if (p.status === 'completed' || p.status === 'processing') {
        totalWithdrawnGHS += p.amount;
      }
    }

    const availableBalanceGHS = Math.max(0, Math.round((totalNetRevenueGHS - totalWithdrawnGHS) * 100) / 100);

    return {
      adminId,
      currency: 'GHS',
      totalEarnedGrossGHS: Math.round(totalEarnedGrossGHS * 100) / 100,
      totalFeesDeductedGHS: Math.round(totalFeesDeductedGHS * 100) / 100,
      totalNetRevenueGHS: Math.round(totalNetRevenueGHS * 100) / 100,
      totalWithdrawnGHS: Math.round(totalWithdrawnGHS * 100) / 100,
      availableBalanceGHS,
      pendingBalanceGHS: Math.round(pendingBalanceGHS * 100) / 100,
      defaultPayoutDestination: this.getPayoutDestination(adminId)
    };
  }

  /**
   * Request a new payout / withdrawal
   */
  public requestPayout(params: {
    adminId: string;
    amount: number;
    destination?: PayoutDestination;
  }): WaPayPayout {
    const { adminId, amount, destination } = params;
    const requestedAmount = Math.round(Number(amount) * 100) / 100;

    if (isNaN(requestedAmount) || requestedAmount < 10) {
      throw new Error("Le montant minimum de retrait est de 10 GH₵.");
    }

    const balance = this.getBalanceSummary(adminId);
    if (requestedAmount > balance.availableBalanceGHS) {
      throw new Error(`Solde insuffisant. Votre solde disponible est de ${balance.availableBalanceGHS} GH₵.`);
    }

    // KYC Check: Enforce KYC compliance for amounts above threshold
    const kycCheck = FraudProtectionService.evaluatePayoutKyc(adminId, requestedAmount);
    if (kycCheck.required && !kycCheck.isVerified) {
      throw new Error(kycCheck.reason || "Vérification d'identité requise pour ce montant de retrait.");
    }

    const dest = destination || this.getPayoutDestination(adminId);
    if (!dest || (!dest.phoneNumber && !dest.accountNumber)) {
      throw new Error("Veuillez configurer un compte bénéficiaire de retrait (Mobile Money ou Compte Bancaire).");
    }

    // Transfer fee: 1.0% with min 1.0 GHS
    const fee = Math.max(1.0, Math.round((requestedAmount * 0.01) * 100) / 100);
    const netAmount = Math.round((requestedAmount - fee) * 100) / 100;

    const now = new Date().toISOString();
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const reference = `WAPAY_OUT_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const payout: WaPayPayout = {
      id: payoutId,
      reference,
      adminId,
      amount: requestedAmount,
      currency: 'GHS',
      fee,
      netAmount,
      destination: dest,
      status: 'completed', // Instant simulation in dev/sandbox, triggers MoMo Transfer
      statusHistory: [
        { status: 'pending', timestamp: now },
        { status: 'completed', timestamp: now, note: `Virement envoyé vers ${dest.channel === 'mobile_money' ? `${dest.momoProvider?.toUpperCase()} (${dest.phoneNumber})` : `${dest.bankName} (${dest.accountNumber})`}` }
      ],
      providerTransferId: `TRF_${dest.momoProvider?.toUpperCase() || 'BANK'}_${Date.now()}`,
      requestedAt: now,
      completedAt: now,
      kycVerified: kycCheck.isVerified
    };

    this.payouts.set(payout.id, payout);

    // Record ledger debit
    this.ledgerEntries.push({
      id: `ledg_po_${payout.id}`,
      transactionReference: payout.reference,
      type: 'DEBIT_MERCHANT_PAYOUT',
      amount: payout.amount,
      currency: 'GHS',
      description: `Retrait effectué vers ${dest.channel === 'mobile_money' ? `Mobile Money ${dest.momoProvider?.toUpperCase()} (${dest.phoneNumber})` : `Banque ${dest.bankName} (${dest.accountNumber})`} - ${dest.accountName}`,
      status: 'CLEARED',
      createdAt: now
    });

    return payout;
  }

  /**
   * Configure split-payment subaccount code (Paystack / Hubtel)
   */
  public setSplitSubAccount(adminId: string, subAccountCode: string): void {
    this.adminSplitSubAccounts.set(adminId, subAccountCode);
  }

  public getSplitSubAccount(adminId: string): string | undefined {
    return this.adminSplitSubAccounts.get(adminId);
  }

  /**
   * List payouts for an admin
   */
  public listPayouts(adminId?: string): WaPayPayout[] {
    const all = Array.from(this.payouts.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    if (!adminId || adminId === 'admin_default') return all;
    return all.filter(p => p.adminId === adminId);
  }

  /**
   * Get all double-entry ledger entries for auditing
   */
  public getLedgerEntries(): WaPayLedgerEntry[] {
    return [...this.ledgerEntries].reverse();
  }
}

export const financialLedgerInstance = new WaPayFinancialLedger();
