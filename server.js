const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    deliverable: 'Rapport clair + plan 30 jours',
    eta: 'Livré en 2h',
    price: '49.00',
    tags: ['Audit', 'Data', 'Quick win'],
    inputs: ['KPI principaux', 'Sources de données', 'Contraintes business'],
    outputs: ['Plan d’action 30 jours', 'Tableau d’opportunités']
  },
  {
    id: 'growth-agent',
    name: 'Growth IA',
    description: 'Plans marketing optimisés par IA avec priorisation des actions.',
    deliverable: 'Roadmap growth priorisée',
    eta: 'Livré en 4h',
    price: '79.00',
    tags: ['Growth', 'Marketing', 'Expérimentation'],
    inputs: ['Positionnement', 'Canaux actuels', 'Objectifs de conversion'],
    outputs: ['Roadmap growth', 'Backlog d’expériences']
  },
  {
    id: 'ops-agent',
    name: 'Ops IA',
    description: 'Automatisation des opérations internes et alertes intelligentes.',
    deliverable: 'Playbook d’automatisation',
    eta: 'Livré en 6h',
    price: '99.00',
    tags: ['Ops', 'Automatisation', 'Alerting'],
    inputs: ['Process internes', 'SLA critiques', 'Outils existants'],
    outputs: ['Playbook ops', 'Alertes intelligentes']
  }
];

const activations = [];
const MAX_ACTIVATIONS = 8;
const briefs = [];
const MAX_BRIEFS = 6;

const findModule = (moduleId) => catalog.find((item) => item.id === moduleId);
const listTags = () => {
  const set = new Set();
  catalog.forEach((item) => {
    item.tags.forEach((tag) => set.add(tag));
  });
  return Array.from(set).sort();
};

const buildHtml = (clientId, hasCredentials) => `<!doctype html>
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
          <article class="card" data-id="${item.id}" data-price="${item.price}" data-tags="${item.tags.join(',')}">
            <div>
              <h3>${item.name}</h3>
              <p>${item.description}</p>
              <div class="tag-row">
                ${item.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
              </div>
              <ul class="card-list">
                <li>${item.deliverable}</li>
                <li>${item.eta}</li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="price">${item.price} €</span>
              <button class="select">Sélectionner</button>
            </div>
          </article>`
          )
          .join('')}
      </section>

      <section class="catalog-filter">
        <div>
          <p class="eyebrow">Filtrer le catalogue</p>
          <h2>Trouvez le bon module IA</h2>
          <p class="muted">Affinez par tag ou par mot-clé pour orienter vos agents.</p>
        </div>
        <div class="filter-panel">
          <input id="catalog-search" type="search" placeholder="Rechercher un module, un deliverable..." />
          <div id="catalog-tags" class="tag-filter"></div>
        </div>
      </section>

      <section class="steps">
        <div>
          <p class="eyebrow">Comment ça marche</p>
          <h2>Un flux pensé pour les agents IA</h2>
          <p class="muted">Choisissez un module, payez en quelques secondes et recevez un jeton utilisable par votre agent IA.</p>
        </div>
        <div class="steps-grid">
          <div class="step-card">
            <span>1</span>
            <h3>Choix du module</h3>
            <p>Comparez les services IA et sélectionnez la mission adaptée.</p>
          </div>
          <div class="step-card">
            <span>2</span>
            <h3>Paiement PayPal</h3>
            <p>Payez via l’interface sécurisée PayPal en environnement sandbox ou live.</p>
          </div>
          <div class="step-card">
            <span>3</span>
            <h3>Activation immédiate</h3>
            <p>Recevez un jeton d’activation et lancez votre automatisation.</p>
          </div>
        </div>
      </section>

      <section class="checkout">
        <div>
          <h2>Checkout sécurisé</h2>
          <p>Sélectionnez un module IA pour activer le paiement.</p>
          <div class="selected">
            <strong id="selected-name">Aucun module sélectionné</strong>
            <span id="selected-desc">Sélectionnez un module pour voir le livrable.</span>
            <span id="selected-eta">—</span>
            <span id="selected-price">—</span>
            <div class="selected-inputs">
              <p class="eyebrow">Inputs requis</p>
              <ul id="selected-inputs" class="selected-list">
                <li>—</li>
              </ul>
            </div>
            <div class="selected-outputs">
              <p class="eyebrow">Outputs attendus</p>
              <ul id="selected-outputs" class="selected-list">
                <li>—</li>
              </ul>
            </div>
          </div>
          <div id="payment-status" class="status">Statut du paiement en attente.</div>
          <div class="demo">
            <p class="eyebrow">Mode démo</p>
            <p class="muted">
              Utilisez la démo pour générer un jeton lorsque les identifiants PayPal ne sont pas configurés.
            </p>
            <button id="demo-activation" class="secondary">Générer un jeton démo</button>
          </div>
        </div>
        <div id="paypal-button-container" class="paypal"></div>
        <div id="activation" class="activation">
          <p class="eyebrow">Jeton d'activation</p>
          <h3>Votre module est prêt</h3>
          <p class="muted">Copiez ce jeton dans votre orchestrateur pour lancer l’agent.</p>
          <div class="token-row">
            <code id="activation-token">AIM-XXXX</code>
            <button id="copy-token" class="secondary">Copier</button>
          </div>
          <p id="activation-expiry" class="muted"></p>
          <ul id="activation-steps" class="activation-steps"></ul>
        </div>
      </section>

      <section class="runbook">
        <div>
          <p class="eyebrow">Runbook agent</p>
          <h2>Orchestration rapide</h2>
          <p class="muted">
            Utilisez ces commandes pour intégrer le module sélectionné dans votre pipeline ou orchestrateur IA.
          </p>
          <div class="runbook-meta">
            <div>
              <span class="muted">Module actif</span>
              <strong id="runbook-module">—</strong>
            </div>
            <div>
              <span class="muted">Base API</span>
              <strong id="runbook-endpoint">—</strong>
            </div>
          </div>
        </div>
        <div class="runbook-cards">
          <article class="runbook-card">
            <h3>1. Vérifier le service</h3>
            <pre><code id="runbook-health">curl -s http://localhost:3000/api/health</code></pre>
          </article>
          <article class="runbook-card">
            <h3>2. Générer une activation</h3>
            <pre><code id="runbook-activation">curl -X POST http://localhost:3000/api/demo-activation \
  -H "Content-Type: application/json" \
  -d '{"moduleId":"audit-agent"}'</code></pre>
          </article>
          <article class="runbook-card">
            <h3>3. Envoyer le brief</h3>
            <pre><code id="runbook-brief">curl -X POST http://localhost:3000/api/briefs \
  -H "Content-Type: application/json" \
  -d '{"module":"audit-agent","context":"","goals":"","sources":[]}'</code></pre>
            <button id="download-brief" class="secondary">Télécharger le JSON</button>
          </article>
        </div>
      </section>

      <section class="tracker">
        <div>
          <p class="eyebrow">Suivi live</p>
          <h2>Journal des activations</h2>
          <p class="muted">Visualisez les derniers jetons générés pour vos agents et orchestrateurs.</p>
        </div>
        <div class="tracker-card">
          <ul id="activation-log" class="tracker-list">
            <li class="muted">Aucune activation disponible.</li>
          </ul>
        </div>
      </section>

      <section class="pulse">
        <div>
          <p class="eyebrow">Pulse</p>
          <h2>Suivi temps réel des agents</h2>
          <p class="muted">Vue d’ensemble des activations et briefs en cours.</p>
        </div>
        <div class="pulse-grid">
          <article class="pulse-card">
            <p class="eyebrow">Modules</p>
            <h3 id="metric-modules">—</h3>
            <p class="muted">Disponibles dans le catalogue</p>
          </article>
          <article class="pulse-card">
            <p class="eyebrow">Activations</p>
            <h3 id="metric-activations">—</h3>
            <p id="metric-last-activation" class="muted">Dernier jeton —</p>
          </article>
          <article class="pulse-card">
            <p class="eyebrow">Briefs</p>
            <h3 id="metric-briefs">—</h3>
            <p id="metric-last-brief" class="muted">Dernier brief —</p>
          </article>
        </div>
      </section>

      <section class="brief">
        <div>
          <p class="eyebrow">Brief agent</p>
          <h2>Préparez les données pour l’orchestrateur</h2>
          <p class="muted">Générez un payload prêt à être consommé par un agent IA après paiement.</p>
          <div class="brief-fields">
            <label>
              Contexte métier
              <textarea id="brief-context" rows="3" placeholder="Ex: SaaS B2B, objectif churn 3%"></textarea>
            </label>
            <label>
              Objectifs clés
              <textarea id="brief-goals" rows="3" placeholder="Ex: améliorer l’activation, réduire le CAC"></textarea>
            </label>
            <label>
              Sources disponibles
              <input id="brief-sources" type="text" placeholder="Ex: HubSpot, Stripe, GA4" />
            </label>
          </div>
          <div class="brief-actions">
            <button id="send-brief" class="select">Envoyer le brief</button>
            <span id="brief-status" class="muted">Aucun brief transmis.</span>
          </div>
        </div>
        <div class="brief-output">
          <div class="brief-header">
            <h3>Payload JSON</h3>
            <button id="copy-brief" class="secondary">Copier</button>
          </div>
          <pre><code id="brief-payload">{
  "module": null,
  "moduleName": null,
  "outputs": [],
  "context": "",
  "goals": "",
  "sources": []
}</code></pre>
          <p class="muted">Collez ce payload dans votre orchestrateur pour démarrer la mission.</p>
        </div>
      </section>

      <section class="brief-log">
        <div>
          <p class="eyebrow">Briefs envoyés</p>
          <h2>Historique récent</h2>
          <p class="muted">Les derniers briefs envoyés vers l’API pour vos orchestrateurs.</p>
        </div>
        <div class="tracker-card">
          <ul id="brief-log" class="tracker-list">
            <li class="muted">Aucun brief envoyé.</li>
          </ul>
        </div>
      </section>

      <section class="api">
        <div>
          <p class="eyebrow">API agents</p>
          <h2>Connectez vos orchestrateurs</h2>
          <p class="muted">
            Récupérez le catalogue et transmettez le brief directement depuis vos agents IA.
          </p>
        </div>
        <div class="api-cards">
          <article class="api-card">
            <h3>GET /api/catalog</h3>
            <p class="muted">Liste des modules, tags, inputs et outputs.</p>
            <pre><code>curl -s http://localhost:3000/api/catalog</code></pre>
          </article>
          <article class="api-card">
            <h3>POST /api/demo-activation</h3>
            <p class="muted">Génère un jeton de test pour vos workflows.</p>
            <pre><code>curl -X POST http://localhost:3000/api/demo-activation \
  -H "Content-Type: application/json" \
  -d '{"moduleId":"audit-agent"}'</code></pre>
          </article>
          <article class="api-card">
            <h3>GET /api/activations</h3>
            <p class="muted">Liste les derniers jetons générés.</p>
            <pre><code>curl -s http://localhost:3000/api/activations</code></pre>
          </article>
          <article class="api-card">
            <h3>POST /api/briefs</h3>
            <p class="muted">Enregistre un brief transmis par un agent IA.</p>
            <pre><code>curl -X POST http://localhost:3000/api/briefs \
  -H "Content-Type: application/json" \
  -d '{"module":"audit-agent","context":"B2B SaaS","goals":"Activation","sources":["GA4"]}'</code></pre>
          </article>
          <article class="api-card">
            <h3>GET /api/briefs</h3>
            <p class="muted">Récupère les derniers briefs enregistrés.</p>
            <pre><code>curl -s http://localhost:3000/api/briefs</code></pre>
          </article>
        </div>
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
      const descEl = document.getElementById('selected-desc');
      const etaEl = document.getElementById('selected-eta');
      const statusEl = document.getElementById('payment-status');
      const activationEl = document.getElementById('activation');
      const activationTokenEl = document.getElementById('activation-token');
      const activationExpiryEl = document.getElementById('activation-expiry');
      const activationStepsEl = document.getElementById('activation-steps');
      const copyTokenBtn = document.getElementById('copy-token');
      const selectedInputsEl = document.getElementById('selected-inputs');
      const selectedOutputsEl = document.getElementById('selected-outputs');
      const briefContextEl = document.getElementById('brief-context');
      const briefGoalsEl = document.getElementById('brief-goals');
      const briefSourcesEl = document.getElementById('brief-sources');
      const briefPayloadEl = document.getElementById('brief-payload');
      const copyBriefBtn = document.getElementById('copy-brief');
      const demoButton = document.getElementById('demo-activation');
      const activationLogEl = document.getElementById('activation-log');
      const sendBriefBtn = document.getElementById('send-brief');
      const briefStatusEl = document.getElementById('brief-status');
      const briefLogEl = document.getElementById('brief-log');
      const catalogSearchEl = document.getElementById('catalog-search');
      const catalogTagsEl = document.getElementById('catalog-tags');
      const metricModulesEl = document.getElementById('metric-modules');
      const metricActivationsEl = document.getElementById('metric-activations');
      const metricBriefsEl = document.getElementById('metric-briefs');
      const metricLastActivationEl = document.getElementById('metric-last-activation');
      const metricLastBriefEl = document.getElementById('metric-last-brief');
      const runbookModuleEl = document.getElementById('runbook-module');
      const runbookEndpointEl = document.getElementById('runbook-endpoint');
      const runbookHealthEl = document.getElementById('runbook-health');
      const runbookActivationEl = document.getElementById('runbook-activation');
      const runbookBriefEl = document.getElementById('runbook-brief');
      const downloadBriefBtn = document.getElementById('download-brief');
      const hasCredentials = ${hasCredentials ? 'true' : 'false'};
      const tags = ${JSON.stringify(listTags())};
      let activeTag = 'Tous';

      const setStatus = (message, status) => {
        statusEl.textContent = message;
        statusEl.dataset.status = status;
      };

      const showActivation = (activation) => {
        if (!activation) {
          return;
        }
        activationTokenEl.textContent = activation.token;
        activationExpiryEl.textContent = 'Valide jusqu’au ' + new Date(activation.expiresAt).toLocaleString('fr-FR');
        activationStepsEl.innerHTML = '';
        activation.nextSteps.forEach((step) => {
          const li = document.createElement('li');
          li.textContent = step;
          activationStepsEl.appendChild(li);
        });
        activationEl.classList.add('visible');
      };

      const renderActivationLog = (entries) => {
        activationLogEl.innerHTML = '';
        if (!entries || entries.length === 0) {
          const empty = document.createElement('li');
          empty.className = 'muted';
          empty.textContent = 'Aucune activation disponible.';
          activationLogEl.appendChild(empty);
          return;
        }
        entries.forEach((entry) => {
          const li = document.createElement('li');
          li.innerHTML = \`
            <div>
              <strong>\${entry.moduleName}</strong>
              <span class="muted">· \${entry.mode}</span>
            </div>
            <div class="muted">\${new Date(entry.createdAt).toLocaleString('fr-FR')}</div>
            <code>\${entry.token}</code>
          \`;
          activationLogEl.appendChild(li);
        });
      };

      const refreshActivationLog = async () => {
        try {
          const response = await fetch('/api/activations');
          const data = await response.json();
          renderActivationLog(data.items || []);
        } catch (error) {
          console.warn('Unable to load activations', error);
        }
      };

      const renderBriefLog = (entries) => {
        briefLogEl.innerHTML = '';
        if (!entries || entries.length === 0) {
          const empty = document.createElement('li');
          empty.className = 'muted';
          empty.textContent = 'Aucun brief envoyé.';
          briefLogEl.appendChild(empty);
          return;
        }
        entries.forEach((entry) => {
          const li = document.createElement('li');
          li.innerHTML = \`
            <div>
              <strong>\${entry.moduleName || 'Module inconnu'}</strong>
              <span class="muted">· \${entry.sources.join(', ') || 'Sans source'}</span>
            </div>
            <div class="muted">\${new Date(entry.createdAt).toLocaleString('fr-FR')}</div>
            <code>\${entry.context || 'Brief sans contexte'}</code>
          \`;
          briefLogEl.appendChild(li);
        });
      };

      const refreshBriefLog = async () => {
        try {
          const response = await fetch('/api/briefs');
          const data = await response.json();
          renderBriefLog(data.items || []);
        } catch (error) {
          console.warn('Unable to load briefs', error);
        }
      };

      const renderMetrics = (metrics) => {
        if (!metrics) {
          return;
        }
        metricModulesEl.textContent = metrics.catalogCount ?? '—';
        metricActivationsEl.textContent = metrics.activationCount ?? '—';
        metricBriefsEl.textContent = metrics.briefCount ?? '—';
        metricLastActivationEl.textContent = metrics.lastActivation
          ? 'Dernier jeton ' + new Date(metrics.lastActivation.createdAt).toLocaleString('fr-FR')
          : 'Dernier jeton —';
        metricLastBriefEl.textContent = metrics.lastBrief
          ? 'Dernier brief ' + new Date(metrics.lastBrief.createdAt).toLocaleString('fr-FR')
          : 'Dernier brief —';
      };

      const refreshMetrics = async () => {
        try {
          const response = await fetch('/api/metrics');
          const data = await response.json();
          renderMetrics(data);
        } catch (error) {
          console.warn('Unable to load metrics', error);
        }
      };

      const renderTagFilters = () => {
        const buttons = ['Tous', ...tags];
        catalogTagsEl.innerHTML = '';
        buttons.forEach((tag) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = tag;
          button.className = tag === activeTag ? 'tag-button active' : 'tag-button';
          button.addEventListener('click', () => {
            activeTag = tag;
            renderTagFilters();
            applyCatalogFilters();
          });
          catalogTagsEl.appendChild(button);
        });
      };

      const applyCatalogFilters = () => {
        const term = catalogSearchEl.value.toLowerCase();
        const cards = document.querySelectorAll('.card');
        cards.forEach((card) => {
          const title = card.querySelector('h3')?.textContent?.toLowerCase() || '';
          const desc = card.querySelector('p')?.textContent?.toLowerCase() || '';
          const tags = (card.dataset.tags || '').toLowerCase().split(',');
          const matchesTag = activeTag === 'Tous' || tags.includes(activeTag.toLowerCase());
          const matchesTerm = !term || title.includes(term) || desc.includes(term);
          card.style.display = matchesTag && matchesTerm ? 'flex' : 'none';
        });
      };

      const getBriefPayload = () => JSON.parse(briefPayloadEl.textContent || '{}');

      const updateBriefPayload = () => {
        const moduleId = selectedItem ? selectedItem.id : null;
        const payload = {
          module: moduleId,
          moduleName: selectedItem ? selectedItem.name : null,
          outputs: selectedItem ? selectedItem.outputs : [],
          context: briefContextEl.value.trim(),
          goals: briefGoalsEl.value.trim(),
          sources: briefSourcesEl.value
            .split(',')
            .map((source) => source.trim())
            .filter(Boolean)
        };
        briefPayloadEl.textContent = JSON.stringify(payload, null, 2);
        updateRunbook();
      };

      const updateRunbook = () => {
        const baseUrl = window.location.origin;
        const fallbackModule = items[0]?.id || 'audit-agent';
        const moduleId = selectedItem ? selectedItem.id : fallbackModule;
        const moduleName = selectedItem ? selectedItem.name : 'Aucun module sélectionné';
        const briefPayload = getBriefPayload();
        const resolvedBrief = {
          module: moduleId,
          moduleName: selectedItem ? selectedItem.name : briefPayload.moduleName || null,
          outputs: selectedItem ? selectedItem.outputs : briefPayload.outputs || [],
          context: briefPayload.context || '',
          goals: briefPayload.goals || '',
          sources: briefPayload.sources || []
        };
        runbookModuleEl.textContent = moduleName;
        runbookEndpointEl.textContent = baseUrl;
        runbookHealthEl.textContent = 'curl -s ' + baseUrl + '/api/health';
        runbookActivationEl.textContent =
          'curl -X POST ' +
          baseUrl +
          '/api/demo-activation \\\n  -H "Content-Type: application/json" \\\n  -d \'' +
          JSON.stringify({ moduleId }) +
          '\'';
        runbookBriefEl.textContent =
          'curl -X POST ' +
          baseUrl +
          '/api/briefs \\\n  -H "Content-Type: application/json" \\\n  -d \'' +
          JSON.stringify(resolvedBrief) +
          '\'';
      };

      copyTokenBtn.addEventListener('click', async () => {
        const token = activationTokenEl.textContent;
        try {
          await navigator.clipboard.writeText(token);
          copyTokenBtn.textContent = 'Copié';
          setTimeout(() => {
            copyTokenBtn.textContent = 'Copier';
          }, 1500);
        } catch (error) {
          console.warn('Clipboard not available', error);
          alert('Copiez manuellement le jeton : ' + token);
        }
      });

      copyBriefBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(briefPayloadEl.textContent);
          copyBriefBtn.textContent = 'Copié';
          setTimeout(() => {
            copyBriefBtn.textContent = 'Copier';
          }, 1500);
        } catch (error) {
          console.warn('Clipboard not available', error);
          alert('Copiez manuellement le payload.');
        }
      });

      downloadBriefBtn.addEventListener('click', () => {
        const payload = getBriefPayload();
        const moduleId = payload.module || 'module';
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'brief-' + moduleId + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 500);
      });

      [briefContextEl, briefGoalsEl, briefSourcesEl].forEach((input) => {
        input.addEventListener('input', updateBriefPayload);
      });

      sendBriefBtn.addEventListener('click', async () => {
        const payload = JSON.parse(briefPayloadEl.textContent || '{}');
        if (!payload.module) {
          briefStatusEl.textContent = 'Sélectionnez un module avant d’envoyer le brief.';
          briefStatusEl.dataset.status = 'error';
          return;
        }
        briefStatusEl.textContent = 'Envoi du brief en cours…';
        briefStatusEl.dataset.status = 'pending';
        const response = await fetch('/api/briefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
          briefStatusEl.textContent = result.error || 'Impossible d’envoyer le brief.';
          briefStatusEl.dataset.status = 'error';
          return;
        }
        briefStatusEl.textContent = 'Brief envoyé. Référence: ' + result.brief.id + '.';
        briefStatusEl.dataset.status = 'success';
        refreshBriefLog();
      });

      document.querySelectorAll('.select').forEach((button) => {
        button.addEventListener('click', (event) => {
          const card = event.target.closest('.card');
          const id = card.dataset.id;
          selectedItem = items.find((item) => item.id === id);
          nameEl.textContent = selectedItem.name;
          priceEl.textContent = selectedItem.price + ' €';
          descEl.textContent = selectedItem.deliverable;
          etaEl.textContent = selectedItem.eta;
          selectedInputsEl.innerHTML = '';
          selectedItem.inputs.forEach((input) => {
            const li = document.createElement('li');
            li.textContent = input;
            selectedInputsEl.appendChild(li);
          });
          selectedOutputsEl.innerHTML = '';
          selectedItem.outputs.forEach((output) => {
            const li = document.createElement('li');
            li.textContent = output;
            selectedOutputsEl.appendChild(li);
          });
          setStatus('Module prêt pour le paiement.', 'ready');
          document.querySelectorAll('.card').forEach((node) => node.classList.remove('active'));
          card.classList.add('active');
          activationEl.classList.remove('visible');
          updateBriefPayload();
        });
      });

      demoButton.addEventListener('click', async () => {
        if (!selectedItem) {
          setStatus('Sélectionnez un module IA avant de générer un jeton.', 'error');
          alert('Sélectionnez un module IA avant de générer un jeton.');
          return;
        }
        setStatus('Génération du jeton démo…', 'pending');
        const response = await fetch('/api/demo-activation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId: selectedItem.id })
        });
        const result = await response.json();
        if (!response.ok) {
          setStatus(result.error || 'La génération du jeton a échoué.', 'error');
          return;
        }
        showActivation(result.activation);
        setStatus('Jeton démo généré. Utilisez-le pour vos tests.', 'success');
        refreshActivationLog();
      });

      if (hasCredentials) {
        demoButton.disabled = true;
        demoButton.textContent = 'Démo indisponible (PayPal configuré)';
      }

      catalogSearchEl.addEventListener('input', applyCatalogFilters);

      renderTagFilters();
      applyCatalogFilters();
      updateBriefPayload();
      refreshActivationLog();
      refreshBriefLog();
      refreshMetrics();
      setInterval(refreshMetrics, 15000);
    </script>
    ${
      hasCredentials
        ? `<script src="https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR"></script>
    <script>
      paypal.Buttons({
        createOrder: async () => {
          if (!selectedItem) {
            setStatus('Sélectionnez un module IA avant de payer.', 'error');
            alert('Sélectionnez un module IA avant de payer.');
            throw new Error('No item selected');
          }
          setStatus('Création de la commande PayPal…', 'pending');
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
          if (!response.ok) {
            setStatus(order.error || 'Impossible de créer la commande.', 'error');
            throw new Error('Order creation failed');
          }
          return order.id;
        },
        onApprove: async (data) => {
          setStatus('Capture du paiement en cours…', 'pending');
          const response = await fetch('/api/orders/' + data.orderID + '/capture', {
            method: 'POST'
          });
          const details = await response.json();
          if (!response.ok) {
            setStatus(details.error || 'La capture du paiement a échoué.', 'error');
            throw new Error('Capture failed');
          }
          const payerName = details.payer?.name?.given_name || 'client';
          const captureId = details?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
          if (details.activation?.token) {
            showActivation(details.activation);
          }
          setStatus(
            'Paiement confirmé pour ' + payerName + (captureId ? ' · Réf. ' + captureId : '') + '.',
            'success'
          );
          refreshActivationLog();
          alert('Paiement confirmé pour ' + payerName + ' !');
        },
        onError: (err) => {
          console.error(err);
          setStatus('Une erreur est survenue. Réessayez ou contactez le support.', 'error');
        }
      }).render('#paypal-button-container');
    </script>`
        : `<script>
          document.getElementById('paypal-button-container').innerHTML =
            '<div class="muted">Configurez PAYPAL_CLIENT_ID pour activer le paiement.</div>';
        </script>`
    }
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

const buildActivationPayload = (orderId, captureData) => {
  const rawToken = crypto.randomBytes(10).toString('hex').toUpperCase();
  const moduleId = captureData?.purchase_units?.[0]?.reference_id || 'module';
  const moduleDetails = findModule(moduleId);
  const moduleName = moduleDetails ? moduleDetails.name : 'Module IA';
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  return {
    token: `AIM-${moduleId.toUpperCase()}-${rawToken}`,
    orderId,
    moduleId,
    moduleName,
    expiresAt,
    nextSteps: [
      'Copiez le jeton dans votre orchestrateur IA.',
      'Activez la mission et surveillez les métriques.',
      'Contactez support@aimarket.ai en cas de blocage.'
    ]
  };
};

const recordActivation = (activation, mode) => {
  if (!activation) {
    return;
  }
  activations.unshift({
    token: activation.token,
    moduleId: activation.moduleId,
    moduleName: activation.moduleName,
    mode,
    createdAt: new Date().toISOString()
  });
  if (activations.length > MAX_ACTIVATIONS) {
    activations.length = MAX_ACTIVATIONS;
  }
};

const recordBrief = (brief) => {
  if (!brief) {
    return;
  }
  briefs.unshift(brief);
  if (briefs.length > MAX_BRIEFS) {
    briefs.length = MAX_BRIEFS;
  }
};

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHtml(PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID', Boolean(PAYPAL_CLIENT_ID)));
    return;
  }

  if (method === 'GET' && url === '/assets/styles.css') {
    const cssPath = path.join(__dirname, 'public', 'styles.css');
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(fs.readFileSync(cssPath));
    return;
  }

  if (method === 'GET' && url === '/api/catalog') {
    sendJson(res, 200, { items: catalog });
    return;
  }

  if (method === 'GET' && url.startsWith('/api/modules/')) {
    const moduleId = decodeURIComponent(url.split('/')[3] || '');
    const moduleDetails = findModule(moduleId);
    if (!moduleDetails) {
      sendJson(res, 404, { error: 'Module not found' });
      return;
    }
    sendJson(res, 200, { item: moduleDetails });
    return;
  }

  if (method === 'GET' && url === '/api/activations') {
    sendJson(res, 200, { items: activations });
    return;
  }

  if (method === 'GET' && url === '/api/briefs') {
    sendJson(res, 200, { items: briefs });
    return;
  }

  if (method === 'GET' && url === '/api/metrics') {
    sendJson(res, 200, {
      catalogCount: catalog.length,
      activationCount: activations.length,
      briefCount: briefs.length,
      lastActivation: activations[0] || null,
      lastBrief: briefs[0] || null
    });
    return;
  }

  if (method === 'GET' && url === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      uptime: process.uptime(),
      now: new Date().toISOString(),
      paypalConfigured: Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET)
    });
    return;
  }

  if (method === 'POST' && url === '/api/demo-activation') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { moduleId } = JSON.parse(body || '{}');
        if (!moduleId) {
          sendJson(res, 400, { error: 'Missing moduleId' });
          return;
        }
        const activation = buildActivationPayload(`demo-${Date.now()}`, {
          purchase_units: [{ reference_id: moduleId }]
        });
        recordActivation(activation, 'demo');
        sendJson(res, 200, { activation, demo: true });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });
    return;
  }

  if (method === 'POST' && url === '/api/briefs') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { module, moduleName, outputs, context, goals, sources } = JSON.parse(body || '{}');
        if (!module) {
          sendJson(res, 400, { error: 'Missing module' });
          return;
        }
        const resolved = findModule(module);
        const brief = {
          id: `BRF-${Date.now().toString(36).toUpperCase()}`,
          module,
          moduleName: moduleName || resolved?.name || module,
          outputs: Array.isArray(outputs) ? outputs : [],
          context: context || '',
          goals: goals || '',
          sources: Array.isArray(sources) ? sources : [],
          createdAt: new Date().toISOString()
        };
        recordBrief(brief);
        sendJson(res, 200, { brief });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });
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
      let payload = captureData;
      if (response.ok) {
        const activation = buildActivationPayload(orderId, captureData);
        recordActivation(activation, 'paypal');
        payload = {
          ...captureData,
          activation
        };
      }
      sendJson(res, response.status, payload);
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
