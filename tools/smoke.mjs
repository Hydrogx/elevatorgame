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
check('按键 DOM 顺序是 4F → 3F → 2F → 1F', btnOrder === '4,3,2,1', '实际: ' + btnOrder);
const btnTops = await ev(`[...document.querySelectorAll('.floorbtn')].map(b => Math.round(b.getBoundingClientRect().top)).join(',')`);
const tops = btnTops.split(',').map(Number);
check('按键纵向排列（4F 最高、1F 最低）', tops.every((v, i) => i === 0 || v > tops[i - 1]), 'top 坐标: ' + btnTops);
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
await shot('04-2F');

/* --- 2F：选球 + 选配料 --- */
await ev(`document.querySelectorAll('.pick')[0].click()`);   // 草莓
await sleep(200);
await ev(`document.querySelectorAll('.pick')[4].click()`);   // 樱桃（推荐搭配）
await sleep(1100);
check('冰淇淋已做好', await ev(`!!document.querySelector('.icecream.is-ready')`));
check('售价显示 5（推荐搭配）', (await ev(`document.querySelector('.icecream__price')?.textContent`)) === '5',
  '价格=' + (await ev(`document.querySelector('.icecream__price')?.textContent`)));
await shot('05-2F-做好了');
const coin2 = await ev(`+document.querySelector('#coin-count').textContent`);
await ev(`document.querySelector('.icecream').click()`);
await sleep(400);
const coin3 = await ev(`+document.querySelector('#coin-count').textContent`);
check('卖冰淇淋加星星糖', coin3 - coin2 === 5, `+${coin3 - coin2}`);
await shot('06-2F-卖出');

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
check('4F 玩法已挂载（16 个换装按钮）', (await ev(`document.querySelectorAll('.garment').length`)) === 16,
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

/* --- 回 1F --- */
await ev(`document.querySelector('.floorbtn[data-floor="1"]').click()`);
await sleep(4600);
check('回到 1F', (await ev(`document.querySelector('#room-bg').getAttribute('src')`)).includes('candy'));
check('显示屏显示 1F', (await ev(`document.querySelector('#indicator-text').textContent`)) === '1F');
check('存档写入了 localStorage', await ev(`!!localStorage.getItem('meow-elevator-save-v1')`));
await shot('13-回到1F');

console.log('\n===== 自检结果 =====');
console.log(report.join('\n'));
console.log('\n页面报错：' + (errors.length ? '\n' + errors.join('\n') : '（无）'));
console.log('截图目录：' + OUT);
process.exit(errors.length ? 2 : 0);
