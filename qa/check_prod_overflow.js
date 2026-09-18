const puppeteer = require('puppeteer');
const fs = require('fs');

async function testVercelOverflow() {
  const chromePath = "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe";
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 700 });
  await page.goto('https://connectsphere2.vercel.app/pages/dashboard.html', { waitUntil: 'networkidle2' });

  const info = await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = docEl.clientWidth;

    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > clientWidth + 1) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          cls: el.className,
          right: r.right,
          w: r.width,
          style: window.getComputedStyle(el).overflow
        });
      }
    });

    return { scrollWidth, clientWidth, diff: scrollWidth - clientWidth, overflowing };
  });

  console.log('Result on dashboard.html at 320px:', JSON.stringify(info, null, 2));
  await browser.close();
}

testVercelOverflow().catch(console.error);
