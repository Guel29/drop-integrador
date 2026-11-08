import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: 'browser.spec.ts', use: { baseURL: 'http://localhost:3000', launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] } }, reporter: 'list' });
