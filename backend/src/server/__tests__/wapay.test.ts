import { waPayEngineInstance } from '../wapay/engine.ts';
import { financialLedgerInstance } from '../wapay/ledger.ts';
import { connectorRegistryInstance } from '../wapay/connectors/registry.ts';

async function runWaPayTests() {
  console.log("=== Lancement des tests automatisés WA Pay ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    // Test 1: Pricing Computation & Multi-Currency Separation
    console.log("\n1. Test du moteur de calcul multi-devises et frais...");
    const pricingXOF = waPayEngineInstance.computePricing(100, 'XOF');
    assert(pricingXOF.displayAmount === 100, "Montant affiché de base = 100 GHS");
    assert(pricingXOF.chargedCurrency === 'XOF', "Devise débitée = XOF");
    assert(pricingXOF.chargedAmount === 4200, "Montant débité calculé = 4,200 XOF (100 * 42)");
    assert(pricingXOF.operatorFeeEstimated === 1.5, "Frais réseau opérateur = 1.5 GHS (1.5%)");
    assert(pricingXOF.platformFee === 1.0, "Commission plateforme = 1.0 GHS (1.0%)");
    assert(pricingXOF.netSettlementAmountGHS === 97.5, "Règlement net commerçant = 97.5 GHS");

    // Test 2: Connectors & Regulatory Matrix
    console.log("\n2. Test de la matrice des connecteurs et conformité...");
    const methods = waPayEngineInstance.getPaymentMethods();
    assert(methods.length >= 6, "Au moins 6 méthodes panafricaines configurées");
    const waveMethod = methods.find(m => m.id === 'wave_xof');
    assert(Boolean(waveMethod?.contractRequirement), "Exigence contractuelle Wave documentée");
    const hubtelMethod = methods.find(m => m.id === 'momo_gh');
    assert(Boolean(hubtelMethod?.contractRequirement), "Exigence contractuelle Hubtel documentée");

    // Test 3: Transaction Creation & Idempotency
    console.log("\n3. Test d'initiation et clé d'idempotence...");
    const testIdempotencyKey = `test_idemp_${Date.now()}`;
    const init1 = await waPayEngineInstance.initiatePayment({
      adminId: 'admin_test_1',
      groupId: 'grp_test_forex',
      planId: 'plan_mensuel',
      amount: 150,
      targetCurrency: 'XOF',
      country: 'CI',
      customerName: 'Kouassi Yao',
      customerPhone: '+225 07 00 11 22',
      channel: 'mobile_money',
      operatorNetwork: 'Wave CI',
      idempotencyKey: testIdempotencyKey
    });

    assert(init1.success === true, "Initiation transaction réussie");
    assert(init1.reference.startsWith('WAPAY_'), "Référence générée au format WAPAY_*");
    assert(init1.pricing.chargedAmount === 6300, "Montant débité = 6,300 XOF (150 * 42)");

    // Test 4: Idempotent repeat must return identical transaction reference
    const init2 = await waPayEngineInstance.initiatePayment({
      adminId: 'admin_test_1',
      groupId: 'grp_test_forex',
      planId: 'plan_mensuel',
      amount: 150,
      targetCurrency: 'XOF',
      country: 'CI',
      customerName: 'Kouassi Yao',
      customerPhone: '+225 07 00 11 22',
      channel: 'mobile_money',
      operatorNetwork: 'Wave CI',
      idempotencyKey: testIdempotencyKey
    });

    assert(init2.reference === init1.reference, "Idempotence respectée : même référence retournée");
    assert(Boolean(init2.message?.includes('idempotence')), "Message de reprise idempotente confirmé");

    // Test 5: Authoritative Verification & Double-Spend Protection
    console.log("\n4. Test de vérification officielle et anti-double activation...");
    const { sandboxConnectorInstance } = await import('../wapay/connectors/sandboxConnector.ts');
    sandboxConnectorInstance.simulateStateChange(init1.reference, 'verified');

    const verify1 = await waPayEngineInstance.verifyPayment(init1.reference, {
      planDurationDays: 30,
      groupName: 'Groupe Forex VIP'
    });

    assert(verify1.verified === true, "Vérification serveur confirmée");
    assert(verify1.activation?.alreadyActivated === false, "Première activation validée");
    assert(Boolean(verify1.activation?.oneTimeAccessUrl), "Lien d'accès unique généré");

    // Repeat verify: must NOT activate twice
    const verify2 = await waPayEngineInstance.verifyPayment(init1.reference);
    assert(verify2.verified === true, "Deuxième appel verify réussi");
    assert(verify2.activation?.alreadyActivated === true, "Anti-double activation activé : déjà activé");

    // Test 6: Financial Ledger & Settlement Reconciliation
    console.log("\n5. Test du registre financier et règlements...");
    const settlement = waPayEngineInstance.getSettlementSummary();
    assert(settlement.totalGrossVolumeGHS > 0, "Volume brut > 0 GHS");
    assert(settlement.totalNetSettledGHS > 0, "Règlement net commerçant > 0 GHS");
    assert(settlement.totalOperatorFeesGHS > 0, "Frais opérateurs comptabilisés");
    assert(settlement.totalPlatformFeesGHS > 0, "Commissions plateforme comptabilisées");
    assert(settlement.transactionsCount.verified > 0, "Transactions vérifiées présentes");

    // Test 7: Refund with Audit Trail
    console.log("\n6. Test de remboursement audité...");
    const refund = waPayEngineInstance.processRefund({
      reference: init1.reference,
      reason: "Demande client justifiée sous 24h",
      adminId: 'admin_test_1'
    });
    assert(refund.status === 'refunded', "Statut de la transaction passé à 'refunded'");
    const updatedSettlement = waPayEngineInstance.getSettlementSummary();
    assert(updatedSettlement.transactionsCount.refunded >= 1, "Compteur de remboursements incrémenté");

  } catch (e: any) {
    console.error("Erreur critique durant les tests :", e);
    failed++;
  }

  console.log(`\n=== Résultat des tests WA Pay : ${passed} réussis, ${failed} échoués ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runWaPayTests();
