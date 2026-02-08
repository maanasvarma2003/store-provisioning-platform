import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
    testDir: './src/tests',
    fullyParallel: false, // Run tests sequentially for store provisioning
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: 1, // One worker to avoid parallel provisioning conflicts
    reporter: [
        ['html', { outputFolder: 'test-results/html' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['list']
    ],
    use: {
        baseURL: process.env.BASE_URL || 'http://127.0.0.1.nip.io',
        trace: 'on-first-retry',
        screenshot: 'on',
        video: 'retain-on-failure',
        actionTimeout: 30000,
        navigationTimeout: 60000,
    },
    timeout: 900000, // 15 minutes per test (store provisioning takes time)
    expect: {
        timeout: 30000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
