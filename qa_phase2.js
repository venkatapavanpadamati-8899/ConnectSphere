const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const USERNAME_A = `e2e_a_${Date.now()}`;
const EMAIL_A = `${USERNAME_A}@test.com`;
const USERNAME_B = `e2e_b_${Date.now()}`;
const EMAIL_B = `${USERNAME_B}@test.com`;

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runPhase2() {
  console.log('🚀 Starting Phase 2: Follow & Messaging E2E');
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });

  try {
    // -----------------------------------------------------
    // BROWSER CONTEXT A (User A)
    // -----------------------------------------------------
    const contextA = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    pageA.on('console', msg => console.log('PAGE A: ' + msg.text()));
    
    console.log(`\n--- STEP 1: Signup User A (${USERNAME_A}) ---`);
    await pageA.goto(`${BASE_URL}/signup.html`, { waitUntil: 'domcontentloaded' });
    
    // Step 1
    await pageA.type('#username', USERNAME_A);
    await pageA.type('#email', EMAIL_A);
    await pageA.type('#password', 'Pass123!@#');
    await pageA.evaluate(() => { const btn = document.querySelector('#step1 .cs-btn-primary'); if(btn) btn.click(); });
    
    await delay(1000);
    // Step 2
    await pageA.type('#phone', '+1234567890');
    await pageA.type('#dob', '1990-01-01');
    await pageA.evaluate(() => { const btn = document.querySelector('#step2 .cs-btn-primary'); if(btn) btn.click(); });
    
    // Step 3 (OTP)
    await pageA.waitForSelector('#step3.active', { timeout: 3000 });
    await pageA.$$eval('.cs-otp-input', inputs => {
      inputs.forEach((input, index) => {
        input.value = (index + 1).toString();
      });
    });
    await pageA.evaluate(() => { const btn = document.querySelector('#step3 .cs-btn-primary'); if(btn) btn.click(); });
    
    await pageA.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('✅ User A signup successful');
    
    // -----------------------------------------------------
    // BROWSER CONTEXT B (User B)
    // -----------------------------------------------------
    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    pageB.on('console', msg => console.log('PAGE B: ' + msg.text()));
    
    console.log(`\n--- STEP 2: Signup User B (${USERNAME_B}) ---`);
    await pageB.goto(`${BASE_URL}/signup.html`, { waitUntil: 'domcontentloaded' });
    
    // Step 1
    await pageB.type('#username', USERNAME_B);
    await pageB.type('#email', EMAIL_B);
    await pageB.type('#password', 'Pass123!@#');
    await pageB.evaluate(() => { const btn = document.querySelector('#step1 .cs-btn-primary'); if(btn) btn.click(); });
    
    await delay(1000);
    // Step 2
    await pageB.type('#phone', '+1987654321');
    await pageB.type('#dob', '1995-05-05');
    await pageB.evaluate(() => { const btn = document.querySelector('#step2 .cs-btn-primary'); if(btn) btn.click(); });
    
    // Step 3 (OTP)
    await pageB.waitForSelector('#step3.active', { timeout: 3000 });
    await pageB.$$eval('.cs-otp-input', inputs => {
      inputs.forEach((input, index) => {
        input.value = (index + 1).toString();
      });
    });
    await pageB.evaluate(() => { const btn = document.querySelector('#step3 .cs-btn-primary'); if(btn) btn.click(); });
    
    await pageB.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('✅ User B signup successful');

    // Get User B's UUID using Supabase Admin Client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = 'https://lgsdihyrsbzebdfblpor.supabase.co';
    const supabaseKey = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Query users table for User B's username
    const { data: bData, error: bErr } = await supabase.from('profiles').select('id').eq('username', USERNAME_B).single();
    if (bErr || !bData) {
      throw new Error("Could not find User B in Supabase profiles table: " + (bErr ? bErr.message : 'No data'));
    }
    const userB_id = bData.id;
    console.log(`User B UUID: ${userB_id}`);

    // -----------------------------------------------------
    // STEP 3: User A Follows User B
    // -----------------------------------------------------
    console.log(`\n--- STEP 3: User A follows User B ---`);
    await pageA.goto(`${BASE_URL}/profile.html?id=${userB_id}`, { waitUntil: 'domcontentloaded' });
    
    await pageA.waitForSelector('#profile-username', { visible: true, timeout: 5000 });
    
    const followBtn = await pageA.$('#btn-toggle-follow');
    if (!followBtn) {
       throw new Error("Follow button not found on profile.html");
    }
    
    // Check initial state
    let btnText = await pageA.$eval('#btn-toggle-follow', el => el.textContent.trim());
    if (btnText === 'Following') {
      console.log('Already following somehow, unfollowing first');
      await pageA.click('#btn-toggle-follow');
      await delay(1000);
    }
    
    await pageA.click('#btn-toggle-follow');
    
    // Wait for button to change to Following
    await pageA.waitForFunction(
      () => {
        const el = document.getElementById('btn-toggle-follow');
        return el && el.textContent.includes('Following');
      },
      { timeout: 5000 }
    ).catch(() => null);
    
    btnText = await pageA.$eval('#btn-toggle-follow', el => el.textContent.trim());
    if (!btnText.includes('Following')) {
       throw new Error("Follow button did not change state to 'Following'");
    }
    console.log('✅ User A successfully followed User B');

    // -----------------------------------------------------
    // STEP 4: User A Messages User B
    // -----------------------------------------------------
    console.log(`\n--- STEP 4: User A messages User B ---`);
    const messageBtn = await pageA.$('#btn-message-user');
    if (!messageBtn) {
       throw new Error("Message button not found on profile.html");
    }
    await pageA.click('#btn-message-user');
    
    // Should navigate to messages.html?convo=uuid
    await pageA.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 });
    const urlA = pageA.url();
    if (!urlA.includes('messages.html')) {
       throw new Error(`Did not navigate to messages.html. Current URL: ${urlA}`);
    }
    
    console.log('✅ Navigated to Messages view');
    
    // Wait for chat input
    await pageA.waitForSelector('#chat-input', { visible: true, timeout: 5000 });
    await pageA.type('#chat-input', 'Hello from ConnectSphere E2E A');
    await pageA.click('#btn-send-message');
    
    await delay(1000); // Wait for send
    console.log('✅ User A sent message to User B');

    // -----------------------------------------------------
    // STEP 5: User B Receives Message
    // -----------------------------------------------------
    console.log(`\n--- STEP 5: User B receives message ---`);
    await pageB.goto(`${BASE_URL}/messages.html`, { waitUntil: 'domcontentloaded' });
    
    // User B should see a conversation in the list
    await pageB.waitForSelector('.contact-item', { visible: true, timeout: 5000 });
    
    // Click the conversation
    await pageB.click('.contact-item');
    
    // Wait for messages to load in chat history
    await pageB.waitForSelector('.chat-message', { visible: true, timeout: 5000 });
    
    const bMessages = await pageB.$$eval('.chat-message .message-text', els => els.map(el => el.textContent));
    console.log(`Messages seen by User B: ${bMessages.join(' | ')}`);
    
    if (!bMessages.some(m => m.includes('Hello from ConnectSphere E2E A'))) {
       throw new Error("User B did not receive User A's message");
    }
    console.log('✅ User B successfully received message');
    
    // User B replies
    await pageB.type('#chat-input', 'Reply from ConnectSphere E2E B');
    await pageB.click('#btn-send-message');
    await delay(1000);
    
    // User A should see it (Realtime test)
    console.log(`\n--- STEP 6: Realtime Message Delivery (A receives B's reply) ---`);
    const aMessages = await pageA.$$eval('.chat-message .message-text', els => els.map(el => el.textContent));
    console.log(`Messages seen by User A: ${aMessages.join(' | ')}`);
    
    if (!aMessages.some(m => m.includes('Reply from ConnectSphere E2E B'))) {
       console.log('❌ Realtime delivery failed! User A did not see B\'s message without reload.');
       throw new Error("Realtime delivery failed.");
    }
    console.log('✅ Realtime delivery successful! User A saw B\'s reply instantly.');

    console.log('\n✅✅ Phase 2 (Follow & Messaging) E2E Completed Successfully!');
  } catch (error) {
    console.error(`\n❌ PHASE 2 FAILED: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPhase2();
