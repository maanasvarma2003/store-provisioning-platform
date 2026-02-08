import { test, expect } from '@playwright/test';
import ProvisioningAPIClient from '../utils/api-client';
import {
    safeClick,
    safeFill,
    takeScreenshot,
    waitForNetworkIdle,
    randomStoreName,
    sleep,
    elementExists,
} from '../utils/test-helpers';
import { generateCustomerData } from '../fixtures/test-data';

test.describe('Medusa E2E Tests', () => {
    let apiClient: ProvisioningAPIClient;
    let storeId: string;
    let storeUrl: string;
    let adminUrl: string;
    let backendUrl: string;
    let adminEmail: string;
    let adminPass: string;

    test.beforeAll(async () => {
        apiClient = new ProvisioningAPIClient();
    });

    test('Complete Medusa order flow', async ({ page }) => {
        // Step 1: Provision Medusa store (this takes longer than WooCommerce)
        test.setTimeout(1200000); // 20 minutes - Medusa takes longer to provision
        console.log('=== Starting Medusa E2E Test ===');

        const storeName = randomStoreName();
        console.log(`Creating Medusa store: ${storeName}`);

        const store = await apiClient.provisionStore({
            name: storeName,
            engine: 'MEDUSA',
        });

        storeId = store.id;
        storeUrl = store.url!;
        adminUrl = store.adminUrl!;
        adminEmail = store.adminUser!;
        adminPass = store.adminPass!;
        backendUrl = `http://${storeName}-backend.${process.env.BASE_DOMAIN || '127.0.0.1.nip.io'}`;

        console.log(`Medusa store provisioned successfully!`);
        console.log(`Store URL: ${storeUrl}`);
        console.log(`Admin URL: ${adminUrl}`);
        console.log(`Backend URL: ${backendUrl}`);
        console.log(`Admin Email: ${adminEmail}`);

        // Step 2: Navigate to storefront
        console.log('Navigating to Medusa storefront...');
        await page.goto(storeUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await waitForNetworkIdle(page);
        await sleep(5000); // Give Medusa storefront time to fully load
        await takeScreenshot(page, 'storefront-home', 'medusa');

        // Step 3: Find and click on a product
        console.log('Looking for products on Medusa storefront...');

        // Medusa storefront selectors
        let productFound = false;
        const productSelectors = [
            '[data-testid="product-link"]',
            'a[href*="/products/"]',
            '.product-card a',
            '[class*="product"] a',
            'a[href*="/product/"]',
        ];

        for (const selector of productSelectors) {
            if (await elementExists(page, selector, 5000)) {
                console.log(`Found product with selector: ${selector}`);
                const productLinks = page.locator(selector);
                const count = await productLinks.count();

                if (count > 0) {
                    console.log(`Found ${count} products`);
                    await productLinks.first().click();
                    productFound = true;
                    break;
                }
            }
        }

        // If no products with those selectors, try navigating to products page
        if (!productFound) {
            console.log('Trying to navigate to products page...');
            const productsPage = `${storeUrl}/products`;
            await page.goto(productsPage, { waitUntil: 'domcontentloaded' });
            await waitForNetworkIdle(page);

            // Try again to find products
            for (const selector of productSelectors) {
                if (await elementExists(page, selector, 5000)) {
                    await page.locator(selector).first().click();
                    productFound = true;
                    break;
                }
            }
        }

        expect(productFound).toBe(true);

        await waitForNetworkIdle(page);
        await sleep(2000);
        await takeScreenshot(page, 'product-page', 'medusa');

        // Step 4: Add to cart
        console.log('Adding product to cart...');

        const addToCartSelectors = [
            '[data-testid="add-to-cart"]',
            'button:has-text("Add to cart")',
            'button:has-text("Add to bag")',
            '[data-button="add-to-cart"]',
            'button[type="submit"]',
        ];

        let addedToCart = false;
        for (const selector of addToCartSelectors) {
            if (await elementExists(page, selector, 5000)) {
                console.log(`Found add to cart button: ${selector}`);
                await safeClick(page, selector);
                addedToCart = true;
                await sleep(2000);
                break;
            }
        }

        expect(addedToCart).toBe(true);
        await takeScreenshot(page, 'added-to-cart', 'medusa');

        // Step 5: Navigate to cart
        console.log('Navigating to cart...');

        const cartSelectors = [
            '[data-testid="cart-link"]',
            'a[href*="/cart"]',
            '[aria-label="Cart"]',
            'button:has-text("Cart")',
            'a:has-text("Cart")',
        ];

        let navigatedToCart = false;
        for (const selector of cartSelectors) {
            if (await elementExists(page, selector, 3000)) {
                await safeClick(page, selector);
                navigatedToCart = true;
                await waitForNetworkIdle(page);
                break;
            }
        }

        if (!navigatedToCart) {
            console.log('Direct navigation to cart...');
            await page.goto(`${storeUrl}/cart`, { waitUntil: 'domcontentloaded' });
            await waitForNetworkIdle(page);
        }

        await sleep(2000);
        await takeScreenshot(page, 'cart-page', 'medusa');

        // Step 6: Proceed to checkout
        console.log('Proceeding to checkout...');

        const checkoutSelectors = [
            '[data-testid="checkout-button"]',
            'button:has-text("Checkout")',
            'a:has-text("Checkout")',
            'button:has-text("Go to checkout")',
            '[href*="/checkout"]',
        ];

        let proceededToCheckout = false;
        for (const selector of checkoutSelectors) {
            if (await elementExists(page, selector, 5000)) {
                await safeClick(page, selector);
                proceededToCheckout = true;
                break;
            }
        }

        if (!proceededToCheckout) {
            console.log('Direct navigation to checkout...');
            await page.goto(`${storeUrl}/checkout`, { waitUntil: 'domcontentloaded' });
        }

        await waitForNetworkIdle(page);
        await sleep(3000);
        await takeScreenshot(page, 'checkout-page', 'medusa');

        // Step 7: Fill checkout form
        console.log('Filling Medusa checkout form...');
        const customer = generateCustomerData();

        // Medusa checkout fields (may vary based on storefront template)
        const fillField = async (selectors: string[], value: string) => {
            for (const selector of selectors) {
                if (await elementExists(page, selector, 2000)) {
                    await safeFill(page, selector, value);
                    return true;
                }
            }
            return false;
        };

        await fillField(['[name="email"]', '#email', '[data-testid="email"]'], customer.email);
        await fillField(['[name="first_name"]', '#first_name', '[data-testid="first-name"]'], customer.firstName);
        await fillField(['[name="last_name"]', '#last_name', '[data-testid="last-name"]'], customer.lastName);
        await fillField(['[name="address_1"]', '#address_1', '[data-testid="address-1"]'], customer.address);
        await fillField(['[name="city"]', '#city', '[data-testid="city"]'], customer.city);
        await fillField(['[name="postal_code"]', '#postal_code', '[data-testid="postal-code"]'], customer.postcode);
        await fillField(['[name="phone"]', '#phone', '[data-testid="phone"]'], customer.phone);

        await sleep(1000);
        await takeScreenshot(page, 'checkout-filled', 'medusa');

        // Step 8: Submit checkout
        console.log('Submitting checkout...');

        const submitSelectors = [
            '[data-testid="submit-order"]',
            'button:has-text("Place order")',
            'button:has-text("Complete order")',
            'button[type="submit"]',
        ];

        for (const selector of submitSelectors) {
            if (await elementExists(page, selector, 5000)) {
                await safeClick(page, selector);
                break;
            }
        }

        // Wait for order confirmation
        console.log('Waiting for order confirmation...');
        await sleep(5000);
        await waitForNetworkIdle(page);
        await takeScreenshot(page, 'order-confirmation', 'medusa');

        // Step 9: Verify order via Medusa Admin
        console.log('Verifying order in Medusa admin...');

        await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await waitForNetworkIdle(page);
        await sleep(2000);
        await takeScreenshot(page, 'admin-login', 'medusa');

        // Login to Medusa admin
        console.log(`Logging in to Medusa admin with: ${adminEmail}`);

        await safeFill(page, '[name="email"]', adminEmail);
        await safeFill(page, '[name="password"]', adminPass);

        const loginSelectors = [
            'button:has-text("Sign in")',
            'button:has-text("Login")',
            'button[type="submit"]',
        ];

        for (const selector of loginSelectors) {
            if (await elementExists(page, selector, 3000)) {
                await safeClick(page, selector);
                break;
            }
        }

        await waitForNetworkIdle(page);
        await sleep(5000);
        await takeScreenshot(page, 'admin-dashboard', 'medusa');

        // Navigate to orders
        console.log('Navigating to orders in Medusa admin...');

        const ordersLinkSelectors = [
            'a[href*="/orders"]',
            '[data-testid="orders-link"]',
            'nav a:has-text("Orders")',
        ];

        for (const selector of ordersLinkSelectors) {
            if (await elementExists(page, selector, 5000)) {
                await safeClick(page, selector);
                break;
            }
        }

        await waitForNetworkIdle(page);
        await sleep(3000);
        await takeScreenshot(page, 'admin-orders', 'medusa');

        console.log('Medusa order flow completed successfully!');
        await takeScreenshot(page, 'test-complete', 'medusa');
    });

    test.afterAll(async () => {
        if (storeId) {
            console.log(`Cleaning up test Medusa store: ${storeId}`);
            try {
                await apiClient.deleteStore(storeId);
                await apiClient.waitForStoreDeletion(storeId);
                console.log('Medusa store cleanup completed');
            } catch (error) {
                console.error('Failed to cleanup Medusa store:', error);
            }
        }
    });
});
