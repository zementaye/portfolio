const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Bar: a thin line appears under it once the page has moved
const bar = document.getElementById("bar");
function onScroll() {
  if (bar) bar.classList.toggle("is-scrolled", window.scrollY > 8);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Theme toggle (follows the device on the first visit, then remembers the choice)
const toggle = document.getElementById("theme-toggle");
function renderToggle() {
  const dark = root.dataset.theme === "dark";
  if (!toggle) return;
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.setAttribute("aria-label", dark ? "Switch to the light theme" : "Switch to the dark theme");
}
if (toggle) {
  toggle.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    renderToggle();
  });
  renderToggle();
}

// Hero stage: the three shops, one after another. The progress line under the
// active tab runs for the length of the slide, and its end moves to the next one.
const stage = document.getElementById("stage");
if (stage) {
  const slides = Array.from(stage.querySelectorAll(".slide"));
  const tabs = Array.from(stage.querySelectorAll(".stage-tabs button"));
  const url = document.getElementById("stage-url");
  let index = 0;

  function show(n) {
    index = (n + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const on = i === index;
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
    if (!reduceMotion) {
      void tabs[index].offsetWidth; // restart the progress animation
      tabs[index].classList.add("run");
    }
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

// Copy the email address
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

// Nav: mark the section that is on screen
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

// Live line in the contact section: the time in Addis Ababa against the visitor's own
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
