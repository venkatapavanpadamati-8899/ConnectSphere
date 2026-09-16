const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

const PAGES = [
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/explore',
  '/reels',
  '/messages',
  '/notifications',
  '/profile',
  '/settings'
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
};

const OUT_DIR = path.join(__dirname, 'qa_reports');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR);
}

async function runQA() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const report = {};

  for (const pagePath of PAGES) {
    console.log(`Testing ${pagePath}...`);
    report[pagePath] = {
      consoleErrors: [],
      networkErrors: [],
      layoutIssues: {}
    };

    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage();
      await page.setViewport(vp);
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          report[pagePath].consoleErrors.push(msg.text());
        }
      });
      
      page.on('response', response => {
        if (!response.ok()) {
          report[pagePath].networkErrors.push(`${response.status()} ${response.url()}`);
        }
      });

      try {
        await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle2', timeout: 10000 });
      } catch (e) {
        console.log(`Failed to load ${pagePath}:`, e.message);
      }

      // Check for horizontal overflow
      const overflowInfo = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const issues = [];
        if (docWidth > winWidth) {
          issues.push(`Horizontal overflow detected! docWidth: ${docWidth}, winWidth: ${winWidth}`);
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth && rect.width > 0) {
               // Ignore elements that might intentionally overflow like hidden containers, 
               // but record the main ones.
               issues.push(`Overflowing element: ${el.tagName}.${el.className} (width: ${rect.width}, right: ${rect.right})`);
            }
          }
        }
        return issues;
      });
      
      const bodyStyles = await page.evaluate(() => {
        const style = window.getComputedStyle(document.body);
        return {
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          color: style.color
        };
      });

      report[pagePath].layoutIssues[vpName] = {
        overflow: overflowInfo,
        bodyStyles
      };

      const safePathName = pagePath === '/' ? 'index' : pagePath.replace('/', '');
      await page.screenshot({ path: path.join(OUT_DIR, `${safePathName}_${vpName}.png`), fullPage: true });

      await page.close();
    }
  }

  await browser.close();
  
  fs.writeFileSync(path.join(OUT_DIR, 'qa_report.json'), JSON.stringify(report, null, 2));
  console.log('QA completed. Report saved to qa_report.json');
}

runQA().catch(console.error);
