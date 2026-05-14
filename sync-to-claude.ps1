# sync-to-claude.ps1
# Syncs the LLM BS Detector project files to a Claude project folder
# for upload to claude.ai project knowledge.
#
# Usage:
#   PowerShell -ExecutionPolicy Bypass -File C:\Dev\llm-bs-detector\sync-to-claude.ps1
#
# Or, after running: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
#   .\sync-to-claude.ps1
#
# Prerequisites:
#   - Set $claudeProjectFolder below to your Claude project sync folder
#   - All project files must exist (this script does NOT push placeholders)

# ---- Configuration ----
$projectRoot = "C:\Dev\llm-bs-detector"

# CHANGE THIS PATH to your Claude project sync folder.
# This is wherever you keep files you upload to Claude's project knowledge.
$claudeProjectFolder = "C:\Dev\llm-bs-detector\SyncFile"

# ---- Files to sync ----
# Listed explicitly. Each file must exist and be non-empty for the sync
# to include it. No globs, no surprises.
$filesToSync = @(
    "manifest.json",
    "detector.js",
    "content.js",
    "background.js",           
    "panel.html",
    "panel.css",
    "panel.js",
    "README.md",
    "BUGS.md",
    "BUILD.md",
    "LICENSE",
    "PRIVACY.md"  
)

# ---- Sync logic ----
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  LLM BS Detector - Claude Project Sync" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source: $projectRoot"
Write-Host "Target: $claudeProjectFolder"
Write-Host ""

# Create target folder if missing
if (-not (Test-Path $claudeProjectFolder)) {
    Write-Host "Creating target folder..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $claudeProjectFolder | Out-Null
}

# Validate source files
$missing = @()
$empty = @()
$valid = @()

foreach ($file in $filesToSync) {
    $sourcePath = Join-Path $projectRoot $file
    if (-not (Test-Path $sourcePath)) {
        $missing += $file
    } elseif ((Get-Item $sourcePath).Length -eq 0) {
        $empty += $file
    } else {
        $valid += $file
    }
}

# Report problems before doing anything
if ($missing.Count -gt 0) {
    Write-Host "MISSING FILES (will not sync):" -ForegroundColor Red
    foreach ($f in $missing) {
        Write-Host "  - $f" -ForegroundColor Red
    }
    Write-Host ""
}

if ($empty.Count -gt 0) {
    Write-Host "EMPTY FILES (will not sync - placeholders detected):" -ForegroundColor Red
    foreach ($f in $empty) {
        Write-Host "  - $f" -ForegroundColor Red
    }
    Write-Host ""
}

if ($valid.Count -eq 0) {
    Write-Host "No valid files to sync. Aborting." -ForegroundColor Red
    exit 1
}

# Copy valid files
Write-Host "Syncing $($valid.Count) files..." -ForegroundColor Green
Write-Host ""

$totalBytes = 0
foreach ($file in $valid) {
    $sourcePath = Join-Path $projectRoot $file
    $targetPath = Join-Path $claudeProjectFolder $file
    $size = (Get-Item $sourcePath).Length
    $totalBytes += $size

    Copy-Item -Force $sourcePath $targetPath
    $line = "  OK  {0,-20} ({1,7:N0} bytes)" -f $file, $size
    Write-Host $line -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
$summary = "  Synced: {0} files, {1:N0} bytes total" -f $valid.Count, $totalBytes
Write-Host $summary -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($missing.Count -gt 0 -or $empty.Count -gt 0) {
    $skipped = $missing.Count + $empty.Count
    Write-Host "Note: $skipped files were skipped due to issues above." -ForegroundColor Yellow
    Write-Host "Fix those before next sync if they should be included." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  1. File Explorer will open to the staging folder in a moment"
Write-Host "  2. In your browser, open claude.ai -> LLM BS Detector project"
Write-Host "  3. Open the Project knowledge panel"
Write-Host "  4. Drag all files from the staging folder into Project knowledge"
Write-Host ""

# Open the target folder in File Explorer
Start-Sleep -Seconds 2
explorer.exe $claudeProjectFolder
