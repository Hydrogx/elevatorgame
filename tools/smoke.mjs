/* ============================================================
   tools/smoke.mjs —— 用 Chrome DevTools Protocol 真正点一遍游戏
   用法：
     1) 先起一个带调试端口的 Chrome（见 tools/run-smoke.sh）
     2) node tools/smoke.mjs
   会把截图存到 /tmp/eg-shots，并在终端打印每一步的结果和页面报错。
   ============================================================ */
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = process.env.CDP_PORT || 9333;
const OUT = process.env.SHOT_DIR || '/tmp/eg-shots';
mkdirSync(OUT, { recursive: true });

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
if (!page) {
  console.error('找不到页面目标：', list.map((t) => t.url));
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let msgId = 0;

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    errors.push('EXCEPTION: ' + (d.exception?.description || d.text));
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push('CONSOLE: ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    errors.push('LOG: ' + msg.params.entry.text);
  }
});

const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++msgId;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) {
    throw new Error('页面里抛错了: ' + JSON.stringify(r.result.exceptionDetails.exception?.description));
  }
  return r.result?.result?.value;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'));
}

const report = [];
const check = (label, ok, detail) => {
  report.push(`${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
};

await new Promise((r) => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');

/* 每次都从「全新存档」开始跑，否则上一次的进度（换装、宠物好感度…）会让断言失真 */
await ev(`localStorage.clear()`);
await send('Page.reload');
await sleep(1600);

/* 等游戏启动 */
for (let i = 0; i < 40; i++) {
  if (await ev(`!!document.querySelector('.candy')`)) break;
  await sleep(200);
}
check('游戏已启动（糖果已生成）', await ev(`document.querySelectorAll('.candy').length`) > 0,
  '糖果数=' + (await ev(`document.querySelectorAll('.candy').length`)));
check('可爱字体已加载', await ev(`document.fonts.check('16px KuaiLe')`));

/* 按键竖排：3F 在最上、1F 在最下 */
const btnOrder = await ev(`[...document.querySelectorAll('.floorbtn')].map(b => b.dataset.floor).join(',')`);
check('按键 DOM 顺序是 6F → 5F → 4F → 3F → 2F → 1F', btnOrder === '6,5,4,3,2,1', '实际: ' + btnOrder);
/* 面板上「越高的楼层越靠上」：先按纵坐标、再按横坐标排一遍应该正好是 6→1
   （单列时就是普通的从上到下；两列时是 6F5F / 4F3F / 2F1F） */
const btnGrid = await ev(`[...document.querySelectorAll('.floorbtn')].map(b => {
  const r = b.getBoundingClientRect();
  return [Math.round(r.top), Math.round(r.left), b.dataset.floor];
}).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(p => p[2]).join(',')`);
check('按键按楼层从高到低排列', btnGrid === '6,5,4,3,2,1', '排序后: ' + btnGrid);
const btnCols = await ev(`document.querySelectorAll('.floors__cell').length`);
check('楼层指示条格数 = 楼层数', btnCols === 6, '格数=' + btnCols);
const twoCol = await ev(`document.body.classList.contains('panel-2col')`);
check('楼层 ≥ 6 时按键自动变两列', twoCol === true, twoCol ? '两列' : '单列');
const panelTop = await ev(`Math.round(document.querySelector('.panel').getBoundingClientRect().top)`);
const stageTop = await ev(`Math.round(document.querySelector('#stage').getBoundingClientRect().top)`);
check('面板在右侧、与舞台顶部基本对齐', Math.abs(panelTop - stageTop) < 20, `面板 top=${panelTop}, 舞台 top=${stageTop}`);

await shot('01-1F');

/* --- 1F：点糖果 --- */
const coin0 = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelectorAll('.candy')[0].click()`);
await sleep(400);
const coin1 = await ev(`+document.querySelector('#coin-count').textContent`);
check('1F 点糖果能加星星糖', coin1 > coin0, `${coin0} → ${coin1}`);
await shot('02-1F-收糖');

/* --- 去 2F，检查关门动画 --- */
await ev(`document.querySelector('.floorbtn[data-floor="2"]').click()`);
await sleep(700);
check('电梯行进中（门已关）', await ev(`document.querySelector('#stage').classList.contains('is-closed')`));
await shot('03-运行中-门关着');
await sleep(2600);
check('到站后门已打开', !(await ev(`document.querySelector('#stage').classList.contains('is-closed')`)));
check('2F 房间已切换', (await ev(`document.querySelector('#room-bg').getAttribute('src')`)).includes('icecream'));
check('2F 玩法已挂载', (await ev(`document.querySelectorAll('.pick').length`)) === 6);
check('2F 来了顾客并点单', await ev(`!!document.querySelector('.customer__img') && document.querySelectorAll('.order__icon').length === 2`),
  '顾客：' + (await ev(`document.querySelector('.customer__name').textContent`)) +
  '，点单：' + (await ev(`[...document.querySelectorAll('.order__icon')].map(i => i.alt).join('+')`)));
await shot('04-2F');

/* --- 2F：照着顾客的点单做 → 应该卖更贵 --- */
const wantOrder = await ev(`[...document.querySelectorAll('.order__icon')].map(i => i.alt).join('+')`);
await ev(`(() => {
  const names = [...document.querySelectorAll('.order__icon')].map(i => i.alt);
  const picks = [...document.querySelectorAll('.pick')];
  names.forEach(n => { const p = picks.find(x => x.textContent.trim() === n); if (p) p.click(); });
})()`);
await sleep(1200);
check('冰淇淋已做好', await ev(`!!document.querySelector('.icecream.is-ready')`));
check('照着点单做，售价 8 颗', (await ev(`document.querySelector('.icecream__price')?.textContent`)) === '8',
  '点单=' + wantOrder + ' 售价=' + (await ev(`document.querySelector('.icecream__price')?.textContent`)));
check('对上点单时价格徽章高亮', await ev(`!!document.querySelector('.icecream__price.is-match')`));
await shot('05-2F-对上点单');
const coin2 = await ev(`+document.querySelector('#coin-count').textContent`);
const nameBefore = await ev(`document.querySelector('.customer__name').textContent`);
await ev(`document.querySelector('.icecream').click()`);
await sleep(600);
const coin3 = await ev(`+document.querySelector('#coin-count').textContent`);
check('对上点单卖出 +8 颗', coin3 - coin2 === 8, `+${coin3 - coin2}`);
await shot('06-2F-卖出');

/* 等新顾客上门（换人要 900ms），再确认点单确实换了 */
await sleep(1400);
const nameAfter = await ev(`document.querySelector('.customer__name').textContent`);
const orderAfter = await ev(`[...document.querySelectorAll('.order__icon')].map(i => i.alt).join('+')`);
check('卖完会换下一位顾客 / 换一份点单', nameAfter !== nameBefore || orderAfter !== wantOrder,
  `${nameBefore}(${wantOrder}) → ${nameAfter}(${orderAfter})`);

/* --- 2F：故意做错的 → 只值 3 颗 --- */
await ev(`(() => {
  const names = [...document.querySelectorAll('.order__icon')].map(i => i.alt);
  const picks = [...document.querySelectorAll('.pick')];
  const flavors = picks.slice(0, 3), toppings = picks.slice(3);
  const f = flavors.find(x => names.indexOf(x.textContent.trim()) === -1) || flavors[0];
  const t = toppings.find(x => names.indexOf(x.textContent.trim()) === -1) || toppings[0];
  f.click(); t.click();
})()`);
await sleep(1200);
check('没对上点单的售价是 3 颗', (await ev(`document.querySelector('.icecream__price')?.textContent`)) === '3',
  '售价=' + (await ev(`document.querySelector('.icecream__price')?.textContent`)));
const coinBad0 = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelector('.icecream').click()`);
await sleep(500);
const coinBad1 = await ev(`+document.querySelector('#coin-count').textContent`);
check('没对上点单卖出 +3 颗', coinBad1 - coinBad0 === 3, `+${coinBad1 - coinBad0}`);
await shot('07-2F-做错了');

/* --- 去 3F --- */
await ev(`document.querySelector('.floorbtn[data-floor="3"]').click()`);
await sleep(3300);
check('3F 玩法已挂载', await ev(`!!document.querySelector('.brew')`));
await shot('07-3F');

/* --- 3F：按住萃取到完美区 --- */
await ev(`document.querySelector('.brew').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,isPrimary:true}))`);
await sleep(1100);   // 约 60% → 完美区
const fillNow = await ev(`document.querySelector('.gauge__fill').style.height`);
await ev(`document.querySelector('.brew').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,isPrimary:true}))`);
await sleep(300);
check('萃取进度在走', parseFloat(fillNow) > 30, '松手时 ' + fillNow);
check('杯子已装满', await ev(`document.querySelector('.cup').classList.contains('is-full')`));
check('评价显示完美', ((await ev(`document.querySelector('.verdict').textContent`)) || '').includes('完美'),
  await ev(`document.querySelector('.verdict').textContent`));
await shot('08-3F-萃取完美');
const coin4 = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelector('.cup').click()`);
await sleep(400);
const coin5 = await ev(`+document.querySelector('#coin-count').textContent`);
check('喝咖啡收星星糖', coin5 - coin4 === 5, `+${coin5 - coin4}`);
check('杯子已清空', await ev(`document.querySelector('.cup img').getAttribute('src').includes('empty')`));
await shot('09-3F-喝完');

/* --- 去 4F 衣帽间 --- */
await ev(`document.querySelector('.floorbtn[data-floor="4"]').click()`);
await sleep(4000);
check('4F 房间已切换', (await ev(`document.querySelector('#room-bg').getAttribute('src')`)).includes('closet'));
check('4F 玩法已挂载（20 个换装按钮：每行 4 件免费 + 1 件商店）', (await ev(`document.querySelectorAll('.garment').length`)) === 20,
  '按钮数=' + (await ev(`document.querySelectorAll('.garment').length`)));
check('镜子里的预览已生成', await ev(`!!document.querySelector('.mirror__body')`));
await shot('10-4F');

/* 换发型：主角图层应该跟着变 */
const hairBefore = await ev(`document.querySelector('.cat .wear--hair').getAttribute('src')`);
await ev(`document.querySelector('.garment[data-slot="hair"][data-item="curly"]').click()`);
await sleep(400);
const hairAfter = await ev(`document.querySelector('.cat .wear--hair').getAttribute('src')`);
check('换发型会更新主角身上的图层', !!hairAfter && hairAfter !== hairBefore,
  (hairBefore || '(无)') + ' → ' + hairAfter);

/* 一次换整套（也是第一次凑出这套搭配 → 应该有奖励） */
const coinBefore = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelector('.garment[data-slot="clothes"][data-item="dress"]').click()`);
await sleep(250);
await ev(`document.querySelector('.garment[data-slot="shoes"][data-item="mary"]').click()`);
await sleep(250);
await ev(`document.querySelector('.garment[data-slot="headwear"][data-item="crown"]').click()`);
await sleep(600);
const coinAfter = await ev(`+document.querySelector('#coin-count').textContent`);
check('凑出新搭配有星星糖奖励', coinAfter > coinBefore, `${coinBefore} → ${coinAfter}`);
check('镜子预览同步换装',
  (await ev(`document.querySelector('.mirror .wear--clothes').getAttribute('src')`)).includes('clothes-dress') &&
  (await ev(`document.querySelector('.mirror .wear--headwear').getAttribute('src')`)).includes('headwear-crown'));
check('当前搭配高亮（按钮 is-active）',
  await ev(`document.querySelector('.garment[data-slot="shoes"][data-item="mary"]').classList.contains('is-active')`));
await shot('11-4F-换好衣服');

/* 随机搭配按钮 */
await ev(`document.querySelector('.dice').click()`);
await sleep(500);
check('随机搭配能一键换整套', await ev(`document.querySelectorAll('.garment.is-active').length`) === 4,
  '高亮数量=' + (await ev(`document.querySelectorAll('.garment.is-active').length`)));
await shot('12-4F-随机搭配');

check('换装结果写进存档（和界面一致）', await ev(`(() => {
  const s = JSON.parse(localStorage.getItem('meow-elevator-save-v1')).outfit || {};
  const dom = {};
  document.querySelectorAll('.garment.is-active').forEach(b => { dom[b.dataset.slot] = b.dataset.item; });
  return ['hair', 'headwear', 'clothes', 'shoes'].every(k => (s[k] || '') === (dom[k] || ''));
})()`), '存档=' + (await ev(`JSON.stringify(JSON.parse(localStorage.getItem('meow-elevator-save-v1')).outfit)`)));

/* 换主角时，镜子里的「自己」也要跟着换（这是之前固定显示猪猪兔的 bug） */
const skinIds = await ev(`Object.keys(EG.ASSETS.character).join(',')`);
check('四位主角都在（猪猪兔 / 咪咪 / 小兔子 / 小马）', skinIds === 'pigbunny,cat,rabbit,pony', skinIds);
check('四位主角的图都能加载（没有 404）', await ev(`(async () => {
  const list = [];
  Object.keys(EG.ASSETS.character).forEach(function (k) {
    const s = EG.ASSETS.character[k];
    list.push(s.avatar, s.idle, s.happy, s.wave, s.sleep);
  });
  const res = await Promise.all(list.map(function (src) {
    return new Promise(function (r) {
      const im = new Image();
      im.onload = function () { r(im.naturalWidth > 0); };
      im.onerror = function () { r(false); };
      im.src = src;
    });
  }));
  return res.every(Boolean);
})()`) === true);

const mirrorBefore = await ev(`document.querySelector('.mirror__body').getAttribute('src')`);
await ev(`document.querySelector('#skin-toggle').click()`);
await sleep(500);
const mirrorAfter = await ev(`document.querySelector('.mirror__body').getAttribute('src')`);
check('4F 镜子里的人跟着主角一起换', !!mirrorAfter && mirrorAfter !== mirrorBefore,
  (mirrorBefore || '').split('/').pop() + ' → ' + (mirrorAfter || '').split('/').pop());
check('换成猫猫后镜子里的衣服自动隐藏', await ev(`document.body.classList.contains('skin-cat') &&
  getComputedStyle(document.querySelector('.mirror .wear--clothes')).display === 'none'`));
await shot('13-4F-换主角后的镜子');

/* 再点两下到小兔子：它和猪猪兔共用骨架，所以衣服要正常显示 */
await ev(`document.querySelector('#skin-toggle').click()`);
await sleep(400);
check('切到小兔子', (await ev(`EG.Say.skin()`)) === 'rabbit', await ev(`EG.Say.skin()`));
check('小兔子能穿衣服（镜子里的衣服图层没被隐藏）',
  await ev(`getComputedStyle(document.querySelector('.mirror .wear--clothes')).display !== 'none'`));
await shot('13b-4F-小兔子');

/* 再点两下到小马，然后回到猪猪兔 */
for (let i = 0; i < 2; i++) { await ev(`document.querySelector('#skin-toggle').click()`); await sleep(400); }
check('一圈点完回到猪猪兔', (await ev(`EG.Say.skin()`)) === 'pigbunny', await ev(`EG.Say.skin()`));
check('换回猪猪兔后镜子也跟着回来', (await ev(`document.querySelector('.mirror__body').getAttribute('src')`)).indexOf('pigbunny') >= 0);

/* --- 4F 商店：买衣服 + 买宠物装扮 --- */
/* 先补一点星星糖保证买得起（赚钱路径前面已经验证过了，这里只验证商店扣款逻辑） */
await ev(`EG.State.addCoins(120)`);
await sleep(200);
const coinShop0 = await ev(`+document.querySelector('#coin-count').textContent`);

await ev(`document.querySelector('.closetbtn--shop').click()`);
await sleep(400);
check('4F 商店能打开', await ev(`document.querySelector('#shop').classList.contains('is-open')`));
const cardCount = await ev(`document.querySelectorAll('.shopcard').length`);
check('商店里列了 4 件衣服 + 4 件宠物装扮', cardCount === 8, '商品数=' + cardCount);
check('商店里显示当前星星糖', (await ev(`+document.querySelector('#shop-coins').textContent`)) === coinShop0);
await shot('14-4F-商店');

const bunsSel = `document.querySelector('.shopcard[data-kind="garment"][data-id="buns"]')`;
await ev(`${bunsSel}.click()`);
await sleep(300);
check('第一次点只是问价，还没扣钱', (await ev(`+document.querySelector('#coin-count').textContent`)) === coinShop0);
await ev(`${bunsSel}.click()`);
await sleep(500);
const coinShop1 = await ev(`+document.querySelector('#coin-count').textContent`);
/* 扣 15 颗，但买完会立刻穿上 → 新搭配又奖励 2 颗，所以净变化是 -13 */
check('再点一次就买下来了（扣 15 颗，穿上的新搭配再奖励 2 颗）', coinShop1 === coinShop0 - 15 + 2, `${coinShop0} → ${coinShop1}`);
check('买过的商品显示「已拥有」', await ev(`${bunsSel}.classList.contains('is-owned')`));
check('买完的头发直接穿上了', (await ev(`document.querySelector('.cat .wear--hair').getAttribute('src')`)).indexOf('hair-buns') >= 0,
  await ev(`document.querySelector('.cat .wear--hair').getAttribute('src')`));
check('购买记录写进存档', await ev(`!!JSON.parse(localStorage.getItem('meow-elevator-save-v1')).owned['hair:buns']`));

/* 再买一件宠物饰品：小帽子（14 颗） */
const hatSel = `document.querySelector('.shopcard[data-kind="pet"][data-id="hat"]')`;
await ev(`${hatSel}.click()`);
await sleep(250);
await ev(`${hatSel}.click()`);
await sleep(500);
const coinShop2 = await ev(`+document.querySelector('#coin-count').textContent`);
check('宠物装扮也能买（扣 14 颗）', coinShop2 === coinShop1 - 14, `${coinShop1} → ${coinShop2}`);
await ev(`document.querySelector('#shop-close').click()`);
await sleep(250);

/* 宠物装扮面板：给团子戴上小帽子 */
await ev(`document.querySelector('.closetbtn--petdress').click()`);
await sleep(400);
check('宠物装扮面板能打开', await ev(`document.querySelector('#petdress').classList.contains('is-open')`));
check('三只宠物都在装扮列表里', (await ev(`document.querySelectorAll('.dressrow').length`)) === 3);
await shot('15-4F-宠物装扮');
await ev(`document.querySelector('.dressitem.pw--hat[data-pet="cat"]').click()`);
await sleep(400);
check('给团子戴上小帽子会写进存档',
  (await ev(`(JSON.parse(localStorage.getItem('meow-elevator-save-v1')).petWear || {}).cat`)) === 'hat');
check('装扮面板里帽子是选中态',
  await ev(`document.querySelector('.dressitem.pw--hat[data-pet="cat"]').classList.contains('is-active')`));
check('没买的饰品点了会被拦住（还是锁着的）',
  await ev(`document.querySelector('.dressitem.pw--cape[data-pet="dog"]').classList.contains('is-locked')`));
await ev(`document.querySelector('#petdress-close').click()`);
await sleep(200);

/* --- 去 5F 宠物层 --- */
await ev(`document.querySelector('.floorbtn[data-floor="5"]').click()`);
await sleep(4600);
check('5F 房间已切换', (await ev(`document.querySelector('#room-bg').getAttribute('src')`)).includes('room-pet'));
check('5F 三只宠物已生成', (await ev(`document.querySelectorAll('.pet').length`)) === 3,
  '宠物数=' + (await ev(`document.querySelectorAll('.pet').length`)));
check('5F 三样零食已生成', (await ev(`document.querySelectorAll('.food').length`)) === 3);
check('4F 买的小帽子在 5F 团子头上', (await ev(`document.querySelector('.pet--cat .pet__wear').getAttribute('src') || ''`)).indexOf('wear-hat') >= 0,
  await ev(`document.querySelector('.pet--cat .pet__wear').getAttribute('src')`));
check('没装扮的宠物不显示饰品图层', await ev(`getComputedStyle(document.querySelector('.pet--dog .pet__wear')).display === 'none'`));
check('每只宠物都有好感度条', (await ev(`document.querySelectorAll('.pet__meter').length`)) === 3);
await shot('13-5F');

/* 摸一摸：+1 星星糖、好感度上升 */
const coinPet0 = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelector('.pet--cat').click()`);
await sleep(450);
const coinPet1 = await ev(`+document.querySelector('#coin-count').textContent`);
check('摸宠物加星星糖', coinPet1 - coinPet0 === 1, `+${coinPet1 - coinPet0}`);
check('好感度条有进度', parseFloat(await ev(`document.querySelector('.pet--cat .pet__meter i').style.width`)) > 0,
  '宽度=' + (await ev(`document.querySelector('.pet--cat .pet__meter i').style.width`)));
await shot('14-5F-摸一摸');

/* 喂对零食：+3 星星糖、好感度大涨 */
await ev(`document.querySelectorAll('.food')[0].click()`);   // 小鱼干
await sleep(200);
check('拿起零食会高亮', await ev(`document.querySelectorAll('.food')[0].classList.contains('is-held')`));
const coinFeed0 = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelector('.pet--cat').click()`);
await sleep(450);
const coinFeed1 = await ev(`+document.querySelector('#coin-count').textContent`);
check('喂对零食加 3 颗星星糖', coinFeed1 - coinFeed0 === 3, `+${coinFeed1 - coinFeed0}`);
check('喂完零食会放回食盆', !(await ev(`document.querySelectorAll('.food')[0].classList.contains('is-held')`)));

/* 喂错零食：不给钱、零食还拿在手上 */
await ev(`document.querySelectorAll('.food')[1].click()`);   // 肉骨头给小猫
await sleep(200);
const coinWrong0 = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelector('.pet--cat').click()`);
await sleep(400);
check('喂错零食不给星星糖、零食还在手上',
  (await ev(`+document.querySelector('#coin-count').textContent`)) === coinWrong0 &&
  (await ev(`document.querySelectorAll('.food')[1].classList.contains('is-held')`)));
await shot('15-5F-喂错零食');

/* 连喂 5 次把好感度攒满 → 应该升级 + 给奖励 */
const coinLv0 = await ev(`+document.querySelector('#coin-count').textContent`);
for (let i = 0; i < 5; i++) {
  await ev(`document.querySelectorAll('.food')[0].click()`);
  await sleep(130);
  await ev(`document.querySelector('.pet--cat').click()`);
  await sleep(190);
}
await sleep(500);
const coinLv1 = await ev(`+document.querySelector('#coin-count').textContent`);
check('好感度满会升级并给奖励', coinLv1 - coinLv0 >= 20, `这一轮 +${coinLv1 - coinLv0}（5 次喂食 15 + 升级奖励 5）`);
check('升级后出现星级徽章', await ev(`document.querySelector('.pet--cat .pet__badge').classList.contains('is-show')`),
  '徽章=' + (await ev(`document.querySelector('.pet--cat .pet__badge').textContent`)));
check('宠物好感度写进存档', await ev(`!!(JSON.parse(localStorage.getItem('meow-elevator-save-v1')).pets || {}).cat`));
await shot('16-5F-升级');

/* --- 去 6F 游乐区 --- */
await ev(`document.querySelector('.floorbtn[data-floor="6"]').click()`);
await sleep(4600);
check('6F 房间已切换', (await ev(`document.querySelector('#room-bg').getAttribute('src')`)).includes('room-arcade'));
check('6F 有三个游戏摊位', (await ev(`document.querySelectorAll('.booth').length`)) === 3,
  '摊位=' + (await ev(`[...document.querySelectorAll('.booth')].map(b => b.textContent.trim()).join('/')`)));
check('楼层指示条有 6 格且当前格高亮',
  (await ev(`document.querySelectorAll('.floors__cell').length`)) === 6 &&
  (await ev(`document.querySelector('.floors__cell.is-active')?.textContent`)) === '6F');
await shot('17-6F');

/* ① 投篮：等指针进绿区再点，保证命中 */
await ev(`document.querySelector('.booth--basket').click()`);
await sleep(400);
check('投篮弹窗已打开', await ev(`document.querySelector('#arcade').classList.contains('is-open')`));
await shot('18-6F-投篮');
const coinBb0 = await ev(`+document.querySelector('#coin-count').textContent`);
for (let i = 0; i < 3; i++) {
  for (let t = 0; t < 60; t++) {                       // 等指针走到绿区
    const p = parseFloat(await ev(`document.querySelector('#arc-mark').style.left`) || '0');
    if (p >= 40 && p <= 60) break;
    await sleep(40);
  }
  await ev(`document.querySelector('#arcade-action').click()`);
  await sleep(900);
}
const coinBb1 = await ev(`+document.querySelector('#coin-count').textContent`);
check('投篮 3 球能拿到星星糖', coinBb1 > coinBb0, `+${coinBb1 - coinBb0}`);
check('投完显示本轮成绩', ((await ev(`document.querySelector('#arcade-score').textContent`)) || '').indexOf('本轮') >= 0,
  await ev(`document.querySelector('#arcade-score').textContent`));
await shot('19-6F-投篮结束');

/* ② 羽毛球：等球进左边接球区再挥拍 */
await ev(`document.querySelector('#arcade-close').click()`);
await sleep(200);
check('关掉弹窗后遮罩也收起来了', !(await ev(`document.querySelector('#arcade').classList.contains('is-open')`)));
await ev(`document.querySelector('.booth--badminton').click()`);
await sleep(300);
check('羽毛球弹窗已打开', (await ev(`document.querySelector('#arcade-title').textContent`)).indexOf('羽毛球') >= 0);
await shot('20-6F-羽毛球');
const coinBd0 = await ev(`+document.querySelector('#coin-count').textContent`);
for (let t = 0; t < 80; t++) {
  const x = parseFloat(await ev(`document.querySelector('#arc-shuttle').style.left`) || '100');
  if (x <= 22) break;
  await sleep(40);
}
await ev(`document.querySelector('#arcade-action').click()`);
await sleep(400);
const coinBd1 = await ev(`+document.querySelector('#coin-count').textContent`);
check('羽毛球接住一球 +1 颗', coinBd1 - coinBd0 === 1, `+${coinBd1 - coinBd0}`);
check('连击数有显示', ((await ev(`document.querySelector('#arcade-score').textContent`)) || '').indexOf('连击 1') >= 0,
  await ev(`document.querySelector('#arcade-score').textContent`));

/* ③ 老虎机：投 1 颗，结算只有三种可能（-1 / 0 / +7） */
await ev(`document.querySelector('#arcade-close').click()`);
await sleep(200);
await ev(`document.querySelector('.booth--slot').click()`);
await sleep(300);
check('老虎机弹窗已打开', (await ev(`document.querySelector('#arcade-title').textContent`)).indexOf('老虎机') >= 0);
await shot('21-6F-老虎机');
const coinSl0 = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelector('#arcade-action').click()`);
await sleep(2400);
const coinSl1 = await ev(`+document.querySelector('#coin-count').textContent`);
const diff = coinSl1 - coinSl0;
check('老虎机结算合理（没中 -1 / 中两个 ±0 / 三个一样 +7）', [-1, 0, 7].indexOf(diff) >= 0, `${coinSl0} → ${coinSl1}`);
check('老虎机有结果文案', ((await ev(`document.querySelector('#arcade-score').textContent`)) || '').indexOf('颗') >= 0,
  await ev(`document.querySelector('#arcade-score').textContent`));
await shot('22-6F-老虎机结果');

/* --- 回 1F --- */
await ev(`document.querySelector('.floorbtn[data-floor="1"]').click()`);
await sleep(6200);
check('回到 1F', (await ev(`document.querySelector('#room-bg').getAttribute('src')`)).includes('candy'));
check('显示屏显示 1F', (await ev(`document.querySelector('#indicator-text').textContent`)) === '1F');
check('存档写入了 localStorage', await ev(`!!localStorage.getItem('meow-elevator-save-v1')`));
await shot('13-回到1F');

console.log('\n===== 自检结果 =====');
console.log(report.join('\n'));
console.log('\n页面报错：' + (errors.length ? '\n' + errors.join('\n') : '（无）'));
console.log('截图目录：' + OUT);
process.exit(errors.length ? 2 : 0);
