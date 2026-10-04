/* ============================================================
   fx.js —— 飘字、闪光、光圈
   坐标一律用「舞台宽高的百分比」，跟房间原稿坐标一致
   ============================================================ */
(function (EG) {
  'use strict';

  var layer = null;

  function add(node, life) {
    layer.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, life);
  }

  var FX = {
    init: function (el) { layer = el; },
    layer: function () { return layer; },

    /* 位置：元素的中心点 */
    positionOf: function (el) { return EG.util.centerOf(el, layer); },

    float: function (x, y, text, life) {
      if (!layer) return;
      var n = EG.util.el('div', 'fx__float', text);
      n.style.left = x + '%';
      n.style.top = y + '%';
      add(n, life || 1000);
    },

    sparkle: function (x, y, count) {
      if (!layer) return;
      count = count || 5;
      for (var i = 0; i < count; i++) {
        var n = EG.util.el('img', 'fx__sparkle');
        n.src = EG.ASSETS.ui.sparkle;
        var ang = Math.random() * Math.PI * 2;
        var dist = 30 + Math.random() * 70;
        n.style.left = (x + Math.cos(ang) * dist / 10) + '%';
        n.style.top = (y + Math.sin(ang) * dist / 6) + '%';
        n.style.animationDelay = (Math.random() * 0.12) + 's';
        n.style.width = (22 + Math.random() * 20) + 'px';
        add(n, 900);
      }
    },

    ring: function (x, y) {
      if (!layer) return;
      var n = EG.util.el('div', 'fx__ring');
      n.style.left = x + '%';
      n.style.top = y + '%';
      add(n, 600);
    },

    /* 组合技：点中了什么东西 */
    hit: function (x, y, text, big) {
      this.ring(x, y);
      this.sparkle(x, y, big ? 8 : 4);
      if (text) this.float(x, y, text);
    }
  };

  EG.FX = FX;
})(window.EG);
