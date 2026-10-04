/* ============================================================
   outfit.js —— 换装系统
   主角被拆成「身体 + 4 个可换图层」：
     身体  = assets/character/pigbunny-*.svg（表情）
     图层  = assets/closet/*.svg（发型 / 头饰 / 衣服 / 鞋子）
   所有图层和身体共用 300×350 画布，所以叠在一起天然对齐。
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG;
  var SLOTS = ['clothes', 'shoes', 'hair', 'headwear'];   // 越靠后越上层
  var LABEL = { hair: '发型', headwear: '头饰', clothes: '衣服', shoes: '鞋子' };

  function sanitize(obj) {
    var out = {};
    SLOTS.forEach(function (k) {
      var id = (obj && obj[k]) || '';
      if (id && !(EG.ASSETS.closet[k] && EG.ASSETS.closet[k][id])) id = '';
      out[k] = id;
    });
    return out;
  }

  var Outfit = {
    data: sanitize(C.closet.defaultOutfit),

    /* 读档 */
    load: function () {
      this.data = sanitize(EG.State.data.outfit);
      EG.State.data.outfit = this.data;
      return this.data;
    },

    get: function (slot) { return this.data[slot] || ''; },

    srcFor: function (slot, id) {
      if (!id) return '';
      var set = EG.ASSETS.closet[slot];
      return (set && set[id]) || '';
    },

    /* 换一件；返回是否是「全新搭配」 */
    set: function (slot, id, opts) {
      if (SLOTS.indexOf(slot) === -1) return false;
      this.data[slot] = id || '';
      EG.State.data.outfit = this.data;
      EG.State.save();
      this.refresh({ notify: !(opts && opts.silent) });
      return this.checkCombo(opts && opts.rewardAt);
    },

    /* 随机一套（只挑已经拥有的，不会随机到没买的） */
    random: function () {
      var self = this;
      SLOTS.forEach(function (k) {
        var list = (C.closet.items[k] || []).filter(function (it) {
          return !it.price || (EG.Shop && EG.Shop.ownsGarment(k, it.id));
        });
        self.data[k] = (EG.util.rand(list) || {}).id || '';
      });
      EG.State.data.outfit = this.data;
      EG.State.save();
      this.refresh({ notify: true });
      return this.checkCombo();
    },

    /* 当前整套搭配的标识 */
    key: function () {
      var self = this;
      return SLOTS.map(function (k) { return self.data[k] || '-'; }).join('|');
    },

    /* 第一次穿出这套搭配 → 给奖励 */
    checkCombo: function (rewardAt) {
      var key = this.key();
      var seen = EG.State.data.outfitsSeen || (EG.State.data.outfitsSeen = {});
      if (seen[key]) return false;
      seen[key] = 1;
      EG.State.addCoins(C.closet.comboBonus);
      EG.State.bump('dress');
      EG.Audio.play('coin');
      EG.Say.mood('happy');
      EG.Say.show('新搭配！奖励 ' + C.closet.comboBonus + ' 颗星星糖～', 2200);
      if (rewardAt && EG.FX) {
        var p = EG.FX.positionOf(rewardAt);
        EG.FX.hit(p.x, p.y - 6, '+' + C.closet.comboBonus);
      }
      return true;
    },

    /* 在一个容器里建出 4 个图层（身体图由调用方自己放） */
    mount: function (container) {
      SLOTS.forEach(function (key) {
        var img = document.createElement('img');
        img.className = 'wear wear--' + key;
        img.dataset.slot = key;
        img.alt = '';
        img.style.display = 'none';
        container.appendChild(img);
      });
    },

    /* 把页面上所有图层刷新成当前搭配（舞台上的主角 + 镜子里的预览） */
    refresh: function (opts) {
      var self = this;
      Array.prototype.forEach.call(document.querySelectorAll('.wear'), function (img) {
        var slot = img.dataset.slot;
        var src = self.srcFor(slot, self.data[slot]);
        if (src) {
          if (img.getAttribute('src') !== src) img.setAttribute('src', src);
          img.style.display = '';
        } else {
          img.removeAttribute('src');
          img.style.display = 'none';
        }
      });
      Array.prototype.forEach.call(document.querySelectorAll('.garment'), function (btn) {
        var on = (self.data[btn.dataset.slot] || '') === (btn.dataset.item || '');
        btn.classList.toggle('is-active', on);
      });
      /* 四位主角共用同一套骨架，衣服谁都能穿（以前猫猫会隐藏图层，现在不用了） */
    },

    /* 给调试/说明用 */
    label: function (slot) { return LABEL[slot] || slot; },
    slots: SLOTS
  };

  EG.Outfit = Outfit;
})(window.EG);
