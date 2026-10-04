/* ============================================================
   5F 宠物层 —— 摸一摸 / 喂零食，好感度满了变好朋友
   想加宠物：assets/pets/ 放一对图（idle + happy），再在
   config.pets.list 和 EG.ASSETS.pets.list 里各加一项即可
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG;
  var P = C.pets;
  var A = EG.ASSETS.pets;

  var box = null;
  var held = null;         // 手上拿着的零食 id
  var nodes = {};          // petId -> { el, img, bar, fill, badge, cool }
  var timers = [];
  var foodEls = {};        // foodId -> element

  var LINES = {
    cat:    ['咕噜咕噜～', '团子眯起眼睛了', '团子蹭了蹭你的手'],
    dog:    ['汪汪！尾巴摇成风火轮', '豆豆舔了舔你的手', '豆豆翻过来露肚皮'],
    rabbit: ['雪球抖了抖耳朵', '雪球开心地蹦了一下', '雪球把脸埋进小爪子里']
  };

  function later(fn, ms) {
    var t = window.setTimeout(function () {
      timers = timers.filter(function (x) { return x !== t; });
      fn();
    }, ms);
    timers.push(t);
  }

  function defOf(id) {
    return P.list.filter(function (p) { return p.id === id; })[0];
  }

  function petState(id) {
    var all = EG.State.data.pets || (EG.State.data.pets = {});
    if (!all[id]) all[id] = { aff: 0, lv: 0 };
    return all[id];
  }

  /* 心形进度条 + 星级 */
  function paint(id) {
    var n = nodes[id];
    var s = petState(id);
    var full = s.lv >= P.maxLevel;
    var pct = full ? 100 : Math.min(100, (s.aff / P.levelAt) * 100);
    n.fill.style.width = pct + '%';
    n.bar.classList.toggle('is-full', full);
    n.badge.textContent = s.lv >= 2 ? '★★' : (s.lv === 1 ? '★' : '');
    n.badge.classList.toggle('is-show', s.lv > 0);
    n.el.classList.toggle('is-friend', s.lv >= P.maxLevel);
  }

  /* 换成开心表情，过一会儿换回来 */
  function happy(id, ms) {
    var n = nodes[id];
    var set = A.list[id];
    n.img.src = set.happy;
    n.el.classList.add('is-happy');
    later(function () {
      n.img.src = set.idle;
      n.el.classList.remove('is-happy');
    }, ms || 900);
  }

  /* 加好感度；升级返回 true */
  function addAffinity(id, amount) {
    var s = petState(id);
    if (s.lv >= P.maxLevel) {
      s.aff = P.levelAt;
      paint(id);
      return false;
    }
    s.aff += amount;
    var leveled = false;
    while (s.aff >= P.levelAt && s.lv < P.maxLevel) {
      s.aff -= P.levelAt;
      s.lv += 1;
      leveled = true;
      var bonus = P.levelBonus[s.lv - 1] || 5;
      EG.State.addCoins(bonus);
      celebrate(id, bonus);
    }
    if (s.lv >= P.maxLevel) s.aff = P.levelAt;
    EG.State.save();
    paint(id);
    return leveled;
  }

  function celebrate(id, bonus) {
    var def = defOf(id);
    var n = nodes[id];
    var p = EG.FX.positionOf(n.el);
    EG.Audio.play('success');
    EG.FX.sparkle(p.x, p.y - 14, 12);
    EG.FX.float(p.x, p.y - 30, '★ 好朋友 +' + bonus);
    EG.Say.mood('happy');
    EG.Say.show('和' + def.name + '变成好朋友啦！奖励 ' + bonus + ' 颗星星糖 ✨', 3000);
    later(function () { EG.Say.mood('idle'); }, 3200);
  }

  function shake(id) {
    var n = nodes[id];
    n.el.classList.remove('is-shake');
    void n.el.offsetWidth;
    n.el.classList.add('is-shake');
    later(function () { n.el.classList.remove('is-shake'); }, 500);
  }

  /* 摸一摸 */
  function tapPet(id) {
    var n = nodes[id];
    var def = defOf(id);
    if (n.cool) return;
    n.cool = true;
    later(function () { n.cool = false; }, 750);

    EG.Audio.play('pop');
    EG.State.addCoins(P.coinPet);
    EG.State.bump('pet');
    var p = EG.FX.positionOf(n.el);
    EG.FX.hit(p.x, p.y - 10, '+' + P.coinPet);
    happy(id, 900);
    var leveled = addAffinity(id, P.affinityPerPet);
    if (!leveled) {
      var s = petState(id);
      EG.Say.show(s.lv >= P.maxLevel
        ? EG.util.rand(LINES[id])
        : EG.util.rand(LINES[id]) + '（好感 +' + P.affinityPerPet + '）', 1700);
    }
  }

  /* 喂零食 */
  function feed(id) {
    var n = nodes[id];
    var def = defOf(id);
    if (!held) { tapPet(id); return; }

    if (held === def.food) {
      EG.Audio.play('success');
      EG.State.addCoins(P.coinFeed);
      EG.State.bump('feed');
      var p = EG.FX.positionOf(n.el);
      EG.FX.hit(p.x, p.y - 10, '+' + P.coinFeed, true);
      happy(id, 1100);
      var leveled = addAffinity(id, P.affinityPerFeed);
      if (!leveled) EG.Say.show(def.name + '吃得超开心！（好感 +' + P.affinityPerFeed + '）', 2000);
      clearHeld();
    } else {
      EG.Audio.play('error');
      shake(id);
      addAffinity(id, P.affinityWrong);
      EG.Say.show(def.name + '摇摇头：这个我不吃…', 2000);
    }
  }

  function clearHeld() {
    if (held && foodEls[held]) foodEls[held].classList.remove('is-held');
    held = null;
  }

  function pickFood(foodId, el) {
    if (held === foodId) { clearHeld(); return; }   // 再点一下放下
    clearHeld();
    held = foodId;
    el.classList.add('is-held');
    EG.Audio.play('click');
    var f = P.foods.filter(function (x) { return x.id === foodId; })[0];
    EG.Say.show('拿着' + f.name + '啦～去点一只宠物喂它吧', 2400);
  }

  function buildPet(def) {
    var el = EG.util.el('div', 'pet pet--' + def.id);
    el.dataset.pet = def.id;                 // 让 PetWear 能找到并叠上装扮
    el.style.left = def.x + '%';
    el.style.bottom = P.petBottom + 'px';
    el.innerHTML =
      '<div class="pet__bar">' +
        '<img class="pet__heart" src="' + A.heart + '" alt="">' +
        '<span class="pet__meter"><i></i></span>' +
        '<span class="pet__badge"></span>' +
      '</div>' +
      '<img class="pet__img" src="' + A.list[def.id].idle + '" alt="' + def.name + '">' +
      '<img class="pet__wear" alt="">' +
      '<div class="pet__name">' + def.name + '<small>' + def.kind + '</small></div>';

    el.addEventListener('click', function () { feed(def.id); });

    box.appendChild(el);
    nodes[def.id] = {
      el: el,
      img: el.querySelector('.pet__img'),
      bar: el.querySelector('.pet__bar'),
      fill: el.querySelector('.pet__meter i'),
      badge: el.querySelector('.pet__badge'),
      cool: false
    };
    paint(def.id);
  }

  function buildFoods() {
    var bowl = EG.util.el('img', 'bowl');
    bowl.src = A.bowl;
    bowl.alt = '食盆';
    bowl.style.left = P.bowlLeft + '%';
    bowl.style.bottom = P.foodBottom + 'px';
    box.appendChild(bowl);

    P.foods.forEach(function (f, i) {
      var el = EG.util.el('div', 'food');
      el.style.left = P.foodLeft[i] + '%';
      el.style.bottom = P.foodBottom + 'px';
      el.title = f.name;
      el.innerHTML = '<img src="' + A.foods[f.id] + '" alt="' + f.name + '">' +
                     '<span class="food__label">' + f.name + '</span>';
      el.addEventListener('click', function () { pickFood(f.id, el); });
      box.appendChild(el);
      foodEls[f.id] = el;
    });
  }

  EG.Floors.register({
    id: 5,
    mount: function (propsEl) {
      box = propsEl;
      nodes = {};
      foodEls = {};
      held = null;

      P.list.forEach(buildPet);
      buildFoods();

      EG.PetWear.refresh();      // 把 4F 装扮好的饰品戴上去
      EG.Say.show('欢迎来到宠物层～摸摸它们，或者喂点零食吧！', 3200);
    },
    unmount: function () {
      timers.forEach(window.clearTimeout);
      timers = [];
      box = null;
      nodes = {};
      foodEls = {};
      held = null;
    }
  });
})(window.EG);
