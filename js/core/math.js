/* ============================================================
   math.js —— 计算练习（家长/老师友好）
   HUD 上打开开关后：每 3 分钟弹一道小学二年级的数学题，
   必须在 10 秒内用屏幕上的数字键答对，弹窗才会消失、才能继续玩。
   10 秒没答出来就自动换一道新题（弹窗一直留着）。
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG.math;

  var box, qEl, barEl, inputEl, keysEl, tipEl, hudBtn;

  var waitTimer = null;      // 「再过 N 毫秒出题」
  var tickTimer = null;      // 倒计时刷新
  var deadline = 0;
  var answer = 0;
  var typed = '';
  var isOpen = false;

  function on() { return !!EG.State.data.mathOn; }

  /* ---------- 出题：表内乘法 + 两位数加减，偶尔来一道两步的 ---------- */
  function makeQuestion() {
    var type = EG.util.randInt(0, 3);
    var a, b, c, text;

    if (type === 0) {                                   // 两位数 + 两位数
      a = EG.util.randInt(11, 49);
      b = EG.util.randInt(3, 40);
      answer = a + b;
      text = a + ' + ' + b;
    } else if (type === 1) {                            // 两位数 − 两位数
      a = EG.util.randInt(45, C.maxAdd);
      b = EG.util.randInt(6, 39);
      answer = a - b;
      text = a + ' − ' + b;
    } else {
      a = EG.util.randInt(2, C.maxMul);                 // 表内乘法（就是 5 × 4 + 8 这种）
      b = EG.util.randInt(2, C.maxMul);
      if (type === 2) {
        c = EG.util.randInt(2, 20);
        answer = a * b + c;
        text = a + ' × ' + b + ' + ' + c;
      } else {
        c = EG.util.randInt(2, Math.max(2, a * b - 1));
        answer = a * b - c;
        text = a + ' × ' + b + ' − ' + c;
      }
    }
    return text;
  }

  /* ---------- 界面 ---------- */
  function renderInput() {
    inputEl.textContent = typed === '' ? '?' : typed;
    inputEl.classList.toggle('is-empty', typed === '');
  }

  function tick() {
    var left = Math.max(0, deadline - Date.now());
    barEl.style.transform = 'scaleX(' + (left / C.limitMs) + ')';
    barEl.classList.toggle('is-hurry', left < C.limitMs * 0.35);
    if (left <= 0) {
      /* 10 秒没答出来：换一道新题，弹窗继续留着 */
      EG.Audio.play('error');
      tipEl.textContent = '超时啦～换一道新的！';
      nextQuestion();
    }
  }

  function nextQuestion() {
    qEl.textContent = makeQuestion() + ' = ?';
    typed = '';
    renderInput();
    deadline = Date.now() + C.limitMs;
    if (tipEl.textContent.indexOf('超时') < 0) tipEl.textContent = '在 10 秒内答对，弹窗才会关掉哦';
    tipEl.textContent = '答对才能继续玩～（10 秒后会换题）';
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, 100);
    tick();
  }

  function show() {
    if (isOpen || !on()) return;
    isOpen = true;
    box.classList.add('is-open');
    EG.Audio.play('ding');
    nextQuestion();
  }

  function hide() {
    isOpen = false;
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (box) box.classList.remove('is-open');
  }

  function correct() {
    hide();
    EG.Audio.play('success');
    EG.Say.mood('happy');
    EG.Say.show('答对啦！真棒，继续玩吧～', 2400);
    schedule();                       // 重新开始计时，3 分钟后再来一道
  }

  function wrong() {
    EG.Audio.play('error');
    inputEl.classList.remove('is-shake');
    void inputEl.offsetWidth;
    inputEl.classList.add('is-shake');
    tipEl.textContent = '再想想～还有 ' + Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) + ' 秒';
    typed = '';
    window.setTimeout(renderInput, 240);
  }

  function check() {
    if (typed === '') return;
    if (Number(typed) === answer) { correct(); return; }
    if (typed.length >= String(answer).length) wrong();
  }

  function press(key) {
    if (!isOpen) return;
    if (key === 'del') {
      typed = typed.slice(0, -1);
    } else if (typed.length < 3) {
      typed += key;
    }
    renderInput();
    check();
  }

  /* ---------- 开关与排期 ---------- */
  function schedule() {
    if (waitTimer) { window.clearTimeout(waitTimer); waitTimer = null; }
    if (!on()) return;
    waitTimer = window.setTimeout(show, C.everyMs);
  }

  function syncHud() {
    if (!hudBtn) return;
    var isOn = on();
    hudBtn.classList.toggle('is-on', isOn);
    hudBtn.title = isOn
      ? '计算练习：已开启（每 3 分钟一道题，答对才能继续）'
      : '计算练习：已关闭（点一下开启）';
  }

  function setOn(v) {
    EG.State.data.mathOn = !!v;
    EG.State.save();
    if (!v) hide();
    syncHud();
    schedule();
    if (on()) EG.Say.show('计算练习打开啦～每 3 分钟会出一道题哦', 2600);
    else EG.Say.show('计算练习已关闭', 1800);
    return on();
  }

  function init() {
    box = document.querySelector('#math');
    qEl = document.querySelector('#math-q');
    barEl = document.querySelector('#math-bar');
    inputEl = document.querySelector('#math-input');
    keysEl = document.querySelector('#math-keys');
    tipEl = document.querySelector('#math-tip');
    hudBtn = document.querySelector('#math-toggle');

    /* 数字键盘 */
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'del'].forEach(function (k) {
      var b = EG.util.el('button', 'math__key' + (k === 'del' ? ' math__key--del' : ''), k === 'del' ? '⌫' : k);
      b.type = 'button';
      b.dataset.key = k;
      b.addEventListener('click', function () { press(k); });
      keysEl.appendChild(b);
    });

    /* 键盘也能按（方便电脑上玩） */
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key >= '0' && e.key <= '9') { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('del'); e.preventDefault(); }
    });

    syncHud();
    schedule();

    if (hudBtn) hudBtn.addEventListener('click', function () {
      EG.Audio.play('click');
      setOn(!on());
    });
  }

  EG.Math = {
    init: init,
    toggle: function () { return setOn(!on()); },
    setOn: setOn,
    isOn: on,
    isOpen: function () { return isOpen; },
    syncHud: syncHud,
    refresh: function () { hide(); syncHud(); schedule(); },
    /* 给自检用：跳过等待直接出题 */
    popNow: function () { if (waitTimer) window.clearTimeout(waitTimer); show(); },
    answerNow: function () { typed = String(answer); renderInput(); check(); },
    current: function () { return { text: qEl ? qEl.textContent : '', answer: answer }; }
  };
})(window.EG);
