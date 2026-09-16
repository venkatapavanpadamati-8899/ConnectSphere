const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function checkDeployment() {
    console.log("Starting Production Verification...");
    
    // Find Chrome path for Puppeteer
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    let executablePath = chromePaths.find(p => fs.existsSync(p));
    
    if (!executablePath) {
        console.error("Chrome not found.");
        process.exit(1);
    }

    const browser = await puppeteer.launch({ 
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const routes = [
        '/', '/login', '/signup', '/forgot-password', '/dashboard', 
        '/explore', '/reels', '/messages', '/notifications', '/profile', '/settings'
    ];

    const results = [];

    for (const route of routes) {
        const url = `https://connectsphere2.vercel.app${route}`;
        console.log(`Testing ${url}...`);
        
        try {
            const page = await browser.newPage();
            let hasError = false;
            let consoleLogs = [];

            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleLogs.push(msg.text());
                }
            });

            page.on('pageerror', err => {
                hasError = true;
                consoleLogs.push(err.message);
            });

            const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
            
            const status = response.status();
            const title = await page.title();
            
            // Basic heuristic for blank screen
            const bodyContent = await page.evaluate(() => document.body.innerHTML.trim().length);
            const isBlank = bodyContent < 50;

            const hasCss = await page.evaluate(() => {
                return Array.from(document.styleSheets).length > 0 || 
                       document.querySelectorAll('style').length > 0 ||
                       document.querySelectorAll('link[rel="stylesheet"]').length > 0;
            });
            
            const hasJs = await page.evaluate(() => {
                return document.querySelectorAll('script').length > 0;
            });
            
            results.push({
                route,
                status,
                uiLoad: !isBlank && hasCss && hasJs ? "PASS" : "FAIL",
                console: consoleLogs.length > 0 ? "FAIL" : "PASS",
                overall: (status === 200 && !isBlank && hasCss && hasJs && consoleLogs.length === 0) ? "PASS" : "FAIL"
            });
            
            console.log(`Status: ${status}, UILoad: ${results[results.length-1].uiLoad}, Console: ${results[results.length-1].console}`);
            await page.close();
            
        } catch (e) {
            console.error(`Failed on ${route}: ${e.message}`);
            results.push({
                route,
                status: 500,
                uiLoad: "FAIL",
                console: "FAIL",
                overall: "FAIL"
            });
        }
    }
    
    await browser.close();

    console.log("\n=================================");
    console.log("POST_DEPLOYMENT_REPORT");
    console.log("ROUTE | HTTP STATUS | UI LOAD | CONSOLE | STATUS");
    console.log("---|---|---|---|---");
    
    let allPassed = true;
    for (const res of results) {
        console.log(`${res.route} | ${res.status} | ${res.uiLoad} | ${res.console} | ${res.overall}`);
        if (res.overall !== "PASS") allPassed = false;
    }
    
    if (allPassed) {
        console.log("\nREADY FOR BETA");
    } else {
        console.log("\nPRODUCTION BLOCKED");
    }
}

checkDeployment().catch(console.error);
