/* ============================================================
   state.js —— 游戏存档（星星糖、进度、设置）
   ============================================================ */
(function (EG) {
  'use strict';

  var KEY = EG.CONFIG.saveKey;

  var fresh = function () {
    return {
      coins: 0,
      floor: 1,
      sound: true,
      skin: EG.CONFIG.defaultSkin,     // 当前主角形象
      outfit: Object.assign({}, EG.CONFIG.closet.defaultOutfit),  // 4F 换装结果
      outfitsSeen: {},      // 穿过的搭配（第一次有新搭配奖励）
      owned: {},            // 商店里买过的商品（键：'hair:buns' / 'pet:hat'）
      mathOn: false,        // 计算练习开关（HUD 上的计算器按钮）
      petWear: {},          // 每只宠物戴的饰品 { cat: 'hat', ... }
      stats: { candy: 0, gold: 0, icecream: 0, coffee: 0, perfect: 0, dress: 0, pet: 0, feed: 0 },
      recipes: {},          // 做过的配方
      pets: {},             // 5F 每只宠物的好感度 { cat: {aff, lv} }
      visits: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  };

  var State = {
    data: fresh(),
    listeners: [],

    load: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        if (raw) {
          var saved = JSON.parse(raw);
          var base = fresh();
          this.data = Object.assign(base, saved);
          this.data.stats = Object.assign(base.stats, saved.stats || {});
          this.data.recipes = saved.recipes || {};
          this.data.visits = Object.assign(base.visits, saved.visits || {});
          this.data.outfit = Object.assign(base.outfit, saved.outfit || {});
          this.data.outfitsSeen = saved.outfitsSeen || {};
          this.data.owned = saved.owned || {};
          this.data.mathOn = !!saved.mathOn;
          this.data.petWear = saved.petWear || {};
        }
      } catch (e) {
        /* 存档坏了就用新的，不影响玩 */
        this.data = fresh();
      }
      return this.data;
    },

    save: function () {
      try { window.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },

    reset: function () {
      this.data = fresh();
      this.save();
      this.emit();
    },

    on: function (fn) { this.listeners.push(fn); },
    emit: function () {
      var self = this;
      this.listeners.forEach(function (fn) { fn(self.data); });
    },

    addCoins: function (n) {
      this.data.coins = Math.max(0, this.data.coins + n);
      this.save();
      this.emit();
      return this.data.coins;
    },

    bump: function (key, n) {
      this.data.stats[key] = (this.data.stats[key] || 0) + (n == null ? 1 : n);
      this.save();
    },

    noteRecipe: function (key) {
      this.data.recipes[key] = (this.data.recipes[key] || 0) + 1;
      this.save();
    },

    setFloor: function (id) {
      this.data.floor = id;
      this.data.visits[id] = (this.data.visits[id] || 0) + 1;
      this.save();
    }
  };

  EG.State = State;
})(window.EG);
