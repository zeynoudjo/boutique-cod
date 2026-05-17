/**
 * ============================================================
 *  COD E-Commerce — app.js
 *  Frontend logic: config hydration, pricing, variants, submit
 * ============================================================
 */

'use strict';

/* ── State ──────────────────────────────────────────────────── */
const STATE = {
  config:        null,   // Loaded from /api/config
  selectedBundle: 0,     // Index into config.bundles
  selectedColor:  null,
  selectedSize:   null,
};

/* ── DOM References ──────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const EL = {
  headerBrand:      $('header-brand'),
  footerBrand:      $('footer-brand'),
  heroImage:        $('product-image'),
  heroBadge:        $('hero-badge'),
  productTitle:     $('product-title'),
  productSubtitle:  $('product-subtitle'),
  displayPrice:     $('display-price'),
  bundleGrid:       $('bundle-grid'),
  colorButtons:     $('color-buttons'),
  sizeButtons:      $('size-buttons'),
  selectedColor:    $('selected-color'),
  selectedSize:     $('selected-size'),
  wilayaSelect:     $('wilaya'),
  commune:          $('commune'),
  firstName:        $('firstName'),
  phone:            $('phone'),
  summaryQty:       $('summary-qty'),
  summarySubtotal:  $('summary-subtotal'),
  summaryDiscount:  $('summary-discount'),
  discountLine:     $('discount-line'),
  summaryShipping:  $('summary-shipping'),
  summaryWilaya:    $('summary-wilaya-name'),
  summaryTotal:     $('summary-total'),
  checkoutForm:     $('checkout-form'),
  ctaBtn:           $('cta-btn'),
  successModal:     $('success-modal'),
  modalClose:       $('modal-close-btn'),
  modalCustomer:    $('modal-customer-name'),
  modalOrderId:     $('modal-order-id'),
};

/* ── Formatters ──────────────────────────────────────────────── */
const fmt = n => n.toLocaleString('fr-DZ') + ' DZD';

/* ── 1. Fetch config from backend ────────────────────────────── */
async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error('Config fetch failed');
    STATE.config = await r.json();
    hydratePage();
  } catch (err) {
    console.error('Failed to load config:', err);
    document.body.innerHTML = `<div style="padding:40px;text-align:center;color:#f00">
      Impossible de charger la page. Vérifiez que le serveur est démarré.
    </div>`;
  }
}

/* ── 2. Hydrate the page with config data ────────────────────── */
function hydratePage() {
  const { product, bundles, shippingFees } = STATE.config;

  // Brand / Title
  EL.headerBrand.textContent = product.title;
  EL.footerBrand.textContent = product.title;
  EL.productTitle.textContent = product.title;
  EL.productSubtitle.textContent = product.subtitle;
  document.title = product.title + ' — Livraison Algérie';

  // Hero image
  EL.heroImage.src = product.imageUrl;
  EL.heroImage.alt = product.title;

  // Initial price display
  EL.displayPrice.textContent = fmt(product.basePrice);

  // ── Bundle cards ─────────────────────────────────────────
  EL.bundleGrid.innerHTML = '';

  bundles.forEach((bundle, idx) => {
    const unitPrice  = product.basePrice * (1 - bundle.discountPct / 100);
    const totalPrice = unitPrice * bundle.qty;
    const isMostPopular = idx === 1; // 2-piece is "most popular"

    const card = document.createElement('div');
    card.className = 'bundle-card' + (idx === 0 ? ' active' : '');
    card.dataset.idx = idx;
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', idx === 0 ? 'true' : 'false');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      ${isMostPopular ? '<div class="bundle-most-popular">⭐ Plus populaire</div>' : ''}
      <div class="bundle-radio">
        <div class="bundle-radio-dot"></div>
      </div>
      <div class="bundle-info">
        <span class="bundle-qty">${bundle.label}</span>
        <span class="bundle-price">${fmt(totalPrice)}${bundle.qty > 1 ? ` (${fmt(unitPrice)}/pièce)` : ''}</span>
      </div>
      ${bundle.badge ? `<span class="bundle-badge">${bundle.badge}</span>` : ''}
    `;

    card.addEventListener('click', () => selectBundle(idx));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectBundle(idx); }
    });

    EL.bundleGrid.appendChild(card);
  });

  // ── Color buttons ─────────────────────────────────────────
  EL.colorButtons.innerHTML = '';
  product.colors.forEach((color, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'variant-btn' + (i === 0 ? ' active' : '');
    btn.textContent = color;
    btn.addEventListener('click', () => selectColor(color));
    EL.colorButtons.appendChild(btn);
  });
  selectColor(product.colors[0]);

  // ── Size buttons ──────────────────────────────────────────
  EL.sizeButtons.innerHTML = '';
  product.sizes.forEach((size, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'variant-btn' + (i === 0 ? ' active' : '');
    btn.textContent = size;
    btn.addEventListener('click', () => selectSize(size));
    EL.sizeButtons.appendChild(btn);
  });
  selectSize(product.sizes[0]);

  // ── Wilaya select ─────────────────────────────────────────
  EL.wilayaSelect.innerHTML = '<option value="">Sélectionnez votre wilaya</option>';
  Object.keys(shippingFees).sort().forEach(w => {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = `${w} — ${fmt(shippingFees[w])}`;
    EL.wilayaSelect.appendChild(opt);
  });

  // ── Init summary ──────────────────────────────────────────
  selectBundle(0);
  updateSummary();
}

/* ── 3. Bundle Selection ─────────────────────────────────────── */
function selectBundle(idx) {
  STATE.selectedBundle = idx;

  // Update card UI
  document.querySelectorAll('.bundle-card').forEach((card, i) => {
    const isActive = i === idx;
    card.classList.toggle('active', isActive);
    card.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  updateSummary();
}

/* ── 4. Variant Selectors ─────────────────────────────────────── */
function selectColor(color) {
  STATE.selectedColor = color;
  EL.selectedColor.textContent = color;

  document.querySelectorAll('#color-buttons .variant-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === color);
  });
}

function selectSize(size) {
  STATE.selectedSize = size;
  EL.selectedSize.textContent = size;

  document.querySelectorAll('#size-buttons .variant-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === size);
  });
}

/* ── 5. Dynamic Order Summary ─────────────────────────────────── */
function updateSummary() {
  if (!STATE.config) return;

  const { product, bundles, shippingFees } = STATE.config;
  const bundle      = bundles[STATE.selectedBundle];
  const unitPrice   = product.basePrice * (1 - bundle.discountPct / 100);
  const subtotal    = unitPrice * bundle.qty;
  const wilaya      = EL.wilayaSelect.value;
  const shipping    = wilaya ? (shippingFees[wilaya] || 0) : null;
  const discount    = product.basePrice * bundle.qty - subtotal; // amount saved
  const total       = shipping !== null ? subtotal + shipping : null;

  // Hero price update
  EL.displayPrice.textContent = fmt(subtotal);

  // Summary lines
  EL.summaryQty.textContent = `×${bundle.qty}`;
  EL.summarySubtotal.textContent = fmt(subtotal);

  // Discount line
  if (bundle.discountPct > 0) {
    EL.discountLine.style.display = 'flex';
    EL.summaryDiscount.textContent = '−' + fmt(discount);
  } else {
    EL.discountLine.style.display = 'none';
  }

  // Shipping line
  if (shipping !== null) {
    EL.summaryShipping.textContent = fmt(shipping);
    EL.summaryWilaya.textContent   = `(${wilaya})`;
  } else {
    EL.summaryShipping.textContent = 'Sélectionnez une wilaya';
    EL.summaryWilaya.textContent   = '';
  }

  // Total
  EL.summaryTotal.textContent = total !== null ? fmt(total) : '—';

  // Badge image
  if (bundle.discountPct > 0) {
    EL.heroBadge.textContent = `−${bundle.discountPct}%`;
    EL.heroBadge.style.background = '#16a34a';
  } else {
    EL.heroBadge.textContent = 'Nouveau';
    EL.heroBadge.style.background = '';
  }
}

// Re-calculate whenever wilaya changes
EL.wilayaSelect.addEventListener('change', updateSummary);

/* ── 6. Form Validation ──────────────────────────────────────── */
function clearErrors() {
  ['firstName', 'phone', 'wilaya', 'commune'].forEach(field => {
    const el = $(`err-${field}`);
    if (el) el.textContent = '';
    const input = $(field);
    if (input) input.classList.remove('is-error');
  });
}

function showError(fieldId, msg) {
  const errEl   = $(`err-${fieldId}`);
  const inputEl = $(fieldId);
  if (errEl)   errEl.textContent = msg;
  if (inputEl) inputEl.classList.add('is-error');
}

function validateForm() {
  clearErrors();
  let valid = true;

  const firstName = EL.firstName.value.trim();
  const phone     = EL.phone.value.trim();
  const wilaya    = EL.wilayaSelect.value;
  const commune   = EL.commune.value.trim();

  if (firstName.length < 2) {
    showError('firstName', 'Le prénom doit contenir au moins 2 caractères.');
    valid = false;
  }

  if (!/^(05|06|07)\d{8}$/.test(phone)) {
    showError('phone', 'Numéro invalide — ex: 0661234567');
    valid = false;
  }

  if (!wilaya) {
    showError('wilaya', 'Veuillez sélectionner votre wilaya.');
    valid = false;
  }

  if (commune.length < 2) {
    showError('commune', 'Commune invalide.');
    valid = false;
  }

  return valid;
}

/* ── 7. Form Submission ──────────────────────────────────────── */
EL.checkoutForm.addEventListener('submit', async e => {
  e.preventDefault();

  if (!validateForm()) {
    // Scroll to first error
    const firstErr = document.querySelector('.is-error');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Loading state
  setLoadingState(true);

  const payload = {
    firstName:   EL.firstName.value.trim(),
    phone:       EL.phone.value.trim(),
    wilaya:      EL.wilayaSelect.value,
    commune:     EL.commune.value.trim(),
    color:       STATE.selectedColor,
    size:        STATE.selectedSize,
    bundleIndex: STATE.selectedBundle,
    totalPrice:  computeTotal(),
  };

  try {
    const r = await fetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await r.json();

    if (r.ok && data.success) {
      showSuccessModal(payload.firstName, data.orderId);
      EL.checkoutForm.reset();
      updateSummary();
    } else {
      const msgs = data.errors ? data.errors.join('\n') : 'Une erreur est survenue. Réessayez.';
      alert('❌ ' + msgs);
    }
  } catch (err) {
    alert('❌ Erreur réseau. Vérifiez votre connexion et réessayez.');
    console.error(err);
  } finally {
    setLoadingState(false);
  }
});

function computeTotal() {
  if (!STATE.config) return 0;
  const { product, bundles, shippingFees } = STATE.config;
  const bundle    = bundles[STATE.selectedBundle];
  const subtotal  = product.basePrice * bundle.qty * (1 - bundle.discountPct / 100);
  const shipping  = shippingFees[EL.wilayaSelect.value] || 0;
  return subtotal + shipping;
}

function setLoadingState(loading) {
  const btn = EL.ctaBtn;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

/* ── 8. Success Modal ────────────────────────────────────────── */
function showSuccessModal(firstName, orderId) {
  EL.modalCustomer.textContent = firstName;
  EL.modalOrderId.textContent  = orderId;
  EL.successModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  EL.successModal.classList.remove('open');
  document.body.style.overflow = '';
}

EL.modalClose.addEventListener('click', closeModal);

EL.successModal.addEventListener('click', e => {
  if (e.target === EL.successModal) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ── 9. Phone Input — auto-format / digits only ───────────────── */
EL.phone.addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '').slice(0, 10);
});

/* ── 10. Clear field errors on re-input ──────────────────────── */
['firstName', 'phone', 'wilaya', 'commune'].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener('input', () => {
    el.classList.remove('is-error');
    const errEl = $(`err-${id}`);
    if (errEl) errEl.textContent = '';
  });
  el.addEventListener('change', () => {
    el.classList.remove('is-error');
    const errEl = $(`err-${id}`);
    if (errEl) errEl.textContent = '';
    if (id === 'wilaya') updateSummary();
  });
});

/* ── Init ────────────────────────────────────────────────────── */
loadConfig();
