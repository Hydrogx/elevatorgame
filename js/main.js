/* ============================================================
   main.js —— 启动、布局缩放、控制面板、楼层切换
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG;
  var dom = {};
  var firstArrive = true;

  function $(sel) { return document.querySelector(sel); }

  /* ---------- 1. 整体等比缩放，居中铺满窗口 ---------- */
  function fitApp() {
    var app = dom.app;
    var s = Math.min(window.innerWidth / C.design.width, window.innerHeight / C.design.height);
    s = Math.max(0.4, Math.min(s, 1.6));
    app.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

  /* ---------- 2. 楼层按钮 / 提示 / 小地图标签 ---------- */
  function updatePanel(id) {
    dom.floorBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', Number(btn.dataset.floor) === id);
    });
    var i = C.floors.findIndex(function (f) { return f.id === id; });
    dom.btnUp.classList.toggle('is-disabled', i === C.floors.length - 1);
    dom.btnDown.classList.toggle('is-disabled', i === 0);
  }

  function updateTip(id) {
    var f = C.floors.find(function (x) { return x.id === id; });
    if (!f) return;
    dom.tipTitle.textContent = f.tag + ' ' + f.name;
    dom.tipText.innerHTML = f.tip;
  }

  /* ---------- 3. 到站 ---------- */
  function arrive(id) {
    EG.Floors.mount(id, dom.props);
    EG.State.setFloor(id);
    updatePanel(id);
    updateTip(id);

    if (firstArrive) {
      firstArrive = false;
      EG.Say.mood('wave');
      EG.Say.show(C.skins[EG.Say.skin()].hello, 4800);
    } else {
      var f = C.floors.find(function (x) { return x.id === id; });
      EG.Say.mood('wave');
      EG.Say.show(EG.util.rand(f.lines), 2600);
    }
  }

  /* ---------- 4. 去哪一层 ---------- */
  function goTo(id) {
    if (EG.Elevator.isBusy()) return;
    var cur = EG.Elevator.current();
    if (id === cur) {
      var f = C.floors.find(function (x) { return x.id === id; });
      EG.Audio.play('error');
      EG.Say.show('已经在' + f.tag + ' ' + f.name + '啦～', 1600);
      dom.stage.classList.remove('is-shake');
      void dom.stage.offsetWidth;
      dom.stage.classList.add('is-shake');
      return;
    }
    EG.Audio.play('click');
    EG.Elevator.go(id, function (arrived) {
      arrive(arrived);
      var btn = dom.floorBtns.find(function (b) { return Number(b.dataset.floor) === arrived; });
      if (btn) {
        btn.classList.remove('is-arriving');
        void btn.offsetWidth;
        btn.classList.add('is-arriving');
      }
      EG.Audio.play('meow', 0.7);
    });
  }

  function stepFloor(delta) {
    var cur = EG.Elevator.current();
    var i = C.floors.findIndex(function (f) { return f.id === cur; });
    var next = C.floors[i + delta];
    if (!next) {
      EG.Audio.play('error');
      return;
    }
    goTo(next.id);
  }

  /* ---------- 5. HUD：星星糖 ---------- */
  function renderCoins(data) {
    if (String(dom.coinCount.textContent) !== String(data.coins)) {
      dom.coinCount.textContent = data.coins;
      dom.coinBox.classList.remove('is-bump');
      void dom.coinBox.offsetWidth;
      dom.coinBox.classList.add('is-bump');
    }
  }

  function renderSound() {
    var on = EG.State.data.sound;
    dom.soundImg.src = on ? EG.ASSETS.ui.soundOn : EG.ASSETS.ui.soundOff;
    dom.soundBtn.title = on ? '音效：开（点一下静音）' : '音效：关（点一下打开）';
  }

  /* 主角形象 */
  function renderSkin() {
    var id = EG.Say.skin();
    dom.skinImg.src = EG.ASSETS.character[id].avatar;
    dom.catImg.alt = '主角 ' + EG.Say.skinName();
    dom.skinBtn.title = '当前主角：' + EG.Say.skinName() + '（点一下换人）';
  }

  /* ---------- 6. 背景装饰 ---------- */
  function decorateSky() {
    dom.app.querySelectorAll('.cloud').forEach(function (cloud, i) {
      cloud.style.animationDelay = (i * 1.3) + 's';
    });
  }

  /* ---------- 7. 预加载房间图，避免开门时闪白 ---------- */
  function preload() {
    C.floors.forEach(function (f) {
      var im = new Image();
      im.src = f.room;
    });
    Object.keys(EG.ASSETS.character).forEach(function (skin) {
      var set = EG.ASSETS.character[skin];
      Object.keys(set).forEach(function (k) { (new Image()).src = set[k]; });
    });
  }

  /* ---------- 8. 启动 ---------- */
  function boot() {
    dom.app = $('#app');
    dom.stage = $('#stage');
    dom.props = $('#room-props');
    dom.roomBg = $('#room-bg');
    dom.mapCar = $('#map-car');
    dom.indicator = $('#indicator');
    dom.indicatorText = $('#indicator-text');
    dom.catImg = $('#cat-img');
    dom.bubble = $('#bubble');
    dom.bubbleText = $('#bubble-text');
    dom.coinCount = $('#coin-count');
    dom.coinBox = $('#coin-box');
    dom.soundBtn = $('#sound-toggle');
    dom.soundImg = $('#sound-img');
    dom.skinBtn = $('#skin-toggle');
    dom.skinImg = $('#skin-img');
    dom.btnUp = $('#btn-up');
    dom.btnDown = $('#btn-down');
    dom.floorBtns = Array.prototype.slice.call(document.querySelectorAll('.floorbtn'));
    dom.tipTitle = $('#tip-title');
    dom.tipText = $('#tip-text');
    dom.resetBtn = $('#reset-btn');
    dom.fx = $('#fx');

    fitApp();
    window.addEventListener('resize', fitApp);
    decorateSky();
    preload();

    EG.State.load();
    EG.FX.init(dom.fx);

    EG.Say.init({
      cat: dom.catImg,
      bubble: dom.bubble,
      bubbleText: dom.bubbleText,
      skin: EG.State.data.skin || C.defaultSkin,
      mood: 'idle'
    });

    EG.Elevator.init({
      dom: {
        stage: dom.stage,
        roomBg: dom.roomBg,
        mapCar: dom.mapCar,
        indicator: dom.indicator,
        indicatorText: dom.indicatorText
      },
      floor: EG.State.data.floor || 1
    });

    renderCoins(EG.State.data);
    renderSound();
    renderSkin();
    EG.State.on(renderCoins);

    /* 面板交互 */
    dom.floorBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { goTo(Number(btn.dataset.floor)); });
    });
    dom.btnUp.addEventListener('click', function () { stepFloor(1); });
    dom.btnDown.addEventListener('click', function () { stepFloor(-1); });

    dom.soundBtn.addEventListener('click', function () {
      EG.Audio.toggle();
      renderSound();
    });

    /* 换成另一位主角 */
    dom.skinBtn.addEventListener('click', function () {
      var ids = Object.keys(EG.ASSETS.character);
      var next = ids[(ids.indexOf(EG.Say.skin()) + 1) % ids.length];
      EG.Say.setSkin(next);
      EG.State.data.skin = next;
      EG.State.save();
      renderSkin();
      EG.Audio.play('meow', 0.7);
      EG.Say.mood('happy');
      EG.Say.hop();
      var p = EG.FX.positionOf(dom.catImg.parentNode);
      EG.FX.sparkle(p.x, p.y - 10, 10);
      EG.Say.show('我是' + EG.Say.skinName() + '！请多关照～', 2400);
    });

    dom.resetBtn.addEventListener('click', function () {
      if (!EG.State.data.coins && !EG.State.data.stats.candy) {
        EG.Say.show('本来就是全新的呀～', 1600);
        return;
      }
      if (window.confirm('把星星糖和所有进度清空，重新开始吗？')) {
        EG.State.reset();
        renderCoins(EG.State.data);
        EG.Audio.play('ding');
        EG.Say.mood('wave');
        EG.Say.show('好耶！重新开始喵～', 2200);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { stepFloor(1); }
      else if (e.key === 'ArrowDown') { stepFloor(-1); }
      else if (e.key === '1' || e.key === '2' || e.key === '3') { goTo(Number(e.key)); }
    });

    /* 第一次点击/按键后才开始放音乐（浏览器要求） */
    var unlock = function () {
      EG.Audio.init();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);

    /* 直接进入存档里的楼层 */
    arrive(EG.Elevator.current());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.EG);
