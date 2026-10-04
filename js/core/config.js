/* ============================================================
   config.js —— 全局配置 + 资源清单
   想换素材：直接覆盖 assets/ 下的同名文件，
   或者改这里的路径。所有资源都是一张一张独立的小文件。
   ============================================================ */
window.EG = window.EG || {};

(function (EG) {
  'use strict';

  EG.ASSETS = {
    bg: {
      sky:   'assets/bg/sky.svg',
      sun:   'assets/bg/sun.svg',
      cloud: 'assets/bg/cloud.svg',
      city:  'assets/bg/city.svg',
      hills: 'assets/bg/hills.svg'
    },
    elevator: {
      cabinFrame:     'assets/elevator/cabin-frame.svg',
      doorLeft:       'assets/elevator/door-left.svg',
      doorRight:      'assets/elevator/door-right.svg',
      indicatorPlate: 'assets/elevator/indicator-plate.svg',
      panelPlate:     'assets/elevator/panel-plate-v.svg',
      button1:        'assets/elevator/button-1f.svg',
      button2:        'assets/elevator/button-2f.svg',
      button3:        'assets/elevator/button-3f.svg',
      arrowUp:        'assets/elevator/arrow-up.svg',
      arrowDown:      'assets/elevator/arrow-down.svg',
      mapBuilding:    'assets/elevator/map-building.svg',
      mapCar:         'assets/elevator/map-car.svg'
    },
    character: {
      /* 主角：猪猪兔（长兔耳 + 猪鼻子 + 胖脸颊） */
      pigbunny: {
        idle:  'assets/character/pigbunny-idle.svg',
        happy: 'assets/character/pigbunny-happy.svg',
        wave:  'assets/character/pigbunny-wave.svg',
        sleep: 'assets/character/pigbunny-sleep.svg',
        avatar: 'assets/ui/avatar-pigbunny.svg'
      },
      /* 可切换的另一位角色：电梯小姐 猫猫咪咪 */
      cat: {
        idle:  'assets/character/cat-idle.svg',
        happy: 'assets/character/cat-happy.svg',
        wave:  'assets/character/cat-wave.svg',
        sleep: 'assets/character/cat-sleep.svg',
        avatar: 'assets/ui/avatar-cat.svg'
      }
    },
    rooms: {
      1: 'assets/rooms/room-candy.svg',
      2: 'assets/rooms/room-icecream.svg',
      3: 'assets/rooms/room-coffee.svg'
    },
    items: {
      candyLollipop: 'assets/items/candy-lollipop.svg',
      candyDrop:     'assets/items/candy-drop.svg',
      candyStar:     'assets/items/candy-star.svg',
      candyHeart:    'assets/items/candy-heart.svg',
      candyGummy:    'assets/items/candy-gummy.svg',
      candyGold:     'assets/items/candy-gold.svg',
      cone:          'assets/items/icecream-cone.svg',
      scoopPink:     'assets/items/scoop-pink.svg',
      scoopMint:     'assets/items/scoop-mint.svg',
      scoopCream:    'assets/items/scoop-cream.svg',
      toppingStar:   'assets/items/topping-star.svg',
      toppingCherry: 'assets/items/topping-cherry.svg',
      toppingChoco:  'assets/items/topping-choco.svg',
      cupEmpty:      'assets/items/coffee-cup-empty.svg',
      cupFull:       'assets/items/coffee-cup-full.svg',
      steam:         'assets/items/steam.svg',
      bean:          'assets/items/coffee-bean.svg'
    },
    ui: {
      coin:     'assets/ui/coin-sugar.svg',
      sparkle:  'assets/ui/sparkle.svg',
      soundOn:  'assets/ui/sound-on.svg',
      soundOff: 'assets/ui/sound-off.svg',
      favicon:  'assets/ui/favicon.svg'
    },    audio: {
      click:     'assets/audio/sfx_click.wav',
      ding:      'assets/audio/sfx_ding.wav',
      doorOpen:  'assets/audio/sfx_door_open.wav',
      doorClose: 'assets/audio/sfx_door_close.wav',
      move:      'assets/audio/sfx_elevator_move.wav',
      pop:       'assets/audio/sfx_pop.wav',
      coin:      'assets/audio/sfx_coin.wav',
      success:   'assets/audio/sfx_success.wav',
      error:     'assets/audio/sfx_error.wav',
      meow:      'assets/audio/sfx_meow.wav',
      pour:      'assets/audio/sfx_pour.wav',
      gulp:      'assets/audio/sfx_gulp.wav',
      bgm:       'assets/audio/bgm_lobby.wav'
    }
  };

  EG.CONFIG = {
    design: { width: 1280, height: 680 },
    saveKey: 'meow-elevator-save-v1',

    audio: { master: 0.85, bgm: 0.32, sfx: 0.6 },

    /* 主角 / 角色皮肤：默认是猪猪兔，点 HUD 的小头像可以换成猫猫咪咪 */
    defaultSkin: 'pigbunny',
    skins: {
      pigbunny: {
        id: 'pigbunny',
        name: '猪猪兔',
        hello: '欢迎光临喵喵电梯公寓！<br>我是主角猪猪兔，想去哪一层呀？'
      },
      cat: {
        id: 'cat',
        name: '咪咪',
        hello: '欢迎光临喵喵电梯公寓！<br>我是电梯小姐咪咪，想去哪一层呀？'
      }
    },

    /* 电梯节奏（毫秒） */
    elevator: {
      doorClose: 620,   // 关门动画时长
      doorOpen: 620,    // 开门动画时长
      perFloor: 760,    // 每层运行时间
      minTravel: 700    // 最短运行时间
    },

    /* 三层楼 */
    floors: [
      {
        id: 1,
        tag: '1F',
        name: '糖果屋',
        color: '#FF8FAB',
        room: 'assets/rooms/room-candy.svg',
        button: 'assets/elevator/button-1f.svg',
        mapY: 24.7,          /* 小地图里轿厢停靠的纵向位置（%） */
        tip: '点糖果罐里的 <b>糖果</b> 收星星糖，金色糖果值 5 颗',
        lines: ['欢迎来到糖果屋～', '糖果甜甜的，我最喜欢啦！', '看到金色的糖果别放过哦！']
      },
      {
        id: 2,
        tag: '2F',
        name: '冰淇淋屋',
        color: '#7FD8BE',
        room: 'assets/rooms/room-icecream.svg',
        button: 'assets/elevator/button-2f.svg',
        mapY: 53.2,
        tip: '选一个 <b>冰淇淋球</b> + 一个 <b>配料</b>，做好后点一下卖出去',
        lines: ['冰淇淋屋到啦～', '推荐配方可以卖更贵哦！', '草莓加樱桃，最搭啦！']
      },
      {
        id: 3,
        tag: '3F',
        name: '咖啡屋',
        color: '#F2B880',
        room: 'assets/rooms/room-coffee.svg',
        button: 'assets/elevator/button-3f.svg',
        mapY: 81.7,
        tip: '<b>按住</b> 萃取按钮，在绿色 <b>完美区</b> 松手最值钱，再点杯子喝掉',
        lines: ['好香的味道呀～', '苦一点也很棒哦！', '慢慢来，别烫到小爪爪～']
      }
    ]
  };

  /* 工具函数 */
  EG.util = {
    rand: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    randInt: function (min, max) { return min + Math.floor(Math.random() * (max - min + 1)); },
    /* 元素中心点在某个容器里的百分比坐标（自动兼容整体缩放） */
    centerOf: function (el, layer) {
      var r = el.getBoundingClientRect();
      var l = layer.getBoundingClientRect();
      return {
        x: (r.left + r.width / 2 - l.left) / l.width * 100,
        y: (r.top + r.height / 2 - l.top) / l.height * 100
      };
    },
    el: function (tag, cls, html) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (html != null) node.innerHTML = html;
      return node;
    },
    img: function (src, cls) {
      return '<img src="' + src + '" class="' + (cls || '') + '" alt="">';
    }
  };
})(window.EG);
