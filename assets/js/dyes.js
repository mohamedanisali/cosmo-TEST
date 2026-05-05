// ============================================================
// dyes.js — بيانات الصبغات، العرض، المرشح الذكي
//           + نظام البحث العام + بحث الغسول
// ============================================================

// ✅ PRECAUTIONS + renderPrecautions() + copyPrecautions()
//    انتقلوا لـ utils.js (يتحمل أول) عشان كل الـ recommenders
//    تقدر تستخدمهم بدون race condition.

/**
 * _getDyesProducts()
 * Safe accessor for dyesProducts data.
 * Reads exclusively from AppState.getData() — the single authoritative source.
 * Returns null — never throws — if data isn't loaded yet.
 */
function _getDyesProducts() {
  return (typeof AppState !== 'undefined' && AppState.getData('dyesProducts')) || null;
}


// ===== HAIR DYES DATA — Lazy loaded via DataLayer =====
/* Data in dyes_products.json — يتحمل عند أول فتح للـ section */
function _loadDyesData(callback) {
  if (typeof DataLayer === 'undefined') {
    console.error('[Dyes] DataLayer not found!');
    return;
  }

  DataLayer.fetch('dyesProducts').then(function(data) {
    // Write to AppState.data — the single source of truth for dyesProducts.
    if (typeof AppState !== 'undefined') {
      AppState.setData('dyesProducts', data);
    }
    if (callback) callback(data);
  });
}

// Register dyes sections with NavigationController
document.addEventListener('DOMContentLoaded', function() {
  if (typeof NavigationController === 'undefined') return;
  NavigationController.registerSection('prod_dyes', {
    dataFn: function() { _loadDyesData(function() {}); },
    initFn: 'initDyesSection',
    delay: 80
  });
  NavigationController.registerSection('dyes_rec', {
    dataFn: function() { _loadDyesData(function() {}); },
    initFn: function() { if (typeof initDyesRec === 'function') initDyesRec(); },
    delay: 80
  });
});

// ===== DYES SECTION RENDER =====
function initDyesSection() {
  var sec = document.getElementById('prod_dyes');
  if (!sec) return;
  if (typeof NavigationController !== 'undefined' && NavigationController.hasRendered('prod_dyes')) return;
  if (typeof NavigationController !== 'undefined') NavigationController.markRendered('prod_dyes');

  // ── Read data via AppState.getData() — guaranteed available at render time ──
  // (initDyesSection() is only called after _loadDyesData() completes)
  var dp = (typeof AppState !== 'undefined')
    ? AppState.getData('dyesProducts')
    : _getDyesProducts();

  if (!dp) {
    console.error('[Dyes] dyesProducts not loaded — aborting render');
    return;
  }

  var brands = {
    'فايتو':       { products: dp.permanent_no_ammonia.filter(function(p){ return p.brand==='فايتو'; }), color: '#9c5fd4', badge: 'دائمة بدون أمونيا' },
    'نوفى':        { products: dp.permanent_no_ammonia.filter(function(p){ return p.brand==='نوفى'; }), color: '#4a90d9', badge: 'دائمة بدون أمونيا' },
    'لوريال دائمة':{ products: dp.permanent_with_ammonia.filter(function(p){ return p.brand==='لوريال'; }), color: '#e8446a', badge: 'دائمة' },
    'غارنيه':      { products: dp.permanent_with_ammonia.filter(function(p){ return p.brand==='غارنيه'; }), color: '#27ae60', badge: 'دائمة' },
    'باليت':       { products: dp.permanent_with_ammonia.filter(function(p){ return p.brand==='باليت'; }), color: '#d4a843', badge: 'دائمة' },
    'بايجن':       { products: dp.permanent_no_ammonia.filter(function(p){ return p.brand==='بايجن'; }), color: '#e07a30', badge: 'دائمة بدون أمونيا' },
    'جودريج':      { products: dp.permanent_no_ammonia.filter(function(p){ return p.brand==='جودريج'; }), color: '#4caf7d', badge: 'دائمة بدون أمونيا' },
    'لوريال كاستينج':{ products: dp.semi_permanent, color: '#b8860b', badge: 'نصف دائمة' },
    'ذا هير اديكت مؤقتة':{ products: dp.temporary, color: '#e8446a', badge: 'مؤقتة' },
    'الحنة والنبات':{ products: dp.henna, color: '#4caf7d', badge: 'طبيعية' },
    'أكسجين وتشقير':{ products: dp.developer, color: '#7a7a7a', badge: 'مستلزمات' },
    'ترميم اللون': { products: dp.restore, color: '#9c5fd4', badge: 'ترميم' },
  };

  function makeCards(products, color) {
    return products.map(function(p) {
      return '<div class="store-card" style="border-top:3px solid '+color+'">'
        +'<div class="store-card-name">'+p.name+'</div>'
        +'<div class="store-card-code">كود: <span>'+p.code+'</span></div>'
        +(p.color && p.color !== '—' ? '<div style="font-size:0.75rem;color:var(--text-muted)">🎨 '+p.color+'</div>' : '')
        +'<div class="store-card-desc">'+p.desc+'</div>'
        +'<div class="store-card-price">'+p.price.toLocaleString('ar-EG')+' ج</div>'
        +'</div>';
    }).join('');
  }

  var html = '<div class="section-header"><h2>🎨 الصبغات</h2><p>جميع صبغات الشعر مقسّمة حسب الشركة والنوع</p><div class="section-divider"></div></div>'
    + '<div class="js-card-sm-gold">'
    + '<div style="font-size:0.88rem;font-weight:800;color:var(--dark);margin-bottom:12px">🔍 بحث بالاسم أو اللون أو الكود</div>'    + '<input id="dyesSearch" type="text" placeholder="ابحث... مثال: أشقر / بني / رمادي / 28792" oninput="filterDyes()" style="width:100%;padding:11px 16px;border:2px solid var(--border);border-radius:var(--radius-sm);font-family:Cairo,sans-serif;font-size:0.92rem;outline:none;box-sizing:border-box">'    + '<div class="js-mt-14">'    + '<div class="js-label-xs">النوع</div>'    + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px" id="dyesTypeFilters">'    + '<button onclick="filterDyesType(this,\'all\')" class="dyes-filter-btn active" data-type="all">الكل</button>'    + '<button onclick="filterDyesType(this,\'permanent\')" class="dyes-filter-btn" data-type="permanent">دائمة</button>'    + '<button onclick="filterDyesType(this,\'semi\')" class="dyes-filter-btn" data-type="semi">نصف دائمة</button>'    + '<button onclick="filterDyesType(this,\'temp\')" class="dyes-filter-btn" data-type="temp">مؤقتة</button>'    + '<button onclick="filterDyesType(this,\'henna\')" class="dyes-filter-btn" data-type="henna">حنة وطبيعي</button>'    + '<button onclick="filterDyesType(this,\'dev\')" class="dyes-filter-btn" data-type="dev">أكسجين وتشقير</button>'    + '</div>'    + '<div id="dyesAmmoniaRow" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">'    + '<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);width:100%;margin-bottom:4px">الأمونيا</div>'    + '<button onclick="filterDyesAmmonia(this,\'all\')" class="dyes-filter-btn active" data-ammonia="all">الكل</button>'    + '<button onclick="filterDyesAmmonia(this,\'no\')" class="dyes-filter-btn" data-ammonia="no">بدون أمونيا</button>'    + '<button onclick="filterDyesAmmonia(this,\'yes\')" class="dyes-filter-btn" data-ammonia="yes">بأمونيا</button>'    + '</div>'    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px" id="dyesBrandFilters">'
    + '<button onclick="filterDyesBrand(this,\'الكل\')" style="padding:7px 14px;border-radius:20px;border:2px solid var(--rose);background:var(--rose);font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:white;transition:all 0.2s" data-brand="الكل">الكل</button>'
    + '<button onclick="filterDyesBrand(this,\'فايتو\')" style="padding:7px 14px;border-radius:20px;border:2px solid #9c5fd433;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#9c5fd4;transition:all 0.2s" data-brand="فايتو">فايتو</button>'
    + '<button onclick="filterDyesBrand(this,\'نوفى\')" style="padding:7px 14px;border-radius:20px;border:2px solid #4a90d933;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#4a90d9;transition:all 0.2s" data-brand="نوفى">نوفى</button>'
    + '<button onclick="filterDyesBrand(this,\'لوريال\')" style="padding:7px 14px;border-radius:20px;border:2px solid #e8446a33;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#e8446a;transition:all 0.2s" data-brand="لوريال">لوريال</button>'
    + '<button onclick="filterDyesBrand(this,\'غارنيه\')" style="padding:7px 14px;border-radius:20px;border:2px solid #27ae6033;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#27ae60;transition:all 0.2s" data-brand="غارنيه">غارنيه</button>'
    + '<button onclick="filterDyesBrand(this,\'باليت\')" style="padding:7px 14px;border-radius:20px;border:2px solid #d4a84333;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#d4a843;transition:all 0.2s" data-brand="باليت">باليت</button>'
    + '<button onclick="filterDyesBrand(this,\'بايجن\')" style="padding:7px 14px;border-radius:20px;border:2px solid #e07a3033;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#e07a30;transition:all 0.2s" data-brand="بايجن">بايجن</button>'
    + '<button onclick="filterDyesBrand(this,\'جودريج\')" style="padding:7px 14px;border-radius:20px;border:2px solid #4caf7d33;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#4caf7d;transition:all 0.2s" data-brand="جودريج">جودريج</button>'
    + '<button onclick="filterDyesBrand(this,\'كاستينج\')" style="padding:7px 14px;border-radius:20px;border:2px solid #b8860b33;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#b8860b;transition:all 0.2s" data-brand="كاستينج">كاستينج</button>'
    + '<button onclick="filterDyesBrand(this,\'ذا هير اديكت\')" style="padding:7px 14px;border-radius:20px;border:2px solid #e8446a33;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#e8446a;transition:all 0.2s" data-brand="ذا هير اديكت">ذا هير اديكت</button>'
    + '<button onclick="filterDyesBrand(this,\'حنة\')" style="padding:7px 14px;border-radius:20px;border:2px solid #4caf7d33;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#4caf7d;transition:all 0.2s" data-brand="حنة">حنة وطبيعي</button>'
    + '<button onclick="filterDyesBrand(this,\'أكسجين\')" style="padding:7px 14px;border-radius:20px;border:2px solid #7a7a7a33;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#7a7a7a;transition:all 0.2s" data-brand="أكسجين">أكسجين وتشقير</button>'
    + '<button onclick="filterDyesBrand(this,\'ترميم\')" style="padding:7px 14px;border-radius:20px;border:2px solid #9c5fd433;background:white;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;color:#9c5fd4;transition:all 0.2s" data-brand="ترميم">ترميم اللون</button>'
    + '</div>'
    + '<div id="dyesSearchResult" class="js-mt-14"></div>'
    + '</div>';

  Object.keys(brands).forEach(function(brand) {
    var data = brands[brand];
    if (!data.products.length) return;
    html += '<div class="prod-section-title" style="border-right-color:'+data.color+';color:'+data.color+'">'+brand
      +' <span style="font-size:0.72rem;background:'+data.color+'22;color:'+data.color+';padding:2px 10px;border-radius:10px;font-weight:700;margin-right:8px">'+data.badge+'</span>'
      +' <span style="font-size:0.72rem;color:var(--text-muted);font-weight:500">('+data.products.length+' منتج)</span></div>'
      +'<div class="store-cards-grid" style="margin-bottom:24px">'+makeCards(data.products, data.color)+'</div>';
  });

  sec.innerHTML = html;
}

function filterDyes() {
  applyDyesFilters();
  var q = document.getElementById('dyesSearch').value.trim().toLowerCase();
  var res = document.getElementById('dyesSearchResult');
  if (!q) return;
  if (!res) return;
  if (!q) { res.innerHTML = ''; return; }

  var all = [].concat(
    _getDyesProducts().permanent_no_ammonia,
    _getDyesProducts().permanent_with_ammonia,
    _getDyesProducts().semi_permanent,
    _getDyesProducts().temporary,
    _getDyesProducts().henna,
    _getDyesProducts().developer,
    _getDyesProducts().restore
  );

  var found = all.filter(function(p) {
    return (p.name+' '+p.color+' '+p.code+' '+p.brand+' '+p.desc).toLowerCase().indexOf(q) !== -1;
  });

  if (!found.length) { res.innerHTML = '<div style="color:var(--text-muted);font-size:0.88rem;padding:12px">لا توجد نتائج للبحث عن "'+q+'"</div>'; return; }

  res.innerHTML = '<div class="js-label-sm">'+found.length+' نتيجة</div>'
    +'<div class="store-cards-grid">'
    + found.map(function(p){
        return '<div class="store-card" style="border-top:3px solid var(--rose)">'
          +'<div class="store-card-name">'+p.name+'</div>'
          +'<div class="store-card-code">كود: <span>'+p.code+'</span> | <span style="color:var(--rose-dark)">'+p.type+'</span></div>'
          +(p.color && p.color !== '—' ? '<div style="font-size:0.75rem;color:var(--text-muted)">🎨 '+p.color+'</div>' : '')
          +'<div class="store-card-desc">'+p.desc+'</div>'
          +'<div class="store-card-price">'+p.price.toLocaleString('ar-EG')+' ج</div>'
          +'</div>';
      }).join('')
    +'</div>';
}

// ===== DYES FILTER STATE — managed via AppState.sections.dyes =====
// Initialise defaults in AppState (no-op if already set on re-entry)
(function() {
  if (typeof AppState === 'undefined') return;
  var cur = AppState.getState('ui.dyes');
  if (!cur || !cur.activeType) {
    AppState.setState('ui.dyes', { activeType: 'all', activeAmmonia: 'all', activeBrand: 'الكل' });
  }
})();

// Shorthand helpers — keeps all callers readable
function _dyesGet(key) {
  if (typeof AppState !== 'undefined') {
    var s = AppState.getState('ui.dyes');
    return s ? s[key] : undefined;
  }
  return undefined;
}
function _dyesSet(patch) {
  if (typeof AppState !== 'undefined') {
    var cur = AppState.getState('ui.dyes') || {};
    AppState.setState('ui.dyes', Object.assign({}, cur, patch));
  }
}

function updateBrandButtons() {
  // Build set of brands that have products matching current type+ammonia
  var type = _dyesGet('activeType') || 'all';
  var ammonia = _dyesGet('activeAmmonia') || 'all';

  var all = [].concat(
    _getDyesProducts().permanent_no_ammonia,
    _getDyesProducts().permanent_with_ammonia,
    _getDyesProducts().semi_permanent,
    _getDyesProducts().temporary,
    _getDyesProducts().henna,
    _getDyesProducts().developer,
    _getDyesProducts().restore
  );

  // Filter by type+ammonia only
  var filtered = all.filter(function(p) {
    if (type === 'permanent') {
      if (p.type !== 'دائمة' && p.type !== 'دائمة بدون أمونيا') return false;
    } else if (type === 'semi') {
      if (p.type !== 'نصف دائمة') return false;
    } else if (type === 'temp') {
      if (p.type !== 'مؤقتة') return false;
    } else if (type === 'henna') {
      if (p.type !== 'حنة') return false;
    } else if (type === 'dev') {
      if (p.type !== 'مستلزمات' && p.type !== 'تفتيح/ترميم' && p.type !== 'ترميم لون') return false;
    }
    if (ammonia === 'no' && p.type !== 'دائمة بدون أمونيا') return false;
    if (ammonia === 'yes' && p.type !== 'دائمة') return false;
    return true;
  });

  // Collect available brands
  var brandMap2 = {
    'فايتو':        function(p){ return p.brand==='فايتو'; },
    'نوفى':         function(p){ return p.brand==='نوفى'; },
    'لوريال':       function(p){ return p.brand==='لوريال'; },
    'غارنيه':       function(p){ return p.brand==='غارنيه'; },
    'باليت':        function(p){ return p.brand==='باليت'; },
    'بايجن':        function(p){ return p.brand==='بايجن'; },
    'جودريج':       function(p){ return p.brand==='جودريج'; },
    'كاستينج':      function(p){ return p.name.indexOf('كاستينج')!==-1; },
    'ذا هير اديكت': function(p){ return p.brand==='ذا هير اديكت'; },
    'حنة':          function(p){ return p.type==='حنة'; },
    'أكسجين':       function(p){ return p.type==='مستلزمات'; },
    'ترميم':        function(p){ return p.type==='ترميم لون'||p.type==='تفتيح/ترميم'; },
  };

  var availableBrands = {};
  Object.keys(brandMap2).forEach(function(brand) {
    availableBrands[brand] = filtered.some(brandMap2[brand]);
  });

  // Show/hide brand buttons
  document.querySelectorAll('#dyesBrandFilters button').forEach(function(b) {
    var brand = b.dataset.brand;
    if (!brand || brand === 'الكل') { b.style.display = 'inline-flex'; return; }
    b.style.display = availableBrands[brand] ? 'inline-flex' : 'none';
  });
}

function filterDyesType(btn, type) {
  _dyesSet({ activeType: type, activeBrand: 'الكل', activeAmmonia: 'all' });
  document.querySelectorAll('#dyesTypeFilters .dyes-filter-btn').forEach(function(b){
    b.classList.remove('active');
  });
  btn.classList.add('active');
  // Show/hide ammonia row
  var amRow = document.getElementById('dyesAmmoniaRow');
  if (amRow) amRow.style.display = (type === 'permanent' || type === 'all') ? 'flex' : 'none';
  document.querySelectorAll('[data-ammonia]').forEach(function(b){ b.classList.remove('active'); });
  var allAmBtn = document.querySelector('[data-ammonia="all"]');
  if (allAmBtn) allAmBtn.classList.add('active');
  document.querySelectorAll('#dyesBrandFilters button').forEach(function(b){
    b.style.background = 'white';
    b.style.color = b.dataset.color || 'var(--text-muted)';
    b.style.borderColor = b.dataset.color ? b.dataset.color+'33' : 'var(--border)';
  });
  updateBrandButtons();
  applyDyesFilters();
}

function filterDyesAmmonia(btn, val) {
  _dyesSet({ activeAmmonia: val, activeBrand: 'الكل' });
  document.querySelectorAll('[data-ammonia]').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  document.querySelectorAll('#dyesBrandFilters button').forEach(function(b){
    b.style.background = 'white';
    b.style.color = b.dataset.color || 'var(--text-muted)';
    b.style.borderColor = b.dataset.color ? b.dataset.color+'33' : 'var(--border)';
  });
  updateBrandButtons();
  applyDyesFilters();
}

function applyDyesFilters() {
  var type = _dyesGet('activeType') || 'all';
  var ammonia = _dyesGet('activeAmmonia') || 'all';
  var brand = _dyesGet('activeBrand') || 'الكل';
  var q = (document.getElementById('dyesSearch')||{}).value || '';
  q = q.trim().toLowerCase();

  var all = [].concat(
    _getDyesProducts().permanent_no_ammonia,
    _getDyesProducts().permanent_with_ammonia,
    _getDyesProducts().semi_permanent,
    _getDyesProducts().temporary,
    _getDyesProducts().henna,
    _getDyesProducts().developer,
    _getDyesProducts().restore
  );

  var found = all.filter(function(p) {
    // Type filter
    if (type === 'permanent') {
      if (p.type !== 'دائمة' && p.type !== 'دائمة بدون أمونيا') return false;
    } else if (type === 'semi') {
      if (p.type !== 'نصف دائمة') return false;
    } else if (type === 'temp') {
      if (p.type !== 'مؤقتة') return false;
    } else if (type === 'henna') {
      if (p.type !== 'حنة') return false;
    } else if (type === 'dev') {
      if (p.type !== 'مستلزمات' && p.type !== 'تفتيح/ترميم' && p.type !== 'ترميم لون') return false;
    }
    // Ammonia filter (only for permanent)
    if (ammonia === 'no' && p.type !== 'دائمة بدون أمونيا') return false;
    if (ammonia === 'yes' && p.type !== 'دائمة') return false;
    // Brand filter
    if (brand !== 'الكل') {
      var brandMap2 = {
        'فايتو': function(x){ return x.brand==='فايتو'; },
        'نوفى': function(x){ return x.brand==='نوفى'; },
        'لوريال': function(x){ return x.brand==='لوريال'; },
        'غارنيه': function(x){ return x.brand==='غارنيه'; },
        'باليت': function(x){ return x.brand==='باليت'; },
        'بايجن': function(x){ return x.brand==='بايجن'; },
        'جودريج': function(x){ return x.brand==='جودريج'; },
        'كاستينج': function(x){ return x.name.indexOf('كاستينج')!==-1; },
        'ذا هير اديكت': function(x){ return x.brand==='ذا هير اديكت'; },
        'حنة': function(x){ return x.type==='حنة'; },
        'أكسجين': function(x){ return x.type==='مستلزمات'; },
        'ترميم': function(x){ return x.type==='ترميم لون'||x.type==='تفتيح/ترميم'; },
      };
      var fn2 = brandMap2[brand];
      if (fn2 && !fn2(p)) return false;
    }
    // Text search
    if (q && (p.name+' '+p.color+' '+p.code+' '+p.brand+' '+p.desc).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });

  var res = document.getElementById('dyesSearchResult');
  if (!res) return;

  if (!found.length) {
    res.innerHTML = '<div style="color:var(--text-muted);font-size:0.88rem;padding:12px">لا توجد نتائج</div>';
    return;
  }

  // If all filters are default and no search, clear results (show all sections below)
  if (type === 'all' && ammonia === 'all' && brand === 'الكل' && !q) {
    res.innerHTML = '';
    return;
  }

  res.innerHTML = '<div class="js-label-sm">'+found.length+' منتج</div>'
    +'<div class="store-cards-grid">'
    + found.map(function(p){
        return '<div class="store-card" style="border-top:3px solid var(--rose)">'
          +'<div class="store-card-name">'+p.name+'</div>'
          +'<div class="store-card-code">كود: <span>'+p.code+'</span> | <span style="color:var(--rose-dark)">'+p.type+'</span></div>'
          +(p.color && p.color !== '—' ? '<div style="font-size:0.75rem;color:var(--text-muted)">🎨 '+p.color+'</div>' : '')
          +'<div class="store-card-desc">'+p.desc+'</div>'
          +'<div class="store-card-price">'+p.price.toLocaleString('ar-EG')+' ج</div>'
          +'</div>';
      }).join('')
    +'</div>';
}

function filterDyesBrand(btn, brand) {
  // Update active button styles
  var allBtns = document.querySelectorAll('#dyesBrandFilters button');
  allBtns.forEach(function(b) {
    b.style.background = 'white';
    b.style.color = b.style.borderColor.replace('33)',')')  .replace('rgba','rgb').replace(',0.2','');
  });
  btn.style.background = 'var(--rose)';
  btn.style.color = 'white';
  btn.style.borderColor = 'var(--rose)';

  _dyesSet({ activeBrand: brand });
  // Clear search input
  var inp = document.getElementById('dyesSearch');
  if (inp) inp.value = '';

  if (brand === 'الكل') { applyDyesFilters(); return; }

  var res = document.getElementById('dyesSearchResult');
  if (!res) return;

  var all = [].concat(
    _getDyesProducts().permanent_no_ammonia,
    _getDyesProducts().permanent_with_ammonia,
    _getDyesProducts().semi_permanent,
    _getDyesProducts().temporary,
    _getDyesProducts().henna,
    _getDyesProducts().developer,
    _getDyesProducts().restore
  );

  if (brand === 'الكل') { res.innerHTML = ''; return; }

  var brandMap = {
    'فايتو':        function(p){ return p.brand === 'فايتو'; },
    'نوفى':         function(p){ return p.brand === 'نوفى'; },
    'لوريال':       function(p){ return p.brand === 'لوريال'; },
    'غارنيه':       function(p){ return p.brand === 'غارنيه'; },
    'باليت':        function(p){ return p.brand === 'باليت'; },
    'بايجن':        function(p){ return p.brand === 'بايجن'; },
    'جودريج':       function(p){ return p.brand === 'جودريج'; },
    'كاستينج':      function(p){ return p.name.indexOf('كاستينج') !== -1; },
    'ذا هير اديكت': function(p){ return p.brand === 'ذا هير اديكت'; },
    'حنة':          function(p){ return p.type === 'حنة'; },
    'أكسجين':       function(p){ return p.type === 'مستلزمات'; },
    'ترميم':        function(p){ return p.type === 'ترميم لون' || p.type === 'تفتيح/ترميم'; },
  };

  var fn = brandMap[brand];
  var found = fn ? all.filter(fn) : [];

  if (!found.length) { res.innerHTML = '<div style="color:var(--text-muted);font-size:0.88rem;padding:12px">لا توجد منتجات</div>'; return; }

  res.innerHTML = '<div class="js-label-sm">'+found.length+' منتج — '+brand+'</div>'
    +'<div class="store-cards-grid">'
    + found.map(function(p){
        return '<div class="store-card" style="border-top:3px solid var(--rose)">'
          +'<div class="store-card-name">'+p.name+'</div>'
          +'<div class="store-card-code">كود: <span>'+p.code+'</span> | <span style="color:var(--rose-dark)">'+p.type+'</span></div>'
          +(p.color && p.color !== '—' ? '<div style="font-size:0.75rem;color:var(--text-muted)">🎨 '+p.color+'</div>' : '')
          +'<div class="store-card-desc">'+p.desc+'</div>'
          +'<div class="store-card-price">'+p.price.toLocaleString('ar-EG')+' ج</div>'
          +'</div>';
      }).join('')
    +'</div>';
}

// ===== DYES RECOMMENDER =====
function initDyesRec() {
  var sec = document.getElementById('dyes_rec');
  if (!sec) return;
  // Reset recommender answers in AppState
  if (typeof AppState !== 'undefined') AppState.setState('ui.dyesRec', { answers: {} });
  sec.innerHTML = `
    <div class="section-header"><h2>🎯 مرشح الصبغات الذكي</h2><p>اجاوب على الأسئلة وهيجيلك الترشيح المناسب</p><div class="section-divider"></div></div>
    <div style="max-width:680px" id="dyes-rec-wizard">
      <div id="dyes-q0" class="dyes-step">
        <div class="js-card-rose">
          <div class="js-title-sm">1️⃣ عايزة الصبغة تكون إيه؟</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <button class="dyes-opt" onclick="dyesAnswer('dyeType','permanent',this,'dyes-q1')">💪 دائمة</button>
            <button class="dyes-opt" onclick="dyesAnswer('dyeType','semi',this,'dyes-result')">🌀 شبه دائمة</button>
            <button class="dyes-opt" onclick="dyesAnswer('dyeType','temp',this,'dyes-result')">✨ مؤقتة</button>
          </div>
        </div>
      </div>
      <div id="dyes-q1" class="dyes-step" style="display:none">
        <div class="js-card-rose">
          <div class="js-title-sm">2️⃣ هل العميلة حامل أو بترضع؟</div>
          <div class="js-grid-2">
            <button class="dyes-opt" onclick="dyesAnswer('pregnant','yes',this,'dyes-q2')">✅ نعم</button>
            <button class="dyes-opt" onclick="dyesAnswer('pregnant','no',this,'dyes-q2')">❌ لا</button>
          </div>
        </div>
      </div>
      <div id="dyes-q2" class="dyes-step" style="display:none">
        <div class="js-card-rose">
          <div class="js-title-sm">3️⃣ عندها حساسية من صبغات الشعر؟</div>
          <div class="js-grid-2">
            <button class="dyes-opt" onclick="dyesAnswer('sensitive','yes',this,'dyes-q3')">✅ نعم</button>
            <button class="dyes-opt" onclick="dyesAnswer('sensitive','no',this,'dyes-q3')">❌ لا</button>
          </div>
        </div>
      </div>
      <div id="dyes-q3" class="dyes-step" style="display:none">
        <div class="js-card-rose">
          <div class="js-title-sm">4️⃣ عايزة بدون أمونيا؟</div>
          <div class="js-grid-2">
            <button class="dyes-opt" onclick="dyesAnswer('noAmmonia','yes',this,'dyes-q4')">✅ نعم</button>
            <button class="dyes-opt" onclick="dyesAnswer('noAmmonia','no',this,'dyes-q4')">❌ مش مهم</button>
          </div>
        </div>
      </div>
      <div id="dyes-q4" class="dyes-step" style="display:none">
        <div class="js-card-rose">
          <div class="js-title-sm">5️⃣ في حنة على الشعر؟</div>
          <div class="js-grid-2">
            <button class="dyes-opt" onclick="dyesAnswer('henna','yes',this,'dyes-q5')">✅ نعم</button>
            <button class="dyes-opt" onclick="dyesAnswer('henna','no',this,'dyes-q5')">❌ لا</button>
          </div>
        </div>
      </div>
      <div id="dyes-q5" class="dyes-step" style="display:none">
        <div class="js-card-rose">
          <div class="js-title-sm">6️⃣ نسبة الشعر الأبيض تقريباً كام؟</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <button class="dyes-opt" onclick="dyesAnswer('white','none',this,'dyes-result')">🟢 مفيش</button>
            <button class="dyes-opt" onclick="dyesAnswer('white','some',this,'dyes-result')">🟡 شوية (أقل من 50%)</button>
            <button class="dyes-opt" onclick="dyesAnswer('white','most',this,'dyes-result')">🔴 كتير (+50%)</button>
          </div>
        </div>
      </div>
      <div id="dyes-result" style="display:none;margin-top:16px"></div>
    </div>`;
}

function dyesAnswer(key, val, btn, nextId) {
  if (typeof AppState !== 'undefined') {
    var _cur = AppState.getState('ui.dyesRec') || { answers: {} };
    var _ans = Object.assign({}, _cur.answers);
    _ans[key] = val;
    AppState.setState('ui.dyesRec', { answers: _ans });
  }
  // Style selected button
  btn.parentElement.querySelectorAll('.dyes-opt').forEach(function(b){
    b.style.background='white'; b.style.color='var(--text)'; b.style.borderColor='var(--border)';
  });
  btn.style.background='var(--rose)'; btn.style.color='white'; btn.style.borderColor='var(--rose)';
  // If going straight to result, hide all intermediate questions
  if (nextId === 'dyes-result') {
    ['dyes-q1','dyes-q2','dyes-q3','dyes-q4','dyes-q5'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
  // Show next step
  setTimeout(function(){
    var next = document.getElementById(nextId);
    if (!next) return;
    next.style.display = 'block';
    next.scrollIntoView({behavior:'smooth', block:'nearest'});
    if (nextId === 'dyes-result') showDyesRecResult();
  }, 300);
}

function showDyesRecResult() {
  var _recState = (typeof AppState !== 'undefined') ? AppState.getState('ui.dyesRec') : null;
  var a = (_recState && _recState.answers) ? _recState.answers : {};
  var res = document.getElementById('dyes-result');
  if (!res) return;

  var picks = [];
  var title = '';
  var oxygenTip = '';
  var notes = [];

  // ===== DECISION LOGIC =====
  // لو اختار شبه دائمة أو مؤقتة مباشرة
  if (a.dyeType === 'semi') {
    title = '🌀 نصف دائمة';
    picks = [
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='81077'; }),
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='78522'; }),
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='78544'; }),
    ];
    oxygenTip = 'مش محتاجة أوكسجين مع النصف دائمة';
    notes.push('✅ بتدوم من 28 لـ 32 غسلة');
    notes.push('✅ مناسبة لو الشعر فيه بروتين أو كيراتين');
  } else if (a.dyeType === 'temp') {
    title = '✨ مؤقتة';
    picks = [
      _getDyesProducts().temporary.find(function(p){ return p.code==='131968'; }),
      _getDyesProducts().temporary.find(function(p){ return p.code==='131969'; }),
      _getDyesProducts().temporary.find(function(p){ return p.code==='131971'; }),
    ];
    oxygenTip = 'مش محتاجة أوكسجين';
    notes.push('✅ بتزول مع أول غسلة — مناسبة للمناسبات');
    notes.push('✅ ألوان متنوعة ومميزة');
  } else if (a.pregnant === 'yes') {
    // حامل/مرضع → بدون أمونيا فقط
    title = '🌿 بدون أمونيا (حمل/رضاعة)';
    picks = [
      _getDyesProducts().permanent_no_ammonia.find(function(p){ return p.code==='126534'; }),
      _getDyesProducts().permanent_no_ammonia.find(function(p){ return p.code==='94764'; }),
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='81077'; }),
    ];
    oxygenTip = '20 Volume (6%) فقط — الأأمن أثناء الحمل';
    notes.push('⚠️ ننصح باستشارة الطبيب قبل الصبغة أثناء الحمل');
    notes.push('✅ تجنبي الصبغة في الثلث الأول من الحمل');
  } else if (a.henna === 'yes') {
    // في حنة → نصف دائمة أو مؤقتة فقط
    title = '🎨 نصف دائمة (بسبب وجود حنة)';
    picks = [
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='81077'; }),
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='78522'; }),
      _getDyesProducts().temporary.find(function(p){ return p.code==='131968'; }),
    ];
    oxygenTip = 'مش محتاجة أوكسجين مع النصف دائمة';
    notes.push('⚠️ الصبغة الدائمة فوق الحنة ممكن تعمل تفاعل وتخضّر أو تتلف الشعر');
    notes.push('✅ انتظري حتى تنزل الحنة (شهر على الأقل) قبل الصبغة الدائمة');
  } else if (a.sensitive === 'yes' || a.noAmmonia === 'yes') {
    // حساسية أو طلب بدون أمونيا
    title = '🌿 بدون أمونيا';
    if (a.sensitive === 'yes') {
      // حساسية → فايتو أو حنة
      picks = [
        _getDyesProducts().henna.find(function(p){ return p.code==='121181'; }),
        _getDyesProducts().permanent_no_ammonia.find(function(p){ return p.code==='126534'; }),
        _getDyesProducts().permanent_no_ammonia.find(function(p){ return p.code==='94764'; }),
      ];
      notes.push('✅ لازم Patch Test 48 ساعة قبل الصبغة');
    } else {
      picks = [
        _getDyesProducts().permanent_no_ammonia.find(function(p){ return p.code==='126534'; }),
        _getDyesProducts().permanent_no_ammonia.find(function(p){ return p.code==='138582'; }),
        _getDyesProducts().permanent_no_ammonia.find(function(p){ return p.code==='94764'; }),
      ];
    }
    oxygenTip = a.white === 'most' ? '20 Volume (6%) — لتغطية الشيب الكتير' : '20 Volume (6%) — الأنسب للبدون أمونيا';
  } else if (a.white === 'most') {
    // شيب كتير → دائمة
    title = '💪 دائمة — تغطية 100% شيب';
    picks = [
      _getDyesProducts().permanent_with_ammonia.find(function(p){ return p.code==='28788'; }),
      _getDyesProducts().permanent_with_ammonia.find(function(p){ return p.code==='73058'; }),
      _getDyesProducts().permanent_with_ammonia.find(function(p){ return p.code==='86763'; }),
    ];
    oxygenTip = '20 Volume (6%) — للتغطية الكاملة للشيب';
  } else if (a.white === 'some') {
    // شيب شوية → دائمة أو نصف دائمة
    title = '🎨 دائمة أو نصف دائمة';
    picks = [
      _getDyesProducts().permanent_with_ammonia.find(function(p){ return p.code==='73058'; }),
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='81077'; }),
      _getDyesProducts().permanent_no_ammonia.find(function(p){ return p.code==='94764'; }),
    ];
    oxygenTip = '20 Volume (6%) للدائمة — مش محتاجة للنصف دائمة';
  } else {
    // مفيش شيب → نصف دائمة أو مؤقتة
    title = '✨ نصف دائمة أو مؤقتة';
    picks = [
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='81077'; }),
      _getDyesProducts().temporary.find(function(p){ return p.code==='131968'; }),
      _getDyesProducts().semi_permanent.find(function(p){ return p.code==='78522'; }),
    ];
    oxygenTip = 'مش محتاجة أوكسجين';
  }


  // Remove nulls and duplicates by series+brand
  var seen = {};
  picks = picks.filter(function(p){
    var key = (p.brand||'') + '|' + (p.series||p.code||'');
    if (!p || seen[key]) return false;
    seen[key] = true;
    return true;
  });
  var colors = ['#e8446a','#d4a843','#4a90d9'];

  function dyeLink(p) {
    var searchTerm = encodeURIComponent(p.series || p.brand);
    return 'https://alabdellatif-tarshouby.com/ar/products?search=' + searchTerm;
  }
  function cleanName(p) {
    return p.series ? p.brand + ' ' + p.series : p.brand;
  }

  var cardsHTML = picks.map(function(p, i) {
    return '<div class="store-card" style="border-top:4px solid '+colors[i]+'">'
      +'<div class="store-card-name">'+cleanName(p)+'</div>'
      +'<div class="store-card-desc">'+p.desc+'</div>'
      +'<a href="'+dyeLink(p)+'" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,var(--rose),var(--rose-dark));color:white;padding:7px 16px;border-radius:20px;font-size:0.8rem;font-weight:700;text-decoration:none;margin-top:8px">🎨 شوفي الألوان من هنا</a>'
      +'</div>';
  }).join('');

  var copyText = '🎨 ترشيح الصبغات — '+title+'\n══════════════\n'
    + picks.map(function(p){ return '▪️ '+cleanName(p)+'\nممكن حضرتك تشوفي الألوان من هنا 👇\n'+dyeLink(p); }).join('\n\n')
    + '\n\n🧪 الأوكسجين: '+oxygenTip
    + (notes.length ? '\n\n💡 نصايح:\n'+notes.join('\n') : '')
    + '\n══════════════\n🛒 للطلب: alabdellatif-tarshouby.com/ar';

  res.innerHTML = '<div style="font-size:1rem;font-weight:800;color:var(--dark);margin-bottom:14px">✅ الترشيح: '+title+'</div>'
    +'<div style="background:#fdf6ee;border-right:4px solid var(--gold);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:16px;font-size:0.85rem;font-weight:700;color:#7a5a00">🧪 '+oxygenTip+'</div>'
    +'<div class="store-cards-grid">'+cardsHTML+'</div>'
    +(notes.length ? '<div style="background:white;border-radius:var(--radius);padding:16px 20px;box-shadow:var(--shadow);margin-top:16px"><div class="js-label">💡 نصايح مهمة</div>'
      +notes.map(function(n){ return '<div style="font-size:0.84rem;padding:4px 0;border-bottom:1px solid var(--border);color:var(--text)">'+n+'</div>'; }).join('')+'</div>' : '')
    +'<div class="rec-copy-box" class="js-mt-16">'
    +'<button onclick="copyDyesRec(this)" class="rec-copy-btn">📋 نسخ الترشيح للعميل</button>'
    +'<pre id="dyesRecCopyText" style="font-size:0.78rem">'+copyText+'</pre>'
    +'</div>'
    + renderPrecautions('dyes')
    +'<div class="js-mt-16"><button onclick="initDyesRec()" style="background:white;border:2px solid var(--rose);color:var(--rose);padding:10px 24px;border-radius:30px;font-family:Cairo,sans-serif;font-size:0.88rem;font-weight:700;cursor:pointer">🔄 بحث جديد</button></div>';
}

function copyDyesRec(btn) {
  var text = document.getElementById('dyesRecCopyText').textContent;
  navigator.clipboard.writeText(text).then(function(){
    btn.textContent='✅ تم النسخ!'; btn.classList.add('copied');
    setTimeout(function(){ btn.textContent='📋 نسخ الترشيح للعميل'; btn.classList.remove('copied'); },2500);
  }).catch(function(){
    var ta=document.createElement('textarea'); ta.value=text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    btn.textContent='✅ تم النسخ!'; btn.classList.add('copied');
    setTimeout(function(){ btn.textContent='📋 نسخ الترشيح للعميل'; btn.classList.remove('copied'); },2500);
  });
}


// ===== UNIVERSAL SECTION SEARCH =====
function buildSectionSearch(containerId, data, filterConfig) {
  var el = document.getElementById(containerId);
  if (!el) return;
  if (typeof NavigationController !== 'undefined' && NavigationController.hasRendered(containerId)) return;
  if (typeof NavigationController !== 'undefined') NavigationController.markRendered(containerId);

  var filtersHTML = '';
  if (filterConfig) {
    filterConfig.forEach(function(fc) {
      filtersHTML += '<div class="js-label-xs">' + fc.label + '</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px" id="sf-' + fc.key + '-' + containerId + '">'
        + fc.options.map(function(o, i) {
            return '<button onclick="applySectionFilter(\''+containerId+'\')" class="dyes-filter-btn'+(i===0?' active':'')+'" data-sf-'+fc.key+'="'+o.value+'">'+o.label+'</button>';
          }).join('')
        + '</div>';
    });
  }

  el.innerHTML = '<div class="js-card-sm-gold">'
    + '<div class="js-label">🔍 بحث</div>'
    + '<input id="sf-search-'+containerId+'" type="text" placeholder="ابحث باسم المنتج أو الكود..." oninput="applySectionFilter(\''+containerId+'\')" style="width:100%;padding:11px 16px;border:2px solid var(--border);border-radius:var(--radius-sm);font-family:Cairo,sans-serif;font-size:0.92rem;outline:none;box-sizing:border-box;margin-bottom:12px">'
    + filtersHTML
    + '</div>'
    + '<div id="sf-results-'+containerId+'"></div>';

  el.dataset.sfData = JSON.stringify(data.map(function(p){
    return { name:p.name, code:p.code||'', price:p.price||0, desc:p.desc||'', problems:p.problems||[], types:p.types||[], skinTypes:p.skinTypes||[] };
  }));
  el.dataset.sfConfig = JSON.stringify(filterConfig || []);

  applySectionFilter(containerId);
}

function applySectionFilter(containerId) {
  var el = document.getElementById(containerId);
  if (!el) return;

  // Toggle active on clicked button
  if (event && event.target && event.target.classList && event.target.classList.contains('dyes-filter-btn')) {
    var btn = event.target;
    var group = btn.parentElement;
    if (group) { group.querySelectorAll('.dyes-filter-btn').forEach(function(b){ b.classList.remove('active'); }); btn.classList.add('active'); }
  }

  var data = JSON.parse(el.dataset.sfData || '[]');
  var config = JSON.parse(el.dataset.sfConfig || '[]');
  var searchEl = document.getElementById('sf-search-'+containerId);
  var q = searchEl ? searchEl.value.trim().toLowerCase() : '';

  var found = data.filter(function(p) {
    if (q && (p.name+' '+(p.desc||'')+' '+p.code).toLowerCase().indexOf(q) === -1) return false;
    for (var i = 0; i < config.length; i++) {
      var fc = config[i];
      var activeBtn = document.querySelector('#sf-'+fc.key+'-'+containerId+' .dyes-filter-btn.active');
      var val = activeBtn ? activeBtn.dataset['sf'+fc.key.charAt(0).toUpperCase()+fc.key.slice(1)] || activeBtn.getAttribute('data-sf-'+fc.key) : 'all';
      if (!val || val === 'all') continue;
      if (fc.field === 'problems' && (!p.problems || p.problems.indexOf(val) === -1)) return false;
      if (fc.field === 'types'    && (!p.types    || p.types.indexOf(val)    === -1)) return false;
      if (fc.field === 'skinTypes'&& (!p.skinTypes|| p.skinTypes.indexOf(val) === -1)) return false;
    }
    return true;
  });

  found.sort(function(a,b){ return (a.price||0)-(b.price||0); });

  var res = document.getElementById('sf-results-'+containerId);
  if (!res) return;

  if (!found.length) { res.innerHTML = '<div style="color:var(--text-muted);padding:16px;font-size:0.88rem">لا توجد نتائج</div>'; return; }

  res.innerHTML = '<div style="font-size:0.82rem;font-weight:700;color:var(--text-muted);margin-bottom:12px">'+found.length+' منتج</div>'
    + '<div class="store-cards-grid">'
    + found.map(function(p){
        return '<div class="store-card">'
          + '<div class="store-card-name">'+p.name+'</div>'
          + '<div class="store-card-code">كود: <span>'+p.code+'</span></div>'
          + (p.desc ? '<div class="store-card-desc">'+p.desc+'</div>' : '')
          + (p.price ? '<div class="store-card-price">'+Number(p.price).toLocaleString('ar-EG')+' جنيه</div>' : '')
          + '</div>';
      }).join('')
    + '</div>';
}


// ===== CLEANSERS SEARCH =====
function searchCleansers() {
  var q = (document.getElementById('cleanserSearch') || {}).value || '';
  q = q.trim().toLowerCase();
  var res = document.getElementById('cleanserSearchResult');
  if (!res) return;
  if (!q) { res.innerHTML = ''; return; }
  var d = (typeof AppState !== 'undefined') ? AppState.getState('ui.cleanser') : null;
  if (!d) return;
  var all = [].concat(d.byType.gels||[], d.byType.micellar||[], d.byType.soaps||[], d.byType.offers||[]);
  var found = all.filter(function(p){
    return (p.name+' '+(p.desc||'')+' '+(p.code||'')).toLowerCase().indexOf(q) !== -1;
  });
  if (!found.length) { res.innerHTML = '<div style="color:var(--text-muted);padding:12px;font-size:0.88rem">لا توجد نتائج</div>'; return; }
  res.innerHTML = '<div class="js-label-sm">'+found.length+' نتيجة</div>'
    + '<div class="store-cards-grid">' + found.map(function(p){ return makePriceCard(p); }).join('') + '</div>';
}
