// ============================================================
// engine.js — Pure UI / View Layer
// ============================================================
// RULES:
//   ✅ ONLY HTML generation
//   ✅ ONLY clipboard helpers
//   ❌ NEVER picks products
//   ❌ NEVER filters arrays
//   ❌ NEVER applies tiers
//   ❌ NEVER contains business logic
// ============================================================

/**
 * buildCardHTML(pick)
 * Renders a single recommendation card.
 * @param {Object} pick - { card: ProductObject, color: '#hex' }
 *   card must have: name, price, code, desc (optional)
 *   price may be a number or a price string (whitening products)
 * @returns {string} HTML string
 */
function buildCardHTML(pick) {
  const p     = pick.card;
  const color = pick.color;

  // price display: whitening products pass price as a string already formatted
  const priceDisplay = typeof p.price === 'number'
    ? p.price.toLocaleString('ar-EG') + ' جنيه'
    : p.price;

  // code copy button — only rendered when a code exists
  const codeBlock = p.code
    ? `<div class="js-desc-xs">كود: <strong style="color:var(--dark)">${p.code}</strong></div>
       <button class="rec-card-shop"
         style="background:${color};border:none;cursor:pointer;width:100%;font-family:Cairo,sans-serif;font-size:0.88rem;font-weight:700;color:white;padding:10px;border-radius:8px"
         onclick="ENGINE.copyCode(this,'${p.code}')">
         📋 نسخ الكود
       </button>`
    : `<a href="https://alabdellatif-tarshouby.com/ar" target="_blank"
          class="rec-card-shop" style="background:${color}">
         🛒 تسوّق
       </a>`;

  return `
    <div class="rec-card" style="border-top:4px solid ${color}">
      <div class="rec-card-body">
        <div class="rec-card-name">${p.name}</div>
        ${p.desc ? `<div class="js-desc">${p.desc}</div>` : ''}
        <div class="rec-card-price" style="color:${color};font-size:1rem">${priceDisplay}</div>
        ${codeBlock}
      </div>
    </div>`;
}

/**
 * buildResultHTML(config)
 * Renders the full result block (header + round info + cards + copy box + all-products list).
 * @param {Object} config
 *   picks         {Array}   — array of {card, color} objects (already selected by recommender)
 *   total         {number}  — total products in filtered pool
 *   roundLabel    {number}  — current round number (1-based)
 *   maxRounds     {number}  — total rounds available
 *   title         {string}  — heading e.g. "✅ ترشيحاتك جاهزة!"
 *   subtitle      {string}  — sub-heading text under title
 *   copyText      {string}  — ready-to-send message
 *   copyTextId    {string}  — unique id for <pre> element (used by copyMsg)
 *   onShuffle     {string}  — JS expression to call on "ترشيح آخر"
 *   onReset       {string}  — JS expression to call on "بحث جديد"
 *   onCopyMsg     {string}  — JS expression to call on copy-message button
 *   precautionsHTML {string}— output of renderPrecautions() — passed in by recommender
 *   pool          {Array}   — full filtered pool for the "all products" list
 *   poolPriceKey  {string}  — property name to display as price ('price' default)
 * @returns {string} HTML string
 */
function buildResultHTML(config) {
  const {
    picks,
    total,
    roundLabel,
    maxRounds,
    title,
    subtitle,
    copyText,
    copyTextId,
    onShuffle,
    onReset,
    onCopyMsg,
    precautionsHTML = '',
    pool = [],
    poolPriceKey = 'price'
  } = config;

  const cardsHTML = picks.map(pick => buildCardHTML(pick)).join('');

  const allProductsHTML = pool.map(p => {
    const priceVal = p[poolPriceKey];
    return `<div class="js-row-item">
      <span class="js-title-xs">${p.name}</span>
      <span class="js-price">${priceVal} ج</span>
    </div>`;
  }).join('');

  return `
    <div class="rec-result-wrap">
      <div class="rec-result-header">
        <div>
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
        <div class="js-flex-wrap">
          <button class="rec-reset-btn" onclick="${onShuffle}">🔀 ترشيح آخر</button>
          <button class="rec-reset-btn" onclick="${onReset}">🔄 بحث جديد</button>
        </div>
      </div>

      <div class="js-note-gold">
        🔀 <strong>جولة ${roundLabel} من ${maxRounds}:</strong>
        اضغط "ترشيح آخر" عشان تشوف منتجات مختلفة
      </div>

      <div class="rec-cards-grid">${cardsHTML}</div>

      <div class="js-label-lg">📋 رسالة جاهزة للإرسال للعميل:</div>
      <div class="rec-copy-box">
        <button class="rec-copy-btn" onclick="${onCopyMsg}">📋 نسخ الرسالة</button>
        <pre id="${copyTextId}">${copyText}</pre>
      </div>

      ${precautionsHTML}

      ${pool.length > 0 ? `
      <div class="js-card-sm js-mt-16">
        <div class="js-label">🔍 كل المنتجات المتاحة (${total} منتج):</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;max-height:280px;overflow-y:auto">
          ${allProductsHTML}
        </div>
      </div>` : ''}
    </div>`;
}

/**
 * buildAllProductsList(pool, label)
 * Renders a searchable/scrollable list of all products.
 */
function buildAllProductsList(pool, label) {
  const items = pool.map(p =>
    `<div class="js-row-item">
      <span class="js-title-xs">${p.name}</span>
      <span class="js-price">${p.price} ج</span>
    </div>`
  ).join('');

  return `
    <div class="js-card-sm js-mt-16">
      <div class="js-label">${label} (${pool.length} منتج):</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;max-height:280px;overflow-y:auto">
        ${items}
      </div>
    </div>`;
}

/**
 * setupCopyMsg(button, text)
 * Shared clipboard helper for message copy buttons.
 */
function setupCopyMsg(button, text) {
  navigator.clipboard.writeText(text).then(() => {
    button.innerHTML = '✅ تم النسخ!';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = '📋 نسخ الرسالة';
      button.classList.remove('copied');
    }, 2500);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    button.innerHTML = '✅ تم النسخ!';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = '📋 نسخ الرسالة';
      button.classList.remove('copied');
    }, 2500);
  });
}

// ============================================================
// ENGINE namespace
// ============================================================
const ENGINE = {
  buildCardHTML,
  buildResultHTML,
  buildAllProductsList,
  setupCopyMsg,

  copyCode(btn, code) {
    navigator.clipboard.writeText(code).then(() => {
      btn.innerHTML = '✅ تم النسخ!';
      btn.style.background = '#27ae60';
      setTimeout(() => { btn.innerHTML = '📋 نسخ الكود'; btn.style.background = ''; }, 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.innerHTML = '✅ تم النسخ!';
      setTimeout(() => { btn.innerHTML = '📋 نسخ الكود'; }, 2000);
    });
  }
};
