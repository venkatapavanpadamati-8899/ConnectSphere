const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://lgsdihyrsbzebdfblpor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ta6yhdk93Ege5oRO-v9IWg_gUnqEmbL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'https://connectsphere2.vercel.app';
const USERNAME_A = 'qaA_1789569805612';
const EMAIL_A = `${USERNAME_A}@test.com`;
const PASSWORD = 'Password123!';

async function runVerification() {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'] 
  });
  
  try {
    const pageA = await browser.newPage();
    const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL_A, password: PASSWORD });
    
    await pageA.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
    await pageA.evaluate((session) => {
      localStorage.setItem('sb-lgsdihyrsbzebdfblpor-auth-token', JSON.stringify(session));
    }, data.session);
    
    await pageA.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'networkidle2' });
    
    console.log("Current URL:", pageA.url());
    const html = await pageA.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('qa/debug_page.html', html);
    await pageA.screenshot({ path: 'qa/debug_page.png' });
    
    console.log("Saved debug info.");
  } catch (error) {
    console.error('Test script crashed:', error);
  } finally {
    await browser.close();
  }
}

runVerification().catch(console.error);
