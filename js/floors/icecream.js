/* ============================================================
   2F 冰淇淋屋 —— 顾客点单：口味 + 配料都对上，奖励翻倍
   流程：顾客点单 → 选球 → 选配料 → 自动做好 → 点一下卖出去
   ============================================================ */
(function (EG) {
  'use strict';

  var I = EG.ASSETS.items;
  var C = EG.CONFIG.icecream;

  /* 三种口味（x/y 是柜台上的位置，房间原稿 1200×675 坐标） */
  var FLAVORS = [
    { id: 'pink',  name: '草莓', src: I.scoopPink,  x: 155, y: 545 },
    { id: 'mint',  name: '抹茶', src: I.scoopMint,  x: 275, y: 545 },
    { id: 'cream', name: '香草', src: I.scoopCream, x: 395, y: 545 }
  ];

  /* 三种配料（柜台上另一侧） */
  var TOPPINGS = [
    { id: 'star',   name: '星星糖',   src: I.toppingStar,   x: 805,  y: 545 },
    { id: 'cherry', name: '樱桃',     src: I.toppingCherry, x: 925,  y: 545 },
    { id: 'choco',  name: '巧克力酱', src: I.toppingChoco,  x: 1045, y: 545 }
  ];

  var box = null, stack = null;
  var orderWrap = null, customerEl = null, customerImg = null, customerName = null;
  var flavor = null, topping = null, ready = false;
  var order = null;          // { customer, flavor, topping }
  var timers = [];

  function later(fn, ms) {
    var t = window.setTimeout(function () {
      timers = timers.filter(function (x) { return x !== t; });
      fn();
    }, ms);
    timers.push(t);
  }

  /* ---------- 顾客点单 ---------- */
  function newOrder() {
    var c = EG.util.rand(C.customers);
    var f = EG.util.rand(FLAVORS);
    var t = EG.util.rand(TOPPINGS);
    var guard = 0;
    /* 尽量别连续来同一位顾客点同一份 */
    while (order && guard++ < 24 &&
           c.id === order.customer.id && f.id === order.flavor.id && t.id === order.topping.id) {
      c = EG.util.rand(C.customers);
      f = EG.util.rand(FLAVORS);
      t = EG.util.rand(TOPPINGS);
    }
    order = { customer: c, flavor: f, topping: t };
    paintOrder();
  }

  function paintOrder() {
    if (!order) return;
    customerImg.src = EG.ASSETS.customers[order.customer.id];
    customerName.textContent = order.customer.name;
    orderWrap.innerHTML =
      '<span class="order__text">我要</span>' +
      '<img class="order__icon" src="' + order.flavor.src + '" alt="' + order.flavor.name + '">' +
      '<span class="order__text">+</span>' +
      '<img class="order__icon" src="' + order.topping.src + '" alt="' + order.topping.name + '">' +
      '<span class="order__text">！</span>';
    orderWrap.classList.remove('is-new');
    void orderWrap.offsetWidth;
    orderWrap.classList.add('is-new');
  }

  function isMatch() {
    return !!(order && flavor && topping &&
              flavor.id === order.flavor.id && topping.id === order.topping.id);
  }

  /* 当前这杯能卖多少 */
  function price() {
    if (!flavor || !topping) return C.base;
    return isMatch() ? C.match : C.base;
  }

  /* ---------- 选球 / 选配料 ---------- */
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
    box.querySelectorAll('.pick').forEach(function (n) { n.classList.remove('is-active'); });
    node.classList.add('is-active');
    if (group === 'flavor') flavor = item; else topping = item;
    tryMake();
  }

  function tryMake() {
    if (!flavor || !topping || ready) return;
    later(build, 420);
  }

  /* ---------- 做好一支冰淇淋 ---------- */
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

    var hit = isMatch();
    var badge = EG.util.el('div', 'icecream__price' + (hit ? ' is-match' : ''));
    badge.innerHTML = EG.util.img(EG.ASSETS.ui.coin) + '<span>' + price() + '</span>';
    stack.appendChild(badge);

    void stack.offsetWidth;
    stack.classList.add('is-pop', 'is-ready');

    EG.Audio.play('success');
    if (hit) {
      EG.Say.mood('happy');
      EG.Say.show('完全对上点单！可以卖 ' + C.match + ' 颗星星糖 ✨', 2600);
      var p = EG.FX.positionOf(stack);
      EG.FX.sparkle(p.x, p.y - 6, 10);
    } else {
      EG.Say.show('做好啦～不过好像不是客人点的…', 2200);
    }
  }

  /* ---------- 卖出去 ---------- */
  function sell() {
    if (!ready || !flavor || !topping) return;
    var hit = isMatch();
    var value = price();
    var p = EG.FX.positionOf(stack);

    EG.Audio.play(hit ? 'success' : 'coin');
    EG.FX.hit(p.x, p.y - 4, '+' + value, hit);
    EG.State.addCoins(value);
    EG.State.bump('icecream');
    EG.State.noteRecipe(flavor.id + '+' + topping.id);

    if (hit) {
      EG.State.bump('match');
      EG.Say.mood('happy');
      EG.Say.show(order.customer.name + '超开心！谢谢你～', 2600);
      customerEl.classList.remove('is-happy');
      void customerEl.offsetWidth;
      customerEl.classList.add('is-happy');
      var cp = EG.FX.positionOf(customerEl);
      EG.FX.sparkle(cp.x, cp.y - 10, 10);
      later(newOrder, 900);          /* 下一位顾客 */
    } else {
      EG.Say.show(order.customer.name + '：这不是我点的…不过还是收下吧', 2600);
      customerEl.classList.remove('is-shake');
      void customerEl.offsetWidth;
      customerEl.classList.add('is-shake');
    }

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
      order = null;

      /* 顾客 + 点单气泡 */
      customerEl = EG.util.el('div', 'customer');
      customerImg = EG.util.el('img', 'customer__img');
      customerName = EG.util.el('div', 'customer__name');
      customerEl.appendChild(customerImg);
      customerEl.appendChild(customerName);
      box.appendChild(customerEl);

      orderWrap = EG.util.el('div', 'order');
      box.appendChild(orderWrap);

      FLAVORS.forEach(function (f) { box.appendChild(makePick(f, 'flavor')); });
      TOPPINGS.forEach(function (t) { box.appendChild(makePick(t, 'topping')); });

      stack = EG.util.el('div', 'icecream');
      stack.addEventListener('click', sell);
      box.appendChild(stack);

      newOrder();
      EG.Say.show('第一位客人来啦～看看他想要什么！', 3000);
    },

    unmount: function () {
      timers.forEach(window.clearTimeout);
      timers = [];
      box = null;
      stack = null;
      orderWrap = null;
      customerEl = null;
      customerImg = null;
      customerName = null;
      flavor = null;
      topping = null;
      order = null;
      ready = false;
    }
  });
})(window.EG);
