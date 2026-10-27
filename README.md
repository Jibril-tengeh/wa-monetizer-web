# WA Monetizer Web 🚀

Plateforme tout-en-un de monétisation, d'automatisation de bots WhatsApp et de gestion des abonnements avec intégration des paiements Mobile Money (MTN MoMo, Telecel Cash, Hubtel, Paystack).

---

## 📁 Architecture du Projet

Le dépôt est structuré pour permettre à la fois un déploiement monobloc (full-stack) ou un déploiement séparé Front-end & Back-end :

```text
├── frontend/               # Application React 19 + Vite + Tailwind CSS + Lucide Icons
│   ├── src/                # Composants, dashboards, abonnements, paiements, bot builder
│   ├── package.json        # Dépendances front-end autonomes
│   └── .env.example        # Variables d'environnement front-end
│
├── backend/                # Serveur API Node.js / Express & Serveur de Webhooks
│   ├── src/                # Routes API /api/subscription, /api/payments, webhooks MoMo
│   ├── package.json        # Dépendances back-end autonomes
│   ├── vercel.json         # Configuration de déploiement Vercel Serverless
│   └── .env.example        # Configuration des clés Mobile Money (Paystack / Hubtel)
│
├── src/                    # Code source unifié (React client & composants)
├── api/                    # Serverless Functions compatibles Vercel
├── server.ts               # Serveur Node.js Full-Stack Express avec proxy Vite
├── vercel.json             # Déploiement Vercel en 1-clic pour l'ensemble du projet
└── package.json            # Scripts racines (npm run build, npm run test, npm run dev)
```

---

## ⚡ Déploiement

### Option 1 : Déploiement Vercel en 1 Clic (Recommandé)
1. Importez ce dépôt sur votre compte **[Vercel](https://vercel.com)** (`Jibril-tengeh/wa-monetizer-web`).
2. Vercel détecte automatiquement `vercel.json` et configure :
   - Le Front-end Vite (`dist`)
   - Les Serverless Functions pour l'API (`/api/*`)
3. Ajoutez les variables d'environnement dans les paramètres Vercel :
   - `PAYSTACK_SECRET_KEY` : Votre clé secrète Paystack (Live ou Test)
   - `PAYSTACK_PUBLIC_KEY` : Votre clé publique Paystack
   - `GEMINI_API_KEY` (optionnel) : Clé d'intelligence artificielle Gemini

### Option 2 : Déploiement Séparé
- **Back-end uniquement** : Déployez le sous-dossier `backend/` sur Vercel, Render ou Railway.
- **Front-end uniquement** : Déployez le sous-dossier `frontend/` sur GitHub Pages, Vercel ou Cloudflare Pages.

---

## 📱 Utilisation Mobile & Termux (Android)

Pour exécuter le bot WhatsApp directement depuis un téléphone Android sans serveur coûteux :
1. Installez l'application **Termux** depuis F-Droid.
2. Exécutez :
   ```bash
   pkg update && pkg install nodejs git
   git clone https://github.com/Jibril-tengeh/wa-monetizer-web.git
   cd wa-monetizer-web
   npm install
   npm run dev
   ```
3. Ouvrez votre navigateur sur `http://localhost:3000` et scannez le QR code de jumelage WhatsApp !

---

## 💳 Passerelles de Paiement Intégrées

- **MTN Mobile Money & Telecel Cash (Ghana / GHS)** : Pris en charge via l'API Paystack Checkout & Webhooks sécurisés HMAC-SHA512.
- **Hubtel Mobile Money** : Pris en charge pour les comptes marchands au Ghana.
- **Simulation Sandbox** : Permet de tester le flux complet d'abonnement sans argent réel.

---

## 📄 Licence
MIT
