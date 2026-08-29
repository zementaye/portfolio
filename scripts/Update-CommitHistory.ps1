<#
.SYNOPSIS
    Regenerates COMMIT_HISTORY.md from the real `git log`.

.DESCRIPTION
    Run this from the repo root after pushing. It overwrites
    COMMIT_HISTORY.md with a fresh, accurate log — never hand-edit that
    file directly, since this script will clobber manual edits on the
    next run.

.EXAMPLE
    cd C:\path\to\portfolio
    .\scripts\Update-CommitHistory.ps1
    git add COMMIT_HISTORY.md
    git commit -m "Update commit history"
    git push
#>

$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
if (-not $repoRoot) {
    throw "Not inside a git repository."
}

Push-Location $repoRoot
try {
    $lines = git log --date=short --pretty=format:"- **%ad** %s (%h)"

    $header = @"
# Commit History

Auto-generated from ``git log`` by ``scripts\Update-CommitHistory.ps1``.
Do not hand-edit — re-run the script instead.

"@

    $header + ($lines -join "`n") + "`n" | Set-Content -Path "COMMIT_HISTORY.md" -Encoding UTF8

    Write-Host "COMMIT_HISTORY.md updated with $($lines.Count) commits."
}
finally {
    Pop-Location
}
