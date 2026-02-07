#!/bin/bash
set -e

echo "Creating sample stores..."

API_URL="${API_URL:-http://api.127.0.0.1.nip.io}"

# Create first store
echo "Creating store: demo-store-1..."
curl -X POST "$API_URL/api/stores" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-store-1",
    "engine": "WOOCOMMERCE"
  }'

echo ""
echo ""

# Wait a bit
sleep 2

# Create second store
echo "Creating store: demo-store-2..."
curl -X POST "$API_URL/api/stores" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-store-2",
    "engine": "WOOCOMMERCE"
  }'

echo ""
echo ""
echo "Sample stores created!"
echo "Visit http://dashboard.127.0.0.1.nip.io to see them"
