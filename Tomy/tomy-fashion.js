function shopNow() {
    alert("Welcome to Tomy Fashion Collection!");
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
