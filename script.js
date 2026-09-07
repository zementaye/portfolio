// Scroll progress bar + navbar background
window.addEventListener("scroll", () => {
  const scrollTop = document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

  const bar = document.querySelector(".progress-bar");
  if (bar) bar.style.width = progress + "%";

  const navbar = document.getElementById("navbar");
  if (navbar) navbar.classList.toggle("scrolled", scrollTop > 50);
});

// Custom cursor (only meaningful on fine-pointer devices; CSS hides it elsewhere)
const cursor = document.querySelector(".cursor");
const follower = document.querySelector(".cursor-follower");

if (cursor && follower && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.addEventListener("mousemove", (e) => {
    cursor.style.top = e.clientY + "px";
    cursor.style.left = e.clientX + "px";
    follower.style.top = e.clientY + "px";
    follower.style.left = e.clientX + "px";
  });
}

// Scroll reveal for sections
const sections = document.querySelectorAll(".section");

function revealSections() {
  sections.forEach((section) => {
    const top = section.getBoundingClientRect().top;
    if (top < window.innerHeight - 100) {
      section.classList.add("show");
    }
  });
}

window.addEventListener("scroll", revealSections);
revealSections();

// Theme toggle
const toggle = document.getElementById("theme-toggle");

if (toggle) {
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    toggle.textContent = document.body.classList.contains("light-mode") ? "🌞" : "🌙";
  });
}

// Typing effect in the hero subline
const words = ["fast ecommerce storefronts.", "interactive dashboards.", "modern UI."];
let wordIndex = 0;
let letterIndex = 0;
let isDeleting = false;

function typeEffect() {
  const typingElement = document.getElementById("typing");
  if (!typingElement) return;

  const currentWord = words[wordIndex % words.length];

  if (!isDeleting) {
    typingElement.textContent = currentWord.substring(0, letterIndex + 1);
    letterIndex++;
    if (letterIndex === currentWord.length) {
      isDeleting = true;
      setTimeout(typeEffect, 1400);
      return;
    }
  } else {
    typingElement.textContent = currentWord.substring(0, letterIndex - 1);
    letterIndex--;
    if (letterIndex === 0) {
      isDeleting = false;
      wordIndex++;
    }
  }

  setTimeout(typeEffect, isDeleting ? 40 : 90);
}

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  typeEffect();
} else {
  const typingElement = document.getElementById("typing");
  if (typingElement) typingElement.textContent = words[0];
}
