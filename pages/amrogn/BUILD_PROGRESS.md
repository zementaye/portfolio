# Scroll "build your plate" animation: progress & handoff

Home page (`amrogn.html`) has a pinned scroll section `#build`. Ingredients drop onto a plate one by one as the visitor scrolls.

## How it works
- `build.js` finds every `<div class="layer">` inside `#build .dish`, in DOM order (bottom to top).
- Each layer = one scroll step. Step count, section height and caption dots adapt automatically. **No JS change is needed to add a layer.**
- Layer attributes: `data-title` (caption heading), `data-text` (caption text).
- Each layer is an inline SVG with `viewBox="0 0 520 400"` (same box as the plate). Draw it where it should land on the plate: well centre is about (260, 222), well radii about 184 x 110.
- `build.css` holds the styling. `prefers-reduced-motion` shows the finished dish, unpinned.
- Layers are original SVG illustrations. The only dish photo, `Pictures/amrogn_head.png`, is 336x251, too small to cut up.

## Status
- [x] Batch 1: engine + plate
- [x] Batch 2: rice (900 generated grains, mound centred about (262, 192))
- [x] Batch 3: chicken (2 grilled/fried pieces, golden-brown with dark char, sitting on the right of the rice, overlapping it)
- [x] Batch 4: veggies (orange carrot sticks + a cucumber wedge, tucked on the rice's top/right edge)
- [x] Batch 5: sauces (orange/red stew sauce pooled on the left of the plate + a white yogurt dollop), then final polish: optional end crossfade to the real photo, check mobile, check reduced motion

## Rules of the project (full version in CLAUDE.md, read it first)
- Palette variables are in `amrogn.css` (:root). Don't change the existing site design.
- Work in small batches. After each batch: screenshot at ~0.2/0.45/0.9/1.0 scroll on desktop (1280x800) and mobile (390x800), check for console errors, then re-zip the FULL project.
- Delivery: rename the zip every time (`amrogn-chicken-batchN.zip`, never reuse a name), send the full project zip AND paste the full PowerShell script (unzip, copy, commit, push) in the chat. Never "same as before".

## ALL BATCHES DONE
Animation complete: plate, rice, chicken, veggies, sauces. Ideas if wanted later: swap SVG layers for real PNG cut-outs, add a subtle steam/glow at the end.
