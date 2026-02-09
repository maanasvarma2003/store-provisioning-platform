@echo off
REM Set PATH and KUBECONFIG for Orchestrator
set PATH=%USERPROFILE%\.k8s-tools;%PATH%
set KUBECONFIG=%USERPROFILE%\.kube\config

REM Run the orchestrator
cd orchestrator
npm run dev
