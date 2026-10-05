/* ============================================================
   6F 宠物游乐区 —— 三个小游戏
     ① 投篮：看准时机点「投球」，越靠中间给得越多
     ② 羽毛球：球到左边时挥拍，连击越多越快
     ③ 老虎机：投 1 颗星星糖转一次，三个一样中大奖
   想加第四个小游戏：写一个 startXxx()，再往 GAMES 和 config.arcade.list 里各加一项
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG.arcade;
  var A = EG.ASSETS.arcade;

  var box = null;
  var root = document.querySelector('#arcade');
  var bodyEl = document.querySelector('#arcade-body');
  var titleEl = document.querySelector('#arcade-title');
  var hintEl = document.querySelector('#arcade-hint');
  var scoreEl = document.querySelector('#arcade-score');
  var actionEl = document.querySelector('#arcade-action');
  var closeEl = document.querySelector('#arcade-close');

  var levelEl = document.querySelector('#arcade-level');
  var activeGame = '';
  var raf = null;
  var timers = [];
  var active = null;
  var spinningSlot = false;

  function later(fn, ms) {
    var t = window.setTimeout(function () {
      timers = timers.filter(function (x) { return x !== t; });
      fn();
    }, ms);
    timers.push(t);
  }
  function stopRaf() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function stopTimers() { timers.forEach(window.clearTimeout); timers = []; }
  function coins() { return EG.State.data.coins; }

  /* ---------- 难度档位（1 最慢，面给 5-8 岁小朋友） ---------- */
  function cfgOf(game) { return C[game]; }

  function levelOf(game) {
    var g = EG.State.data.gameLevel || (EG.State.data.gameLevel = {});
    var lv = Number(g[game]) || 1;
    return Math.max(1, Math.min(cfgOf(game).maxLevel, lv));
  }

  function speedOf(game, level) {
    var cfg = cfgOf(game);
    return cfg.baseSpeed * (1 + cfg.step * (level - 1));
  }

  function badge() {
    var lv = levelOf(activeGame);
    var max = cfgOf(activeGame).maxLevel;
    var stars = '';
    for (var i = 1; i <= max; i++) stars += (i <= lv ? '★' : '☆');
    return '速度 ' + stars;
  }

  function updateBadge() {
    if (levelEl && activeGame) levelEl.textContent = badge();
  }

  /* 升 / 降一档；返回是否真的变了 */
  function shiftLevel(game, delta) {
    var cfg = cfgOf(game);
    var g = EG.State.data.gameLevel || (EG.State.data.gameLevel = {});
    var now = levelOf(game);
    var next = Math.max(1, Math.min(cfg.maxLevel, now + delta));
    if (next === now) return false;
    g[game] = next;
    EG.State.save();
    updateBadge();
    EG.Say.show(delta > 0
      ? '好厉害！' + (game === 'basket' ? '球速' : '球速') + '加快一点点～（第 ' + next + ' 档）'
      : '慢慢来，我把速度调慢一点点～（第 ' + next + ' 档）', 2600);
    return true;
  }
  function setScore(t) { scoreEl.textContent = t; }
  function setAction(label, fn) { actionEl.textContent = label; actionEl.onclick = fn; actionEl.disabled = false; }

  /* 发奖励 + 在元素上方飘字（飘字层在弹窗之上） */
  function pay(n, atEl, big) {
    EG.State.addCoins(n);
    EG.Audio.play(big ? 'success' : 'coin');
    if (atEl) {
      var p = EG.FX.positionOf(atEl);
      EG.FX.hit(p.x, p.y, '+' + n, !!big);
    }
  }

  /* 带装扮图层的宠物（PetWear 会往 .pet__wear 里塞饰品） */
  function petTag(cls, petId) {
    return '<span class="' + cls + ' petslot" data-pet="' + petId + '">' +
      '<img src="' + EG.ASSETS.pets.list[petId].idle + '" alt="">' +
      '<img class="pet__wear" alt=""></span>';
  }

  function open(cfg) {
    activeGame = cfg.game || '';
    titleEl.textContent = cfg.title;
    hintEl.innerHTML = cfg.hint;
    bodyEl.innerHTML = cfg.body || '';
    setScore(cfg.score || '');
    setAction(cfg.action || '开始', cfg.onAction);
    root.classList.add('is-open');
    updateBadge();
    EG.PetWear.refresh();      // 游戏里出场的宠物也戴着自己的装扮
  }

  function close() {
    if (active && active.stop) active.stop();
    active = null;
    stopRaf();
    stopTimers();
    spinningSlot = false;
    root.classList.remove('is-open');
    bodyEl.innerHTML = '';
  }

  function isOpen() { return !!root && root.classList.contains('is-open'); }

  /* ---------- ① 投篮 ---------- */
  function startBasket() {
    var cfg = C.basket;
    var level = levelOf('basket');
    var z = cfg.zones[level - 1] || cfg.zones[0];       // [完美半宽, 命中半宽]
    var shots = cfg.shots, score = 0, pos = 0, dir = 1, busy = false;
    var hitStreak = 0, missStreak = 0;

    open({
      game: 'basket',
      title: '🏀 投篮小游戏',
      hint: '看准绿色区域点 <b>投球</b>，越靠正中间给得越多（共 ' + shots + ' 球）',
      score: '还剩 ' + shots + ' 球',
      action: '投球 !',
      body:
        '<div class="bb">' +
          '<img class="bb__hoop" src="' + A.hoop + '" alt="">' +
          petTag('bb__pet', 'dog') +
          '<img class="bb__ball" id="arc-ball" src="' + A.ball + '" alt="">' +
          '<div class="bb__bar" style="--z-perfect:' + z[0] + '%;--z-good:' + z[1] + '%">' +
            '<span class="bb__zone bb__zone--good"></span>' +
            '<span class="bb__zone bb__zone--perfect"></span>' +
            '<i class="bb__marker" id="arc-mark"></i>' +
          '</div>' +
        '</div>',
      onAction: shoot
    });

    var ball = bodyEl.querySelector('#arc-ball');
    var mark = bodyEl.querySelector('#arc-mark');

    var speed = speedOf('basket', level);

    function loop() {
      pos += dir * speed;
      if (pos >= 100) { pos = 100; dir = -1; }
      else if (pos <= 0) { pos = 0; dir = 1; }
      mark.style.left = pos + '%';
      raf = requestAnimationFrame(loop);
    }
    loop();
    active = { stop: stopRaf };

    function shoot() {
      if (busy) return;
      busy = true;
      var d = Math.abs(pos - 50);
      var perfect = d <= z[0], good = d <= z[1];
      shots -= 1;
      if (perfect || good) {
        var n = perfect ? cfg.perfect : cfg.good;
        hitStreak += 1; missStreak = 0;
        /* 连续过关就升一档（速度变快、窗口变窄） */
        if (hitStreak >= cfg.upStreak) {
          hitStreak = 0;
          if (shiftLevel('basket', 1)) {
            level = levelOf('basket');
            z = cfg.zones[level - 1] || z;
            speed = speedOf('basket', level);
            var bar = bodyEl.querySelector('.bb__bar');
            if (bar) bar.style.cssText = '--z-perfect:' + z[0] + '%;--z-good:' + z[1] + '%';
          }
        }
        score += n;
        ball.classList.remove('is-miss');
        ball.classList.add('is-shoot');
        EG.Audio.play(perfect ? 'success' : 'pop');
        later(function () { pay(n, ball, perfect); }, 340);
        setScore((perfect ? '空心球！' : '进了！') + ' +' + n);
      } else {
        ball.classList.remove('is-shoot');
        ball.classList.add('is-miss');
        EG.Audio.play('error');
        setScore('偏了…再来！');
        /* 连续 2 次没进：降一档，指针变慢、窗口变宽 */
        missStreak += 1; hitStreak = 0;
        if (missStreak >= cfg.downStreak) {
          missStreak = 0;
          if (shiftLevel('basket', -1)) {
            level = levelOf('basket');
            z = cfg.zones[level - 1] || z;
            speed = speedOf('basket', level);
            var bar2 = bodyEl.querySelector('.bb__bar');
            if (bar2) bar2.style.cssText = '--z-perfect:' + z[0] + '%;--z-good:' + z[1] + '%';
          }
        }
      }
      later(function () {
        ball.classList.remove('is-shoot', 'is-miss');
        busy = false;
        if (shots <= 0) {
          setScore('本轮拿到 ' + score + ' 颗星星糖');
          setAction('再来一轮', startBasket);
        } else {
          setScore('还剩 ' + shots + ' 球｜已拿 ' + score + ' 颗');
        }
      }, 780);
    }
  }

  /* ---------- ② 羽毛球 ---------- */
  function startBadminton() {
    var cfg = C.badminton;
    var level = levelOf('badminton');
    var base = speedOf('badminton', level);
    var x = 92, dir = -1, speed = base, rally = 0, over = false;
    var hitStreak = 0, missStreak = 0;

    open({
      game: 'badminton',
      title: '🏸 羽毛球小游戏',
      hint: '球飞到你这边（左边）时点 <b>挥拍</b>：每接住一次 +' + cfg.coins + ' 颗，越接越快',
      score: '连击 0 次',
      action: '挥拍 !',
      body:
        '<div class="bd">' +
          petTag('bd__pet', 'rabbit') +
          '<img class="bd__racket" id="arc-racket" src="' + A.racket + '" alt="">' +
          '<img class="bd__shuttle" id="arc-shuttle" src="' + A.shuttle + '" alt="">' +
          '<div class="bd__net"></div>' +
          '<div class="bd__zone"></div>' +
        '</div>',
      onAction: hit
    });

    var shut = bodyEl.querySelector('#arc-shuttle');
    var racket = bodyEl.querySelector('#arc-racket');
    var zone = bodyEl.querySelector('.bd__zone');

    function loop() {
      x += dir * speed;
      if (dir < 0 && x <= 3) { finish('球落地了…'); return; }
      if (dir > 0 && x >= 94) { dir = -1; }
      shut.style.left = x + '%';
      var near = dir < 0 && x <= cfg.zone;
      racket.classList.toggle('is-ready', near);
      zone.classList.toggle('is-ready', near);
      raf = requestAnimationFrame(loop);
    }
    loop();
    active = { stop: stopRaf };

    function hit() {
      if (over) return;
      if (dir < 0 && x <= cfg.zone) {
        rally += 1;
        hitStreak += 1; missStreak = 0;
        pay(cfg.coins, shut, false);
        EG.Audio.play('pop');
        dir = 1;
        /* 同一回合里慢慢加快（比以前温和），上限跟着档位走 */
        speed = Math.min(speed * cfg.ramp, base * cfg.maxRamp);
        setScore('连击 ' + rally + ' 次｜共 ' + (rally * cfg.coins) + ' 颗');
        /* 连续接住很多次 → 升一档 */
        if (hitStreak >= cfg.upStreak && shiftLevel('badminton', 1)) {
          level = levelOf('badminton');
          base = speedOf('badminton', level);
          hitStreak = 0;
        }
      } else {
        finish('挥空了～');
      }
    }

    function finish(msg) {
      if (over) return;
      over = true;
      stopRaf();
      EG.Audio.play('error');
      /* 没接到 / 挥空都算一次失误：连续 2 次就降一档 */
      missStreak += 1; hitStreak = 0;
      if (missStreak >= cfg.downStreak) {
        missStreak = 0;
        shiftLevel('badminton', -1);
      }
      var total = rally * cfg.coins;
      setScore(msg + ' 连击 ' + rally + ' 次，共拿 ' + total + ' 颗');
      setAction('再来一局', startBadminton);
    }
  }

  /* ---------- ③ 老虎机 ---------- */
  function startSlot() {
    var cfg = C.slot;

    open({
      title: '🎰 投币老虎机',
      hint: '每次投 <b>' + cfg.cost + ' 颗</b>星星糖：三个一样中 <b>' + cfg.triple + ' 颗</b>，中两个退 ' + cfg.double + ' 颗',
      score: '现在有 ' + coins() + ' 颗星星糖',
      action: '投币 !',
      body:
        '<div class="sl">' +
          petTag('sl__pet', 'cat') +
          '<div class="sl__machine">' +
            '<div class="sl__reels">' +
              '<span class="sl__reel"><img id="arc-sl0" src="' + A.symbols[cfg.symbols[0]] + '" alt=""></span>' +
              '<span class="sl__reel"><img id="arc-sl1" src="' + A.symbols[cfg.symbols[0]] + '" alt=""></span>' +
              '<span class="sl__reel"><img id="arc-sl2" src="' + A.symbols[cfg.symbols[0]] + '" alt=""></span>' +
            '</div>' +
            '<div class="sl__tray">投币口</div>' +
          '</div>' +
        '</div>',
      onAction: spin
    });

    function spin() {
      if (spinningSlot) return;
      if (coins() < cfg.cost) {
        EG.Audio.play('error');
        setScore('星星糖不够啦～先去别的楼层赚一点吧');
        return;
      }
      spinningSlot = true;
      EG.State.addCoins(-cfg.cost);
      EG.Audio.play('click');
      setScore('投币 ' + cfg.cost + ' 颗…转起来！');

      var result = [0, 1, 2].map(function () { return EG.util.rand(cfg.symbols); });
      [0, 1, 2].forEach(function (i) {
        var img = bodyEl.querySelector('#arc-sl' + i);
        var cycles = 9 + i * 5;
        var speed = 60 + i * 14;
        (function tick() {
          img.src = A.symbols[EG.util.rand(cfg.symbols)];
          cycles -= 1;
          if (cycles > 0) { later(tick, speed); return; }
          img.src = A.symbols[result[i]];
          if (i === 2) settle(result);
        })();
      });
    }

    function settle(res) {
      spinningSlot = false;
      var same = res[0] === res[1] && res[1] === res[2];
      var two = !same && (res[0] === res[1] || res[1] === res[2] || res[0] === res[2]);
      var win = same ? cfg.triple : (two ? cfg.double : 0);
      if (win) {
        pay(win, bodyEl.querySelector('.sl__machine'), same);
        setScore((same ? '三个一样！中 ' + win + ' 颗 🎉' : '中了两个，退你 ' + win + ' 颗') +
                 '（现在有 ' + coins() + ' 颗）');
      } else {
        EG.Audio.play('error');
        setScore('差一点点…再来一次？（现在有 ' + coins() + ' 颗）');
      }
    }
  }

  var GAMES = { basket: startBasket, badminton: startBadminton, slot: startSlot };

  /* 点弹窗外面的遮罩、或右上角 × 都能关掉 */
  if (closeEl) closeEl.addEventListener('click', close);
  if (root) {
    root.addEventListener('click', function (e) {
      if (e.target === root) close();
    });
  }

  EG.Floors.register({
    id: 6,
    mount: function (propsEl) {
      box = propsEl;
      C.list.forEach(function (g) {
        var btn = EG.util.el('button', 'booth booth--' + g.id);
        btn.type = 'button';
        btn.style.left = g.x + '%';
        btn.style.bottom = C.btnBottom + 'px';
        btn.innerHTML = '<span class="booth__icon">' + g.icon + '</span><span class="booth__name">' + g.name + '</span>';
        btn.addEventListener('click', function () {
          EG.Audio.play('click');
          if (GAMES[g.id]) GAMES[g.id]();
        });
        box.appendChild(btn);
      });
      EG.Say.show('欢迎来到游乐区～点摊位上的按钮就能玩啦！', 3200);
    },
    unmount: function () {
      close();
      box = null;
    }
  });

  /* 换楼层的时候要把弹窗收起来（main.js 会调用） */
  EG.Arcade = { close: close, isOpen: isOpen };
})(window.EG);
