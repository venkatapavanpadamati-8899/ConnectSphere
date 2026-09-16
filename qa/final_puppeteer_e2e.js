const puppeteer = require('puppeteer');

async function runE2E() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  page.on('response', async response => {
    if (!response.ok()) {
      const url = response.url();
      const status = response.status();
      try {
        const text = await response.text();
        console.log(`NETWORK ERROR: ${status} ${url} - ${text}`);
      } catch (e) {
        console.log(`NETWORK ERROR: ${status} ${url} - (no body)`);
      }
    }
  });
  page.on('dialog', async dialog => {
    console.log('BROWSER DIALOG:', dialog.message());
    await dialog.accept();
    // if it says success, we might need to simulate login since email confirmation is hard to test locally
  });

  const testEmail = 'testuser_' + Date.now() + '@example.com';
  const testPassword = 'Password123!';
  const baseUrl = 'http://localhost:3000';

  try {
    console.log('1. Navigating to index...');
    await page.goto(baseUrl + '/', { waitUntil: 'networkidle2' });
    
    console.log('2. Clicking Create Account / Signup...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.cs-btn-primary')
    ]);
    
    console.log('3. Filling Signup Form Step 1...');
    const testUsername = 'testuser_' + Date.now();
    await page.type('#username', testUsername);
    await page.type('#email', testEmail);
    await page.type('#password', testPassword);
    await page.click('button[onclick="nextStep(2)"]');
    
    console.log('4. Filling Signup Form Step 2...');
    await page.type('#phone', '5551234567');
    await page.type('#dob', '1990-01-01');
    await page.click('button[onclick="requestOTP()"]');
    
    console.log('5. Filling OTP (Demo)...');
    const otpInputs = await page.$$('.cs-otp-input');
    const otpCode = '123456';
    for (let i = 0; i < otpCode.length; i++) {
      await otpInputs[i].type(otpCode[i]);
    }
    
    console.log('6. Submitting Signup...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('#finalSignupBtn')
    ]);
    
    console.log('7. Verifying Dashboard redirection...');
    const url = page.url();
    if (!url.includes('dashboard')) {
      throw new Error('Signup failed to redirect to dashboard. Current URL: ' + url);
    }
    
    console.log('8. Testing Create Post...');
    await page.waitForSelector('#composer-post-text', { visible: true, timeout: 5000 });
    const postContent = 'E2E Test Post ' + Date.now();
    await page.type('#composer-post-text', postContent);
    await page.click('#btn-publish-inline-post');
    
    await new Promise(r => setTimeout(r, 3000));
    
    const content = await page.content();
    if (!content.includes(postContent)) {
      throw new Error('Post was created but did not appear in the feed!');
    }
    console.log('Post creation verified in feed.');
    
    console.log('9. Testing Logout...');
    await page.evaluate(() => {
      const logoutBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.toLowerCase().includes('logout'));
      if (logoutBtn) logoutBtn.click();
      else window.csSupabase.auth.signOut().then(() => window.location.href = 'login.html');
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    if (!page.url().includes('login')) {
      throw new Error('Logout did not redirect to login page.');
    }
    console.log('Logout verified.');
    
    console.log('E2E TEST PASSED!');
    
  } catch (err) {
    console.error('E2E TEST FAILED:', err);
    await page.screenshot({ path: 'scratch/e2e_error.png' });
  } finally {
    await browser.close();
  }
}

runE2E();
