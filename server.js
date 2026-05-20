'use strict';

const express      = require('express');
const fs           = require('fs');
const path         = require('path');
const crypto       = require('crypto');
const cookieParser = require('cookie-parser');

// ============================================================
//  CONFIG — غير هنا فقط
// ============================================================
const CONFIG = {
  port: process.env.PORT || 3000,
  admin: {
    username: 'admin',
    password: 'lux2025',
    sessionSecret: 'lunette-secret-2025',
  },
  product: {
    title: 'نظارات كارتييه Rimless',
    subtitle: 'ضد الأشعة الزرقاء • UV400 • 4 مواسم 🔥',
    basePrice: 1900,
    currency: 'DA',
    colors: ['Transparent', 'Platine', 'Gold'],
    images: {
      'Transparent': 'https://i.imgur.com/YOUR_TRANSPARENT.jpg',
      'Platine':     'https://i.imgur.com/YOUR_PLATINE.jpg',
      'Gold':        'https://i.imgur.com/YOUR_GOLD.jpg',
    }
  },
  bundles: [
    { qty: 1, price: 1900,  saving: 0,   label: '1 قطعة', badge: null },
    { qty: 2, price: 3800,  saving: 0,   label: '2 قطع',  badge: null },
    { qty: 3, price: 5250,  saving: 450, label: '3 قطع',  badge: '🔥 وفر 450 DA' },
  ],
  shippingFees: {
    'أدرار': 800, 'الشلف': 400, 'الأغواط': 600, 'أم البواقي': 500,
    'باتنة': 500, 'بجاية': 450, 'بسكرة': 550, 'بشار': 700,
    'البليدة': 350, 'البويرة': 400, 'تمنراست': 900, 'تبسة': 550,
    'تلمسان': 500, 'تيارت': 500, 'تيزي وزو': 400, 'الجزائر': 300,
    'الجلفة': 550, 'جيجل': 450, 'سطيف': 450, 'سعيدة': 550,
    'سكيكدة': 450, 'سيدي بلعباس': 500, 'عنابة': 400, 'قالمة': 450,
    'قسنطينة': 400, 'المدية': 400, 'مستغانم': 450, 'المسيلة': 500,
    'معسكر': 500, 'ورقلة': 650, 'وهران': 400, 'البيض': 650,
    'إليزي': 950, 'برج بوعريريج': 450, 'بومرداس': 350,
    'الطارف': 450, 'تندوف': 950, 'تيسمسيلت': 550, 'الوادي': 600,
    'خنشلة': 500, 'سوق أهراس': 500, 'تيبازة': 350, 'ميلة': 450,
    'عين الدفلى': 450, 'النعامة': 650, 'عين تموشنت': 500,
    'غرداية': 650, 'غليزان': 500,
  },
};
// ============================================================

const app = express();
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ── Sessions ──────────────────────────────────────────────────
const sessions = new Map();

function createSession() {
  const token   = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  sessions.set(token, { expires });
  return token;
}

function validSession(token) {
  if (!token || !sessions.has(token)) return false;
  const s = sessions.get(token);
  if (Date.now() > s.expires) { sessions.delete(token); return false; }
  return true;
}

function requireAdmin(req, res, next) {
  if (validSession(req.cookies['admin_token'])) return next();
  res.redirect('/admin/login');
}

// ── Helpers ───────────────────────────────────────────────────
function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch { return []; }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// ── API ───────────────────────────────────────────────────────
app.get('/api/config', (req, res) => res.json(CONFIG));

app.post('/api/orders', (req, res) => {
  const { firstName, phone, wilaya, commune, color, qty, totalPrice, shippingFee } = req.body;
  if (!firstName || !phone || !wilaya || !commune) {
    return res.status(400).json({ error: 'بيانات ناقصة' });
  }
  const orders = readOrders();
  const order = {
    id: 'CMD-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toISOString(),
    status: 'En attente',
    firstName, phone, wilaya, commune,
    color, qty, totalPrice, shippingFee,
    product: CONFIG.product.title,
  };
  orders.unshift(order);
  saveOrders(orders);
  console.log(`✅ طلب جديد: ${firstName} - ${wilaya} - ${totalPrice} DA`);
  res.json({ success: true, orderId: order.id });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => res.json(readOrders()));

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const orders = readOrders();
  const order  = orders.find(o => o.id === req.params.id);
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

// ── ADMIN UI ──────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (validSession(req.cookies['admin_token'])) return res.redirect('/admin');
  res.send(`<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh}
.box{background:#1a1a1a;border:1px solid #c9a227;border-radius:12px;padding:32px;width:320px}
h2{color:#c9a227;text-align:center;margin-bottom:24px;font-size:20px}
input{width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:6px;margin-bottom:12px;font-size:15px}
button{width:100%;background:#c9a227;color:#000;border:none;padding:12px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:15px}
.err{color:#ff4444;text-align:center;margin-top:10px;font-size:13px}
</style></head><body>
<div class="box">
  <h2>🔐 دخول الأدمين</h2>
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
    const token = createSession();
    res.cookie('admin_token', token, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?err=1');
});

app.get('/admin/logout', (req, res) => {
  sessions.delete(req.cookies['admin_token']);
  res.clearCookie('admin_token');
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
  const orders = readOrders();
  const statusColors = {
    'En attente': '#f0c040', 'Confirmé': '#00cc66',
    'Expédié': '#4488ff', 'Annulé': '#ff4444'
  };
  const stats = {
    total:     orders.length,
    confirmed: orders.filter(o => o.status === 'Confirmé').length,
    shipped:   orders.filter(o => o.status === 'Expédié').length,
    revenue:   orders.filter(o => o.status !== 'Annulé').reduce((s, o) => s + (Number(o.totalPrice) || 0), 0)
  };

  const rows = orders.map(o => `
    <tr id="row-${o.id}">
      <td>${new Date(o.createdAt).toLocaleDateString('ar-DZ')}</td>
      <td><strong>${o.firstName}</strong><br><small>${o.phone}</small></td>
      <td>${o.wilaya}<br><small>${o.commune||''}</small></td>
      <td>${o.color||'-'} × ${o.qty||1}</td>
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
.logout{background:#333;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;text-decoration:none;font-size:13px}
table{width:100%;border-collapse:collapse;background:#1a1a1a;border-radius:10px;overflow:hidden;font-size:13px}
th{background:#2d2500;color:#c9a227;padding:10px;text-align:right;font-size:12px}
td{padding:10px;border-bottom:1px solid #222;vertical-align:top}
tr:last-child td{border-bottom:none}
tr:hover td{background:#1f1f1f}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
  <h1>📊 لوحة التحكم — ${CONFIG.product.title}</h1>
  <a href="/admin/logout" class="logout">خروج 🚪</a>
</div>
<div class="stats">
  <div class="stat"><div class="stat-num">${stats.total}</div><div class="stat-label">إجمالي الطلبات</div></div>
  <div class="stat"><div class="stat-num">${stats.confirmed}</div><div class="stat-label">مؤكدة</div></div>
  <div class="stat"><div class="stat-num">${stats.shipped}</div><div class="stat-label">مشحونة</div></div>
  <div class="stat"><div class="stat-num">${stats.revenue.toLocaleString()} DA</div><div class="stat-label">الإيرادات</div></div>
</div>
${orders.length === 0
  ? '<p style="text-align:center;color:#666;padding:40px">لا توجد طلبات بعد</p>'
  : `<div style="overflow-x:auto"><table>
      <thead><tr><th>التاريخ</th><th>العميل</th><th>الولاية</th><th>اللون × الكمية</th><th>المبلغ</th><th>الحالة</th><th>حذف</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`}
<script>
function updateStatus(id, status) {
  fetch('/api/admin/orders/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})})
    .then(()=>location.reload());
}
function deleteOrder(id) {
  if(!confirm('حذف هذا الطلب؟')) return;
  fetch('/api/admin/orders/'+id,{method:'DELETE'}).then(()=>document.getElementById('row-'+id).remove());
}
</script>
</body></html>`);
});

// ── Start ─────────────────────────────────────────────────────
app.listen(CONFIG.port, () => {
  console.log(`\n✅ الموقع شغال على http://localhost:${CONFIG.port}`);
  console.log(`📊 Admin: http://localhost:${CONFIG.port}/admin\n`);
});
