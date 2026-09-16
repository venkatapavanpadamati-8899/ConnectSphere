const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const ROUTES = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/forgot-password.html',
  '/dashboard.html',
  '/explore.html',
  '/messages.html',
  '/notifications.html',
  '/profile.html',
  '/reels.html',
  '/settings.html'
];

async function runPhase1() {
  console.log('🚀 Starting Phase 1: Routes & Environment Verification');
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const results = {};

  for (const route of ROUTES) {
    console.log(`\nTesting route: ${route}`);
    const page = await browser.newPage();
    let networkErrors = [];
    let jsErrors = [];
    
    // Capture Network Errors (only 4xx and 5xx)
    page.on('response', response => {
      const status = response.status();
      // Ignore 404 for map files or 3rd party tracker, but log our own API/Assets
      if (status >= 400 && !response.url().includes('.map')) {
        networkErrors.push(`${status} ${response.url()}`);
      }
    });

    // Capture JS Errors
    page.on('pageerror', err => {
      jsErrors.push(err.toString());
    });

    try {
      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 15000 });
      
      const title = await page.title();
      
      results[route] = {
        status: response.status(),
        title: title,
        networkErrors: networkErrors,
        jsErrors: jsErrors,
        passed: response.status() < 400 && jsErrors.length === 0
      };
      
      console.log(`✅ [${response.status()}] ${route} | Title: "${title}"`);
      if (jsErrors.length > 0) console.log(`   ❌ JS Errors: ${jsErrors.length}`);
      if (networkErrors.length > 0) console.log(`   ⚠️ Network Errors: ${networkErrors.length}`);
      
    } catch (e) {
      results[route] = {
        status: 'FAILED_TO_LOAD',
        error: e.message,
        passed: false
      };
      console.log(`❌ Failed to load ${route}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  
  console.log('\n=======================================');
  console.log('📊 Phase 1 Route Verification Summary');
  console.log('=======================================');
  let allPassed = true;
  for (const [route, res] of Object.entries(results)) {
    if (res.passed) {
      console.log(`[PASS] ${route}`);
    } else {
      console.log(`[FAIL] ${route}`);
      if (res.jsErrors && res.jsErrors.length) console.log(`       - JS: ${res.jsErrors[0]}`);
      if (res.error) console.log(`       - Error: ${res.error}`);
      allPassed = false;
    }
  }
  
  if (!allPassed) {
    process.exit(1);
  }
}

runPhase1().catch(console.error);
