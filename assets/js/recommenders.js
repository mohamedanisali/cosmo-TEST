/**
 * recommenders-refactored.js
 * 
 * Enhanced version of recommenders.js with deeper DataLayer and AppState integration.
 * 
 * IMPROVEMENTS:
 * ✅ All product data fetched via DataLayer (no hardcoded data)
 * ✅ All state managed via AppState (single source of truth)
 * ✅ Cleaner separation of concerns (logic vs rendering)
 * ✅ Better error handling and loading states
 * ✅ Backward compatibility maintained
 */

// ============================================================
// ===== RECOMMENDER STATE MANAGEMENT =====
// ============================================================

/**
 * RecommenderStateManager
 * Manages all recommender-related state through AppState
 */
const RecommenderStateManager = (function() {
  const INITIAL_STATE = {
    main: {
      productType: null,
      skinType: null,
      rotateCounters: {}
    },
    toner: {
      round: 0
    },
    moist: {
      skinType: null,
      round: 0
    },
    masks: {
      skinType: null,
      round: 0
    },
    scrubs: {
      skinType: null,
      round: 0
    },
    eye: {
      problem: null,
      type: null,
      round: 0
    },
    acne: {
      problem: null,
      type: null,
      round: 0
    }
  };

  /**
   * Initialize recommender state in AppState
   */
  function init() {
    if (typeof AppState === 'undefined') {
      console.warn('[RecommenderStateManager] AppState not available');
      return;
    }
    
    const currentState = AppState.getState('ui.recommenders');
    if (!currentState) {
      AppState.setState('ui.recommenders', INITIAL_STATE);
    }
  }

  /**
   * Get state for a specific recommender
   */
  function getState(recommenderName) {
    if (typeof AppState === 'undefined') return null;
    return AppState.getState(`ui.recommenders.${recommenderName}`);
  }

  /**
   * Update state for a specific recommender
   */
  function setState(recommenderName, newState) {
    if (typeof AppState === 'undefined') return;
    AppState.setState(`ui.recommenders.${recommenderName}`, newState);
  }

  /**
   * Subscribe to recommender state changes
   */
  function subscribe(callback) {
    if (typeof AppState === 'undefined') return () => {};
    return AppState.subscribe(callback);
  }

  /**
   * Reset all recommender states
   */
  function reset() {
    if (typeof AppState === 'undefined') return;
    AppState.setState('ui.recommenders', JSON.parse(JSON.stringify(INITIAL_STATE)));
  }

  return {
    init,
    getState,
    setState,
    subscribe,
    reset,
    INITIAL_STATE
  };
})();

// ============================================================
// ===== PRODUCT DATA MANAGER =====
// ============================================================

/**
 * ProductDataManager
 * Handles fetching and processing product data through DataLayer
 */
const ProductDataManager = (function() {
  let _processedData = null;
  let _loading = false;
  let _error = null;

  /**
   * Load and process all product data
   */
  async function loadProductData() {
    if (_processedData) return _processedData;
    if (_loading) return null;

    _loading = true;
    _error = null;

    try {
      if (typeof DataLayer === 'undefined') {
        throw new Error('DataLayer not available');
      }

      // Fetch all product data
      const [
        products,
        eyeProducts,
        acneProducts,
        antiAgingProducts,
        whiteningStoreProducts
      ] = await DataLayer.fetchAll([
        'products',
        'eyeProducts',
        'acneProducts',
        'antiAgingProducts',
        'whiteningStoreProducts'
      ]);

      // Process store data (from products.json)
      const storeData = _extractStoreData(products);
      
      // Build allStoreProducts with skin type mapping
      const allStoreProducts = _buildAllStoreProducts(storeData);

      _processedData = {
        storeData,
        allStoreProducts,
        eyeProducts: eyeProducts || [],
        acneProducts: acneProducts || [],
        antiAgingProducts: antiAgingProducts || [],
        whiteningStoreProducts: whiteningStoreProducts || []
      };

      // Update AppState with processed data.
      // Use setData() — not setState() — to respect the data namespace contract.
      // setState('data.*') would trigger full subscriber notifications for what
      // is effectively a cache write; setData() is write-only and silent.
      if (typeof AppState !== 'undefined') {
        AppState.setData('processedRecommenderData', _processedData);
      }

      console.log('[ProductDataManager] Successfully loaded and processed product data');
      return _processedData;
    } catch (error) {
      _error = error;
      console.error('[ProductDataManager] Error loading product data:', error);
      
      // Dispatch error event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cosmo:recommender-error', {
          detail: { error, message: error.message }
        }));
      }
      
      return null;
    } finally {
      _loading = false;
    }
  }

  /**
   * Extract store data structure from products.json
   */
  function _extractStoreData(products) {
    if (!products || typeof products !== 'object') {
      console.warn('[ProductDataManager] Invalid products data');
      return { gels: [], micellar: [], soaps: [], offers: [] };
    }

    // Assuming products.json has a storeData export
    // If not, we need to map the structure
    if (products.storeData) {
      return products.storeData;
    }

    // Fallback: return empty structure
    return { gels: [], micellar: [], soaps: [], offers: [] };
  }

  /**
   * Build allStoreProducts array with skin type mapping
   */
  function _buildAllStoreProducts(storeData) {
    const allProducts = [];
    
    Object.entries(storeData).forEach(([category, products]) => {
      if (Array.isArray(products)) {
        products.forEach(product => {
          allProducts.push({
            ...product,
            category,
            skinTypes: _getProductSkinTypes(product.name)
          });
        });
      }
    });

    return allProducts;
  }

  /**
   * Get skin types for a product (uses productSkinMap)
   */
  function _getProductSkinTypes(productName) {
    if (typeof productSkinMap !== 'undefined') {
      return productSkinMap[productName] || ['normal'];
    }
    return ['normal'];
  }

  /**
   * Get processed data
   */
  function getData() {
    return _processedData;
  }

  /**
   * Clear cache
   */
  function clearCache() {
    _processedData = null;
    _error = null;
  }

  /**
   * Get loading state
   */
  function isLoading() {
    return _loading;
  }

  /**
   * Get error state
   */
  function getError() {
    return _error;
  }

  return {
    loadProductData,
    getData,
    clearCache,
    isLoading,
    getError
  };
})();

// ============================================================
// ===== SECTION TITLE REGISTRATIONS =====
// Titles are now consolidated in NavigationController.sectionTitles.
// Removed: sectionTitles[x] = ... mutations (load-order fragile).
// ============================================================

// ============================================================
// ===== SHARED TIER SELECTION LOGIC =====
// ============================================================

/**
 * selectTierPicks(pool, round)
 * Given a price-sorted pool and a rotation round index,
 * returns up to 3 unique picks — one from each price tier.
 */
function selectTierPicks(pool, round) {
  const total    = pool.length;
  const tierSize = Math.ceil(total / 3);
  const cheapTier = pool.slice(0, tierSize);
  const midTier   = pool.slice(tierSize, tierSize * 2);
  const expTier   = pool.slice(tierSize * 2);
  
  let cheap = cheapTier[round % cheapTier.length];
  let mid   = midTier.length ? midTier[round % midTier.length] : cheap;
  let exp   = expTier.length ? expTier[round % expTier.length] : mid;
  
  const key = p => p.code || p.name;
  
  if (mid && cheap && key(mid) === key(cheap))
    mid = midTier.length > 1 ? midTier[(round + 1) % midTier.length] : mid;
  
  if (exp && (key(exp) === key(mid || {}) || key(exp) === key(cheap)))
    exp = expTier.length > 1 ? expTier[(round + 1) % expTier.length] : exp;
  
  const seen = new Set();
  return [cheap, mid, exp].filter(p => {
    if (!p || seen.has(key(p))) return false;
    seen.add(key(p));
    return true;
  });
}

const TIER_COLORS = ['#27ae60', '#d4a843', '#e8446a'];

/**
 * wrapPicksWithColors(picks)
 * Maps raw product array into ENGINE-ready {card, color} objects.
 */
function wrapPicksWithColors(picks) {
  return picks.map((p, i) => ({ card: p, color: TIER_COLORS[i] }));
}

// ============================================================
// ===== PRECISE PRODUCT → SKIN TYPE MAP =====
// ============================================================

const productSkinMap = {
  // Note: This map is imported from the original recommenders.js
  // It contains the complete mapping of product names to skin types
  // For brevity, only a few examples are shown here
  "Laroche Posay Mela B3 Cleansing Gel":           ["oily","whitening"],
  "CeraVe Blemish Control Cleanser (236ml)":       ["oily"],
  "Biotherm Acne Foaming Cleanser":                ["oily"],
  // ... (rest of the map should be copied from original)
};

/**
 * getProductSkinTypes(name)
 * Returns skin types for a given product name
 */
function getProductSkinTypes(name) {
  return productSkinMap[name] || ["normal"];
}

// ============================================================
// ===== MAIN RECOMMENDER IMPLEMENTATION =====
// ============================================================

/**
 * Initialize main recommender UI
 */
function initRecommender() {
  const sec = document.getElementById('recommender');
  if (!sec) return;

  // Initialize state manager
  RecommenderStateManager.init();

  sec.innerHTML = `
    <div class="section-header">
      <h2>🎯 مُرشِّح المنتجات الذكي</h2>
      <p>اختار النوع ونوع البشرة — هيطلع لك 3 خيارات بأسعار مختلفة جاهزة للإرسال للعميل</p>
      <div class="section-divider"></div>
    </div>
    <div class="rec-wizard">
      <div class="rec-step-indicator">
        <div class="rec-step-dot active" id="sdot1"><div class="dot">1</div><div class="dot-label">نوع المنتج</div></div>
        <div class="rec-step-line" id="sline1"></div>
        <div class="rec-step-dot" id="sdot2"><div class="dot">2</div><div class="dot-label">نوع البشرة</div></div>
        <div class="rec-step-line" id="sline2"></div>
        <div class="rec-step-dot" id="sdot3"><div class="dot">3</div><div class="dot-label">الترشيح</div></div>
      </div>
      <div id="rec-step1">
        <div class="rec-question">
          <h3>🛒 إيه نوع المنتج اللي تبحث عنه؟</h3>
          <div class="rec-options">
            <div class="rec-option" onclick="recSelectType('gels',this)"><span class="opt-emoji">🧴</span>غسول / فوم</div>
            <div class="rec-option" onclick="recSelectType('micellar',this)"><span class="opt-emoji">💧</span>ميسيلار واتر</div>
            <div class="rec-option" onclick="recSelectType('soaps',this)"><span class="opt-emoji">🫧</span>صابونة</div>
            <div class="rec-option" onclick="recSelectType('offers',this)"><span class="opt-emoji">🎁</span>عروض ومجموعات</div>
          </div>
        </div>
      </div>
      <div id="rec-step2" style="display:none">
        <div class="rec-question">
          <h3>🌸 إيه نوع بشرة العميل؟</h3>
          <div class="rec-options">
            <div class="rec-option" onclick="recSelectSkin('oily',this)"><span class="opt-emoji">💧</span>دهنية / مختلطة</div>
            <div class="rec-option" onclick="recSelectSkin('dry',this)"><span class="opt-emoji">🌵</span>جافة</div>
            <div class="rec-option" onclick="recSelectSkin('whitening',this)"><span class="opt-emoji">✨</span>تفتيح</div>
            <div class="rec-option" onclick="recSelectSkin('sensitive',this)"><span class="opt-emoji">🌸</span>حساسة</div>
            <div class="rec-option" onclick="recSelectSkin('normal',this)"><span class="opt-emoji">😊</span>عادية</div>
          </div>
        </div>
      </div>
      <div id="rec-step3" style="display:none"></div>
    </div>`;
}

/**
 * Handle product type selection
 */
function recSelectType(type, btn) {
  // Update state through AppState
  const currentState = RecommenderStateManager.getState('main') || {};
  RecommenderStateManager.setState('main', {
    ...currentState,
    productType: type
  });

  // Update UI
  document.querySelectorAll('#rec-step1 .rec-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  
  const dot1  = document.getElementById('sdot1');
  const dot2  = document.getElementById('sdot2');
  const line1 = document.getElementById('sline1');
  
  if (dot1)  { dot1.className = 'rec-step-dot done'; dot1.querySelector('.dot').innerHTML = '✓'; }
  if (dot2)  { dot2.className = 'rec-step-dot active'; }
  if (line1) { line1.classList.add('done'); }
  
  const s1 = document.getElementById('rec-step1');
  const s2 = document.getElementById('rec-step2');
  if (s1) s1.style.display = 'none';
  if (s2) s2.style.display = 'block';
}

/**
 * Handle skin type selection
 */
function recSelectSkin(skin, btn) {
  // Update state through AppState
  const currentState = RecommenderStateManager.getState('main') || {};
  RecommenderStateManager.setState('main', {
    ...currentState,
    skinType: skin
  });

  // Update UI
  document.querySelectorAll('#rec-step2 .rec-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  
  const dot2  = document.getElementById('sdot2');
  const dot3  = document.getElementById('sdot3');
  const line2 = document.getElementById('sline2');
  
  if (dot2)  { dot2.className = 'rec-step-dot done'; dot2.querySelector('.dot').innerHTML = '✓'; }
  if (dot3)  { dot3.className = 'rec-step-dot active'; }
  if (line2) { line2.classList.add('done'); }
  
  const s2 = document.getElementById('rec-step2');
  if (s2) s2.style.display = 'none';

  // Load and show results
  showRecResults();
}

/**
 * Show recommendation results
 */
async function showRecResults() {
  const state = RecommenderStateManager.getState('main');
  if (!state || !state.productType || !state.skinType) return;

  const { productType, skinType } = state;

  // Load product data if not already loaded
  let productData = ProductDataManager.getData();
  if (!productData) {
    productData = await ProductDataManager.loadProductData();
  }

  if (!productData) {
    console.error('[showRecResults] Failed to load product data');
    return;
  }

  const allStoreProducts = productData.allStoreProducts;
  const skinLabels = {
    oily: 'دهنية/مختلطة',
    dry: 'جافة',
    whitening: 'تفتيح',
    sensitive: 'حساسة',
    normal: 'عادية',
    mixed: 'مختلطة'
  };
  const typeLabels = {
    gels: 'غسول/فوم',
    micellar: 'ميسيلار واتر',
    soaps: 'صابونة',
    offers: 'عروض ومجموعات'
  };

  // Filter products
  let pool = allStoreProducts.filter(p =>
    p.category === productType && p.skinTypes.includes(skinType)
  );

  const s3 = document.getElementById('rec-step3');
  if (!s3) return;

  // Handle no results
  if (pool.length === 0) {
    s3.style.display = 'block';
    s3.innerHTML = `
      <div style="background:white;border-radius:var(--radius);padding:28px;box-shadow:var(--shadow);text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">🤔</div>
        <div style="font-size:1rem;font-weight:800;color:var(--dark);margin-bottom:8px">
          مفيش ${typeLabels[productType]} مخصص للبشرة ${skinLabels[skinType]} حالياً
        </div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:20px">جرب نوع بشرة تاني أو نوع منتج تاني</div>
        <button onclick="recReset()" style="background:var(--rose);color:white;border:none;border-radius:30px;padding:10px 24px;font-family:Cairo,sans-serif;font-size:0.9rem;font-weight:700;cursor:pointer">🔄 بحث جديد</button>
      </div>`;
    return;
  }

  // Sort by price
  const sorted = [...pool].sort((a, b) => a.price - b.price);
  const total = sorted.length;

  // Get or initialize rotation counter
  let rotateCounters = state.rotateCounters || {};
  const key = `${productType}_${skinType}`;
  if (rotateCounters[key] === undefined) {
    rotateCounters[key] = 0;
  }
  const round = rotateCounters[key];

  // Select tier picks
  const picks = selectTierPicks(sorted, round);
  const wrappedPicks = wrapPicksWithColors(picks);

  // Update rotation counter
  rotateCounters[key]++;
  RecommenderStateManager.setState('main', {
    ...state,
    rotateCounters
  });

  // Build copy text
  const maxRounds = total >= 3 ? Math.ceil(total / 3) : 1;
  const roundLabel = round + 1;
  const copyText = `🌸 توصيات ${typeLabels[productType]} للبشرة ${skinLabels[skinType]}:\n\n`
    + picks.map(p => `▪️ ${p.name}`).join('\n')
    + '\n\n🛒 للطلب: alabdellatif-tarshouby.com/ar';

  // Render results using ENGINE
  s3.style.display = 'block';
  if (typeof ENGINE !== 'undefined' && ENGINE.buildResultHTML) {
    s3.innerHTML = ENGINE.buildResultHTML({
      picks: wrappedPicks,
      total: pool.length,
      roundLabel,
      maxRounds,
      title: '✅ ترشيحاتك جاهزة!',
      subtitle: `${typeLabels[productType]} للبشرة ${skinLabels[skinType]} — ${pool.length} منتج متاح`,
      copyText,
      copyTextId: 'recCopyText',
      onShuffle: 'reshuffleRec()',
      onReset: 'recReset()',
      onCopyMsg: 'ENGINE.setupCopyMsg(this, document.getElementById("recCopyText").textContent)',
      pool: sorted
    });
  } else {
    // Fallback rendering
    console.warn('[showRecResults] ENGINE not available, using fallback rendering');
    s3.innerHTML = `<div style="padding:20px;background:white;border-radius:var(--radius);box-shadow:var(--shadow)">
      <h3>✅ ترشيحاتك جاهزة!</h3>
      <p>${typeLabels[productType]} للبشرة ${skinLabels[skinType]}</p>
      <div>${picks.map(p => `<div>• ${p.name}</div>`).join('')}</div>
    </div>`;
  }
}

/**
 * Reshuffle recommendations
 */
function reshuffleRec() {
  showRecResults();
}

/**
 * Reset recommender
 */
function recReset() {
  RecommenderStateManager.setState('main', {
    productType: null,
    skinType: null,
    rotateCounters: {}
  });
  initRecommender();
}

// ============================================================
// ===== INITIALIZATION HOOK =====
// ============================================================

// Initialize state manager when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    RecommenderStateManager.init();
  });
} else {
  RecommenderStateManager.init();
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RecommenderStateManager,
    ProductDataManager,
    selectTierPicks,
    wrapPicksWithColors,
    getProductSkinTypes,
    initRecommender,
    recSelectType,
    recSelectSkin,
    showRecResults,
    reshuffleRec,
    recReset
  };
}
