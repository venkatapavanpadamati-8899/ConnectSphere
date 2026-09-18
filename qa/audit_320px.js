const puppeteer = require('puppeteer');
const fs = require('fs');

async function runAudit() {
  const browser = await puppeteer.launch({ headless: true });
  const pagesToTest = [
    'login.html', 'signup.html', 'dashboard.html', 'explore.html',
    'reels.html', 'messages.html', 'notifications.html', 'profile.html',
    'settings.html', 'forgot-password.html'
  ];

  const results = [];
  
  for (const pageName of pagesToTest) {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 700 });
    
    const url = `https://connectsphere2.vercel.app/${pageName.includes('login') || pageName.includes('signup') || pageName.includes('forgot') ? pageName : 'pages/' + pageName}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalScroll) {
        results.push(`[FAIL] 320px QA - ${pageName} has horizontal overflow.`);
      } else {
        results.push(`[PASS] 320px QA - ${pageName} responsive layout works without overflow.`);
      }
    } catch (e) {
      results.push(`[FAIL] Could not load ${pageName}: ${e.message}`);
    }
    await page.close();
  }
  
  await browser.close();
  
  const report = results.join('\n');
  if (!fs.existsSync('qa_reports')) fs.mkdirSync('qa_reports');
  fs.writeFileSync('qa_reports/FINAL_320PX_QA.md', report);
  console.log(report);
}

runAudit().catch(console.error);
