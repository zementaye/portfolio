# CLAUDE.md: rules for working on the Amrogn Chicken site

Read this file first, then `BUILD_PROGRESS.md`, then `Claude_Zemen.md` and `AGENTS.md` if they exist. Follow them.

## Project
- Static site: HTML + CSS + vanilla JS. No build step.
- Pages: `amrogn.html` (home), `menu.html`, `branches.html`, `contact.html`.
- Styles: `amrogn.css` (shared, palette in `:root`), `menu.css`, `build.css` (scroll animation). Scripts: `amrogn.js`, `build.js`.
- Don't change the existing site design or palette.

## Paths (user's Windows machine)
- Local project / git folder: `C:\Users\HP\portfolio\pages\amrogn` (inside the `C:\Users\HP\portfolio` git repo)
- Downloaded zips are in: `D:\Chrome_Downloads`
- Live site: https://portfolio-nine-zeta-0dmm3xfld8.vercel.app/pages/amrogn/amrogn.html

## How to work
1. Work in SMALL BATCHES (one batch per reply) because of token limits.
2. After each batch: screenshot the result (desktop 1280x800 and mobile 390x800) and check for console errors before delivering.
3. Update the checklist in `BUILD_PROGRESS.md` after every batch.

## How to deliver (every batch, no exceptions)
1. Send the ENTIRE project as a zip, not just the changed files. Folder `amrogn-chicken-main/` inside the zip stays the same, but ALWAYS RENAME THE ZIP FILE for every delivery with the batch number: `amrogn-chicken-batch4.zip`, `amrogn-chicken-batch5.zip`, and so on. A repeated name makes the browser save `(1)`, `(2)`, which breaks the script. The PowerShell script must use the exact new zip name.
2. Paste the ENTIRE PowerShell script in the chat message (code block), never "same steps as before". Use exactly this:

```powershell
$repo = "C:\Users\HP\portfolio\pages\amrogn"
$zip  = "D:\Chrome_Downloads\amrogn-chicken-batchN.zip"   # N = this batch's number, new name every time
$tmp  = Join-Path $env:TEMP "amrogn-unzip"

if (-not (Test-Path $zip)) { Write-Error "Zip not found: $zip"; return }

if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $tmp -Force

Copy-Item -Path (Join-Path $tmp "amrogn-chicken-main\*") -Destination $repo -Recurse -Force

Set-Location $repo
git add .
git status --short
git commit -m "<short message for this batch>"
git push
```

3. If a batch needs a SQL file, paste its full contents in the chat too (none so far).
4. End every reply with a HANDOFF PROMPT the user can paste into a new chat (with the latest zip) if tokens run out. It must say: read CLAUDE.md and BUILD_PROGRESS.md, do the next unchecked batch only, and follow these delivery rules.
