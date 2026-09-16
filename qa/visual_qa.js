const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'qa_reports', 'visual');

const pagesToCapture = [
  { name: 'index', path: '/index.html' },
  { name: 'login', path: '/login.html' },
  { name: 'signup', path: '/signup.html' },
  { name: 'forgot-password', path: '/forgot-password.html' },
  { name: 'dashboard', path: '/dashboard.html' },
  { name: 'explore', path: '/explore.html' },
  { name: 'reels', path: '/reels.html' },
  { name: 'messages', path: '/messages.html' },
  { name: 'notifications', path: '/notifications.html' },
  { name: 'profile', path: '/profile.html' },
  { name: 'settings', path: '/settings.html' }
];
const requestedPages = process.argv.slice(2);
const selectedPages = requestedPages.length
  ? pagesToCapture.filter(page => requestedPages.includes(page.name))
  : pagesToCapture;

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true }
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVisualQA() {
  console.log('📸 Starting Visual QA Screenshot Capture...');
  
  if (!fs.existsSync(OUTPUT_DIR)){
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'] 
  });
  
  try {
    for (const p of selectedPages) {
      for (const viewport of viewports) {
        const page = await browser.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        const networkErrors = [];
        page.on('console', message => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('response', response => {
          if (response.status() >= 400 && response.url().startsWith(BASE_URL)) {
            networkErrors.push(`${response.status()} ${response.url()}`);
          }
        });

        await page.setViewport(viewport);
        console.log(`Navigating to ${p.name} at ${viewport.name}...`);
        const response = await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle2' });
        await delay(350);
        const result = await page.evaluate(() => ({
          title: document.title,
          finalPath: window.location.pathname,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          main: Boolean(document.querySelector('main'))
        }));
        const screenshotPath = path.join(OUTPUT_DIR, `${p.name}_${viewport.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        const evidence = {
          route: p.path, viewport: viewport.name, status: response?.status(), ...result,
          consoleErrors, pageErrors, networkErrors
        };
        fs.writeFileSync(path.join(OUTPUT_DIR, `${p.name}_${viewport.name}.json`), JSON.stringify(evidence, null, 2));
        console.log(`✅ Captured ${p.name}_${viewport.name}.png | ${result.finalPath} | overflow=${result.overflow}`);
        await page.close();
      }
    }

    console.log('\n🎉 All visual QA screenshots captured successfully! Saved in /qa_reports/visual/');
  } catch (error) {
    console.error('❌ Visual QA Script encountered an error:', error);
  } finally {
    await browser.close();
  }
}

runVisualQA().catch(console.error);
