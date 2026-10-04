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
    (C.closet.items[cat.key] || []).forEach(function (item) {
      var btn = EG.util.el('button', 'garment garment--' + cat.key);
      btn.type = 'button';
      btn.dataset.slot = cat.key;
      btn.dataset.item = item.id || '';
      btn.title = item.name;
      var src = EG.Outfit.srcFor(cat.key, item.id);
      btn.innerHTML = src
        ? '<img src="' + src + '" alt="">'
        : '<span class="garment__none">' + item.name + '</span>';

      btn.addEventListener('click', function () {
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
      var body = EG.util.el('img', 'mirror__body');
      body.src = EG.ASSETS.character.pigbunny.idle;
      body.alt = '镜子里的猪猪兔';
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

      /* 四行选项 */
      C.closet.categories.forEach(function (cat) {
        box.appendChild(buildRow(cat));
      });

      EG.Outfit.refresh();
      EG.Say.mood('wave');
      EG.Say.show('欢迎来到衣帽间～想换什么就换什么吧！', 3200);
    },

    unmount: function () {
      box = null;
    }
  });
})(window.EG);
