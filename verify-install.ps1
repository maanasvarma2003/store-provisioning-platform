# Installation Verification Script
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Store Provisioning Platform - Installation Status" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if monorepo node_modules exists
$monoRepoModules = Test-Path "node_modules"

# Check API
Write-Host "API Service:" -ForegroundColor Yellow
$apiModules = (Test-Path "api/node_modules") -or $monoRepoModules
if ($apiModules) {
    Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Dependencies missing" -ForegroundColor Red
}

if (Test-Path "api/.env") {
    Write-Host "  ✅ Environment file created" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Environment file missing" -ForegroundColor Red
}

$prismaClient = (Test-Path "api/node_modules/@prisma/client") -or (Test-Path "node_modules/@prisma/client")
if ($prismaClient) {
    Write-Host "  ✅ Prisma Client generated" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Prisma Client not generated" -ForegroundColor Red
}

# Check Orchestrator
Write-Host "`nOrchestrator Service:" -ForegroundColor Yellow
$orchModules = (Test-Path "orchestrator/node_modules") -or $monoRepoModules
if ($orchModules) {
    Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Dependencies missing" -ForegroundColor Red
}

if (Test-Path "orchestrator/.env") {
    Write-Host "  ✅ Environment file created" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Environment file missing" -ForegroundColor Red
}

# Check Dashboard
Write-Host "`nDashboard:" -ForegroundColor Yellow
$dashModules = (Test-Path "dashboard/node_modules") -or $monoRepoModules
if ($dashModules) {
    Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Dependencies missing" -ForegroundColor Red
}

if (Test-Path "dashboard/.env") {
    Write-Host "  ✅ Environment file created" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Environment file missing" -ForegroundColor Red
}

# Check key dependencies
Write-Host "`nKey Dependencies:" -ForegroundColor Yellow
$hasExpress = Test-Path "node_modules/express"
$hasReact = Test-Path "node_modules/react"
$hasK8sClient = Test-Path "node_modules/@kubernetes"

if ($hasExpress) { Write-Host "  ✅ Express installed" -ForegroundColor Green }
if ($hasReact) { Write-Host "  ✅ React installed" -ForegroundColor Green }
if ($hasK8sClient) { Write-Host "  ✅ Kubernetes client installed" -ForegroundColor Green }

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Installation Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allGood = $apiModules -and $orchModules -and $dashModules -and
(Test-Path "api/.env") -and
(Test-Path "orchestrator/.env") -and
(Test-Path "dashboard/.env") -and
$prismaClient

if ($allGood) {
    Write-Host "✅ All dependencies installed successfully!" -ForegroundColor Green
    Write-Host "`nInstallation Details:" -ForegroundColor Cyan
    Write-Host "  • Monorepo structure: node_modules at root" -ForegroundColor White
    Write-Host "  • Total packages: $(Get-ChildItem node_modules -Directory | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor White
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Ensure Docker Desktop is running" -ForegroundColor White
    Write-Host "  2. Ensure kind is installed (kind version)" -ForegroundColor White
    Write-Host "  3. Run: make local-up" -ForegroundColor White
    Write-Host "  4. Run: make build" -ForegroundColor White
    Write-Host "  5. Run: make deploy" -ForegroundColor White
    Write-Host "  6. Access: http://dashboard.127.0.0.1.nip.io`n" -ForegroundColor White
}
else {
    Write-Host "❌ Some dependencies are missing. Please check above." -ForegroundColor Red
    Write-Host "`nTry running:" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor White
    Write-Host "  cd api; npx prisma generate`n" -ForegroundColor White
}
