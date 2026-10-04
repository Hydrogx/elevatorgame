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
      button4:        'assets/elevator/button-4f.svg',
      button5:        'assets/elevator/button-5f.svg',
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
      3: 'assets/rooms/room-coffee.svg',
      4: 'assets/rooms/room-closet.svg',
      5: 'assets/rooms/room-pet.svg'
    },
    /* 5F 宠物层：三只小宠物和它们的零食 */
    pets: {
      bowl:      'assets/pets/bowl.svg',
      heart:     'assets/ui/heart.svg',
      foods: {
        fish:   'assets/pets/food-fish.svg',
        bone:   'assets/pets/food-bone.svg',
        carrot: 'assets/pets/food-carrot.svg'
      },
      list: {
        cat:    { idle: 'assets/pets/pet-cat-idle.svg',    happy: 'assets/pets/pet-cat-happy.svg' },
        dog:    { idle: 'assets/pets/pet-dog-idle.svg',    happy: 'assets/pets/pet-dog-happy.svg' },
        rabbit: { idle: 'assets/pets/pet-rabbit-idle.svg', happy: 'assets/pets/pet-rabbit-happy.svg' }
      }
    },
    /* 4F 衣帽间可以换的部件：每个部件都是一张独立的 SVG 图层，
       和身体用同一个 300×350 画布，所以直接叠上去就对齐了 */
    closet: {
      hair: {
        bangs: 'assets/closet/hair-bangs.svg',
        curly: 'assets/closet/hair-curly.svg',
        side:  'assets/closet/hair-side.svg'
      },
      headwear: {
        bow:   'assets/closet/headwear-bow.svg',
        crown: 'assets/closet/headwear-crown.svg',
        cap:   'assets/closet/headwear-cap.svg'
      },
      clothes: {
        dress:  'assets/closet/clothes-dress.svg',
        sailor: 'assets/closet/clothes-sailor.svg',
        hoodie: 'assets/closet/clothes-hoodie.svg'
      },
      shoes: {
        mary:    'assets/closet/shoes-mary.svg',
        sneaker: 'assets/closet/shoes-sneaker.svg',
        boot:    'assets/closet/shoes-boot.svg'
      }
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

    /* 4F 衣帽间的换装配置：类别、可选项、每行在房间里的位置（%） */
    closet: {
      defaultOutfit: { hair: '', headwear: 'bow', clothes: '', shoes: '' },
      comboBonus: 2,          // 第一次穿出全新搭配的奖励
      categories: [
        { key: 'hair',     label: '发型' },
        { key: 'headwear', label: '头饰' },
        { key: 'clothes',  label: '衣服' },
        { key: 'shoes',    label: '鞋子' }
      ],
      items: {
        hair: [
          { id: '',      name: '原样' },
          { id: 'bangs', name: '奶茶刘海' },
          { id: 'curly', name: '草莓卷卷' },
          { id: 'side',  name: '香芋侧分' }
        ],
        headwear: [
          { id: '',      name: '不戴' },
          { id: 'bow',   name: '蝴蝶结' },
          { id: 'crown', name: '小皇冠' },
          { id: 'cap',   name: '贝雷帽' }
        ],
        clothes: [
          { id: '',       name: '不穿' },
          { id: 'dress',  name: '小裙子' },
          { id: 'sailor', name: '水手服' },
          { id: 'hoodie', name: '连帽衫' }
        ],
        shoes: [
          { id: '',        name: '光脚' },
          { id: 'mary',    name: '玛丽珍' },
          { id: 'sneaker', name: '运动鞋' },
          { id: 'boot',    name: '小雨靴' }
        ]
      },
      /* 每行选项在房间里的位置（left / top，百分比，对应 1200×675 原稿） */
      rows: {
        hair:     { x: 78.4, y: 19.6 },
        headwear: { x: 78.4, y: 35.2 },
        clothes:  { x: 78.4, y: 50.7 },
        shoes:    { x: 78.4, y: 66.3 }
      }
    },

    /* 5F 宠物层的玩法数值 */
    pets: {
      coinPet: 1,             // 摸一下给的星星糖
      coinFeed: 3,            // 喂对零食给的星星糖
      affinityPerPet: 8,      // 摸一下加的好感度
      affinityPerFeed: 20,    // 喂对零食加的好感度
      affinityWrong: 2,       // 喂错零食只加一点点
      levelAt: 100,           // 每攒满 100 好感升一级
      maxLevel: 2,            // 最高 2 级（0 刚认识 → 1 好朋友 → 2 最好朋友）
      levelBonus: [5, 8],     // 升到 1 级 / 2 级各给多少星星糖
      petBottom: 155,         // 宠物底边距舞台底部（px）
      bowlLeft: 39.2,         // 食盆横向位置（%）
      foodLeft: [51, 59, 67], // 三个零食的横向位置（%）
      foodBottom: 70,         // 零食底边距舞台底部（px）
      list: [
        { id: 'cat',    name: '团子', kind: '小猫', food: 'fish',   x: 35 },
        { id: 'dog',    name: '豆豆', kind: '小狗', food: 'bone',   x: 53.3 },
        { id: 'rabbit', name: '雪球', kind: '小兔', food: 'carrot', x: 71.7 }
      ],
      foods: [
        { id: 'fish',   name: '小鱼干' },
        { id: 'bone',   name: '肉骨头' },
        { id: 'carrot', name: '胡萝卜' }
      ]
    },

    /* 五层楼（数组顺序 = 楼层从低到高，电梯靠它判断上/下行） */
    floors: [
      {
        id: 1,
        tag: '1F',
        name: '糖果屋',
        color: '#FF8FAB',
        room: 'assets/rooms/room-candy.svg',
        button: 'assets/elevator/button-1f.svg',
        mapY: 86.8,          /* 小地图里轿厢停靠的纵向位置（%） */
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
        mapY: 69.9,
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
        mapY: 53.1,
        tip: '<b>按住</b> 萃取按钮，在绿色 <b>完美区</b> 松手最值钱，再点杯子喝掉',
        lines: ['好香的味道呀～', '苦一点也很棒哦！', '慢慢来，别烫到小爪爪～']
      },
      {
        id: 4,
        tag: '4F',
        name: '衣帽间',
        color: '#B79BF0',
        room: 'assets/rooms/room-closet.svg',
        button: 'assets/elevator/button-4f.svg',
        mapY: 36.3,
        tip: '点右边的按钮换 <b>发型 / 头饰 / 衣服 / 鞋子</b>，镜子里马上变样',
        lines: ['衣帽间到啦～', '换一套新衣服试试？', '新搭配会有星星糖奖励哦！']
      },
      {
        id: 5,
        tag: '5F',
        name: '宠物层',
        color: '#7FC8F0',
        room: 'assets/rooms/room-pet.svg',
        button: 'assets/elevator/button-5f.svg',
        mapY: 19.5,
        tip: '点宠物 <b>摸一摸</b>，或先去食盆拿零食再点它 <b>喂它</b>；好感满了变好朋友',
        lines: ['宠物层到啦～', '摸摸它们会开心的！', '喂对零食好感涨得更快哦～']
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
