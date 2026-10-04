/* ============================================================
   1F 糖果屋 —— 点糖果罐里的糖果收星星糖
   想调整糖果种类/位置/数量，改下面的 TYPES 和 SPOTS 就好
   ============================================================ */
(function (EG) {
  'use strict';

  var I = EG.ASSETS.items;

  /* 糖果种类与权重（w 越大越常见） */
  var TYPES = [
    { k: 'lollipop', src: I.candyLollipop, w: 3 },
    { k: 'drop',     src: I.candyDrop,     w: 3 },
    { k: 'star',     src: I.candyStar,     w: 2 },
    { k: 'heart',    src: I.candyHeart,    w: 2 },
    { k: 'gummy',    src: I.candyGummy,    w: 2 }
  ];

  /* 糖果罐内部的落点（房间原稿 1200×675 坐标）
     最下面一颗别贴太低：手机上加大的点击热区会碰到底部的台词气泡 */
  var SPOTS = [
    [545, 352], [655, 342], [600, 412], [532, 464],
    [668, 448], [598, 508], [556, 396], [648, 492]
  ];

  var MAX = 6;          // 罐子里同时最多几颗糖
  var GOLD_RATE = 0.14; // 金糖果出现概率

  var box = null;
  var live = 0;
  var timers = [];
  var collected = 0;
  var hint = null;

  function later(fn, ms) {
    var t = window.setTimeout(function () {
      timers = timers.filter(function (x) { return x !== t; });
      fn();
    }, ms);
    timers.push(t);
  }

  function pickType() {
    if (Math.random() < GOLD_RATE) return { k: 'gold', src: I.candyGold, gold: true };
    var total = TYPES.reduce(function (s, t) { return s + t.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < TYPES.length; i++) {
      r -= TYPES[i].w;
      if (r <= 0) return TYPES[i];
    }
    return TYPES[0];
  }

  function freeSpots(used) {
    return SPOTS.filter(function (s, i) { return used.indexOf(i) === -1; });
  }

  function spawn(spotIndex) {
    if (!box) return;
    var spot = SPOTS[spotIndex];
    var type = pickType();
    var node = EG.util.el('div', 'candy' + (type.gold ? ' is-gold' : ''));
    node.style.left = (spot[0] / 1200 * 100) + '%';
    node.style.top = (spot[1] / 675 * 100) + '%';
    node.style.animationDelay = (-Math.random() * 2.6).toFixed(2) + 's';
    node.innerHTML = '<img src="' + type.src + '" alt="">';
    node.dataset.spot = spotIndex;
    box.appendChild(node);
    live++;

    node.addEventListener('click', function () { pick(node, type, spotIndex); });
  }

  function pick(node, type, spotIndex) {
    if (node.classList.contains('is-taken')) return;
    node.classList.add('is-taken');
    live--;

    var gold = !!type.gold;
    var value = gold ? 5 : 1;
    var p = EG.FX.positionOf(node);

    EG.Audio.play(gold ? 'success' : 'pop');
    EG.FX.hit(p.x, p.y, '+' + value, gold);
    if (gold) {
      EG.FX.sparkle(p.x, p.y, 10);
      EG.Say.face('happy', 1200);
      EG.Say.show('金色的！好厉害～', 1800);
    } else if (Math.random() < 0.18) {
      EG.Say.face('happy', 900);
    }

    EG.State.addCoins(value);
    EG.State.bump('candy');
    if (gold) EG.State.bump('gold');
    collected += value;
    updateHint();

    window.setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 340);

    /* 过一会儿从同一个位置再冒一颗出来 */
    later(function () {
      if (box && live < MAX) spawn(spotIndex);
    }, EG.util.randInt(600, 1300));
  }

  function updateHint() {
    if (hint) hint.innerHTML = '糖果罐 · 已收 <b style="color:#FF8FAB">' + collected + '</b> ⭐';
  }

  function fill() {
    var used = [];
    for (var i = 0; i < MAX; i++) {
      var pool = freeSpots(used);
      if (!pool.length) break;
      var spot = pool[Math.floor(Math.random() * pool.length)];
      var spotIndex = SPOTS.indexOf(spot);
      used.push(spotIndex);
      (function (si, delay) {
        later(function () { if (box && live < MAX) spawn(si); }, delay);
      })(spotIndex, i * 130);
    }
  }

  EG.Floors.register({
    id: 1,
    mount: function (propsEl) {
      box = propsEl;
      live = 0;
      hint = EG.util.el('div', 'jarhint');
      hint.innerHTML = '糖果罐 · 已收 <b style="color:#FF8FAB">0</b> ⭐';
      box.appendChild(hint);
      fill();
      EG.Say.show('欢迎来到糖果屋～点糖果就有星星糖啦！', 3200);
    },
    unmount: function () {
      timers.forEach(window.clearTimeout);
      timers = [];
      box = null;
      live = 0;
      hint = null;
    }
  });
})(window.EG);
