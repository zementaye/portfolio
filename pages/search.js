function searchProducts() {
    const inputEl = document.getElementById("searchInput");
    if (!inputEl) return;
    const input = inputEl.value.toLowerCase();

    const grid = document.querySelector(".product-grid");
    const products = document.querySelectorAll(".product-card");

    let noResults = document.getElementById("noResults");
    if (!noResults && grid) {
        // Page didn't ship a "no results" element — add one so the
        // empty state is never silently missing.
        noResults = document.createElement("p");
        noResults.id = "noResults";
        noResults.className = "no-results";
        noResults.textContent = "No products match your search.";
        grid.insertAdjacentElement("afterend", noResults);
    }

    let visibleCount = 0;
    products.forEach(function (product) {
        const h3 = product.querySelector("h3");
        const title = h3 ? h3.textContent.toLowerCase() : "";
        if (title.includes(input)) {
            product.classList.remove("hide");
            visibleCount++;
        } else {
            product.classList.add("hide");
        }
    });

    if (noResults) {
        noResults.style.display = visibleCount === 0 ? "block" : "none";
    }
}
