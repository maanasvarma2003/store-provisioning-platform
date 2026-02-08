# Kubernetes Deployment Script
$ErrorActionPreference = "Stop"

Write-Host "Deploying Store Provisioning Platform to Kubernetes..." -ForegroundColor Cyan

# 1. Platform
if (-not (Test-Path "helm/platform/values-local.yaml")) {
    Write-Host "Error: Missing values-local.yaml" -ForegroundColor Red
    exit 1
}

Write-Host "Installing Platform Chart..."
helm upgrade --install platform ./helm/platform `
    --values ./helm/platform/values-local.yaml `
    --namespace platform `
    --create-namespace

# 2. Verify
Write-Host "Verifying Deployment..."
kubectl get pods -n platform

Write-Host "Platform Deployed! Access Dashboard at http://dashboard.127.0.0.1.nip.io" -ForegroundColor Green
