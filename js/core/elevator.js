/* ============================================================
   elevator.js —— 电梯运行流程
   关门 → 小地图轿厢移动 + 显示屏跳字 → 叮！→ 开门 → 通知楼层
   ============================================================ */
(function (EG) {
  'use strict';

  var C = EG.CONFIG;
  var dom = {};
  var cur = 1;
  var busy = false;
  var indicatorTimer = null;

  function idx(id) {
    for (var i = 0; i < C.floors.length; i++) if (C.floors[i].id === id) return i;
    return 0;
  }
  function floorById(id) { return C.floors[idx(id)]; }

  function moveCar(id) {
    dom.mapCar.style.top = floorById(id).mapY + '%';
  }

  function setIndicator(text) {
    dom.indicatorText.innerHTML = text;
  }

  /* 运行过程中显示屏数字一格一格跳 */
  function countIndicator(from, to, dur) {
    var a = idx(from), b = idx(to);
    var steps = Math.max(1, Math.abs(b - a) * 4);
    var step = 0;
    if (indicatorTimer) window.clearInterval(indicatorTimer);
    indicatorTimer = window.setInterval(function () {
      step++;
      var k = Math.min(1, step / steps);
      var val = a + (b - a) * k;
      var shown = C.floors[Math.round(val)].tag;
      setIndicator(shown);
      if (k >= 1) {
        window.clearInterval(indicatorTimer);
        indicatorTimer = null;
      }
    }, Math.max(60, dur / steps));
  }

  var Elevator = {
    init: function (opts) {
      dom = opts.dom;
      cur = opts.floor || 1;
      this.place(cur);
      this.refreshIndicator();
    },

    current: function () { return cur; },
    isBusy: function () { return busy; },

    /* 立刻把电梯放到某一层（用于初始化 / 读档） */
    place: function (id) {
      moveCar(id);
      dom.roomBg.setAttribute('src', floorById(id).room);
      cur = id;
    },

    refreshIndicator: function () {
      setIndicator(floorById(cur).tag);
      dom.indicatorText.classList.remove('is-ding');
    },

    /* 去某一层。成功返回 true */
    go: function (id, onArrive) {
      if (busy) return false;
      if (id === cur) return false;

      var from = cur;
      var to = id;
      var dist = Math.abs(idx(to) - idx(from));
      var dur = Math.max(C.elevator.minTravel, dist * C.elevator.perFloor);
      var stage = dom.stage;

      busy = true;
      EG.Say.hide();
      EG.Audio.play('doorClose');
      stage.classList.add('is-closed');

      /* 1) 门关上以后（看不见房间了）再换背景 */
      window.setTimeout(function () {
        dom.roomBg.setAttribute('src', floorById(to).room);

        /* 2) 开始上行 / 下行 */
        moveCar(to);
        dom.mapCar.classList.add('is-move');
        EG.Audio.loopOn('move', 0.5);
        stage.classList.add('is-moving');
        dom.indicator.classList.add(idx(to) > idx(from) ? 'is-up' : 'is-down');
        EG.Say.mood('sleep');
        countIndicator(from, to, dur);

        /* 3) 到站 */
        window.setTimeout(function () {
          EG.Audio.loopOff('move');
          stage.classList.remove('is-moving');
          dom.mapCar.classList.remove('is-move');
          dom.indicator.classList.remove('is-up', 'is-down');
          EG.Audio.play('ding');
          dom.indicator.classList.add('is-ding');
          setIndicator(floorById(to).tag);
          window.setTimeout(function () { dom.indicator.classList.remove('is-ding'); }, 1000);

          /* 4) 开门 */
          EG.Audio.play('doorOpen');
          stage.classList.remove('is-closed');
          EG.Say.mood('idle');

          window.setTimeout(function () {
            busy = false;
            cur = to;
            if (onArrive) onArrive(to);
          }, 240);
        }, dur);
      }, C.elevator.doorClose);

      return true;
    }
  };

  EG.Elevator = Elevator;
})(window.EG);
