/* ============================================================
   3F 咖啡屋 —— 按住萃取，松手看浓度，绿色完美区最值钱
   ============================================================ */
(function (EG) {
  'use strict';

  var I = EG.ASSETS.items;

  var RATE = 58;        // 每秒充能百分比
  var PERFECT = [45, 75];  // 完美区间

  var box = null, fillEl = null, brewEl = null, cupEl = null, cupImg = null, verdictEl = null;
  var pressing = false, fill = 0, raf = null, last = 0;
  var ready = false, pending = 0;
  var timers = [];

  function later(fn, ms) {
    var t = window.setTimeout(function () {
      timers = timers.filter(function (x) { return x !== t; });
      fn();
    }, ms);
    timers.push(t);
  }

  function setFill(v) {
    fill = Math.max(0, Math.min(100, v));
    fillEl.style.height = fill + '%';
  }

  function tick(now) {
    if (!pressing) return;
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;
    setFill(fill + RATE * dt);
    if (fill >= 100) {
      /** 满出来了 */
      endPour(true);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function startPour(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (ready) {
      EG.Audio.play('error');
      EG.Say.show('先把这杯喝掉嘛～', 1600);
      return;
    }
    if (pressing) return;
    pressing = true;
    last = 0;
    brewEl.classList.add('is-press');
    cupEl.classList.add('is-pour');
    EG.Audio.loopOn('pour', 0.35);
    raf = requestAnimationFrame(tick);
  }

  function endPour(overflow) {
    if (!pressing) return;
    pressing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    brewEl.classList.remove('is-press');
    cupEl.classList.remove('is-pour');
    EG.Audio.loopOff('pour');

    var f = overflow ? 100 : fill;
    var coins, text, perfect = false;

    if (f < 20) {
      coins = 1; text = '太淡啦… +1';
    } else if (f < PERFECT[0]) {
      coins = 2; text = '还不错！+2';
    } else if (f <= PERFECT[1]) {
      coins = 5; text = '完美！+5 ✨'; perfect = true;
    } else {
      coins = 2; text = '有点苦… +2';
    }

    pending = coins;
    ready = true;
    cupImg.src = I.cupFull;
    cupEl.classList.add('is-full', 'is-ready');
    verdictEl.textContent = text;
    verdictEl.classList.add('is-show');

    if (perfect) {
      EG.Audio.play('success');
      var p = EG.FX.positionOf(cupEl);
      EG.FX.sparkle(p.x, p.y - 6, 12);
      EG.Say.mood('happy');
      EG.Say.show('完美萃取！快喝喝看～', 2400);
      EG.State.bump('perfect');
    } else {
      EG.Audio.play('click');
      EG.Say.show('味道一般般，下次试试绿色区～', 2200);
    }
  }

  function drink() {
    if (!ready) return;
    var p = EG.FX.positionOf(cupEl);
    EG.Audio.play('gulp');
    EG.FX.hit(p.x, p.y - 6, '+' + pending, pending >= 5);
    EG.State.addCoins(pending);
    EG.State.bump('coffee');
    EG.Say.mood('happy');
    EG.Say.show(EG.util.rand(['咕嘟咕嘟…好喝！', '暖暖的，好幸福～', '再来一杯吧！']), 2000);

    ready = false;
    pending = 0;
    cupImg.src = I.cupEmpty;
    cupEl.classList.remove('is-full', 'is-ready');
    verdictEl.classList.remove('is-show');
    setFill(0);
  }

  EG.Floors.register({
    id: 3,
    mount: function (propsEl) {
      box = propsEl;
      pressing = false;
      ready = false;
      fill = 0;

      /* 浓度表 */
      var gauge = EG.util.el('div', 'gauge');
      gauge.innerHTML = '<div class="gauge__fill"></div>' +
                        '<div class="gauge__perfect"></div>' +
                        '<div class="gauge__mark">完美</div>';
      box.appendChild(gauge);
      fillEl = gauge.querySelector('.gauge__fill');
      setFill(0);

      /* 萃取按钮 */
      brewEl = EG.util.el('button', 'brew');
      brewEl.innerHTML = '<span class="brew__icon">☕</span><span class="brew__label">按住萃取</span>';
      brewEl.addEventListener('pointerdown', function (e) {
        if (brewEl.setPointerCapture && e.pointerId != null) {
          try { brewEl.setPointerCapture(e.pointerId); } catch (err) {}
        }
        startPour(e);
      });
      brewEl.addEventListener('pointerup', function () { endPour(false); });
      brewEl.addEventListener('pointerleave', function () { endPour(false); });
      brewEl.addEventListener('pointercancel', function () { endPour(false); });
      brewEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      box.appendChild(brewEl);

      /* 吧台上的杯子 */
      cupEl = EG.util.el('div', 'cup');
      cupImg = EG.util.el('img');
      cupImg.src = I.cupEmpty;
      cupEl.appendChild(cupImg);
      var steam = EG.util.el('div', 'cup__steam');
      steam.innerHTML = EG.util.img(I.steam) + EG.util.img(I.steam);
      cupEl.appendChild(steam);
      cupEl.addEventListener('click', drink);
      box.appendChild(cupEl);

      /* 评价 */
      verdictEl = EG.util.el('div', 'verdict');
      box.appendChild(verdictEl);

      EG.Say.show('按住萃取按钮，到绿色区松手最棒喵！', 3200);
    },

    unmount: function () {
      pressing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      EG.Audio.loopOff('pour');
      timers.forEach(window.clearTimeout);
      timers = [];
      box = null; fillEl = null; brewEl = null; cupEl = null; cupImg = null; verdictEl = null;
      ready = false;
    }
  });
})(window.EG);
