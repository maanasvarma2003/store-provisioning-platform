#!/bin/bash
set -e

echo "Setting up k3s on VPS..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi

# Install k3s
echo "Installing k3s..."
curl -sfL https://get.k3s.io | sh -

# Wait for k3s to be ready
echo "Waiting for k3s to be ready..."
sleep 10

# Copy kubeconfig
mkdir -p ~/.kube
cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
chmod 600 ~/.kube/config

echo "k3s installed successfully!"
echo ""
echo "Next steps:"
echo "1. Update helm/values-prod.yaml with your domain"
echo "2. Run 'helm upgrade --install platform ./helm/platform -f ./helm/values-prod.yaml --namespace store-platform --create-namespace'"
echo "3. Configure DNS to point to this server's IP"
