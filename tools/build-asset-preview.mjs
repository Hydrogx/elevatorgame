/* ============================================================
   tools/build-asset-preview.mjs
   扫描 assets/ 下所有 SVG，生成一张「美术资源总览页」tools/asset-preview.html
   用法：node tools/build-asset-preview.mjs
   ============================================================ */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name.endsWith('.svg')) out.push(relative(ROOT, full));
    else if (!name.includes('.')) walk(full, out);
  }
  return out;
}

const files = walk(join(ROOT, 'assets')).sort();
const cells = files
  .map((f) => `<figure><img src="../${f}"><figcaption>${f}</figcaption></figure>`)
  .join('\n');

const html = `<!doctype html>
<meta charset="utf-8">
<title>喵喵电梯公寓 · 美术资源总览</title>
<style>
  body{margin:0;padding:16px;background:#FFF6E5;font:13px/1.4 -apple-system,"PingFang SC",sans-serif;
       display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
  h1{grid-column:1/-1;margin:0 0 4px;font-size:18px;color:#6B4A45}
  figure{margin:0;background:#fff;border:3px solid #6B4A45;border-radius:14px;padding:8px;
         display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-height:150px}
  img{max-width:100%;max-height:120px;object-fit:contain}
  figcaption{margin-top:6px;font-size:10px;color:#8A6A5A;word-break:break-all;text-align:center}
</style>
<h1>喵喵电梯公寓 · 美术资源总览（共 ${files.length} 个 SVG，每个都是独立文件）</h1>
${cells}
`;

writeFileSync(join(ROOT, 'tools/asset-preview.html'), html);
console.log(`已生成 tools/asset-preview.html（${files.length} 个 SVG）`);
