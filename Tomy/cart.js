/* =========================================================
   TOMI FASHION — shared shop module
   Cart, wishlist, quick view, price filters, size selection,
   lazy loading, nav active-state — all self-injecting so any
   page that includes this script gets the full feature set
   without needing its HTML hand-edited.
   ========================================================= */
(function () {
    const CART_KEY = "tomiCart";
    const WISH_KEY = "tomiWishlist";
    const PHONE = "251912472255"; // from the store's contact number

    /* ---------- storage helpers ---------- */
    function readList(key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; }
        catch (e) { return []; }
    }
    function writeList(key, list) { localStorage.setItem(key, JSON.stringify(list)); }

    function getCart() { return readList(CART_KEY); }
    function saveCart(cart) { writeList(CART_KEY, cart); updateBadge(); }

    function getWishlist() { return readList(WISH_KEY); }
    function saveWishlist(list) { writeList(WISH_KEY, list); updateWishlistBadge(); }
    function isWishlisted(id) { return getWishlist().some(i => i.id === id); }

    function parsePrice(text) {
        const digits = (text || "").replace(/[^\d]/g, "");
        return parseInt(digits, 10) || 0;
    }
    function money(n) { return n.toLocaleString("en-US") + " Birr"; }

    /* ---------- focus management for drawers/modal (a11y) ---------- */
    let lastFocusedEl = null;
    const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function trapFocus(e) {
        const panel = document.querySelector('.tomi-drawer.open, #tomiQVModal.open');
        if (!panel || e.key !== "Tab") return;
        const focusable = panel.querySelectorAll(FOCUSABLE);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }
    document.addEventListener("keydown", trapFocus);

    function focusIntoPanel(panel) {
        lastFocusedEl = document.activeElement;
        const target = panel.querySelector(FOCUSABLE);
        if (target) target.focus();
    }
    function returnFocus() {
        if (lastFocusedEl && typeof lastFocusedEl.focus === "function") lastFocusedEl.focus();
        lastFocusedEl = null;
    }

    /* ---------- read product data straight off the DOM ---------- */
    function cardMeta(card, idx) {
        const h3 = card.querySelector("h3");
        const priceEl = card.querySelector("p");
        if (!h3 || !priceEl) return null;
        const name = h3.textContent.trim();
        const price = parsePrice(priceEl.textContent);
        const imgEl = card.querySelector(".main-image") || card.querySelector(".slide.active") || card.querySelector("img");
        const image = imgEl ? imgEl.getAttribute("src") : "";
        const id = (window.location.pathname + "|" + name + "|" + idx).replace(/\s+/g, "-").toLowerCase();
        return { id: id, name: name, price: price, image: image };
    }

    function cardImages(card) {
        const imgs = [];
        card.querySelectorAll(".slide").forEach(img => {
            const src = img.getAttribute("src");
            if (src && imgs.indexOf(src) === -1) imgs.push(src);
        });
        if (imgs.length === 0) {
            card.querySelectorAll(".color-options .color").forEach(sw => {
                const src = sw.getAttribute("data-image");
                if (src && imgs.indexOf(src) === -1) imgs.push(src);
            });
        }
        if (imgs.length === 0) {
            const img = card.querySelector("img");
            if (img) imgs.push(img.getAttribute("src"));
        }
        return imgs;
    }

    function imageWrapFor(card) {
        const wrap = card.querySelector(".product-image") || card.querySelector(".slider") || card;
        if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
        return wrap;
    }

    /* ---------- size options (per product, not per page — a page can mix categories) ---------- */
    function sizeOptionsForCard(name, path) {
        const n = (name || "").toLowerCase();
        const p = (path || "").toLowerCase();
        if (p.includes("shoe") || /sneaker|shoe|boot|sandal/.test(n)) return ["40", "41", "42", "43", "44"];
        if (p.includes("hat") || /\bhat\b|\bcap\b|beanie/.test(n)) return null; // one-size accessory
        return ["S", "M", "L", "XL"];
    }

    /* ---------- cart ---------- */
    function addItem(item, qty) {
        qty = qty || 1;
        const cart = getCart();
        const existing = cart.find(i => i.id === item.id);
        if (existing) { existing.qty += qty; } else { cart.push(Object.assign({ qty: qty }, item)); }
        saveCart(cart);
        renderDrawer();
        showToast(item);
        pulseFab("tomiCartFab");
    }

    function changeQty(id, delta) {
        let cart = getCart();
        const item = cart.find(i => i.id === id);
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        saveCart(cart);
        renderDrawer();
    }

    function removeItem(id) {
        const cart = getCart().filter(i => i.id !== id);
        saveCart(cart);
        renderDrawer();
    }

    function cartCount(cart) { return cart.reduce((s, i) => s + i.qty, 0); }

    /* ---------- wishlist ---------- */
    function toggleWishlist(meta) {
        let list = getWishlist();
        const already = list.some(i => i.id === meta.id);
        list = already ? list.filter(i => i.id !== meta.id) : list.concat([meta]);
        saveWishlist(list);
        renderWishlistDrawer();
        document.querySelectorAll('.wishlist-btn[data-id="' + meta.id + '"]').forEach(b => b.classList.toggle("active", !already));
        if (!already) pulseFab("tomiWishFab");
    }

    /* ================================================
       UI — cart drawer
       ================================================ */
    function buildCartUI() {
        const fab = document.createElement("button");
        fab.id = "tomiCartFab";
        fab.type = "button";
        fab.setAttribute("aria-label", "Open shopping bag");
        fab.innerHTML = '🛍️ <span id="tomiCartCount">0</span>';
        document.body.appendChild(fab);

        const overlay = document.createElement("div");
        overlay.id = "tomiCartOverlay";
        overlay.className = "tomi-overlay";
        document.body.appendChild(overlay);

        const drawer = document.createElement("aside");
        drawer.id = "tomiCartDrawer";
        drawer.className = "tomi-drawer tomi-drawer-right";
        drawer.setAttribute("aria-label", "Shopping bag");
        drawer.setAttribute("role", "dialog");
        drawer.setAttribute("aria-modal", "true");
        drawer.innerHTML =
            '<div class="tomi-cart-head"><h3>Your Bag</h3><button id="tomiCartClose" aria-label="Close bag">&times;</button></div>' +
            '<div id="tomiCartItems"></div>' +
            '<div class="tomi-cart-foot">' +
                '<div class="tomi-cart-subtotal"><span>Subtotal</span><strong id="tomiCartSubtotal">0 Birr</strong></div>' +
                '<a id="tomiCartCheckout" class="btn" target="_blank" rel="noopener">Order on WhatsApp</a>' +
            '</div>';
        document.body.appendChild(drawer);

        fab.addEventListener("click", toggleDrawer);
        overlay.addEventListener("click", closeAllPanels);
        document.getElementById("tomiCartClose").addEventListener("click", closeDrawer);
    }

    function openDrawer() {
        document.getElementById("tomiCartDrawer").classList.add("open");
        document.getElementById("tomiCartOverlay").classList.add("open");
        focusIntoPanel(document.getElementById("tomiCartDrawer"));
    }
    function closeDrawer() {
        const wasOpen = document.getElementById("tomiCartDrawer").classList.contains("open");
        document.getElementById("tomiCartDrawer").classList.remove("open");
        document.getElementById("tomiCartOverlay").classList.remove("open");
        if (wasOpen) returnFocus();
    }
    function toggleDrawer() {
        const open = document.getElementById("tomiCartDrawer").classList.contains("open");
        if (open) closeDrawer(); else { closeWishDrawer(); renderDrawer(); openDrawer(); }
    }

    function pulseFab(id) {
        const fab = document.getElementById(id);
        if (!fab) return;
        fab.classList.remove("pulse");
        void fab.offsetWidth;
        fab.classList.add("pulse");
    }

    function updateBadge() {
        const el = document.getElementById("tomiCartCount");
        if (!el) return;
        const count = cartCount(getCart());
        el.textContent = count;
        el.style.display = count > 0 ? "inline-flex" : "none";
    }

    function renderDrawer() {
        const cart = getCart();
        const itemsEl = document.getElementById("tomiCartItems");
        const checkoutLink = document.getElementById("tomiCartCheckout");
        if (!itemsEl) return;

        if (cart.length === 0) {
            itemsEl.innerHTML = '<p class="tomi-cart-empty">Your bag is empty — add something you like.</p>';
        } else {
            itemsEl.innerHTML = cart.map(item =>
                '<div class="tomi-cart-item">' +
                    '<img src="' + item.image + '" alt="">' +
                    '<div class="tomi-cart-item-info">' +
                        '<p class="tomi-cart-item-name">' + item.name + (item.size ? ' <span class="tomi-cart-item-size">— Size ' + item.size + '</span>' : '') + '</p>' +
                        '<p class="tomi-cart-item-price">' + money(item.price) + '</p>' +
                        '<div class="tomi-qty">' +
                            '<button data-action="dec" data-id="' + item.id + '" aria-label="Decrease quantity">&minus;</button>' +
                            '<span>' + item.qty + '</span>' +
                            '<button data-action="inc" data-id="' + item.id + '" aria-label="Increase quantity">+</button>' +
                        '</div>' +
                    '</div>' +
                    '<button class="tomi-cart-remove" data-id="' + item.id + '">Remove</button>' +
                '</div>'
            ).join("");
        }

        const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const subtotalEl = document.getElementById("tomiCartSubtotal");
        if (subtotalEl) subtotalEl.textContent = money(subtotal);

        itemsEl.querySelectorAll("[data-action='inc']").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.id, 1)));
        itemsEl.querySelectorAll("[data-action='dec']").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.id, -1)));
        itemsEl.querySelectorAll(".tomi-cart-remove").forEach(b => b.addEventListener("click", () => removeItem(b.dataset.id)));

        if (checkoutLink) {
            if (cart.length === 0) {
                checkoutLink.setAttribute("aria-disabled", "true");
                checkoutLink.href = "#";
            } else {
                checkoutLink.removeAttribute("aria-disabled");
                const lines = cart.map(i => i.qty + "x " + i.name + (i.size ? " (Size " + i.size + ")" : "") + " — " + money(i.price * i.qty)).join("\n");
                const text = "Hi Tomi Fashion, I'd like to order:\n" + lines + "\n\nTotal: " + money(subtotal);
                checkoutLink.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(text);
            }
        }
        updateBadge();
    }

    /* ================================================
       UI — wishlist drawer
       ================================================ */
    function buildWishlistUI() {
        const fab = document.createElement("button");
        fab.id = "tomiWishFab";
        fab.type = "button";
        fab.setAttribute("aria-label", "Open saved items");
        fab.innerHTML = '♥ <span id="tomiWishCount">0</span>';
        document.body.appendChild(fab);

        const overlay = document.createElement("div");
        overlay.id = "tomiWishOverlay";
        overlay.className = "tomi-overlay";
        document.body.appendChild(overlay);

        const drawer = document.createElement("aside");
        drawer.id = "tomiWishDrawer";
        drawer.className = "tomi-drawer tomi-drawer-right";
        drawer.setAttribute("aria-label", "Saved items");
        drawer.setAttribute("role", "dialog");
        drawer.setAttribute("aria-modal", "true");
        drawer.innerHTML =
            '<div class="tomi-cart-head"><h3>Saved Items</h3><button id="tomiWishClose" aria-label="Close saved items">&times;</button></div>' +
            '<div id="tomiWishItems"></div>';
        document.body.appendChild(drawer);

        fab.addEventListener("click", toggleWishDrawer);
        overlay.addEventListener("click", closeAllPanels);
        document.getElementById("tomiWishClose").addEventListener("click", closeWishDrawer);
    }

    function openWishDrawer() {
        document.getElementById("tomiWishDrawer").classList.add("open");
        document.getElementById("tomiWishOverlay").classList.add("open");
        focusIntoPanel(document.getElementById("tomiWishDrawer"));
    }
    function closeWishDrawer() {
        const wasOpen = document.getElementById("tomiWishDrawer").classList.contains("open");
        document.getElementById("tomiWishDrawer").classList.remove("open");
        document.getElementById("tomiWishOverlay").classList.remove("open");
        if (wasOpen) returnFocus();
    }
    function toggleWishDrawer() {
        const open = document.getElementById("tomiWishDrawer").classList.contains("open");
        if (open) closeWishDrawer(); else { closeDrawer(); renderWishlistDrawer(); openWishDrawer(); }
    }

    function updateWishlistBadge() {
        const el = document.getElementById("tomiWishCount");
        if (!el) return;
        const count = getWishlist().length;
        el.textContent = count;
        el.style.display = count > 0 ? "inline-flex" : "none";
    }

    function renderWishlistDrawer() {
        const list = getWishlist();
        const itemsEl = document.getElementById("tomiWishItems");
        if (!itemsEl) return;

        if (list.length === 0) {
            itemsEl.innerHTML = '<p class="tomi-cart-empty">Nothing saved yet — tap the heart on any product.</p>';
        } else {
            itemsEl.innerHTML = list.map(item =>
                '<div class="tomi-cart-item">' +
                    '<img src="' + item.image + '" alt="">' +
                    '<div class="tomi-cart-item-info">' +
                        '<p class="tomi-cart-item-name">' + item.name + '</p>' +
                        '<p class="tomi-cart-item-price">' + money(item.price) + '</p>' +
                        '<button type="button" class="tomi-move-to-bag" data-id="' + item.id + '">Move to Bag</button>' +
                    '</div>' +
                    '<button class="tomi-cart-remove" data-id="' + item.id + '">Remove</button>' +
                '</div>'
            ).join("");
        }

        itemsEl.querySelectorAll(".tomi-cart-remove").forEach(b => b.addEventListener("click", () => {
            const list2 = getWishlist().filter(i => i.id !== b.dataset.id);
            saveWishlist(list2);
            renderWishlistDrawer();
            document.querySelectorAll('.wishlist-btn[data-id="' + b.dataset.id + '"]').forEach(x => x.classList.remove("active"));
        }));

        itemsEl.querySelectorAll(".tomi-move-to-bag").forEach(b => b.addEventListener("click", () => {
            const item = getWishlist().find(i => i.id === b.dataset.id);
            if (!item) return;
            const btnOnPage = document.querySelector('.wishlist-btn[data-id="' + item.id + '"]');
            const cardOnPage = btnOnPage ? btnOnPage.closest(".product-card") : null;
            closeWishDrawer();
            if (cardOnPage) {
                const idx = Array.prototype.indexOf.call(document.querySelectorAll(".product-card"), cardOnPage);
                openQuickView(cardOnPage, idx);
            } else {
                // saved from a different page — best effort add, no size context available here
                addItem(item);
            }
        }));

        updateWishlistBadge();
    }

    function injectWishlistButtons() {
        document.querySelectorAll(".product-card").forEach((card, idx) => {
            if (card.querySelector(".wishlist-btn")) return;
            const meta = cardMeta(card, idx);
            if (!meta) return;
            const wrap = imageWrapFor(card);

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "wishlist-btn" + (isWishlisted(meta.id) ? " active" : "");
            btn.dataset.id = meta.id;
            btn.setAttribute("aria-label", "Save to wishlist");
            btn.innerHTML = "♥";
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const activeImg = card.querySelector(".main-image") || card.querySelector(".slide.active") || card.querySelector("img");
                toggleWishlist({ id: meta.id, name: meta.name, price: meta.price, image: activeImg ? activeImg.getAttribute("src") : meta.image });
            });
            wrap.appendChild(btn);
        });
    }

    /* ================================================
       UI — quick view modal
       ================================================ */
    let qv = { meta: null, images: [], activeIndex: 0, sizes: null, selectedSize: null, qty: 1 };

    function buildQuickViewUI() {
        const overlay = document.createElement("div");
        overlay.id = "tomiQVOverlay";
        overlay.className = "tomi-overlay";
        document.body.appendChild(overlay);

        const modal = document.createElement("div");
        modal.id = "tomiQVModal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", "Product quick view");
        modal.innerHTML =
            '<button id="tomiQVClose" aria-label="Close quick view">&times;</button>' +
            '<div class="tomi-qv-gallery">' +
                '<img id="tomiQVMainImage" src="" alt="">' +
                '<div id="tomiQVThumbs" class="tomi-qv-thumbs"></div>' +
            '</div>' +
            '<div class="tomi-qv-details">' +
                '<h3 id="tomiQVName"></h3>' +
                '<p id="tomiQVPrice" class="tomi-qv-price"></p>' +
                '<div id="tomiQVSizes" class="size-select"></div>' +
                '<div class="tomi-qv-qty">' +
                    '<span class="size-label">Qty</span>' +
                    '<button type="button" id="tomiQVQtyMinus" aria-label="Decrease quantity">&minus;</button>' +
                    '<span id="tomiQVQty">1</span>' +
                    '<button type="button" id="tomiQVQtyPlus" aria-label="Increase quantity">+</button>' +
                '</div>' +
                '<button type="button" id="tomiQVAdd" class="btn btn-dark-full">Add to Cart</button>' +
                '<button type="button" id="tomiQVWishlistBtn" class="wishlist-btn qv">♥ Save for later</button>' +
            '</div>';
        document.body.appendChild(modal);

        overlay.addEventListener("click", closeAllPanels);
        document.getElementById("tomiQVClose").addEventListener("click", closeQuickView);
        document.getElementById("tomiQVQtyMinus").addEventListener("click", () => {
            qv.qty = Math.max(1, qv.qty - 1);
            document.getElementById("tomiQVQty").textContent = qv.qty;
        });
        document.getElementById("tomiQVQtyPlus").addEventListener("click", () => {
            qv.qty += 1;
            document.getElementById("tomiQVQty").textContent = qv.qty;
        });
        document.getElementById("tomiQVAdd").addEventListener("click", () => {
            if (qv.sizes && !qv.selectedSize) {
                document.getElementById("tomiQVSizes").classList.add("size-required");
                return;
            }
            addItem({
                id: qv.meta.id + (qv.selectedSize ? "|" + qv.selectedSize : ""),
                name: qv.meta.name,
                size: qv.selectedSize,
                price: qv.meta.price,
                image: qv.images[qv.activeIndex] || qv.meta.image
            }, qv.qty);
            closeQuickView();
        });
        document.getElementById("tomiQVWishlistBtn").addEventListener("click", () => {
            toggleWishlist(qv.meta);
            renderQuickView();
        });
    }

    function openQuickView(card, idx) {
        const meta = cardMeta(card, idx);
        if (!meta) return;
        const opener = document.activeElement;
        qv = {
            meta: meta,
            images: cardImages(card),
            activeIndex: 0,
            sizes: sizeOptionsForCard(meta.name, window.location.pathname),
            selectedSize: null,
            qty: 1
        };
        renderQuickView();
        closeDrawer(); closeWishDrawer();
        document.getElementById("tomiQVOverlay").classList.add("open");
        const modal = document.getElementById("tomiQVModal");
        modal.classList.add("open");
        lastFocusedEl = opener;
        const target = modal.querySelector(FOCUSABLE);
        if (target) target.focus();
    }

    function closeQuickView() {
        const wasOpen = document.getElementById("tomiQVModal").classList.contains("open");
        document.getElementById("tomiQVOverlay").classList.remove("open");
        document.getElementById("tomiQVModal").classList.remove("open");
        if (wasOpen) returnFocus();
    }

    function renderQuickView() {
        const mainImg = document.getElementById("tomiQVMainImage");
        mainImg.src = qv.images[qv.activeIndex] || qv.meta.image;
        mainImg.alt = qv.meta.name;

        const thumbs = document.getElementById("tomiQVThumbs");
        thumbs.innerHTML = qv.images.length > 1 ? qv.images.map((src, i) =>
            '<button type="button" class="tomi-qv-thumb' + (i === qv.activeIndex ? ' active' : '') + '" data-i="' + i + '"><img src="' + src + '" alt=""></button>'
        ).join("") : "";
        thumbs.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
            qv.activeIndex = parseInt(b.dataset.i, 10);
            renderQuickView();
        }));

        document.getElementById("tomiQVName").textContent = qv.meta.name;
        document.getElementById("tomiQVPrice").textContent = money(qv.meta.price);

        const sizeWrap = document.getElementById("tomiQVSizes");
        if (qv.sizes) {
            sizeWrap.style.display = "flex";
            sizeWrap.innerHTML = '<span class="size-label">Size</span>' + qv.sizes.map(s =>
                '<button type="button" class="size-pill' + (qv.selectedSize === s ? ' active' : '') + '" data-size="' + s + '">' + s + '</button>'
            ).join("");
            sizeWrap.querySelectorAll(".size-pill").forEach(b => b.addEventListener("click", () => {
                qv.selectedSize = b.dataset.size;
                sizeWrap.classList.remove("size-required");
                renderQuickView();
            }));
        } else {
            sizeWrap.style.display = "none";
            sizeWrap.innerHTML = "";
        }

        document.getElementById("tomiQVQty").textContent = qv.qty;

        const heartBtn = document.getElementById("tomiQVWishlistBtn");
        const saved = isWishlisted(qv.meta.id);
        heartBtn.classList.toggle("active", saved);
        heartBtn.innerHTML = saved ? "♥ Saved" : "♥ Save for later";
    }

    function injectQuickViewButtons() {
        document.querySelectorAll(".product-card").forEach((card, idx) => {
            if (card.querySelector(".quickview-btn")) return;
            const wrap = imageWrapFor(card);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "quickview-btn";
            btn.setAttribute("aria-label", "Quick view");
            btn.innerHTML = "🔍";
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                openQuickView(card, idx);
            });
            wrap.appendChild(btn);
        });
    }

    /* ================================================
       Toast (replaces forcing the cart drawer open on
       every single add — the drawer is now opt-in)
       ================================================ */
    function showToast(item) {
        let toast = document.getElementById("tomiToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "tomiToast";
            document.body.appendChild(toast);
        }
        toast.innerHTML =
            '<img src="' + item.image + '" alt="">' +
            '<div class="tomi-toast-info"><strong>Added to bag</strong><span>' + item.name + (item.size ? ' · Size ' + item.size : '') + '</span></div>' +
            '<button type="button" id="tomiToastView">View Bag</button>';
        toast.classList.add("show");
        document.getElementById("tomiToastView").addEventListener("click", () => { renderDrawer(); openDrawer(); hideToast(); });
        clearTimeout(toast._timer);
        toast._timer = setTimeout(hideToast, 3200);
    }
    function hideToast() {
        const toast = document.getElementById("tomiToast");
        if (toast) toast.classList.remove("show");
    }

    function closeAllPanels() { closeDrawer(); closeWishDrawer(); closeQuickView(); }

    /* ---------- category filters (only appears where cards carry data-category) ---------- */
    function injectCategoryFilters() {
        document.querySelectorAll(".product-grid").forEach(grid => {
            if (grid.dataset.categoryFiltersInjected) return;
            const cards = Array.from(grid.querySelectorAll(".product-card[data-category]"));
            const cats = [];
            cards.forEach(c => {
                const cat = c.dataset.category;
                if (cat && cats.indexOf(cat) === -1) cats.push(cat);
            });
            if (cats.length < 2) return; // nothing to filter if every card is the same category (or untagged)

            const label = s => s.charAt(0).toUpperCase() + s.slice(1);
            const allCards = Array.from(grid.querySelectorAll(".product-card"));
            const bar = document.createElement("div");
            bar.className = "filter-buttons category-filter";
            bar.innerHTML = '<button type="button" data-cat="all" class="active">All</button>' +
                cats.map(c => '<button type="button" data-cat="' + c + '">' + label(c) + '</button>').join("");
            grid.parentElement.insertBefore(bar, grid);
            grid.dataset.categoryFiltersInjected = "1";

            bar.querySelectorAll("button").forEach(btn => {
                btn.addEventListener("click", () => {
                    bar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    const cat = btn.dataset.cat;
                    allCards.forEach(card => {
                        card.classList.toggle("hide", cat !== "all" && card.dataset.category !== cat);
                    });
                    // a category switch can change which price buckets are relevant —
                    // re-sync the price filter bar (if present) back to "All" so it
                    // doesn't leave stale products hidden under the new category.
                    const priceBar = grid.parentElement.querySelector(".price-filter");
                    if (priceBar) {
                        priceBar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                        priceBar.querySelector("button").classList.add("active");
                    }
                });
            });
        });
    }

    /* ---------- price filters ---------- */
    function injectPriceFilters() {
        document.querySelectorAll(".product-grid").forEach(grid => {
            if (grid.dataset.filtersInjected) return;
            const cards = Array.from(grid.querySelectorAll(".product-card"));
            if (cards.length < 4) return;

            const prices = cards.map(c => {
                const p = c.querySelector("p");
                return parsePrice(p ? p.textContent : "0");
            });

            const ranges = [
                { label: "All", test: () => true },
                { label: "Under 5,000", test: p => p < 5000 },
                { label: "5,000–10,000", test: p => p >= 5000 && p <= 10000 },
                { label: "Over 10,000", test: p => p > 10000 }
            ].filter(r => r.label === "All" || prices.some(p => r.test(p)));

            if (ranges.length <= 1) return;

            const bar = document.createElement("div");
            bar.className = "filter-buttons price-filter";
            bar.innerHTML = ranges.map((r, i) =>
                '<button type="button" data-range="' + i + '" class="' + (i === 0 ? "active" : "") + '">' + r.label + '</button>'
            ).join("");
            grid.parentElement.insertBefore(bar, grid);
            grid.dataset.filtersInjected = "1";

            bar.querySelectorAll("button").forEach((btn, i) => {
                btn.addEventListener("click", () => {
                    bar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    const range = ranges[i];
                    cards.forEach((card, ci) => {
                        // only touch cards that survive the current category filter
                        const catBar = grid.parentElement.querySelector(".category-filter .active");
                        const activeCat = catBar ? catBar.dataset.cat : "all";
                        const catOk = activeCat === "all" || card.dataset.category === activeCat;
                        card.classList.toggle("hide", !catOk || !range.test(prices[ci]));
                    });
                });
            });
        });
    }

    /* ---------- performance ---------- */
    function lazyLoadImages() {
        document.querySelectorAll(".product-card img").forEach(img => {
            if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
            if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
        });
    }

    /* ---------- nav current-page indicator ---------- */
    function markActiveNav() {
        document.querySelectorAll(".nav-links a").forEach(link => {
            const href = link.getAttribute("href");
            if (!href || href.charAt(0) === "#") return;
            const resolved = document.createElement("a");
            resolved.href = href;
            if (resolved.pathname === window.location.pathname) link.classList.add("active");
        });
    }

    /* ---------- add to cart buttons + size pills on the grid ---------- */
    function injectAddToCartButtons() {
        document.querySelectorAll(".product-card").forEach((card, idx) => {
            if (card.querySelector(".add-to-cart-btn")) return;
            const meta = cardMeta(card, idx);
            if (!meta) return;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "add-to-cart-btn";
            btn.textContent = "Add to Cart";
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const sizeWrap = card.querySelector(".size-select");
                let size = null;
                if (sizeWrap) {
                    size = sizeWrap.dataset.selected;
                    if (!size) {
                        sizeWrap.classList.add("size-required");
                        sizeWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        return;
                    }
                }
                const activeImg = card.querySelector(".main-image") || card.querySelector(".slide.active") || card.querySelector("img");
                addItem({
                    id: meta.id + (size ? "|" + size : ""),
                    name: meta.name,
                    size: size,
                    price: meta.price,
                    image: activeImg ? activeImg.getAttribute("src") : meta.image
                });
            });
            card.appendChild(btn);
        });
    }

    function injectSizeSelectors() {
        document.querySelectorAll(".product-card").forEach(card => {
            if (card.querySelector(".size-select")) return;
            const addBtn = card.querySelector(".add-to-cart-btn");
            if (!addBtn) return;
            const h3 = card.querySelector("h3");
            const name = h3 ? h3.textContent.trim() : "";
            const sizes = sizeOptionsForCard(name, window.location.pathname);
            if (!sizes) return;

            const wrap = document.createElement("div");
            wrap.className = "size-select";
            wrap.innerHTML = '<span class="size-label">Size</span>' +
                sizes.map(s => '<button type="button" class="size-pill" data-size="' + s + '">' + s + '</button>').join("");
            card.insertBefore(wrap, addBtn);

            wrap.querySelectorAll(".size-pill").forEach(btn => {
                btn.addEventListener("click", () => {
                    wrap.querySelectorAll(".size-pill").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    wrap.dataset.selected = btn.dataset.size;
                    wrap.classList.remove("size-required");
                });
            });
        });
    }

    document.addEventListener("keydown", e => { if (e.key === "Escape") closeAllPanels(); });

    function init() {
        buildCartUI();
        buildWishlistUI();
        buildQuickViewUI();
        injectAddToCartButtons();
        injectSizeSelectors();
        injectWishlistButtons();
        injectQuickViewButtons();
        injectCategoryFilters();
        injectPriceFilters();
        lazyLoadImages();
        markActiveNav();
        updateBadge();
        updateWishlistBadge();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
