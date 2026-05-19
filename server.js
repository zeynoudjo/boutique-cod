const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

// ============================================================
//  CONFIG — غير هنا فقط
// ============================================================
const CONFIG = {
  port: 3000,
  admin: {
    username: 'admin',
    password: 'lux2025',        // ← غيّر هذا!
    sessionSecret: 'lunette-secret-2025',
  },
  product: {
    title: 'نظارات Premium Rimless',
    subtitle: 'Anti Blue Light • UV400 • 4 مواسم 🔥',
    basePrice: 1900,
    currency: 'DA',
    colors: ['Transparent', 'Platine', 'Gold'],
  },
  bundles: [
    { qty: 1, price: 1900,  saving: 0,   label: '1 قطعة',  badge: null },
    { qty: 2, price: 3800,  saving: 0,   label: '2 قطع',   badge: null },
    { qty: 3, price: 5250,  saving: 450, label: '3 قطع',   badge: '🔥 وفر 450 DA' },
  ],
};
// ============================================================

const app = express();
const ORDERS_FILE = path.join(__dirname, 'orders.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: CONFIG.admin.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ── Helpers ──────────────────────────────────────────────────
function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch { return []; }
}
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

// ── API ──────────────────────────────────────────────────────
app.get('/api/config', (req, res) => res.json(CONFIG));

app.post('/api/orders', (req, res) => {
  const { firstName, phone, wilaya, commune, color, qty, productPrice, shippingFee, totalPrice } = req.body;
  if (!firstName || !phone || !wilaya || !commune) {
    return res.status(400).json({ error: 'بيانات ناقصة' });
  }
  const orders = readOrders();
  const order = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    status: 'En attente',
    firstName, phone, wilaya, commune,
    color, qty, productPrice, shippingFee, totalPrice
  };
  orders.unshift(order);
  saveOrders(orders);
  console.log(`✅ طلب جديد: ${firstName} - ${wilaya} - ${totalPrice} DA`);
  res.json({ success: true, orderId: order.id });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => res.json(readOrders()));

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const orders = readOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  order.status = req.body.status;
  saveOrders(orders);
  res.json(order);
});

app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  let orders = readOrders();
  orders = orders.filter(o => o.id !== req.params.id);
  saveOrders(orders);
  res.json({ success: true });
});

// ── ADMIN UI ─────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.send(`<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Login</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh}
.box{background:#1a1a1a;border:1px solid #c9a227;border-radius:12px;padding:32px;width:320px}
h2{color:#c9a227;text-align:center;margin-bottom:24px}
input{width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:6px;margin-bottom:12px;font-size:15px}
button{width:100%;background:#c9a227;color:#000;border:none;padding:12px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:15px}
.err{color:#ff4444;text-align:center;margin-top:10px;font-size:13px}
</style></head><body>
<div class="box"><h2>🔐 دخول الأدمين</h2>
<form method="POST" action="/admin/login">
<input name="username" placeholder="اسم المستخدم" required>
<input name="password" type="password" placeholder="كلمة المرور" required>
<button>دخول</button>
</form>
${req.query.err ? '<p class="err">❌ بيانات خاطئة</p>' : ''}
</div></body></html>`);
});

app.post('/admin/login', (req, res) => {
  if (req.body.username === CONFIG.admin.username && req.body.password === CONFIG.admin.password) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?err=1');
});

app.get('/admin/logout', (req, res) => { req.session.destroy(); res.redirect('/admin/login'); });

app.get('/admin', requireAdmin, (req, res) => {
  const orders = readOrders();
  const statusColors = {
    'En attente': '#f0c040', 'Confirmé': '#00cc66',
    'Expédié': '#4488ff', 'Annulé': '#ff4444'
  };
  const stats = {
    total: orders.length,
    confirmed: orders.filter(o => o.status === 'Confirmé').length,
    shipped: orders.filter(o => o.status === 'Expédié').length,
    revenue: orders.filter(o => o.status !== 'Annulé').reduce((s, o) => s + (Number(o.totalPrice) || 0), 0)
  };

  const rows = orders.map(o => `
    <tr id="row-${o.id}">
      <td>${new Date(o.createdAt).toLocaleDateString('ar-DZ')}</td>
      <td><strong>${o.firstName}</strong><br><small>${o.phone}</small></td>
      <td>${o.wilaya}<br><small>${o.commune||''}</small></td>
      <td>${o.color||'-'}</td>
      <td style="text-align:center">${o.qty||1}</td>
      <td><strong>${Number(o.totalPrice).toLocaleString()} DA</strong><br><small>توصيل: ${o.shippingFee||0} DA</small></td>
      <td>
        <select onchange="updateStatus('${o.id}',this.value)" style="background:#1a1a1a;color:${statusColors[o.status]||'#fff'};border:1px solid #333;padding:4px 8px;border-radius:6px;cursor:pointer">
          ${['En attente','Confirmé','Expédié','Annulé'].map(s => 
            `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><button onclick="deleteOrder('${o.id}')" style="background:#ff4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer">حذف</button></td>
    </tr>`).join('');

  res.send(`<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>لوحة التحكم</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;padding:20px}
h1{color:#c9a227;margin-bottom:20px;font-size:22px}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}
.stat{background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:14px 20px;flex:1;min-width:120px;text-align:center}
.stat-num{font-size:24px;font-weight:bold;color:#c9a227}
.stat-label{font-size:12px;color:#999;margin-top:4px}
.logout{float:left;background:#333;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;text-decoration:none;font-size:13px}
table{width:100%;border-collapse:collapse;background:#1a1a1a;border-radius:10px;overflow:hidden;font-size:13px}
th{background:#2d2500;color:#c9a227;padding:10px;text-align:right;font-size:12px}
td{padding:10px;border-bottom:1px solid #222;vertical-align:top}
tr:last-child td{border-bottom:none}
tr:hover td{background:#1f1f1f}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
  <h1>📊 لوحة التحكم</h1>
  <a href="/admin/logout" class="logout">خروج 🚪</a>
</div>
<div class="stats">
  <div class="stat"><div class="stat-num">${stats.total}</div><div class="stat-label">إجمالي الطلبات</div></div>
  <div class="stat"><div class="stat-num">${stats.confirmed}</div><div class="stat-label">مؤكدة</div></div>
  <div class="stat"><div class="stat-num">${stats.shipped}</div><div class="stat-label">مشحونة</div></div>
  <div class="stat"><div class="stat-num">${stats.revenue.toLocaleString()} DA</div><div class="stat-label">الإيرادات</div></div>
</div>
${orders.length === 0 ? '<p style="text-align:center;color:#666;padding:40px">لا توجد طلبات بعد</p>' : 
`<div style="overflow-x:auto"><table>
<thead><tr><th>التاريخ</th><th>العميل</th><th>الولاية</th><th>اللون</th><th>الكمية</th><th>المبلغ</th><th>الحالة</th><th>حذف</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>`}
<script>
function updateStatus(id, status) {
  fetch('/api/admin/orders/'+id, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})})
    .then(()=>location.reload());
}
function deleteOrder(id) {
  if(!confirm('حذف هذا الطلب؟')) return;
  fetch('/api/admin/orders/'+id, {method:'DELETE'}).then(()=>document.getElementById('row-'+id).remove());
}
</script>
</body></html>`);
});

// Start
app.listen(CONFIG.port, () => {
  console.log(`\n🚀 الموقع يعمل على http://localhost:${CONFIG.port}`);
  console.log(`📊 لوحة التحكم: http://localhost:${CONFIG.port}/admin`);
  console.log(`👤 المستخدم: ${CONFIG.admin.username} | كلمة المرور: ${CONFIG.admin.password}\n`);
});
