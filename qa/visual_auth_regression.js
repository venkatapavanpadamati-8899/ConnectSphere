const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const devices = [
        { name: 'Desktop', width: 1280, height: 800 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Mobile', width: 375, height: 667 }
    ];
    
    const pagesToTest = ['login.html', 'signup.html'];
    let allPassed = true;
    
    for (const p of pagesToTest) {
        console.log(`\n=== Testing ${p} ===`);
        for (const device of devices) {
            await page.setViewport({ width: device.width, height: device.height });
            
            // Open local file directly
            const filePath = `file:///${path.resolve(__dirname, '../frontend/pages', p).replace(/\\/g, '/')}`;
            await page.goto(filePath, { waitUntil: 'networkidle0' });
            await page.waitForSelector('.cs-auth-card');
            
            const cardBox = await page.evaluate(() => {
                const card = document.querySelector('.cs-auth-card');
                const rect = card.getBoundingClientRect();
                return {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                    height: rect.height,
                    windowWidth: window.innerWidth,
                    windowHeight: window.innerHeight
                };
            });
            
            // Check horizontal centering
            const leftSpace = cardBox.left;
            const rightSpace = cardBox.windowWidth - cardBox.right;
            const diffX = Math.abs(leftSpace - rightSpace);
            
            // Check vertical centering (if card fits in viewport)
            let diffY = 0;
            if (cardBox.height < cardBox.windowHeight) {
                const topSpace = cardBox.top;
                const bottomSpace = cardBox.windowHeight - cardBox.bottom;
                diffY = Math.abs(topSpace - bottomSpace);
            } else {
                console.log(`  [${device.name}] Info: Card height (${cardBox.height}px) > Window height (${cardBox.windowHeight}px). Vertical centering is naturally bypassed for scrollability.`);
            }
            
            if (diffX <= 2 && diffY <= 2) {
                console.log(`  [${device.name}] PASS - Perfectly centered (Diff X: ${diffX.toFixed(1)}px, Diff Y: ${diffY.toFixed(1)}px)`);
            } else {
                console.log(`  [${device.name}] FAIL - Not centered (Diff X: ${diffX.toFixed(1)}px, Diff Y: ${diffY.toFixed(1)}px)`);
                allPassed = false;
            }
        }
    }
    
    await browser.close();
    
    if (allPassed) {
        console.log('\n✅ All layouts passed visual regression checks (center difference <= 2px)');
        process.exit(0);
    } else {
        console.log('\n❌ Visual regression checks failed!');
        process.exit(1);
    }
})();
