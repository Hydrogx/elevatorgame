/* ============================================================
   shop.js —— 4F 服装店 + 宠物装扮面板
     商品清单直接从 config 推导：closet.items / petwear.items 里
     凡是写了 price 的，都是要花星星糖买的。
     买过的东西记在存档 owned 里，换装面板里没买的会显示 🔒+价格。
   ============================================================ */
(function (EG) {
  'use strict';

  var root = document.querySelector('#shop');
  var bodyEl = document.querySelector('#shop-body');
  var coinsEl = document.querySelector('#shop-coins');
  var closeEl = document.querySelector('#shop-close');

  var dress = document.querySelector('#petdress');
  var dressBody = document.querySelector('#petdress-body');
  var dressClose = document.querySelector('#petdress-close');

  var asking = null;          // 正在「再点一次就买」的商品

  /* ---------- 商品清单 ---------- */
  function garmentGoods() {
    var out = [];
    var items = EG.CONFIG.closet.items;
    ['hair', 'headwear', 'clothes', 'shoes'].forEach(function (slot) {
      (items[slot] || []).forEach(function (it) {
        if (it.price) out.push({ kind: 'garment', slot: slot, id: it.id, name: it.name, price: it.price });
      });
    });
    return out;
  }

  function petGoods() {
    return EG.CONFIG.petwear.items
      .filter(function (it) { return it.price; })
      .map(function (it) { return { kind: 'pet', id: it.id, name: it.name, price: it.price }; });
  }

  function keyOf(g) {
    return g.kind === 'pet' ? ('pet:' + g.id) : (g.slot + ':' + g.id);
  }

  function owned(g) { return !!EG.State.data.owned[keyOf(g)]; }
  function ownsGarment(slot, id) { return !!EG.State.data.owned[slot + ':' + id]; }
  function ownsPet(id) { return !!EG.State.data.owned['pet:' + id]; }

  /* 买下来；钱不够返回 false */
  function buy(g) {
    if (owned(g)) return true;
    if (EG.State.data.coins < g.price) {
      EG.Audio.play('error');
      EG.Say.show('星星糖不够啦～还差 ' + (g.price - EG.State.data.coins) + ' 颗，去别的楼层赚一点吧', 2600);
      return false;
    }
    EG.State.addCoins(-g.price);
    EG.State.data.owned[keyOf(g)] = 1;
    EG.State.save();
    EG.Audio.play('success');
    EG.Say.mood('happy');
    EG.Say.show('买到「' + g.name + '」啦！' + (g.kind === 'pet' ? '去宠物装扮里给它戴上吧～' : '已经帮你穿上了～'), 2600);
    return true;
  }

  /* ---------- 商店界面 ---------- */
  function cardHtml(g, cropClass) {
    var has = owned(g);
    var src = g.kind === 'pet' ? EG.ASSETS.petwear[g.id] : EG.Outfit.srcFor(g.slot, g.id);
    return '<button class="shopcard' + (has ? ' is-owned' : '') + (asking === keyOf(g) ? ' is-asking' : '') + '"' +
      ' data-kind="' + g.kind + '" data-slot="' + (g.slot || '') + '" data-id="' + g.id + '" type="button">' +
      '<span class="shopcard__pic ' + cropClass + '"><img src="' + src + '" alt=""></span>' +
      '<span class="shopcard__name">' + g.name + '</span>' +
      (has
        ? '<span class="shopcard__state">已拥有</span>'
        : '<span class="shopcard__state"><img src="' + EG.ASSETS.ui.coin + '" alt="">' +
          (asking === keyOf(g) ? '再点一次买下' : g.price) + '</span>') +
      '</button>';
  }

  function renderShop() {
    if (!bodyEl) return;
    coinsEl.textContent = EG.State.data.coins;
    var html = '<h4 class="shop__group">👗 给自己的衣服</h4><div class="shop__grid">';
    garmentGoods().forEach(function (g) { html += cardHtml(g, 'garment--' + g.slot); });
    html += '</div><h4 class="shop__group">🐾 给宠物的装扮</h4><div class="shop__grid">';
    petGoods().forEach(function (g) { html += cardHtml(g, 'petwear pw--' + g.id); });
    html += '</div>';
    bodyEl.innerHTML = html;

    Array.prototype.forEach.call(bodyEl.querySelectorAll('.shopcard'), function (el) {
      el.addEventListener('click', function () {
        var g = {
          kind: el.dataset.kind,
          slot: el.dataset.slot || undefined,
          id: el.dataset.id,
          name: el.querySelector('.shopcard__name').textContent,
          price: 0
        };
        /* 找回价格 */
        (g.kind === 'pet' ? petGoods() : garmentGoods()).forEach(function (x) {
          if (x.id === g.id && (g.kind === 'pet' || x.slot === g.slot)) g.price = x.price;
        });

        if (owned(g)) {
          EG.Audio.play('click');
          if (g.kind === 'pet') {
            /* 已拥有的宠物饰品：让玩家去装扮面板选宠物 */
            askPetDress(g);
          } else {
            EG.Outfit.set(g.slot, g.id, { silent: true });
            EG.Audio.play('pop');
          }
          return;
        }

        if (asking !== keyOf(g)) {
          asking = keyOf(g);
          EG.Audio.play('click');
          EG.Say.show('「' + g.name + '」要 ' + g.price + ' 颗星星糖，再点一次就买下～', 2800);
          renderShop();
          return;
        }

        asking = null;
        if (buy(g)) {
          if (g.kind === 'garment') EG.Outfit.set(g.slot, g.id, { silent: true });
          else askPetDress(g);
        }
        renderShop();
      });
    });
  }

  function askPetDress(g) {
    EG.Say.show('「' + g.name + '」买好啦～去「宠物装扮」挑一只宠物戴上吧', 3000);
  }

  /* ---------- 宠物装扮界面 ---------- */
  function renderDress() {
    if (!dressBody) return;
    var html = '';
    EG.CONFIG.pets.list.forEach(function (pet) {
      var cur = EG.PetWear.of(pet.id);
      html += '<div class="dressrow">' +
        '<div class="dressrow__pet" data-pet="' + pet.id + '">' +
          '<img class="dressrow__body" src="' + EG.ASSETS.pets.list[pet.id].idle + '" alt="' + pet.name + '">' +
          '<img class="pet__wear" alt="">' +
        '</div>' +
        '<div class="dressrow__name">' + pet.name + '<small>' + pet.kind + '</small></div>' +
        '<div class="dressrow__list">';
      EG.CONFIG.petwear.items.forEach(function (it) {
        var locked = it.price && !ownsPet(it.id);
        html += '<button class="dressitem pw--' + it.id + (cur === it.id ? ' is-active' : '') + (locked ? ' is-locked' : '') +
          '" data-pet="' + pet.id + '" data-item="' + it.id + '" type="button" title="' + it.name + '">' +
          (it.id ? '<img src="' + EG.ASSETS.petwear[it.id] + '" alt="' + it.name + '">' : '<span>不戴</span>') +
          (locked ? '<em>🔒' + it.price + '</em>' : '') +
          '</button>';
      });
      html += '</div></div>';
    });
    dressBody.innerHTML = html;

    Array.prototype.forEach.call(dressBody.querySelectorAll('.dressitem'), function (el) {
      el.addEventListener('click', function () {
        var petId = el.dataset.pet;
        var itemId = el.dataset.item;
        if (el.classList.contains('is-locked')) {
          EG.Audio.play('error');
          EG.Say.show('这个还没买哦～先去「商店」买下来吧', 2200);
          return;
        }
        EG.Audio.play('click');
        EG.PetWear.equip(petId, itemId);
        renderDress();
      });
    });
    EG.PetWear.refresh();
  }

  /* ---------- 打开 / 关闭 ---------- */
  function open(el) { if (el) el.classList.add('is-open'); }
  function close(el) { if (el) el.classList.remove('is-open'); }

  function openShop() {
    asking = null;
    renderShop();
    open(root);
  }
  function openDress() {
    renderDress();
    open(dress);
  }

  if (closeEl) closeEl.addEventListener('click', function () { close(root); });
  if (dressClose) dressClose.addEventListener('click', function () { close(dress); });
  if (root) root.addEventListener('click', function (e) { if (e.target === root) close(root); });
  if (dress) dress.addEventListener('click', function (e) { if (e.target === dress) close(dress); });

  EG.Shop = {
    open: openShop,
    openDress: openDress,
    closeAll: function () { close(root); close(dress); },
    isOpen: function () {
      return (root && root.classList.contains('is-open')) || (dress && dress.classList.contains('is-open'));
    },
    ownsGarment: ownsGarment,
    ownsPet: ownsPet,
    buyGarment: function (slot, id) {
      var g = garmentGoods().filter(function (x) { return x.slot === slot && x.id === id; })[0];
      if (!g) return true;
      var ok = buy(g);
      if (ok) renderShop();
      return ok;
    },
    refresh: function () {
      if (root && root.classList.contains('is-open')) renderShop();
      if (dress && dress.classList.contains('is-open')) renderDress();
    }
  };
})(window.EG);
