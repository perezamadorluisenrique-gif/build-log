// Inline SVG charts, no libraries. Colours come from CSS variables so light and dark mode both work.
// Text lives in the page (legend, table), the SVG itself carries geometry and hover tips.
import { esc, num } from './html.mjs';

const W = 360;
const H = 220;
const M = { l: 38, r: 10, t: 12, b: 26 };
const IW = W - M.l - M.r;
const IH = H - M.t - M.b;

export function niceMax(v) {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * p;
}
const compact = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : String(n));
const shortWeek = (w) => `W${w.slice(-2)}`;

function frame(max, body, xLabels) {
  const ticks = [0, max / 2, max].map((v) => ({ v, y: M.t + IH - (v / max) * IH }));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
${ticks.map((t) => `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${t.y.toFixed(1)}" y2="${t.y.toFixed(1)}"/><text class="ax" x="${M.l - 6}" y="${(t.y + 3.5).toFixed(1)}" text-anchor="end">${compact(Math.round(t.v * 10) / 10)}</text>`).join('\n')}
<line class="base" x1="${M.l}" x2="${W - M.r}" y1="${M.t + IH}" y2="${M.t + IH}"/>
${body}
${xLabels.map((l) => `<text class="ax" x="${l.x.toFixed(1)}" y="${H - 8}" text-anchor="${l.anchor || 'middle'}">${esc(l.text)}</text>`).join('\n')}
</svg>`;
}

function labelIdx(n) {
  if (n <= 1) return [0];
  const k = Math.min(5, n);
  return [...new Set(Array.from({ length: k }, (_, i) => Math.round((i * (n - 1)) / (k - 1))))];
}

/**
 * series: [{ cls, values: number|null [] }] one value per week. tips: per-week {en, es}.
 * One tooltip band per week lists every series.
 */
export function lineChart({ weeks, series, tips }) {
  const n = weeks.length;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values.filter((v) => v !== null))));
  const x = (i) => (n === 1 ? M.l + IW / 2 : M.l + (i * IW) / (n - 1));
  const y = (v) => M.t + IH - (v / max) * IH;
  let body = '';
  for (const s of series) {
    const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)]));
    const segs = [];
    let cur = [];
    pts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } });
    if (cur.length) segs.push(cur);
    for (const seg of segs) if (seg.length > 1) body += `<polyline class="line ${s.cls}" points="${seg.map((p) => p.map((c) => c.toFixed(1)).join(',')).join(' ')}"/>`;
    body += pts.map((p) => (p ? `<circle class="dot ${s.cls}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${n > 14 ? 2.5 : 4}"/>` : '')).join('');
  }
  const bandW = n === 1 ? IW : IW / (n - 1);
  body += weeks.map((w, i) => `<rect class="hit" tabindex="0" x="${(x(i) - bandW / 2).toFixed(1)}" y="${M.t}" width="${bandW.toFixed(1)}" height="${IH}" data-tip-en="${esc(tips[i].en)}" data-tip-es="${esc(tips[i].es)}"/>`).join('');
  const labels = labelIdx(n).map((i, k, a) => ({ x: x(i), text: shortWeek(weeks[i]), anchor: k === 0 && a.length > 1 ? 'start' : k === a.length - 1 && a.length > 1 ? 'end' : 'middle' }));
  return frame(max, body, labels);
}

/** items: [{ week, value|null, tip:{en,es}, cls }] */
export function barChart({ items }) {
  const n = items.length;
  const max = niceMax(Math.max(1, ...items.map((i) => i.value || 0)));
  const step = IW / n;
  const bw = Math.max(2, step - 2);
  let body = '';
  items.forEach((it, i) => {
    const bx = M.l + i * step + (step - bw) / 2;
    if (it.value === null) {
      body += `<rect class="hit" tabindex="0" x="${bx.toFixed(1)}" y="${M.t}" width="${bw.toFixed(1)}" height="${IH}" data-tip-en="${esc(it.tip.en)}" data-tip-es="${esc(it.tip.es)}"/>`;
      return;
    }
    const h = (it.value / max) * IH;
    const by = M.t + IH - h;
    if (it.value > 0) {
      const r = Math.min(3, bw / 2, h);
      body += `<path class="bar ${it.cls || ''}" d="M${bx.toFixed(1)},${(by + h).toFixed(1)}V${(by + r).toFixed(1)}Q${bx.toFixed(1)},${by.toFixed(1)} ${(bx + r).toFixed(1)},${by.toFixed(1)}H${(bx + bw - r).toFixed(1)}Q${(bx + bw).toFixed(1)},${by.toFixed(1)} ${(bx + bw).toFixed(1)},${(by + r).toFixed(1)}V${(by + h).toFixed(1)}Z"/>`;
    }
    body += `<rect class="hit" tabindex="0" x="${bx.toFixed(1)}" y="${M.t}" width="${bw.toFixed(1)}" height="${IH}" data-tip-en="${esc(it.tip.en)}" data-tip-es="${esc(it.tip.es)}"/>`;
  });
  const labels = labelIdx(n).map((i, k, a) => ({ x: M.l + i * step + step / 2, text: shortWeek(items[i].week), anchor: k === 0 && a.length > 1 ? 'start' : k === a.length - 1 && a.length > 1 ? 'end' : 'middle' }));
  return frame(max, body, labels);
}

export { num };
