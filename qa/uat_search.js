const puppeteer = require('puppeteer');

const APP_URL = 'https://connectsphere2.vercel.app';
const EMAIL = 'qa_user_a@example.com';
const PASSWORD = 'TestPassword123!';

async function runSearchTest() {
  console.log('--- CONNECTSPHERE SEARCH UI TEST ---');
  let results = { pass: 0, fail: 0 };
  
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  try {
    console.log('\nNavigating to /login...');
    await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Login
    console.log('Attempting login...');
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('#loginBtn')
    ]);
    
    let currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
       console.log('FAILED TO REACH DASHBOARD! URL:', currentUrl);
       throw new Error('Login failed to redirect');
    }
    
    console.log('\nNavigating to /explore...');
    await page.goto(`${APP_URL}/explore`, { waitUntil: 'networkidle2' });
    
    console.log('Pressing Ctrl+K to open Search Modal...');
    // Type Ctrl+K to open modal
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    
    await page.waitForSelector('#universal-search-modal.active', { visible: true, timeout: 5000 });
    
    console.log('Typing search query "a"...');
    await page.type('#universal-search-input', 'a', { delay: 50 });
    
    console.log('Waiting for debounced search and network response (4s)...');
    await new Promise(r => setTimeout(r, 4000));
    
    const resultsHtml = await page.evaluate(() => {
      const el = document.getElementById('universal-search-results');
      return el ? el.innerHTML : null;
    });
    
    if (resultsHtml && resultsHtml.length > 50 && !resultsHtml.includes('No matching mesh entities')) {
      console.log('EXPLORE SEARCH TEST: PASS (Found results)');
      results.pass++;
    } else {
      console.log('EXPLORE SEARCH TEST: FAIL (Did not find expected results)');
      console.log('HTML Dump:', resultsHtml);
      results.fail++;
    }
    
  } catch (err) {
    console.error('SEARCH TEST CRASHED:', err.message);
  } finally {
    await browser.close();
    console.log('\n--- SEARCH TEST COMPLETE ---');
    console.log(`Pass: ${results.pass}, Fail: ${results.fail}`);
  }
}

runSearchTest().catch(console.error);
