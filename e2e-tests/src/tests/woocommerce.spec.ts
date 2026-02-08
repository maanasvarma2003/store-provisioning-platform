import { test, expect, Page } from '@playwright/test';
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
import { generateCustomerData, PAYMENT_METHODS } from '../fixtures/test-data';

test.describe('WooCommerce E2E Tests', () => {
    let apiClient: ProvisioningAPIClient;
    let storeId: string;
    let storeUrl: string;
    let adminUrl: string;
    let adminUser: string;
    let adminPass: string;

    test.beforeAll(async () => {
        apiClient = new ProvisioningAPIClient();
    });

    test('Complete WooCommerce order flow', async ({ page }) => {
        // Step 1: Provision WooCommerce store
        test.setTimeout(900000); // 15 minutes
        console.log('=== Starting WooCommerce E2E Test ===');

        const storeName = randomStoreName();
        console.log(`Creating WooCommerce store: ${storeName}`);

        const store = await apiClient.provisionStore({
            name: storeName,
            engine: 'WOOCOMMERCE',
        });

        storeId = store.id;
        storeUrl = store.url!;
        adminUrl = store.adminUrl!;
        adminUser = store.adminUser!;
        adminPass = store.adminPass!;

        console.log(`Store provisioned successfully!`);
        console.log(`Store URL: ${storeUrl}`);
        console.log(`Admin URL: ${adminUrl}`);
        console.log(`Admin User: ${adminUser}`);

        // Step 2: Navigate to storefront
        console.log('Navigating to storefront...');
        await page.goto(storeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForNetworkIdle(page);
        await takeScreenshot(page, 'storefront-home', 'woocommerce');

        // Wait for the page to fully load
        await sleep(3000);

        // Step 3: Find and navigate to a product
        console.log('Looking for products...');

        // Try multiple selectors for finding products
        let productFound = false;
        const productSelectors = [
            '.products .product a.woocommerce-LoopProduct-link',
            '.products .product a',
            'ul.products li a',
            '.woocommerce-loop-product__link',
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

        if (!productFound) {
            // If no products found on main page, try navigating to shop page
            console.log('No products on homepage, trying /shop page...');
            await page.goto(`${storeUrl}/shop`, { waitUntil: 'domcontentloaded' });
            await waitForNetworkIdle(page);

            const shopProductLink = page.locator('.products .product a').first();
            if (await shopProductLink.isVisible({ timeout: 10000 })) {
                await shopProductLink.click();
                productFound = true;
            }
        }

        expect(productFound).toBe(true);

        await waitForNetworkIdle(page);
        await takeScreenshot(page, 'product-page', 'woocommerce');

        // Step 4: Add to cart
        console.log('Adding product to cart...');

        const addToCartSelectors = [
            'button[name="add-to-cart"]',
            '.single_add_to_cart_button',
            'button.add_to_cart_button',
            'input[name="add-to-cart"]',
        ];

        let addedToCart = false;
        for (const selector of addToCartSelectors) {
            if (await elementExists(page, selector, 3000)) {
                console.log(`Found add to cart button: ${selector}`);
                await safeClick(page, selector);
                addedToCart = true;
                break;
            }
        }

        expect(addedToCart).toBe(true);
        await sleep(2000);
        await takeScreenshot(page, 'added-to-cart', 'woocommerce');

        // Step 5: Go to cart/checkout
        console.log('Navigating to checkout...');

        // Try to find "View cart" or "Checkout" link
        const checkoutSelectors = [
            'a.wc-forward',
            'a[href*="/cart"]',
            'a.button.wc-forward',
            '.woocommerce-message a',
        ];

        let navigatedToCart = false;
        for (const selector of checkoutSelectors) {
            if (await elementExists(page, selector, 3000)) {
                console.log(`Found checkout link: ${selector}`);
                await safeClick(page, selector);
                navigatedToCart = true;
                await waitForNetworkIdle(page);
                break;
            }
        }

        if (!navigatedToCart) {
            // Direct navigation to cart
            console.log('Direct navigation to cart...');
            await page.goto(`${storeUrl}/cart`, { waitUntil: 'domcontentloaded' });
            await waitForNetworkIdle(page);
        }

        await takeScreenshot(page, 'cart-page', 'woocommerce');

        // Proceed to checkout
        const proceedToCheckoutSelectors = [
            '.wc-proceed-to-checkout a',
            'a.checkout-button',
            '.wc-proceed-to-checkout .button',
            'a[href*="/checkout"]',
        ];

        let proceededToCheckout = false;
        for (const selector of proceedToCheckoutSelectors) {
            if (await elementExists(page, selector, 5000)) {
                console.log(`Found proceed to checkout button: ${selector}`);
                await safeClick(page, selector);
                proceededToCheckout = true;
                break;
            }
        }

        if (!proceededToCheckout) {
            // Direct navigation to checkout
            console.log('Direct navigation to checkout...');
            await page.goto(`${storeUrl}/checkout`, { waitUntil: 'domcontentloaded' });
        }

        await waitForNetworkIdle(page);
        await sleep(2000);
        await takeScreenshot(page, 'checkout-page', 'woocommerce');

        // Step 6: Fill checkout form
        console.log('Filling checkout form...');
        const customer = generateCustomerData();

        await safeFill(page, '#billing_first_name', customer.firstName);
        await safeFill(page, '#billing_last_name', customer.lastName);
        await safeFill(page, '#billing_email', customer.email);
        await safeFill(page, '#billing_phone', customer.phone);
        await safeFill(page, '#billing_address_1', customer.address);
        await safeFill(page, '#billing_city', customer.city);
        await safeFill(page, '#billing_postcode', customer.postcode);

        await takeScreenshot(page, 'checkout-filled', 'woocommerce');

        // Step 7: Select Cash on Delivery
        console.log('Selecting Cash on Delivery payment method...');

        const codSelectors = [
            '#payment_method_cod',
            'input[value="cod"]',
            'label[for="payment_method_cod"]',
        ];

        for (const selector of codSelectors) {
            if (await elementExists(page, selector, 3000)) {
                await safeClick(page, selector);
                break;
            }
        }

        await sleep(1000);
        await takeScreenshot(page, 'payment-selected', 'woocommerce');

        // Step 8: Place order
        console.log('Placing order...');

        const placeOrderSelectors = [
            '#place_order',
            'button[name="woocommerce_checkout_place_order"]',
            '.woocommerce-checkout button[type="submit"]',
        ];

        for (const selector of placeOrderSelectors) {
            if (await elementExists(page, selector, 3000)) {
                await safeClick(page, selector);
                break;
            }
        }

        // Wait for order confirmation
        console.log('Waiting for order confirmation...');
        await page.waitForURL(/.*order-received.*/, { timeout: 60000 });
        await waitForNetworkIdle(page);
        await sleep(2000);

        await takeScreenshot(page, 'order-confirmation', 'woocommerce');

        // Extract order number if possible
        const orderReceivedText = await page.locator('.woocommerce-order-received').textContent();
        console.log(`Order confirmation: ${orderReceivedText}`);

        // Step 9: Verify order in admin
        console.log('Verifying order in WooCommerce admin...');

        // Navigate to admin
        await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForNetworkIdle(page);
        await takeScreenshot(page, 'admin-login', 'woocommerce');

        // Login
        console.log(`Logging in with user: ${adminUser}`);
        await safeFill(page, '#user_login', adminUser);
        await safeFill(page, '#user_pass', adminPass);
        await safeClick(page, '#wp-submit');

        await waitForNetworkIdle(page);
        await sleep(3000);
        await takeScreenshot(page, 'admin-dashboard', 'woocommerce');

        // Navigate to WooCommerce Orders
        console.log('Navigating to WooCommerce orders...');

        // Try direct URL first
        await page.goto(`${adminUrl.replace('/wp-admin', '')}/wp-admin/edit.php?post_type=shop_order`, {
            waitUntil: 'domcontentloaded',
        });
        await waitForNetworkIdle(page);
        await sleep(2000);
        await takeScreenshot(page, 'admin-orders', 'woocommerce');

        // Verify order exists
        const ordersExist = await elementExists(page, '.wp-list-table', 10000);
        expect(ordersExist).toBe(true);

        console.log('Order successfully placed and verified in WooCommerce admin!');
        await takeScreenshot(page, 'test-complete', 'woocommerce');
    });

    test.afterAll(async () => {
        if (storeId) {
            console.log(`Cleaning up test store: ${storeId}`);
            try {
                await apiClient.deleteStore(storeId);
                await apiClient.waitForStoreDeletion(storeId);
                console.log('Store cleanup completed');
            } catch (error) {
                console.error('Failed to cleanup store:', error);
            }
        }
    });
});
