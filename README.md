# WA Monetizer Web 🚀

Plateforme tout-en-un de monétisation, d'automatisation de bots WhatsApp et de gestion des abonnements avec intégration des paiements Mobile Money (MTN MoMo, Telecel Cash, Hubtel, Paystack).

---

## 📁 Architecture du Projet (Front-End)

Ce dépôt héberge l'application Front-End Web React :

```text
├── src/                    # Code source React (Tableaux de bord, Abonnements, Bots, Paiements)
│   ├── components/         # Composants UI (Dashboard, Membres, Groupes, Plans, etc.)
│   ├── context/            # Gestion multilingue et état
│   ├── firebase/           # Configuration client Firestore
│   ├── services/           # Services clients Firestore & API
│   ├── utils/              # Formatage monnaies (GHS, XOF, etc.)
│   └── types/              # Définitions TypeScript
├── public/                 # Fichiers statiques et icônes
├── index.html              # Point d'entrée HTML
├── package.json            # Dépendances front-end (Vite, React 19, Tailwind CSS)
└── vite.config.ts          # Configuration Vite
```

> **Note Architecture Séparée** : Le backend API et les webhooks de paiement sont gérés de manière découplée (déploiement Vercel ou serveur dédié), garantissant que le code serveur et les secrets API ne sont pas exposés sur le dépôt public front-end.

---

## ⚡ Déploiement Front-End

### Déploiement Vercel / Cloudflare Pages / GitHub Pages
1. Connectez ce dépôt (`Jibril-tengeh/wa-monetizer-web`) sur **[Vercel](https://vercel.com)** ou votre hébergeur statique.
2. Build Command : `npm run build`
3. Output Directory : `dist`
4. Configurez l'URL de votre API backend dans vos variables d'environnement (`VITE_API_URL`).

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
