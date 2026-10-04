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

/* --- 回 1F --- */
await ev(`document.querySelector('.floorbtn[data-floor="1"]').click()`);
await sleep(3300);
check('回到 1F', (await ev(`document.querySelector('#room-bg').getAttribute('src')`)).includes('candy'));
check('显示屏显示 1F', (await ev(`document.querySelector('#indicator-text').textContent`)) === '1F');
check('存档写入了 localStorage', await ev(`!!localStorage.getItem('meow-elevator-save-v1')`));
await shot('10-回到1F');

console.log('\n===== 自检结果 =====');
console.log(report.join('\n'));
console.log('\n页面报错：' + (errors.length ? '\n' + errors.join('\n') : '（无）'));
console.log('截图目录：' + OUT);
process.exit(errors.length ? 2 : 0);
