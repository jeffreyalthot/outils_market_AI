const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;

const loadDotEnv = () => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return;
    }
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) {
      process.env[key] = rest.join('=').trim();
    }
  });
};

loadDotEnv();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.warn('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET. Set them in your environment.');
}

const catalog = [
  {
    id: 'audit-agent',
    name: 'Audit IA',
    description: 'Audit automatique de vos données et recommandations actionnables.',
    price: '49.00'
  },
  {
    id: 'growth-agent',
    name: 'Growth IA',
    description: 'Plans marketing optimisés par IA avec priorisation des actions.',
    price: '79.00'
  },
  {
    id: 'ops-agent',
    name: 'Ops IA',
    description: 'Automatisation des opérations internes et alertes intelligentes.',
    price: '99.00'
  }
];

const buildHtml = (clientId) => `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Market</title>
    <link rel="stylesheet" href="/assets/styles.css" />
  </head>
  <body>
    <header class="hero">
      <div>
        <p class="pill">Marché privé</p>
        <h1>AI Market pour agents intelligents</h1>
        <p class="subtitle">Une vitrine minimaliste pour vendre des services IA entre agents, avec paiement PayPal sécurisé.</p>
      </div>
      <div class="hero-card">
        <h2>Accès instantané</h2>
        <p>Choisissez un module IA, validez le paiement et recevez un jeton d'activation.</p>
        <div class="hero-metric">
          <span>Disponibilité</span>
          <strong>99.9%</strong>
        </div>
      </div>
    </header>

    <main>
      <section class="grid">
        ${catalog
          .map(
            (item) => `
          <article class="card" data-id="${item.id}" data-price="${item.price}">
            <div>
              <h3>${item.name}</h3>
              <p>${item.description}</p>
            </div>
            <div class="card-footer">
              <span class="price">${item.price} €</span>
              <button class="select">Sélectionner</button>
            </div>
          </article>`
          )
          .join('')}
      </section>

      <section class="checkout">
        <div>
          <h2>Checkout sécurisé</h2>
          <p>Sélectionnez un module IA pour activer le paiement.</p>
          <div class="selected">
            <strong id="selected-name">Aucun module sélectionné</strong>
            <span id="selected-price">—</span>
          </div>
        </div>
        <div id="paypal-button-container" class="paypal"></div>
      </section>
    </main>

    <footer>
      <p>AI Market est un marché interne destiné aux agents IA et à l'opérateur.</p>
    </footer>

    <script>
      const items = ${JSON.stringify(catalog)};
      let selectedItem = null;

      const nameEl = document.getElementById('selected-name');
      const priceEl = document.getElementById('selected-price');

      document.querySelectorAll('.select').forEach((button) => {
        button.addEventListener('click', (event) => {
          const card = event.target.closest('.card');
          const id = card.dataset.id;
          selectedItem = items.find((item) => item.id === id);
          nameEl.textContent = selectedItem.name;
          priceEl.textContent = selectedItem.price + ' €';
          document.querySelectorAll('.card').forEach((node) => node.classList.remove('active'));
          card.classList.add('active');
        });
      });
    </script>
    <script src="https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR"></script>
    <script>
      paypal.Buttons({
        createOrder: async () => {
          if (!selectedItem) {
            alert('Sélectionnez un module IA avant de payer.');
            throw new Error('No item selected');
          }
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: selectedItem.id,
              itemName: selectedItem.name,
              amount: selectedItem.price
            })
          });
          const order = await response.json();
          return order.id;
        },
        onApprove: async (data) => {
          const response = await fetch('/api/orders/' + data.orderID + '/capture', {
            method: 'POST'
          });
          const details = await response.json();
          alert('Paiement confirmé pour ' + (details.payer?.name?.given_name || 'client') + ' !');
        }
      }).render('#paypal-button-container');
    </script>
  </body>
</html>`;

const getAccessToken = async () => {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal token error: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHtml(PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID'));
    return;
  }

  if (method === 'GET' && url === '/assets/styles.css') {
    const cssPath = path.join(__dirname, 'public', 'styles.css');
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(fs.readFileSync(cssPath));
    return;
  }

  if (method === 'POST' && url === '/api/orders') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { itemId, itemName, amount } = JSON.parse(body || '{}');
        if (!itemId || !amount) {
          sendJson(res, 400, { error: 'Missing item data' });
          return;
        }

        const accessToken = await getAccessToken();
        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
              {
                reference_id: itemId,
                description: itemName,
                amount: {
                  currency_code: 'EUR',
                  value: amount
                }
              }
            ]
          })
        });

        const orderData = await response.json();
        sendJson(res, response.status, orderData);
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });
    return;
  }

  if (method === 'POST' && url.startsWith('/api/orders/') && url.endsWith('/capture')) {
    const orderId = url.split('/')[3];
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const captureData = await response.json();
      sendJson(res, response.status, captureData);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`AI Market server running on http://localhost:${port}`);
});
