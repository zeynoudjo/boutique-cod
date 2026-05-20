'use strict';

/* ── State ───────────────────────────────────────────────────── */
const STATE = {
  config:       null,
  selectedQty:  1,
  selectedColor: null,
};

/* ── DOM ─────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ── Format price ────────────────────────────────────────────── */
const fmt = n => Number(n).toLocaleString('fr-DZ') + ' DA';

/* ── Load config ─────────────────────────────────────────────── */
async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    STATE.config = await r.json();
    hydratePage();
  } catch (e) {
    document.body.innerHTML = '<p style="color:red;padding:40px;text-align:center">خطأ في تحميل الصفحة</p>';
  }
}

/* ── Build page ──────────────────────────────────────────────── */
function hydratePage() {
  const { product, shippingFees } = STATE.config;

  // Titles
  document.title = product.title;
  const els = ['header-brand','footer-brand','product-title'];
  els.forEach(id => { if($(id)) $(id).textContent = product.title; });
  if($('product-subtitle')) $('product-subtitle').textContent = product.subtitle;

  // Hero image — default first color
  STATE.selectedColor = product.colors[0];
  updateHeroImage();

  // Price
  if($('display-price')) $('display-price').textContent = fmt(product.basePrice);

  // ── Quantity selector ──────────────────────────────────────
  buildQtySelector();

  // ── Color buttons ──────────────────────────────────────────
  const colorWrap = $('color-buttons');
  if (colorWrap) {
    colorWrap.innerHTML = '';
    product.colors.forEach((color, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'variant-btn' + (i === 0 ? ' active' : '');
      btn.textContent = color;
      btn.addEventListener('click', () => {
        STATE.selectedColor = color;
        // Update selected label
        if($('selected-color')) $('selected-color').textContent = color;
        // Update active button
        colorWrap.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Swap image
        updateHeroImage();
      });
      colorWrap.appendChild(btn);
    });
    if($('selected-color')) $('selected-color').textContent = product.colors[0];
  }

  // Hide size section — not needed
  const sizeSection = $('size-buttons');
  if (sizeSection) {
    const sizeGroup = sizeSection.closest('.variant-group');
    if (sizeGroup) sizeGroup.style.display = 'none';
  }

  // ── Wilaya select ──────────────────────────────────────────
  const wilayaEl = $('wilaya');
  if (wilayaEl && shippingFees) {
    wilayaEl.innerHTML = '<option value="">اختر ولايتك</option>';
    Object.keys(shippingFees).sort().forEach(w => {
      const opt = document.createElement('option');
      opt.value = w;
      opt.textContent = `${w} — ${fmt(shippingFees[w])}`;
      wilayaEl.appendChild(opt);
    });
    wilayaEl.addEventListener('change', updateSummary);
  }

  updateSummary();
  setupForm();
}

/* ── Quantity selector (+ / -) ───────────────────────────────── */
function buildQtySelector() {
  const wrap = $('bundle-grid');
  if (!wrap) return;

  const { product } = STATE.config;

  wrap.innerHTML = `
    <div class="qty-selector">
      <button type="button" class="qty-btn" id="qty-minus">−</button>
      <div class="qty-display">
        <span id="qty-value">1</span>
        <span class="qty-label">قطعة</span>
      </div>
      <button type="button" class="qty-btn" id="qty-plus">+</button>
    </div>
    <div class="qty-price-display" id="qty-price-display">${fmt(product.basePrice)}</div>
    <div class="qty-promo" id="qty-promo" style="display:none">
      🔥 3 قطع بـ <strong>5,250 DA</strong> بدل 5,700 DA — <span style="color:#00cc66">وفر 450 DA</span>
    </div>
  `;

  $('qty-minus').addEventListener('click', () => changeQty(-1));
  $('qty-plus').addEventListener('click',  () => changeQty(+1));
}

function changeQty(delta) {
  const newQty = Math.max(1, Math.min(10, STATE.selectedQty + delta));
  STATE.selectedQty = newQty;

  if($('qty-value')) $('qty-value').textContent = newQty;

  const { product } = STATE.config;

  // Special price for 3
  let totalPrice;
  if (newQty === 3) {
    totalPrice = 5250;
    if($('qty-promo')) $('qty-promo').style.display = 'block';
  } else {
    totalPrice = product.basePrice * newQty;
    if($('qty-promo')) $('qty-promo').style.display = 'none';
  }

  if($('qty-price-display')) $('qty-price-display').textContent = fmt(totalPrice);
  if($('display-price'))     $('display-price').textContent     = fmt(totalPrice);

  updateSummary();
}

/* ── Compute current product price ───────────────────────────── */
function getProductPrice() {
  const { product } = STATE.config;
  const qty = STATE.selectedQty;
  if (qty === 3) return 5250;
  return product.basePrice * qty;
}

/* ── Update hero image based on color ────────────────────────── */
function updateHeroImage() {
  const { product } = STATE.config;
  const img = $('product-image');
  if (!img) return;

  // Use color-specific image if available, else default
  const images = product.images || {};
  const src = images[STATE.selectedColor] || product.imageUrl || '';
  if (src && src !== 'undefined') img.src = src;
}

/* ── Update order summary ────────────────────────────────────── */
function updateSummary() {
  if (!STATE.config) return;

  const { shippingFees } = STATE.config;
  const wilayaEl  = $('wilaya');
  const wilaya    = wilayaEl ? wilayaEl.value : '';
  const shipping  = wilaya && shippingFees ? (shippingFees[wilaya] || 0) : null;
  const productPrice = getProductPrice();
  const total     = shipping !== null ? productPrice + shipping : null;

  // Hide the old summary section entirely — show only total
  const summaryEl = $('order-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="summary-title">ملخص الطلب</div>
      <div class="summary-line">
        <span class="summary-key">المنتج × ${STATE.selectedQty}</span>
        <span class="summary-val">${fmt(productPrice)}</span>
      </div>
      <div class="summary-line">
        <span class="summary-key">التوصيل ${wilaya ? '(' + wilaya + ')' : ''}</span>
        <span class="summary-val">${shipping !== null ? fmt(shipping) : 'اختر الولاية'}</span>
      </div>
      ${STATE.selectedQty === 3 ? `
      <div class="summary-line" style="color:#00cc66;font-size:13px">
        <span>🔥 تخفيض</span>
        <span>− 450 DA</span>
      </div>` : ''}
      <div class="summary-divider"></div>
      <div class="summary-line total-line">
        <span class="summary-key" style="font-weight:800;font-size:15px">الإجمالي</span>
        <span class="summary-val total-val">${total !== null ? fmt(total) : '—'}</span>
      </div>
    `;
  }
}

/* ── Form setup & submit ─────────────────────────────────────── */
function setupForm() {
  const form = $('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const firstName = $('firstName') ? $('firstName').value.trim() : '';
    const phone     = $('phone')     ? $('phone').value.trim()     : '';
    const wilaya    = $('wilaya')    ? $('wilaya').value            : '';
    const commune   = $('commune')   ? $('commune').value.trim()   : '';

    // Validation
    let valid = true;
    if (firstName.length < 2) { showErr('firstName', 'الاسم قصير جداً'); valid = false; }
    if (!/^(05|06|07)\d{8}$/.test(phone)) { showErr('phone', 'رقم غير صحيح — مثال: 0661234567'); valid = false; }
    if (!wilaya) { showErr('wilaya', 'اختر ولايتك'); valid = false; }
    if (commune.length < 2) { showErr('commune', 'أدخل البلدية'); valid = false; }
    if (!valid) return;

    // Loading
    const btn = $('cta-btn');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }

    const { shippingFees } = STATE.config;
    const shippingFee  = wilaya ? (shippingFees[wilaya] || 0) : 0;
    const productPrice = getProductPrice();
    const totalPrice   = productPrice + shippingFee;

    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, phone, wilaya, commune,
          color: STATE.selectedColor,
          qty:   STATE.selectedQty,
          productPrice,
          shippingFee,
          totalPrice,
        }),
      });

      const data = await r.json();

      if (r.ok && data.success) {
        // Show success modal
        if($('modal-customer-name')) $('modal-customer-name').textContent = firstName;
        if($('modal-order-id'))      $('modal-order-id').textContent      = data.orderId;
        const modal = $('success-modal');
        if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
        form.reset();
        STATE.selectedQty = 1;
        buildQtySelector();
        $('qty-minus').addEventListener('click', () => changeQty(-1));
        $('qty-plus').addEventListener('click',  () => changeQty(+1));
        updateSummary();
      } else {
        alert('❌ ' + (data.error || 'حدث خطأ، حاول مرة أخرى'));
      }
    } catch {
      alert('❌ خطأ في الاتصال، تحقق من الإنترنت');
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
  });

  // Modal close
  const modalClose = $('modal-close-btn');
  const modal      = $('success-modal');
  if (modalClose && modal) {
    modalClose.addEventListener('click', () => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    });
    modal.addEventListener('click', e => {
      if (e.target === modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
    });
  }

  // Phone digits only
  const phoneEl = $('phone');
  if (phoneEl) phoneEl.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
  });

  // Clear errors on input
  ['firstName','phone','wilaya','commune'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input',  () => clearErr(id));
    el.addEventListener('change', () => clearErr(id));
  });
}

function showErr(id, msg) {
  const errEl = $('err-' + id);
  const inpEl = $(id);
  if (errEl) errEl.textContent = msg;
  if (inpEl) inpEl.classList.add('is-error');
}

function clearErr(id) {
  const errEl = $('err-' + id);
  const inpEl = $(id);
  if (errEl) errEl.textContent = '';
  if (inpEl) inpEl.classList.remove('is-error');
}

/* ── Add qty selector styles ─────────────────────────────────── */
const style = document.createElement('style');
style.textContent = `
.qty-selector {
  display: flex;
  align-items: center;
  gap: 0;
  border: 2px solid var(--clr-border, #e8e5e0);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.qty-btn {
  width: 52px;
  height: 52px;
  font-size: 22px;
  font-weight: 700;
  background: #f5f5f0;
  border: none;
  cursor: pointer;
  color: #1a1814;
  transition: background .15s;
  flex-shrink: 0;
}
.qty-btn:hover { background: #e8e5e0; }
.qty-btn:active { background: #d0cdc8; }
.qty-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-left: 2px solid #e8e5e0;
  border-right: 2px solid #e8e5e0;
}
#qty-value {
  font-size: 26px;
  font-weight: 800;
  color: #1a1814;
  line-height: 1;
}
.qty-label {
  font-size: 11px;
  color: #9e9990;
  margin-top: 2px;
}
.qty-price-display {
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  color: #1a1814;
  margin-top: 12px;
  padding: 10px;
  background: #fafaf8;
  border: 1.5px solid #e8e5e0;
  border-radius: 10px;
}
.qty-promo {
  text-align: center;
  font-size: 13px;
  color: #f97316;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff7ed;
  border-radius: 8px;
  border: 1px solid #fed7aa;
}
`;
document.head.appendChild(style);

/* ── Init ────────────────────────────────────────────────────── */
loadConfig();
