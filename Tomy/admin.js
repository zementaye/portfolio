/*
 * admin.js
 * --------
 * Powers Tomy/admin.html. Talks to the Flask API in Tomy/admin-backend/.
 * Relies on API_BASE_URL and formatBirr() from products-api.js (loaded first).
 */

const TOKEN_KEY = "tomyAdminToken";
let allProducts = [];
let editingId = null;

// ---------- Elements ----------
const loginScreen = document.getElementById("loginScreen");
const adminScreen = document.getElementById("adminScreen");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const adminStatus = document.getElementById("adminStatus");
const tableBody = document.getElementById("productsTableBody");
const categoryFilter = document.getElementById("categoryFilter");
const tableSearch = document.getElementById("tableSearch");
const newProductBtn = document.getElementById("newProductBtn");

const editorOverlay = document.getElementById("editorOverlay");
const productForm = document.getElementById("productForm");
const editorTitle = document.getElementById("editorTitle");
const closeEditorBtn = document.getElementById("closeEditorBtn");
const cancelEditorBtn = document.getElementById("cancelEditorBtn");
const deleteProductBtn = document.getElementById("deleteProductBtn");
const formError = document.getElementById("formError");
const imagesList = document.getElementById("imagesList");
const addImageBtn = document.getElementById("addImageBtn");
const imageFileInput = document.getElementById("imageFileInput");
const sizesList = document.getElementById("sizesList");
const addSizeBtn = document.getElementById("addSizeBtn");
const sizesSection = document.getElementById("sizesSection");
const noSizesHint = document.getElementById("noSizesHint");
const fieldCategory = document.getElementById("fieldCategory");
const fieldType = document.getElementById("fieldType");

const fieldPrice = document.getElementById("fieldPrice");
const fieldOldPrice = document.getElementById("fieldOldPrice");
const fieldDiscountPercent = document.getElementById("fieldDiscountPercent");
const discountPercentRow = document.getElementById("discountPercentRow");

// ---------- Size presets per category ----------
// "letter"/"number" categories get one dropdown of fixed options.
// "shoe" categories get an EU/US toggle that swaps the size dropdown.
// "none" means one-size (e.g. hats) — the whole sizes section is hidden.
const SIZE_PRESETS = {
  hoodies: { kind: "letter", options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
  shirts: { kind: "letter", options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
  tracksuits: { kind: "letter", options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
  pants: { kind: "number", options: ["28", "30", "32", "34", "36", "38", "40", "42"] },
  shoes: {
    kind: "shoe",
    eu: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
    us: ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"],
  },
  hats: { kind: "none" },
};
function currentSizePreset() {
  return SIZE_PRESETS[fieldCategory.value] || { kind: "letter", options: [] };
}

// ---------- Auth helpers ----------
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (options.body) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearToken();
    showLogin("Your session expired — please log in again.");
    throw new Error(data.error || "Unauthorized");
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function showLogin(message) {
  loginScreen.classList.remove("hidden");
  adminScreen.classList.add("hidden");
  loginError.textContent = message || "";
}
function showDashboard() {
  loginScreen.classList.add("hidden");
  adminScreen.classList.remove("hidden");
  loadProducts();
}

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setToken(data.token);
    passwordInput.value = "";
    showDashboard();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  showLogin();
});

// ---------- Load & render table ----------
async function loadProducts() {
  adminStatus.textContent = "";
  tableBody.innerHTML = `<tr><td colspan="6" class="admin-loading">Loading products…</td></tr>`;
  try {
    allProducts = await apiFetch("/products");
    renderTable();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="admin-loading">${err.message}</td></tr>`;
  }
}

function renderTable() {
  const category = categoryFilter.value;
  const search = tableSearch.value.trim().toLowerCase();

  const rows = allProducts.filter((p) => {
    if (category && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search)) return false;
    return true;
  });

  if (!rows.length) {
    tableBody.innerHTML = `<tr><td colspan="6" class="admin-empty">No products match. Try "+ Add Product".</td></tr>`;
    return;
  }

  tableBody.innerHTML = rows
    .map((p) => {
      const thumb = (p.images && p.images[0] && p.images[0].url) || "";
      return `
        <tr data-id="${p.id}">
          <td>${thumb ? `<img class="admin-thumb" src="${thumb}" alt="">` : ""}</td>
          <td>${escapeHTML(p.name)}</td>
          <td><span class="admin-cat-pill">${p.category}</span></td>
          <td>${formatBirr(p.price)}${p.oldPrice ? ` <s style="opacity:.5">${formatBirr(p.oldPrice)}</s>` : ""}</td>
          <td>${p.featured ? '<span class="admin-featured-dot">●</span>' : ""}</td>
          <td>
            <div class="admin-row-actions">
              <button type="button" data-action="edit">Edit</button>
              <button type="button" data-action="delete">Delete</button>
            </div>
          </td>
        </tr>`;
    })
    .join("");
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

categoryFilter.addEventListener("change", renderTable);
tableSearch.addEventListener("input", renderTable);

tableBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.closest("tr").dataset.id;
  const product = allProducts.find((p) => p.id === id);
  if (btn.dataset.action === "edit") openEditor(product);
  if (btn.dataset.action === "delete") deleteProduct(product);
});

// ---------- Image rows in the editor ----------
function updateImageColorPickersVisibility() {
  const isSwatch = fieldType.value === "swatch";
  imagesList.querySelectorAll(".img-color-picker").forEach((el) => {
    el.classList.toggle("hidden", !isSwatch);
  });
}
fieldType.addEventListener("change", updateImageColorPickersVisibility);

// Existing image already saved on the product (used when opening the editor).
function addImageRow(url = "", color = "") {
  const row = document.createElement("div");
  row.className = "admin-image-row";
  row.dataset.url = url;
  const filename = url ? url.split("/").pop() : "";
  row.innerHTML = `
    <img class="admin-image-thumb" src="${url}" alt="">
    <span class="admin-image-name">${escapeHTML(filename)}</span>
    <input type="color" class="img-color-picker hidden" value="${color || "#000000"}">
    <button type="button" class="admin-image-remove">Remove</button>
  `;
  row.querySelector(".admin-image-remove").addEventListener("click", () => row.remove());
  imagesList.appendChild(row);
  updateImageColorPickersVisibility();
}

async function uploadImageFile(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

// Samples the photo itself to guess the garment's color, so the admin
// doesn't have to type a hex code. Skips near-white/near-black pixels
// first (typical studio backdrop), falling back to a plain average if
// that leaves nothing to sample.
function getAverageColorHex(img) {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = 40);
  const h = (canvas.height = 40);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  let data;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch (e) {
    return null;
  }

  const toHex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

  let r = 0, g = 0, b = 0, count = 0;
  let rAll = 0, gAll = 0, bAll = 0, countAll = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue; // skip transparent pixels
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    rAll += data[i]; gAll += data[i + 1]; bAll += data[i + 2]; countAll++;
    if (brightness > 235 || brightness < 15) continue; // likely a plain backdrop
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
  }
  if (count > 0) return toHex(Math.round(r / count), Math.round(g / count), Math.round(b / count));
  if (countAll > 0) return toHex(Math.round(rAll / countAll), Math.round(gAll / countAll), Math.round(bAll / countAll));
  return null;
}

// A file the admin just picked from their computer.
async function addImageFromFile(file) {
  const localUrl = URL.createObjectURL(file);
  const row = document.createElement("div");
  row.className = "admin-image-row uploading";
  row.dataset.url = "";
  row.innerHTML = `
    <img class="admin-image-thumb" src="${localUrl}" alt="">
    <span class="admin-image-name">${escapeHTML(file.name)} — uploading…</span>
    <input type="color" class="img-color-picker hidden" value="#000000">
    <button type="button" class="admin-image-remove">Remove</button>
  `;
  row.querySelector(".admin-image-remove").addEventListener("click", () => row.remove());
  imagesList.appendChild(row);
  updateImageColorPickersVisibility();

  const previewImg = new Image();
  previewImg.onload = () => {
    const detected = getAverageColorHex(previewImg);
    if (detected) {
      row.dataset.detectedColor = detected;
      row.querySelector(".img-color-picker").value = detected;
    }
  };
  previewImg.src = localUrl;

  try {
    const { url } = await uploadImageFile(file);
    row.dataset.url = url;
    row.querySelector(".admin-image-name").textContent = file.name;
    row.classList.remove("uploading");
  } catch (err) {
    row.querySelector(".admin-image-name").textContent = `Upload failed: ${err.message}`;
    row.classList.remove("uploading");
    row.classList.add("upload-error");
  }
}

addImageBtn.addEventListener("click", () => imageFileInput.click());
imageFileInput.addEventListener("change", () => {
  const file = imageFileInput.files[0];
  imageFileInput.value = ""; // so picking the same file again still fires "change"
  if (file) addImageFromFile(file);
});

function collectImages() {
  return [...imagesList.querySelectorAll(".admin-image-row")]
    .map((row) => {
      const picker = row.querySelector(".img-color-picker");
      const usingPicker = picker && !picker.classList.contains("hidden");
      return {
        url: row.dataset.url || "",
        color: usingPicker ? picker.value : row.dataset.detectedColor || null,
      };
    })
    .filter((img) => img.url);
}

// ---------- Size/stock rows in the editor ----------
function buildSizeOptionsHTML(preset, system, selected) {
  const list = preset.kind === "shoe" ? preset[system] || preset.eu : preset.options || [];
  let optionsHTML = list.map((v) => `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`).join("");
  if (selected && !list.includes(selected)) {
    optionsHTML += `<option value="${escapeHTML(selected)}" selected>${escapeHTML(selected)} (existing)</option>`;
  }
  return optionsHTML;
}

function addSizeRow(size = "", stock = "", shoeSystem = "eu") {
  const preset = currentSizePreset();
  const row = document.createElement("div");
  row.className = "admin-size-row";
  row.dataset.system = shoeSystem;

  const systemPickerHTML =
    preset.kind === "shoe"
      ? `<select class="size-system-select">
           <option value="eu"${shoeSystem === "eu" ? " selected" : ""}>EU</option>
           <option value="us"${shoeSystem === "us" ? " selected" : ""}>US</option>
         </select>`
      : "";

  row.innerHTML = `
    ${systemPickerHTML}
    <select class="size-label-select">${buildSizeOptionsHTML(preset, shoeSystem, size)}</select>
    <input type="number" class="size-stock-input" min="0" step="1" placeholder="Stock" value="${escapeHTML(String(stock))}">
    <button type="button" class="admin-image-remove">Remove</button>
  `;
  row.querySelector(".admin-image-remove").addEventListener("click", () => row.remove());

  const systemSelect = row.querySelector(".size-system-select");
  if (systemSelect) {
    systemSelect.addEventListener("change", () => {
      row.dataset.system = systemSelect.value;
      row.querySelector(".size-label-select").innerHTML = buildSizeOptionsHTML(preset, systemSelect.value, "");
    });
  }

  sizesList.appendChild(row);
}

addSizeBtn.addEventListener("click", () => addSizeRow());

function collectSizes() {
  return [...sizesList.querySelectorAll(".admin-size-row")]
    .map((row) => ({
      size: row.querySelector(".size-label-select").value.trim(),
      stock: Number(row.querySelector(".size-stock-input").value) || 0,
    }))
    .filter((s) => s.size);
}

// Re-syncs the sizes section whenever the category changes: hides it
// entirely for one-size categories (hats), and regenerates each existing
// row's dropdown options to match the new category's size preset.
function refreshSizesForCategory() {
  const preset = currentSizePreset();
  if (preset.kind === "none") {
    sizesSection.classList.add("hidden");
    noSizesHint.style.display = "";
    sizesList.innerHTML = "";
    return;
  }
  sizesSection.classList.remove("hidden");
  noSizesHint.style.display = "none";

  [...sizesList.querySelectorAll(".admin-size-row")].forEach((row) => {
    const labelSelect = row.querySelector(".size-label-select");
    const currentValue = labelSelect.value;
    let systemSelect = row.querySelector(".size-system-select");

    if (preset.kind === "shoe" && !systemSelect) {
      systemSelect = document.createElement("select");
      systemSelect.className = "size-system-select";
      systemSelect.innerHTML = `<option value="eu">EU</option><option value="us">US</option>`;
      row.insertBefore(systemSelect, row.firstChild);
      systemSelect.addEventListener("change", () => {
        row.dataset.system = systemSelect.value;
        labelSelect.innerHTML = buildSizeOptionsHTML(preset, systemSelect.value, "");
      });
    } else if (preset.kind !== "shoe" && systemSelect) {
      systemSelect.remove();
      systemSelect = null;
    }

    const system = row.dataset.system || "eu";
    labelSelect.innerHTML = buildSizeOptionsHTML(preset, system, currentValue);
  });
}
fieldCategory.addEventListener("change", refreshSizesForCategory);

// ---------- Editor open/close ----------
function openEditor(product) {
  formError.textContent = "";
  productForm.reset();
  imagesList.innerHTML = "";
  sizesList.innerHTML = "";

  if (product) {
    editingId = product.id;
    editorTitle.textContent = "Edit Product";
    deleteProductBtn.classList.remove("hidden");
    document.getElementById("fieldName").value = product.name;
    document.getElementById("fieldCategory").value = product.category;
    document.getElementById("fieldType").value = product.type || "simple";
    document.getElementById("fieldPrice").value = product.price;
    document.getElementById("fieldOldPrice").value = product.oldPrice || "";
    fieldDiscountPercent.value = product.discountPercent || "";
    document.getElementById("fieldFeatured").checked = !!product.featured;
    (product.images || []).forEach((img) => addImageRow(img.url, img.color));
    (product.sizes || []).forEach((s) => addSizeRow(s.size, s.stock));
  } else {
    editingId = null;
    editorTitle.textContent = "Add Product";
    deleteProductBtn.classList.add("hidden");
  }

  refreshSizesForCategory();
  updateImageColorPickersVisibility();
  updateDiscountPercentVisibility();
  editorOverlay.classList.remove("hidden");
}

// The manual "% off" badge only makes sense once the real price-vs-oldPrice
// math *can't* produce a genuine discount — otherwise the real math wins
// (see productCardHTML in products-api.js), so hide the field rather than
// let the admin fill in something that'll be silently ignored.
function updateDiscountPercentVisibility() {
  const price = Number(fieldPrice.value);
  const oldPrice = fieldOldPrice.value ? Number(fieldOldPrice.value) : null;
  const hasRealDiscount = !!(oldPrice && price > 0 && oldPrice > price);
  discountPercentRow.classList.toggle("hidden", hasRealDiscount);
  if (hasRealDiscount) fieldDiscountPercent.value = "";
}
fieldPrice.addEventListener("input", updateDiscountPercentVisibility);
fieldOldPrice.addEventListener("input", updateDiscountPercentVisibility);

function closeEditor() {
  editorOverlay.classList.add("hidden");
  editingId = null;
}

newProductBtn.addEventListener("click", () => openEditor(null));
closeEditorBtn.addEventListener("click", closeEditor);
cancelEditorBtn.addEventListener("click", closeEditor);
editorOverlay.addEventListener("click", (e) => {
  if (e.target === editorOverlay) closeEditor();
});

// ---------- Save / delete ----------
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  if (imagesList.querySelector(".admin-image-row.uploading")) {
    formError.textContent = "Please wait for the image upload to finish.";
    return;
  }

  const payload = {
    name: document.getElementById("fieldName").value.trim(),
    category: document.getElementById("fieldCategory").value,
    type: document.getElementById("fieldType").value,
    price: Number(document.getElementById("fieldPrice").value),
    oldPrice: document.getElementById("fieldOldPrice").value
      ? Number(document.getElementById("fieldOldPrice").value)
      : null,
    discountPercent:
      !discountPercentRow.classList.contains("hidden") && fieldDiscountPercent.value
        ? Number(fieldDiscountPercent.value)
        : null,
    featured: document.getElementById("fieldFeatured").checked,
    images: collectImages(),
    sizes: collectSizes(),
  };

  if (!payload.images.length) {
    formError.textContent = "Add at least one image.";
    return;
  }

  const saveBtn = document.getElementById("saveProductBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    if (editingId) {
      await apiFetch(`/products/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      adminStatus.textContent = `Saved "${payload.name}".`;
    } else {
      await apiFetch("/products", { method: "POST", body: JSON.stringify(payload) });
      adminStatus.textContent = `Added "${payload.name}".`;
    }
    closeEditor();
    await loadProducts();
  } catch (err) {
    formError.textContent = err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});

deleteProductBtn.addEventListener("click", () => {
  if (!editingId) return;
  const product = allProducts.find((p) => p.id === editingId);
  deleteProduct(product);
});

async function deleteProduct(product) {
  if (!product) return;
  if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;
  try {
    await apiFetch(`/products/${product.id}`, { method: "DELETE" });
    adminStatus.textContent = `Deleted "${product.name}".`;
    closeEditor();
    await loadProducts();
  } catch (err) {
    formError.textContent = err.message;
    adminStatus.textContent = "";
  }
}

// ---------- Init ----------
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
