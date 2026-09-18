const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testLocal() {
  const chromePath = "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe";
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const pages = ['dashboard.html', 'explore.html', 'messages.html', 'login.html', 'signup.html', 'reels.html', 'profile.html', 'settings.html', 'notifications.html', 'forgot-password.html'];
  const viewports = [
    { name: 'Mobile Mini', width: 320, height: 700 },
    { name: 'Mobile Standard', width: 375, height: 812 },
    { name: 'Mobile Large', width: 390, height: 844 }
  ];

  let anyOverflow = false;
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (const p of pages) {
      const fileUrl = 'file:///' + path.resolve('frontend/pages', p).replace(/\\/g, '/');
      await page.goto(fileUrl, { waitUntil: 'load' });
      const metrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
        const clientWidth = docEl.clientWidth;
        return { scrollWidth, clientWidth, diff: scrollWidth - clientWidth };
      });
      if (metrics.diff > 1) {
        console.log(`❌ OVERFLOW on ${p} at ${vp.name} (${vp.width}px): +${metrics.diff}px (scrollWidth: ${metrics.scrollWidth}, clientWidth: ${metrics.clientWidth})`);
        anyOverflow = true;
      }
    }
  }

  if (!anyOverflow) {
    console.log('✅ ALL PAGES HAVE ZERO OVERFLOW AT 320px, 375px, 390px!');
  }

  await browser.close();
}

testLocal().catch(console.error);
