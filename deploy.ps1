# Complete Automated Deployment Script for Windows
# Usage: .\deploy.ps1                    # Full K8s (kind + Helm) deploy
#        .\deploy.ps1 -UseDockerCompose   # Docker Compose only (no Kubernetes)
param(
    [switch]$SkipClusterCreation,
    [switch]$SkipBuild,
    [switch]$SkipDeploy,
    [switch]$UseDockerCompose
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Store Provisioning Platform - Automated Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Docker (required for both modes)
try {
    $null = docker --version 2>&1
    Write-Host "  OK Docker installed" -ForegroundColor Green
} catch {
    Write-Host "  ERROR Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

if ($UseDockerCompose) {
    Write-Host "`nMode: Docker Compose (no Kubernetes)`n" -ForegroundColor Cyan
    Write-Host "Building images..." -ForegroundColor Yellow
    docker build -t store-platform/api:latest ./api
    docker build -t store-platform/dashboard:latest ./dashboard
    docker build -t store-platform/orchestrator:latest ./orchestrator
    Write-Host "Starting services..." -ForegroundColor Yellow
    docker-compose up -d
    Write-Host "Waiting for API to be ready..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { break }
        } catch { }
        $attempt++
        Start-Sleep -Seconds 2
    }
    if ($attempt -ge $maxAttempts) {
        Write-Host "  API did not become ready in time. Check: docker-compose logs api" -ForegroundColor Yellow
    } else {
        Write-Host "  API is ready!" -ForegroundColor Green
    }
    Write-Host "`nAccess URLs:" -ForegroundColor Cyan
    Write-Host "  Dashboard: http://localhost:8080" -ForegroundColor Green
    Write-Host "  API:       http://localhost:3000" -ForegroundColor Green
    Write-Host "`nOpening dashboard..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:8080"
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "PLATFORM IS READY (Docker Compose)!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    exit 0
}

# Kubernetes path: check prerequisites
$prerequisites = @{
    "kind" = { kind version }
    "kubectl" = { kubectl version --client }
    "helm" = { helm version }
}
$allPrereqsMet = $true
foreach ($prereq in $prerequisites.GetEnumerator()) {
    try {
        $null = & $prereq.Value 2>&1
        Write-Host "  OK $($prereq.Key) installed" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR $($prereq.Key) not found" -ForegroundColor Red
        $allPrereqsMet = $false
    }
}
if (-not $allPrereqsMet) {
    Write-Host "`nFor Kubernetes deploy, install: kind, kubectl, Helm." -ForegroundColor Red
    Write-Host "Or run with -UseDockerCompose for Docker Compose only.`n" -ForegroundColor Yellow
    exit 1
}

# Step 1: Create kind cluster
if (-not $SkipClusterCreation) {
    Write-Host "`nStep 1: Creating kind cluster..." -ForegroundColor Cyan
    
    $existingCluster = kind get clusters 2>&1 | Select-String "store-platform"
    
    if ($existingCluster) {
        Write-Host "  Cluster 'store-platform' already exists" -ForegroundColor Yellow
        Write-Host "  Using existing cluster" -ForegroundColor Green
    } else {
        Write-Host "  Creating cluster with ingress support..." -ForegroundColor Yellow
        kind create cluster --name store-platform --config kind-config.yaml
        Write-Host "  Cluster created successfully!" -ForegroundColor Green
        
        Write-Host "  Installing NGINX Ingress Controller..." -ForegroundColor Yellow
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
        
        Write-Host "  Waiting for ingress controller to be ready..." -ForegroundColor Yellow
        kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=300s
        
        Write-Host "  Ingress controller ready!" -ForegroundColor Green
    }
}

# Step 2: Build Docker images
if (-not $SkipBuild) {
    Write-Host "`nStep 2: Building Docker images..." -ForegroundColor Cyan
    
    $images = @(
        @{Name="API"; Path="api"; Tag="store-platform/api:latest"}
        @{Name="Orchestrator"; Path="orchestrator"; Tag="store-platform/orchestrator:latest"}
        @{Name="Dashboard"; Path="dashboard"; Tag="store-platform/dashboard:latest"}
    )
    
    foreach ($image in $images) {
        Write-Host "  Building $($image.Name)..." -ForegroundColor Yellow
        docker build -t $image.Tag $image.Path
        
        Write-Host "  Loading $($image.Name) into kind..." -ForegroundColor Yellow
        kind load docker-image $image.Tag --name store-platform
        
        Write-Host "  $($image.Name) ready!" -ForegroundColor Green
    }
}

# Step 3: Deploy platform
if (-not $SkipDeploy) {
    Write-Host "`nStep 3: Deploying platform..." -ForegroundColor Cyan
    
    Write-Host "  Creating namespace..." -ForegroundColor Yellow
    kubectl create namespace store-platform --dry-run=client -o yaml | kubectl apply -f -
    
    Write-Host "  Deploying with Helm..." -ForegroundColor Yellow
    helm upgrade --install platform ./helm/platform -f ./helm/values-local.yaml --namespace store-platform --create-namespace --wait --timeout 10m
    
    Write-Host "  Platform deployed!" -ForegroundColor Green
    
    Write-Host "  Waiting for pods to be ready..." -ForegroundColor Yellow
    kubectl wait --namespace store-platform --for=condition=ready pod -l app=api --timeout=120s 2>$null
    kubectl wait --namespace store-platform --for=condition=ready pod -l app=dashboard --timeout=120s 2>$null
    Write-Host "  Core pods ready!" -ForegroundColor Green
}

# Display status
Write-Host "`nDeployment Status:" -ForegroundColor Cyan
kubectl get pods -n store-platform 2>$null

Write-Host "`nWaiting for API to respond..." -ForegroundColor Yellow
$apiUrl = "http://api.127.0.0.1.nip.io/health"
$maxAttempts = 40
$attempt = 0
while ($attempt -lt $maxAttempts) {
    try {
        $r = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            Write-Host "  API is healthy!" -ForegroundColor Green
            break
        }
    } catch { }
    $attempt++
    Start-Sleep -Seconds 3
}
if ($attempt -ge $maxAttempts) {
    Write-Host "  API not yet reachable. Ingress may need a moment. Try: kubectl get pods -n store-platform" -ForegroundColor Yellow
}

Write-Host "`nAccess URLs:" -ForegroundColor Cyan
Write-Host "  Dashboard: http://dashboard.127.0.0.1.nip.io" -ForegroundColor Green
Write-Host "  API: http://api.127.0.0.1.nip.io" -ForegroundColor Green
Write-Host "  Health: http://api.127.0.0.1.nip.io/health" -ForegroundColor Green

Write-Host "`nDeployment Complete!" -ForegroundColor Green
Write-Host "`nOpening dashboard in browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://dashboard.127.0.0.1.nip.io"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "PLATFORM IS READY!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
