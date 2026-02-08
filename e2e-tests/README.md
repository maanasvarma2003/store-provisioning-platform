# E2E Testing Guide

This directory contains end-to-end tests for the Store Provisioning Platform.

## Requirements

- Node.js 18+
- Platform must be deployed and running
- API service must be accessible

## Installation

```bash
npm install
npx playwright install chromium
```

## Running Tests

### All Tests
```bash
npm test
```

### WooCommerce Only
```bash
npm run test:woocommerce
```

### Medusa Only
```bash
npm run test:medusa
```

### With UI Mode
```bash
npm run test:ui
```

### Headed Mode (See Browser)
```bash
npm run test:headed
```

### Debug Mode
```bash
npm run test:debug
```

## Test Structure

```
src/
├── fixtures/          # Test data and fixtures
│   └── test-data.ts
├── tests/             # Test suites
│   ├── woocommerce.spec.ts
│   └── medusa.spec.ts
└── utils/             # Helper functions
    ├── api-client.ts
    └── test-helpers.ts
```

## Configuration

Edit `.env` file:
```
API_URL=http://api.127.0.0.1.nip.io
BASE_DOMAIN=127.0.0.1.nip.io
HEADLESS=true
TIMEOUT_MS=600000
```

## Test Flow

### WooCommerce
1. Provision store via API
2. Navigate to storefront
3. Add product to cart
4. Complete checkout with COD
5. Verify order in WP Admin
6. Cleanup

### Medusa
1. Provision store via API
2. Navigate to storefront
3. Add product to cart
4. Complete checkout
5. Verify order in Medusa Admin
6. Cleanup

## Test Results

Results are saved in:
- `test-results/` - Screenshots and videos
- `test-results/html/` - HTML report
- `test-results/results.json` - JSON results

View HTML report:
```bash
npm run report
```

## Troubleshooting

### Store provisioning times out
- Increase `PROVISIONING_TIMEOUT_MS` in `.env`
- Check cluster resources with `kubectl top nodes`

### Tests fail to find elements
- Run in headed mode to see what's happening
- Check screenshots in `test-results/`

### API connection errors
- Verify platform is deployed: `kubectl get pods -n store-platform`
- Check API is accessible: `curl http://api.127.0.0.1.nip.io/health`
