const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  const chromePath = "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe";
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // 1. Log in
  console.log('Logging in on Vercel...');
  await page.goto('https://connectsphere2.vercel.app/pages/login.html', { waitUntil: 'networkidle2' });
  await page.type('#email', 'qaA_1789569805612@test.com');
  await page.type('#password', 'Password123!');
  await page.click('#loginBtn');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Post-login URL:', page.url());

  // 2. Go to reels.html
  console.log('Navigating to reels.html...');
  await page.goto('https://connectsphere2.vercel.app/pages/reels.html', { waitUntil: 'networkidle2' });
  await sleep(3000);
  console.log('Reels URL:', page.url());

  const hasTrending = (await page.$('#trending-masterpiece-list')) !== null;
  console.log('Has #trending-masterpiece-list:', hasTrending);

  const hasShareBtn = (await page.$('#btn-reel-share')) !== null;
  console.log('Has #btn-reel-share:', hasShareBtn);

  // 3. Go to messages.html
  console.log('Navigating to messages.html...');
  await page.goto('https://connectsphere2.vercel.app/pages/messages.html', { waitUntil: 'networkidle2' });
  await sleep(3000);
  console.log('Messages URL:', page.url());
  const hasChatInput = (await page.$('#chat-input-field')) !== null;
  console.log('Has #chat-input-field:', hasChatInput);

  // 4. Go to settings.html
  console.log('Navigating to settings.html...');
  await page.goto('https://connectsphere2.vercel.app/pages/settings.html', { waitUntil: 'networkidle2' });
  await sleep(3000);
  console.log('Settings URL:', page.url());
  const hasSettings = (await page.$('#toggle-private-account')) !== null;
  console.log('Has #toggle-private-account:', hasSettings);

  await browser.close();
}

run();
