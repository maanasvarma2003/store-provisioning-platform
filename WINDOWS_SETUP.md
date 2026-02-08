# Quick Setup Guide for Windows

## Prerequisites

The E2E tests require the Store Provisioning Platform to be running. You have two options:

### Option 1: Docker Desktop (Recommended for Full Testing)

1. **Install Docker Desktop** from: https://www.docker.com/products/docker-desktop/

2. **Start the platform with Docker Compose:**
   ```powershell
   docker-compose up -d
   ```

3. **Wait for services to be ready** (about 1-2 minutes):
   ```powershell
   docker-compose ps
   ```

4. **Run E2E tests:**
   ```powershell
   cd e2e-tests
   npm test
   ```

### Option 2: View Test Framework (Without Running Tests)

If you just want to see the test framework and code:

1. **View test files:**
   - WooCommerce test: `e2e-tests/src/tests/woocommerce.spec.ts`
   - Medusa test: `e2e-tests/src/tests/medusa.spec.ts`

2. **Explore test utilities:**
   - API client: `e2e-tests/src/utils/api-client.ts`
   - Test helpers: `e2e-tests/src/utils/test-helpers.ts`

3. **Run Playwright UI to explore tests:**
   ```powershell
   cd e2e-tests
   npm run test:ui
   ```

## Current Status

✅ **E2E test dependencies installed** (31 packages)
🔄 **Playwright browser downloading** (Chromium)
❌ **Docker not available** (required for platform deployment)

## PowerShell Command Syntax

In PowerShell, use semicolons (`;`) instead of `&&`:

```powershell
# ✅ Correct for PowerShell
cd e2e-tests; npm install; npx playwright install chromium

# ❌ Wrong for PowerShell (bash syntax)
cd e2e-tests && npm install && npx playwright install chromium
```

## Next Steps

1. **Install Docker Desktop** to run the platform
2. **Start services** with `docker-compose up -d`
3. **Run tests** with `cd e2e-tests; npm test`
4. **View results** with `npm run report`

## Alternative: Kubernetes Setup

If you prefer Kubernetes (the production way):

1. Install Docker Desktop (includes Kubernetes)
2. Enable Kubernetes in Docker Desktop settings
3. Install `kind`: `choco install kind` (requires Chocolatey)
4. Run: `make local-up; make build; make deploy`
5. Run tests: `make test-e2e`

## Documentation

- Full guide: `e2e-tests/README.md`
- Quick reference: `e2e-tests/QUICK_REFERENCE.md`
- Walkthrough: See artifacts in `.gemini/antigravity/brain/*/walkthrough.md`
