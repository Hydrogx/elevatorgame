/* ============================================================
   audio.js —— 播放 assets/audio/ 里的音效与 BGM
   第一次点击/按键后才真正开始播放（浏览器要求用户手势）
   ============================================================ */
(function (EG) {
  'use strict';

  var A = EG.ASSETS.audio;
  var pool = {};        // 音效池：同一个音效可以叠着响
  var loops = {};       // 循环音（电梯运行、倒咖啡）
  var bgm = null;
  var started = false;

  function make(src, volume, loop) {
    var a = new Audio(src);
    a.volume = volume;
    a.loop = !!loop;
    a.preload = 'auto';
    return a;
  }

  var Audio_ = {
    get muted() { return !EG.State.data.sound; },

    init: function () {
      if (started) return;
      started = true;
      bgm = make(A.bgm, EG.CONFIG.audio.bgm, true);
      if (!this.muted) {
        var p = bgm.play();
        if (p && p.catch) p.catch(function () {});
      }
      EG.State.on(function () { Audio_.applyMute(); });
    },

    applyMute: function () {
      if (!bgm) return;
      if (this.muted) {
        bgm.pause();
      } else {
        var p = bgm.play();
        if (p && p.catch) p.catch(function () {});
      }
    },

    toggle: function () {
      EG.State.data.sound = !EG.State.data.sound;
      EG.State.save();
      this.applyMute();
      if (!this.muted) this.play('click');
      return !this.muted;
    },

    /* 播放一次性音效 */
    play: function (name, volumeScale) {
      if (this.muted || !A[name]) return;
      var base = A[name];
      var node = pool[name];
      if (!node) {
        node = pool[name] = make(base, EG.CONFIG.audio.sfx, false);
      }
      var inst = node.cloneNode();
      inst.volume = Math.min(1, EG.CONFIG.audio.sfx * (volumeScale == null ? 1 : volumeScale));
      var p = inst.play();
      if (p && p.catch) p.catch(function () {});
    },

    /* 循环音效（进入 / 离开） */
    loopOn: function (name, volumeScale) {
      if (this.muted || !A[name]) return;
      var node = loops[name];
      if (!node) node = loops[name] = make(A[name], EG.CONFIG.audio.sfx, true);
      node.volume = Math.min(1, EG.CONFIG.audio.sfx * (volumeScale == null ? 0.7 : volumeScale));
      var p = node.play();
      if (p && p.catch) p.catch(function () {});
    },

    loopOff: function (name) {
      var node = loops[name];
      if (node) { node.pause(); node.currentTime = 0; }
    },

    /* 电锯式地慢慢改变某个循环音的音量（用于萃取声） */
    fadeLoop: function (name, to, ms) {
      var node = loops[name];
      if (!node) return;
      var from = node.volume;
      var t0 = performance.now();
      (function step(now) {
        var k = Math.min(1, (now - t0) / ms);
        node.volume = from + (to - from) * k;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
  };

  EG.Audio = Audio_;
})(window.EG);
