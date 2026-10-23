const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Shared pointer position (viewport coordinates)
const pointer = { x: -9999, y: -9999, active: false };
window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.active = true;
}, { passive: true });
document.addEventListener("pointerleave", () => { pointer.active = false; });

// ---------------------------------------------------------------------------
// Bar, progress line, cursor glow
// ---------------------------------------------------------------------------
const bar = document.getElementById("bar");
const progress = document.getElementById("progress");
let scrollDelta = 0;
let lastScroll = window.scrollY;

function onScroll() {
  const y = window.scrollY;
  scrollDelta += y - lastScroll;
  lastScroll = y;
  if (bar) bar.classList.toggle("is-scrolled", y > 8);
  if (progress) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = "scaleX(" + (max > 0 ? clamp(y / max, 0, 1) : 0) + ")";
  }
  stackCards();
}
window.addEventListener("scroll", onScroll, { passive: true });

const glow = document.getElementById("cursor-glow");
if (glow && finePointer && !reduceMotion) {
  glow.classList.add("is-on");
}

// ---------------------------------------------------------------------------
// Hero headline: every letter is its own span. Its weight swells (and it picks
// up colour) near the pointer, and a slow wave runs through the line by itself.
// ---------------------------------------------------------------------------
const heroTitle = document.getElementById("hero-title");
const letters = [];
const GLYPHS = "▮▯░▒▓#%&*+<>/=01";
const W_MIN = 520;
const W_MAX = 820;

if (heroTitle) {
  const text = heroTitle.textContent.trim();
  heroTitle.setAttribute("aria-label", text);
  heroTitle.textContent = "";
  text.split(" ").forEach((word, wi, words) => {
    const w = document.createElement("span");
    w.className = "word";
    w.setAttribute("aria-hidden", "true");
    for (const ch of word) {
      const el = document.createElement("span");
      el.className = "ch";
      el.textContent = ch;
      w.appendChild(el);
      letters.push({ el, ch, cx: 0, cy: 0, w: W_MIN });
    }
    heroTitle.appendChild(w);
    if (wi < words.length - 1) heroTitle.appendChild(document.createTextNode(" "));
  });
}

// Lock each letter's width to its widest weight, so the line never re-wraps
// while the weights change.
function lockWidths() {
  const shown = letters.map((l) => l.el.textContent);
  letters.forEach((l) => {
    l.el.style.width = "";
    l.el.textContent = l.ch; // measure the real character, not a flicker glyph
    l.el.style.fontVariationSettings = '"wght" ' + W_MAX;
  });
  const widths = letters.map((l) => l.el.getBoundingClientRect().width);
  letters.forEach((l, i) => {
    l.el.style.width = widths[i] + "px";
    l.el.textContent = shown[i];
    l.el.style.fontVariationSettings = '"wght" ' + Math.round(l.w);
  });
}
if (letters.length) {
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => { lockWidths(); introStart = performance.now() + 250; });
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(lockWidths, 150);
  });
}

let heroVisible = true;
if (heroTitle && "IntersectionObserver" in window) {
  new IntersectionObserver((entries) => { heroVisible = entries[0].isIntersecting; }, { threshold: 0 }).observe(heroTitle);
}

let introStart = performance.now() + 350;
const INTRO_STEP = 34;   // ms between letters
const INTRO_SCRAMBLE = 520; // ms each letter flickers before settling

function animateLetters(now) {
  if (!letters.length || !heroVisible) return;
  const t = now / 1000;

  // read all positions first, then write
  const rects = letters.map((l) => l.el.getBoundingClientRect());
  letters.forEach((l, i) => {
    const r = rects[i];
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const wave = 0.5 + 0.5 * Math.sin(t * 1.3 - i * 0.32);
    let near = 0;
    if (pointer.active && finePointer) {
      near = clamp(1 - Math.hypot(pointer.x - cx, (pointer.y - cy) * 1.4) / 190, 0, 1);
      near = near * near * (3 - 2 * near);
    }
    const target = W_MIN + 130 * wave + (W_MAX - W_MIN) * 0.55 * near;
    l.w += (clamp(target, W_MIN, W_MAX) - l.w) * 0.2;

    const hue = (215 + i * 6 + t * 24) % 360;
    const heat = Math.max(near, wave * 0.35);
    l.el.style.fontVariationSettings = '"wght" ' + Math.round(l.w);
    l.el.style.color = "hsl(" + hue.toFixed(0) + " " + (25 + heat * 70).toFixed(0) + "% " + (93 - heat * 14).toFixed(0) + "%)";
    l.el.style.textShadow = near > 0.05
      ? "0 0 " + (near * 26).toFixed(0) + "px hsl(" + hue.toFixed(0) + " 100% 62% / " + (near * 0.85).toFixed(2) + ")"
      : "none";

    // intro: each letter flickers through glyphs, then settles
    const age = now - introStart - i * INTRO_STEP;
    if (age < 0) {
      l.el.textContent = GLYPHS[(i * 7) % GLYPHS.length];
      l.el.style.opacity = "0";
    } else if (age < INTRO_SCRAMBLE) {
      l.el.style.opacity = "1";
      if (Math.floor(age / 55) !== l.lastTick) {
        l.lastTick = Math.floor(age / 55);
        l.el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    } else if (!l.done) {
      l.done = true;
      l.el.textContent = l.ch;
      l.el.style.opacity = "1";
    }
  });
}

if (reduceMotion && letters.length) {
  // keep the headline plain and readable
  letters.forEach((l) => { l.el.style.opacity = "1"; l.el.style.fontVariationSettings = '"wght" 650'; });
}

// ---------------------------------------------------------------------------
// Particle field (fixed canvas behind the page)
// ---------------------------------------------------------------------------
const canvas = document.getElementById("field");
const ctx = canvas ? canvas.getContext("2d") : null;
const HUES = [222, 196, 160];
let W = 0, H = 0, DPR = 1;
let particles = [];
let sparks = [];

function makeParticle() {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    r: 0.8 + Math.random() * 1.8,
    hue: HUES[Math.floor(Math.random() * HUES.length)],
  };
}

function resizeField() {
  if (!canvas) return;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const count = Math.round(clamp((W * H) / 15000, 38, 105));
  while (particles.length < count) particles.push(makeParticle());
  particles.length = count;
  if (reduceMotion) drawField(true);
}

function drawField(still) {
  ctx.clearRect(0, 0, W, H);
  const LINK = W < 700 ? 100 : 135;
  const REACH = 200;

  // scrolling shoves the particles, so the field feels attached to the page
  const push = clamp(scrollDelta * 0.05, -3, 3);
  scrollDelta *= 0.8;

  for (const p of particles) {
    if (!still) {
      p.x += p.vx;
      p.y += p.vy + push * (0.4 + p.r * 0.3);
      if (pointer.active && finePointer) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 150 && d > 0.1) {
          const f = (1 - d / 150) * 1.6;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
    }
  }

  ctx.lineWidth = 0.7;
  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < LINK * LINK) {
        const alpha = (1 - Math.sqrt(d2) / LINK) * 0.38;
        ctx.strokeStyle = "hsla(" + ((a.hue + b.hue) / 2) + ",100%,68%," + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    if (pointer.active && finePointer && !still) {
      const d = Math.hypot(a.x - pointer.x, a.y - pointer.y);
      if (d < REACH) {
        ctx.strokeStyle = "hsla(188,100%,70%," + ((1 - d / REACH) * 0.6).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }
  }

  for (const p of particles) {
    ctx.fillStyle = "hsla(" + p.hue + ",100%,72%,0.14)";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "hsla(" + p.hue + ",100%,78%,0.95)";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
  }

  // click bursts
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx; s.y += s.vy; s.vx *= 0.96; s.vy *= 0.96; s.life -= 0.022;
    if (s.life <= 0) { sparks.splice(i, 1); continue; }
    ctx.fillStyle = "hsla(" + s.hue + ",100%,70%," + s.life.toFixed(2) + ")";
    ctx.beginPath(); ctx.arc(s.x, s.y, 1.6 + s.life * 1.6, 0, 6.2832); ctx.fill();
  }
}

if (canvas && ctx) {
  resizeField();
  window.addEventListener("resize", resizeField);
  if (finePointer && !reduceMotion) {
    window.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button, input, textarea")) return;
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
        const sp = 2 + Math.random() * 3.5;
        sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, hue: HUES[i % 3] });
      }
    });
  }
}

// ---------------------------------------------------------------------------
// One animation loop for the headline, the field and the cursor glow
// ---------------------------------------------------------------------------
let glowX = 0, glowY = 0;
function loop(now) {
  if (!document.hidden) {
    if (ctx && !reduceMotion) drawField(false);
    if (!reduceMotion) animateLetters(now);
    if (glow && finePointer && pointer.active) {
      glowX += (pointer.x - glowX) * 0.12;
      glowY += (pointer.y - glowY) * 0.12;
      glow.style.transform = "translate3d(" + glowX.toFixed(1) + "px," + glowY.toFixed(1) + "px,0)";
    }
  }
  requestAnimationFrame(loop);
}
if (!reduceMotion) requestAnimationFrame(loop);

// ---------------------------------------------------------------------------
// Section titles decode when they scroll into view
// ---------------------------------------------------------------------------
function decode(el) {
  const final = el.dataset.final;
  const start = performance.now();
  const total = 750;
  (function step(now) {
    const p = clamp((now - start) / total, 0, 1);
    let out = "";
    for (let i = 0; i < final.length; i++) {
      const settled = p * final.length * 1.25 > i + 1;
      out += final[i] === " " || settled ? final[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step); else el.textContent = final;
  })(start);
}
const scrambles = Array.from(document.querySelectorAll("[data-scramble]"));
scrambles.forEach((el) => {
  el.dataset.final = el.textContent.trim();
  el.setAttribute("aria-label", el.dataset.final);
});
if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { io.unobserve(entry.target); decode(entry.target); }
    });
  }, { threshold: 0.6 });
  scrambles.forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------------------
// Pause the turning neon borders while they are off screen
// ---------------------------------------------------------------------------
if ("IntersectionObserver" in window) {
  const pauser = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
    });
  }, { rootMargin: "100px" });
  document.querySelectorAll(".neon, .project, .contact-mail, .phone").forEach((el) => pauser.observe(el));
}

// ---------------------------------------------------------------------------
// Tilt: windows lean toward the pointer, with a light that follows it
// ---------------------------------------------------------------------------
if (finePointer && !reduceMotion) {
  document.querySelectorAll(".tilt").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", ((px - 0.5) * 9).toFixed(2) + "deg");
      el.style.setProperty("--rx", ((0.5 - py) * 7).toFixed(2) + "deg");
      el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      el.classList.add("is-hot");
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.classList.remove("is-hot");
    });
  });
}

// ---------------------------------------------------------------------------
// Project cards: the light follows the pointer, and each card sinks back as
// the next one slides over it
// ---------------------------------------------------------------------------
const projects = Array.from(document.querySelectorAll(".project"));
projects.forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px");
    card.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
});

const stackQuery = window.matchMedia("(min-width: 900px) and (min-height: 680px)");
function stackCards() {
  projects.forEach((card, i) => {
    const next = projects[i + 1];
    if (!next || !stackQuery.matches || reduceMotion) {
      card.style.transform = "";
      card.style.setProperty("--dim", "0");
      return;
    }
    const stuckAt = card.getBoundingClientRect().top;
    const nextTop = next.getBoundingClientRect().top;
    const span = window.innerHeight * 0.75;
    const p = clamp(1 - (nextTop - stuckAt - card.offsetHeight * 0.1) / span, 0, 1);
    card.style.transform = "scale(" + (1 - 0.06 * p).toFixed(4) + ")";
    card.style.setProperty("--dim", (0.6 * p).toFixed(3));
  });
}
window.addEventListener("resize", stackCards);
stackCards();

// ---------------------------------------------------------------------------
// Hero stage: the three shops, one after another. A scan line wipes in each
// new screen; the progress line under the active tab runs for the length of
// the slide and its end moves to the next one.
// ---------------------------------------------------------------------------
const stage = document.getElementById("stage");
if (stage) {
  const slides = Array.from(stage.querySelectorAll(".slide"));
  const tabs = Array.from(stage.querySelectorAll(".stage-tabs button"));
  const url = document.getElementById("stage-url");
  const scan = stage.querySelector(".scan");
  let index = 0;
  let first = true;

  function show(n) {
    const prev = index;
    index = (n + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const on = i === index;
      slide.classList.toggle("is-prev", !first && i === prev && !on);
      slide.classList.toggle("is-active", on);
      slide.tabIndex = on ? 0 : -1;
    });
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.classList.remove("run");
      tab.classList.toggle("is-active", on);
      if (on) tab.setAttribute("aria-current", "true"); else tab.removeAttribute("aria-current");
    });
    if (url) url.textContent = slides[index].dataset.url || "";
    if (scan && !first && !reduceMotion) {
      scan.classList.remove("go");
      void scan.offsetWidth;
      scan.classList.add("go");
    }
    if (!reduceMotion) {
      void tabs[index].offsetWidth; // restart the progress animation
      tabs[index].classList.add("run");
    }
    first = false;
  }

  tabs.forEach((tab, i) => tab.addEventListener("click", () => show(i)));
  tabs.forEach((tab) => tab.addEventListener("animationend", () => show(index + 1)));

  // Hold the slide while someone looks at it, or when the hero is off screen
  let hovering = false;
  let visible = true;
  function syncPause() { stage.dataset.paused = String(hovering || !visible); }
  stage.addEventListener("pointerenter", () => { hovering = true; syncPause(); });
  stage.addEventListener("pointerleave", () => { hovering = false; syncPause(); });
  stage.addEventListener("focusin", () => { hovering = true; syncPause(); });
  stage.addEventListener("focusout", () => { hovering = false; syncPause(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      syncPause();
    }, { threshold: 0.2 }).observe(stage);
  }

  show(0);
}

// ---------------------------------------------------------------------------
// Bots: a made-up chat that plays a sample round of each game
// ---------------------------------------------------------------------------
const SCRIPTS = [
  { title: "Group chat: Spy", lines: [
    ["me", "You", "/newgame"],
    ["bot", "Spy", "Word Wolf is on. Check your private chat for your word."],
    ["p", "Hana", "yellow"],
    ["p", "Dawit", "sweet"],
    ["p", "Sara", "monkey?"],
    ["bot", "Spy", "Hints are in. Vote for the impostor."],
  ] },
  { title: "Group chat: Truth", lines: [
    ["me", "You", "/newgame"],
    ["bot", "Truth", "Dawit, send me three statements. Two true, one lie."],
    ["bot", "Truth", "Statements are in. Which one is the lie? Bet your points."],
    ["p", "Hana", "20 points on number 2"],
    ["bot", "Truth", "It was number 2. Hana is on a 3 streak."],
  ] },
  { title: "Group chat: Guess Who", lines: [
    ["me", "You", "/newgame"],
    ["bot", "Guess Who", "I picked a hidden character. Ask me yes or no questions."],
    ["p", "Sara", "Is it a person?"],
    ["bot", "Guess Who", "Yes."],
    ["p", "Dawit", "Is it a footballer?"],
    ["bot", "Guess Who", "No."],
  ] },
  { title: "Group chat: Riddle", lines: [
    ["me", "You", "/emoji"],
    ["bot", "Riddle", "Emoji Riddle! Category: movie. 🦁👑 Type your guess in the chat."],
    ["p", "Dawit", "frozen?"],
    ["p", "Hana", "lion king"],
    ["bot", "Riddle", "Hana solved it first. The answer was The Lion King."],
  ] },
];

const termBody = document.getElementById("term-body");
const termTitle = document.getElementById("term-title");
const termTabs = Array.from(document.querySelectorAll("#term-tabs button"));
const botCards = Array.from(document.querySelectorAll(".bot"));
const terminal = document.getElementById("terminal");

if (termBody && terminal) {
  let token = 0;
  let current = 0;
  let manual = false;
  let inView = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function makeMsg(kind, name, text) {
    const m = document.createElement("div");
    m.className = "msg msg--" + kind;
    const b = document.createElement("b");
    b.textContent = name;
    const t = document.createElement("span");
    if (text.startsWith("/")) { const c = document.createElement("code"); c.textContent = text; t.appendChild(c); }
    else t.textContent = text;
    m.append(b, t);
    return m;
  }

  function select(i) {
    current = i;
    termTabs.forEach((b, k) => { b.classList.toggle("is-active", k === i); b.setAttribute("aria-pressed", String(k === i)); });
    botCards.forEach((c, k) => c.classList.toggle("is-active", k === i));
    if (termTitle) termTitle.textContent = SCRIPTS[i].title;
  }

  async function play(i) {
    const my = ++token;
    select(i);
    termBody.textContent = "";
    if (reduceMotion) {
      SCRIPTS[i].lines.forEach(([k, n, t]) => termBody.appendChild(makeMsg(k, n, t)));
      return;
    }
    await sleep(500);
    for (const [kind, name, text] of SCRIPTS[i].lines) {
      if (my !== token) return;
      let typing = null;
      if (kind !== "me") {
        typing = document.createElement("div");
        typing.className = "msg msg--" + kind + " typing";
        typing.innerHTML = "<i></i><i></i><i></i>";
        termBody.appendChild(typing);
        await sleep(kind === "bot" ? 850 : 600);
        if (my !== token) return;
        typing.remove();
      } else {
        await sleep(350);
        if (my !== token) return;
      }
      termBody.appendChild(makeMsg(kind, name, text));
      await sleep(kind === "me" ? 700 : 450);
    }
    await sleep(4200);
    if (my !== token || !inView) return;
    play(manual ? i : (i + 1) % SCRIPTS.length);
  }

  termTabs.forEach((b, i) => b.addEventListener("click", () => { manual = true; play(i); }));
  botCards.forEach((c, i) => {
    c.addEventListener("pointerenter", () => { if (i !== current && inView) { manual = true; play(i); } });
    c.addEventListener("focusin", () => { if (i !== current && inView) { manual = true; play(i); } });
  });

  if ("IntersectionObserver" in window && !reduceMotion) {
    new IntersectionObserver((entries) => {
      const now = entries[0].isIntersecting;
      if (now && !inView) { inView = true; play(current); }
      else if (!now && inView) { inView = false; token++; }
    }, { threshold: 0.35 }).observe(terminal);
  } else {
    inView = true;
    play(0);
  }
}

// ---------------------------------------------------------------------------
// Copy the email address (and a button that leans toward the pointer)
// ---------------------------------------------------------------------------
const copyBtn = document.getElementById("copy-email");
const copyStatus = document.getElementById("copy-status");
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    const email = copyBtn.dataset.email;
    let ok = false;
    try {
      await navigator.clipboard.writeText(email);
      ok = true;
    } catch (e) {
      const field = document.createElement("textarea");
      field.value = email;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try { ok = document.execCommand("copy"); } catch (err) {}
      field.remove();
    }
    if (copyStatus) {
      copyStatus.textContent = ok ? "Copied" : "Press Ctrl+C after selecting the address above";
      setTimeout(() => { copyStatus.textContent = ""; }, 2600);
    }
  });
}

if (finePointer && !reduceMotion) {
  document.querySelectorAll(".magnetic").forEach((el) => {
    window.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d < 140) el.style.transform = "translate(" + (dx * 0.28).toFixed(1) + "px," + (dy * 0.28).toFixed(1) + "px)";
      else el.style.transform = "";
    }, { passive: true });
  });
}

// ---------------------------------------------------------------------------
// Nav: mark the section that is on screen
// ---------------------------------------------------------------------------
const links = Array.from(document.querySelectorAll('.bar nav a[href^="#"]'));
if ("IntersectionObserver" in window && links.length) {
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = byId.get(entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach((a) => a.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "true");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
}

// ---------------------------------------------------------------------------
// Live line in the contact section: the time in Addis Ababa against the visitor's own
// ---------------------------------------------------------------------------
const timeLine = document.getElementById("addis-time");
function updateTime() {
  if (!timeLine) return;
  try {
    const now = new Date();
    const addis = "Africa/Addis_Ababa";
    const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: addis }).format(now);
    const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const asLocal = (tz) => new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const diff = Math.round(((asLocal(addis) - asLocal(here)) / 36e5) * 2) / 2;
    let rest;
    if (here === addis || diff === 0) rest = "the same time as where you are";
    else {
      const hours = Math.abs(diff) + (Math.abs(diff) === 1 ? " hour" : " hours");
      rest = hours + (diff > 0 ? " ahead of you" : " behind you");
    }
    timeLine.textContent = "It is " + clock + " in Addis Ababa, " + rest + ".";
  } catch (e) {
    /* keep the plain fallback text already in the page */
  }
}
updateTime();
setInterval(updateTime, 30000);

onScroll();
