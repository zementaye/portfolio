/*
 * products-api.js
 * ----------------
 * Shared by tomy-fashion.html, pages/products.html and every pages/<category>.html.
 * Fetches the product catalog from the admin backend and renders the same
 * .product-card markup the site's CSS already styles (simple / color-swatch /
 * multi-image slider), so the storefront always reflects whatever was last
 * saved from admin.html — no more hand-editing HTML to add a product.
 *
 * Set API_BASE_URL below to your deployed backend (see Tomy/admin-backend/README.md).
 */

const API_BASE_URL = "https://tomy-k4ad.onrender.com/api";

function formatBirr(amount) {
  return Number(amount).toLocaleString("en-US") + " Birr";
}

function productCardHTML(p) {
  const images = p.images || [];
  const first = images[0] || { url: "", color: null };

  let mediaHTML = "";
  if (p.type === "swatch" && images.length > 1) {
    const swatches = images
      .map((img, i) => {
        const activeClass = i === 0 ? " active" : "";
        const style = img.color ? ` style="background:${img.color};"` : "";
        return `<span class="color${activeClass}" data-image="${img.url}"${style}></span>`;
      })
      .join("\n");
    mediaHTML = `
      <div class="product-image">
        <img class="main-image" src="${first.url}" data-default="${first.url}" alt="${p.name}">
        <div class="color-options">${swatches}</div>
      </div>`;
  } else if (p.type === "slider" && images.length > 1) {
    const slides = images
      .map((img, i) => `<img src="${img.url}" class="slide${i === 0 ? " active" : ""}" alt="${p.name} — view ${i + 1}">`)
      .join("\n");
    mediaHTML = `
      <div class="product-image slider">
        ${slides}
        <button class="arrow left">&#10094;</button>
        <button class="arrow right">&#10095;</button>
      </div>`;
  } else {
    mediaHTML = `<img src="${first.url}" alt="${p.name}">`;
  }

  let priceHTML = `<p>${formatBirr(p.price)}</p>`;
  if (p.oldPrice && p.oldPrice > p.price) {
    const discount = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
    priceHTML = `
      <div class="price-row">
        <span class="price-now">${formatBirr(p.price)}</span>
        <span class="price-was">${formatBirr(p.oldPrice)}</span>
        <span class="discount-badge">-${discount}%</span>
      </div>`;
  }

  return `
    <div class="product-card" data-category="${p.category}" data-product-id="${p.id}">
      ${mediaHTML}
      <h3>${p.name}</h3>
      ${priceHTML}
    </div>`;
}

function wireUpCard(card) {
  // Color swatches
  const mainImage = card.querySelector(".main-image");
  const colors = card.querySelectorAll(".color");
  colors.forEach((color) => {
    color.addEventListener("click", () => {
      mainImage.style.opacity = "0";
      setTimeout(() => {
        mainImage.src = color.dataset.image;
        mainImage.style.opacity = "1";
      }, 150);
      colors.forEach((c) => c.classList.remove("active"));
      color.classList.add("active");
    });
  });

  // Slider arrows
  const slider = card.querySelector(".product-image.slider");
  if (slider) {
    const slides = slider.querySelectorAll(".slide");
    const leftBtn = slider.querySelector(".arrow.left");
    const rightBtn = slider.querySelector(".arrow.right");
    let current = 0;
    const showSlide = (i) => {
      slides.forEach((s) => s.classList.remove("active"));
      slides[i].classList.add("active");
    };
    rightBtn?.addEventListener("click", () => {
      current = (current + 1) % slides.length;
      showSlide(current);
    });
    leftBtn?.addEventListener("click", () => {
      current = (current - 1 + slides.length) % slides.length;
      showSlide(current);
    });
  }
}

async function fetchProducts({ category, featured } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (featured) params.set("featured", "true");
  const url = `${API_BASE_URL}/products${params.toString() ? "?" + params.toString() : ""}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function loadProductGrid(grid) {
  const mode = grid.dataset.products; // "featured" | "all" | a category name
  const options = mode === "featured" ? { featured: true } : mode === "all" ? {} : { category: mode };

  grid.innerHTML = `<p class="products-loading">Loading products…</p>`;
  try {
    const products = await fetchProducts(options);
    if (!products.length) {
      grid.innerHTML = `<p class="products-empty">No products yet — check back soon.</p>`;
      return;
    }
    grid.innerHTML = products.map(productCardHTML).join("\n");
    grid.querySelectorAll(".product-card").forEach(wireUpCard);
    // cart.js adds Add-to-Cart/wishlist/filter UI by scanning .product-card
    // elements on DOMContentLoaded — that ran before this fetch resolved,
    // so ask it to wire up the cards we just injected.
    if (window.TomiCart) window.TomiCart.refreshProductCards();
  } catch (err) {
    console.error("Failed to load products:", err);
    grid.innerHTML = `<p class="products-error">Couldn't load products right now. Please refresh.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-products]").forEach(loadProductGrid);
});
