'use strict';
// Effets visuels de Truck Tools: autoroute de nuit en perspective, projecteur curseur, inclinaison 3D, compteurs animes.
const FX = (() => {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- fond: phares et feux arriere sur une autoroute de nuit (canvas) ----------
  function highway(canvas) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, vx = 0, vy = 0;
    const lanes = [-1.9, -1.1, -0.35, 0.35, 1.1, 1.9];
    const cars = [];
    const stars = [];
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.width = Math.floor(innerWidth * dpr); h = canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
      vx = w * 0.62; vy = h * 0.42;
      stars.length = 0;
      for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * w, y: Math.random() * vy * 0.9, r: Math.random() * 1.2 * dpr + .2, a: Math.random() });
    }
    function spawn(initial) {
      const lane = lanes[(Math.random() * lanes.length) | 0];
      const oncoming = lane < 0;
      cars.push({ lane, z: initial ? Math.random() : 1, speed: (oncoming ? .22 : .1) * (0.7 + Math.random() * .6), oncoming, len: .015 + Math.random() * .02 });
    }
    function project(lane, z) { // z: 1 (loin) -> 0 (proche)
      const k = Math.pow(z, 1.8);
      const scale = 1 - k;
      return { x: vx + lane * w * 0.34 * scale, y: vy + (h - vy) * scale, s: scale };
    }
    resize(); addEventListener('resize', resize);
    for (let i = 0; i < 34; i++) spawn(true);
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now; ctx.clearRect(0, 0, w, h);
      // ciel etoile
      for (const s of stars) { ctx.globalAlpha = (.25 + .35 * Math.sin(now / 1400 + s.a * 9)) * .7; ctx.fillStyle = '#9fb7e8'; ctx.fillRect(s.x, s.y, s.r, s.r); }
      // lueur d'horizon
      const g = ctx.createRadialGradient(vx, vy, 0, vx, vy, w * .6);
      g.addColorStop(0, 'rgba(255,170,60,.16)'); g.addColorStop(.4, 'rgba(60,110,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // marquages au sol
      ctx.lineCap = 'round';
      for (const edge of [-2.25, -.75, .75, 2.25]) {
        const a = project(edge, .98), b = project(edge, .02);
        ctx.strokeStyle = 'rgba(120,160,255,.07)'; ctx.lineWidth = 1.2 * dpr; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // vehicules
      for (const c of cars) {
        c.z -= c.speed * dt * (c.oncoming ? 1.6 : 1);
        if (c.z < .015) { c.z = 1; c.lane = lanes[(Math.random() * lanes.length) | 0]; c.oncoming = c.lane < 0; c.speed = (c.oncoming ? .22 : .1) * (0.7 + Math.random() * .6); }
        const p = project(c.lane, c.z), q = project(c.lane, Math.max(.01, c.z - c.len));
        const col = c.oncoming ? '255,236,190' : '255,70,70';
        const alpha = Math.min(1, (1 - c.z) * 2.2) * (c.oncoming ? 1 : .9);
        const lw = Math.max(1.2, (1 - c.z) * 10 * dpr);
        const sx = lw * 1.4;
        for (const off of [-1, 1]) {
          ctx.strokeStyle = `rgba(${col},${alpha})`; ctx.lineWidth = lw * .7;
          ctx.shadowColor = `rgba(${col},.9)`; ctx.shadowBlur = 10 * dpr * (1 - c.z);
          ctx.beginPath(); ctx.moveTo(p.x + off * sx, p.y); ctx.lineTo(q.x + off * sx * .7, q.y); ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
      if (!reduce) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------- projecteur qui suit le curseur + inclinaison 3D ----------
  function pointer() {
    const spot = document.getElementById('spot');
    addEventListener('pointermove', e => {
      spot.style.transform = `translate(${e.clientX - 260}px,${e.clientY - 260}px)`;
      const t = e.target.closest && e.target.closest('[data-tilt],[data-glow]');
      document.querySelectorAll('.hot').forEach(n => { if (n !== t) { n.classList.remove('hot'); n.style.transform = ''; } });
      if (!t) return;
      const r = t.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      t.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); t.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (!reduce && t.hasAttribute('data-tilt')) { t.classList.add('hot'); t.style.transform = `perspective(900px) rotateX(${((.5 - py) * 7).toFixed(2)}deg) rotateY(${((px - .5) * 9).toFixed(2)}deg) translateZ(0)`; }
    }, { passive: true });
    addEventListener('pointerleave', () => document.querySelectorAll('[data-tilt].hot').forEach(n => { n.classList.remove('hot'); n.style.transform = ''; }));
    // ondes sur les boutons
    addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('button,.press');
      if (!b || reduce) return;
      const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2;
      const i = document.createElement('i'); i.className = 'ripple';
      i.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      b.append(i); setTimeout(() => i.remove(), 700);
    });
  }

  // ---------- compteurs ----------
  function countUp(el, to, ms = 900) {
    const target = Number(to);
    if (!Number.isFinite(target)) { el.textContent = String(to); return; }
    if (reduce) { el.textContent = fmt(target); return; }
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(Math.round(target * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ---------- sequence de demarrage ----------
  function boot() {
    const el = document.getElementById('boot');
    if (reduce) { el.remove(); return Promise.resolve(); }
    return new Promise(res => {
      el.classList.add('run');
      setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 700); }, 1500);
    });
  }

  function init() { highway(document.getElementById('bg')); pointer(); }
  return { init, countUp, boot, fmt, reduce };
})();
