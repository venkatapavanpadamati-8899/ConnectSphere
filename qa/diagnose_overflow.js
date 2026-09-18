const puppeteer = require('puppeteer');
const fs = require('fs');

async function check() {
  const chromePath = "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe";
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  const testCases = [
    { page: 'dashboard.html', width: 320, height: 700 },
    { page: 'explore.html', width: 320, height: 700 },
    { page: 'messages.html', width: 375, height: 812 }
  ];

  for (const tc of testCases) {
    await page.setViewport({ width: tc.width, height: tc.height });
    await page.goto(`https://connectsphere2.vercel.app/pages/${tc.page}`, { waitUntil: 'networkidle2', timeout: 15000 });
    
    const overflowing = await page.evaluate((w) => {
      const results = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > w + 1) {
          results.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            right: rect.right,
            width: rect.width
          });
        }
      });
      return results.slice(0, 10);
    }, tc.width);

    console.log(`\nOverflowing elements for ${tc.page} at ${tc.width}px:`);
    console.log(overflowing);
  }

  await browser.close();
}

check();
