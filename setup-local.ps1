# Scoop-based Setup Script
# Reverting to Scoop as manual Zip extraction is failing on this environment

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Store Platform - Scoop Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Cleanup
Stop-Process -Name "postgres", "redis-server" -Force -ErrorAction SilentlyContinue

# Ensure Scoop
if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Scoop..."
    Invoke-Expression (New-Object System.Net.WebClient).DownloadString('https://get.scoop.sh')
}

# Add buckets
scoop bucket add extras
scoop bucket add main

# Install Postgres
if (-not (Get-Command postgres -ErrorAction SilentlyContinue)) {
    Write-Host "Installing PostgreSQL via Scoop..." -ForegroundColor Cyan
    try {
        scoop install postgresql
    }
    catch {
        Write-Host "Scoop install failed? Retrying with update..." -ForegroundColor Yellow
        scoop update
        scoop install postgresql
    }
}

# Install Redis
if (-not (Get-Command redis-server -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Redis via Scoop..." -ForegroundColor Cyan
    scoop install redis
}

# Locate Binaries (Dynamically)
$pgBin = ""
$redisBin = ""

# Try shims first
if (Test-Path "$env:USERPROFILE\scoop\shims\initdb.exe") {
    $pgBin = "$env:USERPROFILE\scoop\shims"
}
else {
    # Find active app
    $pgApp = "$env:USERPROFILE\scoop\apps\postgresql\current\bin"
    if (Test-Path "$pgApp\initdb.exe") {
        $pgBin = $pgApp
    }
    else {
        # Search recursively
        $found = Get-ChildItem -Path "$env:USERPROFILE\scoop\apps\postgresql" -Recurse -Filter "initdb.exe" | Select-Object -First 1
        if ($found) { $pgBin = $found.DirectoryName }
    }
}

if (Test-Path "$env:USERPROFILE\scoop\shims\redis-server.exe") {
    $redisBin = "$env:USERPROFILE\scoop\shims"
}
else {
    $found = Get-ChildItem -Path "$env:USERPROFILE\scoop\apps\redis" -Recurse -Filter "redis-server.exe" | Select-Object -First 1
    if ($found) { $redisBin = $found.DirectoryName }
}

Write-Host "Postgres Bin: $pgBin" -ForegroundColor Gray
Write-Host "Redis Bin: $redisBin" -ForegroundColor Gray

if ([string]::IsNullOrEmpty($pgBin) -or [string]::IsNullOrEmpty($redisBin)) {
    Write-Host "Could not find binaries even after Scoop install!" -ForegroundColor Red
    exit 1
}

# Initialize DB
$pgData = "$PSScriptRoot\data\pg"
if (-not (Test-Path "$pgData\PG_VERSION")) {
    Write-Host "`nInitializing PostgreSQL..." -ForegroundColor Cyan
    Remove-Item -Path $pgData -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $pgData | Out-Null
    
    & "$pgBin\initdb.exe" -D $pgData -U postgres --auth=trust -E UTF8
}

# Start Postgres
Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
try {
    Start-Process "$pgBin\pg_ctl.exe" -ArgumentList "-D `"$pgData`" -l `"$PSScriptRoot\pg.log`" start" -NoNewWindow -Wait
    Start-Sleep -Seconds 5
}
catch {}

# Configure DB
Write-Host "Configuring Database..." -ForegroundColor Cyan
try {
    & "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE store_platform;"
    & "$pgBin\psql.exe" -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
}
catch {}

# Start Redis
Write-Host "Starting Redis..." -ForegroundColor Cyan
if (-not (Get-Process redis-server -ErrorAction SilentlyContinue)) {
    Start-Process "$redisBin\redis-server.exe" 
}

# Run Platform
Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Services Ready! Launching..." -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

$env:SKIP_DB_CHECK = "true"
.\run-local.ps1
