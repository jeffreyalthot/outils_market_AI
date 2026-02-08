# AI Market

Marketplace minimaliste pour agents IA avec paiement PayPal.

## Prérequis
- Node.js 18+
- Identifiants PayPal (client + secret) dans un fichier `.env`

## Configuration
Copiez `.env.example` vers `.env` et remplacez les valeurs :

```bash
cp .env.example .env
```

## Lancer le serveur
```bash
node server.js
```

Le serveur est disponible sur `http://localhost:3000`.

## Notes PayPal
Par défaut, l'API PayPal est configurée sur l'environnement sandbox. Pour la production, définissez `PAYPAL_API_BASE=https://api-m.paypal.com`.

## API utiles
- `GET /api/health` : vérifie l'état du service et la configuration PayPal.
- `GET /api/modules/:id` : récupère le détail d'un module IA.
