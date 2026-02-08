# Deployment Script for Windows with Docker Compose
# This script deploys the platform using Docker Compose for easy E2E testing

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Store Provisioning Platform - Docker Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Docker is installed
Write-Host "Checking for Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker not found!" -ForegroundColor Red
    Write-Host "`nPlease install Docker Desktop from:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop/`n" -ForegroundColor Cyan
    Write-Host "After installing Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. Start Docker Desktop" -ForegroundColor White
    Write-Host "2. Wait for it to fully start (check system tray)" -ForegroundColor White
    Write-Host "3. Run this script again`n" -ForegroundColor White
    exit 1
}

# Check if Docker is running
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "`nPlease start Docker Desktop and try again.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nStarting platform with Docker Compose..." -ForegroundColor Cyan
Write-Host "This will start:" -ForegroundColor Yellow
Write-Host "  - PostgreSQL database" -ForegroundColor White
Write-Host "  - Redis cache" -ForegroundColor White
Write-Host "  - API service" -ForegroundColor White
Write-Host "  - Orchestrator service" -ForegroundColor White
Write-Host "  - Dashboard UI`n" -ForegroundColor White

# Stop any existing containers
Write-Host "Stopping any existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Start services
Write-Host "Starting services..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Platform started successfully!" -ForegroundColor Green
    
    Write-Host "`nWaiting for services to be healthy..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Platform is Ready!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "Services:" -ForegroundColor Cyan
    Write-Host "  Dashboard:  http://localhost:8080" -ForegroundColor White
    Write-Host "  API:        http://localhost:3000" -ForegroundColor White
    Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor White
    Write-Host "  Redis:      localhost:6379`n" -ForegroundColor White
    
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Update e2e-tests/.env with API_URL=http://localhost:3000" -ForegroundColor White
    Write-Host "  2. Run tests: cd e2e-tests; npm test" -ForegroundColor White
    Write-Host "  3. View logs: docker-compose logs -f`n" -ForegroundColor White
    
    # Open dashboard
    Start-Sleep -Seconds 2
    Write-Host "Opening dashboard..." -ForegroundColor Cyan
    Start-Process "http://localhost:8080"
    
}
else {
    Write-Host "`n❌ Failed to start platform" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs`n" -ForegroundColor Yellow
    exit 1
}
