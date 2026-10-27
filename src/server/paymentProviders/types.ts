export type SupportedProvider = 'paystack' | 'hubtel' | 'sandbox';

export interface PaymentInitiationRequest {
  adminId: string;
  groupId: string;
  planId: string;
  amount: number;
  currency?: string;
  originalAmountGHS?: number;
  country?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  channel: 'mobile_money' | 'card' | 'bank';
  momoNetwork?: string;
  callbackUrl?: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  reference: string;
  checkoutUrl?: string;
  provider: SupportedProvider;
  isSandbox: boolean;
  message?: string;
  promptInstructions?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: 'verified' | 'failed' | 'pending';
  channel: 'mobile_money' | 'card' | 'bank';
  momoNetwork?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  isSandbox: boolean;
  gatewayResponse?: string;
  metadata?: Record<string, any>;
}

export interface PaymentProvider {
  id: SupportedProvider;
  name: string;
  isConfigured(): boolean;
  initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;
  validateWebhook(payload: any, signatureHeader?: string): boolean;
}
