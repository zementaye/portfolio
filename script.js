// Reading progress (transform only, so it never triggers layout)
const progress = document.querySelector(".progress");
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? window.scrollY / max : 0;
  if (progress) progress.style.transform = "scaleX(" + Math.min(1, Math.max(0, ratio)) + ")";
}
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

// Entrances: each part of a section rises once as it comes into view
const rises = document.querySelectorAll("[data-rise]");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  rises.forEach((el) => io.observe(el));
  // Safety net: nothing stays hidden if the observer never fires
  setTimeout(() => rises.forEach((el) => el.classList.add("in")), 4000);
} else {
  rises.forEach((el) => el.classList.add("in"));
}

// Theme toggle (light paper by default, remembered between visits)
const toggle = document.getElementById("theme-toggle");
const root = document.documentElement;

function renderToggle() {
  const dark = root.dataset.theme === "dark";
  if (!toggle) return;
  toggle.textContent = dark ? "Light" : "Dark";
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
