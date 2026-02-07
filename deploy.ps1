# Complete Automated Deployment Script for Windows
param(
    [switch]$SkipClusterCreation,
    [switch]$SkipBuild,
    [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Store Provisioning Platform - Automated Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$prerequisites = @{
    "Docker" = { docker --version }
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
    Write-Host "`nMissing prerequisites. Please install:" -ForegroundColor Red
    Write-Host "  Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host "  kind: https://kind.sigs.k8s.io/docs/user/quick-start/#installation" -ForegroundColor White
    Write-Host "  kubectl: https://kubernetes.io/docs/tasks/tools/" -ForegroundColor White
    Write-Host "  Helm: https://helm.sh/docs/intro/install/`n" -ForegroundColor White
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
    
    Write-Host "  Waiting for all pods to be ready..." -ForegroundColor Yellow
    kubectl wait --namespace store-platform --for=condition=ready pod --all --timeout=300s
    
    Write-Host "  All pods ready!" -ForegroundColor Green
}

# Display status
Write-Host "`nDeployment Status:" -ForegroundColor Cyan
kubectl get pods -n store-platform

Write-Host "`nAccess URLs:" -ForegroundColor Cyan
Write-Host "  Dashboard: http://dashboard.127.0.0.1.nip.io" -ForegroundColor Green
Write-Host "  API: http://api.127.0.0.1.nip.io" -ForegroundColor Green
Write-Host "  Health Check: http://api.127.0.0.1.nip.io/health" -ForegroundColor Green

Write-Host "`nDeployment Complete!" -ForegroundColor Green
Write-Host "`nOpening dashboard in browser..." -ForegroundColor Yellow

Start-Sleep -Seconds 5
Start-Process "http://dashboard.127.0.0.1.nip.io"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "PLATFORM IS READY!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
