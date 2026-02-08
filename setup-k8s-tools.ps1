# Install K8s Tools
$ErrorActionPreference = "Stop"

Write-Host "Installing Kubernetes Tools..." -ForegroundColor Cyan

# Kubectl
$scoop = "$env:USERPROFILE\scoop\shims\scoop.ps1"
if (-not (Test-Path $scoop)) {
    $scoop = "scoop" # Fallback
}

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "Installing kubectl..."
    Invoke-Expression "& '$scoop' install kubectl"
}

# Helm
if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing helm..."
    Invoke-Expression "& '$scoop' install helm"
}

# Minikube
if (-not (Get-Command minikube -ErrorAction SilentlyContinue)) {
    Write-Host "Installing minikube..."
    Invoke-Expression "& '$scoop' install minikube"
}

Write-Host "Tools Installed." -ForegroundColor Green
minikube version
helm version
kubectl version --client
