# Kubernetes Setup Guide

This guide explains how to run the Store Provisioning Platform on a local Kubernetes cluster (Minikube).

## Prerequisites
- **Minikube** (Installed via `setup-k8s-tools.ps1`)
- **Helm** (Installed via `setup-k8s-tools.ps1`)
- **Docker** (Required for Minikube `docker` driver, or enable Hyper-V for `hyperv` driver)

## Quick Start

1. **Start Minikube**:
   ```powershell
   minikube start --driver=hyperv --memory=4096 --cpus=2
   minikube addons enable ingress
   ```

2. **Deploy Platform**:
   ```powershell
   .\deploy_k8s.ps1
   ```

3. **Access**:
   - Dashboard: `http://dashboard.127.0.0.1.nip.io`
   - API: `http://api.127.0.0.1.nip.io`

## Architecture
- **Helm Charts**: `helm/platform`, `helm/medusa-store`, `helm/wordpress-store`
- **Namespaces**:
  - `platform`: Core services
  - `store-*`: Tenant stores
- **Ingress**: Nginx Ingress Controller handles routing via `nip.io` domains (resolves to 127.0.0.1).

## Troubleshooting
- If `minikube` fails to start, ensure Hyper-V is enabled or Docker Desktop is running.
- If charts fail to install, check `kubectl get events -n platform`.
