/* ============================================================
   dialogue.js —— 主角的表情 + 对话气泡
   主角形象（猪猪兔 / 猫猫咪咪）都可以换，表情图各自独立成文件
   ============================================================ */
(function (EG) {
  'use strict';

  var catImg = null;
  var bubble = null;
  var bubbleText = null;
  var timer = null;
  var moodTimer = null;
  var baseMood = 'idle';
  var skinId = EG.CONFIG.defaultSkin;

  function moodSrc(name) {
    var set = EG.ASSETS.character[skinId] || EG.ASSETS.character[EG.CONFIG.defaultSkin];
    return set[name] || set.idle;
  }

  var Say = {
    init: function (opts) {
      catImg = opts.cat;
      bubble = opts.bubble;
      bubbleText = opts.bubbleText;
      skinId = opts.skin || EG.CONFIG.defaultSkin;
      baseMood = opts.mood || 'idle';
      this.mood(baseMood);
    },

    /* 换主角形象 */
    setSkin: function (id) {
      skinId = EG.ASSETS.character[id] ? id : EG.CONFIG.defaultSkin;
      this.mood(baseMood);
    },

    skin: function () { return skinId; },
    skinName: function () {
      var s = EG.CONFIG.skins[skinId];
      return s ? s.name : '';
    },

    mood: function (name) {
      if (!catImg) return;
      var src = moodSrc(name);
      if (catImg.getAttribute('src') !== src) catImg.setAttribute('src', src);
      baseMood = name;
    },

    /* 临时换个表情，过一会儿自动回到平时的样子 */
    face: function (name, ms) {
      this.mood(name);
      if (moodTimer) window.clearTimeout(moodTimer);
      moodTimer = window.setTimeout(function () {
        Say.mood(baseMood === name ? 'idle' : baseMood);
      }, ms || 1400);
    },

    hop: function () {
      if (!catImg) return;
      var cat = catImg.parentNode;
      cat.classList.remove('is-hop');
      void cat.offsetWidth;
      cat.classList.add('is-hop');
    },

    shake: function () {
      if (!catImg) return;
      var cat = catImg.parentNode;
      cat.classList.remove('is-shake');
      void cat.offsetWidth;
      cat.classList.add('is-shake');
    },

    /* 说话；ms = 0 表示一直留着 */
    show: function (text, ms) {
      if (!bubble) return;
      bubbleText.innerHTML = text;
      bubble.classList.add('is-show');
      if (timer) window.clearTimeout(timer);
      if (ms !== 0) {
        timer = window.setTimeout(function () {
          bubble.classList.remove('is-show');
        }, ms || 2600);
      }
    },

    hide: function () {
      if (bubble) bubble.classList.remove('is-show');
      if (timer) window.clearTimeout(timer);
    }
  };

  EG.Say = Say;
})(window.EG);
