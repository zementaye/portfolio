# CLAUDE.md — Working rules for this project

This file documents how Claude and the project owner work together on this
repo. Read this first in any new session before making changes.

## Project basics

- GitHub repo: https://github.com/zementaye/portfolio (branch: `main`)
- Local folder: `C:\Users\HP\portfolio`
- Downloads folder (where delivered zips land, not the Windows default): `D:\Chrome_Downloads` — use this instead of `$env:USERPROFILE\Downloads` in all commands below.
- This repo is a portfolio monorepo: Tomy Fashion (`Tomy/`, Flask +
  MongoDB Atlas admin backend, deployed on Render at
  `tomy-k4ad.onrender.com`), plus other sub-projects (`IStore/`, `pages/`
  including `amrogn/`, etc.) all living side by side under one repo.
- Tomy's admin backend (`Tomy/admin-backend/`) auto-deploys on Render from
  `main` if auto-deploy is enabled — otherwise trigger a manual deploy from
  the Render dashboard after pushing.

## The shell is always PowerShell

Every command given for local execution — from unzipping a delivered file
all the way through to `git push` — must be **PowerShell**, never
bash/cmd/WSL syntax. That covers things like:

- `Expand-Archive` (not `unzip`)
- `Copy-Item` (not `cp`)
- `Remove-Item` (not `rm`)
- `D:\Chrome_Downloads\...` style paths for downloaded zips (this machine's
  Chrome saves to a custom location, not the Windows default
  `$env:USERPROFILE\Downloads`)

## The end-to-end push workflow

When Claude makes code changes in a session, the deliverable is a zip
containing only the changed files (preserving their folder structure, e.g.
`portfolio-main/Tomy/admin.js`). The standard flow to get that into the
real repo is:

```powershell
cd C:\Users\HP\portfolio

# 1. Unzip the delivered file (adjust the filename to match what was downloaded)
Expand-Archive -Path "D:\Chrome_Downloads\<name>.zip" -DestinationPath "D:\Chrome_Downloads\<name>" -Force

# 2. Copy only the changed files over (one Copy-Item per file, matching folders)
Copy-Item "D:\Chrome_Downloads\<name>\<path\to\file>" -Destination .\<path\to\> -Force

# 3. Review before committing
git status
git diff

# 4. Commit and push
git add <changed files>
git commit -m "<clear, specific message>"
git push
```

Rules for this flow:

- Claude always lists out the exact `Copy-Item` commands for each changed
  file — never a blind folder copy that could overwrite unrelated files.
- Each delivered zip gets a unique filename — never reuse the same zip name
  across deliverables in a session or across sessions, so old downloads in
  Downloads don't get confused with new ones.
- Review `git diff` before committing. Claude should tell you what to look
  for if it isn't obvious.
- Commit messages are short, specific, and describe the change (not
  "update files").
- The `LF will be replaced by CRLF` warnings from Git on Windows are
  harmless and can be ignored.
- After `git diff`, press `q` to exit the pager if it opens one.

## History tracking

- **`COMMIT_HISTORY.md`** — a plain log of git commits with dates. It's
  regenerated from the real `git log`, never hand-typed, so it's always
  accurate. Run `scripts/Update-CommitHistory.ps1` after pushing to refresh
  it, then commit that file too (small follow-up commit is fine).

When asked to "remember" a rule or convention going forward, it goes in
*this* file (CLAUDE.md), not a chat log — CLAUDE.md is the rulebook.

## Other conventions established so far

- New features get their own zip deliverable containing only the files that
  changed — not the whole project — so `git diff` stays reviewable.
- Pricing on Tomy product cards is computed by `priceDisplayHTML()` in
  `Tomy/products-api.js`, shared between the storefront and the admin
  editor's live preview — never duplicate that logic elsewhere.
- On the Tomy admin editor, "Old price" auto-locks to the product's
  pre-edit price once a product exists (read-only) — only "Price" is meant
  to be edited to create a discount. See `Tomy/admin.js` (`lockOldPrice` /
  `unlockOldPrice`) if this needs revisiting.
