/* ============================================================
   tools/mobile-check.mjs —— 手机浏览器适配自检
   用 Chrome 的设备模拟分别按「横屏手机 / 竖屏手机」跑一遍，检查：
     1) 缩放比例、是否命中触屏样式（pointer: coarse）
     2) 台词 / 奖励气泡有没有压住可点元素
     3) 关键按钮在真实屏幕上的点击尺寸够不够大
   用法：先起带调试端口的 Chrome（见 README），再 `node tools/mobile-check.mjs`
   ============================================================ */
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = process.env.CDP_PORT || 9333;
const OUT = process.env.SHOT_DIR || '/tmp/eg-mobile';
mkdirSync(OUT, { recursive: true });

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
if (!page) { console.error('找不到页面目标'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let id = 0;

ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  }
});
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description));
  return r.result?.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'));
}

await new Promise((r) => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Page.enable');

const report = [];
const check = (label, ok, detail) => report.push(`${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);

/* 量一下：气泡有没有盖住可点元素、按钮实际多大 */
const PROBE = `(() => {
  const bubble = document.querySelector('.bubble');
  bubble.classList.add('is-show');          /* 强制显示，量它最占地方的时候 */
  const b = bubble.getBoundingClientRect();
  const sels = ['.candy', '.pick', '.garment', '.food', '.pet', '.bowl', '.brew', '.cup',
                '.dice', '.mirror', '.icecream.is-ready', '.customer', '.floorbtn', '.minimap'];
  const hits = [];
  sels.forEach(sel => {
    document.querySelectorAll(sel).forEach(t => {
      const r = t.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const overlap = !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom);
      if (overlap) hits.push(sel);
    });
  });
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-scale')) || 1;
  const sizes = {};
  ['.floorbtn', '.pick__btn', '.garment', '.food', '.pet', '.candy', '.brew'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    sizes[sel] = Math.round(Math.min(r.width, r.height));
  });
  const bubbleStyle = getComputedStyle(bubble);
  const overflow = {};
  /* 注意：不查 .stage —— 电梯门打开时会滑到画面外，那是 overflow:hidden 的正常裁剪 */
  ['.app', '.side', '.panel', '.hud'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    const dy = el.scrollHeight - el.clientHeight;
    const dx = el.scrollWidth - el.clientWidth;
    if (dy > 2 || dx > 2) overflow[sel] = dx + 'x' + dy;
  });
  return {
    viewport: window.innerWidth + 'x' + window.innerHeight,
    scale: +scale.toFixed(3),
    coarse: matchMedia('(pointer: coarse)').matches,
    bubbleRect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
    bubbleLines: bubbleStyle.whiteSpace + '/' + Math.round(b.height),
    overlapped: hits,
    tapSizes: sizes,
    minTap: Math.min.apply(null, Object.keys(sizes).map(k => sizes[k])),
    overflow: overflow,
    rotateHint: (() => { const h = document.querySelector('.rotate-hint'); return h ? getComputedStyle(h).display : 'none'; })()
  };
})()`;

/* ---------- 横屏手机（主流游戏方向） ---------- */
await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.reload');
await sleep(3000);
/* 统一先去 5F：零食 + 宠物都在那一层，量出来的热区最有参考价值 */
await ev(`document.querySelector('.floorbtn[data-floor="5"]').click()`);
await sleep(4600);
let r = await ev(PROBE);
check('横屏 844×390：命中触屏样式 (pointer: coarse)', r.coarse === true);
check('横屏：整体还能完整放下', r.scale > 0.4, `缩放=${r.scale}，视口=${r.viewport}`);
check('横屏：台词气泡没有压住任何可点元素', r.overlapped.length === 0, r.overlapped.join(',') || `气泡=${JSON.stringify(r.bubbleRect)}`);
check('横屏：界面没有溢出（6 个楼层按钮都放得下）', Object.keys(r.overflow).length === 0, JSON.stringify(r.overflow));
check('横屏：最小的按钮也够手指点（≥40px）', r.minTap >= 40, JSON.stringify(r.tapSizes));
check('横屏：竖屏提示条不显示', r.rotateHint === 'none');
await shot('01-横屏-1F');
await ev(`document.querySelector('.floorbtn[data-floor="5"]').click()`);
await sleep(4200);
await ev(`document.querySelector('.pet--cat').click()`);   /* 触发一次飘字 + 台词 */
await sleep(400);
await shot('02-横屏-5F-提示');
r = await ev(PROBE);
check('横屏 5F：飘字/台词期间也没压住宠物或零食', r.overlapped.length === 0, r.overlapped.join(',') || '无');

/* 计算练习弹窗在手机上也要点得中 */
await ev(`EG.Math.setOn(true); EG.Math.popNow()`);
await sleep(500);
const math = await ev(`(() => {
  const k = document.querySelector('.math__key').getBoundingClientRect();
  const p = document.querySelector('.math__panel').getBoundingClientRect();
  return { key: Math.round(Math.min(k.width, k.height)),
           panel: [Math.round(p.width), Math.round(p.height)],
           fits: p.top >= 0 && p.bottom <= innerHeight };
})()`);
check('横屏：计算练习的数字键够手指点（≥40px）', math.key >= 40, '数字键=' + math.key + 'px');
check('横屏：计算练习弹窗完整放得下', math.fits === true, '面板=' + math.panel.join('x'));
await shot('02b-横屏-计算练习');
await ev(`EG.Math.setOn(false)`);
await sleep(300);

/* ---------- 竖屏手机 ---------- */
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send('Page.reload');
await sleep(3000);
r = await ev(PROBE);
check('竖屏 390×844：出现「横过来玩」提示条', r.rotateHint !== 'none', 'display=' + r.rotateHint);
check('竖屏：游戏仍可玩（缩放不为 0）', r.scale > 0.2, `缩放=${r.scale}`);
check('竖屏：气泡没有压住可点元素', r.overlapped.length === 0, r.overlapped.join(',') || '无');
await shot('03-竖屏-提示条');
await ev(`document.querySelector('#rotate-hint').click()`);
await sleep(300);
check('竖屏：提示条点一下会消失', (await ev(`getComputedStyle(document.querySelector('#rotate-hint')).display`)) === 'none');

/* ---------- 平板（触屏但不小） ---------- */
await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 2, mobile: true });
await send('Page.reload');
await sleep(2500);
r = await ev(PROBE);
check('平板 1024×768：排版正常、气泡不压按钮', r.overlapped.length === 0, `缩放=${r.scale} ${r.overlapped.join(',') || ''}`);
await shot('04-平板');

console.log('\n===== 手机适配自检 =====');
console.log(report.join('\n'));
console.log('\n页面报错：' + (errors.length ? '\n' + errors.join('\n') : '（无）'));
console.log('截图目录：' + OUT);
process.exit(report.some((x) => x.startsWith('❌')) || errors.length ? 2 : 0);
