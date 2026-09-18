const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'http://localhost:3001';
const USERNAME_A = 'qaA_1789569805612';
const USERNAME_B = 'qaB_1789569805612';
const EMAIL_A = `${USERNAME_A}@test.com`;
const EMAIL_B = `${USERNAME_B}@test.com`;
const PASSWORD = 'Password123!';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let report = {
  p0: { pass: 0, fail: 0, blocked: 0, not_verified: 0 },
  p1: { pass: 0, fail: 0, blocked: 0, not_verified: 0 },
  p2: { pass: 0, fail: 0, blocked: 0, not_verified: 0 },
  logs: []
};

function log(msg) {
  console.log(msg);
  report.logs.push(msg);
}

async function loginUserViaUI(page, email) {
  await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { visible: true });
  await page.type('#email', email);
  await page.type('#password', PASSWORD);
  
  const hasSupabase = await page.evaluate(() => typeof window.csSupabase !== 'undefined');
  const emailVal = await page.$eval('#email', el => el.value);
  const passVal = await page.$eval('#password', el => el.value);
  log(`[Page] hasSupabase: ${hasSupabase}, email: ${emailVal}, passLength: ${passVal.length}`);
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.$eval('#loginBtn', btn => btn.click())
  ]).catch(e => log(`Navigation issue: ${e.message}`));
  
  if (!page.url().includes('dashboard')) {
    // If navigation failed, wait a bit
    await delay(3000);
  }
  
  if (page.url().includes('dashboard')) {
    return true;
  }
  
  // try saving html if login fails
  fs.writeFileSync(`qa/debug_login_${email.split('@')[0]}.html`, await page.evaluate(() => document.body.innerHTML));
  await page.screenshot({ path: `qa/debug_login_${email.split('@')[0]}.png` });
  throw new Error(`Failed to login ${email} via UI. URL: ${page.url()}`);
}

async function runVerification() {
  log('--- CONNECTSPHERE V1 SOCIAL VERIFICATION ---');
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'] 
  });
  
  try {
    const contextA = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    pageA.on('console', msg => console.log('PAGE A CONSOLE:', msg.text()));
    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    pageB.on('console', msg => console.log('PAGE B CONSOLE:', msg.text()));
    
    pageA.on('console', msg => log(`[PageA Console] ${msg.text()}`));
    pageA.on('pageerror', err => log(`[PageA Error] ${err.toString()}`));
    // Request interception
    const name = 'PageA';
    const page = pageA;
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.url().includes('/rest/v1/posts')) {
        console.log(`[${name} REQ] ${req.method()} ${req.url()}`);
        console.log(`[${name} REQ HEADERS]`, req.headers());
        console.log(`[${name} REQ BODY]`, req.postData());
      }
      req.continue();
    });

    pageA.on('response', response => {
      if (!response.ok()) log(`[PageA 404] ${response.url()}`);
    });
    
    pageB.on('console', msg => log(`[PageB Console] ${msg.text()}`));
    pageB.on('pageerror', err => log(`[PageB Error] ${err.toString()}`));
    pageB.on('response', response => {
      if (!response.ok()) log(`[PageB 404] ${response.url()}`);
    });
    
    pageA.on('dialog', async dialog => await dialog.accept());
    pageB.on('dialog', async dialog => await dialog.accept());
    
    log('\n--- SETUP USERS (UI LOGIN) ---');
    await loginUserViaUI(pageA, EMAIL_A);
    log(`[SUCCESS] Logged in ${EMAIL_A}`);
    
    await loginUserViaUI(pageB, EMAIL_B);
    log(`[SUCCESS] Logged in ${EMAIL_B}`);
    
    // Fetch IDs for API assertions
    const { data: dbUserA } = await supabase.from('profiles').select('id').eq('username', USERNAME_A).single();
    const { data: dbUserB } = await supabase.from('profiles').select('id').eq('username', USERNAME_B).single();
    const userA_id = dbUserA.id;
    const userB_id = dbUserB.id;

    // --- P1: POST CREATION ---
    log('\n--- TEST: CREATE POST (User A) ---');
    const postText = `Test post by ${USERNAME_A} at ${Date.now()}`;
    await pageA.waitForSelector('#composer-post-text', { visible: true, timeout: 5000 });
    await pageA.$eval('#composer-post-text', (el, text) => { 
      el.value = text; 
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, postText);
    const sessionA = await pageA.evaluate(() => window.csSupabase.auth.getSession()); 
    console.log('Session A:', sessionA); 
    const cUserA = await pageA.evaluate(() => window.csStore.get('currentUser')); 
    console.log('cUser A:', cUserA); 
    await pageA.$eval('#btn-publish-inline-post', btn => btn.click());
    await delay(3000); 
    
    let postId = null;
    const { data: posts } = await supabase.from('posts').select('*').eq('user_id', userA_id).order('created_at', { ascending: false });
    if (posts && posts.length > 0 && posts[0].caption === postText) {
      log('[PASS] Post saved in DB successfully');
      report.p1.pass++;
      postId = posts[0].id;
    } else {
      log('[FAIL] Post not saved in DB');
      report.p1.fail++;
    }

    if (postId) {
      // Refresh User B page to see the post
      await pageB.reload({ waitUntil: 'networkidle2' });
      await pageB.waitForSelector('.post-card[data-post-id="' + postId + '"]', { timeout: 10000 }).catch(async e => {
        log(`[DEBUG] Timeout waiting for post in UI: ${e.message}`);
        await pageB.screenshot({ path: 'qa/timeout_feed_B.png', fullPage: true });
        const html = await pageB.content();
        fs.writeFileSync('qa/timeout_feed_B.html', html);
      });
      await delay(1000); // Give it a second to settle
      
      // --- P1: POST LIKE ---
      log('\n--- TEST: LIKE POST (User B) ---');
      const likedUI = await pageB.evaluate((pId) => {
        const postEl = document.querySelector(`.post-card[data-post-id="${pId}"]`);
        if (postEl) {
          const likeBtn = postEl.querySelector('.btn-like'); 
          if (likeBtn) { likeBtn.click(); return true; }
        }
        return false;
      }, postId);
      log(`[DEBUG] likedUI clicked: ${likedUI}`);
      
      await delay(2000);
      
      const { data: likes } = await supabase.from('post_likes').select('*').eq('post_id', postId).eq('user_id', userB_id);
      if (likes && likes.length > 0) {
        log('[PASS] Like saved in DB via UI');
        report.p1.pass++;
        
        // --- P0: RLS ON LIKES ---
        log('\n--- TEST: P0 RLS (User A attempts to delete User B like) ---');
        // Extract token for API auth A
        const tokenA = await pageA.evaluate(() => {
          const val = localStorage.getItem('connectsphere-supabase-auth');
          return val ? JSON.parse(val).access_token : null;
        });
        
        let clientA;
        if (tokenA) {
          clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${tokenA}` } } });
          await clientA.from('post_likes').delete().eq('post_id', postId).eq('user_id', userB_id);
          
          const { data: checkLikes } = await supabase.from('post_likes').select('*').eq('post_id', postId).eq('user_id', userB_id);
          if (checkLikes && checkLikes.length > 0) {
            log('[PASS] P0 RLS: User A cannot delete User B like');
            report.p0.pass++;
          } else {
            log('[FAIL] P0 RLS: User A deleted User B like!');
            report.p0.fail++;
          }
        }
      } else {
        log('[FAIL] Like NOT saved in DB via UI');
        report.p1.fail++;
      }

      // --- P1: POST COMMENT ---
      log('\n--- TEST: COMMENT POST (User B) ---');
      const commentText = `Awesome post! - ${Date.now()}`;
      await pageB.evaluate((pId, text) => {
        const postEl = document.querySelector(`.post-card[data-post-id="${pId}"]`);
        if (postEl) {
          const commentToggle = postEl.querySelector('.btn-comment-toggle');
          if (commentToggle) commentToggle.click();
          const input = postEl.querySelector('.input-comment-text');
          if (input) {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            const submitBtn = input.closest('form').querySelector('button[type="submit"]');
            if(submitBtn) {
              submitBtn.click();
            } else {
              input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            }
          }
        }
      }, postId, commentText);
      
      await delay(3000);
      
      const { data: comments } = await supabase.from('post_comments').select('*').eq('post_id', postId).eq('user_id', userB_id);
      if (comments && comments.length > 0 && comments.some(c => c.text === commentText)) {
        log('[PASS] Comment saved in DB via UI');
        report.p1.pass++;
      } else {
        log('[FAIL] Comment NOT saved in DB via UI');
        report.p1.fail++;
      }
    }

    // --- P1: FOLLOW / UNFOLLOW ---
    log('\n--- TEST: FOLLOW/UNFOLLOW (User B follows User A) ---');
    const tokenB = await pageB.evaluate(() => {
      const val = localStorage.getItem('connectsphere-supabase-auth');
      return val ? JSON.parse(val).access_token : null;
    });
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${tokenB}` } } });
    const { error: followErr } = await clientB.from('followers').insert({ follower_id: userB_id, following_id: userA_id });
    if (followErr) log('[DEBUG] Follow insert error: ' + JSON.stringify(followErr));
    
    let { data: followers } = await supabase.from('followers').select('*').eq('follower_id', userB_id).eq('following_id', userA_id);
    if (followers && followers.length > 0) {
      log('[PASS] User B can follow User A via authenticated API');
      report.p1.pass++;
      
      await clientB.from('followers').delete().match({ follower_id: userB_id, following_id: userA_id });
      let { data: afterUnfollow } = await supabase.from('followers').select('*').eq('follower_id', userB_id).eq('following_id', userA_id);
      if (!afterUnfollow || afterUnfollow.length === 0) {
        log('[PASS] User B can unfollow User A');
        report.p1.pass++;
      } else {
        log('[FAIL] User B unfollow failed');
        report.p1.fail++;
      }
    } else {
      log('[FAIL] Follow failed');
      report.p1.fail++;
    }

    // --- P2: NOTIFICATIONS ---
    log('\n--- TEST: REALTIME NOTIFICATIONS (Trigger DB) ---');
    
    log('[DEBUG] Fetching tokenA for notification check...');
    const tokenA_for_notifs = await pageA.evaluate(() => {
      const val = localStorage.getItem('connectsphere-supabase-auth');
      return val ? JSON.parse(val).access_token : null;
    });
    
    const finalClientA = tokenA_for_notifs ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${tokenA_for_notifs}` } } }) : supabase;
    const { data: notifs } = await finalClientA.from('notifications').select('*').eq('user_id', userA_id);
    if (notifs && notifs.length > 0) {
      log('[PASS] Notifications generated in DB for events');
      report.p2.pass++;
    } else {
      log('[NOT_IMPLEMENTED/FAIL] No notifications generated in DB (likely missing DB trigger)');
      report.p2.fail++;
    }

    // --- P1: SEARCH ---
    log('\n--- TEST: SEARCH (User A searches for User B) ---');
    const { data: searchRes } = await supabase.from('profiles').select('*').ilike('username', `%${USERNAME_B}%`);
    if (searchRes && searchRes.length > 0) {
      log('[PASS] User search API is accessible and works');
      report.p1.pass++;
    } else {
      log('[FAIL] User search failed');
      report.p1.fail++;
    }

    log('\n--- FINAL REPORT ---');
    log(JSON.stringify(report, null, 2));

    fs.writeFileSync('qa/e2e_results.json', JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('Test script crashed:', error);
  } finally {
    await browser.close();
  }
}

runVerification().catch(console.error);
