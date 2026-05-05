/**
 * AppState.js
 * Centralized state management for the application.
 * Provides a Single Source of Truth and change notification system.
 */

const AppState = (function() {
    // Private state object
    const _state = {
        auth: {
            isAuthenticated: false,
            user: null
        },
        navigation: {
            currentSection: 'home',
            history: []
        },
        data: {
            products: null,
            eyeProducts: null,
            acneProducts: null,
            antiAgingProducts: null,
            whiteningStoreProducts: null,
            dyesProducts: null,
            trainingScenarios: null
        },
        ui: {
            sidebarOpen: false,
            activeFilters: {},
            recommenderAnswers: {},
            // Dyes filter state (replaces window.dyesActive*)
            dyes: {
                activeType: 'all',
                activeAmmonia: 'all',
                activeBrand: 'الكل'
            },
            // Dyes recommender state (replaces window.dyesRecAnswers)
            dyesRec: {
                answers: {}
            },
            // Cleanser derived data (replaces window._cleanserData)
            cleanser: null,
            // Training section state (replaces window._filteredScenarios)
            training: {
                filteredScenarios: null
            }
        }
    };

    // Listeners for state changes
    const _listeners = new Set();

    /**
     * Deeply clones an object to prevent direct state mutation.
     * Used only for getState() and subscribe() initial call — NOT for _notify().
     */
    function _clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Lightweight shallow clone for non-data namespaces.
     * For the 'data' namespace we skip cloning entirely (read-only after setData).
     */
    function _cloneValue(v) {
        if (v === null || typeof v !== 'object') return v;
        return Object.assign(Array.isArray(v) ? [] : {}, v);
    }

    /**
     * Pending change queue — batched via queueMicrotask.
     * Each entry: { path, value }
     */
    let _pendingChanges = [];
    let _notifyScheduled = false;

    function _notify(path, value) {
        _pendingChanges.push({ path, value });
        if (_notifyScheduled) return;
        _notifyScheduled = true;

        queueMicrotask(() => {
            const changes = _pendingChanges.slice();
            _pendingChanges = [];
            _notifyScheduled = false;

            // Build a lightweight state snapshot:
            // - navigation + ui + auth: shallow-cloned (small objects)
            // - data: reference only (large JSON blobs, read-only after load)
            const snapshot = {
                auth:       Object.assign({}, _state.auth),
                navigation: Object.assign({}, _state.navigation),
                data:       _state.data,          // intentional reference — never mutated externally
                ui:         _cloneUi(_state.ui),
                _changes:   changes               // extra: listeners can inspect what changed
            };

            _listeners.forEach(callback => {
                try {
                    callback(snapshot);
                } catch (e) {
                    console.error('[AppState] Listener error:', e);
                }
            });
        });
    }

    /** Shallow-clone the ui sub-tree (one level deep is enough for our listeners). */
    function _cloneUi(ui) {
        const out = {};
        for (const k in ui) {
            const v = ui[k];
            out[k] = (v !== null && typeof v === 'object') ? Object.assign(Array.isArray(v) ? [] : {}, v) : v;
        }
        return out;
    }

    /**
     * Updates a slice of the state.
     * @param {string} path - Dot-separated path to the state slice (e.g., 'ui.sidebarOpen').
     * @param {any} value - The new value.
     */
    function setState(path, value) {
        const keys = path.split('.');
        let current = _state;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        const lastKey = keys[keys.length - 1];

        // Only update and notify if the value actually changed.
        // Avoid JSON.stringify on large data objects — use referential check first.
        const prev = current[lastKey];
        if (prev === value) return;
        if (typeof prev === 'object' && prev !== null && typeof value === 'object' && value !== null) {
            if (JSON.stringify(prev) === JSON.stringify(value)) return;
        }

        current[lastKey] = value;
        _notify(path, value);
    }

    /**
     * Gets a slice of the state.
     * @param {string} path - Dot-separated path to the state slice.
     * @returns {any} A clone of the state slice.
     */
    function getState(path) {
        if (!path) return _clone(_state);
        
        const keys = path.split('.');
        let current = _state;
        
        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return undefined;
            }
            current = current[key];
        }
        
        return (typeof current === 'object' && current !== null) ? _clone(current) : current;
    }

    /**
     * Subscribes to state changes.
     * @param {Function} callback - Function to call when state changes.
     * @returns {Function} Unsubscribe function.
     */
    function subscribe(callback) {
        _listeners.add(callback);
        // Immediate call with current state
        callback(_clone(_state));
        return () => _listeners.delete(callback);
    }

    /**
     * Reads a data cache key.
     * @param {string} key - Key from _state.data
     * @returns {any}
     */
    function getData(key) {
        return _state.data[key] !== undefined ? _state.data[key] : null;
    }

    /**
     * Writes a data cache key (write-once semantics, no change event).
     * @param {string} key
     * @param {any} value
     */
    function setData(key, value) {
        _state.data[key] = value;
        // No change event — data writes are internal to DataLayer
    }

    return {
        setState,
        getState,
        getData,
        setData,
        subscribe
    };
})();

// Export for modern environments or attach to window for vanilla
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
} else {
    window.AppState = AppState;
}
