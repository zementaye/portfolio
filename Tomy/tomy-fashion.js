function shopNow() {
    alert("Welcome to Tomy Fashion Collection!");
}

// Scroll reveal for sections marked .reveal
if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in");
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
} else {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
}

// Newsletter signup — no backend, so this stores the email locally
// (for a real store this would post to an email service) and gives
// the shopper clear confirmation either way.
const newsletterForm = document.getElementById("newsletterForm");
if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("newsletterEmail");
        const status = document.getElementById("newsletterStatus");
        const email = input.value.trim();
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!validEmail) {
            status.textContent = "Please enter a valid email address.";
            status.className = "newsletter-status error";
            return;
        }

        try {
            const list = JSON.parse(localStorage.getItem("tomiSubscribers") || "[]");
            if (!list.includes(email)) list.push(email);
            localStorage.setItem("tomiSubscribers", JSON.stringify(list));
        } catch (err) { /* localStorage unavailable — still confirm below */ }

        status.textContent = "You're on the list — thanks for subscribing!";
        status.className = "newsletter-status ok";
        newsletterForm.reset();
    });
}
// function changeJordan(imagePath) {
//     document.getElementById("jordan-img").src = imagePath;
// }
document.querySelectorAll(".product-card").forEach(card => {
    const image = card.querySelector(".main-image");
    const colors = card.querySelectorAll(".color");

    colors.forEach(color => {
        color.addEventListener("click", () => {

            // Fade out
            image.style.opacity = "0";

            setTimeout(() => {
                image.src = color.dataset.image;
                image.style.opacity = "1";
            }, 150);

            // Remove active from others
            colors.forEach(c => c.classList.remove("active"));

            // Add active to selected
            color.classList.add("active");
        });
    });
});
