// Coprimal: star polygons {n/k}. Stepping k at a time around n points draws one
// unbroken line through all of them exactly when gcd(n, k) = 1.
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const still = matchMedia('(prefers-reduced-motion: reduce)');
const point = (i, n, r) => { const t = ((-90 + (360 * i) / n) * Math.PI) / 180; return [r * Math.cos(t), r * Math.sin(t)]; };
const fmt = ([x, y]) => `${x.toFixed(4)} ${y.toFixed(4)}`;
// the gcd(n, k) separate loops of n / gcd points each, as lists of point indices
const loops = (n, k) => {
  const g = gcd(n, k);
  return Array.from({ length: g }, (_, s) => Array.from({ length: n / g + 1 }, (_, j) => (s + j * k) % n));
};
const pathOf = (idx, n, r) => idx.map((i, j) => (j ? 'L' : 'M') + fmt(point(i, n, r))).join('');

/* ---------- hero: the tools on a circle, one line through all of them ---------- */
const ring = document.querySelector('[data-ring]');
if (ring) {
  const R = 0.92, SEG = 170, HOLD = 1800, FADE = 450;
  const items = [...ring.querySelectorAll('.ring__tools li')];
  const n = items.length;
  const path = ring.querySelector('.ring__path');
  const pen = ring.querySelector('.ring__pen');
  const svg = ring.querySelector('svg');
  const kOut = ring.querySelector('[data-ring-k]');
  const readout = ring.querySelector('[data-ring-readout]');
  const btn = ring.querySelector('[data-loop-toggle]');
  items.forEach((li, i) => li.style.setProperty('--a', `${-90 + (360 * i) / n}deg`));

  const steps = [];
  for (let k = 1; k <= Math.floor(n / 2); k++) if (gcd(n, k) === 1) steps.push(k);
  const figure = (k) => {
    const order = loops(n, k)[0];
    kOut.textContent = k;
    readout.textContent = `gcd(${n}, ${k}) = 1`;
    svg.setAttribute('aria-label', `Diagram: the ${n} tools as points on a circle, joined by one unbroken line that steps ${k} at a time. ${n} and ${k} are coprime, so the line reaches every tool before it closes.`);
    path.setAttribute('d', pathOf(order, n, R));
    return order;
  };

  const DRAW = n * SEG, CYCLE = DRAW + HOLD + FADE;
  let at = Math.max(0, steps.indexOf(4));
  let order = figure(steps[at]);
  let clock = DRAW; // start in the hold of the figure the HTML already shows
  let lit = n;
  const s = { seen: false, hover: false, focus: false, held: false };
  let last = 0, raf = 0;

  const light = (count) => {
    if (count === lit) return;
    lit = count;
    const on = new Set(order.slice(0, count));
    items.forEach((li, i) => li.classList.toggle('is-dim', !on.has(i)));
  };

  const frame = (now) => {
    clock += Math.min(50, now - (last || now));
    last = now;
    if (clock >= CYCLE) { clock -= CYCLE; at = (at + 1) % steps.length; order = figure(steps[at]); lit = -1; }
    if (clock < DRAW) {
      const p = clock / DRAW, seg = Math.min(n - 1, Math.floor(p * n)), f = p * n - seg;
      const [ax, ay] = point(order[seg], n, R), [bx, by] = point(order[seg + 1], n, R);
      path.style.strokeDashoffset = 1 - p;
      path.style.opacity = 1;
      pen.setAttribute('cx', ax + (bx - ax) * f);
      pen.setAttribute('cy', ay + (by - ay) * f);
      pen.style.opacity = 1;
      light(seg + 1);
    } else {
      path.style.strokeDashoffset = 0;
      pen.style.opacity = 0;
      light(n);
      path.style.opacity = clock < DRAW + HOLD ? 1 : 1 - (clock - DRAW - HOLD) / FADE;
    }
    raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    const run = s.seen && !s.hover && !s.focus && !s.held && !still.matches && !document.hidden;
    ring.classList.toggle('is-running', run);
    btn.textContent = s.held ? 'Play' : 'Pause';
    if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  btn.addEventListener('click', () => { s.held = !s.held; sync(); });
  ring.addEventListener('pointerenter', () => { s.hover = true; sync(); });
  ring.addEventListener('pointerleave', () => { s.hover = false; sync(); });
  // keyboard focus on a tool holds the loop; a click on the toggle must not
  ring.addEventListener('focusin', (e) => { s.focus = e.target !== btn && e.target.matches(':focus-visible'); sync(); });
  ring.addEventListener('focusout', () => { s.focus = false; sync(); });
  document.addEventListener('visibilitychange', sync);
  still.addEventListener('change', sync);
  new IntersectionObserver(([e]) => { s.seen = e.isIntersecting; sync(); }).observe(ring);
}

/* ---------- why coprime: 12 points in steps of 5 and of 4, drawn once ---------- */
const pair = document.querySelector('[data-pair]');
if (pair && !still.matches && 'IntersectionObserver' in window) {
  const R = 0.9, SEG = 150;
  const figs = [...pair.querySelectorAll('[data-n]')].map((fig) => {
    const n = +fig.dataset.n, k = +fig.dataset.k;
    const svg = fig.querySelector('svg');
    const dots = [...fig.querySelectorAll('.star__dots circle')];
    const paths = loops(n, k).map((idx) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('class', 'star__path');
      p.setAttribute('pathLength', '1');
      p.setAttribute('d', pathOf(idx, n, R));
      return { p, idx };
    });
    svg.querySelectorAll('.star__path').forEach((p) => p.remove());
    svg.prepend(...paths.map((x) => x.p));
    return { n, dots, paths };
  });
  const paint = (t) => figs.forEach(({ n, dots, paths }) => {
    const per = (n / paths.length) * SEG; // every figure takes n segments in all
    const on = new Set();
    paths.forEach(({ p, idx }, i) => {
      const q = Math.min(1, Math.max(0, (t - i * per) / per));
      p.style.strokeDashoffset = 1 - q;
      if (q > 0 || i === 0) idx.slice(0, Math.floor(q * (idx.length - 1)) + 1).forEach((d) => on.add(d));
    });
    dots.forEach((d, i) => d.classList.toggle('is-on', on.has(i)));
  });
  const total = 12 * SEG;
  pair.classList.add('is-armed');
  paint(0);
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    let start = 0;
    const tick = (now) => { start ||= now; const t = now - start; paint(t); if (t < total) requestAnimationFrame(tick); else paint(total); };
    requestAnimationFrame(tick);
  }, { rootMargin: '0px 0px -20% 0px' });
  io.observe(pair);
}
