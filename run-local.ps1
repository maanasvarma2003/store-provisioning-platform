# Local Development Setup (No Docker Required)
# This script runs all services locally for development

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Store Provisioning Platform - Local Dev" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Starting services locally (development mode)..." -ForegroundColor Yellow
Write-Host "Note: This runs services without Kubernetes/Docker`n" -ForegroundColor Yellow

# Check if PostgreSQL and Redis are needed
Write-Host "IMPORTANT: You need PostgreSQL and Redis running." -ForegroundColor Yellow
Write-Host "Options:" -ForegroundColor Cyan
Write-Host "  1. Install locally (PostgreSQL + Redis)" -ForegroundColor White
Write-Host "  2. Use Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16" -ForegroundColor White
Write-Host "  3. Use cloud services (ElephantSQL, Redis Cloud)`n" -ForegroundColor White

$continue = "y"
if (-not $env:SKIP_DB_CHECK) {
    $continue = Read-Host "Do you have PostgreSQL and Redis running? (y/N)"
}

if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "`nPlease start PostgreSQL and Redis first, then run this script again.`n" -ForegroundColor Red
    exit 1
}

# Start API Service
Write-Host "Starting API Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd api; npm run dev"

# Start Orchestrator Service
Write-Host "Starting Orchestrator Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd orchestrator; npm run dev"

# Start Dashboard (Vite dev server)
Write-Host "`nStarting Dashboard (Vite)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd dashboard; npm run dev"

Write-Host "Dashboard will be available at: http://localhost:5173`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Green
Write-Host "All Services Started!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Access the dashboard at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API running at: http://localhost:3000" -ForegroundColor Cyan

# Open browser
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"
