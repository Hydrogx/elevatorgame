/* ============================================================
   4F 衣帽间 —— 换发型 / 头饰 / 衣服 / 鞋子
   改这里的类别或选项数量，房间里的行会自动排布（位置在 config.closet.rows）
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG;
  var box = null;

  function buildRow(cat) {
    var pos = C.closet.rows[cat.key] || { x: 78.4, y: 30 };
    var row = EG.util.el('div', 'fit fit--' + cat.key);
    row.style.left = pos.x + '%';
    row.style.top = pos.y + '%';

    var label = EG.util.el('div', 'fit__label', cat.label);
    row.appendChild(label);

    var list = EG.util.el('div', 'fit__list');
    var items = C.closet.items[cat.key] || [];

    /* 一行能用的安全宽度是 280px（房间里的选项板内框到 790±140 左右，
       再往右 932px 开始就是电梯右侧柱子，会被挡住）：
       道具多了就自动把圆按钮改小，保证每一件都完整看得见。
       触屏上 mobile.css 会把按钮再放大 1.1 倍，所以这里先除回去。 */
    var SAFE = 280;
    var BOOST = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ? 1.1 : 1;
    var gap = items.length > 4 ? 6 : 8;
    var size = Math.floor((SAFE - (items.length - 1) * gap) / items.length / BOOST);
    size = Math.max(36, Math.min(66, size));
    list.style.gap = gap + 'px';
    list.style.setProperty('--garment-size', size + 'px');

    items.forEach(function (item) {
      var btn = EG.util.el('button', 'garment garment--' + cat.key);
      btn.type = 'button';
      btn.dataset.slot = cat.key;
      btn.dataset.item = item.id || '';
      btn.title = item.name;
      var src = EG.Outfit.srcFor(cat.key, item.id);
      var locked = !!item.price && !EG.Shop.ownsGarment(cat.key, item.id);

      btn.innerHTML = (src
        ? '<img src="' + src + '" alt="">'
        : '<span class="garment__none">' + item.name + '</span>') +
        (locked ? '<em class="garment__lock">🔒' + item.price + '</em>' : '');
      if (locked) btn.classList.add('is-locked');

      btn.addEventListener('click', function () {
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
      list.appendChild(btn);
    });
    row.appendChild(list);
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
