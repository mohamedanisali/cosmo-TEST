// ============================================================
// utils.js — دوال مشتركة بين كل الملفات
// ============================================================

/**
 * نسخ نص للـ clipboard — fallback للمتصفحات القديمة
 * @param {string} text - النص المراد نسخه
 * @param {HTMLElement} btn - الزرار اللي بيتغير لما يتنسخ
 * @param {string} [doneLabel='✅ تم النسخ!'] - النص بعد النسخ
 * @param {string} [resetLabel='📋 نسخ'] - النص بعد العودة
 */
function copyToClipboard(text, btn, doneLabel, resetLabel) {
  doneLabel  = doneLabel  || '✅ تم النسخ!';
  resetLabel = resetLabel || btn.innerHTML;

  function onSuccess() {
    btn.innerHTML = doneLabel;
    btn.classList.add('copied');
    setTimeout(function () {
      btn.innerHTML = resetLabel;
      btn.classList.remove('copied');
    }, 2500);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(fallback);
  } else {
    fallback();
  }

  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onSuccess();
  }
}

/**
 * نسخ كود منتج — wrapper سريع
 */
function copyProductCode(btn, code) {
  copyToClipboard(code, btn, '✅ تم النسخ!', '📋 نسخ الكود');
  btn.style.background = '#27ae60';
  setTimeout(function () { btn.style.background = ''; }, 2000);
}

// ============================================================
// PRECAUTIONS DATA — نصايح الاستخدام لكل نوع منتج
// ✅ موجودة هنا في utils.js (يتحمل أول) عشان كل الـ recommenders
//    تقدر تستخدم renderPrecautions() بدون race condition
// ============================================================
var PRECAUTIONS = {
  cleanser: {
    title: '📋 نصايح استخدام الغسول',
    items: [
      '🔁 اغسل وجهك مرتين بس — صبح وبليل',
      '💧 استخدم مية فاترة مش سخنة',
      '🤲 حط الغسول في إيدك الأول ورغّيه كويس — بعدين ضعه على وجهك',
      '⏱️ سيبه على وجهك دقيقة كاملة عشان المواد الفعالة تشتغل — بعدين اشطف',
      '🧼 اشطف كويس وجفف بمنشفة ناعمة بدون فرك',
    ]
  },
  toner: {
    title: '📋 نصايح استخدام التونر',
    items: [
      '📋 استخدمه بعد الغسول على وجه نظيف ومجفف',
      '🧻 ضعه بقطنة أو بإيدك بلطف',
      '🚫 متشطفوش — سيبه على البشرة',
      '🌙 لو فيه أحماض (BHA/AHA) استخدمه بالليل بس',
    ]
  },
  moisturizer: {
    title: '📋 نصايح استخدام المرطب',
    items: [
      '⏱️ ضعه فور ما تجفف وجهك عشان يحبس الرطوبة',
      '☀️ صبح: مرطب + واقي شمس — ضروري جداً',
      '🌙 بالليل: ممكن تستخدم مرطب أدسم شوية',
      '🧴 كمية صغيرة تكفي — الزيادة مش بتفيد',
    ]
  },
  mask: {
    title: '📋 نصايح استخدام الماسك',
    items: [
      '📅 مرة أو مرتين في الأسبوع بس — مش أكتر',
      '⏱️ التزم بالوقت المكتوب على العبوة',
      '🌊 اشطفه بمية فاترة وبعدين ضع المرطب فوراً',
      '🚫 متستخدمهوش على بشرة ملتهبة أو محترقة من الشمس',
    ]
  },
  scrub: {
    title: '📋 نصايح استخدام المقشر',
    items: [
      '📅 مرة أو مرتين في الأسبوع بس',
      '🤲 دلّك بلطف بحركات دايرية — من غير ضغط',
      '🚫 ابعد عن منطقة العين خالص',
      '🧴 بعده ضع المرطب فوراً',
    ]
  },
  eye: {
    title: '📋 نصايح استخدام كريم العين',
    items: [
      '💆 ضعه بإصبع البنصر بس — أخف إصبع عندك',
      '👁️ ربّت بلطف حوالين العين — متفركش',
      '🌙 صبح وبليل على وجه نظيف',
      '⚠️ لو لاحظت احمرار أو حرقان — وقف الاستخدام',
    ]
  },
  acne: {
    title: '📋 نصايح استخدام علاج الحبوب',
    items: [
      '🎯 حطه على الحبة بس — مش على الوجه كله',
      '🚫 متلمسش الحبوب ومتضغطش عليها',
      '☀️ واقي شمس ضروري يومياً مع العلاج',
      '⏳ النتيجة بتظهر بعد 4-6 أسابيع — اصبر',
    ]
  },
  whitening: {
    title: '📋 نصايح استخدام منتج التفتيح',
    items: [
      '☀️ واقي شمس يومي إجباري — بدونه مش هيفرق',
      '🌙 ضعه بالليل لمدة نص ساعة لساعة ثم اشطفه',
      '📅 النتيجة بتظهر بعد 4-8 أسابيع من الانتظام',
      '🤲 جفف بلطف — الفرك القوي بيغمق الجلد',
    ]
  },
  dyes: {
    title: '📋 نصايح استخدام الصبغة',
    items: [
      '🧪 اعمل اختبار حساسية على جلد الرسغ 48 ساعة قبل الصبغة',
      '🧴 ضع فازلين حول الجبهة والأذنين عشان ماتتصبغش',
      '🚫 متصبغيش فوق الحنة مباشرة — انتظري شهر على الأقل',
      '⏱️ التزمي بالوقت المكتوب على العبوة — الزيادة تتلف الشعر',
      '🌊 اشطفي بمية فاترة وبعدين استخدمي الكوندشنر المرفق',
      '☀️ بعد الصبغة استخدمي شامبو بدون سلفات للحفاظ على اللون',
    ]
  },
  antiaging: {
    title: '📋 نصايح استخدام كريم Anti-Aging',
    items: [
      '🌙 استخدمه بالليل بس — الشمس بتقلل فعاليته',
      '☀️ واقي شمس يومي ضروري معاه',
      '📈 ابدأ بمرتين في الأسبوع وزود تدريجياً',
      '⏳ النتيجة بتظهر بعد 8-12 أسبوع من الانتظام',
    ]
  }
};

/**
 * بناء HTML لقسم نصايح الاستخدام
 * @param {string} type   — مفتاح من PRECAUTIONS (toner, moisturizer, ...)
 * @param {string} [id]   — غير مستخدم حالياً (محفوظ للتوافق مع الاستدعاءات القديمة)
 * @returns {string} HTML string جاهز للإدراج في الصفحة
 */
function renderPrecautions(type, id) {
  var data = PRECAUTIONS[type];
  if (!data) return '';

  var html = '<div style="margin-top:20px;background:white;border-radius:var(--radius);padding:20px 24px;box-shadow:var(--shadow);border-right:4px solid var(--gold)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
    + '<div style="font-size:0.95rem;font-weight:800;color:var(--dark)">' + data.title + '</div>'
    + '<button onclick="copyPrecautions(\'' + type + '\',this)" style="background:linear-gradient(135deg,var(--gold),#b8860b);color:white;border:none;padding:7px 18px;border-radius:20px;font-family:Cairo,sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer">📋 نسخ للعميل</button>'
    + '</div>'
    + '<ul style="padding-right:4px;list-style:none;margin:0">'
    + data.items.map(function (item) {
        return '<li style="font-size:0.85rem;line-height:1.8;color:var(--text);padding:4px 0;border-bottom:1px solid var(--border)">' + item + '</li>';
      }).join('')
    + '</ul>'
    + '</div>';

  return html;
}

/**
 * نسخ نصايح الاستخدام للـ clipboard — للإرسال للعميل
 */
function copyPrecautions(type, btn) {
  var data = PRECAUTIONS[type];
  if (!data) return;
  var text = data.title.replace('📋 ', '') + '\n══════════════\n'
    + data.items.join('\n')
    + '\n══════════════\n🛒 للطلب: alabdellatif-tarshouby.com/ar';
  copyToClipboard(text, btn, '✅ تم النسخ!', '📋 نسخ للعميل');
}

/**
 * skinType labels موحدة
 */
var SKIN_LABELS = {
  oily:      'دهنية/مختلطة',
  dry:       'جافة',
  sensitive: 'حساسة',
  normal:    'عادية'
};
