// Scroll-driven "build your plate" animation (Home page).
// Each <div class="layer"> inside #build is one step. Layers drop in one after
// another as the visitor scrolls. To add a new step, add a layer in the HTML —
// no changes needed here.
(function () {
    var sec = document.getElementById('build');
    if (!sec) return;

    var stage = sec.querySelector('.build-stage');
    var layers = [].slice.call(sec.querySelectorAll('.layer'));
    var capTitle = sec.querySelector('.build-step-title');
    var capText = sec.querySelector('.build-step-text');
    var dotsBox = sec.querySelector('.build-dots');
    var N = layers.length;
    if (!N) return;
    var parts = layers.map(function (l) { return [].slice.call(l.querySelectorAll('.part')); });

    var HOLD = 0.2;      // share of each step's scroll slot where the layer rests
    var SCROLL_PER_STEP = 0.9; // viewport heights of scrolling per step

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    // Fast fall with a small settle at the end.
    function easeOutBack(t) {
        var c1 = 1.2, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    // Dots + first caption
    var dots = layers.map(function (l, i) {
        var d = document.createElement('span');
        d.className = 'build-dot';
        dotsBox.appendChild(d);
        return d;
    });

    var activeIdx = -1;
    function setCaption(i) {
        if (i === activeIdx) return;
        activeIdx = i;
        var l = layers[i];
        capTitle.textContent = l.getAttribute('data-title') || '';
        capText.textContent = l.getAttribute('data-text') || '';
        dots.forEach(function (d, k) { d.classList.toggle('on', k <= i); });
        capTitle.parentNode.classList.remove('swap');
        void capTitle.parentNode.offsetWidth; // restart CSS animation
        capTitle.parentNode.classList.add('swap');
    }

    function render(p) {
        layers.forEach(function (l, i) {
            var start = i / N;
            var len = (1 / N) * (1 - HOLD);
            var t = clamp((p - start) / len, 0, 1);
            var e = easeOutBack(t);
            // Photo layers: animate each .part on its own (staggered drops, sauce wipe).
            var ps = parts[i];
            if (ps.length) {
                l.style.opacity = t > 0 ? 1 : 0;
                l.style.transform = 'none';
                ps.forEach(function (el) {
                    var d = parseFloat(el.getAttribute('data-delay')) || 0;
                    var pt = clamp((t - d) / (1 - d), 0, 1);
                    var base = parseFloat(el.getAttribute('data-rot')) || 0;
                    var flip = el.getAttribute('data-flip') === '1' ? -1 : 1;
                    if (el.getAttribute('data-anim') === 'wipe') {
                        // Sauce sweeps across the food from left to right.
                        var w = 1 - Math.pow(1 - pt, 3);
                        el.style.opacity = pt > 0 ? 1 : 0;
                        el.style.clipPath = 'inset(0 ' + ((1 - w) * 100) + '% 0 0)';
                        el.style.transform = 'translate3d(' + ((1 - w) * -10) + '%,' + ((1 - w) * -14) + '%,0) rotate(' + base + 'deg) scale(' + (1 + (1 - w) * 0.12) + ')';
                    } else {
                        var pe = easeOutBack(pt);
                        var k = 1 + (1 - pe) * 0.14;
                        el.style.opacity = clamp(pt * 4, 0, 1);
                        el.style.transform = 'translate3d(0,' + ((1 - pe) * -150) + '%,0) rotate(' +
                            (base + (1 - pe) * (i % 2 ? 14 : -14)) + 'deg) scale(' + (flip * k) + ',' + k + ')';
                    }
                });
                return;
            }

            var dy = (1 - e) * -90;          // % of the dish height, falls from above
            var rot = (1 - e) * (i % 2 ? 6 : -6);
            var sc = 1 + (1 - e) * 0.18;
            l.style.opacity = clamp(t * 4, 0, 1);
            l.style.transform = 'translate3d(0,' + dy + '%,0) rotate(' + rot + 'deg) scale(' + sc + ')';
        });
        sec.classList.toggle('is-done', p > 0.97);
        setCaption(clamp(Math.floor(p * N), 0, N - 1));
    }

    function progress() {
        var r = sec.getBoundingClientRect();
        var total = r.height - window.innerHeight;
        return total > 0 ? clamp(-r.top / total, 0, 1) : 1;
    }

    if (reduce) {
        // No pinning, no motion: show the finished dish.
        sec.classList.add('is-static');
        render(1);
        return;
    }

    sec.style.height = ((N * SCROLL_PER_STEP + 1) * 100) + 'vh';

    var ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
            ticking = false;
            render(progress());
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    render(progress());
})();
