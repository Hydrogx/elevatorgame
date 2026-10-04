/* ============================================================
   2F 冰淇淋屋 —— 选球 + 选配料 → 自动做好 → 点一下卖出去
   ============================================================ */
(function (EG) {
  'use strict';

  var I = EG.ASSETS.items;

  /* 三种口味（x/y 是柜台上的位置，房间原稿 1200×675 坐标） */
  var FLAVORS = [
    { id: 'pink',  name: '草莓', src: I.scoopPink,  x: 155, y: 545 },
    { id: 'mint',  name: '抹茶', src: I.scoopMint,  x: 275, y: 545 },
    { id: 'cream', name: '香草', src: I.scoopCream, x: 395, y: 545 }
  ];

  /* 三种配料（柜台上另一侧） */
  var TOPPINGS = [
    { id: 'star',   name: '星星糖',  src: I.toppingStar,   x: 805,  y: 545 },
    { id: 'cherry', name: '樱桃',    src: I.toppingCherry, x: 925,  y: 545 },
    { id: 'choco',  name: '巧克力酱', src: I.toppingChoco,  x: 1045, y: 545 }
  ];

  /* 推荐搭配：卖得更贵 */
  var BEST = { 'pink+cherry': 1, 'mint+star': 1, 'cream+choco': 1 };

  var BASE = 3;      // 基础售价
  var BONUS = 2;     // 推荐搭配额外加成

  var box = null, stack = null;
  var flavor = null, topping = null, ready = false;
  var timers = [];
  var built = 0;

  function later(fn, ms) {
    var t = window.setTimeout(function () {
      timers = timers.filter(function (x) { return x !== t; });
      fn();
    }, ms);
    timers.push(t);
  }

  function makePick(item, group) {
    var node = EG.util.el('div', 'pick');
    node.style.left = (item.x / 1200 * 100) + '%';
    node.style.top = (item.y / 675 * 100) + '%';
    node.innerHTML =
      '<div class="pick__btn">' + EG.util.img(item.src) + '</div>' +
      '<div class="pick__label">' + item.name + '</div>';
    node.addEventListener('click', function () {
      if (ready) {
        EG.Audio.play('error');
        EG.Say.show('先把手上这个卖出去嘛～', 1600);
        return;
      }
      EG.Audio.play('click');
      choose(group, item, node);
    });
    return node;
  }

  function choose(group, item, node) {
    var siblings = box.querySelectorAll('.pick');
    siblings.forEach(function (n) { n.classList.remove('is-active'); });
    node.classList.add('is-active');
    if (group === 'flavor') flavor = item; else topping = item;
    tryMake();
  }

  function tryMake() {
    if (!flavor || !topping || ready) return;
    later(build, 420);
  }

  function price(f, t) {
    return BASE + (BEST[f.id + '+' + t.id] ? BONUS : 0);
  }

  function build() {
    if (!flavor || !topping || ready) return;
    ready = true;
    stack.innerHTML = '';
    stack.classList.remove('is-ready', 'is-pop');

    /* DOM 顺序 = 从上到下：配料 → 冰淇淋球 → 蛋筒 */
    stack.appendChild(EG.util.el('img', 'icecream__topping', null));
    stack.lastChild.src = topping.src;
    stack.appendChild(EG.util.el('img', 'icecream__scoop', null));
    stack.lastChild.src = flavor.src;
    stack.appendChild(EG.util.el('img', 'icecream__cone', null));
    stack.lastChild.src = I.cone;

    var isBest = !!BEST[flavor.id + '+' + topping.id];
    var badge = EG.util.el('div', 'icecream__price');
    badge.innerHTML = EG.util.img(EG.ASSETS.ui.coin) + '<span>' + price(flavor, topping) + '</span>';
    stack.appendChild(badge);

    void stack.offsetWidth;
    stack.classList.add('is-pop', 'is-ready');

    EG.Audio.play('success');
    if (isBest) {
      EG.Say.mood('happy');
      EG.Say.show('哇！' + flavor.name + '配' + topping.name + '，最棒的组合！', 2600);
      var p = EG.FX.positionOf(stack);
      EG.FX.sparkle(p.x, p.y - 6, 10);
    } else {
      EG.Say.show('做好啦～点一下卖出去！', 2200);
    }
    built++;
  }

  function sell() {
    if (!ready || !flavor || !topping) return;
    var value = price(flavor, topping);
    var p = EG.FX.positionOf(stack);

    EG.Audio.play('coin');
    EG.FX.hit(p.x, p.y - 4, '+' + value, true);
    EG.State.addCoins(value);
    EG.State.bump('icecream');
    EG.State.noteRecipe(flavor.id + '+' + topping.id);
    EG.Say.mood('happy');
    EG.Say.show('卖出去啦！收到 ' + value + ' 颗星星糖～', 2200);

    ready = false;
    stack.classList.remove('is-ready');
    stack.innerHTML = '';
    box.querySelectorAll('.pick').forEach(function (n) { n.classList.remove('is-active'); });
    flavor = null;
    topping = null;
  }

  EG.Floors.register({
    id: 2,
    mount: function (propsEl) {
      box = propsEl;
      flavor = null;
      topping = null;
      ready = false;
      built = 0;

      FLAVORS.forEach(function (f) { box.appendChild(makePick(f, 'flavor')); });
      TOPPINGS.forEach(function (t) { box.appendChild(makePick(t, 'topping')); });

      stack = EG.util.el('div', 'icecream');
      stack.addEventListener('click', sell);
      box.appendChild(stack);

      EG.Say.show('选一个球，再选一个配料吧～', 3000);
    },
    unmount: function () {
      timers.forEach(window.clearTimeout);
      timers = [];
      box = null;
      stack = null;
      flavor = null;
      topping = null;
      ready = false;
    }
  });
})(window.EG);
