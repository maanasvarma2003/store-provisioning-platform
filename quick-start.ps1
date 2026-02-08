# 🚀 Quick Start - Store Provisioning Platform
# This script will deploy your platform and show you all the real URLs

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Store Provisioning Platform Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Check Docker
Write-Host "Step 1: Checking Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✅ Docker installed" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Step 2: Check if Docker is running
Write-Host "`nStep 2: Checking if Docker is running..." -ForegroundColor Yellow
$dockerRunning = $false
$attempts = 0
$maxAttempts = 3

while (-not $dockerRunning -and $attempts -lt $maxAttempts) {
    try {
        docker ps | Out-Null
        $dockerRunning = $true
        Write-Host "✅ Docker is running" -ForegroundColor Green
    }
    catch {
        $attempts++
        if ($attempts -lt $maxAttempts) {
            Write-Host "⏳ Docker not running yet. Attempting to start..." -ForegroundColor Yellow
            Write-Host "   Please manually start Docker Desktop if it hasn't started yet." -ForegroundColor Cyan
            Write-Host "   Waiting 15 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 15
        }
    }
}

if (-not $dockerRunning) {
    Write-Host "`n❌ Docker is not running!" -ForegroundColor Red
    Write-Host "`n📌 MANUAL ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "   1. Look for Docker Desktop icon in your system tray" -ForegroundColor White
    Write-Host "   2. Right-click it and select 'Start'" -ForegroundColor White
    Write-Host "   3. Wait for it to show 'Docker Desktop is running'" -ForegroundColor White
    Write-Host "   4. Then run this script again`n" -ForegroundColor White
    
    # Try to open Docker Desktop
    Write-Host "Attempting to open Docker Desktop..." -ForegroundColor Cyan
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
    
    Write-Host "`nWaiting 30 seconds for Docker Desktop to start..." -ForegroundColor Yellow
    Write-Host "(You can close this window and run the script again once Docker is ready)`n" -ForegroundColor Cyan
    exit 1
}

# Step 3: Stop existing containers
Write-Host "`nStep 3: Cleaning up existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null
Write-Host "✅ Cleanup complete" -ForegroundColor Green

# Step 4: Deploy platform
Write-Host "`nStep 4: Deploying platform services..." -ForegroundColor Yellow
Write-Host "   This will build and start:" -ForegroundColor Cyan
Write-Host "   - PostgreSQL database" -ForegroundColor White
Write-Host "   - Redis cache" -ForegroundColor White
Write-Host "   - API service" -ForegroundColor White
Write-Host "   - Orchestrator service" -ForegroundColor White
Write-Host "   - Dashboard UI`n" -ForegroundColor White

docker-compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Services started successfully!" -ForegroundColor Green
    
    # Step 5: Wait for services
    Write-Host "`nStep 5: Waiting for services to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Check service status
    Write-Host "`nService Status:" -ForegroundColor Cyan
    docker-compose ps
    
    # Display URLs
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  🎉 PLATFORM IS READY!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "🌐 REAL URLS TO ACCESS YOUR PLATFORM:`n" -ForegroundColor Cyan
    
    Write-Host "Core Services:" -ForegroundColor Yellow
    Write-Host "  📊 Dashboard:     " -NoNewline -ForegroundColor White
    Write-Host "http://localhost:8080" -ForegroundColor Green
    Write-Host "  🔌 API Service:   " -NoNewline -ForegroundColor White
    Write-Host "http://localhost:3000" -ForegroundColor Green
    Write-Host "  💾 PostgreSQL:    " -NoNewline -ForegroundColor White
    Write-Host "localhost:5432" -ForegroundColor Green
    Write-Host "  ⚡ Redis Cache:   " -NoNewline -ForegroundColor White
    Write-Host "localhost:6379`n" -ForegroundColor Green
    
    Write-Host "When You Create Stores:" -ForegroundColor Yellow
    Write-Host "  🛒 WooCommerce:   " -NoNewline -ForegroundColor White
    Write-Host "http://`{store-name`}.127.0.0.1.nip.io" -ForegroundColor Green
    Write-Host "  👨‍💼 WooCommerce Admin: " -NoNewline -ForegroundColor White
    Write-Host "http://`{store-name`}.127.0.0.1.nip.io/wp-admin" -ForegroundColor Green
    Write-Host "  🏬 Medusa Store:  " -NoNewline -ForegroundColor White
    Write-Host "http://`{store-name`}.127.0.0.1.nip.io" -ForegroundColor Green
    Write-Host "  🎛️  Medusa Admin:  " -NoNewline -ForegroundColor White
    Write-Host "http://`{store-name`}-admin.127.0.0.1.nip.io`n" -ForegroundColor Green
    
    Write-Host "📝 Quick Start Guide:" -ForegroundColor Yellow
    Write-Host "  1. Dashboard will open automatically" -ForegroundColor White
    Write-Host "  2. Click 'Create Store' button" -ForegroundColor White
    Write-Host "  3. Choose WooCommerce or Medusa" -ForegroundColor White
    Write-Host "  4. Wait 5-15 minutes for provisioning" -ForegroundColor White
    Write-Host "  5. Access your store at the URL shown`n" -ForegroundColor White
    
    Write-Host "🔍 Useful Commands:" -ForegroundColor Yellow
    Write-Host "  View logs:        " -NoNewline -ForegroundColor White
    Write-Host "docker-compose logs -f" -ForegroundColor Cyan
    Write-Host "  Restart services: " -NoNewline -ForegroundColor White
    Write-Host "docker-compose restart" -ForegroundColor Cyan
    Write-Host "  Stop platform:    " -NoNewline -ForegroundColor White
    Write-Host "docker-compose down" -ForegroundColor Cyan
    Write-Host "  Service status:   " -NoNewline -ForegroundColor White
    Write-Host "docker-compose ps`n" -ForegroundColor Cyan
    
    Write-Host "========================================`n" -ForegroundColor Green
    
    # Open dashboard
    Write-Host "Opening dashboard in your browser..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:8080"
    
    Write-Host "`n✅ All set! Your platform is running!" -ForegroundColor Green
    Write-Host "Press any key to view service logs (Ctrl+C to exit)...`n" -ForegroundColor Yellow
    
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    docker-compose logs -f
    
}
else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Showing logs...`n" -ForegroundColor Yellow
    docker-compose logs --tail=50
    Write-Host "`nTry running: docker-compose logs" -ForegroundColor Cyan
    exit 1
}
