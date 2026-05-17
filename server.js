/**
 * ============================================================
 *  COD E-Commerce Backend — server.js
 *  Stack: Node.js + Express + JSON file "database"
 *  Author: Generated for Algerian COD market
 * ============================================================
 */

'use strict';

// ─────────────────────────────────────────────────────────────
//  EASY CONFIGURATION — Edit everything here
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  // ── Server ────────────────────────────────────────────────
  port: process.env.PORT || 3000,

  // ── Admin Credentials ─────────────────────────────────────
  admin: {
    username: 'admin',
    password: 'admin123', // Change before going live!
    sessionSecret: 'change_this_secret_key_in_production',
  },

  // ── Product ───────────────────────────────────────────────
  product: {
    title: 'Montre Élégante Pro',
    subtitle: 'Édition Limitée · Algérie',
    imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=90',
    basePrice: 2900, // DZD — price for 1 piece
    currency: 'DZD',
    colors: ['Rouge', 'Noir', 'Argent', 'Or Rose'],
    sizes: ['S', 'M', 'L', 'XL'],
  },

  // ── Bundle Discounts ──────────────────────────────────────
  bundles: [
    { qty: 1, discountPct: 0,  label: '1 Pièce',  badge: null },
    { qty: 2, discountPct: 10, label: '2 Pièces', badge: 'Économisez 10%' },
    { qty: 3, discountPct: 20, label: '3 Pièces', badge: 'Économisez 20%' },
  ],

  // ── Shipping Fees per Wilaya (DZD) ────────────────────────
  // Format: 'Wilaya Name': fee
  shippingFees: {
    'Adrar': 800, 'Chlef': 400, 'Laghouat': 600, 'Oum El Bouaghi': 500,
    'Batna': 500, 'Béjaïa': 450, 'Biskra': 550, 'Béchar': 700,
    'Blida': 350, 'Bouira': 400, 'Tamanrasset': 900, 'Tébessa': 550,
    'Tlemcen': 500, 'Tiaret': 500, 'Tizi Ouzou': 400, 'Alger': 300,
    'Djelfa': 550, 'Jijel': 450, 'Sétif': 450, 'Saïda': 550,
    'Skikda': 450, 'Sidi Bel Abbès': 500, 'Annaba': 400, 'Guelma': 450,
    'Constantine': 400, 'Médéa': 400, 'Mostaganem': 450, 'M\'Sila': 500,
    'Mascara': 500, 'Ouargla': 650, 'Oran': 400, 'El Bayadh': 650,
    'Illizi': 950, 'Bordj Bou Arréridj': 450, 'Boumerdès': 350,
    'El Tarf': 450, 'Tindouf': 950, 'Tissemsilt': 550, 'El Oued': 600,
    'Khenchela': 500, 'Souk Ahras': 500, 'Tipaza': 350, 'Mila': 450,
    'Aïn Defla': 450, 'Naâma': 650, 'Aïn Témouchent': 500,
    'Ghardaïa': 650, 'Relizane': 500, 'Timimoun': 800,
    'Bordj Badji Mokhtar': 950, 'Ouled Djellal': 650,
    'Beni Abbès': 800, 'In Salah': 900, 'In Guezzam': 950,
    'Touggourt': 650, 'Djanet': 950, 'El M\'Ghair': 650, 'El Meniaa': 750,
  },
};

// ─────────────────────────────────────────────────────────────
//  Dependencies
// ─────────────────────────────────────────────────────────────
const express      = require('express');
const fs           = require('fs');
const path         = require('path');
const crypto       = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();

// ─────────────────────────────────────────────────────────────
//  Database (JSON file)
// ─────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'orders.json');

/** Load all orders from disk */
function loadOrders() {
  if (!fs.existsSync(DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

/** Persist orders to disk */
function saveOrders(orders) {
  fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2), 'utf8');
}

/** Generate a short human-readable order ID */
function generateOrderId() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() +
         crypto.randomBytes(2).toString('hex').toUpperCase();
}

// ─────────────────────────────────────────────────────────────
//  Session store (in-memory, simple)
// ─────────────────────────────────────────────────────────────
const sessions = new Map(); // token -> { loggedIn: true, expires: Date }

function createSession() {
  const token   = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
  sessions.set(token, { loggedIn: true, expires });
  return token;
}

function validateSession(token) {
  if (!token || !sessions.has(token)) return false;
  const s = sessions.get(token);
  if (Date.now() > s.expires) { sessions.delete(token); return false; }
  return s.loggedIn;
}

// ─────────────────────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/** Auth guard middleware for admin routes */
function requireAuth(req, res, next) {
  const token = req.cookies['admin_session'];
  if (validateSession(token)) return next();
  res.redirect('/admin/login');
}

// ─────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────

/** GET /api/config — Send product config to the frontend */
app.get('/api/config', (req, res) => {
  res.json({
    product:      CONFIG.product,
    bundles:      CONFIG.bundles,
    shippingFees: CONFIG.shippingFees,
  });
});

/** POST /api/orders — Create a new order */
app.post('/api/orders', (req, res) => {
  const { firstName, phone, wilaya, commune, color, size, bundleIndex, totalPrice } = req.body;

  // ── Validation ───────────────────────────────────────────
  const errors = [];
  if (!firstName || firstName.trim().length < 2) errors.push('Prénom invalide.');
  if (!phone    || !/^(05|06|07)\d{8}$/.test(phone.trim())) errors.push('Numéro de téléphone invalide (ex: 0661234567).');
  if (!wilaya   || !CONFIG.shippingFees[wilaya]) errors.push('Wilaya invalide.');
  if (!commune  || commune.trim().length < 2)    errors.push('Commune invalide.');
  if (bundleIndex === undefined || !CONFIG.bundles[bundleIndex]) errors.push('Offre invalide.');

  if (errors.length > 0) return res.status(400).json({ success: false, errors });

  // ── Build Order ──────────────────────────────────────────
  const bundle   = CONFIG.bundles[bundleIndex];
  const subtotal = CONFIG.product.basePrice * bundle.qty * (1 - bundle.discountPct / 100);
  const shipping = CONFIG.shippingFees[wilaya];
  const total    = subtotal + shipping;

  const order = {
    id:          generateOrderId(),
    createdAt:   new Date().toISOString(),
    status:      'En attente',
    customer: {
      firstName: firstName.trim(),
      phone:     phone.trim(),
      wilaya,
      commune:   commune.trim(),
    },
    product: {
      title:       CONFIG.product.title,
      color:       color  || 'N/A',
      size:        size   || 'N/A',
      bundle:      bundle.label,
      qty:         bundle.qty,
      discountPct: bundle.discountPct,
    },
    pricing: {
      subtotal,
      shipping,
      total,
      currency: CONFIG.product.currency,
    },
  };

  // ── Persist ──────────────────────────────────────────────
  const orders = loadOrders();
  orders.unshift(order); // newest first
  saveOrders(orders);

  console.log(`[ORDER] ${order.id} — ${order.customer.firstName} — ${order.pricing.total} DZD`);
  res.status(201).json({ success: true, orderId: order.id });
});

// ─────────────────────────────────────────────────────────────
//  ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

/** GET /admin/login — Login page */
app.get('/admin/login', (req, res) => {
  if (validateSession(req.cookies['admin_session'])) return res.redirect('/admin');
  res.send(renderLoginPage());
});

/** POST /admin/login — Authenticate */
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === CONFIG.admin.username && password === CONFIG.admin.password) {
    const token = createSession();
    res.cookie('admin_session', token, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
    return res.redirect('/admin');
  }
  res.send(renderLoginPage('Identifiants incorrects.'));
});

/** GET /admin/logout */
app.get('/admin/logout', (req, res) => {
  sessions.delete(req.cookies['admin_session']);
  res.clearCookie('admin_session');
  res.redirect('/admin/login');
});

/** GET /admin — Dashboard */
app.get('/admin', requireAuth, (req, res) => {
  const orders = loadOrders();
  res.send(renderDashboard(orders));
});

/** GET /api/admin/orders — JSON list (for fetch-based refresh) */
app.get('/api/admin/orders', requireAuth, (req, res) => {
  res.json(loadOrders());
});

/** PATCH /api/admin/orders/:id — Update status */
app.patch('/api/admin/orders/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['En attente', 'Confirmé', 'Expédié', 'Annulé'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Statut invalide.' });

  const orders = loadOrders();
  const idx    = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Commande introuvable.' });

  orders[idx].status = status;
  saveOrders(orders);
  res.json({ success: true, order: orders[idx] });
});

/** DELETE /api/admin/orders/:id — Delete order */
app.delete('/api/admin/orders/:id', requireAuth, (req, res) => {
  let orders = loadOrders();
  const before = orders.length;
  orders = orders.filter(o => o.id !== req.params.id);
  if (orders.length === before) return res.status(404).json({ error: 'Commande introuvable.' });
  saveOrders(orders);
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────
//  HTML RENDERERS (Server-Side)
// ─────────────────────────────────────────────────────────────

function renderLoginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin — Connexion</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f0f13;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; color: #e0e0e8;
    }
    .card {
      background: #1a1a24; border: 1px solid #2a2a3a;
      border-radius: 16px; padding: 48px 40px; width: 100%; max-width: 400px;
      box-shadow: 0 24px 60px rgba(0,0,0,.5);
    }
    .logo { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .sub  { font-size: 13px; color: #666; margin-bottom: 32px; }
    label { display: block; font-size: 12px; font-weight: 600; color: #888;
            text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
    input {
      width: 100%; padding: 12px 16px; background: #0f0f13;
      border: 1px solid #2a2a3a; border-radius: 8px; color: #e0e0e8;
      font-size: 15px; margin-bottom: 20px; outline: none; transition: border-color .2s;
    }
    input:focus { border-color: #f97316; }
    button {
      width: 100%; padding: 14px; background: #f97316; color: #fff;
      border: none; border-radius: 8px; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: background .2s;
    }
    button:hover { background: #ea6c0c; }
    .error {
      background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3);
      color: #f87171; padding: 10px 14px; border-radius: 8px;
      font-size: 13px; margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🛒 Admin Panel</div>
    <div class="sub">Tableau de bord des commandes</div>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/admin/login">
      <label>Nom d'utilisateur</label>
      <input type="text" name="username" autocomplete="username" required>
      <label>Mot de passe</label>
      <input type="password" name="password" autocomplete="current-password" required>
      <button type="submit">Se connecter</button>
    </form>
  </div>
</body>
</html>`;
}

function statusBadge(status) {
  const map = {
    'En attente': '#f59e0b',
    'Confirmé':   '#22c55e',
    'Expédié':    '#3b82f6',
    'Annulé':     '#ef4444',
  };
  const color = map[status] || '#888';
  return `<span style="background:${color}22;color:${color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;">${status}</span>`;
}

function renderDashboard(orders) {
  const totalRevenue = orders
    .filter(o => o.status !== 'Annulé')
    .reduce((s, o) => s + o.pricing.total, 0)
    .toLocaleString('fr-DZ');

  const pending   = orders.filter(o => o.status === 'En attente').length;
  const confirmed = orders.filter(o => o.status === 'Confirmé').length;
  const shipped   = orders.filter(o => o.status === 'Expédié').length;

  const rows = orders.map(o => `
    <tr id="row-${o.id}">
      <td><span style="font-family:monospace;font-size:12px;color:#888">${o.id}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString('fr-DZ', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
      <td>${o.customer.firstName}</td>
      <td style="font-family:monospace">${o.customer.phone}</td>
      <td>${o.customer.wilaya}</td>
      <td>${o.customer.commune}</td>
      <td>${o.product.bundle} · ${o.product.color} · ${o.product.size}</td>
      <td style="font-weight:700;white-space:nowrap">${o.pricing.total.toLocaleString('fr-DZ')} DZD</td>
      <td>${statusBadge(o.status)}</td>
      <td>
        <select onchange="updateStatus('${o.id}', this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid #2a2a3a;background:#0f0f13;color:#e0e0e8;font-size:12px;cursor:pointer">
          ${['En attente','Confirmé','Expédié','Annulé'].map(s =>
            `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <button onclick="deleteOrder('${o.id}')" style="background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">
          Supprimer
        </button>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin Dashboard — Commandes</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f0f13; color: #e0e0e8; min-height: 100vh;
    }
    .topbar {
      background: #1a1a24; border-bottom: 1px solid #2a2a3a;
      padding: 16px 32px; display: flex; align-items: center;
      justify-content: space-between; position: sticky; top: 0; z-index: 10;
    }
    .topbar-logo { font-size: 18px; font-weight: 700; color: #fff; }
    .topbar-logo span { color: #f97316; }
    .topbar-actions { display: flex; gap: 12px; align-items: center; }
    .btn-refresh {
      padding: 8px 16px; background: #1f2937; border: 1px solid #374151;
      border-radius: 8px; color: #e0e0e8; font-size: 13px; cursor: pointer;
    }
    .btn-logout {
      padding: 8px 16px; background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3);
      border-radius: 8px; color: #f87171; font-size: 13px; cursor: pointer; text-decoration: none;
    }
    .content { padding: 32px; }
    .stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px; margin-bottom: 32px;
    }
    .stat-card {
      background: #1a1a24; border: 1px solid #2a2a3a; border-radius: 12px; padding: 20px;
    }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase;
                  letter-spacing: .06em; margin-bottom: 8px; }
    .stat-value { font-size: 28px; font-weight: 800; color: #fff; }
    .stat-value.orange { color: #f97316; }
    .section-title {
      font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 20px;
      display: flex; align-items: center; gap: 12px;
    }
    .badge-count {
      background: #f97316; color: #fff; font-size: 12px; font-weight: 700;
      padding: 2px 8px; border-radius: 20px;
    }
    .table-wrap {
      background: #1a1a24; border: 1px solid #2a2a3a; border-radius: 12px; overflow: auto;
    }
    table { width: 100%; border-collapse: collapse; min-width: 900px; }
    thead th {
      text-align: left; padding: 14px 16px; font-size: 11px; font-weight: 700;
      color: #666; text-transform: uppercase; letter-spacing: .06em;
      border-bottom: 1px solid #2a2a3a; background: #151520;
    }
    tbody tr { border-bottom: 1px solid #1e1e2e; transition: background .15s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(249,115,22,.04); }
    tbody td { padding: 14px 16px; font-size: 13px; vertical-align: middle; }
    .empty { text-align: center; padding: 60px; color: #444; font-size: 16px; }
    .toast {
      position: fixed; bottom: 24px; right: 24px;
      padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
      opacity: 0; transform: translateY(12px); transition: all .3s; pointer-events: none;
      z-index: 100;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.success { background: #22c55e; color: #fff; }
    .toast.error   { background: #ef4444; color: #fff; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-logo">🛒 Admin <span>Dashboard</span></div>
    <div class="topbar-actions">
      <button class="btn-refresh" onclick="location.reload()">⟳ Actualiser</button>
      <a href="/admin/logout" class="btn-logout">Déconnexion</a>
    </div>
  </div>

  <div class="content">
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Commandes</div>
        <div class="stat-value">${orders.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Chiffre d'Affaires</div>
        <div class="stat-value orange">${totalRevenue} <small style="font-size:14px">DZD</small></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">En Attente</div>
        <div class="stat-value" style="color:#f59e0b">${pending}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Confirmées</div>
        <div class="stat-value" style="color:#22c55e">${confirmed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Expédiées</div>
        <div class="stat-value" style="color:#3b82f6">${shipped}</div>
      </div>
    </div>

    <div class="section-title">
      Commandes <span class="badge-count">${orders.length}</span>
    </div>

    <div class="table-wrap">
      ${orders.length === 0 ? '<div class="empty">Aucune commande reçue pour le moment.</div>' : `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Date</th><th>Client</th><th>Téléphone</th>
            <th>Wilaya</th><th>Commune</th><th>Produit</th>
            <th>Total</th><th>Statut</th><th>Changer Statut</th><th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    function showToast(msg, type = 'success') {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast ' + type + ' show';
      setTimeout(() => t.className = 'toast', 3000);
    }

    async function updateStatus(id, status) {
      try {
        const r = await fetch('/api/admin/orders/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const d = await r.json();
        if (d.success) showToast('Statut mis à jour ✓');
        else showToast(d.error || 'Erreur', 'error');
      } catch { showToast('Erreur réseau', 'error'); }
    }

    async function deleteOrder(id) {
      if (!confirm('Supprimer cette commande définitivement ?')) return;
      try {
        const r = await fetch('/api/admin/orders/' + id, { method: 'DELETE' });
        const d = await r.json();
        if (d.success) {
          const row = document.getElementById('row-' + id);
          row && row.remove();
          showToast('Commande supprimée');
        } else showToast(d.error || 'Erreur', 'error');
      } catch { showToast('Erreur réseau', 'error'); }
    }
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────────────────────
app.listen(CONFIG.port, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🛒  COD E-Commerce Server Started     ║
║  Frontend → http://localhost:${CONFIG.port}       ║
║  Admin    → http://localhost:${CONFIG.port}/admin ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app; // for testing
