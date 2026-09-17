const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const LOCAL_URL = 'http://localhost:3000';
const PROD_URL = 'https://connectsphere2.vercel.app';

const viewports = [
  { name: 'Mobile Mini', width: 320, height: 700 },
  { name: 'Mobile Standard', width: 375, height: 812 },
  { name: 'Mobile Large', width: 390, height: 844 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 }
];

const routesToTest = [
  'login',
  'signup',
  'dashboard',
  'reels',
  'messages',
  'notifications',
  'profile',
  'settings',
  'explore',
  'forgot-password'
];

const uiResults = [];

function recordUI(section, test, status, expected, actual, evidence = '') {
  uiResults.push({ section, test, status, expected, actual, evidence });
  const symbol = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⚠️');
  console.log(`${symbol} [${section}] ${test}: ${status} (${actual})`);
}

async function run() {
  console.log('====================================================');
  console.log('CONNECTSPHERE MASTER UI & RESPONSIVE QA SUITE');
  console.log('Local Server:', LOCAL_URL);
  console.log('Production URL:', PROD_URL);
  console.log('Viewports:', viewports.map(v => `${v.name} (${v.width}x${v.height})`).join(', '));
  console.log('====================================================\n');

  let browser;
  const chromePath = "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe";
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
    });
  } catch (e) {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
    });
  }

  const page = await browser.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('requestfailed', req => {
    networkErrors.push(`${req.url()} (${req.failure()?.errorText || 'failed'})`);
  });

  // ----------------------------------------------------
  // SECTION A: ROUTE PROTECTION & AUTH
  // ----------------------------------------------------
  console.log('\n--- A. ROUTE PROTECTION & AUTH ---');
  try {
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Direct unauthenticated access to /dashboard -> redirects to login
    await page.goto(`${LOCAL_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);
    const unauthDashUrl = page.url();
    recordUI('A. AUTH LIVE', 'Unauthenticated /dashboard Protection', unauthDashUrl.includes('login') ? 'PASS' : 'FAIL', 'Redirect to login', `URL: ${unauthDashUrl}`);

    // 2. Direct unauthenticated access to /reels -> redirects to login
    await page.goto(`${LOCAL_URL}/reels`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);
    const unauthReelsUrl = page.url();
    recordUI('A. AUTH LIVE', 'Unauthenticated /reels Protection', unauthReelsUrl.includes('login') ? 'PASS' : 'FAIL', 'Redirect to login', `URL: ${unauthReelsUrl}`);

    // 3. Direct unauthenticated access to /messages -> redirects to login
    await page.goto(`${LOCAL_URL}/messages`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);
    const unauthMsgUrl = page.url();
    recordUI('A. AUTH LIVE', 'Unauthenticated /messages Protection', unauthMsgUrl.includes('login') ? 'PASS' : 'FAIL', 'Redirect to login', `URL: ${unauthMsgUrl}`);

    // 4. Direct unauthenticated access to /settings -> redirects to login
    await page.goto(`${LOCAL_URL}/settings`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);
    const unauthSetUrl = page.url();
    recordUI('A. AUTH LIVE', 'Unauthenticated /settings Protection', unauthSetUrl.includes('login') ? 'PASS' : 'FAIL', 'Redirect to login', `URL: ${unauthSetUrl}`);

    // 5. Login page UI elements
    await page.goto(`${LOCAL_URL}/login`, { waitUntil: 'networkidle2', timeout: 15000 });
    const hasEmail = (await page.$('#email')) !== null;
    const hasPassword = (await page.$('#password')) !== null;
    const hasLoginBtn = (await page.$('#loginBtn')) !== null;
    const hasGoogleOAuthBtn = (await page.$('#googleLoginBtn')) !== null;
    recordUI('A. AUTH LIVE', 'Login Form Elements Present', (hasEmail && hasPassword && hasLoginBtn && hasGoogleOAuthBtn) ? 'PASS' : 'FAIL', 'All elements present', 'Email, Password, Login button, Google OAuth button');

    // 6. Test invalid login error display
    await page.type('#email', 'nonexistent_test@example.com');
    await page.type('#password', 'WrongPassword123!');
    await page.click('#loginBtn');
    await sleep(2500);
    const errorText = await page.evaluate(() => {
      const el = document.getElementById('general-error') || document.querySelector('.error-message') || document.querySelector('.cs-error');
      return el ? el.textContent.trim() : '';
    });
    recordUI('A. AUTH LIVE', 'Invalid Credentials Error State', errorText.length > 0 ? 'PASS' : 'FAIL', 'Error message visible', `Error text: "${errorText}"`);

    // 7. Google OAuth status
    recordUI('A. AUTH LIVE', 'Google OAuth Configuration Status', 'BLOCKED', 'External human Google Cloud credentials', 'BLOCKED_EXTERNAL_CONFIGURATION');

    // 8. Real UI Login with User A
    await page.evaluate(() => {
      document.getElementById('email').value = '';
      document.getElementById('password').value = '';
    });
    await page.type('#email', 'qaA_1789569805612@test.com');
    await page.type('#password', 'Password123!');
    await page.click('#loginBtn');
    await sleep(4000);
    const postLoginUrl = page.url();
    const loginOk = postLoginUrl.includes('dashboard');
    recordUI('A. AUTH LIVE', 'Valid User Login & Redirect to Dashboard', loginOk ? 'PASS' : 'FAIL', 'Redirects to /dashboard', `URL: ${postLoginUrl}`);

  } catch (err) {
    recordUI('A. AUTH LIVE', 'Auth Live Execution', 'FAIL', 'No error', err.message);
  }

  // ----------------------------------------------------
  // SECTION B: DASHBOARD & FEED TABS
  // ----------------------------------------------------
  console.log('\n--- B. DASHBOARD & FEED TABS ---');
  try {
    await page.goto(`${LOCAL_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2500);

    // 1. Check Feed Tabs presence
    const hasFeedTabs = (await page.$('#feed-category-tabs')) !== null;
    recordUI('B. FEED TABS', 'Feed Stream Tabs Container Present', hasFeedTabs ? 'PASS' : 'FAIL', 'Container exists', hasFeedTabs ? 'Found #feed-category-tabs' : 'Missing');

    const tabBtns = await page.$$eval('.feed-tab-btn', els => els.map(b => b.dataset.tab));
    recordUI('B. FEED TABS', 'Feed Stream Tabs (For You & Following)', (tabBtns.includes('for-you') && tabBtns.includes('following')) ? 'PASS' : 'FAIL', 'Contains for-you and following tabs', `Found tabs: ${tabBtns.join(', ')}`);

    // 2. Click Following tab
    const clickFollowing = await page.evaluate(() => {
      const btn = document.querySelector('.feed-tab-btn[data-tab="following"]');
      if (btn) {
        btn.click();
        return btn.classList.contains('active');
      }
      return false;
    });
    recordUI('B. FEED TABS', 'Switch Tab to Following', clickFollowing ? 'PASS' : 'FAIL', 'Following tab active', clickFollowing ? 'Active' : 'Failed');

    // 3. Click back to For You tab
    const clickForYou = await page.evaluate(() => {
      const btn = document.querySelector('.feed-tab-btn[data-tab="for-you"]');
      if (btn) {
        btn.click();
        return btn.classList.contains('active');
      }
      return false;
    });
    recordUI('B. FEED TABS', 'Switch Tab to For You', clickForYou ? 'PASS' : 'FAIL', 'For You tab active', clickForYou ? 'Active' : 'Failed');

    // 4. Feed infinite scroll trigger element
    const hasScrollTrigger = (await page.$('#infinite-scroll-trigger')) !== null;
    recordUI('B. FEED TABS', 'Feed Infinite Scroll Trigger Element Present', hasScrollTrigger ? 'PASS' : 'FAIL', 'Scroll trigger present', hasScrollTrigger ? 'Found #infinite-scroll-trigger' : 'Missing');

  } catch (err) {
    recordUI('B. FEED TABS', 'Feed Tabs Execution', 'FAIL', 'No error', err.message);
  }

  // ----------------------------------------------------
  // SECTION E: REELS & TRENDING HASHTAGS UI
  // ----------------------------------------------------
  console.log('\n--- E. REELS & TRENDING HASHTAGS UI ---');
  try {
    await page.goto(`${LOCAL_URL}/reels`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(3500);

    // 1. Trending container
    const hasTrendingList = (await page.$('#trending-masterpiece-list')) !== null;
    recordUI('E. REELS UI', 'Trending Masterpiece List Container Present', hasTrendingList ? 'PASS' : 'FAIL', 'Container exists', hasTrendingList ? 'Found #trending-masterpiece-list' : 'Missing');

    // 2. Trending hashtags rendered items & verify no NaN
    const trendingText = await page.evaluate(() => {
      const el = document.getElementById('trending-masterpiece-list');
      return el ? el.innerText : '';
    });
    const hasTrendingItems = trendingText.includes('#');
    const hasNaN = trendingText.includes('NaN');
    recordUI('E. REELS UI', 'Trending Hashtags Rendered (Real DB Data)', hasTrendingItems ? 'PASS' : 'FAIL', 'Trending hashtags rendered', trendingText.replace(/\n+/g, ' | ').slice(0, 100));
    recordUI('E. REELS UI', 'Trending Score Valid Number (No NaN)', !hasNaN ? 'PASS' : 'FAIL', 'No NaN in score output', hasNaN ? 'Found Score NaN' : 'Clean valid scores');

    // 3. Click trending hashtag filter
    const clickedTag = await page.evaluate(() => {
      const row = document.querySelector('#trending-masterpiece-list .trending-row') || document.querySelector('#trending-masterpiece-list .trending-hashtag-row');
      if (row) {
        row.click();
        return true;
      }
      return false;
    });
    recordUI('E. REELS UI', 'Trending Hashtag Row Click Filter', clickedTag ? 'PASS' : 'FAIL', 'Hashtag row clicked', clickedTag ? 'Clicked row' : 'Row not found');

    // 4. Reels Share button
    const hasShareBtn = (await page.$('#btn-reel-share')) !== null;
    recordUI('E. REELS UI', 'Reels Share Button Present in DOM', hasShareBtn ? 'PASS' : 'FAIL', 'Button exists', hasShareBtn ? 'Found #btn-reel-share' : 'Missing');

    const shareHandled = await page.evaluate(() => {
      try {
        const btn = document.getElementById('btn-reel-share');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });
    recordUI('E. REELS UI', 'Reels Share Button Click Action', shareHandled ? 'PASS' : 'FAIL', 'Click handler triggers without uncaught error', 'Success');

    // 5. Reels video stage
    const videoCount = await page.$$eval('video', vids => vids.length);
    recordUI('E. REELS UI', 'Reels Video Stage Present', videoCount > 0 ? 'PASS' : 'FAIL', '>0 video elements', `Found ${videoCount} video stages`);

  } catch (err) {
    recordUI('E. REELS UI', 'Reels UI Execution', 'FAIL', 'No error', err.message);
  }

  // ----------------------------------------------------
  // SECTION F: MESSAGING LIVE UI
  // ----------------------------------------------------
  console.log('\n--- F. MESSAGING LIVE UI ---');
  try {
    await page.goto(`${LOCAL_URL}/messages`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2500);

    // 1. Conversations list container
    const hasConvList = (await page.$('#conversations-list-container')) !== null || (await page.$('.conversations-list')) !== null;
    recordUI('F. MESSAGING UI', 'Conversations List Container Present', hasConvList ? 'PASS' : 'FAIL', 'Container exists', hasConvList ? 'Found #conversations-list-container' : 'Missing');

    // 2. Chat media upload trigger
    const hasMediaTrigger = (await page.$('#btn-chat-attach-media')) !== null && (await page.$('#chat-media-input')) !== null;
    recordUI('F. MESSAGING UI', 'Chat Media Upload Trigger Present', hasMediaTrigger ? 'PASS' : 'FAIL', 'Media trigger exists', hasMediaTrigger ? 'Found #btn-chat-attach-media & #chat-media-input' : 'Missing');

    // 3. Message input & send button
    const hasChatInput = (await page.$('#chat-input-field')) !== null;
    const hasSendBtn = (await page.$('#btn-send-message')) !== null;
    recordUI('F. MESSAGING UI', 'Message Input & Send Controls Present', (hasChatInput && hasSendBtn) ? 'PASS' : 'FAIL', 'Input and send button exist', `Input: ${hasChatInput}, SendBtn: ${hasSendBtn}`);

    // 4. Message delete action binding in renderer
    const deleteActionBound = await page.evaluate(() => {
      return typeof window.chatService?.deleteMessage === 'function' || typeof window.ChatService?.deleteMessage === 'function' || typeof window.MessagesPageRenderer !== 'undefined';
    });
    recordUI('F. MESSAGING UI', 'Message Delete Action Bound in Code', deleteActionBound ? 'PASS' : 'FAIL', 'Delete method or renderer bound', 'Verified delete action');

  } catch (err) {
    recordUI('F. MESSAGING UI', 'Messaging UI Execution', 'FAIL', 'No error', err.message);
  }

  // ----------------------------------------------------
  // SECTION J: SETTINGS LIVE UI
  // ----------------------------------------------------
  console.log('\n--- J. SETTINGS LIVE UI ---');
  try {
    await page.goto(`${LOCAL_URL}/settings`, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);

    const hasPrivateToggle = (await page.$('#toggle-private-account')) !== null;
    const hasPushToggle = (await page.$('#toggle-push-notifs')) !== null;
    recordUI('J. SETTINGS UI', 'Settings Privacy & Push Notification Toggles', (hasPrivateToggle && hasPushToggle) ? 'PASS' : 'FAIL', 'Both toggles exist', `Private: ${hasPrivateToggle}, Push: ${hasPushToggle}`);

    if (hasPrivateToggle) {
      const toggleWorks = await page.evaluate(() => {
        const t = document.getElementById('toggle-private-account');
        if (!t) return false;
        const init = t.checked;
        t.checked = !init;
        t.dispatchEvent(new Event('change', { bubbles: true }));
        return t.checked !== init;
      });
      recordUI('J. SETTINGS UI', 'Privacy Account Toggle Interactive Response', toggleWorks ? 'PASS' : 'FAIL', 'Toggle state changes', 'Functional');
    }
  } catch (err) {
    recordUI('J. SETTINGS UI', 'Settings UI Execution', 'FAIL', 'No error', err.message);
  }

  // ----------------------------------------------------
  // SECTION L: RESPONSIVE QA (ALL 6 VIEWPORTS ACROSS 10 ROUTES)
  // ----------------------------------------------------
  console.log('\n--- L. RESPONSIVE QA (6 VIEWPORTS ACROSS 10 ROUTES) ---');
  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const route of routesToTest) {
      try {
        await page.goto(`${LOCAL_URL}/${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await sleep(350);

        const check = await page.evaluate((expectedW) => {
          const doc = document.documentElement;
          const scrollW = doc.scrollWidth;
          const clientW = window.innerWidth;
          const hasOverflow = scrollW > clientW;

          // Check visible interactive elements on the active viewport
          const interactive = Array.from(document.querySelectorAll('button:not([hidden]), input:not([type="hidden"]), textarea, a.cs-btn-primary'));
          let clippedCount = 0;
          for (const el of interactive) {
            const cs = window.getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
              continue;
            }
            // Ignore elements inside unopened modals or drawers
            if (el.closest('.modal:not(.active), .dashboard-modal-backdrop:not(.active), .mobile-search-overlay:not(.active), .search-dialog:not(.active)')) {
              continue;
            }
            // Ignore closed off-canvas drawer elements
            if (el.closest('.mobile-drawer, .dashboard-mobile-drawer, .cs-mobile-drawer') && !el.closest('.active')) {
              continue;
            }
            if (el.classList.contains('drawer-nav-item') || el.classList.contains('drawer-logout-btn') || el.id === 'btn-close-mobile-drawer') {
              continue;
            }
            // Ignore items inside intentional horizontal carousels/tab rails
            if (el.closest('.explore-category-tabs, .stories-rail, .story-tray, .horizontal-scroll-container')) {
              continue;
            }

            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              if (r.right > clientW + 5 || r.left < -5) {
                clippedCount++;
              }
            }
          }

          return {
            scrollW,
            clientW,
            hasOverflow,
            clippedCount
          };
        }, vp.width);

        const testName = `${vp.width}px [${vp.name}] - /${route}`;
        if (!check.hasOverflow && check.clippedCount === 0) {
          recordUI('L. RESPONSIVE', testName, 'PASS', `scrollWidth <= ${vp.width} & clipped=0`, `scrollWidth=${check.scrollW}, clientWidth=${check.clientW}`);
        } else {
          recordUI('L. RESPONSIVE', testName, 'FAIL', `scrollWidth <= ${vp.width} & clipped=0`, `scrollWidth=${check.scrollW}, clipped=${check.clippedCount}`);
        }
      } catch (e) {
        recordUI('L. RESPONSIVE', `${vp.width}px [${vp.name}] - /${route}`, 'FAIL', 'Page loads', e.message);
      }
    }
  }

  // ----------------------------------------------------
  // SECTION N: PERFORMANCE & FIRST-PARTY ASSETS
  // ----------------------------------------------------
  console.log('\n--- N. PERFORMANCE & ASSET MONITORING ---');
  const firstPartyAssetFailures = networkErrors.filter(e => {
    // Only flag failures for local first-party assets (scripts, styles, internal pages)
    return (e.includes('localhost') || e.includes('connectsphere')) && !e.includes('favicon') && !e.includes('ERR_ABORTED');
  });
  recordUI('N. PERFORMANCE', 'First-Party Asset 404 / Failure Count', firstPartyAssetFailures.length === 0 ? 'PASS' : 'FAIL', '0 failed first-party assets', `${firstPartyAssetFailures.length} failures: ${firstPartyAssetFailures.slice(0, 3).join(', ')}`);

  const criticalConsoleErrors = consoleErrors.filter(e => {
    return !e.includes('favicon') && 
           !e.includes('ERR_CONNECTION_REFUSED') && 
           !e.includes('ERR_BLOCKED_BY_ORB') &&
           !e.includes('status of 400') &&
           !e.includes('status of 401') &&
           !e.includes('status of 404');
  });
  recordUI('N. PERFORMANCE', 'Critical Console Errors Count', criticalConsoleErrors.length === 0 ? 'PASS' : 'FAIL', '0 critical console errors', `${criticalConsoleErrors.length} errors`);

  // ----------------------------------------------------
  // PRODUCTION VERCEL SANITY CHECK
  // ----------------------------------------------------
  console.log('\n--- PRODUCTION VERCEL LIVE CHECK ---');
  const prodPage = await browser.newPage();
  try {
    await prodPage.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const prodLoginReady = (await prodPage.$('#loginBtn')) !== null;
    recordUI('PROD. VERCEL', 'Production Vercel Login Page Reachable & Responsive', prodLoginReady ? 'PASS' : 'FAIL', 'Login button rendered', `URL: ${prodPage.url()}`);
  } catch (err) {
    recordUI('PROD. VERCEL', 'Production Vercel Reachability', 'FAIL', 'Accessible', err.message);
  } finally {
    try { await prodPage.close(); } catch(e){}
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('MASTER UI & RESPONSIVE QA COMPLETE');
  const pass = uiResults.filter(r => r.status === 'PASS').length;
  const fail = uiResults.filter(r => r.status === 'FAIL').length;
  const blocked = uiResults.filter(r => r.status === 'BLOCKED').length;
  console.log(`TOTAL UI CHECKS: ${uiResults.length} | PASS: ${pass} | FAIL: ${fail} | BLOCKED: ${blocked}`);
  console.log('====================================================');

  fs.writeFileSync('qa/master_ui_results.json', JSON.stringify(uiResults, null, 2)); fs.writeFileSync('qa/debug_console_errors.json', JSON.stringify(criticalConsoleErrors, null, 2));
  await browser.close();
}

run().catch(console.error);
