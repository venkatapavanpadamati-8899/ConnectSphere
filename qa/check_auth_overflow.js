const puppeteer = require('puppeteer');
const fs = require('fs');

async function testAuthOverflow() {
  const chromePath = "C:\\Users\\venka\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe";
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://connectsphere2.vercel.app/pages/login.html', { waitUntil: 'networkidle2' });
  await page.type('#email', 'qaA_1789569805612@test.com');
  await page.type('#password', 'Password123!');
  await page.click('#loginBtn');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  async function checkPage(p, w, h) {
    await page.setViewport({ width: w, height: h });
    await page.goto(`https://connectsphere2.vercel.app/pages/${p}`, { waitUntil: 'networkidle2' });
    const res = await page.evaluate((pageName, vw) => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientWidth = docEl.clientWidth;

      const culprits = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1) {
          culprits.push({
            tag: el.tagName,
            id: el.id,
            cls: el.className,
            right: r.right,
            width: r.width,
            parent: el.parentElement?.tagName + '.' + el.parentElement?.className
          });
        }
      });
      return { p: pageName, w: vw, scrollWidth, clientWidth, diff: scrollWidth - clientWidth, culprits };
    }, p, w);
    console.log(`\n[${p} at ${w}x${h}]: diff=${res.diff}px (scrollWidth=${res.scrollWidth}, clientWidth=${res.clientWidth})`);
    res.culprits.slice(0, 5).forEach(c => console.log('  culprit:', c.tag, '#' + c.id, '.' + c.cls, `w=${c.width}, right=${c.right}, parent=${c.parent}`));
  }

  await checkPage('dashboard.html', 320, 700);
  await checkPage('explore.html', 320, 700);
  await checkPage('messages.html', 375, 812);
  await checkPage('messages.html', 390, 844);

  await browser.close();
}

testAuthOverflow().catch(console.error);
