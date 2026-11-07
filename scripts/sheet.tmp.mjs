import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
const ships = JSON.parse(fs.readFileSync('art/ships/ships.json','utf8')).hulls;
const keys = process.argv.slice(2);
const cells = [];
const C = 360;
for (const k of keys) {
  const h = ships[k]; const R = h.radius;
  const inner = fs.readFileSync(`art/ships/svg/${k}-base.svg`,'utf8').replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
  let tur = '';
  for (const m of h.mounts) {
    const name = m.type === 'ciws' ? 'ciws-m' : (k.startsWith('rookrivet') ? (m.size==='L'?'mining-turret-l':'mining-laser-'+(k==='rookrivet-drone'?'drone-s':m.size.toLowerCase())) : 'autocannon-' + m.size.toLowerCase());
    const t = fs.readFileSync(`art/ships/turrets/${name}.svg`,'utf8');
    const vb = t.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const body = t.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
    tur += `<svg x="${m.x+vb[0]}" y="${m.y+vb[1]}" width="${vb[2]}" height="${vb[3]}" viewBox="${vb.join(' ')}" overflow="visible"><g transform="rotate(${(m.facing*180/Math.PI).toFixed(1)})">${body}</g></svg>`;
  }
  cells.push(`<svg x="${cells.length%3*C}" y="${Math.floor(cells.length/3)*C}" width="${C}" height="${C}" viewBox="${-R} ${-R} ${2*R} ${2*R}"><rect x="${-R}" y="${-R}" width="${2*R}" height="${2*R}" fill="#0a0d14" stroke="#334" stroke-width="${R/100}"/><g>${inner}</g>${tur}</svg>`);
}
const rows = Math.ceil(cells.length/3);
const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${3*C}" height="${rows*C}">${cells.join('')}</svg>`;
fs.writeFileSync('/tmp/sheet-all.png', new Resvg(out, { font: { loadSystemFonts: false } }).render().asPng());
