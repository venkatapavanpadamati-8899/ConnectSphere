const puppeteer = require('puppeteer');

const LOCAL_BASE = 'http://localhost:3000';

async function runAuthTest() {
  console.log('=== AUTHENTICATION ROOT-CAUSE VERIFICATION ===');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const timestamp = Date.now();
    const testEmail = `auth_test_${timestamp}@connectsphere.com`;
    const testUser = `user_${timestamp.toString().slice(-6)}`;
    const testPass = 'TestPass123!';

    let logs = [];
    let networkCalls = [];

    page.on('console', msg => logs.push(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('response', res => {
      const url = res.url();
      if (url.includes('supabase.co')) {
        networkCalls.push({ url, status: res.status() });
      }
    });

    console.log('\n--- 1. SIGNUP ---');
    await page.goto(`${LOCAL_BASE}/pages/signup.html`, { waitUntil: 'networkidle2' });
    await page.type('#username', testUser);
    await page.type('#email', testEmail);
    await page.type('#password', testPass);
    
    await page.evaluate(() => nextStep(2));
    await new Promise(r => setTimeout(r, 1000));
    
    await page.type('#phone', '9876543210');
    await page.type('#dob', '2000-01-01');
    
    await page.evaluate(() => requestOTP());
    await new Promise(r => setTimeout(r, 1000));
    
    await page.type('.cs-otp-input:nth-child(1)', '1');
    await page.type('.cs-otp-input:nth-child(2)', '2');
    await page.type('.cs-otp-input:nth-child(3)', '3');
    await page.type('.cs-otp-input:nth-child(4)', '4');
    await page.type('.cs-otp-input:nth-child(5)', '5');
    await page.type('.cs-otp-input:nth-child(6)', '6');
    
    await page.click('#finalSignupBtn');
    
    await new Promise(r => setTimeout(r, 4000));
    console.log('Current URL after Signup:', page.url());
    console.log('Network Calls:', networkCalls);
    networkCalls = [];

    console.log('\n--- 2. LOGIN ---');
    await page.goto(`${LOCAL_BASE}/pages/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#email', testEmail);
    await page.type('#password', testPass);
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Current URL after Login:', page.url());
    console.log('Network Calls:', networkCalls);
    networkCalls = [];

    console.log('\n--- 3. SESSION STATE & DASHBOARD ---');
    if (!page.url().includes('dashboard.html')) {
        await page.goto(`${LOCAL_BASE}/pages/dashboard.html`, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        console.log('Navigated to Dashboard. URL:', page.url());
    }

    const sessionState = await page.evaluate(() => {
        // Scan all localStorage keys for any Supabase auth token
        const keys = Object.keys(window.localStorage);
        const authKey = keys.find(k => k.includes('supabase') || k.startsWith('sb-'));
        return authKey ? 'Active' : 'Missing';
    });
    console.log('Supabase Session State:', sessionState);

    console.log('\n--- 4. LOGOUT ---');
    // Try clicking logout button if exists
    const logoutBtn = await page.$('.btn-sidebar-logout');
    if (logoutBtn) {
      await logoutBtn.click();
    } else {
      console.log('Logout button not found on page.');
    }
    console.log('Current URL after Logout:', page.url());

    console.log('\n--- 5. LOGIN AGAIN ---');
    await page.goto(`${LOCAL_BASE}/pages/login.html`, { waitUntil: 'networkidle2' });
    await page.type('#email', testEmail);
    await page.type('#password', testPass);
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Current URL after Login Again:', page.url());
    
    console.log('\n--- LOGS ---');
    console.log(logs.join('\n'));

  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    await browser.close();
    console.log('=== TEST COMPLETED ===');
  }
}

runAuthTest();
