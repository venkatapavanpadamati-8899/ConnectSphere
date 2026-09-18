const puppeteer = require('puppeteer');
const fs = require('fs');

async function debug400() {
  const chromePath = "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe";
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async resp => {
    if (resp.status() >= 400) {
      let body = '';
      try { body = await resp.text(); } catch (e) {}
      console.log(`[HTTP ${resp.status()}] ${resp.url()}:`, body.slice(0, 150));
    }
  });

  // Login
  await page.goto('https://connectsphere2.vercel.app/pages/login.html', { waitUntil: 'networkidle2' });
  await page.type('#email', 'qaA_1789569805612@test.com');
  await page.type('#password', 'Password123!');
  await page.click('#loginBtn');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Visit pages
  const pages = ['dashboard.html', 'reels.html', 'messages.html', 'explore.html', 'profile.html', 'settings.html', 'notifications.html'];
  for (const p of pages) {
    console.log(`--- Visiting ${p} ---`);
    await page.goto(`https://connectsphere2.vercel.app/pages/${p}`, { waitUntil: 'networkidle2' });
  }

  await browser.close();
}

debug400().catch(console.error);
