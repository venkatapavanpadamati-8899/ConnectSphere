const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = 'https://connectsphere2.vercel.app';
const TEST_EMAIL = 'testuser' + Date.now() + '@example.com';
const TEST_PASS = 'TestPass123!';

const viewports = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 700 }
];

async function measureCard(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const docEl = document.documentElement;
    const horizontalCenterDiff = Math.abs((docEl.clientWidth / 2) - (rect.left + rect.width / 2));
    const isHorizontallyCentered = horizontalCenterDiff < 5; 
    
    let isVerticallyCentered = false;
    if (docEl.clientHeight > rect.height) {
        const verticalCenterDiff = Math.abs((docEl.clientHeight / 2) - (rect.top + rect.height / 2));
        isVerticallyCentered = verticalCenterDiff < 5;
    }

    return {
      viewportWidth: docEl.clientWidth,
      viewportHeight: docEl.clientHeight,
      cardLeft: rect.left,
      cardTop: rect.top,
      cardWidth: rect.width,
      cardHeight: rect.height,
      horizontalCenterDiff: horizontalCenterDiff,
      isHorizontallyCentered,
      isVerticallyCentered,
      scrollWidth: docEl.scrollWidth,
      horizontalOverflow: docEl.scrollWidth > docEl.clientWidth
    };
  }, selector);
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const results = {
      login_visual: [],
      signup_visual: [],
      functional: {}
  };

  if (!fs.existsSync('qa_reports/visual')) {
      fs.mkdirSync('qa_reports/visual', { recursive: true });
  }

  try {
    // 1. LOGIN VISUAL TEST
    console.log("--- LOGIN VISUAL TEST ---");
    for (const vp of viewports) {
      await page.setViewport(vp);
      await page.goto(`${BASE_URL}/login`);
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: `qa_reports/visual/login_${vp.width}x${vp.height}.png` });
      const measure = await measureCard(page, '.cs-auth-card');
      if (measure) results.login_visual.push(measure);
    }

    // 2. SIGNUP VISUAL TEST
    console.log("--- SIGNUP VISUAL TEST ---");
    for (const vp of viewports) {
      await page.setViewport(vp);
      await page.goto(`${BASE_URL}/signup`);
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: `qa_reports/visual/signup_${vp.width}x${vp.height}.png` });
      const measure = await measureCard(page, '.cs-auth-card');
      if (measure) results.signup_visual.push(measure);
    }

    // 3. LOGIN FUNCTIONAL
    console.log("--- LOGIN FUNCTIONAL TEST ---");
    await page.setViewport({width: 1440, height: 900});
    await page.goto(`${BASE_URL}/login`);
    await page.type('#email', 'invalid');
    await page.type('#password', 'bad');
    await page.click('#loginBtn');
    await new Promise(r => setTimeout(r, 1000));
    const loginErr = await page.$eval('#general-error', el => el.textContent).catch(()=>'');
    results.functional.loginInvalid = loginErr;

    // 4. SIGNUP FUNCTIONAL
    console.log("--- SIGNUP FUNCTIONAL TEST ---");
    await page.goto(`${BASE_URL}/signup`);
    await page.type('#username', 'test' + Date.now());
    await page.type('#email', TEST_EMAIL);
    await page.type('#password', TEST_PASS);
    await page.evaluate(() => window.nextStep(2));
    await new Promise(r => setTimeout(r, 500));
    await page.type('#phone', '5551234567');
    await page.type('#dob', '1990-01-01');
    await page.evaluate(() => window.requestOTP());
    await new Promise(r => setTimeout(r, 500));
    const otpInputs = await page.$$('.cs-otp-input');
    if (otpInputs.length === 6) {
        for(let i=0; i<6; i++) await otpInputs[i].type((i+1).toString());
    }
    await page.evaluate(() => window.submitSignup());
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if redirect to dashboard or error
    let curUrl = page.url();
    if (curUrl.includes('dashboard')) {
       results.functional.signup = 'SUCCESS_REDIRECT';
    } else {
       const err = await page.$eval('#general-error', el => el.textContent).catch(()=>'');
       if (err.includes('rate limit')) results.functional.signup = 'BLOCKED_EXTERNAL_CONFIGURATION';
       else results.functional.signup = 'FAIL_' + err;
    }

    // 5. AUTH SESSION HYDRATION
    console.log("--- AUTH SESSION HYDRATION ---");
    // Clear local storage and try to access dashboard
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/dashboard`);
    await new Promise(r => setTimeout(r, 1500));
    results.functional.unauthDashboardRedirect = page.url().includes('login') ? 'PASS' : 'FAIL';
    
    await page.goto(`${BASE_URL}/profile`);
    await new Promise(r => setTimeout(r, 1500));
    results.functional.unauthProfileRedirect = page.url().includes('login') ? 'PASS' : 'FAIL';
    
  } catch (err) {
    console.error(err);
  } finally {
    fs.writeFileSync('qa_reports/visual/results.json', JSON.stringify(results, null, 2));
    await browser.close();
  }
}
run();
