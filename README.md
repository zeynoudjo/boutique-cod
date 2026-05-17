# 🛒 COD E-Commerce — Algérie

A complete, lightweight Cash on Delivery e-commerce landing page
tailored for the Algerian market, with a secure admin dashboard.

---

## 📁 Project Structure

```
ecom-cod/
├── server.js          ← Express backend (API + Admin Dashboard + Config)
├── package.json
├── orders.json        ← Auto-created on first order (JSON database)
└── public/
    ├── index.html     ← Shopify-style landing page
    ├── style.css      ← Mobile-first premium styles
    └── app.js         ← Frontend logic (pricing, variants, form, API)
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

### 3. Open in browser
- **Store Front** → http://localhost:3000
- **Admin Panel** → http://localhost:3000/admin
  - Username: `admin`
  - Password: `admin123`

---

## ⚙️ Configuration

All configuration lives at the **top of `server.js`** in the `CONFIG` object:

```js
const CONFIG = {
  port: 3000,
  admin: {
    username: 'admin',
    password: 'your_password_here',   // ← Change this!
    sessionSecret: 'your_secret_key', // ← Change this!
  },
  product: {
    title: 'Montre Élégante Pro',
    subtitle: 'Édition Limitée · Algérie',
    imageUrl: 'https://...your-image-url...',
    basePrice: 2900,     // Price for 1 piece in DZD
    currency: 'DZD',
    colors: ['Rouge', 'Noir', 'Argent'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  bundles: [
    { qty: 1, discountPct: 0,  label: '1 Pièce',  badge: null },
    { qty: 2, discountPct: 10, label: '2 Pièces', badge: 'Économisez 10%' },
    { qty: 3, discountPct: 20, label: '3 Pièces', badge: 'Économisez 20%' },
  ],
  shippingFees: {
    'Alger': 300,
    'Oran': 400,
    // ... all 58 wilayas included by default
  },
};
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/config` | None | Product config for frontend |
| POST | `/api/orders` | None | Submit a new order |
| GET | `/api/admin/orders` | Session | List all orders (JSON) |
| PATCH | `/api/admin/orders/:id` | Session | Update order status |
| DELETE | `/api/admin/orders/:id` | Session | Delete an order |
| GET | `/admin` | Session | Admin dashboard UI |
| GET | `/admin/login` | None | Login page |
| POST | `/admin/login` | None | Authenticate |
| GET | `/admin/logout` | Session | Log out |

### POST /api/orders — Body
```json
{
  "firstName": "Amine",
  "phone": "0661234567",
  "wilaya": "Alger",
  "commune": "Bab Ezzouar",
  "color": "Noir",
  "size": "M",
  "bundleIndex": 1,
  "totalPrice": 5520
}
```

---

## 🔐 Security Notes for Production

1. Change `admin.password` and `admin.sessionSecret` in `CONFIG`
2. Use HTTPS (e.g. via nginx + Certbot)
3. Consider rate-limiting `/api/orders` to prevent spam
4. Migrate from JSON to SQLite or PostgreSQL for scale

---

## 📦 Order Statuses

| Status | Meaning |
|--------|---------|
| `En attente` | New order, not yet reviewed |
| `Confirmé` | Customer reached, order confirmed |
| `Expédié` | Package sent out for delivery |
| `Annulé` | Order cancelled |
