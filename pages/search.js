function searchProducts() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    let products = document.querySelectorAll(".product-card");
    let noResults = document.getElementById("noResults");

    let visibleCount = 0;

    products.forEach(function(product) {
        let title = product.querySelector("h3").textContent.toLowerCase();

        if (title.includes(input)) {
            product.classList.remove("hide");
            visibleCount++;
        } else {
            product.classList.add("hide");
        }
    });

    if (visibleCount === 0) {
        noResults.style.display = "block";
    } else {
        noResults.style.display = "none";
    }
}

