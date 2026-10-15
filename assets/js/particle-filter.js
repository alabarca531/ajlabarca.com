// Hero background: a bootstrap particle filter tracking a target from noisy,
// cluttered measurements with missed detections. The target wanders on its own,
// or chases the pointer while it moves over the hero.

const canvas = document.querySelector(".pf-canvas");
const button = document.querySelector(".pf-caption");
const hero = document.querySelector(".hero");

if (canvas) {
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const N = 350;          // particles
  const SIGMA_Z = 22;     // measurement noise (px)
  const SIGMA_A = 220;    // process noise on acceleration (px/s^2)
  const P_DETECT = 0.85;  // probability the target is detected in a scan
  const CLUTTER = 1.2;    // mean false alarms per scan
  const SCAN_DT = 0.12;   // seconds between measurement scans

  let W = 0, H = 0, dpr = 1;
  let t = 0, sinceScan = 0, last = 0;
  let running = false, visible = true, paused = false;
  let colors = {};
  const truth = { x: 0, y: 0, vx: 0, vy: 0 };
  const pointer = { x: 0, y: 0, last: -Infinity };  // last = time of last move (s, filter clock)
  const K = 30, C = 2 * Math.sqrt(30) * 0.9;        // spring pulling the target toward its goal
  const px = new Float32Array(N), py = new Float32Array(N);
  const pvx = new Float32Array(N), pvy = new Float32Array(N);
  const w = new Float32Array(N).fill(1 / N);
  let scans = [];          // { pts: [{x, y}], age }
  let estTrail = [], truthTrail = [];

  const randn = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    colors = {
      accent: s.getPropertyValue("--accent").trim() || "#b9410f",
      muted: s.getPropertyValue("--muted").trim() || "#646d78",
      ink: s.getPropertyValue("--ink").trim() || "#15191f",
    };
  }

  // Smooth, wandering path across the hero.
  function truthAt(time) {
    const cx = W * 0.5, cy = H * 0.5;
    const ax = W * 0.42, ay = H * 0.36;
    return {
      x: cx + ax * Math.sin(0.23 * time) * Math.cos(0.071 * time + 1),
      y: cy + ay * Math.sin(0.37 * time + 0.6),
    };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init() {
    const p = truthAt(t);
    truth.x = p.x; truth.y = p.y; truth.vx = truth.vy = 0;
    for (let i = 0; i < N; i++) {
      px[i] = p.x + randn() * W * 0.15; py[i] = p.y + randn() * H * 0.2;  // broad prior around the start
      pvx[i] = randn() * 60; pvy[i] = randn() * 60;
      w[i] = 1 / N;
    }
    scans = []; estTrail = []; truthTrail = [];
  }

  function predict(dt) {
    for (let i = 0; i < N; i++) {
      const ax = randn() * SIGMA_A, ay = randn() * SIGMA_A;
      px[i] += pvx[i] * dt + 0.5 * ax * dt * dt;
      py[i] += pvy[i] * dt + 0.5 * ay * dt * dt;
      pvx[i] = (pvx[i] + ax * dt) * 0.995;
      pvy[i] = (pvy[i] + ay * dt) * 0.995;
    }
  }

  function scan() {
    const pts = [];
    if (Math.random() < P_DETECT) pts.push({ x: truth.x + randn() * SIGMA_Z, y: truth.y + randn() * SIGMA_Z });
    // Poisson-distributed clutter, uniform over the canvas
    let k = 0, L = Math.exp(-CLUTTER), p = Math.random();
    while (p > L) { k++; p *= Math.random(); }
    for (let j = 0; j < k; j++) pts.push({ x: Math.random() * W, y: Math.random() * H });
    scans.push({ pts, age: 0 });
    if (scans.length > 14) scans.shift();
    update(pts);
  }

  // Likelihood under "target detected as one of pts, or missed", plus uniform clutter.
  function update(pts) {
    const inv2s2 = 1 / (2 * SIGMA_Z * SIGMA_Z);
    const norm = 1 / (2 * Math.PI * SIGMA_Z * SIGMA_Z);
    const clutterDensity = CLUTTER / (W * H);
    let sum = 0;
    for (let i = 0; i < N; i++) {
      let lik = 1 - P_DETECT;
      for (const z of pts) {
        const dx = px[i] - z.x, dy = py[i] - z.y;
        lik += (P_DETECT * norm * Math.exp(-(dx * dx + dy * dy) * inv2s2)) / clutterDensity;
      }
      w[i] *= lik;
      sum += w[i];
    }
    if (!(sum > 0)) { w.fill(1 / N); return; }
    let ess = 0;
    for (let i = 0; i < N; i++) { w[i] /= sum; ess += w[i] * w[i]; }
    if (1 / ess < N / 2) resample();
  }

  function resample() {  // systematic
    const nx = new Float32Array(N), ny = new Float32Array(N), nvx = new Float32Array(N), nvy = new Float32Array(N);
    let c = w[0], j = 0;
    const u0 = Math.random() / N;
    for (let i = 0; i < N; i++) {
      const u = u0 + i / N;
      while (u > c && j < N - 1) c += w[++j];
      nx[i] = px[j] + randn() * 2; ny[i] = py[j] + randn() * 2;
      nvx[i] = pvx[j]; nvy[i] = pvy[j];
    }
    px.set(nx); py.set(ny); pvx.set(nvx); pvy.set(nvy);
    w.fill(1 / N);
  }

  function estimate() {
    let x = 0, y = 0;
    for (let i = 0; i < N; i++) { x += w[i] * px[i]; y += w[i] * py[i]; }
    return { x, y };
  }

  function step(dt) {
    t += dt;
    const g = t - pointer.last < 2.5 ? pointer : truthAt(t);
    truth.vx += (K * (g.x - truth.x) - C * truth.vx) * dt;
    truth.vy += (K * (g.y - truth.y) - C * truth.vy) * dt;
    truth.x += truth.vx * dt; truth.y += truth.vy * dt;
    predict(dt);
    sinceScan += dt;
    if (sinceScan >= SCAN_DT) { sinceScan = 0; scan(); scans.forEach(s => s.age++); }
    const e = estimate();
    estTrail.push(e); truthTrail.push({ x: truth.x, y: truth.y });
    if (estTrail.length > 160) estTrail.shift();
    if (truthTrail.length > 160) truthTrail.shift();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Truth: faint dotted trail
    ctx.setLineDash([2, 5]);
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    trail(truthTrail);
    ctx.setLineDash([]);

    // Measurements: small crosses that fade with age
    ctx.strokeStyle = colors.ink;
    for (const s of scans) {
      ctx.globalAlpha = Math.max(0, 0.28 - s.age * 0.02);
      for (const z of s.pts) {
        ctx.beginPath();
        ctx.moveTo(z.x - 3, z.y - 3); ctx.lineTo(z.x + 3, z.y + 3);
        ctx.moveTo(z.x + 3, z.y - 3); ctx.lineTo(z.x - 3, z.y + 3);
        ctx.stroke();
      }
    }

    // Particles
    ctx.fillStyle = colors.accent;
    let wmax = 0;
    for (let i = 0; i < N; i++) if (w[i] > wmax) wmax = w[i];
    for (let i = 0; i < N; i++) {
      ctx.globalAlpha = 0.12 + 0.38 * (w[i] / (wmax || 1));
      ctx.fillRect(px[i] - 1, py[i] - 1, 2, 2);
    }

    // Estimate trail and ring
    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    trail(estTrail);
    const e = estTrail[estTrail.length - 1];
    if (e) {
      ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(e.x, e.y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(e.x, e.y, 2, 0, Math.PI * 2); ctx.fillStyle = colors.accent; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function trail(pts) {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);  // rAF time can trail performance.now()
    last = now;
    if (dt > 0) { step(dt); draw(); }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || paused || !visible || reduceMotion.matches || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  function staticFrame() {  // for reduced motion: settle the filter, then draw once
    init();
    for (let i = 0; i < 400; i++) step(1 / 30);
    draw();
  }

  readColors();
  resize();
  init();
  if (reduceMotion.matches) staticFrame(); else start();

  new ResizeObserver(() => { const oldW = W; resize(); if (Math.abs(W - oldW) > 40) init(); if (!running) draw(); }).observe(canvas);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  reduceMotion.addEventListener("change", () => (reduceMotion.matches ? (stop(), staticFrame()) : start()));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); if (!running) draw(); });

  if (hero) {
    hero.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.last = t;
    });
    hero.addEventListener("pointerleave", () => { pointer.last = -Infinity; });
  }

  if (button) {
    button.hidden = false;
    if (!reduceMotion.matches) button.querySelector(".pf-label").textContent =
      `Live: a particle filter tracking a target through noisy measurements. ${window.matchMedia("(hover: hover)").matches ? "Move your mouse" : "Drag your finger"} to steer it.`;
    if (reduceMotion.matches) button.querySelector(".pf-label").textContent = "A particle filter tracking a target through noisy measurements";
    button.addEventListener("click", () => {
      paused = !paused;
      button.setAttribute("aria-pressed", String(paused));
      button.title = paused ? "Resume animation" : "Pause animation";
      paused ? stop() : start();
    });
    button.title = "Pause animation";
  }
}
