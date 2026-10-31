import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './e2e', testMatch: '**/*.spec.ts', fullyParallel:false, workers:1, retries:0,
  reporter:'list',
  use: {baseURL:'http://127.0.0.1:3002',trace:'retain-on-failure',
    launchOptions:{executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined)}},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
    {name:'mobile',use:{...devices['Pixel 7'],defaultBrowserType:'chromium'}}],
  webServer:{command:'node e2e/fixture-server.js',url:'http://127.0.0.1:3002/api/config',reuseExistingServer:false,timeout:15000},
});
