import { Page } from '@playwright/test';

/**
 * Generate random test data
 */
export function randomString(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function randomEmail(): string {
    return `test-${randomString()}@example.com`;
}

export function randomStoreName(): string {
    return `test-${randomString(6)}`;
}

/**
 * Wait for element with retry
 */
export async function waitForElement(
    page: Page,
    selector: string,
    timeoutMs: number = 30000
): Promise<boolean> {
    try {
        await page.waitForSelector(selector, { timeout: timeoutMs, state: 'visible' });
        return true;
    } catch (error) {
        console.error(`Element not found: ${selector}`);
        return false;
    }
}

/**
 * Safe click with wait
 */
export async function safeClick(
    page: Page,
    selector: string,
    timeoutMs: number = 30000
): Promise<boolean> {
    try {
        const element = page.locator(selector).first();
        await element.waitFor({ timeout: timeoutMs, state: 'visible' });
        await element.click();
        return true;
    } catch (error) {
        console.error(`Failed to click: ${selector}`, error);
        return false;
    }
}

/**
 * Safe fill with wait
 */
export async function safeFill(
    page: Page,
    selector: string,
    value: string,
    timeoutMs: number = 30000
): Promise<boolean> {
    try {
        const element = page.locator(selector).first();
        await element.waitFor({ timeout: timeoutMs, state: 'visible' });
        await element.fill(value);
        return true;
    } catch (error) {
        console.error(`Failed to fill: ${selector}`, error);
        return false;
    }
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(
    page: Page,
    name: string,
    prefix: string = 'screenshot'
): Promise<string> {
    const timestamp = Date.now();
    const filename = `${prefix}-${name}-${timestamp}.png`;
    await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    console.log(`Screenshot saved: ${filename}`);
    return filename;
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(
    page: Page,
    timeoutMs: number = 30000
): Promise<void> {
    try {
        await page.waitForLoadState('networkidle', { timeout: timeoutMs });
    } catch (error) {
        console.warn('Network idle timeout, continuing anyway');
    }
}

/**
 * Retry operation with exponential backoff
 */
export async function retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            if (attempt < maxAttempts) {
                const delay = delayMs * Math.pow(2, attempt - 1);
                console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error('Operation failed after retries');
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get text content safely
 */
export async function getTextContent(
    page: Page,
    selector: string
): Promise<string | null> {
    try {
        const element = page.locator(selector).first();
        await element.waitFor({ timeout: 10000, state: 'visible' });
        return await element.textContent();
    } catch (error) {
        console.error(`Failed to get text content: ${selector}`);
        return null;
    }
}

/**
 * Check if element exists
 */
export async function elementExists(
    page: Page,
    selector: string,
    timeoutMs: number = 5000
): Promise<boolean> {
    try {
        await page.waitForSelector(selector, { timeout: timeoutMs, state: 'attached' });
        return true;
    } catch (error) {
        return false;
    }
}
