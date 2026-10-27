/**
 * WA Pay - FinTech Engine Types & Data Models
 * Proprietary African Payment Infrastructure for WA Monetizer
 */

export type WaPayCurrency = 'GHS' | 'XOF' | 'XAF' | 'NGN' | 'KES' | 'EUR' | 'USD' | 'ZAR';

export type WaPayChannel = 'mobile_money' | 'card' | 'bank_transfer' | 'ussd';

export type WaPayTransactionStatus = 
  | 'initiated'       // Transaction created with unique reference & idempotency key
  | 'pending'         // USSD prompt pushed or client redirected to provider
  | 'processing'      // Provider acknowledged receipt of transaction
  | 'verified'        // Authoritatively confirmed by server webhook or API verification
  | 'failed'          // Payment declined by customer or rejected by operator
  | 'cancelled'       // Transaction expired or cancelled by customer
  | 'refunded';       // Legitimate refund processed and recorded in ledger

export type WaPayProviderId = 
  | 'paystack'
  | 'hubtel'
  | 'wave'
  | 'orange_money'
  | 'mpesa_daraja'
  | 'sandbox';

export type ProviderIntegrationStatus = 
  | 'LIVE_OPERATIONAL'   // Real merchant credentials configured and authenticated
  | 'SANDBOX_ACTIVE'      // High-fidelity sandbox active with idempotent ledger
  | 'CONTRACT_REQUIRED';  // Direct aggregator contract needed (license/merchant account)

export interface WaPayPricingBreakdown {
  displayAmount: number;         // Amount shown in the WA Monetizer plan (base: GHS)
  displayCurrency: WaPayCurrency;// Typically 'GHS'
  chargedAmount: number;         // Amount requested from the customer in their local currency
  chargedCurrency: WaPayCurrency;// e.g. 'XOF', 'NGN', 'KES', 'GHS'
  exchangeRate: number;          // Official rate (chargedCurrency / displayCurrency)
  operatorFeeEstimated: number;  // Network operator fee (e.g. 1.5% for MoMo)
  platformFee: number;           // WA Pay platform commission
  netSettlementAmountGHS: number;// Final net settlement amount in GHS for the merchant
  settlementCurrency: WaPayCurrency; // Always GHS for the Ghana merchant
}

export interface WaPayTransaction {
  id: string;                     // Internal ID: tx_wapay_...
  reference: string;              // Unique external reference: WAPAY_<PROVIDER>_<TS>_<HEX>
  idempotencyKey: string;         // Unique key from client/server preventing double-charge
  adminId: string;                // Merchant / Admin UID
  groupId: string;                // WhatsApp Group ID
  planId: string;                 // Subscription Plan ID
  
  // Multi-Currency & Pricing Ledger
  pricing: WaPayPricingBreakdown;
  
  // Customer Data
  customer: {
    name: string;
    phone: string;
    email?: string;
    country: string;              // ISO-2 (GH, CI, SN, CM, NG, KE, etc.)
  };
  
  // Payment Routing
  providerId: WaPayProviderId;
  providerReference?: string;     // Gateway's own transaction ID
  channel: WaPayChannel;
  operatorNetwork?: string;       // e.g. MTN, Telecel, Wave, Orange, Safaricom, OPay
  
  // Lifecycle
  status: WaPayTransactionStatus;
  statusHistory: Array<{
    status: WaPayTransactionStatus;
    timestamp: string;
    reason?: string;
  }>;
  
  // Verification details
  isSandbox: boolean;
  gatewayResponse?: string;
  checkoutUrl?: string;
  promptInstructions?: string;
  
  // Recurring Billing (Mandates MoMo / Subscriptions API)
  isRecurring?: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'annual';
  recurringToken?: string;
  nextBillingDate?: string;

  // Split-Payment Direct to Subaccount
  splitPayment?: {
    enabled: boolean;
    subAccountCode?: string;
    merchantShareGHS: number;
    platformShareGHS: number;
  };
  
  // Subscription Activation Link
  subscriptionActivated: boolean;
  activationDate?: string;
  memberId?: string;
  oneTimeAccessToken?: string;
  
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  settledAt?: string;
}

export interface WaPayLedgerEntry {
  id: string;                     // ledg_...
  transactionReference: string;
  type: 'CREDIT_PAYMENT' | 'DEBIT_OPERATOR_FEE' | 'DEBIT_PLATFORM_FEE' | 'CREDIT_MERCHANT_SETTLEMENT' | 'DEBIT_REFUND' | 'DEBIT_MERCHANT_PAYOUT';
  amount: number;
  currency: WaPayCurrency;
  description: string;
  status: 'PENDING' | 'CLEARED' | 'RECONCILED';
  createdAt: string;
}

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PayoutChannel = 'mobile_money' | 'bank_transfer';

export interface PayoutDestination {
  channel: PayoutChannel;
  momoProvider?: string; // 'mtn', 'telecel', 'airteltigo', 'wave', 'orange'
  phoneNumber?: string;
  accountName: string;
  bankName?: string;
  accountNumber?: string;
  swiftOrBranchCode?: string;
  country: string; // 'GH', 'CI', 'SN', etc.
}

export interface WaPayPayout {
  id: string;
  reference: string;
  adminId: string;
  amount: number;
  currency: WaPayCurrency;
  fee: number;
  netAmount: number;
  destination: PayoutDestination;
  status: PayoutStatus;
  statusHistory: Array<{ status: PayoutStatus; timestamp: string; note?: string }>;
  providerTransferId?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  kycVerified?: boolean;
}

export interface WaPayBalanceSummary {
  adminId: string;
  currency: WaPayCurrency;
  totalEarnedGrossGHS: number;
  totalFeesDeductedGHS: number;
  totalNetRevenueGHS: number;
  totalWithdrawnGHS: number;
  availableBalanceGHS: number;
  pendingBalanceGHS: number;
  defaultPayoutDestination?: PayoutDestination;
  splitPaymentSubAccount?: string;
}

export interface WaPaySettlementSummary {
  totalGrossVolumeGHS: number;
  totalNetSettledGHS: number;
  totalPendingSettlementGHS: number;
  totalOperatorFeesGHS: number;
  totalPlatformFeesGHS: number;
  transactionsCount: {
    total: number;
    verified: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  currencyBreakdown: Record<string, { count: number; volume: number; volumeGHS: number }>;
  countryBreakdown: Record<string, { count: number; volumeGHS: number }>;
  operatorBreakdown: Record<string, { count: number; volumeGHS: number }>;
}

export interface WaPayInitiateRequest {
  adminId: string;
  groupId: string;
  planId: string;
  amount: number;                 // Base plan price (GHS)
  displayCurrency?: WaPayCurrency;// Default GHS
  targetCurrency?: WaPayCurrency; // Desired charging currency
  country: string;                // Customer country (GH, CI, SN, NG, KE, etc.)
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  channel: WaPayChannel;
  operatorNetwork?: string;       // e.g. 'mtn', 'wave', 'orange', 'telecel'
  idempotencyKey?: string;        // Prevent double submit
  callbackUrl?: string;
  isRecurring?: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'annual';
  splitSubAccountCode?: string;
  metadata?: Record<string, any>;
}

export interface WaPayInitiateResponse {
  success: boolean;
  reference: string;
  idempotencyKey: string;
  status: WaPayTransactionStatus;
  provider: WaPayProviderId;
  pricing: WaPayPricingBreakdown;
  checkoutUrl?: string;
  promptInstructions?: string;
  isSandbox: boolean;
  message?: string;
}

export interface WaPayVerifyResponse {
  verified: boolean;
  status: WaPayTransactionStatus;
  reference: string;
  transaction: WaPayTransaction;
  activation?: {
    subscriptionId?: string;
    startDate: string;
    expiresAt: string;
    oneTimeAccessUrl?: string;
    waInviteMessage?: string;
    alreadyActivated: boolean;
  };
  message: string;
}

export interface WaPayRefundRequest {
  reference: string;
  reason: string;
  amount?: number;
  adminId: string;
}

export interface WaPayPaymentMethod {
  id: string;
  name: string;
  channel: WaPayChannel;
  currencies: WaPayCurrency[];
  countries: string[];
  providerId: WaPayProviderId;
  integrationStatus: ProviderIntegrationStatus;
  contractRequirement?: string;
  operatorNetworks: Array<{
    id: string;
    name: string;
    logo?: string;
    country: string;
  }>;
}
