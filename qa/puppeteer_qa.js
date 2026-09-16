const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const baseUrl = 'http://localhost:3000';
const outDir = path.join(__dirname, 'qa_reports');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

const routes = [
  { name: 'index', path: '/' },
  { name: 'index_html', path: '/index.html' },
  { name: 'login', path: '/login.html' },
  { name: 'signup', path: '/signup.html' },
  { name: 'forgot_password', path: '/forgot-password.html' },
  { name: 'dashboard', path: '/dashboard.html' },
  { name: 'explore', path: '/explore.html' },
  { name: 'reels', path: '/reels.html' },
  { name: 'messages', path: '/messages.html' },
  { name: 'notifications', path: '/notifications.html' },
  { name: 'profile', path: '/profile.html' },
  { name: 'settings', path: '/settings.html' }
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];

async function runQA() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const report = [];

  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    const pageReport = {
      route: route.name,
      url,
      status: null,
      consoleErrors: [],
      pageErrors: [],
      networkFailures: []
    };

    const page = await browser.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageReport.consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageReport.pageErrors.push(err.toString());
    });

    page.on('response', response => {
      if (!response.ok() && response.request().resourceType() !== 'fetch' && response.request().resourceType() !== 'xhr') {
        pageReport.networkFailures.push(`${response.status()} - ${response.url()}`);
      }
    });

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      pageReport.status = response ? response.status() : 'Unknown';

      // Ensure premium backgrounds load (they might be animated)
      await new Promise(r => setTimeout(r, 2000));

      for (const vp of viewports) {
        await page.setViewport(vp);
        await new Promise(r => setTimeout(r, 500)); // allow resize layout
        const screenshotPath = path.join(outDir, `${route.name}_${vp.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }

    } catch (err) {
      pageReport.pageErrors.push(`Navigation Error: ${err.message}`);
    }

    report.push(pageReport);
    await page.close();
    console.log(`Finished ${route.name}`);
  }

  await browser.close();

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log('QA Run Complete. Report saved to qa_reports/report.json');
}

runQA().catch(console.error);
