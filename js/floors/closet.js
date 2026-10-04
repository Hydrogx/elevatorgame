/* ============================================================
   4F 衣帽间 —— 换发型 / 头饰 / 衣服 / 鞋子
   改这里的类别或选项数量，房间里的行会自动排布（位置在 config.closet.rows）
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG;
  var box = null;

  var PER_PAGE = 4;          // 每页最多几个（这样按钮能保持够大，也一定塞得进选项板）

  function buildRow(cat) {
    var pos = C.closet.rows[cat.key] || { x: 78.4, y: 30 };
    var row = EG.util.el('div', 'fit fit--' + cat.key);
    row.style.left = pos.x + '%';
    row.style.top = pos.y + '%';

    var items = C.closet.items[cat.key] || [];
    var pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    var page = 0;

    /* 标题 + 翻页（只有一页时不显示翻页按钮） */
    var head = EG.util.el('div', 'fit__head');
    head.appendChild(EG.util.el('div', 'fit__label', cat.label));
    var pager = EG.util.el('div', 'fit__pager');
    var prev = EG.util.el('button', 'fit__arrow fit__prev', '‹');
    var info = EG.util.el('span', 'fit__page', '1/1');
    var next = EG.util.el('button', 'fit__arrow fit__next', '›');
    prev.type = 'button';
    next.type = 'button';
    pager.appendChild(prev);
    pager.appendChild(info);
    pager.appendChild(next);
    head.appendChild(pager);
    row.appendChild(head);

    var list = EG.util.el('div', 'fit__list');
    row.appendChild(list);

    function buildBtn(item) {
      var btn = EG.util.el('button', 'garment garment--' + cat.key);
      btn.type = 'button';
      btn.dataset.slot = cat.key;
      btn.dataset.item = item.id || '';
      btn.title = item.name;
      var src = EG.Outfit.srcFor(cat.key, item.id);
      var locked = !!item.price && !EG.Shop.ownsGarment(cat.key, item.id);
      var otherOwner = !!item.skin && !EG.Outfit.canWear(cat.key, item.id);

      btn.innerHTML = (src
        ? '<img src="' + src + '" alt="">'
        : '<span class="garment__none">' + item.name + '</span>') +
        (otherOwner
          ? '<img class="garment__who" src="' + EG.ASSETS.character[item.skin].avatar + '" alt="' + EG.CONFIG.skins[item.skin].name + '">'
          : (locked ? '<em class="garment__lock">🔒' + item.price + '</em>' : ''));
      if (locked) btn.classList.add('is-locked');
      if (otherOwner) btn.classList.add('is-other');

      btn.addEventListener('click', function () {
        /* 别人专属的：先提示去换主角（每次点击都重新判断，换主角后依然准） */
        if (item.skin && !EG.Outfit.canWear(cat.key, item.id)) {
          EG.Audio.play('error');
          var who = EG.CONFIG.skins[item.skin].name;
          var tail = (item.price && !EG.Shop.ownsGarment(cat.key, item.id))
            ? '（还没买：' + item.price + ' 颗，去 🛍 商店买）' : '';
          EG.Say.show('「' + item.name + '」是' + who + '的专属服装' + tail +
                      '～点右上角头像换成' + who + '就能穿啦', 3600);
          return;
        }
        /* 没买的：点第一次问一下，再点一次才扣钱买下来 */
        if (item.price && !EG.Shop.ownsGarment(cat.key, item.id)) {
          EG.Audio.play('click');
          if (!btn.classList.contains('is-asking')) {
            btn.classList.add('is-asking');
            EG.Say.show('「' + item.name + '」要 ' + item.price + ' 颗星星糖，再点一次就买下～', 2800);
            return;
          }
          btn.classList.remove('is-asking');
          if (!EG.Shop.buyGarment(cat.key, item.id)) return;   // 钱不够
          btn.classList.remove('is-locked');
          var lock = btn.querySelector('.garment__lock');
          if (lock) lock.parentNode.removeChild(lock);
        }
        EG.Audio.play('click');
        var fresh = EG.Outfit.set(cat.key, item.id);
        var p = EG.FX.positionOf(btn);
        EG.FX.sparkle(p.x, p.y, fresh ? 9 : 3);
      });
      return btn;
    }

    function render() {
      list.innerHTML = '';
      var slice = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

      /* 一页最多 4 个：安全宽度 280px（房间选项板内框到右侧电梯柱子之间），
         触屏上 mobile.css 会把按钮放大 1.1 倍，所以这里先除回去 */
      var SAFE = 280;
      var BOOST = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ? 1.1 : 1;
      var gap = 8;
      var size = Math.floor((SAFE - (slice.length - 1) * gap) / slice.length / BOOST);
      size = Math.max(36, Math.min(66, size));
      list.style.gap = gap + 'px';
      list.style.setProperty('--garment-size', size + 'px');

      slice.forEach(function (item) { list.appendChild(buildBtn(item)); });

      pager.style.display = pages > 1 ? '' : 'none';
      info.textContent = (page + 1) + '/' + pages;
      prev.disabled = page === 0;
      next.disabled = page === pages - 1;

      /* 高亮当前搭配 */
      Array.prototype.forEach.call(list.querySelectorAll('.garment'), function (b) {
        b.classList.toggle('is-active', (EG.Outfit.get(cat.key) || '') === (b.dataset.item || ''));
      });
    }

    function turn(delta) {
      var to = page + delta;
      if (to < 0 || to >= pages) return;
      page = to;
      EG.Audio.play('click');
      render();
    }

    prev.addEventListener('click', function () { turn(-1); });
    next.addEventListener('click', function () { turn(1); });

    /* 换主角后专属服装会变得能穿 / 不能穿：原地把小头像角标加上或去掉 */
    row.dataset.slot = cat.key;
    row._sync = function () {
      Array.prototype.forEach.call(list.querySelectorAll('.garment'), function (btn) {
        var it = EG.Outfit.itemOf(cat.key, btn.dataset.item) || {};
        var other = !!it.skin && !EG.Outfit.canWear(cat.key, it.id);
        btn.classList.toggle('is-other', other);
        var has = btn.querySelector('.garment__who');
        if (other && !has) {
          var av = EG.util.el('img', 'garment__who');
          av.src = EG.ASSETS.character[it.skin].avatar;
          av.alt = EG.CONFIG.skins[it.skin].name;
          btn.appendChild(av);
        } else if (!other && has) {
          has.parentNode.removeChild(has);
        }
      });
    };
    render();
    row._sync();
    return row;
  }

  EG.Floors.register({
    id: 4,
    mount: function (propsEl) {
      box = propsEl;

      /* 穿衣镜里的自己：和舞台上的主角共用同一套换装图层 */
      var mirror = EG.util.el('div', 'mirror');
      var avatar = EG.util.el('div', 'mirror__avatar');
      /* 镜子里的「自己」——跟着当前主角走（换角色 / 换表情都会同步） */
      var body = EG.util.el('img', 'mirror__body skin-body');
      var skin = (EG.Say && EG.Say.skin) ? EG.Say.skin() : EG.CONFIG.defaultSkin;
      body.src = EG.ASSETS.character[skin].idle;
      body.alt = '镜子里的自己';
      avatar.appendChild(body);
      EG.Outfit.mount(avatar);
      mirror.appendChild(avatar);
      box.appendChild(mirror);

      /* 随机搭配 */
      var dice = EG.util.el('button', 'dice');
      dice.type = 'button';
      dice.innerHTML = '🎲 随机搭配';
      dice.addEventListener('click', function () {
        EG.Audio.play('success');
        var made = EG.Outfit.random();
        var p = EG.FX.positionOf(mirror);
        if (made) EG.FX.hit(p.x, p.y - 6, '+' + C.closet.comboBonus, true);
        else EG.FX.sparkle(p.x, p.y - 6, 6);
      });
      box.appendChild(dice);

      /* 商店 / 宠物装扮 两个入口（都开弹窗，不占房间地方） */
      [{ id: 'shop', label: '🛍 商店', x: 66, fn: function () { EG.Shop.open(); } },
       { id: 'petdress', label: '🐾 宠物装扮', x: 83, fn: function () { EG.Shop.openDress(); } }
      ].forEach(function (b) {
        var btn = EG.util.el('button', 'closetbtn closetbtn--' + b.id);
        btn.type = 'button';
        btn.style.left = b.x + '%';
        btn.innerHTML = b.label;
        btn.addEventListener('click', function () {
          EG.Audio.play('click');
          b.fn();
        });
        box.appendChild(btn);
      });

      /* 四行选项 */
      C.closet.categories.forEach(function (cat) {
        box.appendChild(buildRow(cat));
      });

      EG.Outfit.refresh();
      EG.Say.mood('wave');
      EG.Say.show('欢迎来到衣帽间～想换什么就换什么吧！', 3200);
    },

    unmount: function () {
      if (EG.Shop) EG.Shop.closeAll();
      box = null;
    }
  });
})(window.EG);
