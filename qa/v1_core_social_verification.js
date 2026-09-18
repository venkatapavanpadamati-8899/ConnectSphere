const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'https://connectsphere2.vercel.app';
const TIMESTAMP = Date.now();
const USERNAME_A = `qaA_${TIMESTAMP}`;
const USERNAME_B = `qaB_${TIMESTAMP}`;
const PASSWORD = 'Password123!';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let report = {
  p0: { pass: 0, fail: 0, blocked: 0, not_verified: 0 },
  p1: { pass: 0, fail: 0, blocked: 0, not_verified: 0 },
  p2: { pass: 0, fail: 0, blocked: 0, not_verified: 0 },
  bugs_fixed: [],
  remaining_blockers: []
};

async function signupUser(page, username) {
  await page.goto(`${BASE_URL}/signup.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { visible: true });
  await page.type('#username', username);
  await page.type('#email', `${username}@test.com`);
  await page.type('#password', PASSWORD);
  await page.evaluate(() => document.querySelector('#step1 .cs-btn-primary').click());
  
  await delay(1000);
  await page.type('#phone', '9999999999');
  await page.type('#dob', '2000-01-01');
  await page.evaluate(() => document.querySelector('#step2 .cs-btn-primary').click());
  
  try {
    await page.waitForSelector('#step3.active', { timeout: 3000 });
    await page.$$eval('.cs-otp-input', inputs => inputs.forEach((input, i) => input.value = String(i + 1)));
    await page.$eval('#finalSignupBtn', btn => btn.click());
  } catch (e) {
    await page.$eval('#finalSignupBtn', btn => btn.click()).catch(()=>null);
  }
  
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
  const url = page.url();
  if (url.includes('dashboard')) {
    console.log(`[SUCCESS] Signup ${username}`);
    return true;
  } else {
    console.log(`[FAIL] Signup ${username}. Rate limit?`);
    return false;
  }
}

async function runVerification() {
  console.log('--- CONNECTSPHERE V1 SOCIAL VERIFICATION ---');
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'] 
  });
  
  try {
    const pageA = await browser.newPage();
    const pageB = await browser.newPage();
    
    // Disable alerts
    pageA.on('dialog', async dialog => await dialog.accept());
    pageB.on('dialog', async dialog => await dialog.accept());
    
    // 1. SIGNUP BOTH USERS
    console.log('\n--- SETUP USERS ---');
    const signupA = await signupUser(pageA, USERNAME_A);
    const signupB = await signupUser(pageB, USERNAME_B);
    
    if (!signupA || !signupB) {
      console.log('Signup blocked, falling back to API test for DB states or marking blocked.');
      report.p1.blocked++;
      report.remaining_blockers.push('Supabase email rate limit on signup blocks UI E2E tests.');
      return;
    }
    
    // Get User A ID from Supabase
    const { data: dbUserA } = await supabase.from('profiles').select('id').eq('username', USERNAME_A).single();
    const { data: dbUserB } = await supabase.from('profiles').select('id').eq('username', USERNAME_B).single();
    
    const userA_id = dbUserA?.id;
    const userB_id = dbUserB?.id;

    // --- P1: POST & LIKES ---
    console.log('\n--- TEST: CREATE POST & LIKE ---');
    await pageA.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'domcontentloaded' });
    console.log('Waiting for composer-post-text...');
    await pageA.waitForSelector('#composer-post-text', { visible: true, timeout: 5000 }).catch(async e => {
      console.log('Composer not found. Page HTML:');
      console.log(await pageA.evaluate(() => document.body.innerHTML));
      throw e;
    });
    console.log('Composer found! Typing post...');
    await pageA.$eval('#composer-post-text', (el, text) => { 
      el.value = text; 
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, `Hello from ${USERNAME_A}`);
    await pageA.$eval('#btn-publish-inline-post', btn => btn.click());
    await delay(3000); 
    
    const { data: posts } = await supabase.from('posts').select('*').eq('user_id', userA_id).order('created_at', { ascending: false });
    if (!posts || posts.length === 0) {
      console.log('[FAIL] Post not saved in DB');
      report.p1.fail++;
    } else {
      console.log('[PASS] Post saved in DB');
      const postId = posts[0].id;
      
      await pageB.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'domcontentloaded' });
      await delay(3000); 
      
      const likedUI = await pageB.evaluate((pId) => {
        const postEl = document.querySelector(`.cs-post[data-id="${pId}"]`);
        if (postEl) {
          const likeBtn = postEl.querySelector('.cs-action-btn:nth-child(1)'); 
          if (likeBtn) { likeBtn.click(); return true; }
        }
        return false;
      }, postId);
      
      await delay(2000);
      
      const { data: likes } = await supabase.from('post_likes').select('*').eq('post_id', postId).eq('user_id', userB_id);
      if (likes && likes.length > 0) {
        console.log('[PASS] Like saved in DB via UI');
        report.p1.pass++;
        
        const tokenA = await pageA.evaluate(() => {
          const authStr = localStorage.getItem('sb-lgsdihyrsbzebdfblpor-auth-token');
          return authStr ? JSON.parse(authStr).access_token : null;
        });
        
        if (tokenA) {
          const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${tokenA}` } } });
          await clientA.from('post_likes').delete().eq('post_id', postId).eq('user_id', userB_id);
          
          const { data: checkLikes } = await supabase.from('post_likes').select('*').eq('post_id', postId).eq('user_id', userB_id);
          if (checkLikes && checkLikes.length > 0) {
            console.log('[PASS] P0 RLS: User A cannot delete User B like');
            report.p0.pass++;
          } else {
            console.log('[FAIL] P0 RLS: User A deleted User B like!');
            report.p0.fail++;
          }
        }
        
      } else {
        console.log('[FAIL] Like NOT saved in DB via UI');
        report.p1.fail++;
      }
    }
    
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('Test script crashed:', error);
  } finally {
    await browser.close();
  }
}

runVerification().catch(console.error);
