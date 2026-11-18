const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// One reveal: tool cards settle in once as they enter
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

// Filter the tools by place
const filters = [...document.querySelectorAll('[data-filter]')];
filters.forEach((btn) => btn.addEventListener('click', () => {
  const f = btn.dataset.filter;
  filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  document.querySelectorAll('.tool, .tools__label').forEach((t) => { t.hidden = f !== 'all' && t.dataset.place !== f; });
  document.querySelector('.tools__grid').classList.toggle('is-filtered', f !== 'all');
}));

// Tabs: the ink slides under the selected tab, panels crossfade
document.querySelectorAll('[data-switch]').forEach((root) => {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const ink = root.querySelector('.tabs__ink');
  const moveInk = (tab) => {
    if (!ink) return;
    ink.style.setProperty('--ink-x', `${tab.offsetLeft}px`);
    ink.style.setProperty('--ink-s', String(tab.offsetWidth / 100));
  };
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.setAttribute('aria-hidden', String(!on));
      panel.inert = !on;
    });
    moveInk(tab);
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  const current = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
  select(current());
  addEventListener('resize', () => moveInk(current()));
  document.fonts && document.fonts.ready.then(() => moveInk(current()));
});

// Euclid's algorithm as squares: one square per unit of each quotient, with the spiral through them
const SVG = 'http://www.w3.org/2000/svg';
function tiling(A, B) {
  let x = 0, y = 0, w = A, h = B, d = 0;
  const dirs = ['left', 'top', 'right', 'bottom'], squares = [], arcs = [];
  while (w > 0 && h > 0) {
    const s = Math.min(w, h);
    let dir = dirs[d % 4];
    if (w >= h && (dir === 'top' || dir === 'bottom')) dir = 'left';
    if (h > w && (dir === 'left' || dir === 'right')) dir = 'top';
    let sx = x, sy = y;
    if (dir === 'left') { x += s; w -= s; }
    else if (dir === 'right') { sx = x + w - s; w -= s; }
    else if (dir === 'top') { y += s; h -= s; }
    else { sy = y + h - s; h -= s; }
    squares.push({ x: sx, y: sy, s });
    const start = { left: [sx, sy + s], top: [sx, sy], right: [sx + s, sy], bottom: [sx + s, sy + s] }[dir];
    const end = { left: [sx + s, sy], top: [sx + s, sy + s], right: [sx, sy + s], bottom: [sx, sy] }[dir];
    if (!arcs.length) arcs.push(`M${start[0]} ${start[1]}`);
    arcs.push(`A${s} ${s} 0 0 1 ${end[0]} ${end[1]}`);
    d++;
  }
  return { squares, path: arcs.join(' ') };
}

const form = document.querySelector('[data-euclid]');
const fig = document.querySelector('[data-euclid-tiling]');
if (form) {
  const steps = form.querySelector('.euclid__steps');
  const result = form.querySelector('.euclid__result');
  const draw = (a, b) => {
    if (!fig) return;
    const { squares, path } = tiling(a, b);
    const g = fig.querySelector('.tiling__squares');
    const caption = fig.parentElement.querySelector('figcaption');
    if (squares.length > 80) {
      g.replaceChildren(); fig.querySelector('.tiling__spiral').setAttribute('d', '');
      caption.textContent = `That pair needs ${squares.length} squares, too many to draw. The steps on the left still hold.`;
      return;
    }
    caption.textContent = 'Each square is one step of Euclid. When the last square is 1 by 1, the pair is coprime.';
    fig.setAttribute('viewBox', `-0.02 -0.02 ${a + 0.04} ${b + 0.04}`);
    fig.querySelector('title').textContent = `Euclid’s algorithm on ${a} and ${b}, drawn as squares`;
    g.replaceChildren(...squares.map((q, i) => {
      const r = document.createElementNS(SVG, 'rect');
      r.setAttribute('class', 'tiling__sq' + (i === squares.length - 1 && q.s === 1 ? ' tiling__sq--one' : ''));
      r.setAttribute('x', q.x); r.setAttribute('y', q.y); r.setAttribute('width', q.s); r.setAttribute('height', q.s);
      r.style.setProperty('--i', i);
      return r;
    }));
    fig.querySelector('.tiling__spiral').setAttribute('d', path);
    fig.style.setProperty('--step', `${Math.max(12, Math.min(60, 700 / squares.length))}ms`);
    fig.classList.remove('is-drawing');
    if (!reduced) { void fig.getBoundingClientRect(); fig.classList.add('is-drawing'); }
  };
  const run = () => {
    const inputs = [form.elements.a, form.elements.b];
    const bad = inputs.find((el) => !el.checkValidity() || !Number.isInteger(Number(el.value)));
    inputs.forEach((el) => el.toggleAttribute('aria-invalid', el === bad));
    if (bad) { result.textContent = 'Use whole numbers from 1 to 99999.'; bad.focus(); return; }
    const a0 = Number(form.elements.a.value), b0 = Number(form.elements.b.value);
    let a = Math.max(a0, b0), b = Math.min(a0, b0);
    steps.replaceChildren();
    while (b > 0) {
      const li = document.createElement('li');
      li.textContent = `${a} = ${Math.floor(a / b)} × ${b} + ${a % b}`;
      steps.append(li);
      [a, b] = [b, a % b];
    }
    const code = document.createElement('code');
    code.textContent = `gcd(${a0}, ${b0}) = ${a}`;
    result.replaceChildren(code, a === 1 ? ', coprime.' : `, not coprime: both divide by ${a}.`);
    draw(Math.max(a0, b0), Math.min(a0, b0));
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
}

// Hero: hovering a square names the step of Euclid it stands for
const heroTiling = document.querySelector('[data-tiling]');
const readout = document.querySelector('[data-readout]');
if (heroTiling && readout) {
  const rest = readout.textContent;
  heroTiling.querySelectorAll('.tiling__sq').forEach((sq) => {
    sq.addEventListener('pointerenter', () => { readout.textContent = sq.dataset.step; });
    sq.addEventListener('pointerleave', () => { readout.textContent = rest; });
  });
}

// Brand: a swatch copies its hex; its own label is the feedback
document.querySelectorAll('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
  const label = btn.querySelector('.swatch__copy');
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    label.textContent = `Copied ${btn.dataset.copy}`;
    btn.classList.add('is-copied');
  } catch { label.textContent = 'Copy blocked by the browser'; }
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { label.textContent = 'Copy'; btn.classList.remove('is-copied'); }, 2500);
}));

// Command palette: ⌘K or / opens it, arrows move, Enter opens, Esc closes
const palette = document.querySelector('.palette');
if (palette && palette.showModal) {
  const input = palette.querySelector('.palette__input');
  const list = palette.querySelector('.palette__list');
  const items = [
    ...[...document.querySelectorAll('.tool a')].map((a) => ({ name: a.querySelector('h3').textContent, note: a.querySelector('p').textContent, href: a.href, icon: a.querySelector('img').getAttribute('src') })),
    ...[...document.querySelectorAll('main section[id] h2')].map((h) => ({ name: h.textContent.replace(/^\d+\.\s*/, ''), note: 'Section', href: `#${h.closest('section').id}` })),
  ];
  let shown = [], active = 0;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = items.filter((it) => !q || `${it.name} ${it.note}`.toLowerCase().includes(q));
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.replaceChildren(...shown.map((it, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.id = `palette-opt-${i}`;
      const a = document.createElement('a');
      a.href = it.href; a.tabIndex = -1;
      if (it.icon) { const img = document.createElement('img'); img.src = it.icon; img.alt = ''; img.width = 28; img.height = 28; a.append(img); } else a.append(document.createElement('span'));
      const name = document.createElement('span'); name.textContent = it.name;
      const note = document.createElement('span'); note.textContent = it.note;
      a.append(name, note);
      a.addEventListener('click', () => palette.close());
      li.append(a);
      return li;
    }));
    if (!shown.length) { const li = document.createElement('li'); li.className = 'palette__empty'; li.textContent = 'Nothing by that name. Try a tool, like Histq.'; list.append(li); }
    input.setAttribute('aria-activedescendant', shown.length ? `palette-opt-${active}` : '');
  };
  const open = () => { if (palette.open) return; input.value = ''; active = 0; render(); palette.showModal(); input.focus(); };
  document.querySelectorAll('[data-palette-open]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); open(); }));
  addEventListener('keydown', (e) => {
    const typing = /^(input|textarea|select)$/i.test(document.activeElement.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? palette.close() : open(); }
    else if (e.key === '/' && !typing && !palette.open) { e.preventDefault(); open(); }
  });
  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!shown.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
      render();
      list.children[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      palette.close();
    } else if (e.key === 'Enter' && shown[active]) {
      e.preventDefault();
      palette.close();
      location.href = shown[active].href;
    }
  });
  palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });
}
