const puppeteer = require('puppeteer');

const APP_URL = 'https://connectsphere2.vercel.app';
const EMAIL = 'qa_user_a@example.com';
const PASSWORD = 'TestPassword123!';

async function runUITest() {
  console.log('--- CONNECTSPHERE FUNCTIONAL UI TEST ---');
  let results = { pass: 0, fail: 0 };
  
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  try {
    // 1. Navigate to Login
    console.log('\nNavigating to /login...');
    await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle2' });
    
    // 2. Login
    console.log('Attempting login...');
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('#loginBtn')
    ]);
    
    let currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('LOGIN UI & REDIRECT: PASS');
      results.pass++;
    } else {
      console.log('LOGIN UI & REDIRECT: FAIL (' + currentUrl + ')');
      results.fail++;
    }
    
    // 3. Verify Session/Refresh
    console.log('Refreshing dashboard to verify session hydration...');
    await page.reload({ waitUntil: 'networkidle0' });
    currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('SESSION HYDRATION: PASS');
      results.pass++;
    } else {
      console.log('SESSION HYDRATION: FAIL (' + currentUrl + ')');
      results.fail++;
    }
    
    // 4. Test routes
    const routes = ['/profile', '/messages', '/notifications', '/settings'];
    for (const route of routes) {
      console.log(`Testing protected route ${route}...`);
      await page.goto(`${APP_URL}${route}`, { waitUntil: 'networkidle2' });
      currentUrl = page.url();
      if (currentUrl.includes(route)) {
        console.log(`ROUTE ${route}: PASS`);
        results.pass++;
      } else {
        console.log(`ROUTE ${route}: FAIL (Redirected to ${currentUrl})`);
        results.fail++;
      }
    }
    
    // 5. Logout
    console.log('Testing logout from /settings...');
    // We are on /settings, let's click logout
    // Or we can just clear localStorage to simulate if UI logout selector is unknown
    // Let's execute logout logic if possible, or clear localStorage and reload
    await page.evaluate(() => {
      localStorage.clear();
    });
    console.log('Cleared localStorage (simulated logout). Testing protected route guard...');
    await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle2' });
    currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('PROTECTED ROUTE GUARD: PASS');
      results.pass++;
    } else {
      console.log('PROTECTED ROUTE GUARD: FAIL (' + currentUrl + ')');
      results.fail++;
    }
    
  } catch (err) {
    console.error('UI TEST CRASHED:', err.message);
  } finally {
    await browser.close();
    console.log('\n--- UI TEST COMPLETE ---');
    console.log(`Pass: ${results.pass}, Fail: ${results.fail}`);
  }
}

runUITest().catch(console.error);
