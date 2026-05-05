/**
 * DataLayer.js
 * Centralized data fetching and caching module.
 * Replaces the ad-hoc fetching in products.js, dyes.js, and tools.js.
 */

const DataLayer = (function() {
    const _cache = new Map();
    const _promises = new Map();

    const ENDPOINTS = {
        products: 'assets/data/products.json',
        eyeProducts: 'assets/data/eye_products.json',
        acneProducts: 'assets/data/acne_products.json',
        antiAgingProducts: 'assets/data/anti_aging_products.json',
        whiteningStoreProducts: 'assets/data/whitening_store_products.json',
        dyesProducts: 'assets/data/dyes_products.json',
        trainingScenarios: 'assets/data/training_scenarios.json'
    };

    /**
     * Shows the global loading indicator.
     */
    function _showLoading() {
        const el = document.getElementById('cosmo-loading-indicator');
        if (el) el.style.display = 'flex';
    }

    /**
     * Hides the global loading indicator.
     */
    function _hideLoading() {
        const el = document.getElementById('cosmo-loading-indicator');
        if (el) el.style.display = 'none';
    }

    /**
     * Fetches data from a given key.
     * @param {string} key - The key from ENDPOINTS.
     * @returns {Promise<any>}
     */
    async function fetchResource(key) {
        if (_cache.has(key)) {
            return _cache.get(key);
        }

        if (_promises.has(key)) {
            return _promises.get(key);
        }

        const url = ENDPOINTS[key];
        if (!url) {
            console.error(`[DataLayer] Unknown resource key: ${key}`);
            return null;
        }

        const loadingTimer = setTimeout(_showLoading, 800);

        const promise = fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                clearTimeout(loadingTimer);
                _hideLoading();
                _cache.set(key, data);
                _promises.delete(key);
                console.log(`[DataLayer] Successfully loaded: ${key}`);
                return data;
            })
            .catch(error => {
                clearTimeout(loadingTimer);
                _hideLoading();
                _promises.delete(key);
                console.error(`[DataLayer] Error loading ${key}:`, error);
                // Trigger a custom event for UI to handle errors if needed
                window.dispatchEvent(new CustomEvent('cosmo:data-error', { detail: { key, error } }));
                throw error;
            });

        _promises.set(key, promise);
        return promise;
    }

    return {
        fetch: fetchResource,
        fetchAll: (keys) => Promise.all(keys.map(fetchResource)),
        getCached: (key) => _cache.get(key),
        clearCache: () => {
            _cache.clear();
            _promises.clear();
            // Reset render-state so sections re-render with fresh data
            if (typeof NavigationController !== 'undefined') {
                NavigationController.clearAllRendered();
            }
        }
    };
})();

// Export for modern environments or attach to window for vanilla
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLayer;
} else {
    window.DataLayer = DataLayer;
}
