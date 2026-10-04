/* ============================================================
   petwear.js —— 宠物装扮
   每只宠物一个饰品位；所有 [data-pet] 容器里的 .pet__wear 会一起刷新，
   所以在 5F 的宠物身上、装扮面板里、6F 的游戏里都能看到同一身装扮。
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG.petwear;

  var PetWear = {
    items: C.items,

    itemOf: function (id) {
      for (var i = 0; i < C.items.length; i++) if (C.items[i].id === id) return C.items[i];
      return null;
    },

    src: function (id) { return (id && EG.ASSETS.petwear[id]) || ''; },

    of: function (petId) { return (EG.State.data.petWear || {})[petId] || ''; },

    equip: function (petId, itemId) {
      var w = EG.State.data.petWear || (EG.State.data.petWear = {});
      w[petId] = itemId || '';
      EG.State.save();
      this.refresh();
    },

    /* 所有带 data-pet 的容器都刷一遍（5F 宠物 / 装扮面板 / 6F 游戏） */
    refresh: function () {
      var self = this;
      Array.prototype.forEach.call(document.querySelectorAll('[data-pet]'), function (box) {
        var img = box.querySelector('.pet__wear');
        if (!img) return;
        var src = self.src(self.of(box.dataset.pet));
        if (src) {
          if (img.getAttribute('src') !== src) img.setAttribute('src', src);
          img.style.display = '';
        } else {
          img.removeAttribute('src');
          img.style.display = 'none';
        }
      });
    }
  };

  EG.PetWear = PetWear;
})(window.EG);
