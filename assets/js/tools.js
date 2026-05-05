/**
 * tools-refactored.js
 * 
 * Enhanced version of tools.js with deeper DataLayer and AppState integration.
 * 
 * IMPROVEMENTS:
 * ✅ Training scenarios loaded via DataLayer
 * ✅ Training state managed via AppState (single source of truth)
 * ✅ Better separation of concerns
 * ✅ Improved error handling
 * ✅ Backward compatibility maintained
 */

// ============================================================
// ===== TRAINING STATE MANAGER =====
// ============================================================

/**
 * TrainingStateManager
 * Manages all training-related state through AppState
 */
const TrainingStateManager = (function() {
  const INITIAL_STATE = {
    current: 0,
    step: 1,
    score: 0,
    answers: [],
    categoryFilter: null,
    isComplete: false
  };

  /**
   * Initialize training state in AppState
   */
  function init() {
    if (typeof AppState === 'undefined') {
      console.warn('[TrainingStateManager] AppState not available');
      return;
    }
    
    const currentState = AppState.getState('ui.training');
    if (!currentState) {
      AppState.setState('ui.training', JSON.parse(JSON.stringify(INITIAL_STATE)));
    }
  }

  /**
   * Get complete training state
   */
  function getState() {
    if (typeof AppState === 'undefined') return null;
    return AppState.getState('ui.training');
  }

  /**
   * Update training state
   */
  function setState(newState) {
    if (typeof AppState === 'undefined') return;
    const currentState = getState() || {};
    AppState.setState('ui.training', { ...currentState, ...newState });
  }

  /**
   * Update specific training property
   */
  function updateProperty(key, value) {
    if (typeof AppState === 'undefined') return;
    const currentState = getState() || {};
    AppState.setState('ui.training', { ...currentState, [key]: value });
  }

  /**
   * Add answer to training
   */
  function addAnswer(answer) {
    if (typeof AppState === 'undefined') return;
    const currentState = getState() || {};
    const answers = currentState.answers || [];
    AppState.setState('ui.training', {
      ...currentState,
      answers: [...answers, answer]
    });
  }

  /**
   * Subscribe to training state changes
   */
  function subscribe(callback) {
    if (typeof AppState === 'undefined') return () => {};
    return AppState.subscribe(callback);
  }

  /**
   * Reset training state
   */
  function reset() {
    if (typeof AppState === 'undefined') return;
    AppState.setState('ui.training', JSON.parse(JSON.stringify(INITIAL_STATE)));
  }

  return {
    init,
    getState,
    setState,
    updateProperty,
    addAnswer,
    subscribe,
    reset,
    INITIAL_STATE
  };
})();

// ============================================================
// ===== TRAINING DATA MANAGER =====
// ============================================================

/**
 * TrainingDataManager
 * Handles fetching and processing training scenarios through DataLayer
 */
const TrainingDataManager = (function() {
  let _scenarios = null;
  let _loading = false;
  let _error = null;

  /**
   * Load training scenarios
   */
  async function loadScenarios() {
    if (_scenarios) return _scenarios;
    if (_loading) return null;

    _loading = true;
    _error = null;

    try {
      if (typeof DataLayer === 'undefined') {
        throw new Error('DataLayer not available');
      }

      const data = await DataLayer.fetch('trainingScenarios');
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid training scenarios data format');
      }

      _scenarios = data;

      // Update AppState with scenarios
      if (typeof AppState !== 'undefined') {
        AppState.setState('data.trainingScenarios', data);
      }

      console.log('[TrainingDataManager] Successfully loaded training scenarios:', data.length, 'scenarios');
      return _scenarios;
    } catch (error) {
      _error = error;
      console.error('[TrainingDataManager] Error loading training scenarios:', error);
      
      // Dispatch error event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cosmo:training-error', {
          detail: { error, message: error.message }
        }));
      }
      
      return null;
    } finally {
      _loading = false;
    }
  }

  /**
   * Get scenarios
   */
  function getScenarios() {
    return _scenarios;
  }

  /**
   * Get scenarios by category
   */
  function getScenariosByCategory(category) {
    if (!_scenarios) return [];
    if (category === 'all') return _scenarios;
    return _scenarios.filter(s => s.category === category);
  }

  /**
   * Get categories with counts
   */
  function getCategoriesWithCounts() {
    if (!_scenarios) return {};
    const cats = {};
    _scenarios.forEach(s => {
      cats[s.category] = (cats[s.category] || 0) + 1;
    });
    return cats;
  }

  /**
   * Clear cache
   */
  function clearCache() {
    _scenarios = null;
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
    loadScenarios,
    getScenarios,
    getScenariosByCategory,
    getCategoriesWithCounts,
    clearCache,
    isLoading,
    getError
  };
})();

// ============================================================
// ===== TRAINING SYSTEM =====
// ============================================================

/**
 * Initialize training state and data managers
 */
function initializeTrainingSystem() {
  TrainingStateManager.init();
  
  // Load training scenarios on demand
  if (typeof DataLayer !== 'undefined') {
    TrainingDataManager.loadScenarios().catch(error => {
      console.error('[initializeTrainingSystem] Failed to load scenarios:', error);
    });
  }
}

/**
 * Register training section with NavigationController (Phase 5c)
 * Replaces the SectionDataMap assignment pattern.
 */
document.addEventListener('DOMContentLoaded', function() {
  if (typeof NavigationController !== 'undefined') {
    NavigationController.registerSection('training', {
      dataFn: function() {
        TrainingDataManager.loadScenarios().catch(function(e) {
          console.error('[Training] Preload failed:', e);
        });
      },
      initFn: function() {
        if (typeof showTrainingMenu === 'function') showTrainingMenu();
      }
    });
  }

  // Initialize training state manager
  initializeTrainingSystem();
});


/**
 * Initialize training with optional category filter
 */
function initTraining(categoryFilter) {
  // Update state through AppState
  TrainingStateManager.setState({
    current: 0,
    step: 1,
    score: 0,
    answers: [],
    categoryFilter: categoryFilter || null,
    isComplete: false
  });

  // Get scenarios from TrainingDataManager (single source of truth)
  const scenarios = TrainingDataManager.getScenarios();

  if (!scenarios || scenarios.length === 0) {
    console.warn('[initTraining] No scenarios available');
    return;
  }

  // Filter by category and store in AppState (replaces window._filteredScenarios)
  const filtered = (categoryFilter && categoryFilter !== 'all')
    ? scenarios.filter(s => s.category === categoryFilter)
    : scenarios;

  if (typeof AppState !== 'undefined') {
    AppState.setState('ui.training', {
      ...AppState.getState('ui.training'),
      filteredScenarios: filtered
    });
  }

  renderTrainingScenario();
}

/**
 * Render current training scenario
 */
function renderTrainingScenario() {
  const el = document.getElementById('training-content');
  if (!el) return;

  const state = TrainingStateManager.getState();
  if (!state) {
    console.error('[renderTrainingScenario] Training state not available');
    return;
  }

  const scenarios = (typeof AppState !== 'undefined' && AppState.getState('ui.training') && AppState.getState('ui.training').filteredScenarios) || TrainingDataManager.getScenarios();
  const total = scenarios.length;
  const idx = state.current;

  // Check if training is complete
  if (idx >= total) {
    renderTrainingResults();
    return;
  }

  const sc = scenarios[idx];
  const step = state.step;
  const qdata = step === 1 ? sc.step1 : sc.step2;
  const progress = Math.round(((idx * 2 + (step - 1)) / (total * 2)) * 100);

  // Build progress dots
  let dotsHTML = '';
  for (let i = 0; i < total; i++) {
    const col = i < idx ? '#27ae60' : (i === idx ? 'var(--rose)' : 'var(--border)');
    dotsHTML += '<div style="width:24px;height:24px;border-radius:50%;background:' + col + ';display:flex;align-items:center;justify-content:center;font-size:0.68rem;font-weight:800;color:white;flex-shrink:0">' + (i+1) + '</div>';
    if (i < total - 1) {
      dotsHTML += '<div style="flex:1;height:3px;background:' + (i < idx ? '#27ae60' : 'var(--border)') + ';border-radius:3px"></div>';
    }
  }

  // Build options
  let optionsHTML = '';
  qdata.options.forEach(function(opt, i) {
    optionsHTML += '<button class="rec-option" onclick="trainingAnswer(' + i + ')" style="text-align:right;padding:14px 18px;font-size:0.88rem;line-height:1.5;height:auto;white-space:normal">' + opt.text + '</button>';
  });

  el.innerHTML =
    '<div style="background:white;border-radius:var(--radius);padding:20px 24px;box-shadow:var(--shadow);margin-bottom:20px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
    + '<div style="font-size:0.82rem;font-weight:700;color:var(--text-muted)">' + sc.category + ' — سيناريو ' + (idx+1) + ' من ' + total + ' (خطوة ' + step + '/2)</div>'
    + '<div style="font-size:0.82rem;font-weight:700;color:var(--rose)">' + progress + '%</div>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:4px;overflow-x:auto">' + dotsHTML + '</div>'
    + '<div style="height:6px;background:var(--border);border-radius:3px;margin-top:12px;overflow:hidden"><div style="height:100%;width:' + progress + '%;background:linear-gradient(90deg,var(--rose),var(--gold));border-radius:3px;transition:width 0.4s"></div></div>'
    + '</div>'
    + '<div style="background:linear-gradient(135deg,#fde8ee,#fff8f2);border:2px solid var(--rose-light);border-radius:var(--radius);padding:24px;margin-bottom:20px">'
    + '<div style="font-size:0.75rem;font-weight:800;color:var(--rose-dark);margin-bottom:10px">🎭 ' + sc.title + '</div>'
    + '<div style="font-size:0.92rem;line-height:1.8;color:var(--dark)">' + sc.client + '</div>'
    + '</div>'
    + '<div id="training-question-box" style="background:white;border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);border-right:4px solid ' + (step===1 ? 'var(--rose)' : 'var(--gold)') + '">'
    + '<div style="font-size:1rem;font-weight:800;color:var(--dark);margin-bottom:18px">' + qdata.question + '</div>'
    + '<div class="rec-options" style="grid-template-columns:1fr 1fr;gap:10px">' + optionsHTML + '</div>'
    + '</div>';
}

/**
 * Handle training answer
 */
function trainingAnswer(optIdx) {
  const scenarios = (typeof AppState !== 'undefined' && AppState.getState('ui.training') && AppState.getState('ui.training').filteredScenarios) || TrainingDataManager.getScenarios();
  const state = TrainingStateManager.getState();
  
  if (!state || !scenarios) return;

  const idx = state.current;
  const sc = scenarios[idx];
  const step = state.step;
  const qdata = step === 1 ? sc.step1 : sc.step2;
  const opt = qdata.options[optIdx];

  if (!opt) return;

  // Record answer
  const answer = {
    scenarioIdx: idx,
    step,
    optIdx,
    correct: opt.correct || false,
    text: opt.text
  };

  TrainingStateManager.addAnswer(answer);

  // Update score if correct
  if (opt.correct) {
    TrainingStateManager.updateProperty('score', state.score + 1);
  }

  // Move to next step or scenario
  if (step === 1) {
    TrainingStateManager.updateProperty('step', 2);
  } else {
    TrainingStateManager.setState({
      current: idx + 1,
      step: 1
    });
  }

  renderTrainingScenario();
}

/**
 * Render training results
 */
function renderTrainingResults() {
  const el = document.getElementById('training-content');
  if (!el) return;

  const state = TrainingStateManager.getState();
  if (!state) return;

  const scenarios = (typeof AppState !== 'undefined' && AppState.getState('ui.training') && AppState.getState('ui.training').filteredScenarios) || TrainingDataManager.getScenarios();
  const total = scenarios.length;
  const score = state.score;
  const pct = Math.round((score / total) * 100);

  let grade, gradeColor, gradeMsg;
  if (pct >= 90) {
    grade = '🏆 ممتاز';
    gradeColor = '#27ae60';
    gradeMsg = 'أنت محترف! معرفتك بالمنتجات والعروض ممتازة جداً.';
  } else if (pct >= 80) {
    grade = '⭐ جيد جداً';
    gradeColor = '#2ecc71';
    gradeMsg = 'أداء رائع! تحتاج فقط تركيز أكثر على بعض التفاصيل.';
  } else if (pct >= 70) {
    grade = '👍 جيد';
    gradeColor = '#f39c12';
    gradeMsg = 'أداء جيدة، لكن تحتاج تركيز أكثر على المنتجات والعروض.';
  } else if (pct >= 60) {
    grade = '📚 مقبول';
    gradeColor = '#e67e22';
    gradeMsg = 'تحتاج تركيز أكثر. راجع المنتجات والعروض وحاول تاني.';
  } else {
    grade = '💪 ابدأ من جديد';
    gradeColor = '#e74c3c';
    gradeMsg = 'تحتاج تركيز أكثر على دراسة المنتجات والعروض قبل التدريب.';
  }

  // Build breakdown
  const breakdown = (state.answers || []).map(function(a2) {
    const sc = scenarios[a2.scenarioIdx];
    return '<div style="padding:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'
      + '<div style="font-size:0.85rem;color:var(--text)">' + sc.title + ' (خطوة ' + a2.step + ')</div>'
      + (a2.text ? '<span style="background:' + (a2.correct?'#d4edda':'#f8d7da') + ';color:' + (a2.correct?'#27ae60':'#e74c3c') + ';padding:3px 10px;border-radius:10px;font-weight:700">توصية ' + (a2.correct?'✅':'❌') + '</span>' : '')
      + '</div>';
  }).join('');

  el.innerHTML =
    '<div style="text-align:center;padding:40px 20px;background:white;border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:20px">'
    + '<div style="font-size:4rem;margin-bottom:12px">' + grade.split(' ')[0] + '</div>'
    + '<div style="font-size:1.5rem;font-weight:900;color:' + gradeColor + ';margin-bottom:6px">' + grade.split(' ').slice(1).join(' ') + '</div>'
    + '<div style="font-size:2.5rem;font-weight:900;color:var(--dark);margin:16px 0">' + score + ' / ' + total + '</div>'
    + '<div style="font-size:1rem;color:var(--text-muted);margin-bottom:6px">' + pct + '% إجابات صح</div>'
    + '<div style="font-size:0.9rem;color:var(--text);max-width:400px;margin:0 auto 24px;line-height:1.7">' + gradeMsg + '</div>'
    + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'
    + '<button id="retry-btn" style="background:linear-gradient(135deg,var(--rose),var(--rose-dark));color:white;border:none;padding:12px 28px;border-radius:30px;font-family:Cairo,sans-serif;font-size:0.92rem;font-weight:700;cursor:pointer">🔄 حاول تاني</button>'
    + '<button id="menu-btn" style="background:white;border:2px solid var(--border);color:var(--text);padding:12px 28px;border-radius:30px;font-family:Cairo,sans-serif;font-size:0.92rem;font-weight:700;cursor:pointer">🏠 القائمة الرئيسية</button>'
    + '</div></div>'
    + '<div style="background:white;border-radius:var(--radius);padding:20px 24px;box-shadow:var(--shadow)">'
    + '<div style="font-size:0.95rem;font-weight:800;color:var(--dark);margin-bottom:14px">📊 تفاصيل إجاباتك</div>'
    + breakdown
    + '</div>';

  document.getElementById('retry-btn').addEventListener('click', function() {
    const currentFilter = state.categoryFilter;
    initTraining(currentFilter);
  });

  document.getElementById('menu-btn').addEventListener('click', showTrainingMenu);

  // Update state to mark as complete
  TrainingStateManager.updateProperty('isComplete', true);
}

/**
 * Show training menu
 */
function showTrainingMenu() {
  const el = document.getElementById('training-content');
  if (!el) return;

  const scenarios = TrainingDataManager.getScenarios();

  if (!scenarios || scenarios.length === 0) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">جاري تحميل السيناريوهات...</div>';
    return;
  }

  const cats = {};
  scenarios.forEach(s => {
    cats[s.category] = (cats[s.category] || 0) + 1;
  });

  el.innerHTML = '<div style="background:linear-gradient(135deg,#fde8ee,#fff8f2);border:2px solid var(--rose-light);border-radius:var(--radius);padding:28px;margin-bottom:20px;text-align:center">'
    + '<div style="font-size:2.5rem;margin-bottom:8px">&#127891;</div>'
    + '<div style="font-size:1.2rem;font-weight:900;color:var(--dark);margin-bottom:4px">التدريب التفاعلي</div>'
    + '<div style="font-size:0.88rem;color:var(--text-muted)">' + scenarios.length + ' سيناريو — ' + Object.keys(cats).length + ' أقسام — اختار القسم اللي تحب تتدرب عليه</div>'
    + '</div>'
    + '<div id="training-cat-btns" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:16px"></div>'
    + '<div id="training-all-wrap"></div>';

  const grid = document.getElementById('training-cat-btns');
  Object.keys(cats).forEach(function(cat) {
    const count = cats[cat];
    const btn = document.createElement('button');
    btn.style.cssText = 'background:white;border:2px solid var(--border);border-radius:10px;padding:14px 16px;font-family:Cairo,sans-serif;font-size:0.88rem;font-weight:700;cursor:pointer;color:var(--dark);text-align:right;width:100%;transition:all 0.2s';
    btn.innerHTML = cat + ' <span style="color:var(--text-muted);font-weight:500">(' + count + ' سيناريو)</span>';
    btn.addEventListener('mouseover', function() {
      this.style.borderColor = 'var(--rose)';
      this.style.background = '#fef2f6';
    });
    btn.addEventListener('mouseout', function() {
      this.style.borderColor = 'var(--border)';
      this.style.background = 'white';
    });
    (function(c) {
      btn.addEventListener('click', function() {
        initTraining(c);
      });
    })(cat);
    grid.appendChild(btn);
  });

  const allBtn = document.createElement('button');
  allBtn.style.cssText = 'width:100%;background:linear-gradient(135deg,var(--rose),var(--rose-dark));color:white;border:none;padding:14px;border-radius:var(--radius-sm);font-family:Cairo,sans-serif;font-size:0.95rem;font-weight:800;cursor:pointer';
  allBtn.textContent = '🚀 ابدأ كل السيناريوهات (' + scenarios.length + ' سيناريو)';
  allBtn.addEventListener('click', function() {
    initTraining('all');
  });
  document.getElementById('training-all-wrap').appendChild(allBtn);
}

// ============================================================
// ===== PRODUCT COMPARISON & OFFERS CALCULATOR =====
// ============================================================

// Note: The product comparison and offers calculator functions
// remain largely unchanged as they don't directly interact with
// DataLayer or AppState. They can be kept as-is from the original tools.js

// Format currency
function fmt(n) {
  if (!n) return '0';
  return Math.round(n).toLocaleString('ar-EG');
}

/**
 * Calculate offers (remains from original)
 */
function calculateOffers(type, prices) {
  var result = document.getElementById('offers-result');
  if (!result) return;
  
  var lines = [];
  var totalBefore = 0, totalAfter = 0;
  
  if (type === '1+1') {
    for (var i = 0; i < prices.length; i += 2) {
      var p1 = prices[i];
      var p2 = prices[i+1];
      if (p1 === undefined) break;
      totalBefore += p1;
      totalAfter += p1;
      lines.push({ label: 'قطعة ' + (i+1), before: p1, after: p1, saving: 0 });
      if (p2 !== undefined) {
        totalBefore += p2;
        lines.push({ label: 'قطعة ' + (i+2) + ' (مجانية)', before: p2, after: 0, saving: p2 });
      }
    }
  } else if (type === '1+2') {
    for (var i = 0; i < prices.length; i += 3) {
      var p1 = prices[i];
      if (p1 === undefined) break;
      totalBefore += p1;
      totalAfter += p1;
      lines.push({ label: 'قطعة ' + (i+1), before: p1, after: p1, saving: 0 });
      if (prices[i+1] !== undefined) {
        var p2 = prices[i+1];
        totalBefore += p2;
        lines.push({ label: 'قطعة ' + (i+2) + ' (مجانية)', before: p2, after: 0, saving: p2 });
      }
      if (prices[i+2] !== undefined) {
        var p3 = prices[i+2];
        totalBefore += p3;
        lines.push({ label: 'قطعة ' + (i+3) + ' (المجانية)', before: p3, after: 0, saving: p3 });
      }
    }
  } else if (type === '2+2') {
    for (var i = 0; i < prices.length; i += 4) {
      [0,1,2,3].forEach(function(j) {
        if (prices[i+j] === undefined) return;
        var p = prices[i+j], free = j >= 2;
        totalBefore += p;
        totalAfter += free ? 0 : p;
        lines.push({ label: 'قطعة ' + (i+j+1) + (free ? ' (مجانية)' : ''), before: p, after: free ? 0 : p, saving: free ? p : 0 });
      });
    }
  } else if (type.indexOf('s') !== -1) {
    var disc = parseFloat(type.replace('1+', '').replace('s', '')) / 100;
    for (var i = 0; i < prices.length; i += 2) {
      var p1 = prices[i], p2 = prices[i+1] !== undefined ? prices[i+1] : null;
      totalBefore += p1 + (p2 || 0);
      totalAfter += p1 + (p2 ? p2 * (1 - disc) : 0);
      lines.push({ label: 'قطعة ' + (i+1), before: p1, after: p1, saving: 0 });
      if (p2 !== null) {
        var save = p2 * disc;
        lines.push({ label: 'قطعة ' + (i+2) + ' (بعد الخصم)', before: p2, after: p2 - save, saving: save });
      }
    }
  } else if (type.charAt(0) === 'd') {
    var disc = parseFloat(type.replace('d', '')) / 100;
    prices.forEach(function(p, i) {
      var save = p * disc;
      totalBefore += p;
      totalAfter += p - save;
      lines.push({ label: 'قطعة ' + (i+1), before: p, after: p - save, saving: save });
    });
  }
  
  var totalSaving = totalBefore - totalAfter;
  var savingPct = totalBefore > 0 ? ((totalSaving / totalBefore) * 100).toFixed(1) : 0;
  var rowsHTML = lines.map(function(l) {
    return '<tr>'
      + '<td style="padding:10px 14px;font-weight:700;color:var(--dark);border-bottom:1px solid var(--border)">' + l.label + '</td>'
      + '<td style="padding:10px 14px;text-align:center;border-bottom:1px solid var(--border);color:var(--text-muted);text-decoration:' + (l.saving > 0 ? 'line-through' : 'none') + '">' + fmt(l.before) + ' ج</td>'
      + '<td style="padding:10px 14px;text-align:center;border-bottom:1px solid var(--border);font-weight:900;color:' + (l.saving > 0 ? '#27ae60' : 'var(--dark)') + '">' + (l.after === 0 ? '<span style="color:#27ae60">مجاناً</span>' : fmt(l.after) + ' ج') + '</td>'
      + '<td style="padding:10px 14px;text-align:center;border-bottom:1px solid var(--border);color:#27ae60;font-weight:700">' + (l.saving > 0 ? '− ' + fmt(l.saving) + ' ج' : '—') + '</td>'
      + '</tr>';
  }).join('');
  
  var copyMsg = 'تفاصيل العرض\n══════════════\n'
    + lines.map(function(l) {
      return l.label + ': ' + (l.after === 0 ? 'مجانا' : fmt(l.after) + ' جنيه') + (l.saving > 0 && l.after > 0 ? ' (وفرت ' + fmt(l.saving) + ' ج)' : '');
    }).join('\n')
    + '\n══════════════\n'
    + 'الاجمالي قبل: ' + fmt(totalBefore) + ' جنيه\n'
    + 'الاجمالي بعد: ' + fmt(totalAfter) + ' جنيه\n'
    + 'التوفير: ' + fmt(totalSaving) + ' جنيه (' + savingPct + '%)\n'
    + '══════════════\n للطلب: alabdellatif-tarshouby.com/ar';
  
  result.innerHTML =
    '<div style="background:white;border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;margin-bottom:16px">'
    + '<table style="width:100%;border-collapse:collapse;font-size:0.88rem">'
    + '<thead><tr>'
    + '<th style="background:var(--dark);color:white;padding:11px 14px;text-align:right">القطعة</th>'
    + '<th style="background:var(--dark);color:white;padding:11px 14px;text-align:center">السعر الأصلي</th>'
    + '<th style="background:var(--rose);color:white;padding:11px 14px;text-align:center">بعد العرض</th>'
    + '<th style="background:#27ae60;color:white;padding:11px 14px;text-align:center">التوفير</th>'
    + '</tr></thead><tbody>' + rowsHTML + '</tbody>'
    + '<tfoot><tr>'
    + '<td colspan="2" style="padding:12px 14px;font-weight:900;color:var(--dark);background:#faf7f9">الإجمالي</td>'
    + '<td style="padding:12px 14px;text-align:center;font-weight:900;font-size:1.1rem;color:var(--rose-dark);background:#faf7f9">' + fmt(totalAfter) + ' ج</td>'
    + '<td style="padding:12px 14px;text-align:center;font-weight:900;color:#27ae60;background:#faf7f9">− ' + fmt(totalSaving) + ' ج<div style="font-size:0.72rem">(' + savingPct + '%)</div></td>'
    + '</tr></tfoot>'
    + '</table></div>'
    + '<div class="rec-copy-box">'
    + '<button id="offers-copy-btn" class="rec-copy-btn">نسخ العرض للعميل</button>'
    + '<pre id="offersCopyText" style="font-size:0.78rem">' + copyMsg + '</pre>'
    + '</div>';
  
  document.getElementById('offers-copy-btn').addEventListener('click', function() {
    var text = document.getElementById('offersCopyText').textContent;
    var btn = this;
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = 'تم النسخ!';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.textContent = 'نسخ العرض للعميل';
        btn.classList.remove('copied');
      }, 2500);
    }).catch(function() {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = 'تم النسخ!';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.textContent = 'نسخ العرض للعميل';
        btn.classList.remove('copied');
      }, 2500);
    });
  });
}

// ============================================================
// ===== EXPORTS =====
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TrainingStateManager,
    TrainingDataManager,
    initializeTrainingSystem,
    initTraining,
    renderTrainingScenario,
    trainingAnswer,
    renderTrainingResults,
    showTrainingMenu,
    calculateOffers
  };
}

// ============================================================
// ===== PRODUCT COMPARISON — initComparison =====
// ============================================================

window.initComparison = function initComparison() {
  var section = document.getElementById('comparison');
  if (!section) return;

  // Only build once
  if (section.dataset.built === '1') return;
  section.dataset.built = '1';

  // Load products data
  var allProds = [];
  if (typeof AppState !== 'undefined') {
    var pd = AppState.getData ? AppState.getData('products') : null;
    if (pd) {
      Object.keys(pd).forEach(function(cat) {
        var catData = pd[cat];
        Object.keys(catData).forEach(function(skin) {
          (catData[skin] || []).forEach(function(p) {
            allProds.push(Object.assign({}, p, { _cat: cat, _skin: skin }));
          });
        });
      });
    }
  }

  section.innerHTML = `
    <div class="section-header">
      <h2>⚖️ مقارنة المنتجات</h2>
      <p class="section-subtitle">اختر منتجين لمقارنتهما جنباً إلى جنب</p>
    </div>

    <div class="comparison-selects" style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <label style="display:block;font-weight:bold;margin-bottom:6px;">المنتج الأول</label>
        <select id="comp-sel-a" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd;font-size:0.95rem;" onchange="renderComparison()">
          <option value="">— اختر —</option>
          ${allProds.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1;min-width:200px;">
        <label style="display:block;font-weight:bold;margin-bottom:6px;">المنتج الثاني</label>
        <select id="comp-sel-b" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd;font-size:0.95rem;" onchange="renderComparison()">
          <option value="">— اختر —</option>
          ${allProds.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="comp-result"></div>
  `;

  // Store products list for renderComparison
  window._comparisonProds = allProds;
};

window.renderComparison = function renderComparison() {
  var prods = window._comparisonProds || [];
  var selA  = document.getElementById('comp-sel-a');
  var selB  = document.getElementById('comp-sel-b');
  var result= document.getElementById('comp-result');
  if (!selA || !selB || !result) return;

  var idxA = selA.value;
  var idxB = selB.value;

  if (idxA === '' || idxB === '') {
    result.innerHTML = '<p style="color:#888;text-align:center;">اختر منتجين لتبدأ المقارنة</p>';
    return;
  }

  var a = prods[idxA];
  var b = prods[idxB];

  var catLabels = { cleansers:'غسول', toners:'تونر', moisturizers:'مرطب', sunscreens:'واقي شمس',
    acne:'حبوب', whitening:'تفتيح', eye:'محيط العين', wrinkles:'مضاد تقدم السن',
    hair_products:'شعر', special:'خاص', masks:'ماسك', scrubs:'مقشر' };

  function card(p) {
    return `<div style="flex:1;background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:20px;min-width:200px;">
      <div style="font-size:1.1rem;font-weight:bold;color:#c41e5b;margin-bottom:10px;">${p.name}</div>
      <div style="margin-bottom:6px;"><span style="color:#888">النوع:</span> <strong>${p.type||'—'}</strong></div>
      <div style="margin-bottom:6px;"><span style="color:#888">للاستخدام:</span> <strong>${p.use||'—'}</strong></div>
      <div style="margin-bottom:6px;"><span style="color:#888">الفئة:</span> <strong>${catLabels[p._cat]||p._cat}</strong></div>
      <div style="margin-bottom:6px;"><span style="color:#888">البشرة:</span> <strong>${p._skin||'—'}</strong></div>
      <div style="margin-top:12px;padding:10px;background:#fafafa;border-radius:8px;font-size:0.9rem;color:#555;">${p.note||''}</div>
    </div>`;
  }

  result.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;">
      ${card(a)}
      <div style="display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:bold;color:#c41e5b;">VS</div>
      ${card(b)}
    </div>
  `;
};
