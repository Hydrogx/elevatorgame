/* ============================================================
   tools/character-sheet.mjs —— 把主角的所有表情拼成一张对照图
   需要 Chrome 已经带着调试端口在跑（见 tools/run-smoke.sh）
   ============================================================ */
import { writeFileSync } from 'node:fs';

const PORT = process.env.CDP_PORT || 9333;
const OUT = process.env.SHOT_DIR || '/tmp/eg-shots';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;

ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await new Promise((r) => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Page.enable');

await send('Runtime.evaluate', {
  expression: `
    document.body.innerHTML = '<div id="sheet"></div>';
    document.body.style.cssText = 'background:#FFF6E5;margin:0;padding:16px;display:grid';
    const files = ['pigbunny-idle','pigbunny-happy','pigbunny-wave','pigbunny-sleep',
                   'cat-idle','cat-happy','cat-wave','cat-sleep'];
    document.getElementById('sheet').innerHTML = files.map(f =>
      '<figure style="margin:0;background:#fff;border:3px solid #6B4A45;border-radius:16px;padding:8px;display:flex;flex-direction:column;align-items:center">' +
      '<img src="assets/character/' + f + '.svg" style="height:240px">' +
      '<figcaption style="font:13px sans-serif;color:#8A6A5A">' + f + '</figcaption></figure>').join('');
    document.getElementById('sheet').style.cssText =
      'position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;width:1200px';
  `,
});
await sleep(600);
const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1240, height: 360, scale: 1 } });
writeFileSync(`${OUT}/character-sheet.png`, Buffer.from(r.result.data, 'base64'));
console.log('已生成 ' + OUT + '/character-sheet.png');
process.exit(0);
