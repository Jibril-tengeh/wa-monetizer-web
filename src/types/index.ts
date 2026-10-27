export type GroupStatus = 'active' | 'archived';
export type PlanDuration = 7 | 30 | 90 | number;
export type MemberStatus = 'pending' | 'active' | 'expired' | 'suspended' | 'refunded';
export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';
export type PaymentProvider = 'paystack' | 'hubtel' | 'sandbox';
export type PaymentChannel = 'mobile_money' | 'card' | 'bank';
export type MomoNetwork = 'mtn' | 'vodafone' | 'airteltigo';

export interface Group {
  id: string;
  adminId: string;
  name: string;
  description: string;
  category: string;
  inviteLink?: string;
  accessInstructions: string;
  rules?: string;
  currency: string;
  status: GroupStatus;
  lastLinkRotatedAt?: string;
  memberCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Plan {
  id: string;
  adminId: string;
  groupId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  features: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Member {
  id: string;
  adminId: string;
  groupId: string;
  displayName: string;
  phone?: string;
  email?: string;
  status: MemberStatus;
  currentPlanId?: string;
  currentSubscriptionId?: string;
  affiliateCode?: string;
  referredBy?: string;
  startDate?: string;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  adminId: string;
  memberId: string;
  groupId: string;
  planId: string;
  status: MemberStatus;
  startDate: string;
  expiresAt: string;
  pricePaid: number;
  currency: string;
  paymentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  adminId: string;
  memberId?: string;
  groupId?: string;
  planId?: string;
  amount: number;
  originalAmountGHS?: number;
  discountApplied?: number;
  promoCode?: string;
  currency: string;
  country?: string;
  provider: PaymentProvider;
  providerReference: string;
  idempotencyKey?: string;
  channel: PaymentChannel;
  momoProvider?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  status: PaymentStatus;
  isSandbox: boolean;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccessToken {
  id: string;
  token: string;
  adminId: string;
  groupId: string;
  memberId?: string;
  inviteUrl: string;
  isUsed: boolean;
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  adminId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  groupId?: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  adminId: string;
  affiliateCode: string;
  referrerMemberId?: string;
  referredMemberName: string;
  groupId?: string;
  commissionGHS: number;
  status: 'pending' | 'credited' | 'paid';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalMembers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  pendingPayments: number;
  confirmedRevenueGHS: number;
  expiringSoonMembers: number;
}

export interface WaPayFrontendTransaction {
  id: string;
  reference: string;
  idempotencyKey?: string;
  adminId: string;
  groupId: string;
  planId: string;
  pricing: {
    displayAmount: number;
    displayCurrency: string;
    chargedAmount: number;
    chargedCurrency: string;
    exchangeRate: number;
    operatorFeeEstimated: number;
    platformFee: number;
    netSettlementAmountGHS: number;
    settlementCurrency: string;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
    country: string;
  };
  providerId: string;
  providerReference?: string;
  channel: string;
  operatorNetwork?: string;
  status: 'initiated' | 'pending' | 'processing' | 'verified' | 'failed' | 'cancelled' | 'refunded';
  isSandbox: boolean;
  subscriptionActivated: boolean;
  createdAt: string;
  verifiedAt?: string;
}

export interface WaPaySettlementData {
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

export interface WaPayPayoutItem {
  id: string;
  reference: string;
  adminId: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  destination: {
    channel: 'mobile_money' | 'bank_transfer';
    momoProvider?: string;
    phoneNumber?: string;
    accountName: string;
    bankName?: string;
    accountNumber?: string;
    country: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestedAt: string;
  completedAt?: string;
}

export interface WaPayBalanceData {
  adminId: string;
  currency: string;
  totalEarnedGrossGHS: number;
  totalFeesDeductedGHS: number;
  totalNetRevenueGHS: number;
  totalWithdrawnGHS: number;
  availableBalanceGHS: number;
  pendingBalanceGHS: number;
  defaultPayoutDestination?: {
    channel: 'mobile_money' | 'bank_transfer';
    momoProvider?: string;
    phoneNumber?: string;
    accountName: string;
    bankName?: string;
    accountNumber?: string;
    country: string;
  };
}


