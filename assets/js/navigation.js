// ============================================================
// navigation.js — السايدبار، التنقل، التبويبات، والتشخيص
// ============================================================

// ===== HAMBURGER MENU (MOBILE) =====
// toggleSidebar and closeSidebar defined below with AppState integration.
// Sidebar auto-close on mobile nav is now handled inside NavigationController.navigateTo().

// Update sidebar state in AppState
function toggleSidebar() {
  var sidebar = document.getElementById('mainSidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var btn     = document.getElementById('hamburgerBtn');
  var isOpen  = sidebar.classList.contains('open');

  if (typeof AppState !== 'undefined') {
    AppState.setState('ui.sidebarOpen', !isOpen);
  }

  if (isOpen) {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    btn.textContent = '☰';
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    btn.textContent = '✕';
  }
}

function closeSidebar() {
  var sidebar = document.getElementById('mainSidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var btn     = document.getElementById('hamburgerBtn');

  if (typeof AppState !== 'undefined') {
    AppState.setState('ui.sidebarOpen', false);
  }

  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  btn.textContent = '☰';
}

// Subscribe to AppState for sidebar changes
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AppState !== 'undefined') {
    AppState.subscribe(state => {
      const sidebarOpen = state.ui.sidebarOpen;
      const sidebar = document.getElementById('mainSidebar');
      const overlay = document.getElementById('sidebarOverlay');
      const btn     = document.getElementById('hamburgerBtn');

      if (sidebar && overlay && btn) {
        if (sidebarOpen) {
          sidebar.classList.add('open');
          overlay.classList.add('active');
          btn.textContent = '✕';
        } else {
          sidebar.classList.remove('open');
          overlay.classList.remove('active');
          btn.textContent = '☰';
        }
      }
    });
  }
});

window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var toast = document.getElementById('salah-toast');
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(function() {
      toast.style.transform = 'translateX(-50%) translateY(-120px)';
    }, 5000);
    toast.addEventListener('click', function() {
      toast.style.transform = 'translateX(-50%) translateY(-120px)';
    });
  }, 1000);
});

// Section titles are consolidated in NavigationController.sectionTitles.

// The rest of the functions below manage internal section state, not global navigation.

// ===== QUESTIONS TABS =====
function showQTab(id) {
  document.querySelectorAll('.questions-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.qtab').forEach(t => t.classList.remove('active'));
  document.getElementById('q-'+id).classList.add('active');
  event.target.classList.add('active');
}

// ===== SKIN TYPE TABS =====
function showSkin(type) {
  document.querySelectorAll('.skin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('skin-'+type).classList.add('active');
  event.target.classList.add('active');
}

// ===== DIAGNOSTIC =====
let diagData = {};
let currentStep = 1;

function diagNext(step, value) {
  diagData['step'+step] = value;
  document.querySelectorAll('.diag-option').forEach(o => o.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  
  setTimeout(() => {
    const nextStep = step + 1;
    document.getElementById('step'+step).classList.remove('active');
    
    if (nextStep === 4) {
      showDiagResult();
    } else {
      document.getElementById('step'+nextStep).classList.add('active');
    }
    
    updateProgress(nextStep);
    currentStep = nextStep;
  }, 400);
}

function updateProgress(step) {
  for(let i=1;i<=4;i++){
    const dot = document.getElementById('dp'+i);
    dot.className = 'dot';
    if(i < step) dot.classList.add('done');
    else if(i === step) dot.classList.add('current');
  }
}

function showDiagResult() {
  document.getElementById('step3').classList.remove('active');
  document.getElementById('step4').classList.add('active');
  
  const s1 = diagData['step1'];
  const s2 = diagData['step2'];
  
  let skinType = '';
  let characteristics = [];
  let routine = [];
  let tips = [];
  
  if(s1 === 'tight' || s2 === 'dry_scales') {
    skinType = '🌵 البشرة الجافة';
    characteristics = ['مشدودة بعد الغسيل','قشور خاصةً في الشتاء','احمرار وحكة','لا يوجد مظهر لامع'];
    routine = [
      {num:'1',title:'غسول للبشرة الجافة (ميلكي)',note:'خالٍ من الصابون والـ SLS',optional:false},
      {num:'2',title:'كريم مرطب (ثقيل)',note:'ضروري جداً نهاراً وليلاً',optional:false},
      {num:'3',title:'واقي شمس (كريم)',note:'SPF 30+، البشرة الجافة حساسة للشمس',optional:false},
      {num:'4',title:'كريم محيط العين',note:'اختياري',optional:true},
    ];
    tips = ['لا تستخدم تونر','تجنب الماء الساخن','تجنب الكحول في المنتجات'];
  } else if(s1 === 'oily' || s2 === 'very_oily') {
    skinType = '💧 البشرة الدهنية';
    characteristics = ['مسام واسعة','مظهر لامع','رؤوس سوداء وبيضاء','حبوب'];
    routine = [
      {num:'1',title:'غسول للبشرة الدهنية (جل)',note:'Oil Control, Foaming',optional:false},
      {num:'2',title:'تونر لتضييق المسام',note:'يومياً خاصةً على الـ T-Zone',optional:false},
      {num:'3',title:'واقي شمس جل أو فلويد',note:'Non-comedogenic',optional:false},
      {num:'4',title:'سيروم مرطب خفيف',note:'اختياري',optional:true},
      {num:'5',title:'تقشير مرة أسبوعياً',note:'اختياري',optional:true},
    ];
    tips = ['المنتجات Non-comedogenic فقط','لا تلمس الحبوب','تجنب الزيوت'];
  } else if(s1 === 'mixed' || s2 === 't_zone') {
    skinType = '🌗 البشرة المختلطة';
    characteristics = ['دهنية في الأنف والجبهة','جافة أو عادية في الخدود','مسام واسعة في الـ T-Zone'];
    routine = [
      {num:'1',title:'غسول للبشرة المختلطة',note:'','optional':false},
      {num:'2',title:'تونر على الـ T-Zone فقط',note:'ليس على الخدود',optional:false},
      {num:'3',title:'واقي شمس',note:'','optional':false},
      {num:'4',title:'مرطب للمنطقة الجافة',note:'اختياري عند الشكوى',optional:true},
    ];
    tips = ['إذا لم يتوفر منتج مختلط يعامل كدهني'];
  } else if(s1 === 'sensitive') {
    skinType = '🌸 البشرة الحساسة';
    characteristics = ['احمرار سهل','حكة وتهيج','حرقان عند بعض المنتجات'];
    routine = [
      {num:'1',title:'غسول للبشرة الحساسة',note:'Fragrance Free, Alcohol Free, Soap Free',optional:false},
      {num:'2',title:'واقي شمس للبشرة الحساسة',note:'ضروري جداً',optional:false},
      {num:'3',title:'كريم مرطب مناسب',note:'','optional':false},
      {num:'4',title:'Thermal Water',note:'اختياري',optional:true},
    ];
    tips = ['لا تونر','لا سنفرة','تجنب كل ما يحتوي كحول أو عطور'];
  } else {
    skinType = '😊 البشرة العادية';
    characteristics = ['ناعمة ونضرة','نادراً ما تعاني مشاكل','بين الجافة والدهنية'];
    routine = [
      {num:'1',title:'غسول للبشرة العادية',note:'','optional':false},
      {num:'2',title:'واقي شمس',note:'','optional':false},
      {num:'3',title:'كريم مرطب مغذٍ',note:'','optional':false},
      {num:'4',title:'تونر',note:'اختياري',optional:true},
    ];
    tips = ['معظم المنتجات مناسبة للبشرة العادية'];
  }
  
  const routineHTML = routine.map(r => `
    <div class="routine-step ${r.optional ? 'step-optional' : ''}">
      <div class="step-num">${r.num}</div>
      <div class="step-content">
        <div class="step-title">${r.title} ${r.optional ? '<span class="badge badge-gold">اختياري</span>' : '<span class="badge badge-rose">إجباري</span>'}</div>
        ${r.note ? `<div class="step-note">${r.note}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  document.getElementById('diagResult').innerHTML = `
    <h3>${skinType}</h3>
    <h4>📋 الخصائص:</h4>
    <ul>${characteristics.map(c=>'<li>'+c+'</li>').join('')}</ul>
    <h4 class="js-mt-14">🌿 الروتين اليومي الموصى به:</h4>
    <div class="routine-steps">${routineHTML}</div>
    <h4 class="js-mt-14">⚠️ نصائح مهمة:</h4>
    <ul>${tips.map(t=>'<li>'+t+'</li>').join('')}</ul>
  `;
}

function resetDiag() {
  diagData = {};
  currentStep = 1;
  document.querySelectorAll('.diag-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1').classList.add('active');
  updateProgress(1);
}

// ===== ACCORDIONS =====
function toggleProblem(header) {
  const body = header.nextElementSibling;
  const isOpen = body.classList.contains('open');
  document.querySelectorAll('.problem-header').forEach(h => {
    h.classList.remove('open');
    h.nextElementSibling.classList.remove('open');
    h.querySelector('span').textContent = '▼';
  });
  if (!isOpen) {
    header.classList.add('open');
    body.classList.add('open');
    header.querySelector('span').textContent = '▲';
  }
}

function toggleKfaq(q) {
  const a = q.nextElementSibling;
  const isOpen = a.classList.contains('open');
  document.querySelectorAll('.kfaq-q').forEach(k => {
    k.classList.remove('open');
    k.nextElementSibling.classList.remove('open');
    k.querySelector('span').textContent = '▼';
  });
  if(!isOpen){
    q.classList.add('open');
    a.classList.add('open');
    q.querySelector('span').textContent = '▲';
  }
}

function makeCard(p, extraClass='') {
  const warn = p.note && p.note.startsWith('⚠️');
  const safe = p.note && (p.note.startsWith('✅') || p.note.includes('آمن'));
  const cls = warn ? 'warning' : safe ? 'safe' : extraClass;
  return `
    <div class="prod-card ${cls}">
      <div class="prod-name">${p.name}</div>
      <div class="prod-type-badge">${p.type}</div>
      <div class="prod-use">للاستخدام: <strong>${p.use}</strong></div>
      <div class="prod-note">${p.note}</div>
    </div>`;
}

function makeSection(title, arr, extraClass='') {
  // If products have code/desc (store products), use store-card style
  if (arr && arr.length && arr[0].code !== undefined) {
    return `<div class="prod-section-title">${title} (${arr.length} منتج)</div>
    <div class="store-cards-grid">${arr.map(p => makePriceCard(p)).join('')}</div>`;
  }
  return `<div class="prod-section-title">${title}</div>
  <div class="products-grid">${arr.map(p => makeCard(p, extraClass)).join('')}</div>`;
}

window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var toast = document.getElementById('salah-toast');
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(function() {
      toast.style.transform = 'translateX(-50%) translateY(-120px)';
    }, 5000);
    toast.addEventListener('click', function() {
      toast.style.transform = 'translateX(-50%) translateY(-120px)';
    });
  }, 1000);
});
// ===== NAVIGATION =====
// sectionTitles: all entries consolidated in NavigationController.sectionTitles (Phase 2).
// This proxy reference is kept for any module that still reads the variable by name.
// Safe to remove once all callers are confirmed clean.
var sectionTitles = (typeof NavigationController !== 'undefined')
  ? NavigationController.sectionTitles
  : {};

// showSection: safety alias — all HTML onclicks call navigate() directly.
// Kept as a one-liner so bookmarks, cached pages, or external links calling showSection() still work.
function showSection(id) { navigate(id); }

// ===== QUESTIONS TABS =====
function showQTab(id) {
  document.querySelectorAll('.questions-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.qtab').forEach(t => t.classList.remove('active'));
  document.getElementById('q-'+id).classList.add('active');
  event.target.classList.add('active');
}

// ===== SKIN TYPE TABS =====
function showSkin(type) {
  document.querySelectorAll('.skin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('skin-'+type).classList.add('active');
  event.target.classList.add('active');
}

// ===== DIAGNOSTIC =====
let diagData = {};
let currentStep = 1;

function diagNext(step, value) {
  diagData['step'+step] = value;
  document.querySelectorAll('.diag-option').forEach(o => o.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  
  setTimeout(() => {
    const nextStep = step + 1;
    document.getElementById('step'+step).classList.remove('active');
    
    if (nextStep === 4) {
      showDiagResult();
    } else {
      document.getElementById('step'+nextStep).classList.add('active');
    }
    
    updateProgress(nextStep);
    currentStep = nextStep;
  }, 400);
}

function updateProgress(step) {
  for(let i=1;i<=4;i++){
    const dot = document.getElementById('dp'+i);
    dot.className = 'dot';
    if(i < step) dot.classList.add('done');
    else if(i === step) dot.classList.add('current');
  }
}

function showDiagResult() {
  document.getElementById('step3').classList.remove('active');
  document.getElementById('step4').classList.add('active');
  
  const s1 = diagData['step1'];
  const s2 = diagData['step2'];
  
  let skinType = '';
  let characteristics = [];
  let routine = [];
  let tips = [];
  
  if(s1 === 'tight' || s2 === 'dry_scales') {
    skinType = '🌵 البشرة الجافة';
    characteristics = ['مشدودة بعد الغسيل','قشور خاصةً في الشتاء','احمرار وحكة','لا يوجد مظهر لامع'];
    routine = [
      {num:'1',title:'غسول للبشرة الجافة (ميلكي)',note:'خالٍ من الصابون والـ SLS',optional:false},
      {num:'2',title:'كريم مرطب (ثقيل)',note:'ضروري جداً نهاراً وليلاً',optional:false},
      {num:'3',title:'واقي شمس (كريم)',note:'SPF 30+، البشرة الجافة حساسة للشمس',optional:false},
      {num:'4',title:'كريم محيط العين',note:'اختياري',optional:true},
    ];
    tips = ['لا تستخدم تونر','تجنب الماء الساخن','تجنب الكحول في المنتجات'];
  } else if(s1 === 'oily' || s2 === 'very_oily') {
    skinType = '💧 البشرة الدهنية';
    characteristics = ['مسام واسعة','مظهر لامع','رؤوس سوداء وبيضاء','حبوب'];
    routine = [
      {num:'1',title:'غسول للبشرة الدهنية (جل)',note:'Oil Control, Foaming',optional:false},
      {num:'2',title:'تونر لتضييق المسام',note:'يومياً خاصةً على الـ T-Zone',optional:false},
      {num:'3',title:'واقي شمس جل أو فلويد',note:'Non-comedogenic',optional:false},
      {num:'4',title:'سيروم مرطب خفيف',note:'اختياري',optional:true},
      {num:'5',title:'تقشير مرة أسبوعياً',note:'اختياري',optional:true},
    ];
    tips = ['المنتجات Non-comedogenic فقط','لا تلمس الحبوب','تجنب الزيوت'];
  } else if(s1 === 'mixed' || s2 === 't_zone') {
    skinType = '🌗 البشرة المختلطة';
    characteristics = ['دهنية في الأنف والجبهة','جافة أو عادية في الخدود','مسام واسعة في الـ T-Zone'];
    routine = [
      {num:'1',title:'غسول للبشرة المختلطة',note:'',optional:false},
      {num:'2',title:'تونر على الـ T-Zone فقط',note:'ليس على الخدود',optional:false},
      {num:'3',title:'واقي شمس',note:'',optional:false},
      {num:'4',title:'مرطب للمنطقة الجافة',note:'اختياري عند الشكوى',optional:true},
    ];
    tips = ['إذا لم يتوفر منتج مختلط يعامل كدهني'];
  } else if(s1 === 'sensitive') {
    skinType = '🌸 البشرة الحساسة';
    characteristics = ['احمرار سهل','حكة وتهيج','حرقان عند بعض المنتجات'];
    routine = [
      {num:'1',title:'غسول للبشرة الحساسة',note:'Fragrance Free, Alcohol Free, Soap Free',optional:false},
      {num:'2',title:'واقي شمس للبشرة الحساسة',note:'ضروري جداً',optional:false},
      {num:'3',title:'كريم مرطب مناسب',note:'',optional:false},
      {num:'4',title:'Thermal Water',note:'اختياري',optional:true},
    ];
    tips = ['لا تونر','لا سنفرة','تجنب كل ما يحتوي كحول أو عطور'];
  } else {
    skinType = '😊 البشرة العادية';
    characteristics = ['ناعمة ونضرة','نادراً ما تعاني مشاكل','بين الجافة والدهنية'];
    routine = [
      {num:'1',title:'غسول للبشرة العادية',note:'',optional:false},
      {num:'2',title:'واقي شمس',note:'',optional:false},
      {num:'3',title:'كريم مرطب مغذٍ',note:'',optional:false},
      {num:'4',title:'تونر',note:'اختياري',optional:true},
    ];
    tips = ['معظم المنتجات مناسبة للبشرة العادية'];
  }
  
  const routineHTML = routine.map(r => `
    <div class="routine-step ${r.optional ? 'step-optional' : ''}">
      <div class="step-num">${r.num}</div>
      <div class="step-content">
        <div class="step-title">${r.title} ${r.optional ? '<span class="badge badge-gold">اختياري</span>' : '<span class="badge badge-rose">إجباري</span>'}</div>
        ${r.note ? `<div class="step-note">${r.note}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  document.getElementById('diagResult').innerHTML = `
    <h3>${skinType}</h3>
    <h4>📋 الخصائص:</h4>
    <ul>${characteristics.map(c=>'<li>'+c+'</li>').join('')}</ul>
    <h4 class="js-mt-14">🌿 الروتين اليومي الموصى به:</h4>
    <div class="routine-steps">${routineHTML}</div>
    <h4 class="js-mt-14">⚠️ نصائح مهمة:</h4>
    <ul>${tips.map(t=>'<li>'+t+'</li>').join('')}</ul>
  `;
}

function resetDiag() {
  diagData = {};
  currentStep = 1;
  document.querySelectorAll('.diag-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1').classList.add('active');
  updateProgress(1);
}

// ===== ACCORDIONS =====
function toggleProblem(header) {
  const body = header.nextElementSibling;
  const isOpen = body.classList.contains('open');
  document.querySelectorAll('.problem-header').forEach(h => {
    h.classList.remove('open');
    h.nextElementSibling.classList.remove('open');
    h.querySelector('span').textContent = '▼';
  });
  if (!isOpen) {
    header.classList.add('open');
    body.classList.add('open');
    header.querySelector('span').textContent = '▲';
  }
}

function toggleKfaq(q) {
  const a = q.nextElementSibling;
  const isOpen = a.classList.contains('open');
  document.querySelectorAll('.kfaq-q').forEach(k => {
    k.classList.remove('open');
    k.nextElementSibling.classList.remove('open');
    k.querySelector('span').textContent = '▼';
  });
  if(!isOpen){
    q.classList.add('open');
    a.classList.add('open');
    q.querySelector('span').textContent = '▲';
  }
}

// Section titles consolidated in NavigationController.sectionTitles — no mutations needed here.

function makeCard(p, extraClass='') {
  const warn = p.note && p.note.startsWith('⚠️');
  const safe = p.note && (p.note.startsWith('✅') || p.note.includes('آمن'));
  const cls = warn ? 'warning' : safe ? 'safe' : extraClass;
  return `
    <div class="prod-card ${cls}">
      <div class="prod-name">${p.name}</div>
      <div class="prod-type-badge">${p.type}</div>
      <div class="prod-use">للاستخدام: <strong>${p.use}</strong></div>
      <div class="prod-note">${p.note}</div>
    </div>`;
}

function makeSection(title, arr, extraClass='') {
  // If products have code/desc (store products), use store-card style
  if (arr && arr.length && arr[0].code !== undefined) {
    return `<div class="prod-section-title">${title} (${arr.length} منتج)</div>
    <div class="store-cards-grid">${arr.map(p => makePriceCard(p)).join('')}</div>`;
  }
  return `<div class="prod-section-title">${title}</div>
  <div class="products-grid">${arr.map(p => makeCard(p, extraClass)).join('')}</div>`;
}

