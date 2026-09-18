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
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] on ${page.url()}:`, msg.text());
    }
  });

  page.on('requestfailed', req => {
    console.log(`[FAILED REQUEST] on ${page.url()}:`, req.url(), req.failure()?.errorText);
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log(`[HTTP ${resp.status()}] on ${page.url()}:`, resp.url());
    }
  });

  // Check pages
  const pages = ['dashboard.html', 'explore.html', 'messages.html', 'notifications.html'];
  for (const p of pages) {
    console.log(`\n--- Inspecting ${p} ---`);
    await page.goto(`https://connectsphere2.vercel.app/pages/${p}`, { waitUntil: 'networkidle2' });
  }

  // Check overflow details
  async function findOverflowElements(url, w, h) {
    await page.setViewport({ width: w, height: h });
    await page.goto(url, { waitUntil: 'networkidle2' });
    const culprits = await page.evaluate((viewportWidth) => {
      const all = document.querySelectorAll('*');
      const bad = [];
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > viewportWidth + 1) {
          bad.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            right: rect.right,
            width: rect.width,
            outerHTML: el.outerHTML.slice(0, 100)
          });
        }
      }
      return bad;
    }, w);
    console.log(`\n[OVERFLOW at ${w}x${h} on ${url}]: ${culprits.length} elements:`);
    culprits.slice(0, 5).forEach(c => console.log('  ->', c.tag, '#' + c.id, '.' + c.className, `right=${c.right}`, c.outerHTML));
  }

  await findOverflowElements('https://connectsphere2.vercel.app/pages/dashboard.html', 320, 700);
  await findOverflowElements('https://connectsphere2.vercel.app/pages/explore.html', 320, 700);
  await findOverflowElements('https://connectsphere2.vercel.app/pages/messages.html', 375, 812);
  await findOverflowElements('https://connectsphere2.vercel.app/pages/messages.html', 390, 844);

  await browser.close();
}

check().catch(console.error);
