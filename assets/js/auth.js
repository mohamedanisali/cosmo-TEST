// ============================================================
// auth.js — نظام الباسورد والـ Session
// ⚠️  تنبيه أمني: كلمة المرور هنا client-side للتجربة فقط.
//     في الإنتاج الحقيقي، لازم تتحول لـ backend check
//     (مثلاً Cloudflare Worker أو Firebase Auth).
// ============================================================

var COSMO_PW = 'M3A';

function cosmoIsAuth() {
  try { if (sessionStorage.getItem('cosmo_auth') === 'ok') return true; } catch(e) {}
  try { if (localStorage.getItem('cosmo_auth') === 'ok') return true;   } catch(e) {}
  return false;
}

function cosmoSetAuth() {
  try { sessionStorage.setItem('cosmo_auth', 'ok'); } catch(e) {}
  try { localStorage.setItem('cosmo_auth', 'ok');   } catch(e) {}
}

// Initialize AppState with current auth status
if (typeof AppState !== 'undefined') {
  AppState.setState('auth.isAuthenticated', cosmoIsAuth());
}

// إخفاء شاشة الباسورد لو مسجل دخوله
if (cosmoIsAuth()) {
  document.getElementById('password-screen').style.display = 'none';
}

function checkPassword() {
  var val = document.getElementById('pw-input').value.trim();
  var err = document.getElementById('pw-error');

  if (val === COSMO_PW) {
    cosmoSetAuth();
    if (typeof AppState !== 'undefined') {
      AppState.setState('auth.isAuthenticated', true);
    }
    var screen = document.getElementById('password-screen');
    screen.style.transition = 'opacity 0.4s';
    screen.style.opacity = '0';
    setTimeout(function () { screen.style.display = 'none'; }, 400);
  } else {
    err.style.opacity = '1';
    document.getElementById('pw-input').style.borderColor = 'rgba(232,68,106,0.8)';
    document.getElementById('pw-input').value = '';
    document.getElementById('pw-input').focus();
    setTimeout(function () {
      err.style.opacity = '0';
      document.getElementById('pw-input').style.borderColor = 'rgba(255,255,255,0.15)';
    }, 2000);
  }
}
