// ============================================================
// notes.js — نظام الملاحظات (Google Apps Script Integration)
// ============================================================

// ===== TEAM NOTES =====
var NOTES_API = 'https://script.google.com/macros/s/AKfycbywdTP3O0CkONe2lce7dKcBQzhErqY8dv2ySkZw0RmldN9rQAxAoOPIq2qYNvU_9nva/exec';
var NOTES_VIEW_PW = 'M3A1';

function checkNotesPassword() {
  var input = document.getElementById('notes-pw-input');
  var err   = document.getElementById('notes-pw-error');
  if (!input) { unlockNotes(); return; }
  if (input.value.trim() === NOTES_VIEW_PW) {
    unlockNotes();
  } else {
    err.style.opacity = '1';
    input.value = '';
    input.focus();
    setTimeout(function() { err.style.opacity = '0'; }, 2000);
  }
}

function unlockNotes() {
  document.getElementById('notes-locked').style.display = 'none';
  document.getElementById('notes-unlocked').style.display = 'block';
  loadNotes();
}

function lockNotes() {
  document.getElementById('notes-locked').style.display = 'block';
  document.getElementById('notes-unlocked').style.display = 'none';
  document.getElementById('notes-list').innerHTML = '';
  var input = document.getElementById('notes-pw-input');
  if (input) input.value = '';
}

function setNoteTag(btn, tag) {
  document.getElementById('note-tag').value = tag;
  document.querySelectorAll('.note-tag-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
}

function submitNote() {
  var name      = document.getElementById('note-name').value.trim();
  var workplace = document.getElementById('note-workplace').value.trim();
  var text      = document.getElementById('note-text').value.trim();
  var tag       = document.getElementById('note-tag').value || 'ملاحظة عامة';
  var status    = document.getElementById('note-status');
  var btn       = document.getElementById('note-submit-btn');
  if (!name || !text) {
    status.textContent = String.fromCharCode(9888) + ' اكتب اسمك والملاحظة';
    status.style.color = '#e07a30';
    status.style.opacity = '1';
    setTimeout(function() { status.style.opacity = '0'; }, 3000);
    return;
  }
  btn.disabled = true;
  btn.textContent = 'جاري الارسال...';
  var now = new Date();
  var dateStr = now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });
  var payload = JSON.stringify({ date: dateStr, name: name, workplace: workplace || '-', note: '[' + tag + '] ' + text });
  // no-cors مع Google Apps Script — الـ response مش قابل للقراءة حتى لو نجح
  // نعامله كـ success دايماً بعد الإرسال
  fetch(NOTES_API, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: payload })
  .finally(function() {
    status.textContent = 'تم الارسال بنجاح!';
    status.style.color = '#27ae60';
    status.style.opacity = '1';
    document.getElementById('note-name').value = '';
    document.getElementById('note-workplace').value = '';
    document.getElementById('note-text').value = '';
    document.getElementById('note-tag').value = 'ملاحظة عامة';
    document.querySelectorAll('.note-tag-btn').forEach(function(b){ b.classList.remove('active'); });
    var gen = document.getElementById('tag-general');
    if (gen) gen.classList.add('active');
    btn.disabled = false;
    btn.textContent = 'ارسال';
    setTimeout(function() { status.style.opacity = '0'; }, 3000);
  });
}

/**
 * loadNotes()
 *
 * ⚠️  INTENTIONAL EXCEPTION — window[cbName] pattern
 * This file uses a dynamic JSONP callback: a unique function name is registered on
 * window so the Google Apps Script endpoint can invoke it via <script> injection.
 * This is a deliberate, necessary pattern for JSONP and is NOT a data-state global.
 * It cannot be replaced by AppState/DataLayer without changing the GAS endpoint to
 * support CORS or a proper fetch-based API.  Document this exception here so future
 * audits do not flag it as a migration oversight.
 */
function loadNotes() {
  var list = document.getElementById('notes-list');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.88rem">جاري التحميل...</div>';
  var cbName = 'cosmoNotesCallback_' + Date.now();
  var script = document.createElement('script');
  window[cbName] = function(data) {
    delete window[cbName];
    if (script.parentNode) script.parentNode.removeChild(script);
    if (!data.rows || data.rows.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:0.88rem">لا توجد ملاحظات بعد</div>';
      return;
    }
    var rows = data.rows.slice().reverse();
    var html = '';
    rows.forEach(function(row) {
      html += '<div style="background:var(--bg);border-radius:12px;padding:16px 18px;margin-bottom:12px;border-right:3px solid var(--rose)">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">'
        + '<span style="font-size:0.88rem;font-weight:800;color:var(--dark)">' + (row[1]||'') + '</span>'
        + '<span style="font-size:0.72rem;color:var(--text-muted)">' + (row[0]||'') + '</span>'
        + '</div>'
        + '<div style="font-size:0.86rem;color:var(--text);line-height:1.7">' + (row[3]||'') + '</div>'
        + '</div>';
    });
    list.innerHTML = html;
  };
  script.onerror = function() {
    delete window[cbName];
    list.innerHTML = '<div style="text-align:center;padding:24px;color:#e74c3c;font-size:0.85rem">تعذر تحميل الملاحظات</div>';
  };
  script.src = NOTES_API + '?callback=' + cbName;
  document.head.appendChild(script);
}


