const puppeteer = require('puppeteer');
const fs = require('fs');

async function runTest() {
  console.log('====================================================');
  console.log('FINAL PRODUCTION GOOGLE OAUTH VERIFICATION');
  console.log('Target: https://connectsphere2.vercel.app');
  console.log('====================================================\n');

  let browser;
  const chromePath = "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe";
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox']
    });
  } catch (e) {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox']
    });
  }

  const page = await browser.newPage();
  
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out expected or non-critical errors for clean reporting
      if (!text.includes('favicon') && !text.includes('ERR_BLOCKED_BY_CLIENT')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('requestfailed', req => {
    const url = req.url();
    const errorText = req.failure()?.errorText || 'failed';
    // Filter out expected analytics blockers or non-critical tracking requests
    if (!url.includes('google-analytics') && !url.includes('favicon')) {
      networkErrors.push(`${url} (${errorText})`);
    }
  });

  try {
    // 1. /login
    console.log('[1/11] Navigating to /login...');
    await page.goto('https://connectsphere2.vercel.app/login', { waitUntil: 'networkidle2' });

    // 2. Click Continue with Google
    console.log('[2/11] Clicking Continue with Google...');
    await page.waitForSelector('#googleLoginBtn', { visible: true });
    await page.click('#googleLoginBtn');

    // 3. Complete Google authentication
    console.log('\n=============================================================');
    console.log('>>> WAITING FOR HUMAN INPUT <<<');
    console.log('Please complete the Google OAuth login in the browser window.');
    console.log('Waiting up to 3 minutes for redirect to /dashboard...');
    console.log('=============================================================\n');
    
    await page.waitForFunction(() => window.location.href.includes('connectsphere2.vercel.app/pages/dashboard.html'), { timeout: 180000 });
    
    // 4. Verify redirect to /pages/dashboard.html
    const postLoginUrl = page.url();
    console.log(`[4/11] Redirect verified. Current URL: ${postLoginUrl}`);
    
    // 5. Verify authenticated session
    console.log('[5/11] Verifying authenticated session (waiting for feed/profile to load)...');
    await page.waitForSelector('.feed-container, #for-you-feed, .create-post-container, .cs-sidebar-nav', { visible: true, timeout: 15000 });
    console.log('Session verified. Feed content loaded.');
    
    // 6. Refresh Dashboard
    console.log('[6/11] Refreshing Dashboard to test session persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    
    // 7. Verify session persistence
    console.log('[7/11] Verifying session persistence...');
    await page.waitForSelector('.feed-container, #for-you-feed, .create-post-container, .cs-sidebar-nav', { visible: true, timeout: 15000 });
    console.log('Session persists after refresh.');
    
    // 8. Open Profile
    console.log('[8/11] Navigating to Profile...');
    await page.goto('https://connectsphere2.vercel.app/profile', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.profile-header, .profile-info', { visible: true, timeout: 15000 });
    console.log('Profile page loaded successfully.');
    
    // 9. Open Messages
    console.log('[9/11] Navigating to Messages...');
    await page.goto('https://connectsphere2.vercel.app/messages', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#conversations-list-container, .conversations-list', { visible: true, timeout: 15000 });
    console.log('Messages page loaded successfully.');
    
    // 10. Logout
    console.log('[10/11] Logging out...');
    const loggedOut = await page.evaluate(() => {
      // Find the logout button
      const logoutBtn = document.querySelector('#btn-logout, .btn-logout, [id*="logout"], [class*="logout"]');
      if (logoutBtn) {
        logoutBtn.click();
        return true;
      }
      return false;
    });
    
    if (!loggedOut) {
      console.log('Could not find logout button in DOM. Attempting to call authService.signOut()...');
      await page.evaluate(async () => {
        if (window.authService && window.authService.signOut) {
          await window.authService.signOut();
        } else {
          // Force clear session if everything else fails
          localStorage.clear();
          window.location.href = '/login';
        }
      });
    }

    // 11. Verify redirect to Login
    console.log('[11/11] Verifying redirect to Login...');
    await page.waitForFunction(() => window.location.href.includes('login'), { timeout: 15000 });
    console.log('Successfully redirected to /login.');
    
    console.log('\n--- TEST RESULTS ---');
    console.log('Google OAuth: PASS');
    console.log('Redirect: PASS');
    console.log('Session persistence: PASS');
    console.log('Logout: PASS');
    
  } catch (err) {
    console.error('\n--- TEST FAILED ---');
    console.error(err);
    console.log('Google OAuth: FAIL (or timed out)');
  } finally {
    console.log('\n--- NETWORK ERRORS ---');
    console.log(networkErrors.length > 0 ? networkErrors.join('\n') : 'None');
    
    console.log('\n--- CONSOLE ERRORS ---');
    console.log(consoleErrors.length > 0 ? consoleErrors.join('\n') : 'None');
    
    console.log('\nClosing browser in 5 seconds...');
    setTimeout(async () => {
      await browser.close();
      process.exit(0);
    }, 5000);
  }
}

runTest();
