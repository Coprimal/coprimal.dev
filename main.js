// Coprimal: two signals, dev on x and ai on y. The pen sits at (sin(a·t + p), sin(b·t)).
// When a and b are coprime, one lap draws a closed figure no smaller pair repeats;
// when they share a factor g, the pen runs a smaller figure g times over.
const TAU = Math.PI * 2;
const NS = 'http://www.w3.org/2000/svg';
const still = matchMedia('(prefers-reduced-motion: reduce)');
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const C = 100, R = 84;
const at = (a, b, p, t) => [C + R * Math.sin(a * t + p), C - R * Math.sin(b * t)];
// Seen as a curve wound on a turning cylinder, the pen's depth is cos(a·t + p): side 1 keeps only
// the strands in front of the cylinder's axis, -1 only those behind it, 0 the whole curve.
const curve = (a, b, p, t0 = 0, t1 = TAU, side = 0) => {
  const n = Math.max(6, Math.ceil(((t1 - t0) / TAU) * 64 * Math.max(a, b)));
  const t = (i) => t0 + ((t1 - t0) * i) / n;
  const pt = (i) => at(a, b, p, t(i)).map((v) => v.toFixed(1)).join(' ');
  let d = '', on = false;
  for (let i = 1; i <= n; i++) {
    const keep = !side || side * Math.cos((a * (t(i - 1) + t(i))) / 2 + p) >= 0;
    if (keep && !on) d += 'M' + pt(i - 1);
    if (keep) d += 'L' + pt(i);
    on = keep;
  }
  return d;
};
// one period of sin(k·s + p) across a 200 × 28 strip
const wave = (k, p) => {
  const n = 40 * k;
  let d = '';
  for (let i = 0; i <= n; i++) d += (i ? 'L' : 'M') + ((200 * i) / n).toFixed(1) + ' ' + (14 - 10 * Math.sin((k * TAU * i) / n + p)).toFixed(1);
  return d;
};
// the phase halfway between two of the phases where the figure folds into an open arc
const calm = (a, b) => Math.PI / 2 - ((a - 1) * Math.PI) / (2 * b);

/* ---------- hero: the scope, dev × ai, one loop with a pause control ---------- */
const scope = document.querySelector('[data-scope]');
if (scope) {
  const PAIRS = [[3, 2], [5, 4], [2, 5], [4, 3], [1, 2], [5, 3]];
  // the phase sways around calm(a, b), at most a quarter of π/b either way, so the figure seems
  // to rock but never folds into an open arc (folds sit π/(2b) from calm). For 3:2 it starts at
  // -π/8, the frame the HTML already shows.
  const LAP = 5600, LAPS = 2, FADE = 450, TRAIL = 0.4, TURN = 1400;
  const sway = (a, b, ms) => calm(a, b) - (Math.PI / (4 * b)) * Math.cos((TAU * ms) / (LAP * LAPS));
  const q = (s) => scope.querySelector(s);
  // two layers of ink, the strands behind the logo and those in front of it; the pen hops between them
  const layers = [...scope.querySelectorAll('.scope__ink')].map((g) => ({ g, side: Number(g.dataset.side), line: g.querySelector('.scope__line'), trail: [...g.querySelectorAll('.scope__trail')] }));
  const pen = q('.scope__pen'), mx = q('.scope__mx'), my = q('.scope__my'), logo = q('.scope__logo');
  const sig = (name) => ({ path: q(`[data-wave="${name}"] .signal__wave`), head: q(`[data-wave="${name}"] .signal__head`), k: q(`[data-k="${name}"]`) });
  const dev = sig('dev'), ai = sig('ai');
  const readout = q('[data-gcd]'), btn = q('[data-scope-toggle]');
  let pair = 0, [a, b] = PAIRS[0], phase = sway(a, b, 0), clock = 0, last = 0, raf = 0;

  const label = () => { dev.k.textContent = a; ai.k.textContent = b; readout.textContent = `gcd(${a}, ${b}) = 1`; };
  const frame = (now) => {
    const dt = Math.min(50, now - (last || now));
    last = now;
    clock += dt;
    if (clock >= LAP * LAPS) { clock -= LAP * LAPS; pair = (pair + 1) % PAIRS.length; [a, b] = PAIRS[pair]; label(); }
    phase = sway(a, b, clock);
    const t = (clock / LAP) * TAU, span = TRAIL * TAU, s = t % TAU;
    const fade = Math.min(1, clock / FADE, (LAP * LAPS - clock) / FADE);
    for (const { g, side, line, trail } of layers) {
      g.style.opacity = fade;
      line.setAttribute('d', curve(a, b, phase, 0, TAU, side));
      trail.forEach((el, i) => el.setAttribute('d', curve(a, b, phase, t - span + (span * i) / trail.length, t - span + (span * (i + 1)) / trail.length, side)));
    }
    const host = layers.find((l) => l.side * Math.cos(a * t + phase) >= 0).g;
    if (pen.parentNode !== host) host.append(pen);
    // as each pair ends and fades away, the logo makes one full turn, eased in and out
    const u = Math.max(0, (clock - (LAP * LAPS - TURN)) / TURN);
    logo.setAttribute('transform', `rotate(${(360 * (u < 0.5 ? 4 * u ** 3 : 1 - (2 - 2 * u) ** 3 / 2)).toFixed(1)} 100 100)`);
    const [x, y] = at(a, b, phase, t);
    pen.setAttribute('cx', x.toFixed(1)); pen.setAttribute('cy', y.toFixed(1));
    mx.setAttribute('x1', x.toFixed(1)); mx.setAttribute('x2', x.toFixed(1));
    my.setAttribute('y1', y.toFixed(1)); my.setAttribute('y2', y.toFixed(1));
    dev.path.setAttribute('d', wave(a, phase));
    ai.path.setAttribute('d', wave(b, 0));
    const hx = ((200 * s) / TAU).toFixed(1);
    for (const { head } of [dev, ai]) { head.setAttribute('x1', hx); head.setAttribute('x2', hx); }
    raf = requestAnimationFrame(frame);
  };

  // once it has run, a paused scope keeps its last frame; reduced motion shows the whole figure
  const state = { seen: false, held: false, started: false };
  const sync = () => {
    const run = state.seen && !state.held && !still.matches && !document.hidden;
    state.started ||= run;
    scope.classList.toggle('is-live', state.started && !still.matches);
    btn.textContent = state.held ? 'Play' : 'Pause';
    btn.hidden = still.matches;
    if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  btn.addEventListener('click', () => { state.held = !state.held; sync(); });
  document.addEventListener('visibilitychange', sync);
  still.addEventListener('change', sync);
  new IntersectionObserver(([e]) => { state.seen = e.isIntersecting; sync(); }).observe(scope);
}

/* ---------- why coprime: three pens, one lap of t each, drawn over and over ---------- */
const trio = document.querySelector('[data-trio]');
const trioBtn = document.querySelector('[data-trio-toggle]');
if (trio && 'IntersectionObserver' in window) {
  // draw for DUR, hold the finished figures, fade them out, start again
  const DUR = 6000, HOLD = 2000, FADE = 500, CYCLE = DUR + HOLD + FADE;
  const figs = [...trio.querySelectorAll('[data-fig]')].map((el) => {
    const [a, b, p] = el.dataset.fig.split(',').map(Number);
    return { a, b, p, laps: gcd(a, b), line: el.querySelector('.mini__line'), pen: el.querySelector('.mini__pen'), lap: el.querySelector('[data-lap]') };
  });
  const paint = (k, fade) => figs.forEach((f) => {
    f.line.style.strokeDashoffset = 1 - k;
    f.line.style.opacity = fade;
    const [x, y] = at(f.a, f.b, f.p, k * TAU);
    f.pen.setAttribute('cx', x.toFixed(1)); f.pen.setAttribute('cy', y.toFixed(1));
    f.lap.textContent = `lap ${Math.min(f.laps, Math.floor(k * f.laps) + 1)} of ${f.laps}`;
  });
  const state = { seen: false, held: false };
  let clock = 0, last = 0, raf = 0;
  const frame = (now) => {
    clock = (clock + Math.min(50, now - (last || now))) % CYCLE;
    last = now;
    paint(Math.min(1, clock / DUR), clock > DUR + HOLD ? 1 - (clock - DUR - HOLD) / FADE : 1);
    trio.classList.toggle('is-done', clock >= DUR);
    raf = requestAnimationFrame(frame);
  };
  // reduced motion shows the finished figures and no control
  const sync = () => {
    const armed = !still.matches;
    trio.classList.toggle('is-armed', armed);
    trioBtn.hidden = !armed;
    trioBtn.textContent = state.held ? 'Play' : 'Pause';
    if (!armed) figs.forEach((f) => { f.line.style.strokeDashoffset = ''; f.line.style.opacity = ''; f.lap.textContent = `lap ${f.laps} of ${f.laps}`; });
    const run = armed && state.seen && !state.held && !document.hidden;
    if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  trioBtn.addEventListener('click', () => { state.held = !state.held; sync(); });
  document.addEventListener('visibilitychange', sync);
  still.addEventListener('change', () => { if (!still.matches) paint(Math.min(1, clock / DUR), 1); sync(); });
  new IntersectionObserver(([e]) => { state.seen = e.isIntersecting; sync(); }, { rootMargin: '0px 0px -25% 0px' }).observe(trio);
  paint(0, 1);
  sync();
}

/* ---------- tools: each tool's own figure, turning only while hovered or focused ---------- */
document.querySelectorAll('[data-orbit]').forEach((svg) => {
  const [a, b] = svg.dataset.orbit.split(':').map(Number);
  const path = document.createElementNS(NS, 'path');
  svg.append(path);
  let p = calm(a, b), raf = 0, last = 0;
  const draw = () => path.setAttribute('d', curve(a, b, p));
  const spin = (now) => { p += (now - (last || now)) * (TAU / 12000); last = now; draw(); raf = requestAnimationFrame(spin); };
  const on = () => { if (still.matches || raf) return; last = 0; raf = requestAnimationFrame(spin); };
  const off = () => { cancelAnimationFrame(raf); raf = 0; };
  const tile = svg.closest('.tool');
  tile.addEventListener('pointerenter', on);
  tile.addEventListener('pointerleave', off);
  tile.addEventListener('focusin', on);
  tile.addEventListener('focusout', off);
  draw();
});

// the hover glow on each tool card follows the pointer
document.querySelectorAll('.tool').forEach((tile) => {
  tile.addEventListener('pointermove', (e) => {
    const r = tile.getBoundingClientRect();
    tile.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`);
    tile.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`);
  });
});

/* ---------- hero: the intro video in a dialog; without JS the button is a plain YouTube link ---------- */
const watch = document.querySelector('[data-watch-dialog]');
const watchBtn = document.querySelector('[data-watch]');
if (watch?.showModal && watchBtn) {
  const frame = watch.querySelector('[data-watch-frame]');
  watchBtn.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // a modified click still opens YouTube
    e.preventDefault();
    watch.showModal();
    // a fresh player on each opening: removing it on close stops the sound and leaves no history entry
    const player = document.createElement('iframe');
    Object.assign(player, { title: watch.querySelector('#watch-title').textContent, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowFullscreen: true, referrerPolicy: 'strict-origin-when-cross-origin', src: watchBtn.dataset.watch });
    player.addEventListener('load', () => frame.classList.add('is-loaded'), { once: true });
    frame.append(player);
  });
  watch.addEventListener('close', () => { frame.querySelector('iframe')?.remove(); frame.classList.remove('is-loaded'); });
  // a click on the backdrop lands on the dialog itself, never on its children
  watch.addEventListener('click', (e) => { if (e.target === watch) watch.close(); });
}

/* ---------- round table: keep the email link in step with the form ---------- */
const composer = document.querySelector('[data-composer]');
if (composer) {
  const { category, title, body } = composer.elements;
  const mail = composer.querySelector('[data-mail]');
  const count = composer.querySelector('[data-count]');
  const update = () => {
    const kind = category.options[category.selectedIndex].text;
    count.textContent = `${title.value.length}/${title.maxLength}`;
    const subject = `[${kind}] ${title.value.trim() || 'An idea for Coprimal'}`;
    mail.href = `mailto:contact@coprimal.dev?subject=${encodeURIComponent(subject)}${body.value.trim() ? `&body=${encodeURIComponent(body.value)}` : ''}`;
  };
  composer.addEventListener('input', update);
  composer.addEventListener('change', update);
  update();
}

/* ---------- brand: copy a colour's hex ---------- */
document.querySelectorAll('[data-hex]').forEach((btn) => {
  const out = btn.querySelector('.swatch__state');
  let timer = 0;
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.hex); } catch { return; }
    out.textContent = 'Copied';
    btn.classList.add('is-copied');
    clearTimeout(timer);
    timer = setTimeout(() => { out.textContent = ''; btn.classList.remove('is-copied'); }, 1600);
  });
});
