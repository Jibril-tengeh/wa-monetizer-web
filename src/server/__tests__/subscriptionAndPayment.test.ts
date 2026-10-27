import assert from 'node:assert';
import crypto from 'node:crypto';
import { SubscriptionService } from '../subscriptionService.ts';
import { SandboxProvider } from '../paymentProviders/sandbox.ts';
import { PaystackProvider } from '../paymentProviders/paystack.ts';
import { OneTimeAccessService } from '../oneTimeAccessService.ts';
import { convertFromGHS, formatMoney, SUPPORTED_CURRENCIES } from '../../utils/currency.ts';

export function runTests() {
  console.log('--- EXÉCUTION DES TESTS UNITAIRES (WA MONETIZER) ---');
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // 1. Subscription Expiration Calculation Tests
  test('Calcule correctement une expiration à 7 jours (Formule Hebdo)', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    const expires = SubscriptionService.calculateExpirationDate(start, 7);
    const expected = new Date('2026-10-08T12:00:00Z');
    assert.strictEqual(expires.toISOString(), expected.toISOString());
  });

  test('Calcule correctement une expiration à 30 jours (Formule Mensuelle)', () => {
    const start = new Date('2026-10-01T12:00:00Z');
    const expires = SubscriptionService.calculateExpirationDate(start, 30);
    const expected = new Date('2026-10-31T12:00:00Z');
    assert.strictEqual(expires.toISOString(), expected.toISOString());
  });

  test('Calcule correctement une expiration à 90 jours (Formule Trimestrielle)', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const expires = SubscriptionService.calculateExpirationDate(start, 90);
    const diffDays = Math.round((expires.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    assert.strictEqual(diffDays, 90);
  });

  test('Rejette une durée invalide (<= 0)', () => {
    const start = new Date();
    assert.throws(() => {
      SubscriptionService.calculateExpirationDate(start, 0);
    }, /supérieure à 0 jour/);
  });

  // 2. Expiration State Checks
  test('Détecte correctement un abonnement expiré', () => {
    const pastDate = new Date(Date.now() - 10000).toISOString();
    assert.strictEqual(SubscriptionService.isExpired(pastDate), true);

    const futureDate = new Date(Date.now() + 1000000).toISOString();
    assert.strictEqual(SubscriptionService.isExpired(futureDate), false);
  });

  test('Détecte les abonnements expirant dans moins de 3 jours (Relance)', () => {
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(SubscriptionService.isExpiringSoon(inTwoDays, 3), true);

    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(SubscriptionService.isExpiringSoon(inTenDays, 3), false);
  });

  // 3. Payment Verification & Idempotency Tests
  test('Refuse d\'activer un abonnement si le paiement n\'est pas vérifié', () => {
    const unverifiedResult = {
      verified: false,
      reference: 'TEST_REF_UNVERIFIED_123',
      amount: 150,
      currency: 'GHS',
      status: 'pending' as const,
      channel: 'mobile_money' as const,
      isSandbox: true
    };

    const outcome = SubscriptionService.processSubscriptionActivation(
      unverifiedResult,
      30,
      'Test Group',
      'Instructions'
    );

    assert.strictEqual(outcome.success, false);
    assert.strictEqual(outcome.memberStatus, 'pending');
    assert.match(outcome.error || '', /Paiement non vérifié/);
  });

  test('Active un abonnement sur paiement vérifié et applique l\'idempotence', () => {
    const verifiedResult = {
      verified: true,
      reference: `IDEMPOTENT_TEST_${Date.now()}`,
      amount: 150,
      currency: 'GHS',
      status: 'verified' as const,
      channel: 'mobile_money' as const,
      isSandbox: true,
      customerName: 'Kofi Mensah'
    };

    // First activation
    const firstOutcome = SubscriptionService.processSubscriptionActivation(
      verifiedResult,
      30,
      'Club VIP WhatsApp',
      'Accédez avec le lien ci-dessous',
      'https://chat.whatsapp.com/inv123'
    );

    assert.strictEqual(firstOutcome.success, true);
    assert.strictEqual(firstOutcome.isIdempotentRepeat, false);
    assert.strictEqual(firstOutcome.memberStatus, 'active');

    // Second activation with same reference (e.g. repeated webhook or double click)
    const secondOutcome = SubscriptionService.processSubscriptionActivation(
      verifiedResult,
      30,
      'Club VIP WhatsApp',
      'Accédez avec le lien ci-dessous',
      'https://chat.whatsapp.com/inv123'
    );

    assert.strictEqual(secondOutcome.success, true);
    assert.strictEqual(secondOutcome.isIdempotentRepeat, true); // Enforced idempotency!
  });

  // 4. Sandbox Isolation Test
  test('Le mode Sandbox étiquette strictement les transactions comme test', async () => {
    const sandbox = new SandboxProvider();
    const req = {
      adminId: 'admin_123',
      groupId: 'grp_123',
      planId: 'plan_123',
      amount: 100,
      customerName: 'Akwesi Tester',
      customerPhone: '+233241234567',
      channel: 'mobile_money' as const
    };

    const init = await sandbox.initiatePayment(req);
    assert.strictEqual(init.isSandbox, true);
    assert.strictEqual(init.provider, 'sandbox');
    assert.match(init.reference, /^SANDBOX_MOCK_/);

    // Initial state is pending
    const initialVerify = await sandbox.verifyPayment(init.reference);
    assert.strictEqual(initialVerify.verified, false);
    assert.strictEqual(initialVerify.status, 'pending');

    // Simulate explicit test confirmation
    sandbox.simulateStateChange(init.reference, 'verified');
    const finalVerify = await sandbox.verifyPayment(init.reference);
    assert.strictEqual(finalVerify.verified, true);
    assert.strictEqual(finalVerify.isSandbox, true);
  });

  // 5. Paystack Webhook Signature Verification Test
  test('Valide l\'empreinte HMAC-SHA512 pour les webhooks Paystack', () => {
    process.env.PAYSTACK_SECRET_KEY = 'mock_test_secret_key_123456';
    const paystack = new PaystackProvider();
    
    const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'REF_999' } });
    const validSignature = crypto.createHmac('sha512', 'mock_test_secret_key_123456').update(payload).digest('hex');
    const invalidSignature = 'invalid_sha512_hash';

    assert.strictEqual(paystack.validateWebhook(payload, validSignature), true);
    assert.strictEqual(paystack.validateWebhook(payload, invalidSignature), false);
  });

  // 6. Single-Use OTP Token Destruction Test
  test('Lien à usage unique : s\'autodétruit après 1 seul clic et bloque toute réutilisation', () => {
    // Create token
    const tokenRecord = OneTimeAccessService.createToken(
      'admin_test',
      'group_vip',
      'https://chat.whatsapp.com/test-vip-group',
      'member_123',
      24
    );

    assert.ok(tokenRecord.token);
    assert.strictEqual(tokenRecord.isUsed, false);

    // 1st click / consumption -> MUST SUCCEED
    const firstConsume = OneTimeAccessService.consumeToken(tokenRecord.token);
    assert.strictEqual(firstConsume.valid, true);
    assert.strictEqual(firstConsume.inviteUrl, 'https://chat.whatsapp.com/test-vip-group');

    // 2nd click / consumption -> MUST BE STRICTLY REFUSED & BLOCKED
    const secondConsume = OneTimeAccessService.consumeToken(tokenRecord.token);
    assert.strictEqual(secondConsume.valid, false);
    assert.ok(secondConsume.error?.toLowerCase().includes('déjà été utilisé'));
  });

  // 6. Multi-Currency Conversion & Detection Tests
  test('Convertit fidèlement les devises depuis la base GHS', () => {
    // Check supported currencies exist
    assert.ok(SUPPORTED_CURRENCIES.GHS);
    assert.ok(SUPPORTED_CURRENCIES.XOF);
    assert.ok(SUPPORTED_CURRENCIES.XAF);
    assert.ok(SUPPORTED_CURRENCIES.NGN);
    assert.ok(SUPPORTED_CURRENCIES.EUR);
    assert.ok(SUPPORTED_CURRENCIES.USD);

    // 50 GHS to XOF (42 * 50 = 2100)
    const xof = convertFromGHS(50, 'XOF');
    assert.strictEqual(xof, 2100);

    // Format check
    const formattedXOF = formatMoney(2100, 'XOF');
    assert.ok(formattedXOF.includes('F.CFA'));

    const formattedGHS = formatMoney(50, 'GHS');
    assert.ok(formattedGHS.includes('GH₵'));
  });

  test('Le mode Sandbox gère et enregistre la devise dynamique sélectionnée (ex: XOF, NGN, USD)', async () => {
    const sandbox = new SandboxProvider();
    const req = {
      adminId: 'admin_test',
      groupId: 'group_test',
      planId: 'plan_test',
      amount: 2100,
      currency: 'XOF',
      customerName: 'Ablam Lawson',
      customerPhone: '+225 07 12 34 56',
      channel: 'mobile_money' as const,
      momoNetwork: 'wave'
    };

    const init = await sandbox.initiatePayment(req);
    assert.ok(init.success);
    assert.ok(init.reference);

    // Verify returns transaction currency
    sandbox.simulateStateChange(init.reference, 'verified');
    const verification = await sandbox.verifyPayment(init.reference);
    assert.strictEqual(verification.verified, true);
    assert.strictEqual(verification.currency, 'XOF');
    assert.strictEqual(verification.amount, 2100);
  });

  console.log(`\nRÉSULTATS DES TESTS: ${passed} réussis, ${failed} échoués.\n`);
  if (failed > 0) {
    throw new Error(`${failed} tests ont échoué`);
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('subscriptionAndPayment.test.ts')) {
  runTests();
}
