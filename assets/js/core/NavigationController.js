/**
 * NavigationController.js
 * Single entry point for all navigation in Cosmo Pro.
 *
 * Contract (linear, no hidden overrides):
 *   1. Close sidebar on mobile (explicit)
 *   2. Update nav chrome immediately (don't wait for data)
 *   3. Require data via DataLayer, then run registered section init
 *   4. Scroll to top
 *
 * All window.showSection / window.navigate calls route through
 * NavigationController.navigateTo(). Sections register via registerSection().
 */

const NavigationController = (function() {
    const SECTION_SELECTOR  = '.section';
    const NAV_ITEM_SELECTOR = '.nav-item';
    const TOPBAR_TITLE_ID   = 'topbarTitle';

    // ─── Section titles ────────────────────────────────────────────────────
    // Populated here + extended by navigation.js and recommenders.js via
    // Object.assign(NavigationController.sectionTitles, { ... })
    const sectionTitles = {
        home:              'الرئيسية',
        recommender:       '🎯 مُرشِّح المنتجات الذكي',
        prod_cleansers:    '🧴 منتجات التنظيف — مُقسَّمة بالكامل',
        prod_toners:       'ترشيحات: التونر',
        prod_moisturizers: 'ترشيحات: المرطبات',
        prod_sunscreen:    'ترشيحات: واقيات الشمس',
        prod_acne:         'ترشيحات: علاج الحبوب',
        prod_whitening:    'ترشيحات: التفتيح',
        prod_eye:          'ترشيحات: محيط العين',
        prod_wrinkles:     '✨ Anti-Aging — مضاد لعلامات التقدم في السن',
        prod_hair:         'ترشيحات: منتجات الشعر',
        prod_special:      'ترشيحات: منتجات خاصة',
        prod_dyes:         '🎨 الصبغات',
        dyes_rec:          '🎯 مرشح الصبغات الذكي',
        toner_rec:         '🎯 مرشح التونر الذكي',
        moist_rec:         '🎯 مرشح المرطبات الذكي',
        prod_masks:        '🎭 ماسكات البشرة',
        masks_rec:         '🎯 مرشح الماسكات الذكي',
        prod_scrubs:       '✨ مقشرات البشرة',
        scrubs_rec:        '🎯 مرشح المقشرات الذكي',
        eye_rec:           '👁️ مرشح محيط العين الذكي',
        acne_rec:          '💊 مرشح الحبوب الذكي',
        whitening_rec:     '🎯 مرشح التفتيح الذكي',
        antiaging_rec:     '🎯 مرشح الـ Anti-Aging الذكي',
        training:          'نظام التدريب',
        comparison:        'مقارنة المنتجات',
        personality:       'أنواع الشخصيات',
        offers_calc:       '🏷️ حاسبة العروض',
        questions:         'الأسئلة الذكية',
        fab:               'نموذج FAB',
        forbidden:         'المحظورات والبدائل',
        diag:              'تشخيص البشرة',
        skinroutine:       'روتين العناية بالبشرة',
        sunscreen:         'واقي الشمس',
        problems:          'مشاكل البشرة',
        acne:              'الحبوب وحب الشباب',
        whitening:         'التفتيح',
        haircare:          'العناية بالشعر',
        hairloss:          'تساقط الشعر',
        dandruff:          'قشرة الشعر',
        keratin:           'الكيراتين والبروتين',
        vitamins:          'الفيتامينات',
        hair_dyes_edu:     '🎨 الصبغات — دليل شامل',
        lifestyle:         'نمط الحياة',
        routines:          'روتين كامل لكل نوع بشرة',
    };

    // ─── UI helpers ────────────────────────────────────────────────────────
    function _closeSidebar() {
        var sidebar = document.getElementById('mainSidebar');
        var overlay = document.getElementById('sidebarOverlay');
        var btn     = document.getElementById('hamburgerBtn');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        if (btn)     btn.textContent = '☰';
        if (typeof AppState !== 'undefined') {
            AppState.setState('ui.sidebarOpen', false);
        }
    }

    function _updateChrome(id) {
        // Hide all sections, deactivate all nav items
        document.querySelectorAll(SECTION_SELECTOR).forEach(function(s) {
            s.classList.remove('active');
        });
        document.querySelectorAll(NAV_ITEM_SELECTOR).forEach(function(n) {
            n.classList.remove('active');
        });

        // Show target section
        var target = document.getElementById(id);
        if (target) {
            target.classList.add('active');
        } else {
            console.warn('[NavigationController] Section not found in DOM:', id);
        }

        // Update topbar title
        var titleEl = document.getElementById(TOPBAR_TITLE_ID);
        if (titleEl) {
            titleEl.textContent = sectionTitles[id] || id;
        }

        // Mark active nav item
        document.querySelectorAll(NAV_ITEM_SELECTOR).forEach(function(item) {
            var oc = item.getAttribute('onclick') || '';
            if (oc.indexOf("'" + id + "'") !== -1 || oc.indexOf('"' + id + '"') !== -1) {
                item.classList.add('active');
            }
        });

        window.scrollTo(0, 0);
    }

    // ── Section registry ────────────────────────────────────────────────
    // Replaces the global SectionDataMap + sectionRegistry variables.
    // Modules call NavigationController.registerSection(id, config) from
    // their own DOMContentLoaded handlers — no global var needed.
    //
    // Config shape:
    //   dataFn  {Function}         — called immediately on navigate (data prefetch)
    //   initFn  {Function|string}  — called after delay (render/init)
    //   delay   {number}           — ms before initFn runs (default: 50)
    const _registry = {};

    function registerSection(id, config) {
        _registry[id] = config;
    }

    // ─── Core navigate ─────────────────────────────────────────────────────
    function navigateTo(id) {
        // 1. Close mobile sidebar
        if (window.innerWidth <= 768) _closeSidebar();

        // 2. Update nav chrome immediately (no data wait)
        _updateChrome(id);

        // 3. Update AppState
        if (typeof AppState !== 'undefined') {
            AppState.setState('navigation.currentSection', id);
        }

        // 4. Dispatch data + init via _registry (replaces SectionDataMap + sectionRegistry)
        var reg = _registry[id];
        if (reg) {
            // dataFn: prefetch / load data immediately (no delay)
            if (typeof reg.dataFn === 'function') reg.dataFn();

            // initFn: render/init after delay for DOM readiness
            var initFn = reg.initFn;
            if (initFn) {
                var delay = reg.delay || 50;
                setTimeout(function() {
                    var fn = (typeof initFn === 'function')
                        ? initFn
                        : (typeof window[initFn] === 'function' ? window[initFn] : null);
                    if (fn) fn();
                }, delay);
            }
        }

    }

    // ─── Init ──────────────────────────────────────────────────────────────
    // NOTE: We intentionally do NOT subscribe to AppState.navigation.currentSection
    // here to avoid a feedback loop:
    //   navigateTo() → AppState.setState('navigation.currentSection') → subscriber
    //   → _updateChrome() again → potential double-render / loop.
    //
    // navigateTo() calls _updateChrome() directly (synchronously) and then writes
    // to AppState so that other subscribers (analytics, etc.) stay in sync.
    // External code that needs to trigger navigation must call
    // NavigationController.navigateTo(id) — not AppState.setState directly.
    function init() {
        // Intentionally minimal — kept for API compatibility.
        // Future: could navigate to the section stored in AppState on page load.
    }

    var _lastRendered = null;

    // ── Render-state registry ───────────────────────────────────────────
    const _rendered = new Set();

    return {
        init,
        navigateTo,
        registerSection,
        sectionTitles,

        // Render-state helpers
        hasRendered:      (id) => _rendered.has(id),
        markRendered:     (id) => _rendered.add(id),
        clearRendered:    (id) => _rendered.delete(id),
        clearAllRendered: ()   => _rendered.clear(),
    };
})();

// Attach to window
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationController;
} else {
    window.NavigationController = NavigationController;

    // ── Phase 4b: single global navigation entry point ────────────────
    // All HTML onclick="navigate('x')" calls land here.
    // showSection() in navigation.js is now a 1-line safety alias only.
    window.navigate = NavigationController.navigateTo.bind(NavigationController);
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.NavigationController) NavigationController.init();
});
