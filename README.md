# 🐰🐷 喵喵电梯公寓 · Meow Elevator

🔗 **在线试玩**：<https://hydrogx.github.io/elevatorgame/>

一个可爱风的网页小游戏：坐电梯到不同楼层，每一层都是不同的小玩法。

- **1F 糖果屋**：点糖果罐里的糖果收星星糖，金色糖果一颗值 5 颗
- **2F 冰淇淋屋**：选一个冰淇淋球 + 一个配料，自动做好，点一下卖出去（推荐搭配更值钱）
- **3F 咖啡屋**：按住「萃取」按钮，在绿色完美区松手最值钱，再点杯子喝掉
- **4F 衣帽间**：换发型 / 头饰 / 衣服 / 鞋子，镜子里实时预览，凑出全新搭配还有星星糖奖励
- **5F 宠物层**：三只小宠物，摸摸 +1、喂对零食 +3，好感度攒满升级成「好朋友」还有奖励

主角是 **猪猪兔**（长兔耳 + 猪鼻子 + 胖脸颊），身上能穿 4 件可替换的部件；
HUD 上的小头像可以随时换成另一位角色 **猫猫咪咪**。两个角色各有 4 种表情、4 张独立 SVG。

![1F 糖果屋](docs/screenshot-candy-1f.png)

| 2F 冰淇淋屋 | 3F 咖啡屋 | 4F 衣帽间 | 5F 宠物层 |
| --- | --- | --- | --- |
| ![2F](docs/screenshot-icecream-2f.png) | ![3F](docs/screenshot-coffee-3f.png) | ![4F](docs/screenshot-closet-4f.png) | ![5F](docs/screenshot-pet-5f.png) |

坐电梯时的样子（门关着，主角在门后打瞌睡）：

![电梯行进中](docs/screenshot-elevator-doors.png)

角色表情对照见 [docs/character-sheet.png](docs/character-sheet.png)，
所有可换装部件（发型 / 头饰 / 衣服 / 鞋子）的对位图见 [docs/outfit-parts.png](docs/outfit-parts.png)。

---

## 1. 怎么玩

| 操作 | 说明 |
| --- | --- |
| 点右侧**竖排**楼层按钮 | 坐电梯去各层（**5F 在最上，1F 在最下**，跟真电梯一样） |
| `↑` `↓` 键 | 上一层 / 下一层 |
| `1` `2` `3` `4` `5` 键 | 直接去对应楼层 |
| 点糖果 / 冰淇淋 / 咖啡杯 | 各楼层的玩法 |
| 4F 点圆按钮 | 换发型 / 头饰 / 衣服 / 鞋子；`🎲 随机搭配` 一键乱配 |
| 5F 点宠物 / 先拿零食再点宠物 | 摸一摸 / 喂零食，好感度攒满会升级 |
| HUD 小头像 | 切换主角形象（猪猪兔 ⇄ 咪咪） |
| HUD 🔊 | 音效开关 |
| HUD ↺ | 清空进度重新开始 |

进度（星星糖、做过的配方、穿过的搭配、宠物好感度、当前楼层、主角形象）都会自动存在浏览器 localStorage 里，
存档键名：`meow-elevator-save-v1`。

---

## 2. 怎么运行

**最简单**：直接双击 `index.html`（本游戏只用普通 `<script>`，不需要打包工具）。

**推荐**：双击 `start.command`（macOS），会在 `http://127.0.0.1:8123/` 起一个本地服务器并打开浏览器。
或者自己起：

```bash
python3 -m http.server 8123 --bind 127.0.0.1
# 然后浏览器打开 http://127.0.0.1:8123/index.html
```

环境要求：任意现代浏览器（Chrome / Edge / Safari / Firefox 均可）。无需安装任何依赖。

---

## 3. 目录结构（每个资源都是独立文件，方便单独修改）

```
elevatorgame/
├── index.html                  # 页面骨架（只有结构，没有逻辑）
├── start.command               # 一键启动脚本
├── fonts/
│   ├── ZCOOLKuaiLe-Regular.ttf # 可爱中文字体（站酷快乐体）
│   └── Baloo2.ttf              # 可爱数字/英文字体
├── styles/
│   ├── base.css                # 配色变量、字体、整体画布缩放
│   ├── layout.css              # 舞台 + 右侧竖排面板 + 小地图的布局
│   ├── elevator.css            # 电梯门 / 轿厢 / 显示屏 / 主角 / 竖排按键面板
│   ├── floors.css              # 各楼层各自的可交互道具（含 4F 换装、5F 宠物）
│   ├── animations.css          # 所有关键帧动画
│   └── backdrop.css            # 窗口外那圈天空装饰
├── js/
│   ├── core/
│   │   ├── config.js           # ★ 资源清单 + 楼层配置 + 各种数值
│   │   ├── state.js            # 存档（星星糖 / 进度 / 换装 / 宠物好感 / 设置）
│   │   ├── audio.js            # 音效与 BGM 播放
│   │   ├── fx.js               # 飘字、闪光、光圈
│   │   ├── dialogue.js         # 主角表情 + 对话气泡
│   │   ├── outfit.js           # ★ 换装系统（身体 + 4 个可换图层）
│   │   └── elevator.js         # 电梯运行流程（关门→走→叮→开门）
│   ├── floors/
│   │   ├── registry.js         # 楼层玩法注册表
│   │   ├── candy.js            # 1F 糖果屋玩法
│   │   ├── icecream.js         # 2F 冰淇淋屋玩法
│   │   ├── coffee.js           # 3F 咖啡屋玩法
│   │   ├── closet.js           # 4F 衣帽间玩法
│   │   └── pet.js              # 5F 宠物层玩法
│   └── main.js                 # 启动、面板交互、楼层切换
├── assets/
│   ├── character/              # ★ 主角表情（猪猪兔 4 张 + 猫猫 4 张）
│   ├── closet/                 # ★ 可换装部件：发型 / 头饰 / 衣服 / 鞋子（各 3 件）
│   ├── pets/                   # ★ 5F 宠物（3 只 × 待机/开心）+ 3 样零食 + 食盆
│   ├── rooms/                  # 五层楼的房间背景（1200×675）
│   ├── elevator/               # 门、轿厢框、楼层按钮、竖排面板底板、显示屏、小地图
│   ├── items/                  # 糖果、冰淇淋球、配料、咖啡杯…每个一件
│   ├── ui/                     # 星星糖币、心形、闪光、音效图标、头像、站点图标
│   ├── bg/                     # 天空、太阳、云、远景城市、山丘
│   └── audio/                  # 13 个 wav（音效 + 循环 BGM）
└── tools/                      # 开发用的小工具（不参与游戏运行）
    ├── generate_audio.py       # 用 Python 标准库合成所有音效/BGM
    ├── smoke.mjs               # 无头 Chrome 自动点一遍的自检脚本
    ├── build-asset-preview.mjs # 生成所有 SVG 资源总览页
    ├── asset-preview.html      # 资源总览（上面那个脚本生成的）
    ├── character-sheet.html    # 角色表情对照表
    └── outfit-preview.html     # 换装部件对位预览（改完衣服用它检查有没有错位）
```

---

## 4. 想改东西，改哪里？

| 想改什么 | 改这里 |
| --- | --- |
| **主角形象 / 表情** | `assets/character/pigbunny-*.svg`（再加一张就复制同尺寸的 SVG，改配色即可） |
| **给 4F 加一件新衣服 / 新发型** | 在 `assets/closet/` 里加一张 300×350 的 SVG（照着现成的改最省事），再到 `js/core/config.js` 的 `closet.items` 里加一项（`EG.ASSETS.closet` 里同步加路径） |
| 换装部位的位置 / 缩放取景 | 身体比例在 SVG 里（同一画布就自动对齐）；按钮取景在 `styles/floors.css` 的 `.garment--*` |
| 4F 每行选项的位置 | `js/core/config.js` 的 `closet.rows`（百分比） |
| 换装奖励 / 默认穿着 | `js/core/config.js` 的 `closet.comboBonus` 和 `closet.defaultOutfit` |
| **加一只 5F 新宠物** | 在 `assets/pets/` 放一对图（`xxx-idle.svg` + `xxx-happy.svg`，画布 200×190），再在 `js/core/config.js` 的 `pets.list` 和 `EG.ASSETS.pets.list` 里各加一项（含位置 `x` 和爱吃的零食 `food`） |
| 宠物的好感度 / 奖励数值 | `js/core/config.js` 的 `pets` 段（每摸一下加多少、升级门槛、升级奖励…） |
| 5F 宠物和零食的位置 | `js/core/config.js` 的 `pets.petBottom` / `bowlLeft` / `foodLeft` / `foodBottom` |
| **加一层新楼层（比如 6F）** | ① `assets/rooms/` 放房间图 ② `assets/elevator/button-6f.svg` 放按钮图 ③ `assets/elevator/map-building.svg` 里加一层 ④ `js/core/config.js` 的 `floors` 数组加一项（含 `mapY`）⑤ `index.html` 面板最前面插一个按钮 ⑥ 抄 `js/floors/pet.js` 写一个新玩法文件并挂上 |
| **楼层按键（竖排顺序 / 大小 / 高亮）** | `index.html` 里的 `.panel` 段（顺序就是 DOM 顺序，5F 在最前）+ `styles/elevator.css` 的 `.panel` / `.floorbtn` |
| 按键面板的底板花纹 | `assets/elevator/panel-plate-v.svg` |
| 换回猫猫当默认主角 | `js/core/config.js` 里的 `defaultSkin: 'cat'` |
| 新增第三种角色 | `assets/character/新角色/` 放 4 张 + 头像，然后在 `EG.ASSETS.character` 和 `EG.CONFIG.skins` 里各加一项 |
| **某一层的房间样子** | `assets/rooms/room-candy.svg` / `room-icecream.svg` / `room-coffee.svg` / `room-closet.svg` / `room-pet.svg`（画布 1200×675） |
| 某一层的玩法道具 | `assets/items/`、`assets/closet/`、`assets/pets/` 里对应的 SVG（每件一个文件） |
| 道具在房间里的位置 / 大小 | `styles/floors.css`（坐标是百分比，对应 1200×675 原稿） |
| 楼层名字 / 提示文案 / 台词 | `js/core/config.js` 的 `floors` 数组 |
| 玩法数值（糖果分值、冰淇淋售价、咖啡区间、宠物好感） | `js/floors/candy.js`、`icecream.js`、`coffee.js`、`pet.js` 顶部常量 / `config.pets` |
| **整体配色** | `styles/base.css` 顶部的 `:root` 变量（`--c-pink`、`--c-mint`…） |
| 电梯开关门速度 | `js/core/config.js` 的 `elevator` 段 |
| **音效 / BGM** | 直接替换 `assets/audio/*.wav`；想重新合成改 `tools/generate_audio.py` 后运行 `python3 tools/generate_audio.py` |
| 字体 | 换掉 `fonts/` 里的 ttf，并同步 `styles/base.css` 的 `@font-face` 与 `--font-cute` |
| 全部资源路径 | `js/core/config.js` 的 `EG.ASSETS`（统一清单，改路径只改这一处） |

> 坐标小抄：房间原稿是 **1200×675**，舞台上按 **0.84** 显示（1008×567）。
> 道具用百分比定位，所以 `left: 50%` 就是原稿 x=600 的位置。

---

## 5. 开发者自检工具

```bash
# 1) 起一个带调试端口的无头 Chrome（会自动跑本目录的 index.html）
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=old --disable-gpu --no-sandbox --remote-debugging-port=9333 \
  --user-data-dir="$PWD/.chrome-cdp" --window-size=1400,900 \
  "file://$PWD/index.html" &

# 2) 自动点一遍五层玩法，截图存到 /tmp/eg-shots，并报告页面报错
node tools/smoke.mjs
```

`tools/smoke.mjs` 一共 44 项检查：按键竖排顺序、糖果能加星星糖、电梯关门/开门、房间切换、
冰淇淋做好并卖出、咖啡萃取到完美区、喝咖啡收钱、**4F 换装同时更新主角与镜子 / 新搭配奖励 / 换装存档**、
**5F 摸宠物加钱、喂对零食加更多、喂错不给钱、好感度升级奖励、宠物存档**、以及**页面零报错**。

在浏览器里直接打开这几个页面可以肉眼检查美术资源：

- `tools/asset-preview.html` —— 所有 SVG 资源总览（`node tools/build-asset-preview.mjs` 重新生成）
- `tools/character-sheet.html` —— 两个角色的全部表情对照
- `tools/outfit-preview.html` —— 换装部件对位预览（改完衣服先用它检查有没有错位）

---

## 6. 已知小细节

- 房间、道具、角色全是手写 SVG，可以无限放大不糊；想换成位图（PNG）也可以，直接替换同名文件并保持同样比例即可。
- 音效全部是脚本合成的（没有任何版权素材），BGM 是一段 19 秒的循环小曲。
- 电梯行进时主角会躲到门后打瞌睡（门关着看不见房间和道具，这是故意的）。
- 游戏画面固定 1280×680 设计稿，等比缩放居中，所以窗口任意大小都不会错位。
- 右侧控制面板是**竖排**的：5F 在最上、1F 在最下（DOM 顺序即显示顺序，想加楼层就往最前面插一个按钮）。
- **换装是「图层叠加」**：身体（含 4 种表情）是一层，发型 / 头饰 / 衣服 / 鞋子各一层，
  全部共用 300×350 画布，所以换表情也不会错位；猫猫咪咪没有对应部件，所以穿衣服时会看不到（镜子里照常显示）。
- **5F 宠物**同理：每只宠物一对图（待机 / 开心），点一下临时换成开心表情，好感度和等级存在存档里，
  每只最高 2 级（★ 好朋友 → ★★ 最好朋友）。

---

## 7. 部署到 GitHub Pages

整站是纯静态、零依赖、全相对路径，**构建产物就是源码本身**，
所以直接把整个文件夹推上去就能玩，不需要任何构建步骤。

### 方式 A：用仓库里已经放好的 GitHub Actions 工作流（推荐）

`.github/workflows/deploy.yml` 已经写好了，你只需要三步：

```bash
# 1) 先在 GitHub 网页上建一个空仓库（不要勾选 Add README）

# 2) 本地推上去（脚本会自动 init / commit / 加 remote / push）
tools/deploy.sh git@github.com:你的用户名/elevatorgame.git

# 3) 到仓库 Settings → Pages → Source 选 “GitHub Actions”
#    等 Actions 跑完，访问 https://你的用户名.github.io/elevatorgame/
```

### 方式 B：不用 Actions，直接从分支发布

```bash
tools/deploy.sh git@github.com:你的用户名/elevatorgame.git
# 然后 Settings → Pages → Source 选 “Deploy from a branch” → main → / (root)
```

方式 A 每次 `git push` 会自动重新部署；方式 B 概念更少。
（`.nojekyll` 已经放好了，GitHub 不会对文件做任何 Jekyll 处理。）

### 部署后要注意的两件小事

- **路径全是相对的**，所以放在 `用户名.github.io/任意子路径/` 下都能正常工作，
  以后绑自定义域名、改路径都不用动代码。
- **存档**用的是浏览器 `localStorage`，换域名/换路径等于换了一份新存档，这是正常的。

### 如果你本地没有 git 环境

在仓库网页上 `Add file → Upload files`，把整个文件夹拖进去也行（注意保持目录结构）。
